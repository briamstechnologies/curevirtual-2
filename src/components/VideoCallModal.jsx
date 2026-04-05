import ZegoVideoCall from "./ZegoVideoCall";

export default function VideoCallModal({ onClose }) {
  const roomName = localStorage.getItem("videoRoomName") || `cv-${Date.now()}`;
  const userName = localStorage.getItem("userName") || "User";
  const userId = localStorage.getItem("userId") || `dummy-${Date.now()}`;

  return (
    <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-50">
      {/* Header */}
      <div className="absolute top-4 left-6 text-white text-lg font-semibold z-20">
        Live Video Consultation
      </div>
      <button
        onClick={onClose}
        className="absolute top-4 right-6 text-red-500 text-xl hover:scale-110 transition z-20"
        title="End Call"
      >
        ✖
      </button>

      {/* Zego Video */}
      <div className="w-full h-full">
        <ZegoVideoCall roomName={roomName} userName={userName} userId={userId} onClose={onClose} />
      </div>
    </div>
  );
}
