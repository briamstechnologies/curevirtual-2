// FILE: src/pages/doctor/DoctorSchedule.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import api from "../../Lib/api";
import DashboardLayout from "../../layouts/DashboardLayout";
import { toast } from "react-toastify";
import {
  FaPlus,
  FaChevronLeft,
  FaChevronRight,
  FaTimes,
  FaVideo,
  FaPhoneAlt,
  FaTrashAlt,
  FaGlobe,
  FaUserNurse,
  FaCalendarAlt,
  FaEdit,
  FaClock,
  FaCircle,
} from "react-icons/fa";

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const DoctorSchedule = () => {
  const role = localStorage.getItem("role") || "DOCTOR";
  const doctorId = localStorage.getItem("userId");
  const userName = localStorage.getItem("userName") || localStorage.getItem("name") || "Doctor";

  const [schedules, setSchedules] = useState(() => {
    const cached = localStorage.getItem("cached_doctor_schedules");
    return cached ? JSON.parse(cached) : [];
  });

  const [profile, setProfile] = useState(() => {
    const cached = localStorage.getItem("cached_doctor_profile");
    return cached ? JSON.parse(cached) : null;
  });

  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(schedules.length === 0);

  // Form State
  const [formData, setFormData] = useState({
    dayOfWeek: "1",
    startTime: "09:00",
    endTime: "17:00",
    isActive: true,
  });

  // Week navigation calculation (Monday start)
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  });

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(currentWeekStart);
      d.setDate(currentWeekStart.getDate() + i);
      return d;
    });
  }, [currentWeekStart]);

  const handlePrevWeek = () => {
    const prev = new Date(currentWeekStart);
    prev.setDate(prev.getDate() - 7);
    setCurrentWeekStart(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentWeekStart);
    next.setDate(next.getDate() + 7);
    setCurrentWeekStart(next);
  };

  const handleToday = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    setCurrentWeekStart(new Date(d.setDate(diff)));
  };

  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.get("/doctor/profile", { params: { userId: doctorId } });
      if (res.data?.data) {
        setProfile(res.data.data);
        localStorage.setItem("cached_doctor_profile", JSON.stringify(res.data.data));
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  }, [doctorId]);

  const fetchSchedules = useCallback(async () => {
    try {
      const res = await api.get(`/schedule?doctorId=${doctorId}`);
      if (res.data && res.data.data) {
        setSchedules(res.data.data);
        localStorage.setItem("cached_doctor_schedules", JSON.stringify(res.data.data));
      } else {
        setSchedules(res.data || []);
      }
    } catch (err) {
      console.error("Error fetching schedules:", err);
      toast.error("Failed to load schedules");
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    fetchSchedules();
    fetchProfile();
  }, [fetchSchedules, fetchProfile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.dayOfWeek || !formData.startTime || !formData.endTime) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      setSubmitting(true);
      if (editingId) {
        await api.patch(`/schedule/${editingId}`, {
          ...formData,
          dayOfWeek: Number(formData.dayOfWeek),
        });
        toast.success("Schedule updated successfully!");
      } else {
        await api.post("/schedule", {
          ...formData,
          dayOfWeek: Number(formData.dayOfWeek),
          doctorId,
        });
        toast.success("Schedule created successfully!");
      }

      setFormData({ dayOfWeek: "1", startTime: "09:00", endTime: "17:00", isActive: true });
      setEditingId(null);
      setIsModalOpen(false);
      fetchSchedules();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save schedule");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (schedule) => {
    setFormData({
      dayOfWeek: String(schedule.dayOfWeek),
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      isActive: schedule.isActive,
    });
    setEditingId(schedule.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this schedule?")) return;
    try {
      await api.delete(`/schedule/${id}`);
      toast.success("Schedule deleted successfully!");
      fetchSchedules();
    } catch (err) {
      toast.error("Failed to delete schedule");
    }
  };

  const toggleActive = async (schedule) => {
    try {
      await api.patch(`/schedule/${schedule.id}`, {
        isActive: !schedule.isActive,
      });
      toast.success(`Schedule ${!schedule.isActive ? "activated" : "paused"}`);
      fetchSchedules();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const activeCount = schedules.filter((s) => s.isActive).length;

  const consultationModes = useMemo(() => {
    const modes = profile?.consultationModes;
    if (Array.isArray(modes) && modes.length > 0) return modes;
    return ["VIDEO", "AUDIO"];
  }, [profile]);

  return (
    <DashboardLayout role={role} user={{ name: userName }}>
      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto font-sans text-slate-800">

        {/* Top Header Card */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              Schedule &amp; Availability
            </h1>
            <p className="text-xs md:text-sm text-slate-500 font-semibold mt-1">
              Configure regular consultation hours and weekly patient booking slots.
            </p>
          </div>

          <button
            onClick={() => {
              setEditingId(null);
              setFormData({ dayOfWeek: "1", startTime: "09:00", endTime: "17:00", isActive: true });
              setIsModalOpen(true);
            }}
            className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 transition-all w-fit"
          >
            <FaPlus /> Add Availability
          </button>
        </div>

        {/* Timezone Status Notification Card */}
        <div className="p-4 rounded-2xl border border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">
              Your Timezone Setting
            </p>
            <div className="flex items-center gap-2 mt-1">
              <FaGlobe className="text-emerald-600 text-sm" />
              <span className="text-sm md:text-base font-black text-slate-900">
                {profile?.timezone || "Loading..."}
              </span>
              {profile?.timezone &&
                profile.timezone !== Intl.DateTimeFormat().resolvedOptions().timeZone && (
                  <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-md border border-amber-200">
                    ⚠️ Browser is {Intl.DateTimeFormat().resolvedOptions().timeZone}
                  </span>
                )}
            </div>
          </div>
          <a
            href="/doctor/profile"
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
          >
            Change Timezone →
          </a>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">

          {/* Left: Weekly Schedule Grid & Table */}
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">

            {/* Week Navigation Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-1">
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">Weekly Schedule</h2>
                <p className="text-[11px] font-semibold text-slate-500">Tap an empty day to configure hours</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleToday}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 transition"
                >
                  Today
                </button>
                <div className="flex items-center border border-slate-200 rounded-xl bg-white overflow-hidden shadow-xs">
                  <button onClick={handlePrevWeek} className="p-2 hover:bg-slate-100 text-slate-700 text-xs transition">
                    <FaChevronLeft />
                  </button>
                  <button onClick={handleNextWeek} className="p-2 hover:bg-slate-100 text-slate-700 text-xs transition">
                    <FaChevronRight />
                  </button>
                </div>
                <span className="text-xs font-bold text-slate-800">
                  {weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
            </div>

            {/* Weekly Columns */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-3">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="min-h-[280px] rounded-2xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-3">
                {weekDays.map((dayObj, idx) => {
                  const dayOfWeekNum = dayObj.getDay();
                  const daySchedules = schedules
                    .filter((s) => Number(s.dayOfWeek) === dayOfWeekNum)
                    .sort((a, b) => a.startTime.localeCompare(b.startTime));
                  const isToday = dayObj.toDateString() === new Date().toDateString();

                  return (
                    <div
                      key={idx}
                      className={`flex flex-col rounded-2xl border transition-all min-h-[280px] ${
                        isToday
                          ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      {/* Day Header */}
                      <div className={`p-3 text-center rounded-t-2xl border-b ${isToday ? "bg-emerald-600 border-emerald-600" : "bg-slate-100 border-slate-200"}`}>
                        <span className={`text-[10px] font-black uppercase tracking-wider block ${isToday ? "text-emerald-100" : "text-slate-500"}`}>
                          {DAYS_SHORT[dayOfWeekNum]}
                        </span>
                        <span className={`text-base font-black ${isToday ? "text-white" : "text-slate-900"}`}>
                          {dayObj.getDate()}
                        </span>
                      </div>

                      {/* Day Slots */}
                      <div className="p-2.5 flex-1 flex flex-col gap-2 overflow-y-auto max-h-[320px]">
                        {daySchedules.length > 0 ? (
                          daySchedules.map((schedule) => (
                            <div
                              key={schedule.id}
                              className={`p-3 rounded-2xl border transition-all group relative ${
                                schedule.isActive
                                  ? "bg-white border-emerald-300 shadow-xs hover:shadow-md"
                                  : "bg-slate-100 border-slate-200 opacity-70"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                                  <FaClock className={`text-[10px] ${schedule.isActive ? "text-emerald-600" : "text-slate-400"}`} />
                                  {schedule.startTime} – {schedule.endTime}
                                </span>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => handleEdit(schedule)}
                                    className="text-slate-500 hover:text-emerald-600 transition"
                                    title="Edit slot"
                                  >
                                    <FaEdit size={11} />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(schedule.id)}
                                    className="text-slate-500 hover:text-rose-600 transition"
                                    title="Delete slot"
                                  >
                                    <FaTrashAlt size={11} />
                                  </button>
                                </div>
                              </div>

                              <button
                                onClick={() => toggleActive(schedule)}
                                className={`mt-2.5 inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full transition ${
                                  schedule.isActive
                                    ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                    : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                                }`}
                              >
                                <FaCircle size={5} className={schedule.isActive ? "text-emerald-600" : "text-slate-400"} />
                                {schedule.isActive ? "Active" : "Paused"}
                              </button>
                            </div>
                          ))
                        ) : (
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setFormData({
                                dayOfWeek: String(dayOfWeekNum),
                                startTime: "09:00",
                                endTime: "17:00",
                                isActive: true,
                              });
                              setIsModalOpen(true);
                            }}
                            className="flex-1 min-h-[120px] rounded-xl border border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/40 transition flex flex-col items-center justify-center text-slate-400 hover:text-emerald-700 group p-2 text-center"
                          >
                            <FaPlus className="text-xs mb-1.5 group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-bold">Add hours</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Summary Table */}
            {schedules.length > 0 && (
              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
                  All Configured Intervals ({schedules.length})
                </h3>

                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                        <th className="py-3 px-4">Day</th>
                        <th className="py-3 px-4">Start</th>
                        <th className="py-3 px-4">End</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {schedules.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50 transition">
                          <td className="py-3.5 px-4 font-bold text-slate-900">{DAYS_FULL[s.dayOfWeek]}</td>
                          <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">{s.startTime}</td>
                          <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">{s.endTime}</td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              s.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                            }`}>
                              {s.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-3 font-bold">
                            <button onClick={() => handleEdit(s)} className="text-slate-600 hover:text-emerald-700">Edit</button>
                            <button onClick={() => toggleActive(s)} className="text-slate-600 hover:text-slate-900">
                              {s.isActive ? "Pause" : "Activate"}
                            </button>
                            <button onClick={() => handleDelete(s.id)} className="text-rose-600 hover:text-rose-800">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Right: Sidebar */}
          <div className="space-y-6">

            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Availability Overview
                </h2>
                <span className="text-[10px] font-black text-emerald-700 flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" /> Live
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <p className="text-2xl font-black text-slate-900">{schedules.length}</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Total slots</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <p className="text-2xl font-black text-emerald-800">{activeCount}</p>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">Active now</p>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase mb-2">Consultation Modes</p>
                <div className="flex flex-wrap gap-2">
                  {consultationModes.includes("VIDEO") && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold">
                      <FaVideo className="text-emerald-600" /> Video
                    </span>
                  )}
                  {consultationModes.includes("AUDIO") && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold">
                      <FaPhoneAlt className="text-emerald-600" /> Audio
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-3">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Coverage
              </h2>
              <p className="text-xs font-medium text-slate-700">
                Supervising doctor: <strong className="text-slate-900">Dr. {userName}</strong>
              </p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3 text-xs">
                <FaUserNurse className="text-emerald-600 text-base shrink-0" />
                <div>
                  <span className="font-bold text-slate-900 block">PA coverage support</span>
                  <span className="text-slate-500 text-[11px]">Backup delegates active</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Add / Edit Schedule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 md:p-8 space-y-6">

            <button
              onClick={() => {
                setIsModalOpen(false);
                setEditingId(null);
              }}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
            >
              <FaTimes size={16} />
            </button>

            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <FaCalendarAlt className="text-emerald-600" /> {editingId ? "Edit Availability" : "Add Availability"}
              </h2>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                Configure your weekly consulting hours.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Day of the Week</label>
                <select
                  value={formData.dayOfWeek}
                  onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value })}
                  className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-600 outline-none"
                  required
                >
                  {DAYS_FULL.map((dayName, idx) => (
                    <option key={idx} value={idx}>
                      {dayName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-600 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-600 outline-none"
                    required
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 pt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded accent-emerald-600"
                />
                <span className="text-xs font-bold text-slate-700">
                  Activate this interval immediately
                </span>
              </label>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingId(null);
                  }}
                  className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
                >
                  {submitting ? "Saving..." : editingId ? "Update Schedule" : "Add Availability"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </DashboardLayout>
  );
};

export default DoctorSchedule;