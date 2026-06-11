// FILE: src/pages/laboratory/messages/Inbox.jsx

import { useState, useEffect, useCallback } from "react";
import { FiSearch, FiSend, FiMail, FiClock, FiX } from "react-icons/fi";
import { Link } from "react-router-dom";
import DashboardLayout from "../../../layouts/DashboardLayout";
import api from "../../../Lib/api";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Inbox() {
  const [search, setSearch] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [replyContent, setReplyContent] = useState("");
  const [sending, setSending] = useState(false);
  const [delId, setDelId] = useState(null);

  const userName = localStorage.getItem("userName") || "Laboratory";
  const userId = localStorage.getItem("userId");

  const fetchInbox = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const res = await api.get("/messages/inbox");
      const items = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setMessages(items);
    } catch (err) {
      console.error("Inbox fetch error:", err); // ✅ add karo
      toast.error("Failed to load inbox.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  const openMessage = async (msg) => {
    setSelectedMsg(msg);
    if (!msg.readAt) {
      try {
        await api.patch(`/messages/${msg.id}/read`, { userId });
        setMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, readAt: new Date().toISOString() } : m))
        );
      } catch (err) {
        console.warn("Read update failed", err); // ✅ err add karo
      }
    }
  };

  const handleReply = async () => {
    if (!replyContent.trim() || !selectedMsg) return;
    setSending(true);
    try {
      await api.post("/messages/send", {
        senderId: userId,
        receiverId: selectedMsg.contactId,
        content: replyContent,
      });
      toast.success("Reply sent!");
      setReplyContent("");
      setSelectedMsg(null);
      await fetchInbox(); // Await added
    } catch (err) {
      console.error("Reply send error:", err); // ✅ add karo
      toast.error("Failed to send.");
    } finally {
      setSending(false);
    }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/messages/${delId}`, { params: { userId } });
      setMessages((prev) => prev.filter((m) => m.id !== delId));
      if (selectedMsg?.id === delId) setSelectedMsg(null); // Safer close
      setDelId(null);
      toast.success("Deleted");
    } catch (err) {
      console.error("Delete error:", err); // ✅ add karo
      toast.error("Delete failed");
    }
  };

  const filtered = messages.filter(
    (m) =>
      m.contactName?.toLowerCase().includes(search.toLowerCase()) ||
      m.content?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout role="LABORATORY" user={{ name: userName }}>
      <ToastContainer position="top-right" autoClose={2200} />
      <div className="animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-[var(--text-main)]">
              Laboratory Inbox
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] mt-2">
              Manage communication & notifications
            </p>
          </div>
          <Link
            to="/laboratory/messages/send"
            className="btn btn-primary rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
          >
            <FiSend /> Send Message
          </Link>
        </div>

        <div className="glass-panel p-5 rounded-3xl mb-8">
          <div className="relative">
            <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search messages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] py-4 pl-14 pr-5 outline-none"
            />
          </div>
        </div>

        <div className="space-y-5">
          {loading ? (
            <div className="glass-panel rounded-3xl p-8 text-center">
              <p className="text-[var(--text-muted)]">Loading messages...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass-panel rounded-3xl p-8 text-center">
              <p className="text-[var(--text-muted)]">No messages found.</p>
            </div>
          ) : (
            filtered.map((msg) => (
              <div
                key={msg.id}
                onClick={() => openMessage(msg)}
                className={`glass-panel rounded-3xl p-6 border cursor-pointer hover:scale-[1.01] transition-all ${!msg.readAt ? "border-[var(--brand-blue)]" : "border-[var(--border)]"}`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[var(--brand-blue)]/10 flex items-center justify-center text-[var(--brand-blue)] text-xl">
                      <FiMail />
                    </div>
                    <div>
                      <h3 className="font-black text-[var(--text-main)]">{msg.contactName}</h3>
                      <p className="text-sm text-[var(--text-soft)] truncate w-64">{msg.content}</p>
                    </div>
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">
                    <FiClock className="inline mr-1" /> {new Date(msg.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Reply Modal */}
        {selectedMsg && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white p-8 rounded-3xl w-full max-w-lg relative text-black">
              <button
                onClick={() => {
                  setSelectedMsg(null);
                  setReplyContent("");
                }}
                className="absolute top-4 right-4"
              >
                <FiX size={24} />
              </button>
              <h2 className="text-2xl font-black mb-4">From: {selectedMsg.contactName}</h2>
              <p className="mb-6 p-4 bg-gray-100 rounded-xl">{selectedMsg.content}</p>
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Type your reply..."
                className="w-full p-4 border rounded-xl mb-4 h-32"
              />
              <div className="flex gap-4">
                <button
                  onClick={handleReply}
                  disabled={sending}
                  className="bg-blue-600 text-white px-6 py-3 rounded-xl"
                >
                  {sending ? "Sending..." : "Send Reply"}
                </button>
                <button
                  onClick={() => setDelId(selectedMsg.id)}
                  className="bg-red-600 text-white px-6 py-3 rounded-xl"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {delId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
            <div className="bg-white p-6 rounded-2xl text-black">
              <h3 className="font-bold mb-4">Are you sure you want to delete this message?</h3>
              <div className="flex gap-4">
                <button onClick={confirmDelete} className="bg-red-600 text-white px-4 py-2 rounded">
                  Delete
                </button>
                <button onClick={() => setDelId(null)} className="px-4 py-2 bg-gray-200 rounded">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
