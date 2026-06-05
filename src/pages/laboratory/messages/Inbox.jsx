// FILE: src/pages/laboratory/messages/Inbox.jsx

import { useState } from "react";
import {
  FiSearch,
  FiSend,
  FiMail,
  FiUser,
  FiClock,
} from "react-icons/fi";
import { Link } from "react-router-dom";

export default function Inbox() {
  const [search, setSearch] = useState("");

  const messages = [
    {
      id: 1,
      sender: "Dr. Ahmed",
      subject: "Blood Test Report",
      preview: "Please upload patient CBC report urgently.",
      time: "10 min ago",
      unread: true,
    },
    {
      id: 2,
      sender: "Ali Khan",
      subject: "Test Appointment",
      preview: "Can I reschedule my appointment?",
      time: "1 hour ago",
      unread: false,
    },
    {
      id: 3,
      sender: "Admin",
      subject: "Subscription Reminder",
      preview: "Your laboratory subscription expires soon.",
      time: "Yesterday",
      unread: false,
    },
  ];

  const filteredMessages = messages.filter(
    (msg) =>
      msg.sender.toLowerCase().includes(search.toLowerCase()) ||
      msg.subject.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen p-6 md:p-10 bg-[var(--bg-main)]">
      
      {/* Header */}
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
          <FiSend />
          Send Message
        </Link>
      </div>

      {/* Search */}
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

      {/* Messages */}
      <div className="space-y-5">
        {filteredMessages.map((msg) => (
          <div
            key={msg.id}
            className={`glass-panel rounded-3xl p-6 border transition-all hover:scale-[1.01] ${
              msg.unread
                ? "border-[var(--brand-blue)]"
                : "border-[var(--border)]"
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">

              {/* Left */}
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[var(--brand-blue)]/10 flex items-center justify-center text-[var(--brand-blue)] text-xl">
                  <FiMail />
                </div>

                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-black text-[var(--text-main)]">
                      {msg.subject}
                    </h3>

                    {msg.unread && (
                      <span className="text-[9px] font-black uppercase px-3 py-1 rounded-full bg-[var(--brand-blue)] text-white tracking-widest">
                        New
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-2 text-sm text-[var(--text-muted)]">
                    <FiUser />
                    {msg.sender}
                  </div>

                  <p className="text-sm text-[var(--text-soft)] mt-3">
                    {msg.preview}
                  </p>
                </div>
              </div>

              {/* Right */}
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
                <FiClock />
                {msg.time}
              </div>
            </div>
          </div>
        ))}

        {filteredMessages.length === 0 && (
          <div className="glass-panel rounded-3xl p-10 text-center">
            <p className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest">
              No messages found
            </p>
          </div>
        )}
      </div>
    </div>
  );
}