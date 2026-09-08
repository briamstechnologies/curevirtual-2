// FILE: routes/messages.js
const prisma = require("../prisma/prismaClient");
const express = require("express");
const {
  verifyToken,
  requireRole,
  verifyOwnerOrAdmin,
} = require("../middleware/rbac.js");

const router = express.Router();

const PAGE_SIZE_DEFAULT = 20;
const VALID_FOLDERS = new Set(["inbox", "sent", "unread", "all"]);

function deriveName(user) {
  if (!user) return "Unknown User";
  const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  if (name) return name;
  if (user.email) return user.email.split("@")[0];
  return `User #${String(user.id).slice(0, 4)}`;
}

// Helper to fetch actual avatarUrl from User or DoctorProfile tables
async function getUserAvatars(userIds) {
  if (!userIds || userIds.length === 0) return {};
  const uniqueIds = [...new Set(userIds.filter(Boolean).map(String))];
  if (uniqueIds.length === 0) return {};
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT u.id, u."avatarUrl" as "userAvatar", d."avatarUrl" as "doctorAvatar"
       FROM "User" u
       LEFT JOIN "DoctorProfile" d ON d."userId" = u.id
       WHERE u.id = ANY($1::text[])`,
      uniqueIds
    );
    const map = {};
    for (const r of rows) {
      map[r.id] = r.userAvatar || r.doctorAvatar || null;
    }
    return map;
  } catch (err) {
    console.error("Failed to fetch user avatars:", err);
    return {};
  }
}

// ✅ Get all contacts
router.get(["/contacts", "/contacts/all"], verifyToken, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        email: true,
        doctor: { select: { avatarUrl: true } },
      },
    });

    const userIds = users.map((u) => u.id);
    const avatarMap = await getUserAvatars(userIds);

    const data = users.map((u) => {
      const realAvatar = avatarMap[u.id] || u.doctor?.avatarUrl || null;
      return {
        ...u,
        name: deriveName(u),
        avatarUrl: realAvatar,
      };
    });
    return res.json({ data });
  } catch (err) {
    console.error("❌ Failed to fetch contacts:", err);
    return res.status(500).json({ error: "Failed to fetch contacts" });
  }
});

// ✅ Unread count
router.get("/unread-count", verifyToken, async (req, res) => {
  const userId = req.query.userId || req.user.id;
  try {
    const count = await prisma.message.count({
      where: { receiverId: userId, readAt: null },
    });
    return res.json({ count, data: { count } });
  } catch (err) {
    // If connection pool is busy/timeout, gracefully return count 0 without noisy crashes
    if (err.code === "P2024" || err.message?.includes("connection pool")) {
      console.warn("⚠️ Unread count connection pool busy, returning 0 fallback");
      return res.json({ count: 0, data: { count: 0 } });
    }
    console.error("❌ Unread count error:", err.message || err);
    return res.status(500).json({ error: "Failed to fetch unread count" });
  }
});

// ✅ Mark single as read
router.patch("/:id/read", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const msg = await prisma.message.update({
      where: { id },
      data: { readAt: new Date() },
      select: { id: true, readAt: true },
    });
    return res.json({ data: msg });
  } catch (err) {
    console.error("❌ Mark read error:", err);
    return res.status(500).json({ error: "Failed to mark message read" });
  }
});

// ✅ Mark all unread messages from a contact as read
router.patch("/read-all/:contactId", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId;
    const { contactId } = req.params;

    if (!userId || !contactId) {
      return res.status(400).json({ error: "Missing userId or contactId" });
    }

    await prisma.message.updateMany({
      where: {
        receiverId: userId,
        senderId: contactId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("Failed to mark conversation as read:", err);
    return res.status(500).json({ error: "Failed to mark conversation read" });
  }
});

// ✅ Inbox
router.get("/inbox", verifyToken, async (req, res) => {
  try {
    const userId = req.query.userId || req.user.id;
    const messages = await prisma.message.findMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      orderBy: [{ conversationId: "asc" }, { createdAt: "desc" }],
      distinct: ["conversationId"],
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            email: true,
            doctor: { select: { avatarUrl: true } },
          },
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            email: true,
            doctor: { select: { avatarUrl: true } },
          },
        },
      },
    });

    const userIds = messages.flatMap((m) => [m.senderId, m.receiverId]);
    const avatarMap = await getUserAvatars(userIds);

    const formatted = messages.map((m) => {
      const isOutgoing = String(m.senderId) === String(userId);
      const otherUser = isOutgoing ? m.receiver : m.sender;
      const avatar = (otherUser?.id && avatarMap[otherUser.id]) || otherUser?.doctor?.avatarUrl || null;
      return {
        id: m.id,
        conversationId: m.conversationId,
        content: m.content,
        createdAt: m.createdAt,
        readAt: m.readAt,
        contactId: otherUser?.id,
        contactName: deriveName(otherUser),
        contactRole: otherUser?.role,
        contactAvatar: avatar,
        avatarUrl: avatar,
        isOutgoing,
      };
    });

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
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            doctor: { select: { avatarUrl: true } },
          },
        },
      },
    });

    const userIds = messages.map((m) => m.senderId);
    const avatarMap = await getUserAvatars(userIds);

    const formatted = messages.map((m) => {
      const realAvatar = (m.sender?.id && avatarMap[m.sender.id]) || m.sender?.doctor?.avatarUrl || null;
      return {
        ...m,
        sender: {
          ...m.sender,
          avatarUrl: realAvatar,
        },
      };
    });

    return res.json({ data: formatted });
  } catch (err) {
    console.error("❌ Load chat history error:", err);
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
      return res.status(400).json({ error: "Recipient is required" });
    }
    if (!content) {
      console.error("❌ Send Error: Missing content", req.body);
      return res.status(400).json({ error: "Content is required" });
    }

    const conversationId = [String(actualSenderId), String(targetRecipient)].sort().join(":");

    const msg = await prisma.message.create({
      data: { senderId: actualSenderId, receiverId: targetRecipient, content, conversationId },
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

    try {
      const { emitToUser } = require("../socket/socketHandler.cjs");
      emitToUser(String(targetRecipient), "receiveMessage", formattedMsg);
    } catch (sErr) { }

    return res.json({ data: formattedMsg });
  } catch (e) {
    console.error("❌ Universal Send Error:", e);
    return res.status(500).json({ error: "Failed to send message" });
  }
});

// ✅ Delete Message — FIXED (bahar nikala)
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const msg = await prisma.message.findUnique({ where: { id } });
    if (!msg) return res.status(404).json({ error: "Message not found" });
    if (msg.senderId !== userId && msg.receiverId !== userId)
      return res.status(403).json({ error: "Not allowed" });

    await prisma.message.delete({ where: { id } });
    return res.json({ success: true });
  } catch (err) {
    console.error("❌ Delete error:", err);
    return res.status(500).json({ error: "Delete failed" });
  }
});

// ✅ Mark Read (bulk)
router.post("/mark-read", verifyToken, async (req, res) => {
  try {
    const { conversationId, messageIds } = req.body;
    const userId = req.user.id;

    if (conversationId) {
      await prisma.message.updateMany({
        where: { conversationId, receiverId: userId, readAt: null },
        data: { readAt: new Date() },
      });
    }

    if (Array.isArray(messageIds) && messageIds.length > 0) {
      await prisma.message.updateMany({
        where: { id: { in: messageIds }, receiverId: userId, readAt: null },
        data: { readAt: new Date() },
      });
    }

    return res.json({ success: true, message: "Messages marked as read" });
  } catch (err) {
    console.error("❌ mark-read error:", err);
    return res.status(500).json({ error: "Failed to mark messages as read" });
  }
});

// Legacy support
router.get("/folder/:folder", verifyToken, async (req, res) => {
  return res.status(200).json({ data: [], message: "Use /inbox or /history for unified messaging" });
});

module.exports = router;