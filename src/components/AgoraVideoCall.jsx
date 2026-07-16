import React, { useEffect, useRef, useState } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";
import api from "../Lib/api";
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaPhoneSlash } from "react-icons/fa";

/**
 * AgoraVideoCall — Replacement for ZEGO using Agora Web SDK.
 * Features: Picture-in-Picture style layout, manual call end, immediate camera open.
 */
export default function AgoraVideoCall({ roomName, userId, userName = "User", onClose, initialCallType = "video" }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Media state
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(initialCallType === "audio");

  // Call state
  const [remoteUserJoined, setRemoteUserJoined] = useState(false);

  // SDK refs
  const clientRef = useRef(null);
  const localTracksRef = useRef({ video: null, audio: null });

  // DOM refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Unique channel ID generator logic from Zego
  const channelName = String(roomName || `room-${Date.now()}`)
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 128);
  const safeUserId = String(userId || `user-${Date.now()}`)
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 64);

  useEffect(() => {
    let isMounted = true;

    const initAgora = async () => {
      try {
        setLoading(true);

        // 1. Fetch Agora Token from backend
        const res = await api.get(`/videocall/agora-token`, {
          params: { channelName, uid: safeUserId },
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });

        if (!res.data.token) {
          throw new Error("Failed to retrieve token from server.");
        }

        const { token } = res.data;
        const APP_ID = import.meta.env.VITE_AGORA_APP_ID || import.meta.env.AGORA_APP_ID;

        if (!APP_ID) {
          throw new Error("Agora APP ID is missing in .env");
        }

        // 2. Initialize Client
        const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        clientRef.current = client;

        // 3. Setup event listeners
        client.on("user-published", async (user, mediaType) => {
          await client.subscribe(user, mediaType);
          console.log("[Agora] Subscribed to user:", user.uid);
          setRemoteUserJoined(true);

          if (mediaType === "video" && remoteVideoRef.current) {
            user.videoTrack.play(remoteVideoRef.current);
          }
          if (mediaType === "audio") {
            user.audioTrack.play();
          }
        });

        client.on("user-unpublished", (user, mediaType) => {
          console.log("[Agora] User unpublished:", user.uid);
        });

        client.on("user-left", (user) => {
          console.log("[Agora] User left:", user.uid);
          setRemoteUserJoined(false);
        });

        // 4. Join channel
        await client.join(APP_ID, channelName, token, safeUserId);
        console.log("[Agora] Successfully joined channel");

        // 5. Create local tracks and publish IMMEDIATELY
        const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
        localTracksRef.current = { audio: audioTrack, video: videoTrack };

        if (initialCallType === "audio") {
          await videoTrack.setMuted(true);
        }

        if (localVideoRef.current) {
          videoTrack.play(localVideoRef.current);
        }

        await client.publish([audioTrack, videoTrack]);
        console.log("[Agora] Published local tracks");

        // Update DB status to ONGOING if it's a consult ID
        if (String(roomName).startsWith("consult_") || String(roomName).startsWith("consult-")) {
          const consultationId = String(roomName).split(/[_,-]/)[1];
          if (consultationId && !isNaN(Number(consultationId))) {
            api.put(`/videocall/status/${consultationId}`, { status: "ONGOING" })
               .catch(err => console.warn("Notice: could not update status:", err?.message));
          }
        }

        if (isMounted) setLoading(false);

      } catch (err) {
        console.error("❌ Agora Initialization Error:", err);
        if (isMounted) {
          setError(err.response?.data?.error || err.message || "Failed to initialize video call. Please check your camera permissions.");
          setLoading(false);
        }
      }
    };

    initAgora();

    // Cleanup on unmount
    return () => {
      isMounted = false;
      const leaveCall = async () => {
        try {
          // Stop and close local tracks
          if (localTracksRef.current.audio) {
            localTracksRef.current.audio.stop();
            localTracksRef.current.audio.close();
          }
          if (localTracksRef.current.video) {
            localTracksRef.current.video.stop();
            localTracksRef.current.video.close();
          }
          
          if (clientRef.current) {
            await clientRef.current.leave();
          }
          console.log("[Agora] Left channel and cleaned up.");
        } catch (e) {
          console.error("Error during Agora cleanup:", e);
        }
      };
      leaveCall();
    };
  }, [channelName, safeUserId, roomName]);

  // Controls
  const toggleMute = () => {
    if (localTracksRef.current.audio) {
      const state = !isMuted;
      localTracksRef.current.audio.setMuted(state);
      setIsMuted(state);
    }
  };

  const toggleVideo = () => {
    if (localTracksRef.current.video) {
      const state = !isVideoOff;
      localTracksRef.current.video.setMuted(state);
      setIsVideoOff(state);
    }
  };

  const handleEndCall = () => {
    if (onClose) onClose();
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-gray-900 text-white p-6 rounded-2xl min-h-[600px] border border-red-500/20">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-3xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold mb-2 text-red-500">Connection Failed</h2>
        <p className="text-gray-400 text-center max-w-md mb-6">{error}</p>
        <div className="flex gap-4">
          <button onClick={() => window.location.reload()} className="px-6 py-2.5 bg-[var(--brand-green)] text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg hover:opacity-90">
            Retry Connection
          </button>
          <button onClick={handleEndCall} className="px-6 py-2.5 bg-red-500 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-red-400">
            End Call
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col flex-1 bg-black overflow-hidden rounded-2xl shadow-2xl" style={{ minHeight: "600px" }}>
      
      {/* Remote Video Container (Main Background) */}
      <div ref={remoteVideoRef} className="absolute inset-0 w-full h-full bg-gray-900 flex items-center justify-center">
        {!remoteUserJoined && !loading && (
          <div className="flex flex-col items-center justify-center animate-pulse">
            <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-4 border-2 border-[var(--brand-green)]">
              <FaVideo className="text-[var(--brand-green)] text-2xl" />
            </div>
            <p className="text-white text-lg font-bold tracking-wider">Waiting for others to join...</p>
            <p className="text-gray-400 text-sm mt-2">You are currently the only one in the room.</p>
          </div>
        )}
      </div>

      {/* Local Video Container (Picture-in-Picture) */}
      <div 
        className="absolute bottom-24 right-6 w-48 h-72 bg-gray-800 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl z-10 transition-transform hover:scale-105"
      >
        <div ref={localVideoRef} className="w-full h-full object-cover" />
        {isVideoOff && (
          <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
            <FaVideoSlash className="text-gray-500 text-3xl" />
          </div>
        )}
        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded text-[10px] text-white font-bold tracking-wider backdrop-blur-sm">
          You ({userName})
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-900/90 backdrop-blur-sm">
          <div className="w-16 h-16 border-4 border-gray-700 border-t-[var(--brand-green)] rounded-full animate-spin mb-6" />
          <p className="text-[var(--brand-green)] text-sm font-black tracking-[0.3em] uppercase animate-pulse">
            Establishing Secure Connection...
          </p>
        </div>
      )}

      {/* Call Controls Bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-gray-900/80 backdrop-blur-md px-8 py-4 rounded-full border border-white/10 z-20 shadow-2xl">
        <button
          onClick={toggleMute}
          className={`w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all ${
            isMuted ? "bg-red-500 text-white" : "bg-gray-700 hover:bg-gray-600 text-white"
          }`}
          title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
        >
          {isMuted ? <FaMicrophoneSlash /> : <FaMicrophone />}
        </button>
        
        <button
          onClick={toggleVideo}
          className={`w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all ${
            isVideoOff ? "bg-red-500 text-white" : "bg-gray-700 hover:bg-gray-600 text-white"
          }`}
          title={isVideoOff ? "Turn On Camera" : "Turn Off Camera"}
        >
          {isVideoOff ? <FaVideoSlash /> : <FaVideo />}
        </button>

        <div className="w-px h-8 bg-white/20 mx-2" />

        <button
          onClick={handleEndCall}
          className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-full font-black uppercase text-xs tracking-widest shadow-lg flex items-center gap-2 transition-transform hover:scale-105"
        >
          <FaPhoneSlash /> End Call
        </button>
      </div>

    </div>
  );
}
