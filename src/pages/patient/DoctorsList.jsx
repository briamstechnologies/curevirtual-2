import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import api from "../../Lib/api";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FaEye,
  FaUserPlus,
  FaCalendarAlt,
  FaUserMd,
  FaVideo,
  FaPhoneAlt,
  FaStar,
  FaCheckCircle,
  FaSearch,
  FaFilter,
  FaGraduationCap,
  FaGlobe,
  FaClock,
} from "react-icons/fa";

const PLACEHOLDER_LOGO = "/images/logo/Asset3.png";

function DoctorViewModal({ open, onClose, doctor, onAssign, isAssigned }) {
  if (!open || !doctor) return null;

  const d = doctor;
  const langs = safeParseArray(d.languages);
  const daysArr = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const toMinutes = (t) => {
    const [h, m] = (t || "00:00").split(":").map(Number);
    return h * 60 + m;
  };

  const groupedSchedules = (d.schedules || []).reduce((acc, s) => {
    const dayName = daysArr[s.dayOfWeek];
    if (!acc[dayName]) acc[dayName] = [];
    acc[dayName].push(s);
    return acc;
  }, {});

  const docName = d.user
    ? `${d.user.firstName || ""} ${d.user.middleName || ""} ${d.user.lastName || ""}`.trim()
    : "Doctor";
  const avatarImage = d.avatarUrl || d.user?.profile_image || d.user?.avatarUrl;
  const initials = docName
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "DR";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative text-slate-800 border border-emerald-100 p-6 md:p-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 text-base w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition"
          aria-label="Close modal"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
          {avatarImage ? (
            <img
              src={avatarImage}
              alt={docName}
              className="w-18 h-18 rounded-2xl object-cover border-2 border-emerald-500 shadow-md flex-shrink-0"
              style={{ width: "72px", height: "72px" }}
            />
          ) : (
            <div
              className="rounded-2xl bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center text-emerald-700 font-extrabold text-2xl flex-shrink-0 shadow-sm"
              style={{ width: "72px", height: "72px" }}
            >
              {initials}
            </div>
          )}
          <div className="min-w-0 pr-8">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl md:text-2xl font-bold text-slate-900">
                {docName.startsWith("Dr.") ? docName : `Dr. ${docName}`}
              </h2>
              <span className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 border border-emerald-200 shadow-sm">
                <FaCheckCircle className="text-[11px] text-emerald-600" /> Verified
              </span>
            </div>
            <p className="text-sm font-semibold text-emerald-600 mt-1">
              {d.specialization || "General Practice / Specialist"}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-5 text-sm">
          {/* Left Column: Info & Bio */}
          <div className="space-y-4">
            <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-3 flex items-center gap-1.5">
                <FaUserMd className="text-sm" /> General Information
              </h3>
              <div className="space-y-2.5">
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 text-xs font-medium">Experience:</span>
                  <span className="font-bold text-slate-800 text-xs">
                    {d.yearsOfExperience != null ? `${d.yearsOfExperience} years` : "Not specified"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 text-xs font-medium">Consultation Fee:</span>
                  <span className="font-extrabold text-emerald-700 text-xs">GHS 200</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 text-xs font-medium">Languages:</span>
                  <span className="font-semibold text-slate-800 text-xs">
                    {langs.length ? langs.join(", ") : "English"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 text-xs font-medium">Email:</span>
                  <span className="text-xs font-semibold text-slate-700 truncate max-w-[150px]" title={d.user?.email}>
                    {d.user?.email || "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-2">
                About / Bio
              </h3>
              <p className="text-xs leading-relaxed text-slate-600 italic">
                {d.bio || "Board-certified practitioner dedicated to comprehensive, compassionate patient care."}
              </p>
            </div>
          </div>

          {/* Right Column: Weekly Availability */}
          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-3 flex items-center gap-1.5">
                <FaCalendarAlt className="text-sm" /> Weekly Availability
              </h3>

              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {d.schedules?.length > 0 ? (
                  daysArr.map((dayName) => {
                    const slots = groupedSchedules[dayName];
                    if (!slots) return null;
                    return (
                      <div key={dayName} className="border-b border-slate-200/60 pb-2 last:border-0">
                        <p className="text-[11px] font-bold text-slate-600 mb-1">{dayName}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {slots
                            .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime))
                            .map((s) => (
                              <span
                                key={s.id}
                                className="text-[11px] bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-md border border-emerald-200 font-bold flex items-center gap-1 shadow-xs"
                              >
                                <FaClock className="text-[9px] text-emerald-600" /> {s.startTime} - {s.endTime}
                              </span>
                            ))}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <FaCalendarAlt className="text-3xl mx-auto mb-2 opacity-40 text-emerald-600" />
                    <p className="text-xs font-medium text-slate-500">No regular weekly schedule set.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end mt-6 gap-3 pt-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold transition text-slate-700"
          >
            Close
          </button>
          <button
            onClick={() => !isAssigned && onAssign?.(d)}
            disabled={isAssigned}
            className={`px-6 py-2.5 rounded-xl text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all duration-200 ${
              isAssigned
                ? "bg-slate-400 cursor-not-allowed opacity-70"
                : "bg-[#027906] hover:bg-[#035d06] active:scale-95 shadow-emerald-600/30"
            }`}
          >
            <FaCalendarAlt className="text-sm" /> {isAssigned ? "Assigned" : "Appointment"}
          </button>
        </div>
      </div>
    </div>
  );
}

function safeParseArray(v) {
  try {
    const parsed = typeof v === "string" ? JSON.parse(v) : v;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getAvailabilityStatus(schedules) {
  if (!schedules || schedules.length === 0)
    return { label: "No Schedule Set", color: "text-gray-400", bg: "bg-gray-500/10", isAvailable: false };

  const now = new Date();
  const day = now.getDay();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const toMinutes = (t) => {
    const [h, m] = (t || "00:00").split(":").map(Number);
    return h * 60 + m;
  };

  const currentMinutes = toMinutes(currentTime);
  const daysArr = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // 1. Check if available right now
  const todaySchedules = schedules.filter((s) => s.dayOfWeek === day);
  const currentSlot = todaySchedules.find((s) => {
    const start = toMinutes(s.startTime);
    const end = toMinutes(s.endTime);
    return currentMinutes >= start && currentMinutes < end;
  });

  if (currentSlot)
    return {
      label: `Available Now (${currentSlot.startTime} - ${currentSlot.endTime})`,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10 border-emerald-500/30",
      isAvailable: true,
    };

  // 2. Find next slot today
  const nextToday = todaySchedules
    .filter((s) => toMinutes(s.startTime) > currentMinutes)
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime))[0];

  if (nextToday)
    return {
      label: `Today, ${nextToday.startTime}`,
      color: "text-teal-600 dark:text-teal-400",
      bg: "bg-teal-500/10 border-teal-500/30",
      isAvailable: true,
    };

  // 3. Find next day with schedule
  for (let i = 1; i <= 6; i++) {
    const nextDayIdx = (day + i) % 7;
    const nextDaySchedules = schedules
      .filter((s) => s.dayOfWeek === nextDayIdx)
      .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

    if (nextDaySchedules.length > 0) {
      return {
        label: `Next: ${daysArr[nextDayIdx]} @ ${nextDaySchedules[0].startTime}`,
        color: "text-amber-500",
        bg: "bg-amber-500/10 border-amber-500/30",
        isAvailable: false,
      };
    }
  }

  return { label: "No Active Slots", color: "text-gray-400", bg: "bg-gray-500/10", isAvailable: false };
}

export default function DoctorsList() {
  const role = "PATIENT";
  const userName = localStorage.getItem("userName") || localStorage.getItem("name") || "Patient";
  const patientUserId = localStorage.getItem("userId");

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [onlyAvailableToday, setOnlyAvailableToday] = useState(false);
  const [viewDoctor, setViewDoctor] = useState(null);
  const [assignedIds, setAssignedIds] = useState(new Set());

  const fetchDoctors = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/patient/doctors/all");
      setRows(res.data?.data || res.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load doctors");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAssignedDoctors = useCallback(async () => {
    try {
      if (!patientUserId) return;
      const res = await api.get("/patient/doctors", { params: { patientUserId } });
      const data = res.data?.data || res.data || [];
      const ids = data.map((d) => d.id);
      setAssignedIds(new Set(ids));
    } catch (err) {
      console.error("Failed to load assigned doctors", err);
    }
  }, [patientUserId]);

  useEffect(() => {
    fetchDoctors();
    fetchAssignedDoctors();
  }, [fetchDoctors, fetchAssignedDoctors]);

  // Extract unique specialties from real database
  const specialties = useMemo(() => {
    const list = new Set();
    rows.forEach((d) => {
      if (d.specialization && d.specialization.trim()) {
        list.add(d.specialization.trim());
      }
    });
    return Array.from(list);
  }, [rows]);

  // Filtering logic
  const filteredDoctors = useMemo(() => {
    return rows.filter((d) => {
      const name = d.user
        ? `${d.user.firstName || ""} ${d.user.middleName || ""} ${d.user.lastName || ""}`.toLowerCase()
        : "";
      const spec = (d.specialization || "").toLowerCase();
      const sTerm = search.toLowerCase();

      // Search match
      const matchesSearch = !search || name.includes(sTerm) || spec.includes(sTerm);

      // Specialty match
      const matchesSpecialty =
        specialtyFilter === "all" ||
        (d.specialization && d.specialization.toLowerCase() === specialtyFilter.toLowerCase());

      // Available today match
      const status = getAvailabilityStatus(d.schedules);
      const matchesAvailability = !onlyAvailableToday || status.isAvailable;

      return matchesSearch && matchesSpecialty && matchesAvailability;
    });
  }, [rows, search, specialtyFilter, onlyAvailableToday]);

  const handleAssign = async (doc) => {
    try {
      if (!patientUserId) {
        toast.error("Error: User session invalid. Please re-login.");
        return;
      }

      const res = await api.post("/patient/doctors/assign", {
        patientUserId,
        doctorProfileId: doc.id,
      });

      if (res.data?.success || res.status === 200) {
        toast.success(`Successfully assigned Dr. ${doc.user?.lastName || "Doctor"}`);
        setAssignedIds((prev) => {
          const newSet = new Set(prev);
          newSet.add(doc.id);
          return newSet;
        });
        setViewDoctor(null);
        fetchAssignedDoctors();
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Failed to assign doctor");
    }
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg-main)]/90 text-[var(--text-main)]">
      <Sidebar role={role} />
      <div className="flex-1 min-h-screen flex flex-col">
        <Topbar userName={userName} />

        <main className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--text-main)]">
                Find a Doctor
              </h1>
              <p className="text-sm text-[var(--text-soft)] mt-1">
                Connect with certified healthcare professionals for virtual and in-person consultations.
              </p>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--border)] shadow-sm space-y-3">
            <div className="relative">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm" />
              <input
                type="text"
                placeholder="Search by doctor name, specialty, or keywords..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-[var(--bg-glass)] border border-[var(--border)] text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm transition"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] font-medium mr-1">
                <FaFilter className="text-[10px]" /> Filters:
              </div>

              {/* Specialty Dropdown */}
              <select
                value={specialtyFilter}
                onChange={(e) => setSpecialtyFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-[var(--bg-glass)] border border-[var(--border)] text-xs font-medium text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="all">All Specialties ({specialties.length})</option>
                {specialties.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              {/* Available Today Pill */}
              <button
                onClick={() => setOnlyAvailableToday(!onlyAvailableToday)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition flex items-center gap-1.5 ${
                  onlyAvailableToday
                    ? "bg-emerald-500 text-white border-emerald-600 shadow-sm"
                    : "bg-[var(--bg-glass)] text-[var(--text-soft)] border-[var(--border)] hover:bg-[var(--border)]"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${onlyAvailableToday ? "bg-white" : "bg-emerald-500"}`} />
                Available Today
              </button>

              {/* Reset Button if filtered */}
              {(search || specialtyFilter !== "all" || onlyAvailableToday) && (
                <button
                  onClick={() => {
                    setSearch("");
                    setSpecialtyFilter("all");
                    setOnlyAvailableToday(false);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:text-red-500 hover:bg-red-500/10 border border-transparent transition"
                >
                  Reset Filters
                </button>
              )}

              <div className="ml-auto text-xs text-[var(--text-muted)] font-medium">
                Showing <span className="font-bold text-[var(--text-main)]">{filteredDoctors.length}</span> doctors
              </div>
            </div>
          </div>

          {/* Doctors Grid / Cards */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border)] animate-pulse space-y-4"
                >
                  <div className="flex gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gray-500/20" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-4 bg-gray-500/20 rounded w-3/4" />
                      <div className="h-3 bg-gray-500/20 rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-10 bg-gray-500/10 rounded-xl" />
                  <div className="h-10 bg-gray-500/20 rounded-xl" />
                </div>
              ))}
            </div>
          ) : filteredDoctors.length === 0 ? (
            <div className="bg-[var(--bg-card)] rounded-2xl p-12 text-center border border-[var(--border)] shadow-sm">
              <FaUserMd className="text-4xl mx-auto text-[var(--text-muted)] mb-3 opacity-40" />
              <h3 className="text-lg font-bold text-[var(--text-main)]">No doctors match your criteria</h3>
              <p className="text-sm text-[var(--text-soft)] mt-1 max-w-md mx-auto">
                Try clearing your search filters or adjusting your keywords to find available healthcare providers.
              </p>
              <button
                onClick={() => {
                  setSearch("");
                  setSpecialtyFilter("all");
                  setOnlyAvailableToday(false);
                }}
                className="mt-4 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 transition"
              >
                Show All Doctors
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDoctors.map((d) => {
                const docName = d.user
                  ? `${d.user.firstName || ""} ${d.user.middleName || ""} ${d.user.lastName || ""}`.trim()
                  : "Doctor";
                const avatarImage = d.avatarUrl || d.user?.profile_image || d.user?.avatarUrl;
                const status = getAvailabilityStatus(d.schedules);
                const isAssigned = assignedIds.has(d.id);
                const langs = safeParseArray(d.languages);
                const initials = docName
                  .split(" ")
                  .map((p) => p[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase() || "DR";

                return (
                  <div
                    key={d.id}
                    className="bg-[var(--bg-card)] rounded-2xl p-5 border border-[var(--border)] shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group hover:border-emerald-500/40"
                  >
                    <div>
                      {/* Top Row: Avatar & Primary Info */}
                      <div className="flex items-start gap-4">
                        {avatarImage ? (
                          <img
                            src={avatarImage}
                            alt={docName}
                            className="w-16 h-16 rounded-2xl object-cover border border-[var(--border)] flex-shrink-0 shadow-sm"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-lg flex-shrink-0 shadow-sm">
                            {initials}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="font-bold text-base text-[var(--text-main)] truncate" title={docName}>
                              {docName.startsWith("Dr.") ? docName : `Dr. ${docName}`}
                            </h3>
                            <FaCheckCircle
                              className="text-emerald-500 text-xs flex-shrink-0"
                              title="Verified Doctor"
                            />
                          </div>

                          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 truncate mt-0.5">
                            {d.specialization || "General Practice"}
                          </p>

                          <div className="flex items-center gap-2 mt-1 text-[11px] text-[var(--text-soft)]">
                            <span className="flex items-center gap-1">
                              <FaGraduationCap className="text-[10px]" />
                              {d.yearsOfExperience != null ? `${d.yearsOfExperience} yrs exp` : "Experienced"}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1 truncate">
                              <FaGlobe className="text-[10px]" />
                              {langs.length > 0 ? langs.slice(0, 2).join(", ") : "English"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Middle Row: Consultation Types & Next Availability */}
                      <div className="mt-4 pt-3 border-t border-[var(--border)] space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[var(--text-muted)] flex items-center gap-1">
                            <FaClock className="text-[10px]" /> Next Available:
                          </span>
                          <span
                            className={`font-semibold text-xs px-2 py-0.5 rounded-md border ${status.bg} ${status.color}`}
                          >
                            {status.label}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[var(--text-muted)]">Consultation:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="bg-[var(--bg-glass)] text-[var(--text-soft)] px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 border border-[var(--border)]">
                              <FaVideo className="text-[9px] text-emerald-500" /> Video
                            </span>
                            <span className="bg-[var(--bg-glass)] text-[var(--text-soft)] px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 border border-[var(--border)]">
                              <FaPhoneAlt className="text-[9px] text-emerald-500" /> Audio
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1">
                          <span className="text-[var(--text-muted)]">Fee:</span>
                          <div className="text-right">
                            <span className="font-bold text-sm text-[var(--text-main)]">GHS 200</span>
                            <span className="text-[10px] text-emerald-500 ml-1.5 font-medium">
                              • Free with Insurance
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Actions */}
                    <div className="mt-5 pt-3 border-t border-[var(--border)] flex items-center gap-2">
                      <button
                        onClick={() => setViewDoctor(d)}
                        className="flex-1 py-2 rounded-xl bg-[var(--bg-glass)] hover:bg-[var(--border)] text-[var(--text-main)] text-xs font-semibold flex items-center justify-center gap-1.5 border border-[var(--border)] transition"
                      >
                        <FaEye className="text-sm text-emerald-500" /> View Profile
                      </button>

                      <button
                        onClick={() => handleAssign(d)}
                        disabled={isAssigned}
                        className={`flex-1 py-2 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all duration-200 ${
                          isAssigned
                            ? "bg-gray-500 cursor-not-allowed opacity-70"
                            : "bg-emerald-600 hover:bg-emerald-700 active:scale-95"
                        }`}
                      >
                        <FaUserPlus className="text-sm" />
                        {isAssigned ? "Assigned" : "Assign"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      <DoctorViewModal
        open={!!viewDoctor}
        doctor={viewDoctor}
        onClose={() => setViewDoctor(null)}
        onAssign={handleAssign}
        isAssigned={viewDoctor && assignedIds.has(viewDoctor.id)}
      />
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}
