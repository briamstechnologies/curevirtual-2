import { useState } from "react";
import { FiSend } from "react-icons/fi";
import { supabase } from "../../../Lib/supabase";
import DashboardLayout from "../../../layouts/DashboardLayout";

export default function SendMessage() {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSend = async () => {
    if (!recipientEmail || !message) {
      alert("Email aur Message dono likhein!");
      return;
    }

    // 1. Supabase se current logged-in user ki ID uthao (Security ke liye)
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const currentUserId = session?.user?.id;

    if (!currentUserId) {
      alert("Aap login nahi hain, please login karen!");
      return;
    }

    // 2. Database mein 'DoctorProfile' table se email check karo
    let { data: doctorData, error: doctorError } = await supabase
      .from("DoctorProfile")
      .select("userId")
      .eq("email", recipientEmail.trim().toLowerCase())
      .single();

    if (doctorError || !doctorData) {
      alert("Error: Yeh email DoctorProfile mein nahi mili.");
      return;
    }

    // 3. Message bhejo 'Message' table mein (RLS policy isay ab allow karegi)
    const { error: msgError } = await supabase.from("Message").insert([
      {
        senderId: currentUserId, // Yahan ab local storage nahi, authentic UID ja rahi hai
        receiverId: doctorData.userId,
        content: message,
      },
    ]);

    if (msgError) {
      console.error("Supabase Error:", msgError);
      alert("Message bhejne mein masla hua: " + msgError.message);
    } else {
      alert("Success! Message Doctor tak pohanch gaya.");
      setRecipientEmail("");
      setMessage("");
    }
  };

  return (
    <DashboardLayout role="LABORATORY" user={{ name: localStorage.getItem("userName") }}>
      <div className="p-10">
        <h1 className="text-2xl font-black uppercase mb-6">Send Message</h1>
        <div className="glass-panel p-8 space-y-6">
          <input
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            placeholder="Doctor ki Email likhein..."
            className="w-full p-4 rounded-xl bg-[var(--bg-main)] border border-[var(--border)] outline-none"
          />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message..."
            className="w-full p-4 h-40 rounded-xl bg-[var(--bg-main)] border border-[var(--border)] outline-none"
          />
          <button
            onClick={handleSend}
            className="bg-[var(--brand-purple)] text-white px-8 py-4 rounded-xl font-bold"
          >
            <FiSend className="inline mr-2" /> Send Message
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
