import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "../Lib/api";

export default function Sidebar({ role: propRole, isMobileMenuOpen, setIsMobileMenuOpen }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [openDropdown, setOpenDropdown] = useState(null);

  const role = propRole || localStorage.getItem("role") || "PATIENT";
  const userId = localStorage.getItem("userId");

  useEffect(() => {
    let mounted = true;
    async function loadCounters() {
      try {
        if (!userId) return;
        const res = await api.get(`/messages/unread-count`, { params: { userId } });
        const count = res?.data?.count ?? 0;
        if (mounted) setUnreadCount(Number(count) || 0);
      } catch { /* silent */ }
    }
    loadCounters();
    const t = setInterval(loadCounters, 30000);
    return () => { mounted = false; clearInterval(t); };
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
        <span className="bg-primary text-white text-[10px] font-black px-2 py-0.5 rounded-full min-w-[20px] text-center">
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

        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto no-scrollbar">
          {role === "SUPERADMIN" && (
            <>
              <NavItem to="/superadmin/dashboard" icon="dashboard" label="Overview" />
              <NavItem to="/superadmin/manage-admins" icon="shield_with_house" label="Admins" />
              <DropdownItem icon="group" label="Registry" id="super-registry">
                <SubItem to="/superadmin/subscribers" label="Market Stats" />
                <SubItem to="/superadmin/subscribers/doctors" label="Doctors" />
                <SubItem to="/superadmin/subscribers/patients" label="Patients" />
                <SubItem to="/superadmin/subscribers/pharmacy" label="Pharmacies" />
                <SubItem to="/superadmin/subscribers/laboratory" label="Laboratories" />
              </DropdownItem>
              <NavItem to="/superadmin/system-reports" icon="analytics" label="System Audit" />
              <NavItem to="/superadmin/activity-logs" icon="list_alt" label="Action Logs" />
              <NavItem to="/superadmin/messages/inbox" icon="mail" label="Unified Inbox" badge={unreadCount} />
            </>
          )}

          {role === "ADMIN" && (
            <>
              <NavItem to="/admin/dashboard" icon="dashboard" label="Overview" />
              <DropdownItem icon="manage_accounts" label="Manage Users" id="admin-users">
                <SubItem to="/admin/users-list" label="Registry" />
                <SubItem to="/admin/manage-users" label="Provisioning" />
                <SubItem to="/admin/reports" label="Activity" />
              </DropdownItem>
              <NavItem to="/admin/registration-requests" icon="verified_user" label="Approval Queue" />
              <NavItem to="/admin/messages/inbox" icon="mail" label="Inbox" badge={unreadCount} />
              <NavItem to="/admin/subscription" icon="account_balance_wallet" label="Subscriptions" />
              <DropdownItem icon="group" label="Subscribers" id="admin-subscribers">
                <SubItem to="/admin/subscribers/doctors" label="Doctors" />
                <SubItem to="/admin/subscribers/patients" label="Patients" />
                <SubItem to="/admin/subscribers/pharmacy" label="Pharmacies" />
                <SubItem to="/admin/subscribers/laboratory" label="Laboratories" />
              </DropdownItem>
            </>
          )}

          {(role === "DOCTOR" || role === "PHYSICIAN_ASSISTANT") && (
            <>
              <NavItem to="/doctor/dashboard" icon="dashboard" label="Provider Portal" />
              <NavItem to="/doctor/appointments" icon="calendar_today" label="Appointments" />
              <NavItem to="/doctor/schedule" icon="event_note" label="My Schedule" />
              <NavItem to="/doctor/patients" icon="group" label="Patient Roster" />
              <NavItem to="/doctor/video-consultation" icon="videocam" label="Telehealth Bridge" />
              <NavItem to="/doctor/messages/inbox" icon="mail" label="Messenger" badge={unreadCount} />
            </>
          )}

          {role === "PATIENT" && (
            <>
              <NavItem to="/patient/dashboard" icon="dashboard" label="My Dashboard" />
              <NavItem to="/patient/my-appointments" icon="calendar_today" label="Clinical Visits" />
              <NavItem to="/patient/meds" icon="medication" label="Meds Tracker" />
              <NavItem to="/patient/history" icon="history_edu" label="Health Narrative" />
              <NavItem to="/patient/messages" icon="mail" label="Secure Inbox" badge={unreadCount} />
              <NavItem to="/patient/video-consultation" icon="videocam" label="Join Room" />
              <DropdownItem icon="local_hospital" label="Network" id="patient-network">
                <SubItem to="/patient/doctors/list" label="Find Doctors" />
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
              <NavItem to="/pharmacy/messages/inbox" icon="mail" label="Inquiries" badge={unreadCount} />
              <NavItem to="/pharmacy/view-profile" icon="store" label="Store Identity" />
            </>
          )}

          {role === "LABORATORY" && (
            <>
              <NavItem to="/laboratory/dashboard" icon="dashboard" label="Lab Console" />
              <NavItem to="/laboratory/tests" icon="biotech" label="Test Menu" />
              <NavItem to="/laboratory/reports" icon="folder_shared" label="Reports Archive" />
              <NavItem to="/laboratory/patients" icon="group" label="Patient Queue" />
              <NavItem to="/laboratory/messages/inbox" icon="mail" label="Inquiries" badge={unreadCount} />
              <NavItem to="/laboratory/view-profile" icon="badge" label="Lab Identity" />
            </>
          )}
        </nav>

        <div className="p-6 mt-auto">
          <div className={`flex items-center gap-3 p-3 rounded-2xl bg-surface-container ${open ? "" : "justify-center"}`}>
            <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-black">
              {localStorage.getItem("name")?.[0] || "U"}
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
            {open && <span className="font-bold text-sm">Synchronize Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

