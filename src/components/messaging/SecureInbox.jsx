import { useEffect, useState, useCallback, useRef } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import api from "../../Lib/api";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ConfirmModal } from "../support/ui";

export default function SecureInbox({ role: propRole }) {
  const [messages, setMessages] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [replyContent, setReplyContent] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [showNewModal, setShowNewModal] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [newReceiverId, setNewReceiverId] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newSending, setNewSending] = useState(false);

  const messagesEndRef = useRef(null);

  const userId = localStorage.getItem("userId") || "";
  const role = propRole || localStorage.getItem("role") || "PATIENT";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchInbox = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await api.get("/messages/inbox", { params: { userId } });
      const items = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setMessages(items);
      if (items.length > 0 && !selectedContact) {
        setSelectedContact(items[0]);
      }
    } catch (err) {
      console.error("Failed to fetch inbox:", err);
    }
  }, [userId, selectedContact]);

  const fetchChatHistory = useCallback(async (contactId) => {
    if (!contactId) return;
    try {
      const res = await api.get(`/messages/history/${contactId}`);
      const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setChatHistory(list);
    } catch (err) {
      console.error("Failed to fetch chat history:", err);
    }
  }, []);

  const loadContacts = useCallback(async () => {
    try {
      const res = await api.get("/messages/contacts/all");
      const allUsers = Array.isArray(res.data) ? res.data : res.data?.data || [];
      const filtered = allUsers.filter((u) => String(u.id) !== String(userId));
      setContacts(
        filtered.map((u) => ({
          id: u.id,
          name: u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email || "User",
          role: u.role || "USER",
        }))
      );
    } catch (err) {
      console.error("Failed to load contacts:", err);
    }
  }, [userId]);

  const handleDeleteMessage = (msgId) => {
    setConfirmDeleteTarget({ type: "MESSAGE", id: msgId });
  };

  const handleDeleteConversation = () => {
    if (!selectedContact || chatHistory.length === 0) return;
    setConfirmDeleteTarget({ type: "CONVERSATION" });
  };

  const handleConfirmDeleteAction = async () => {
    if (!confirmDeleteTarget) return;
    setDeleting(true);
    try {
      if (confirmDeleteTarget.type === "MESSAGE") {
        await api.delete(`/messages/${confirmDeleteTarget.id}`);
        toast.success("Message deleted");
        if (selectedContact) {
          fetchChatHistory(selectedContact.contactId);
        }
        fetchInbox();
      } else if (confirmDeleteTarget.type === "CONVERSATION") {
        for (const chat of chatHistory) {
          await api.delete(`/messages/${chat.id}`);
        }
        toast.success("Conversation deleted");
        setSelectedContact(null);
        setChatHistory([]);
        fetchInbox();
      }
    } catch (err) {
      console.error("Failed to delete item:", err);
      toast.error("Failed to delete item");
    } finally {
      setDeleting(false);
      setConfirmDeleteTarget(null);
    }
  };

  const handleSendNewMessage = async (e) => {
    e.preventDefault();
    if (!newReceiverId || !newContent.trim()) {
      toast.error("Please select a recipient and enter a message.");
      return;
    }
    setNewSending(true);
    try {
      await api.post("/messages/send", {
        senderId: userId,
        receiverId: newReceiverId,
        content: newContent,
      });
      toast.success("Message sent successfully!");
      setShowNewModal(false);
      setNewReceiverId("");
      setNewContent("");
      await fetchInbox();
    } catch (err) {
      console.error("Failed to send message:", err);
      toast.error("Failed to send message.");
    } finally {
      setNewSending(false);
    }
  };

  const handleSend = async () => {
    if (!replyContent.trim() || !selectedContact) return;
    setSending(true);
    try {
      await api.post("/messages/send", {
        senderId: userId,
        receiverId: selectedContact.contactId,
        content: replyContent,
      });
      setReplyContent("");
      await fetchChatHistory(selectedContact.contactId);
      await fetchInbox();
      toast.success("Message sent");
    } catch (err) {
      console.error("Failed to send message:", err);
      toast.error("Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    fetchInbox();
    const interval = setInterval(fetchInbox, 10000);
    return () => clearInterval(interval);
  }, [fetchInbox]);

  useEffect(() => {
    if (selectedContact) {
      fetchChatHistory(selectedContact.contactId);
      const interval = setInterval(() => {
        fetchChatHistory(selectedContact.contactId);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedContact, fetchChatHistory]);

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const formatRoleLabel = (roleStr) => {
    if (!roleStr) return "Active Connection";
    return roleStr.replace(/_/g, " ");
  };

  return (
    <DashboardLayout role={role}>
      <div className="h-[calc(100vh-160px)] flex flex-col md:flex-row gap-4 md:gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
        {/* Sidebar: Conversation List */}
        <aside className="w-full md:w-80 h-[40%] md:h-full flex flex-col gap-4 shrink-0 pb-2 md:pb-0 border-b md:border-b-0 border-outline-variant/30">
          <div className="flex items-center justify-between px-2">
            <h2 className="font-headline text-2xl font-bold text-primary">MESSAGES</h2>
            <button
              onClick={() => {
                loadContacts();
                setShowNewModal(true);
              }}
              className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center hover:bg-primary/20 transition-all group"
              title="New Message"
            >
              <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">
                edit_square
              </span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-2 no-scrollbar">
            {messages.length === 0 ? (
              <div className="text-center py-12 px-4 text-on-surface-variant/60 text-xs font-bold">
                No conversations yet. Click the edit icon above to start messaging.
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => setSelectedContact(msg)}
                  className={`w-full p-4 rounded-[28px] transition-all flex items-center gap-4 cursor-pointer group ${
                    selectedContact?.contactId === msg.contactId
                      ? "bg-[#027906] text-white shadow-lg shadow-[#027906]/20"
                      : "bg-surface-container-low hover:bg-surface-container text-on-surface"
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl flex-shrink-0 ${
                      selectedContact?.contactId === msg.contactId
                        ? "bg-white/20 text-white"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {msg.contactName?.[0] || "?"}
                  </div>
                  <div className="flex-1 text-left overflow-hidden">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="font-bold text-sm truncate">{msg.contactName}</span>
                      <span
                        className={`text-[10px] uppercase font-bold opacity-60 ${
                          selectedContact?.contactId === msg.contactId ? "text-white" : "text-outline"
                        }`}
                      >
                        {msg.createdAt
                          ? new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </span>
                    </div>
                    <p
                      className={`text-xs font-medium truncate opacity-70 ${
                        selectedContact?.contactId === msg.contactId
                          ? "text-white/80"
                          : "text-on-surface-variant"
                      }`}
                    >
                      {msg.content}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteMessage(msg.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-2 hover:bg-error/20 rounded-full transition-all text-error flex items-center justify-center"
                    title="Delete message"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Main Content: Active Chat */}
        <main className="flex-1 glass-panel rounded-[40px] flex flex-col overflow-hidden shadow-2xl shadow-primary/5 bg-white/40">
          {selectedContact ? (
            <>
              {/* Chat Header */}
              <div className="px-8 py-5 border-b border-outline-variant/30 flex justify-between items-center bg-white/60">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                    <span
                      className="material-symbols-outlined text-primary"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      person
                    </span>
                  </div>
                  <div>
                    <h3 className="font-headline font-bold text-on-surface leading-none">
                      {selectedContact.contactName}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="w-2 h-2 rounded-full bg-[#027906] animate-pulse"></span>
                      <span className="text-[10px] font-bold text-[#027906] uppercase tracking-widest">
                        {formatRoleLabel(selectedContact.contactRole)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteConversation}
                    className="w-10 h-10 rounded-full hover:bg-error/10 text-error/70 hover:text-error flex items-center justify-center transition-all"
                    title="Delete Entire Conversation"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                  <button className="w-10 h-10 rounded-full hover:bg-black/5 flex items-center justify-center transition-all">
                    <span className="material-symbols-outlined text-outline">videocam</span>
                  </button>
                  <button className="w-10 h-10 rounded-full hover:bg-black/5 flex items-center justify-center transition-all">
                    <span className="material-symbols-outlined text-outline">call</span>
                  </button>
                </div>
              </div>

              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
                {chatHistory.map((chat) => {
                  const isMine = String(chat.senderId) === String(userId);
                  return (
                    <div
                      key={chat.id}
                      className={`flex items-center gap-2 group ${
                        isMine ? "justify-end" : "justify-start"
                      }`}
                    >
                      {isMine && (
                        <button
                          onClick={() => handleDeleteMessage(chat.id)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-error/60 hover:text-error transition-all"
                          title="Delete message"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      )}
                      <div
                        className={`max-w-[70%] p-4 rounded-2xl ${
                          isMine
                            ? "bg-[#027906] text-white rounded-br-sm shadow-md"
                            : "bg-surface-container-high text-on-surface rounded-bl-sm shadow-sm border border-outline-variant/30"
                        }`}
                      >
                        <p className="text-sm font-medium leading-relaxed">{chat.content}</p>
                        <p
                          className={`text-[10px] font-bold mt-2 opacity-60 uppercase tracking-widest ${
                            isMine ? "text-white" : "text-outline"
                          }`}
                        >
                          {chat.createdAt
                            ? new Date(chat.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </p>
                      </div>
                      {!isMine && (
                        <button
                          onClick={() => handleDeleteMessage(chat.id)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-error/60 hover:text-error transition-all"
                          title="Delete message"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-6 bg-white/60 border-t border-outline-variant/30">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex items-center gap-4 bg-surface-container-low p-2 rounded-[32px] border border-outline-variant/50 focus-within:border-primary transition-all"
                >
                  <button
                    type="button"
                    className="w-10 h-10 rounded-full hover:bg-black/5 flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-outline">add_circle</span>
                  </button>
                  <input
                    type="text"
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Type your secure message..."
                    className="flex-1 bg-transparent border-none focus:ring-0 py-2.5 px-2 text-sm font-medium text-on-surface placeholder:text-outline outline-none"
                  />
                  <button
                    type="submit"
                    disabled={sending || !replyContent.trim()}
                    className="w-10 h-10 rounded-full bg-[#027906] text-white flex items-center justify-center shadow-lg shadow-[#027906]/20 hover:scale-105 transition-all disabled:opacity-50 disabled:grayscale"
                  >
                    <span
                      className="material-symbols-outlined text-xl"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      send
                    </span>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 opacity-80">
              <span className="material-symbols-outlined text-8xl mb-4 text-primary">forum</span>
              <h3 className="text-xl font-bold text-on-surface mb-2">Secure Inbox</h3>
              <p className="text-sm text-on-surface-variant max-w-md mb-6">
                Select an existing conversation from the left or click below to message a connection.
              </p>
              <button
                onClick={() => {
                  loadContacts();
                  setShowNewModal(true);
                }}
                className="btn-premium bg-[#027906] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-[#027906]/20"
              >
                <span className="material-symbols-outlined">edit_square</span>
                Write New Message
              </button>
            </div>
          )}
        </main>
      </div>

      {/* New Message Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-3xl p-8 shadow-2xl relative">
            <button
              onClick={() => setShowNewModal(false)}
              className="absolute top-6 right-6 w-8 h-8 rounded-full bg-surface-container flex items-center justify-center hover:bg-error/10 hover:text-error transition-all"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
            <h3 className="font-headline text-2xl font-bold text-on-surface mb-2">New Message</h3>
            <p className="text-sm text-on-surface-variant font-medium mb-6">
              Send a direct secure message to any connection.
            </p>

            <form onSubmit={handleSendNewMessage} className="space-y-4 text-left">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">
                  Select Recipient
                </label>
                <select
                  required
                  value={newReceiverId}
                  onChange={(e) => setNewReceiverId(e.target.value)}
                  className="w-full bg-surface-container mt-1 p-4 rounded-xl text-on-surface font-bold focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                >
                  <option value="">-- Choose Recipient --</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({formatRoleLabel(c.role)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1">
                  Message
                </label>
                <textarea
                  required
                  rows={4}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Type your message here..."
                  className="w-full bg-surface-container mt-1 p-4 rounded-xl text-on-surface font-bold focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="flex-1 py-3.5 rounded-xl font-bold bg-surface-container text-on-surface hover:bg-outline-variant/30 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newSending || !newReceiverId || !newContent.trim()}
                  className="flex-1 py-3.5 rounded-xl font-bold bg-[#027906] text-white hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-[#027906]/20 disabled:opacity-50"
                >
                  {newSending ? "Sending..." : "Send Message"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reusable Confirm Delete Modal */}
      <ConfirmModal
        open={Boolean(confirmDeleteTarget)}
        title={confirmDeleteTarget?.type === "CONVERSATION" ? "Delete Conversation?" : "Delete Message?"}
        message={
          confirmDeleteTarget?.type === "CONVERSATION"
            ? "Are you sure you want to delete this entire conversation? All messages will be permanently removed."
            : "Are you sure you want to delete this message? This action cannot be undone."
        }
        confirmText="Delete"
        cancelText="Cancel"
        loading={deleting}
        onConfirm={handleConfirmDeleteAction}
        onCancel={() => setConfirmDeleteTarget(null)}
      />

      <ToastContainer position="top-right" autoClose={2200} theme="colored" />
    </DashboardLayout>
  );
}
