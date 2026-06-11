import { useEffect, useState } from "react";
import { FaPaperPlane } from "react-icons/fa";
import DashboardLayout from "../../../layouts/DashboardLayout";
import api from "../../../Lib/api";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function DoctorSendMessage() {
  const [patients, setPatients] = useState([]);
  const [receiverId, setReceiverId] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const doctorUserId = localStorage.getItem("userId");
  const doctorName = localStorage.getItem("userName") || localStorage.getItem("name") || "Doctor";

  useEffect(() => {
    // Sirf ek dafa fetch karo
    async function fetchPatients() {
      try {
        setLoading(true);
        const res = await api.get("/doctor/patients", { params: { doctorUserId } });

        // Data format adjust karo (backend response ke hisaab se)
        const list = Array.isArray(res.data) ? res.data : res.data?.data || [];

        const normalized = list
          .map((p) => ({
            id: p?.user?.id ?? p?.userId ?? p?.id,
            name: p?.user?.name ?? p?.name ?? "Patient",
          }))
          .filter((p) => !!p.id);

        setPatients(normalized);
      } catch (err) {
        console.error("Failed to load patients:", err);
        toast.error("Patients list load nahi ho saki.");
      } finally {
        setLoading(false);
      }
    }
    fetchPatients();
  }, [doctorUserId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!receiverId || !content.trim()) {
      toast.error("Please select a patient and type a message.");
      return;
    }
    setSending(true);
    try {
      await api.post("/doctor/messages/send", {
        senderId: doctorUserId,
        receiverId,
        content: content.trim(),
      });
      toast.success("Message sent successfully!");
      setReceiverId("");
      setContent("");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Message bhejne mein masla hua.");
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardLayout role="DOCTOR" user={{ id: doctorUserId, name: doctorName }}>
      <div className="p-6 min-h-screen bg-[var(--bg-main)]/90 text-[var(--text-main)]">
        <img
          src="/images/logo/Asset3.png"
          alt="CureVirtual"
          style={{ width: 120, height: "auto" }}
          onError={(e) => {
            e.currentTarget.src = "/placeholder-logo.png";
          }}
        />
        <h1 className="text-2xl font-bold mb-6 text-[#ffffff]">Send Message</h1>

        <form
          onSubmit={handleSend}
          className="bg-[var(--bg-glass)] backdrop-blur-md rounded-2xl p-6 shadow-lg max-w-xl mx-auto"
        >
          <div className="mb-4">
            <label className="block font-semibold mb-2">Select Patient</label>
            {loading ? (
              <p className="text-sm">Loading patients...</p>
            ) : (
              <select
                className="w-full border border-gray-300 text-black rounded-md p-2"
                value={receiverId}
                onChange={(e) => setReceiverId(e.target.value)}
                required
              >
                <option value="">-- Choose Patient --</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="mb-4">
            <label className="block font-semibold mb-2">Message</label>
            <textarea
              className="w-full border border-gray-300 text-black rounded-md p-3 h-32 focus:outline-none focus:ring-2 focus:ring-[#027906]"
              placeholder="Type your message here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            ></textarea>
          </div>

          <button
            type="submit"
            disabled={sending || !receiverId || !content.trim()}
            className="bg-[#027906] text-[var(--text-main)] px-5 py-2 rounded-md hover:bg-[#190366] flex items-center gap-2 disabled:opacity-60"
          >
            <FaPaperPlane />
            {sending ? "Sending..." : "Send Message"}
          </button>
        </form>
      </div>
      <ToastContainer position="top-right" autoClose={2200} />
    </DashboardLayout>
  );
}
