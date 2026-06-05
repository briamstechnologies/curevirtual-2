import { useState } from "react";
import { FiSend } from "react-icons/fi";

export default function SendMessage() {
  const [receiver, setReceiver] = useState("");
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (!receiver || !message) {
      alert("Fill all fields");
      return;
    }

    alert(`Message sent to ${receiver}`);
    setReceiver("");
    setMessage("");
  };

  return (
    <div className="p-6 md:p-10 min-h-screen bg-[var(--bg-main)]">
      
      <h1 className="text-2xl font-black uppercase mb-6 text-[var(--text-main)]">
        Send Message
      </h1>

      <div className="glass-panel p-6 space-y-4">

        <input
          type="text"
          placeholder="Receiver (Doctor / Patient / Admin)"
          value={receiver}
          onChange={(e) => setReceiver(e.target.value)}
          className="w-full p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]"
        />

        <textarea
          placeholder="Write message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full p-3 h-40 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]"
        />

        <button
          onClick={handleSend}
          className="flex items-center gap-2 bg-[var(--brand-purple)] text-white px-6 py-3 rounded-xl font-bold"
        >
          <FiSend /> Send Message
        </button>

      </div>
    </div>
  );
}