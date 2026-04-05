
import ZegoVideoCall from "../../components/ZegoVideoCall";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function VideoCallModal({ consultation, onClose }) {
  const userName = localStorage.getItem("userName") || "Patient";
  const userId = localStorage.getItem("userId") || `dummy-${Date.now()}`;
  const { id, roomName, meetingUrl } = consultation || {};
  const activeRoomName = meetingUrl || roomName || `consult-${id}`;





  return (
    <div className="fixed inset-0 bg-black flex justify-center items-center z-[200]">
      <div className="w-full h-full flex flex-col relative overflow-hidden">
        {/* Zego Video Call */}
        <ZegoVideoCall
          roomName={activeRoomName}
          userName={userName}
          userId={userId}
          onClose={onClose}
        />


      </div>
      <ToastContainer position="top-right" theme="dark" />
    </div>
  );
}
