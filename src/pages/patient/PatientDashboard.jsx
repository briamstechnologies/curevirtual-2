// FILE: src/pages/patient/PatientDashboard.jsx
import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../Lib/api";
import DashboardLayout from "../../layouts/DashboardLayout";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatAppointmentTime(dateStr) {
  if (!dateStr) return "Scheduled";
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const isTomorrow =
      d.getDate() === tomorrow.getDate() &&
      d.getMonth() === tomorrow.getMonth() &&
      d.getFullYear() === tomorrow.getFullYear();

    const timeStr = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });

    if (isToday) return `Today, ${timeStr}`;
    if (isTomorrow) return `Tomorrow, ${timeStr}`;
    return `${d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${timeStr}`;
  } catch {
    return dateStr;
  }
}

function getInitials(name) {
  if (!name) return "DR";
  const parts = String(name).trim().split(/\s+/);
  const first = parts[0]?.[0] || "";
  const last = parts[1]?.[0] || "";
  return (first + last).toUpperCase() || "DR";
}

export default function PatientDashboard() {
  const navigate = useNavigate();
  const patientId = localStorage.getItem("userId") || "";
  const userName = localStorage.getItem("userName") || localStorage.getItem("name") || "Patient";
  const firstName = userName.split(" ")[0] || "Patient";

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activePrescriptions: 0,
    unreadMessages: 0,
    labResults: 0,
  });
  const [upcomingAppointment, setUpcomingAppointment] = useState(null);
  const [profileData, setProfileData] = useState(null);

  const loadDashboardData = useCallback(async () => {
    if (!patientId) return;
    try {
      setLoading(true);

      // Fetch Stats, Profile, Appointments, History concurrently
      const [statsRes, profileRes, apptsRes, healthRes] = await Promise.allSettled([
        api.get("/patient/stats", { params: { patientId } }),
        api.get("/patient/profile", { params: { userId: patientId } }),
        api.get("/patient/appointments", { params: { patientId } }),
        api.get("/patient/health-history"),
      ]);

      let statsObj = { activePrescriptions: 0, unreadMessages: 0, labResults: 0 };

      // Parse Profile Data
      let prof = null;
      if (profileRes.status === "fulfilled" && profileRes.value?.data?.data) {
        prof = profileRes.value.data.data;
        setProfileData(prof);
      }

      // Parse Stats
      if (statsRes.status === "fulfilled" && statsRes.value?.data?.data) {
        const d = statsRes.value.data.data;
        statsObj.activePrescriptions = d.totalPrescriptions || prof?.prescriptions?.length || 0;
      } else if (prof?.prescriptions) {
        statsObj.activePrescriptions = prof.prescriptions.length;
      }

      // Parse Health History / Lab results
      if (healthRes.status === "fulfilled" && healthRes.value?.data) {
        const records = healthRes.value.data?.records || healthRes.value.data?.manualRecords || [];
        statsObj.labResults = records.length || prof?.labOrders?.length || 0;
      } else if (prof?.labOrders) {
        statsObj.labResults = prof.labOrders.length;
      }

      // Messages count
      try {
        const msgRes = await api.get("/messages/unread-count");
        if (msgRes.data?.unreadCount !== undefined) {
          statsObj.unreadMessages = msgRes.data.unreadCount;
        }
      } catch {
        statsObj.unreadMessages = 0;
      }

      setStats(statsObj);

      // Parse Appointments
      if (apptsRes.status === "fulfilled" && Array.isArray(apptsRes.value?.data)) {
        const appts = apptsRes.value.data;
        const upcoming = appts
          .filter((a) => a.status !== "CANCELLED" && a.status !== "COMPLETED")
          .sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate))[0];

        setUpcomingAppointment(upcoming || null);
      }
    } catch (err) {
      console.error("Dashboard data load error:", err);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const hasEmergencyContact = Boolean(
    profileData?.emergencyContact ||
    profileData?.emergencyContactName ||
    profileData?.emergencyContactEmail
  );

  const isProfileComplete = Boolean(
    profileData?.user?.firstName &&
    profileData?.user?.lastName &&
    (profileData?.bloodGroup || profileData?.user?.dateOfBirth)
  );

  const doctor = upcomingAppointment?.doctor;
  const doctorUser = doctor?.user;
  const doctorName = doctorUser
    ? `Dr. ${doctorUser.firstName} ${doctorUser.lastName}`
    : upcomingAppointment?.doctorName || "Dr. Medical Specialist";
  const doctorSpecialty = doctor?.specialization || "General Physician";
  const doctorAvatar = doctor?.avatarUrl || doctorUser?.avatarUrl || null;
  const appointmentStatus = upcomingAppointment?.status || "Confirmed";

  return (
    <DashboardLayout role="PATIENT">
      <div className="w-full space-y-6 pb-12 font-body px-1 sm:px-2 md:px-4">
        {/* 1. GREETING HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight"
                style={{
                  background: "none",
                  WebkitTextFillColor: "#0f172a",
                  textTransform: "none",
                }}
              >
                {getGreeting()}, {firstName}
              </span>
              <span
                className="text-2xl sm:text-3xl inline-block select-none"
                style={{
                  background: "none",
                  WebkitTextFillColor: "initial",
                  color: "initial",
                  fontFamily: '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif',
                }}
              >
                👋
              </span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-[var(--text-soft)] mt-1 tracking-wide">
              Manage your care and upcoming visits.
            </p>
          </div>
          <Link
            to="/patient/doctors/list"
            className="btn btn-primary !px-6 !py-3 !rounded-2xl !text-xs !normal-case !tracking-wider shrink-0 self-start sm:self-auto flex items-center gap-2 shadow-lg shadow-emerald-500/20 decoration-none"
          >
            <span className="material-symbols-outlined text-base">search</span>
            <span>Find a Doctor</span>
          </Link>
        </div>

        {/* 2. UPCOMING APPOINTMENT CARD */}
        <div className="card !p-6 !rounded-[2rem] w-full">
          <div className="flex items-center gap-2 text-xs font-black text-[var(--brand-green)] uppercase tracking-wider mb-4">
            <span className="material-symbols-outlined text-base">calendar_month</span>
            <span>Upcoming Appointment</span>
          </div>

          {upcomingAppointment ? (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              {/* Doctor Info & Timing */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[1.5rem] overflow-hidden bg-slate-100 border border-[var(--border)] shrink-0 flex items-center justify-center shadow-md">
                  {doctorAvatar ? (
                    <img
                      src={doctorAvatar}
                      alt={doctorName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-[var(--brand-green)] to-[var(--brand-blue)] text-white font-black text-xl flex items-center justify-center">
                      {getInitials(doctorName)}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <h2
                      className="text-base sm:text-lg font-black text-slate-900 tracking-tight !normal-case"
                      style={{ background: "none", WebkitTextFillColor: "#0f172a" }}
                    >
                      {doctorName}
                    </h2>
                    <span
                      className="material-symbols-outlined text-[var(--brand-green)] text-base"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                      title="Verified Doctor"
                    >
                      verified
                    </span>
                  </div>
                  <p className="text-xs font-bold text-[var(--text-soft)]">
                    {doctorSpecialty}
                  </p>
                  <div className="pt-1 flex flex-wrap items-center gap-2.5">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-[var(--brand-green)]">schedule</span>
                      {formatAppointmentTime(upcomingAppointment.appointmentDate)}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {appointmentStatus === "PENDING"
                        ? "Pending Approval"
                        : appointmentStatus === "APPROVED" || appointmentStatus === "CONFIRMED"
                        ? "Confirmed"
                        : appointmentStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0 md:min-w-[170px]">
                <Link
                  to={`/patient/video-consultation?room=${upcomingAppointment.roomName || upcomingAppointment.id}`}
                  className="btn btn-primary !px-5 !py-3 !rounded-xl !text-xs !normal-case flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 decoration-none"
                >
                  <span className="material-symbols-outlined text-base">videocam</span>
                  <span>Join Video Visit</span>
                </Link>
                <Link
                  to="/patient/my-appointments"
                  className="btn btn-secondary !px-5 !py-2.5 !rounded-xl !text-xs !normal-case flex items-center justify-center font-bold decoration-none"
                >
                  <span>View Details</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="py-5 px-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 w-full">
              <div className="flex items-center gap-3 text-center sm:text-left">
                <span className="material-symbols-outlined text-2xl text-[var(--brand-green)]">event_available</span>
                <div>
                  <p className="text-xs sm:text-sm font-black text-slate-900">No Upcoming Appointment</p>
                  <p className="text-xs text-[var(--text-soft)]">You don't have any consultation booked right now.</p>
                </div>
              </div>
              <Link
                to="/patient/doctors/list"
                className="btn btn-primary !px-4 !py-2.5 !rounded-xl !text-xs !normal-case shadow-sm decoration-none"
              >
                <span>Book Appointment</span>
              </Link>
            </div>
          )}
        </div>

        {/* 3. QUICK ACTIONS */}
        <div className="w-full">
          <h2
            className="text-xs font-black text-[var(--text-soft)] uppercase tracking-[0.2em] mb-3"
            style={{ background: "none", WebkitTextFillColor: "var(--text-soft)" }}
          >
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 w-full">
            {/* Book Appointment */}
            <Link
              to="/patient/doctors/list"
              className="bg-emerald-50/60 border border-emerald-200/70 hover:border-[var(--brand-green)] hover:shadow-lg hover:shadow-emerald-500/10 transition-all rounded-[1.5rem] p-4 flex flex-col items-center justify-center text-center cursor-pointer group decoration-none"
            >
              <div className="w-10 h-10 rounded-2xl bg-white text-[var(--brand-green)] flex items-center justify-center mb-2.5 shadow-sm group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-xl text-[var(--brand-green)]">calendar_month</span>
              </div>
              <span className="font-bold text-xs text-slate-800 leading-tight">
                Book<br />Appointment
              </span>
            </Link>

            {/* Message Doctor */}
            <Link
              to="/patient/messages"
              className="bg-sky-50/60 border border-sky-200/70 hover:border-[var(--brand-blue)] hover:shadow-lg hover:shadow-blue-500/10 transition-all rounded-[1.5rem] p-4 flex flex-col items-center justify-center text-center cursor-pointer group decoration-none"
            >
              <div className="w-10 h-10 rounded-2xl bg-white text-[var(--brand-blue)] flex items-center justify-center mb-2.5 shadow-sm group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-xl text-[var(--brand-blue)]">chat</span>
              </div>
              <span className="font-bold text-xs text-slate-800 leading-tight">
                Message<br />Doctor
              </span>
            </Link>

            {/* View Prescriptions */}
            <Link
              to="/patient/prescriptions"
              className="bg-purple-50/60 border border-purple-200/70 hover:border-[var(--brand-purple)] hover:shadow-lg hover:shadow-purple-500/10 transition-all rounded-[1.5rem] p-4 flex flex-col items-center justify-center text-center cursor-pointer group decoration-none"
            >
              <div className="w-10 h-10 rounded-2xl bg-white text-[var(--brand-purple)] flex items-center justify-center mb-2.5 shadow-sm group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-xl text-[var(--brand-purple)]">prescriptions</span>
              </div>
              <span className="font-bold text-xs text-slate-800 leading-tight">
                View<br />Medications
              </span>
            </Link>

            {/* Upload Record */}
            <Link
              to="/patient/history"
              className="bg-amber-50/60 border border-amber-200/70 hover:border-[var(--brand-orange)] hover:shadow-lg hover:shadow-amber-500/10 transition-all rounded-[1.5rem] p-4 flex flex-col items-center justify-center text-center cursor-pointer group decoration-none"
            >
              <div className="w-10 h-10 rounded-2xl bg-white text-[var(--brand-orange)] flex items-center justify-center mb-2.5 shadow-sm group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-xl text-[var(--brand-orange)]">cloud_upload</span>
              </div>
              <span className="font-bold text-xs text-slate-800 leading-tight">
                Upload<br />Record
              </span>
            </Link>
          </div>
        </div>

        {/* 4. STAT CARDS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full">
          {/* Active Prescriptions */}
          <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-[1.5rem] p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-emerald-100/90 text-[var(--brand-green)] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-base">medication</span>
              </div>
              <span className="text-xs font-bold text-slate-700">Active Medications</span>
            </div>
            <div className="my-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {stats.activePrescriptions}
              </span>
            </div>
            <Link
              to="/patient/prescriptions"
              className="text-xs font-bold text-[var(--brand-green)] hover:opacity-80 flex items-center gap-1 w-fit group decoration-none"
            >
              <span>View medications</span>
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </Link>
          </div>

          {/* Unread Messages */}
          <div className="bg-sky-50/50 border border-sky-200/60 rounded-[1.5rem] p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-blue-100/90 text-[var(--brand-blue)] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-base">chat</span>
              </div>
              <span className="text-xs font-bold text-slate-700">Unread Messages</span>
            </div>
            <div className="my-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {stats.unreadMessages}
              </span>
            </div>
            <Link
              to="/patient/messages"
              className="text-xs font-bold text-[var(--brand-blue)] hover:opacity-80 flex items-center gap-1 w-fit group decoration-none"
            >
              <span>View messages</span>
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </Link>
          </div>

          {/* Lab Results */}
          <div className="bg-purple-50/50 border border-purple-200/60 rounded-[1.5rem] p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-purple-100/90 text-[var(--brand-purple)] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-base">biotech</span>
              </div>
              <span className="text-xs font-bold text-slate-700">Lab Results</span>
            </div>
            <div className="my-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {stats.labResults}
              </span>
            </div>
            <Link
              to="/patient/history"
              className="text-xs font-bold text-[var(--brand-purple)] hover:opacity-80 flex items-center gap-1 w-fit group decoration-none"
            >
              <span>View lab results</span>
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </Link>
          </div>
        </div>

        {/* 5. CARE CHECKLIST SECTION */}
        <div className="w-full">
          <h2
            className="text-xs font-black text-[var(--text-soft)] uppercase tracking-[0.2em] mb-3"
            style={{ background: "none", WebkitTextFillColor: "var(--text-soft)" }}
          >
            Care Checklist
          </h2>
          <div className="card !p-5 sm:!p-6 !rounded-[2rem] space-y-4 w-full">
            {/* Complete Profile Item */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[var(--brand-green)] flex items-center justify-center shrink-0 border border-emerald-100/80">
                  <span className="material-symbols-outlined text-xl">person</span>
                </div>
                <div>
                  <h3
                    className="text-xs sm:text-sm font-black text-slate-900 !normal-case"
                    style={{ background: "none", WebkitTextFillColor: "#0f172a" }}
                  >
                    Complete your profile
                  </h3>
                  <p className="text-xs text-[var(--text-soft)] font-medium mt-0.5">
                    Add your personal details to help us personalize your care.
                  </p>
                </div>
              </div>
              {isProfileComplete ? (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200 shrink-0 self-start sm:self-auto">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  <span>Completed</span>
                </span>
              ) : (
                <Link
                  to="/patient/profile/view-profile"
                  className="btn btn-secondary !px-5 !py-2.5 !rounded-xl !text-xs !normal-case shrink-0 self-start sm:self-auto font-bold decoration-none"
                >
                  <span>Complete</span>
                </Link>
              )}
            </div>

            {/* Add Emergency Contact Item */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[var(--brand-green)] flex items-center justify-center shrink-0 border border-emerald-100/80">
                  <span className="material-symbols-outlined text-xl">health_and_safety</span>
                </div>
                <div>
                  <h3
                    className="text-xs sm:text-sm font-black text-slate-900 !normal-case"
                    style={{ background: "none", WebkitTextFillColor: "#0f172a" }}
                  >
                    Add emergency contact
                  </h3>
                  <p className="text-xs text-[var(--text-soft)] font-medium mt-0.5">
                    Ensure we can reach someone important to you.
                  </p>
                </div>
              </div>
              {hasEmergencyContact ? (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200 shrink-0 self-start sm:self-auto">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  <span>Added</span>
                </span>
              ) : (
                <Link
                  to="/patient/profile/view-profile"
                  className="btn btn-secondary !px-5 !py-2.5 !rounded-xl !text-xs !normal-case shrink-0 self-start sm:self-auto font-bold decoration-none"
                >
                  <span>Add Contact</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
