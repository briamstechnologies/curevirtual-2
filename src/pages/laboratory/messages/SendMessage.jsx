// FILE: src/pages/laboratory/messages/SendMessage.jsx
import { useEffect, useState } from "react";
import { FaPaperPlane } from "react-icons/fa";
import { FiUser, FiMessageSquare } from "react-icons/fi";
import DashboardLayout from "../../../layouts/DashboardLayout";
import api from "../../../Lib/api";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function LabSendMessage() {
  const [contacts, setContacts] = useState([]);
  const [receiverId, setReceiverId] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const labUserId = localStorage.getItem("userId");
  const userName = localStorage.getItem("userName") || "Lab";

  useEffect(() => {
    async function fetchContacts() {
      try {
        setLoading(true);
        const res = await api.get("/messages/contacts/all");
        const all = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setContacts(all.filter((u) => u.role === "DOCTOR"));
      } catch (err) {
        console.error("Contacts fetch error:", err);
        toast.error("Contacts load nahi ho sake.");
      } finally {
        setLoading(false);
      }
    }
    fetchContacts();
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!receiverId || !content.trim()) {
      toast.error("Doctor select karein aur message likhein!");
      return;
    }
    setSending(true);
    try {
      await api.post("/messages/send", {
        senderId: labUserId,
        receiverId,
        content: content.trim(),
      });
      toast.success("Message sent successfully!");
      setReceiverId("");
      setContent("");
    } catch (err) {
      console.error("Send failed:", err);
      toast.error("Message bhejne mein masla hua.");
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardLayout role="LABORATORY" user={{ id: labUserId, name: userName }}>
      {/* Container ko full height aur centering di hai */}
      <div className="animate-in fade-in duration-700 min-h-[80vh] flex flex-col justify-center">
        {/* Header */}
        <div className="mb-10 max-w-4xl mx-auto w-full px-4">
          <h1 className="text-4xl font-black uppercase tracking-tight text-[var(--text-main)]">
            Send Message
          </h1>
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--brand-purple)] mt-2">
            Compose & send to doctor
          </p>
        </div>

        {/* Form Card - max-w-4xl (wider) aur padding zyada */}
        <div className="glass-panel rounded-[2rem] p-10 max-w-4xl w-full mx-auto shadow-2xl border border-[var(--border)]">
          <form onSubmit={handleSend}>
            {/* Doctor Select */}
            <div className="mb-8">
              <label className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-4 flex items-center gap-2">
                <FiUser className="text-[var(--brand-purple)]" /> Select Doctor
              </label>
              {loading ? (
                <div className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-main)] py-5 px-6 text-sm text-[var(--text-muted)]">
                  Loading doctors...
                </div>
              ) : (
                <select
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-main)] py-4 px-6 outline-none focus:ring-2 focus:ring-[var(--brand-purple)] transition-all cursor-pointer text-lg"
                  value={receiverId}
                  onChange={(e) => setReceiverId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Doctor --</option>
                  {contacts.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Message Area - height badha di hai */}
            <div className="mb-10">
              <label className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-4 flex items-center gap-2">
                <FiMessageSquare className="text-[var(--brand-purple)]" /> Message
              </label>
              <textarea
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-main)] p-6 h-64 outline-none focus:ring-2 focus:ring-[var(--brand-purple)] transition-all resize-none text-base"
                placeholder="Type your message here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
            </div>

            {/* Send Button - Full width on mobile, auto on desktop */}
            <button
              type="submit"
              disabled={sending || !receiverId || !content.trim()}
              className="w-full md:w-auto btn btn-primary rounded-2xl px-12 py-5 text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50 transition-transform hover:scale-[1.02]"
            >
              <FaPaperPlane />
              {sending ? "Sending..." : "Send Message"}
            </button>
          </form>
        </div>
      </div>
      <ToastContainer position="top-right" autoClose={2200} />
    </DashboardLayout>
  );
}
