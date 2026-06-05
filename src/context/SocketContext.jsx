import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

import { SocketContext } from "./useSocket";
import api from "../Lib/api";
import { supabase } from "../Lib/supabase";
import { useUser } from "./UserContext";

export const SocketProvider = ({ children }) => {
  const { user } = useUser();

  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState("disconnected");

  const reconnectAttempts = useRef(0);

  // ✅ LOCAL + PRODUCTION AUTO SWITCH
  const backendUrl =
    import.meta.env.MODE === "development"
      ? "https://curevirtual-2-production-ee33.up.railway.app"
      : "https://curevirtual-2-production-ee33.up.railway.app";

  useEffect(() => {
    const userId = user?.id || localStorage.getItem("userId");
    const role = user?.role || localStorage.getItem("role");
    const name =
      user?.name || localStorage.getItem("userName") || localStorage.getItem("name") || "User";

    const token = localStorage.getItem("token");

    // ✅ Allow public pages without socket
    if (!userId || !role || !token) {
      console.log("ℹ️ Socket waiting for auth...");
      return;
    }

    console.log("🔌 Connecting socket to:", backendUrl);

    setConnectionState("connecting");

    const socketInstance = io(backendUrl, {
      withCredentials: true,

      // ✅ Important for localhost + Railway
      transports: ["polling", "websocket"],

      auth: {
        token,
      },

      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,

      timeout: 20000,
      autoConnect: true,
    });

    // =========================
    // CONNECTED
    // =========================
    socketInstance.on("connect", () => {
      console.log("✅ Socket Connected:", socketInstance.id);

      setSocket(socketInstance);
      setIsConnected(true);
      setConnectionState("connected");

      reconnectAttempts.current = 0;

      socketInstance.emit("user_online", {
        userId,
        role,
        name,
      });
    });

    // =========================
    // CONNECT ERROR
    // =========================
    socketInstance.on("connect_error", async (error) => {
      console.error("❌ Socket Error:", error.message);

      setIsConnected(false);
      setConnectionState("reconnecting");

      const authErrors = ["jwt expired", "Authentication required", "Invalid token"];

      if (authErrors.includes(error.message)) {
        try {
          console.log("🔄 Attempting token refresh...");

          const {
            data: { session },
            error: sessionError,
          } = await supabase.auth.getSession();

          if (sessionError || !session) {
            localStorage.clear();
            window.location.href = "/login";
            return;
          }

          const userEmail = localStorage.getItem("email");

          const res = await api.post("/auth/login-sync", {
            email: userEmail,
            supabaseId: session.user.id,
            supabaseAccessToken: session.access_token,
          });

          const newToken = res.data.token;

          if (newToken) {
            localStorage.setItem("token", newToken);

            socketInstance.auth.token = newToken;

            socketInstance.connect();

            console.log("✅ Socket token refreshed");
          }
        } catch (err) {
          console.error("❌ Token refresh failed:", err);

          localStorage.clear();
          window.location.href = "/login";
        }
      }
    });

    // =========================
    // RECONNECTING
    // =========================
    socketInstance.io.on("reconnect_attempt", (attempt) => {
      reconnectAttempts.current = attempt;

      console.log(`🔄 Reconnect Attempt: ${attempt}`);

      setConnectionState("reconnecting");
    });

    socketInstance.io.on("reconnect", (attempt) => {
      console.log(`✅ Reconnected after ${attempt} attempts`);

      setIsConnected(true);
      setConnectionState("connected");

      socketInstance.emit("user_online", {
        userId,
        role,
        name,
      });
    });

    socketInstance.io.on("reconnect_failed", () => {
      console.error("❌ Socket reconnect failed");

      setConnectionState("disconnected");
      setIsConnected(false);
    });

    // =========================
    // DISCONNECT
    // =========================
    socketInstance.on("disconnect", (reason) => {
      console.log("🔌 Socket disconnected:", reason);

      setIsConnected(false);

      if (reason === "io server disconnect") {
        socketInstance.connect();
      }

      setConnectionState("disconnected");
    });

    // =========================
    // CLEANUP
    // =========================
    return () => {
      console.log("🧹 Cleaning socket...");

      socketInstance.removeAllListeners();
      socketInstance.disconnect();
    };
  }, [user, backendUrl]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        connectionState,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
