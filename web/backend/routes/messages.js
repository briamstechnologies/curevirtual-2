// FILE: routes/messages.js
const prisma = require("../prisma/prismaClient");
const express = require("express");
const {
  verifyToken,
  requireRole,
  verifyOwnerOrAdmin,
} = require("../middleware/rbac.js");

const router = express.Router();

// ------------------------------------------------------------------
// Constants & helpers
// ------------------------------------------------------------------
const PAGE_SIZE_DEFAULT = 20;
const VALID_FOLDERS = new Set(["inbox", "sent", "unread", "all"]);

// Helper to derive a clean name from a user object
function deriveName(user) {
  if (!user) return "Unknown User";
  const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  if (name) return name;
  if (user.email) return user.email.split("@")[0];
  return `User #${String(user.id).slice(0, 4)}`;
}

// ------------------------------------------------------------------
// Routes
// ------------------------------------------------------------------

// ✅ Get all contacts for messaging
router.get("/contacts/all", verifyToken, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, firstName: true, lastName: true, role: true, email: true },
    });
    const data = users.map(u => ({ ...u, name: deriveName(u) }));
    return res.json({ data });
  } catch (err) {
    console.error("❌ Failed to fetch contacts:", err);
    return res.status(500).json({ error: "Failed to fetch contacts" });
  }
});

// Unread count
router.get("/unread-count", verifyToken, async (req, res) => {
  const userId = req.query.userId || req.user.id;
  try {
    const count = await prisma.message.count({
      where: { receiverId: userId, readAt: null },
    });
    return res.json({ data: { count } });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch unread count" });
  }
});

// Mark single as read
router.patch("/:id/read", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const msg = await prisma.message.update({
      where: { id },
      data: { readAt: new Date() },
      select: { id: true, readAt: true },
    });
    return res.json({ data: msg });
  } catch (e) {
    return res.status(500).json({ error: "Failed to mark message read" });
  }
});

// ✅ Unified Inbox: Latest message for each conversation
router.get("/inbox", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    // ⚠️ PostgreSQL Fix: Prisma `distinct` requires `orderBy` to match the distinct fields first.
    // We fetch the latest message per conversationId, ordered by conversationId.
    const messages = await prisma.message.findMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      orderBy: [
        { conversationId: "asc" },
        { createdAt: "desc" }
      ],
      distinct: ["conversationId"],
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, role: true, email: true } },
        receiver: { select: { id: true, firstName: true, lastName: true, role: true, email: true } },
      },
    });

    const formatted = messages.map(m => {
      const isOutgoing = String(m.senderId) === String(userId);
      const otherUser = isOutgoing ? m.receiver : m.sender;
      return {
        id: m.id,
        conversationId: m.conversationId,
        content: m.content,
        createdAt: m.createdAt,
        readAt: m.readAt,
        contactId: otherUser?.id,
        contactName: deriveName(otherUser),
        contactRole: otherUser?.role,
        isOutgoing,
      };
    });

    // ✅ Sort by latest message globally (since distinct forced 'conversationId' sorting)
    formatted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({ data: formatted });
  } catch (err) {
    console.error("❌ Inbox sync error:", err);
    return res.status(500).json({ error: "Failed to load inbox" });
  }
});

// ✅ Chat History
router.get("/history/:targetId", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { targetId } = req.params;
    const conversationId = [userId, targetId].sort().join(":");

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });
    return res.json({ data: messages });
  } catch (err) {
    return res.status(500).json({ error: "Failed to load chat history" });
  }
});

// ✅ Send Message
router.post("/send", verifyToken, async (req, res) => {
  try {
    const { senderId, receiverId, content, recipient } = req.body || {};
    const actualSenderId = senderId || req.user.id;
    const targetRecipient = receiverId || recipient;

    if (!targetRecipient) {
      console.error("❌ Send Error: Missing recipient", req.body);
      return res.status(400).json({ error: "Recipient is required", debug: { body: req.body } });
    }
    if (!content) {
      console.error("❌ Send Error: Missing content", req.body);
      return res.status(400).json({ error: "Content is required", debug: { body: req.body } });
    }

    const conversationId = [String(actualSenderId), String(targetRecipient)].sort().join(":");

    const msg = await prisma.message.create({
      data: {
        senderId: actualSenderId,
        receiverId: targetRecipient,
        content,
        conversationId,
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, role: true } },
        receiver: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });

    const formattedMsg = {
      ...msg,
      sender: { ...msg.sender, name: deriveName(msg.sender) },
      receiver: { ...msg.receiver, name: deriveName(msg.receiver) },
      timestamp: msg.createdAt,
    };

    // Socket emission
    try {
      const { emitToUser } = require("../socket/socketHandler.cjs");
      emitToUser(String(targetRecipient), "receiveMessage", formattedMsg);
    } catch (sErr) {}

    return res.json({ data: formattedMsg });
  } catch (e) {
    console.error("❌ Universal Send Error:", e);
    return res.status(500).json({ error: "Failed to send message" });
  }
});

// POST /api/messages/mark-read
// Marks messages as read by conversationId (bulk) or by specific messageIds.
// Both fields are optional — if neither is provided the call is a no-op (200).
router.post("/mark-read", verifyToken, async (req, res) => {
  try {
    const { conversationId, messageIds } = req.body;
    const userId = req.user.id;

    if (conversationId) {
      // Mark all unread messages in this conversation where the current user is the receiver
      await prisma.message.updateMany({
        where: {
          conversationId,
          receiverId: userId,
          readAt: null, // Only update truly unread messages (null = unread per schema)
        },
        data: { readAt: new Date() },
      });
    }

    if (Array.isArray(messageIds) && messageIds.length > 0) {
      // Mark specific messages as read — only if the current user is the receiver
      await prisma.message.updateMany({
        where: {
          id: { in: messageIds },
          receiverId: userId,
          readAt: null,
        },
        data: { readAt: new Date() },
      });
    }

    return res.json({ success: true, message: "Messages marked as read" });
  } catch (err) {
    console.error("❌ mark-read error:", err);
    return res.status(500).json({ error: "Failed to mark messages as read" });
  }
});

// Existing Folder-based routes (Legacy support)
router.get("/folder/:folder", verifyToken, async (req, res) => {
  return res.status(200).json({ data: [], message: "Use /inbox or /history for unified messaging" });
});

module.exports = router;
