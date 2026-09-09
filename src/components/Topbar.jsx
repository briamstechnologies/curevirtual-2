// FILE: src/components/Topbar.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBell,
  FaSignOutAlt,
  FaUser,
  FaSun,
  FaMoon,
  FaClock,
  FaBars,
  FaChevronDown,
} from "react-icons/fa";
import api from "../Lib/api";
import { useTheme } from "../context/ThemeContext";
import { useUser } from "../context/UserContext";

export default function Topbar({ userName: propUserName, isMobileMenuOpen, setIsMobileMenuOpen }) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useUser();
  const [time, setTime] = useState(new Date());
  const [notificationCount, setNotificationCount] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userAvatar, setUserAvatar] = useState(
    user?.avatar_url || user?.avatarUrl || localStorage.getItem("userAvatar") || localStorage.getItem("profile_image")
  );

  useEffect(() => {
    const handleAvatarUpdate = () => {
      setUserAvatar(localStorage.getItem("userAvatar") || localStorage.getItem("profile_image"));
    };
    window.addEventListener("avatarUpdated", handleAvatarUpdate);
    return () => window.removeEventListener("avatarUpdated", handleAvatarUpdate);
  }, []);

  // Fallbacks
  const userId = user?.id || localStorage.getItem("userId");
  const role = user?.role || localStorage.getItem("role");
  const userName = user?.name || propUserName || localStorage.getItem("userName") || localStorage.getItem("name") || "User";

  // Auto fetch user avatar from profile if missing
  useEffect(() => {
    let isMounted = true;
    async function fetchUserProfile() {
      if (!userId || userAvatar) return;
      try {
        let fetchedAvatar = "";
        if (role === "DOCTOR" || role === "PHYSICIAN_ASSISTANT") {
          const res = await api.get("/doctor/profile", { params: { userId } });
          const data = res.data?.data || res.data;
          fetchedAvatar = data?.avatarUrl || data?.profileImage || data?.user?.avatarUrl || data?.user?.profile_image;
        } else if (role === "PATIENT") {
          const res = await api.get(`/patient/profile/${userId}`);
          const data = res.data?.data || res.data;
          fetchedAvatar = data?.avatarUrl || data?.profileImage || data?.profile_image;
        } else if (role === "ADMIN" || role === "SUPERADMIN") {
          const res = await api.get(`/users/${userId}`);
          const data = res.data?.data || res.data;
          fetchedAvatar = data?.avatarUrl || data?.profileImage || data?.profile_image;
        }
        if (fetchedAvatar && isMounted) {
          setUserAvatar(fetchedAvatar);
          localStorage.setItem("userAvatar", fetchedAvatar);
          localStorage.setItem("profile_image", fetchedAvatar);
        }
      } catch (e) {
        // silent fallback
      }
    }
    fetchUserProfile();
    return () => { isMounted = false; };
  }, [userId, role, userAvatar]);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch notification count
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!userId) return;

      try {
        if (role === "PATIENT") {
          const res = await api.get(`/notifications/count/${userId}`);
          setNotificationCount(res.data?.notifications || 0);
        } else {
          const res = await api.get("/messages/unread-count", {
            params: { userId },
          });
          setNotificationCount(res.data?.count ?? res.data?.data?.count ?? 0);
        }
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [userId, role]);

  const handleNotificationClick = () => {
    if (role === "PATIENT") navigate("/patient/messages");
    else if (role === "DOCTOR" || role === "PHYSICIAN_ASSISTANT")
      navigate("/doctor/messages/inbox");
    else if (role === "ADMIN") navigate("/admin/messages/inbox");
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleProfile = () => {
    if (role === "PATIENT") navigate("/patient/profile/view-profile");
    else if (role === "DOCTOR" || role === "PHYSICIAN_ASSISTANT") navigate("/doctor/view-profile");
    else if (role === "PHARMACY") navigate("/pharmacy/view-profile");
    else if (role === "ADMIN") navigate("/admin/profile");
    else if (role === "SUPERADMIN") navigate("/superadmin/profile");
    else if (role === "SUPPORT") navigate("/support/profile");
    setShowUserMenu(false);
  };

  const getUserAvatarUrl = () => {
    const custom =
      userAvatar ||
      localStorage.getItem("userAvatar") ||
      localStorage.getItem("profile_image") ||
      localStorage.getItem("profileImage") ||
      localStorage.getItem("avatarUrl");
    if (custom) return custom;

    const currentRole = (role || "").toUpperCase();
    if (currentRole.includes("DOCTOR") || currentRole.includes("PHYSICIAN")) {
      return "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=120";
    }
    if (currentRole.includes("PATIENT")) {
      const nameStr = userName || localStorage.getItem("name") || "Patient";
      const charCodeSum = nameStr.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const patientPhotos = [
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120",
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120",
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120",
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120",
      ];
      return patientPhotos[charCodeSum % patientPhotos.length];
    }
    if (currentRole.includes("PHARMACY")) {
      return "https://images.unsplash.com/photo-1586015555751-63bb77f4322a?auto=format&fit=crop&q=80&w=120";
    }
    if (currentRole.includes("LAB")) {
      return "https://images.unsplash.com/photo-1579165466741-7f35e4755660?auto=format&fit=crop&q=80&w=120";
    }

    const name = userName || localStorage.getItem("name") || "User";
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=027906&color=ffffff&bold=true`;
  };

  return (
    <header
      className={`sticky top-0 z-50 h-[70px] md:h-[80px] flex items-center justify-between px-4 md:px-8 backdrop-blur-xl border-b border-white/20 shadow-sm ${
        theme === "light"
          ? "bg-gradient-to-r from-green-900 via-emerald-900 to-green-900"
          : "bg-[var(--bg-glass)]"
      }`}
    >
      {/* Hamburger Menu Button - Mobile Only */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden p-3 rounded-2xl bg-white/10 border border-white/10 text-white hover:bg-white/20 transition-all active:scale-95 min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label="Toggle menu"
      >
        <FaBars className="w-5 h-5" />
      </button>

      {/* Logo and Welcome - Desktop */}
      <div className="hidden lg:flex flex-1 max-w-md items-center gap-3">
        <img src="/images/logo/Asset3.png" alt="Logo" className="w-8 h-8" />
        <h1 className="text-xl font-black tracking-tighter text-white animate-in fade-in slide-in-from-left-4 duration-500">
          Welcome back,{" "}
          <span className="text-emerald-300">{userName ? userName.split(" ")[0] : "User"}</span>
        </h1>
      </div>

      {/* Mobile Logo - Center aligned on mobile/tablet */}
      <div className="flex lg:hidden flex-1 items-center justify-center">
        <img src="/images/logo/Asset3.png" alt="Logo" className="w-8 h-8" />
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Clock - Hidden on tablets and mobile */}
        <div className="hidden xl:flex flex-col items-end pr-6 border-r border-white/20">
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-200">
            {time.toLocaleDateString([], { weekday: "long" })} &bull;{" "}
            {time.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" })}
          </span>
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <FaClock className="text-emerald-300" />
            {time.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </div>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2.5 md:p-3 rounded-2xl bg-white/10 border border-white/10 text-white hover:text-emerald-300 transition-all shadow-sm active:scale-95 min-h-[44px] min-w-[44px] flex items-center justify-center"
          title="Toggle Theme"
          aria-label="Toggle theme"
        >
          {theme === "light" ? <FaMoon className="w-4 h-4" /> : <FaSun className="w-4 h-4" />}
        </button>

        {/* Notification / Message Icon */}
        <button
          onClick={handleNotificationClick}
          className="p-2.5 md:p-3 rounded-2xl bg-white/10 border border-white/10 text-white hover:text-emerald-300 transition-all shadow-sm active:scale-95 min-h-[44px] min-w-[44px] flex items-center justify-center relative"
          title="Notifications & Messages"
        >
          <FaBell className="w-4 h-4" />
          {notificationCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-emerald-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center border-2 border-emerald-900 shadow-sm animate-pulse">
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          )}
        </button>

        {/* User Menu */}
        <div className="relative ml-1 md:ml-2">
          <button
            className="flex items-center gap-2 md:gap-3 p-1 pl-1 pr-3.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-all active:scale-95 shadow-sm min-h-[42px]"
            onClick={() => setShowUserMenu(!showUserMenu)}
            aria-label="User menu"
          >
            <img
              src={getUserAvatarUrl()}
              alt={userName}
              className="w-9 h-9 rounded-full object-cover border-2 border-emerald-400 shadow-sm flex-shrink-0"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName || "User")}&background=027906&color=ffffff&bold=true`;
              }}
            />
            <div className="hidden sm:flex items-center gap-2 whitespace-nowrap">
              <span className="text-sm font-semibold text-white tracking-tight">
                {userName || "User"}
              </span>
              <FaChevronDown
                className={`w-2.5 h-2.5 text-white/80 transition-transform duration-200 ${
                  showUserMenu ? "rotate-180" : ""
                }`}
              />
            </div>
          </button>

          {/* User Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 mt-3 w-56 bg-white p-2.5 rounded-2xl z-[9999] shadow-2xl border border-slate-100 animate-in zoom-in-95 fade-in duration-150 text-slate-800">
              <button
                onClick={handleProfile}
                className="w-full px-4 py-3 text-left rounded-xl hover:bg-slate-50 flex items-center gap-3 text-slate-800 transition-all group"
              >
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-105 transition-transform">
                  <FaUser className="text-sm" />
                </div>
                <span className="font-bold text-sm tracking-tight">View Profile</span>
              </button>
              <div className="my-1.5 border-t border-slate-100 mx-2" />
              <button
                onClick={handleLogout}
                className="w-full px-4 py-3 text-left rounded-xl hover:bg-red-50 flex items-center gap-3 text-red-600 transition-all group"
              >
                <div className="p-2 rounded-xl bg-red-50 text-red-500 group-hover:scale-105 transition-transform">
                  <FaSignOutAlt className="text-sm" />
                </div>
                <span className="font-bold text-sm tracking-tight">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Overlay for clicking outside */}
      {showUserMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
      )}
    </header>
  );
}

