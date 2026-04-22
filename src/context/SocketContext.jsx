import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

import { SocketContext } from "./useSocket";

// Derive socket URL from API base URL (strip /api suffix)
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";
const backendUrl = apiBaseUrl.replace(/\/api\/?$/, "");

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState("disconnected"); // 'disconnected' | 'connecting' | 'connected' | 'reconnecting'
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    // Get user info from localStorage
    const userId = localStorage.getItem("userId");
    const role = localStorage.getItem("role");
    const name = localStorage.getItem("userName") || localStorage.getItem("name") || "User";
    const token = localStorage.getItem("token"); // JWT token for authentication

    if (!userId || !role || !token) {
      console.warn("⚠️ No user credentials or token found. Socket connection delayed.");
      return;
    }

    setConnectionState("connecting");

    // Initialize socket connection with JWT auth
    const newSocket = io(backendUrl, {
      withCredentials: true,
      transports: ["websocket"], // 👈 FORCE WEBSOCKET
      auth: (cb) => {
        cb({ token: localStorage.getItem("token") });
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: maxReconnectAttempts,
    });

    // Connection successful
    newSocket.on("connect", () => {
      console.log("✅ Socket connected:", newSocket.id);
      setIsConnected(true);
      setConnectionState("connected");
      reconnectAttempts.current = 0;

      // Register user with the server
      newSocket.emit("user_online", {
        userId,
        role,
        name,
      });
    });

    // Connection error
    newSocket.on("connect_error", async (error) => {
      console.error("❌ Socket connection error:", error.message);
      
      // If authentication failed (e.g. jwt expired), try to refresh token
      if (error.message.includes("jwt expired") || error.message.includes("Authentication failed")) {
        console.warn("🔐 Socket Auth Failed: Token is likely expired or invalid. Attempting refresh.");
        newSocket.io.opts.reconnection = false; // stop auto reconnect
        newSocket.disconnect(); // cleanly stop before refresh
        
        try {
          const response = await fetch(`${apiBaseUrl}/auth/refresh`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            credentials: "include" 
          });

          if (!response.ok) {
            throw new Error("Refresh failed");
          }

          const data = await response.json();
          const newToken = data.accessToken || data.token; // Handle both
          
          if (newToken) {
            console.log("✅ Token successfully refreshed for socket reconnect.");
            localStorage.setItem("token", newToken);
            newSocket.io.opts.reconnection = true;
            newSocket.connect();
          } else {
            throw new Error("No token in refresh response");
          }
        } catch (refreshError) {
          console.error("❌ Token refresh failed. Socket stopping reconnection.", refreshError);
          setIsConnected(false);
          setConnectionState("disconnected");
        }
      } else {
        setIsConnected(false);
        setConnectionState("reconnecting");
      }
    });

    // Reconnect attempt
    newSocket.on("reconnect_attempt", (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}/${maxReconnectAttempts}`);
      setConnectionState("reconnecting");
      reconnectAttempts.current = attemptNumber;
    });

    // Reconnect successful
    newSocket.on("reconnect", (attemptNumber) => {
      console.log(`✅ Reconnected after ${attemptNumber} attempts`);
      setIsConnected(true);
      setConnectionState("connected");
      reconnectAttempts.current = 0;

      // Re-register user
      newSocket.emit("user_online", {
        userId,
        role,
        name,
      });
    });

    // Reconnect failed
    newSocket.on("reconnect_failed", () => {
      console.error("❌ Reconnection failed after maximum attempts");
      setIsConnected(false);
      setConnectionState("disconnected");
    });

    // Disconnected
    newSocket.on("disconnect", (reason) => {
      console.log("🔌 Socket disconnected:", reason);
      setIsConnected(false);
      if (reason === "io server disconnect") {
        // Server disconnected us, need to manually reconnect
        newSocket.connect();
      }
      setConnectionState("disconnected");
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []);

  const contextValue = {
    socket,
    isConnected,
    connectionState,
  };

  return <SocketContext.Provider value={contextValue}>{children}</SocketContext.Provider>;
};
