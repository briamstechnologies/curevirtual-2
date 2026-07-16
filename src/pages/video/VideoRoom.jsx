import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import AgoraVideoCall from "../../components/AgoraVideoCall";
import { useSocket } from "../../context/useSocket";
import { FaPhoneSlash, FaSpinner } from "react-icons/fa";

export default function VideoRoomPage() {
  const { roomName } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { socket } = useSocket();

  const userName = localStorage.getItem("userName") || localStorage.getItem("name") || "User";
  const userId = localStorage.getItem("userId") || `dummy-${Date.now()}`;
  const role = localStorage.getItem("role") || "PATIENT";

  // If DOCTOR initiated, they arrive here and wait for patient.
  // We check if this was initiated by looking at location state or role.
  const isDoctor = role === "DOCTOR";
  const consultationId = location.state?.consultationId || roomName?.replace("consult_", "");
  const callType = location.state?.callType || "video";

  const [callStatus, setCallStatus] = useState(isDoctor ? "calling" : "accepted"); // "calling", "accepted", "rejected", "missed"

  useEffect(() => {
    if (!socket || !isDoctor) return;

    const onCallAccepted = (data) => {
      if (String(data.consultationId) === String(consultationId)) {
        setCallStatus("accepted");
      }
    };

    const onCallRejected = (data) => {
      if (String(data.consultationId) === String(consultationId)) {
        setCallStatus("rejected");
        setTimeout(() => navigate(-1), 3000);
      }
    };

    const onCallMissed = (data) => {
      if (String(data.consultationId) === String(consultationId)) {
        setCallStatus("missed");
        setTimeout(() => navigate(-1), 3000);
      }
    };

    socket.on("call-accepted", onCallAccepted);
    socket.on("call-rejected", onCallRejected);
    socket.on("call-missed", onCallMissed);

    return () => {
      socket.off("call-accepted", onCallAccepted);
      socket.off("call-rejected", onCallRejected);
      socket.off("call-missed", onCallMissed);
    };
  }, [socket, isDoctor, consultationId, navigate]);

  const handleClose = () => {
    navigate(-1);
  };

  const handleRemoteJoin = (users) => {
    if (users && users.length > 0) {
      setCallStatus("accepted");
    }
  };

  if (!roomName) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-white p-6">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">No Room Specified</h1>
          <p className="text-gray-400 mb-8">
            Please enter a valid room name to join a video consultation.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-[var(--brand-green)] rounded-xl font-bold hover:opacity-90 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-black relative">
      <AgoraVideoCall 
        roomName={roomName} 
        userName={userName} 
        userId={userId} 
        onClose={handleClose} 
        initialCallType={callType}
      />

      {/* Ringing Overlay */}
      {isDoctor && callStatus === "calling" && (
        <div className="absolute inset-x-0 top-10 flex justify-center pointer-events-none z-50">
          <div className="bg-black/60 backdrop-blur-md px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl border border-white/10 animate-in fade-in duration-500">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-ping"></div>
            <span className="text-white text-sm font-black tracking-[0.2em] uppercase">Ringing Patient...</span>
          </div>
        </div>
      )}

      {/* Rejected Overlay */}
      {isDoctor && callStatus === "rejected" && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-[100] animate-in fade-in">
          <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mb-6 animate-pulse shadow-[0_0_40px_rgba(220,38,38,0.5)]">
            <FaPhoneSlash className="text-white text-3xl" />
          </div>
          <h2 className="text-3xl text-white font-black tracking-tighter uppercase mb-2">Call Rejected</h2>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Patient declined the call.</p>
        </div>
      )}

      {/* Missed Overlay */}
      {isDoctor && callStatus === "missed" && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-[100] animate-in fade-in">
          <div className="w-20 h-20 bg-yellow-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(234,179,8,0.5)]">
            <FaPhoneSlash className="text-white text-3xl" />
          </div>
          <h2 className="text-3xl text-white font-black tracking-tighter uppercase mb-2">Call Not Answered</h2>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Patient did not respond in time.</p>
        </div>
      )}
    </div>
  );
}
