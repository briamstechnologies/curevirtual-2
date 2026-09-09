import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "../Lib/api";
import { useSocket } from "../context/useSocket";

export default function Sidebar({ role: propRole, isMobileMenuOpen, setIsMobileMenuOpen }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const role = propRole || localStorage.getItem("role") || "PATIENT";
  const [openDropdown, setOpenDropdown] = useState(() => {
    if (role === "ADMIN") return "admin-subscribers";
    if (role === "SUPERADMIN") return "superadmin-subscribers";
    if (role === "PATIENT") return "patient-network";
    return null;
  });

  const userId = localStorage.getItem("userId");
  const { socket } = useSocket();
  const [paPermissions, setPaPermissions] = useState(null);
  const [userAvatar, setUserAvatar] = useState(
    localStorage.getItem("userAvatar") || localStorage.getItem("profile_image") || localStorage.getItem("profileImage")
  );

  useEffect(() => {
    if (location.pathname.includes("/subscribers")) {
      if (role === "SUPERADMIN") setOpenDropdown("superadmin-subscribers");
      else if (role === "ADMIN") setOpenDropdown("admin-subscribers");
    } else if (
      location.pathname.includes("/admin/manage-users") ||
      location.pathname.includes("/admin/corporate-accounts") ||
      location.pathname.includes("/admin/reports")
    ) {
      if (role === "ADMIN") setOpenDropdown("admin-manage-users");
    }
  }, [location.pathname, role]);

  useEffect(() => {
    const handleAvatarUpdate = () => {
      setUserAvatar(localStorage.getItem("userAvatar") || localStorage.getItem("profile_image") || localStorage.getItem("profileImage"));
    };
    window.addEventListener("avatarUpdated", handleAvatarUpdate);
    return () => window.removeEventListener("avatarUpdated", handleAvatarUpdate);
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function fetchProfile() {
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
    fetchProfile();
    return () => { isMounted = false; };
  }, [userId, role, userAvatar]);

  useEffect(() => {
    let mounted = true;
    if (role === "PHYSICIAN_ASSISTANT") {
      const fetchStatus = async () => {
        try {
          const res = await api.get("/doctor/pa-status");
          if (mounted && res.data.permissions) {
            setPaPermissions(res.data.permissions);
          }
        } catch (e) {
          console.error("Failed to fetch PA status:", e);
        }
      };
      fetchStatus();
    }
    return () => { mounted = false; };
  }, [role]);

  useEffect(() => {
    if (role === "PHYSICIAN_ASSISTANT" && socket) {
      const handleAccessUpdate = () => {
        api.get("/doctor/pa-status").then(res => {
          if (res.data.permissions) {
            setPaPermissions(res.data.permissions);
          }
        }).catch(console.error);
      };
      
      socket.on("pa_access_update", handleAccessUpdate);
      return () => {
        socket.off("pa_access_update", handleAccessUpdate);
      };
    }
  }, [role, socket]);

  useEffect(() => {
    let mounted = true;
    async function loadCounters() {
      try {
        if (!userId) return;
        const res = await api.get(`/messages/unread-count`, { params: { userId } });
        const raw = res?.data;
        const count = raw?.count ?? raw?.data?.count ?? 0;
        if (mounted) setUnreadCount(Number(count) || 0);
      } catch { /* silent */ }
    }
    loadCounters();
    const t = setInterval(loadCounters, 3000);
    window.addEventListener("messagesRead", loadCounters);
    return () => {
      mounted = false;
      clearInterval(t);
      window.removeEventListener("messagesRead", loadCounters);
    };
  }, [userId]);

  const isActive = (path) => location.pathname === path;

  const NavItem = ({ to, icon, label, badge }) => (
    <Link
      to={to}
      onClick={() => setIsMobileMenuOpen?.(false)}
      className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
        isActive(to)
          ? "bg-surface-container-highest text-primary shadow-lg shadow-primary/5"
          : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
      }`}
    >
      <span className={`material-symbols-outlined text-2xl transition-all ${isActive(to) ? "" : "opacity-70 group-hover:opacity-100"}`} style={{ fontVariationSettings: isActive(to) ? "'FILL' 1" : "" }}>
        {icon}
      </span>
      {open && <span className="font-headline text-sm font-bold tracking-tight flex-1">{label}</span>}
      {badge > 0 && (
        <span className="bg-[#027906] text-white text-[11px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center ml-auto shrink-0 shadow-sm">
          {badge}
        </span>
      )}
    </Link>
  );

  const DropdownItem = ({ icon, label, id, children }) => {
    const isOpen = openDropdown === id;
    return (
      <div className="space-y-1">
        <button
          onClick={() => setOpenDropdown(isOpen ? null : id)}
          className={`w-full flex items-center justify-between gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 ${
            isOpen ? "bg-surface-container text-on-surface" : "text-on-surface-variant hover:bg-surface-container-high"
          }`}
        >
          <div className="flex items-center gap-4 flex-1">
            <span className="material-symbols-outlined text-2xl opacity-70" style={{ fontVariationSettings: isOpen ? "'FILL' 1" : "" }}>{icon}</span>
            {open && <span className="font-headline text-sm font-bold tracking-tight">{label}</span>}
          </div>
          {open && (
            <span className={`material-symbols-outlined text-lg transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}>
              expand_more
            </span>
          )}
        </button>
        {isOpen && open && (
          <div className="ml-6 pl-4 border-l-2 border-outline-variant/30 space-y-1 animate-in slide-in-from-top-2">
            {children}
          </div>
        )}
      </div>
    );
  };

  const SubItem = ({ to, label }) => (
    <Link
      to={to}
      onClick={() => setIsMobileMenuOpen?.(false)}
      className={`flex items-center px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
        isActive(to) ? "text-primary bg-primary-container/10" : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
      }`}
    >
      {label}
    </Link>
  );

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
      const nameStr = localStorage.getItem("name") || localStorage.getItem("userName") || "Patient";
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

    const name = localStorage.getItem("name") || localStorage.getItem("userName") || "User";
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=027906&color=ffffff&bold=true`;
  };

  return (
    <>
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/40 z-[55] lg:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
      )}
      <aside className={`h-screen border-r border-[var(--border)] transition-all duration-500 ease-in-out flex flex-col z-[60] bg-[var(--bg-glass)] backdrop-blur-3xl fixed lg:sticky top-0 left-0 ${open ? "w-72" : "w-24"} ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="p-6 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="bg-primary/10 p-2 rounded-2xl cursor-pointer" onClick={() => setOpen(!open)}>
              <img src="/images/logo/Asset3.png" alt="Logo" className="w-8 h-8" />
            </div>
            {open && (
              <div className="animate-in fade-in slide-in-from-left-4">
                <p className="text-xl font-black tracking-tighter text-on-surface">Cure<span className="text-primary italic">Virtual</span></p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-outline">{role} CONSOLE</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto no-scrollbar">
          {role === "SUPERADMIN" && (
            <>
              <NavItem to="/superadmin/dashboard" icon="space_dashboard" label="Command Center" />
              <NavItem to="/superadmin/manage-admins" icon="admin_panel_settings" label="Admin Roster" />
              <NavItem to="/superadmin/activity-logs" icon="monitoring" label="Audit Logs" />
              <NavItem to="/superadmin/payments" icon="payments" label="Financial Flow" />
              <NavItem to="/superadmin/profile" icon="badge" label="My Identity" />
              <DropdownItem icon="hub" label="Network Subscriptions" id="superadmin-subscribers">
                <SubItem to="/superadmin/subscribers/doctors" label="Doctors" />
                <SubItem to="/superadmin/subscribers/patients" label="Patients" />
                <SubItem to="/superadmin/subscribers/pharmacy" label="Pharmacies" />
                <SubItem to="/superadmin/subscribers/laboratory" label="Laboratories" />
              </DropdownItem>
            </>
          )}

          {role === "ADMIN" && (
            <>
              <NavItem to="/admin/dashboard" icon="grid_view" label="Overview" />
              <DropdownItem icon="manage_accounts" label="Manage Users" id="admin-manage-users">
                <SubItem to="/admin/manage-users" label="Registry" />
                <SubItem to="/admin/corporate-accounts" label="Provisioning" />
                <SubItem to="/admin/reports" label="Activity" />
              </DropdownItem>
              <NavItem to="/admin/registration-requests" icon="verified_user" label="Approval Queue" />
              <NavItem to="/admin/messages/inbox" icon="mail" label="Inbox" badge={unreadCount} />
              <NavItem to="/admin/subscription" icon="credit_card" label="Subscriptions" />
              <DropdownItem icon="group" label="Subscribers" id="admin-subscribers">
                <SubItem to="/admin/subscribers/doctors" label="Doctors" />
                <SubItem to="/admin/subscribers/patients" label="Patients" />
                <SubItem to="/admin/subscribers/pharmacy" label="Pharmacies" />
                <SubItem to="/admin/subscribers/laboratory" label="Laboratories" />
              </DropdownItem>
              <NavItem to="/admin/profile" icon="badge" label="My Profile" />
            </>
          )}

          {(role === "DOCTOR" || role === "PHYSICIAN_ASSISTANT") && (
            <>
              <NavItem to="/doctor/dashboard" icon="dashboard" label="My Dashboard" />
              <NavItem to="/doctor/appointments" icon="event" label="Appointments" />
              <NavItem to="/doctor/my-patients" icon="groups" label="My Patients" />
              <NavItem to="/doctor/schedule" icon="calendar_clock" label="My Schedule" />
              <NavItem to="/doctor/prescriptions" icon="prescriptions" label="Prescriptions" />
              {role === "DOCTOR" && (
                <NavItem to="/doctor/pa-management" icon="badge" label="PA Management" />
              )}
              <NavItem to="/doctor/lab-reports" icon="biotech" label="Lab Reports" />
              
              {(role === "DOCTOR" || paPermissions?.canAccessTelehealthBridge) && (
                <NavItem to="/doctor/video-consultation" icon="videocam" label="Telehealth Bridge" />
              )}
              
              {(role === "DOCTOR" || paPermissions?.canAccessSecureInbox) && (
                <NavItem
                  to={role === "PHYSICIAN_ASSISTANT" ? "/pa/messages/inbox" : "/doctor/messages/inbox"}
                  icon="chat_bubble"
                  label="Messages"
                  badge={unreadCount}
                />
              )}
              
              {role === "DOCTOR" && (
                <NavItem to="/doctor/view-profile" icon="badge" label="My Identity" />
              )}
              {role === "PHYSICIAN_ASSISTANT" && (
                <NavItem to="/pa/view-profile" icon="badge" label="My Identity" />
              )}
            </>
          )}

          {role === "PATIENT" && (
            <>
              <NavItem to="/patient/dashboard" icon="dashboard" label="My Dashboard" />
              <NavItem to="/patient/my-appointments" icon="calendar_today" label="My Appointments" />
              <NavItem to="/patient/prescriptions" icon="medication" label="Medications" />
              <NavItem to="/patient/history" icon="history_edu" label="Health Narrative" />
              <NavItem to="/patient/messages" icon="chat_bubble" label="Messages" badge={unreadCount} />
              <NavItem to="/patient/video-consultation" icon="videocam" label="Join Room" />
              <NavItem to="/patient/profile/view-profile" icon="badge" label="My Identity" />
              <DropdownItem icon="local_hospital" label="Network" id="patient-network">
                <SubItem to="/patient/doctors/list" label="Find Doctors" />
                <SubItem to="/patient/doctors/my" label="My Doctors" />
                <SubItem to="/patient/pharmacy/list" label="Pharmacies" />
                <SubItem to="/patient/my-pharmacy" label="My Pharmacies" />
                <SubItem to="/patient/laboratory/list" label="Laboratories" />
                <SubItem to="/patient/my-laboratory" label="My Labs" />
              </DropdownItem>
            </>
          )}

          {role === "PHARMACY" && (
            <>
              <NavItem to="/pharmacy/dashboard" icon="dashboard" label="Fulfillment Hub" />
              <NavItem to="/pharmacy/prescriptions" icon="inventory" label="Order Flow" />
              <NavItem to="/pharmacy/messages/inbox" icon="chat_bubble" label="Messages" badge={unreadCount} />
              <NavItem to="/pharmacy/view-profile" icon="store" label="Store Identity" />
            </>
          )}

          {role === "LABORATORY" && (
            <>
              <NavItem to="/laboratory/dashboard" icon="dashboard" label="Lab Console" />
              <NavItem to="/laboratory/tests" icon="biotech" label="Test Menu" />
              <NavItem to="/laboratory/reports" icon="folder_shared" label="Reports Archive" />
              <NavItem to="/laboratory/patients" icon="group" label="Patient Queue" />
              <NavItem to="/laboratory/messages/inbox" icon="chat_bubble" label="Messages" badge={unreadCount} />
              <NavItem to="/laboratory/view-profile" icon="badge" label="Lab Identity" />
            </>
          )}
        </nav>

        <div className="p-6 mt-auto">
          <div className={`flex items-center gap-3 p-3 rounded-2xl bg-surface-container ${open ? "" : "justify-center"}`}>
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20 shadow-sm">
              <img
                src={getUserAvatarUrl()}
                alt="User Profile"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  const name = localStorage.getItem("name") || "User";
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=027906&color=ffffff&bold=true`;
                }}
              />
            </div>
            {open && (
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-on-surface truncate">{localStorage.getItem("name") || "Provider"}</p>
                <p className="text-[10px] font-bold text-outline uppercase">{role}</p>
              </div>
            )}
          </div>
          <button onClick={() => { localStorage.clear(); navigate("/login"); }} className={`w-full mt-4 flex items-center gap-4 px-4 py-3 rounded-2xl text-error hover:bg-error/5 transition-all ${open ? "" : "justify-center"}`}>
            <span className="material-symbols-outlined">logout</span>
            {open && <span className="font-bold text-sm">Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

