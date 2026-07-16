// FILE: src/pages/doctor/DoctorAppointments.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import api from "../../Lib/api";
import {
  FaEye,
  FaEdit,
  FaTrash,
  FaPlus,
  FaCalendarAlt,
  FaClock,
  FaVideo,
  FaPhoneAlt,
  FaSpinner,
  FaSearch,
  FaUser,
  FaFlask,
  FaTimes,
  FaCheckCircle
} from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  formatLiteralTime,
  formatLiteralDate,
  formatLiteralDateTime,
  toLocalInputString,
} from "../../Lib/timeUtils";

const StatusPill = ({ status }) => {
  const s = (status || "").toUpperCase();
  const base = "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border";
  switch (s) {
    case "COMPLETED":
      return <span className={`${base} bg-blue-500/20 text-blue-500 border-blue-500/30`}>{s}</span>;
    case "PENDING":
      return (
        <span className={`${base} bg-orange-500/20 text-orange-500 border-orange-500/30`}>{s}</span>
      );
    case "APPROVED":
      return (
        <span className={`${base} bg-green-500/20 text-green-500 border-green-500/30`}>{s}</span>
      );
    case "CANCELLED":
      return <span className={`${base} bg-red-500/20 text-red-500 border-red-500/30`}>{s}</span>;
    default:
      return <span className={`${base} bg-gray-500/20 text-gray-400 border-gray-500/30`}>{s}</span>;
  }
};

const CallStatusBadge = ({ callStatus }) => {
  const s = (callStatus || "idle").toLowerCase();
  const base =
    "px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border inline-flex items-center gap-1";
  switch (s) {
    case "requested":
      return (
        <span className={`${base} bg-yellow-500/20 text-yellow-400 border-yellow-500/30`}>
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
          Calling...
        </span>
      );
    case "active":
      return (
        <span className={`${base} bg-green-500/20 text-green-400 border-green-500/30`}>
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          In Session
        </span>
      );
    case "ended":
      return (
        <span className={`${base} bg-gray-500/20 text-gray-400 border-gray-500/30`}>Ended</span>
      );
    default:
      return null;
  }
};

export default function DoctorAppointments() {
  const doctorUserId = localStorage.getItem("userId");
  const userName = localStorage.getItem("userName") || localStorage.getItem("name") || "Doctor";
  const user = { id: doctorUserId, name: userName };
  const navigate = useNavigate();

  // Tab State
  const [viewType, setViewType] = useState("APPOINTMENTS"); // "APPOINTMENTS" or "PATIENTS"

  // Common State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Appointments State
  const [appointments, setAppointments] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [startingCallId, setStartingCallId] = useState(null);
  const [form, setForm] = useState({ patientId: "", appointmentDate: "", reason: "", status: "APPROVED" });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Patients (Roster) State
  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewPatient, setViewPatient] = useState(null);
  const [assignLabPatient, setAssignLabPatient] = useState(null);
  const [laboratories, setLaboratories] = useState([]);
  const [labForm, setLabForm] = useState({ laboratoryId: "", testName: "", notes: "", priority: "ROUTINE" });
  const [submittingLab, setSubmittingLab] = useState(false);

  const [assignedLabTests, setAssignedLabTests] = useState([]);
  const [editingLabTest, setEditingLabTest] = useState(null);
  const [editLabForm, setEditLabForm] = useState({ testName: "", notes: "", priority: "ROUTINE", status: "ORDERED" });
  const [submittingEditLab, setSubmittingEditLab] = useState(false);
  const [confirmDeleteLab, setConfirmDeleteLab] = useState(null);
  const [confirmDeleteProtocolAction, setConfirmDeleteProtocolAction] = useState(null);

  const fetchAssignedLabTests = useCallback(async () => {
    try {
      const res = await api.get("/doctor/lab-orders", {
        params: { doctorId: doctorUserId }
      });
      setAssignedLabTests(res.data?.data || res.data || []);
    } catch (err) {
      console.error("Failed to load assigned lab tests", err);
    }
  }, [doctorUserId]);

  const fetchMyPatients = useCallback(async () => {
    try {
      setPatientsLoading(true);
      const res = await api.get("/doctor/my-patients", {
        params: { doctorId: doctorUserId },
      });
      setPatients(res.data?.data || res.data || []);
    } catch (err) {
      console.error("Error loading patients");
    } finally {
      setPatientsLoading(false);
    }
  }, [doctorUserId]);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/doctor/appointments", {
        params: { doctorId: doctorUserId },
      });
      setAppointments(res.data || []);
    } catch (err) {
      setError("Failed to load clinical schedule.");
    } finally {
      setLoading(false);
    }
  }, [doctorUserId]);

  const fetchLaboratories = async () => {
    try {
      const res = await api.get("/doctor/laboratories");
      setLaboratories(res.data?.data || []);
    } catch (err) {
      console.error("Failed to load laboratories");
    }
  };

  useEffect(() => {
    fetchMyPatients();
    fetchAppointments();
    fetchLaboratories();
    fetchAssignedLabTests();
  }, [fetchMyPatients, fetchAppointments, fetchAssignedLabTests]);

  // Poll call statuses for approved appointments every 8 seconds
  useEffect(() => {
    const approvedIds = appointments
      .filter((a) => a.status === "APPROVED" && a.callStatus !== "ended")
      .map((a) => a.id);

    if (approvedIds.length === 0) return;

    const pollStatuses = async () => {
      try {
        const updates = await Promise.allSettled(
          approvedIds.map((id) => api.get(`/appointments/${id}/status`))
        );
        setAppointments((prev) =>
          prev.map((a) => {
            const match = updates.find(
              (u) => u.status === "fulfilled" && u.value.data.appointmentId === a.id
            );
            if (match) {
              return { ...a, callStatus: match.value.data.callStatus };
            }
            return a;
          })
        );
      } catch (err) {
        // Silent polling failure
      }
    };

    const interval = setInterval(pollStatuses, 8000);
    return () => clearInterval(interval);
  }, [appointments.length]);

  const hasPatients = useMemo(() => patients.length > 0, [patients]);

  const filteredPatients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) => (p.name || "").toLowerCase().includes(q) || (p.email || "").toLowerCase().includes(q)
    );
  }, [patients, search]);

  const openNewModal = () => {
    setSelectedAppointment(null);
    setEditing(false);
    setViewMode(false);
    setForm({ patientId: "", appointmentDate: "", reason: "", status: "APPROVED" });
    setModalOpen(true);
  };

  const openViewModal = (appt) => {
    setSelectedAppointment(appt);
    setViewMode(true);
    setEditing(false);
    setModalOpen(true);
  };

  const openEditModal = (appt) => {
    setSelectedAppointment(appt);
    setEditing(true);
    setViewMode(false);
    setForm({
      patientId: appt?.patientId || "",
      appointmentDate: appt?.appointmentDate ? toLocalInputString(appt.appointmentDate) : "",
      reason: appt?.reason || "",
      status: appt?.status || "APPROVED",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing && selectedAppointment?.id) {
        await api.patch(`/doctor/appointments/${selectedAppointment.id}`, { ...form, doctorId: doctorUserId });
        toast.success("Schedule Updated");
      } else {
        await api.post(`/doctor/appointments`, { ...form, doctorId: doctorUserId });
        toast.success("Protocol Registered");
      }
      setModalOpen(false);
      fetchAppointments();
    } catch (err) {
      toast.error("Protocol Sync Failed");
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.patch(`/doctor/appointments/${id}`, { status: "APPROVED" });
      toast.success("Protocol Approved");
      fetchAppointments();
    } catch (err) {
      toast.error("Failed to approve");
    }
  };

  const requestDelete = (id) => {
    setPendingDeleteId(id);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    try {
      setDeleting(true);
      await api.delete(`/doctor/appointments/${pendingDeleteId}`);
      toast.success("Data Purged");
      setConfirmOpen(false);
      fetchAppointments();
    } catch (err) {
      toast.error("Purge Failed");
    } finally {
      setDeleting(false);
    }
  };

  const handleStartCall = async (appt) => {
    try {
      setStartingCallId(appt.id);
      const res = await api.post(`/appointments/${appt.id}/start-call`);
      if (res.data.success) {
        toast.success("Call request sent to patient!");
        setAppointments((prev) =>
          prev.map((a) => a.id === appt.id ? { ...a, callStatus: "requested", roomName: res.data.roomName } : a)
        );
        navigate(`/call/${appt.id}`);
      }
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to start call";
      toast.error(msg);
    } finally {
      setStartingCallId(null);
    }
  };

  const handleJoinActiveSession = (appt) => {
    navigate(`/call/${appt.id}`);
  };

  const renderVideoButton = (appt) => {
    if (appt.status !== "APPROVED") return null;
    const cs = (appt.callStatus || "idle").toLowerCase();
    const isStarting = startingCallId === appt.id;
    switch (cs) {
      case "idle":
        return (
          <button
            onClick={() => handleStartCall(appt)}
            disabled={isStarting}
            className="p-2 rounded-xl bg-[var(--brand-green)]/10 text-[var(--brand-green)] hover:bg-[var(--brand-green)] hover:text-[var(--text-main)] transition-all disabled:opacity-50"
            title="Start Video Call"
          >
            {isStarting ? <FaSpinner size={14} className="animate-spin" /> : <FaPhoneAlt size={14} />}
          </button>
        );
      case "requested":
        return (
          <button
            onClick={() => handleJoinActiveSession(appt)}
            className="p-2 rounded-xl bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500 hover:text-[var(--text-main)] transition-all animate-pulse"
            title="Waiting for patient — click to enter call page"
          >
            <FaVideo size={14} />
          </button>
        );
      case "active":
        return (
          <button
            onClick={() => handleJoinActiveSession(appt)}
            className="p-2 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-[var(--text-main)] transition-all"
            title="Join Active Session"
          >
            <FaVideo size={14} />
          </button>
        );
      case "ended":
        return (
          <button disabled className="p-2 rounded-xl bg-gray-500/10 text-gray-500 cursor-not-allowed opacity-50" title="Session Ended">
            <FaVideo size={14} />
          </button>
        );
      default:
        return null;
    }
  };

  const handleAssignLabSubmit = async (e) => {
    e.preventDefault();
    if (!labForm.laboratoryId || !labForm.testName) {
      toast.error("Please fill required fields");
      return;
    }
    try {
      setSubmittingLab(true);
      const token = localStorage.getItem("token");
      const payload = {
        patientId: assignLabPatient.id,
        laboratoryId: labForm.laboratoryId,
        testName: labForm.testName,
        notes: labForm.notes,
        priority: labForm.priority
      };
      await api.post("/doctor/lab-orders", payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Lab Test Assigned successfully!");
      setAssignLabPatient(null);
      setLabForm({ laboratoryId: "", testName: "", notes: "", priority: "ROUTINE" });
      fetchAssignedLabTests();
    } catch (err) {
      console.error(err);
      toast.error("Failed to assign lab test");
    } finally {
      setSubmittingLab(false);
    }
  };

  const handleEditLabSubmit = async (e) => {
    e.preventDefault();
    if (!editingLabTest) return;
    try {
      setSubmittingEditLab(true);
      await api.put(`/doctor/lab-orders/${editingLabTest.id}`, editLabForm);
      toast.success("Lab Test updated successfully");
      setEditingLabTest(null);
      fetchAssignedLabTests();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Test edit nahi ho saka, dubara koshish karein");
    } finally {
      setSubmittingEditLab(false);
    }
  };

  const handleDeleteLabTest = async (testId) => {
    try {
      await api.delete(`/doctor/lab-orders/${testId}`);
      toast.success("Lab Test deleted successfully");
      setConfirmDeleteLab(null);
      fetchAssignedLabTests();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Test delete nahi ho saka, dubara koshish karein");
    }
  };

  const handleDeleteProtocolActionConfirm = async (item) => {
    try {
      await api.delete(`/doctor/protocol-actions/${item.id}`);
      toast.success("Protocol action deleted successfully");
      setConfirmDeleteProtocolAction(null);
      fetchMyPatients();
      fetchAppointments();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Protocol action delete nahi ho saka, dubara koshish karein");
    }
  };

  return (
    <DashboardLayout role="DOCTOR" user={user}>
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-[10px] font-black text-[var(--brand-green)] uppercase tracking-[0.3em] mb-1">
              Clinical {viewType === "APPOINTMENTS" ? "Schedule" : "Registry"}
            </h2>
            <h1 className="text-3xl font-black text-[var(--text-main)] tracking-tighter uppercase">
              {viewType === "APPOINTMENTS" ? "Appointments" : "My Patients"}
            </h1>
          </div>
          
          <div className="flex bg-[var(--bg-card)] rounded-2xl p-1 border border-[var(--border)] self-start md:self-center">
            <button 
              onClick={() => setViewType("APPOINTMENTS")} 
              className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${viewType === "APPOINTMENTS" ? "bg-[var(--brand-green)] text-white shadow-md" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"}`}
            >
              Appointments
            </button>
            <button 
              onClick={() => setViewType("PATIENTS")} 
              className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${viewType === "PATIENTS" ? "bg-[var(--brand-green)] text-white shadow-md" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"}`}
            >
              Patients
            </button>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            {viewType === "PATIENTS" && (
              <div className="relative group flex-1 md:w-[250px]">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--brand-green)] transition-all" />
                <input
                  type="text"
                  placeholder="Filter by name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl py-3 pl-12 pr-6 text-xs font-bold focus:border-[var(--brand-green)] outline-none"
                />
              </div>
            )}
            {viewType === "APPOINTMENTS" && (
              <button onClick={openNewModal} className="btn btn-primary whitespace-nowrap">
                <FaPlus /> New Session
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
            <p className="text-red-500 text-[10px] font-black uppercase tracking-widest">{error}</p>
          </div>
        )}

        {/* View Switching */}
        {viewType === "APPOINTMENTS" ? (
          <div className="card !p-0 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-emerald-500/20 scrollbar-track-transparent">
              <table className="w-full text-left border-collapse min-w-[800px] md:min-w-0">
                <thead>
                  <tr className="bg-[var(--bg-main)]/50 border-b border-[var(--border)]">
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Subject</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Time Protocol</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Objective</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center">Operations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] text-[var(--text-main)]">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-sm font-bold text-[var(--text-soft)] animate-pulse">
                        Scanning Grid...
                      </td>
                    </tr>
                  ) : appointments.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-sm font-bold text-[var(--text-soft)]">
                        Protocol Clear. No appointments found.
                      </td>
                    </tr>
                  ) : (
                    appointments.map((a) => (
                      <tr key={a.id} className="hover:bg-[var(--bg-main)]/30 transition-colors">
                        <td className="px-6 py-4 text-sm font-black text-[var(--text-main)]">
                          {a?.patient?.user ? `${a.patient.user.firstName} ${a.patient.user.lastName}` : a?.patientName || "IDENTITY_UNKNOWN"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-[var(--text-main)] flex items-center gap-2">
                              <FaCalendarAlt className="text-[var(--brand-green)] text-[10px]" /> {formatLiteralDate(a?.appointmentDate)}
                            </span>
                            <span className="text-[10px] font-mono text-[var(--brand-blue)] flex items-center gap-2">
                              <FaClock className="text-[10px]" /> {formatLiteralTime(a?.appointmentDate)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-[var(--text-soft)] truncate max-w-[200px]">
                          {a?.reason || "General Observation"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1 items-start">
                            <StatusPill status={a?.status} />
                            <CallStatusBadge callStatus={a?.callStatus} />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-3">
                            {a?.status === "PENDING" && (
                              <button onClick={() => handleApprove(a.id)} className="p-2 rounded-xl bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-[var(--text-main)] transition-all" title="Approve">
                                <FaCheckCircle size={14} />
                              </button>
                            )}
                            {renderVideoButton(a)}
                            <button onClick={() => openViewModal(a)} className="p-2 rounded-xl bg-[var(--brand-blue)]/10 text-[var(--brand-blue)] hover:bg-[var(--brand-blue)] hover:text-[var(--text-main)] transition-all">
                              <FaEye size={14} />
                            </button>
                            <button onClick={() => openEditModal(a)} className="p-2 rounded-xl bg-[var(--brand-green)]/10 text-[var(--brand-green)] hover:bg-[var(--brand-green)] hover:text-[var(--text-main)] transition-all">
                              <FaEdit size={14} />
                            </button>
                            <button onClick={() => requestDelete(a.id)} className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-[var(--text-main)] transition-all">
                              <FaTrash size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="card !p-0 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-main)]/50 border-b border-[var(--border)]">
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Subject Name</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Encrypted Identity</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Gender</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Classification</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center">Protocol Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {patientsLoading ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center font-bold text-[var(--text-soft)] animate-pulse uppercase tracking-widest text-xs">
                        Accessing Identity Vault...
                      </td>
                    </tr>
                  ) : filteredPatients.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center font-bold text-[var(--text-soft)] uppercase tracking-widest text-xs">
                        No matching subjects found.
                      </td>
                    </tr>
                  ) : (
                    filteredPatients.map((p) => (
                      <tr key={p.id} className="hover:bg-[var(--bg-main)]/30 transition-colors">
                        <td className="px-6 py-4 text-sm font-black text-[var(--text-main)]">{p.name}</td>
                        <td className="px-6 py-4 text-xs font-bold text-[var(--text-soft)]">{p.email}</td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 rounded-full bg-[var(--bg-main)]/50 border border-[var(--border)] text-[9px] font-black uppercase tracking-widest text-[var(--text-soft)]">
                            {p.gender || "UNKNOWN"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-black font-mono text-[var(--brand-blue)]">{p.bloodGroup || "—"}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-3">
                            <button
                              onClick={async () => {
                                try {
                                  const res = await api.get(`/doctor/patient/${p.id}`);
                                  setViewPatient({ profile: res.data });
                                } catch (e) {
                                  setViewPatient(p);
                                }
                              }}
                              title="View Profile"
                              className="p-2 rounded-xl bg-[var(--brand-blue)]/10 text-[var(--brand-blue)] hover:bg-[var(--brand-blue)] hover:text-[var(--text-main)] transition-all shadow-sm"
                            >
                              <FaEye size={14} />
                            </button>
                            <button
                              onClick={() => setAssignLabPatient(p)}
                              title="Assign Lab Test"
                              className="p-2 rounded-xl bg-purple-500/10 text-purple-500 hover:bg-purple-500 hover:text-white transition-all shadow-sm"
                            >
                              <FaFlask size={14} />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteProtocolAction(p)}
                              title="Delete Protocol Action"
                              className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                            >
                              <FaTrash size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ASSIGNED LAB TESTS SECTION */}
        <div className="card space-y-6 animate-in fade-in duration-500">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
            <div>
              <h3 className="text-xl font-black text-[var(--text-main)] uppercase tracking-tighter">Assigned Lab Tests Registry</h3>
              <p className="text-xs text-[var(--text-soft)]">Real-time tracking of diagnostic protocols and laboratory orders</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-[var(--brand-green)]/10 text-[var(--brand-green)] text-xs font-bold">
              {assignedLabTests.length} Assigned
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Test Name</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Patient</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Laboratory</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Assigned Date / Time</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Priority</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Status</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {assignedLabTests.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-xs font-bold text-[var(--text-soft)] uppercase">
                      No lab tests assigned yet.
                    </td>
                  </tr>
                ) : (
                  assignedLabTests.map((test) => (
                    <tr key={test.id} className="hover:bg-[var(--bg-main)]/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-black text-[var(--text-main)]">
                        {test.testName}
                        {test.notes && (
                          <p className="text-[10px] font-normal text-[var(--text-soft)] mt-0.5">{test.notes}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-[var(--text-main)]">
                        {test.patient?.user ? `${test.patient.user.firstName} ${test.patient.user.lastName}` : "Patient"}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-[var(--text-soft)]">
                        {test.laboratory?.name || test.laboratory?.user?.name || "Assigned Lab"}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text-soft)]">
                        {new Date(test.orderedAt || test.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          test.priority === "STAT" ? "bg-red-500/10 text-red-500 border border-red-500/20" :
                          test.priority === "URGENT" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                          "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                        }`}>
                          {test.priority || "ROUTINE"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          test.status === "COMPLETED" ? "bg-green-500/10 text-green-500" :
                          "bg-purple-500/10 text-purple-500"
                        }`}>
                          {test.status || "ORDERED"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => {
                              setEditingLabTest(test);
                              setEditLabForm({
                                testName: test.testName || "",
                                notes: test.notes || "",
                                priority: test.priority || "ROUTINE",
                                status: test.status || "ORDERED",
                              });
                            }}
                            title="Edit Assigned Test"
                            className="p-2 rounded-xl bg-[var(--brand-green)]/10 text-[var(--brand-green)] hover:bg-[var(--brand-green)] hover:text-white transition-all shadow-sm"
                          >
                            <FaEdit size={13} />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteLab(test)}
                            title="Delete Assigned Test"
                            className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                          >
                            <FaTrash size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* APPOINTMENT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div onClick={() => setModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div className="relative z-10 w-full max-w-lg glass !p-8 animate-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tighter uppercase mb-6">
              {viewMode ? "Protocol View" : editing ? "Confirm Session" : "Initialize Protocol"}
            </h2>
            {viewMode ? (
              <div className="space-y-6 text-[var(--text-main)] text-xs font-bold">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-widest">Subject</p>
                    <p className="text-[var(--text-main)]">
                      {selectedAppointment?.patient?.user ? `${selectedAppointment.patient.user.firstName} ${selectedAppointment.patient.user.lastName}` : "IDENTITY_UNKNOWN"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-widest">Protocol Date</p>
                    <p className="text-[var(--text-main)]">{formatLiteralDateTime(selectedAppointment?.appointmentDate)}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-widest">Objective</p>
                  <p className="text-[var(--text-soft)] bg-[var(--bg-main)]/50 p-4 rounded-xl border border-[var(--border)]">
                    {selectedAppointment?.reason || "General Consultation."}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-widest">Status</p>
                  <StatusPill status={selectedAppointment?.status} />
                </div>
                <button onClick={() => setModalOpen(false)} className="btn btn-primary w-full mt-4">Close Vault</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5 text-[var(--text-main)]">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Select Subject</label>
                  <select
                    className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-3.5 px-4 text-xs font-bold focus:border-[var(--brand-green)] outline-none text-black"
                    value={form.patientId}
                    onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                    required
                  >
                    <option value="">-- Choose Subject --</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>{p.name || p.user?.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5 text-[var(--text-main)]">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Protocol Time</label>
                  <input
                    type="datetime-local"
                    className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-3.5 px-4 text-xs font-bold focus:border-[var(--brand-green)] outline-none text-[var(--text-main)]"
                    value={form.appointmentDate}
                    onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5 text-[var(--text-main)]">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Case Notes</label>
                  <textarea
                    className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-3.5 px-4 text-xs font-bold focus:border-[var(--brand-green)] outline-none h-24 text-[var(--text-main)]"
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    placeholder="Input clinical objectives..."
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setModalOpen(false)} className="btn flex-1 bg-[var(--bg-main)] border border-[var(--border)] text-[var(--text-soft)]">Cancel</button>
                  <button type="submit" className="btn btn-primary flex-[2]">{editing ? "Update Protocol" : "Confirm Session"}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {confirmOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmOpen(false)}></div>
          <div className="relative z-10 w-full max-w-md glass !p-8 animate-in zoom-in-95 duration-300">
            <h3 className="text-xl font-black text-[var(--text-main)] tracking-tighter uppercase mb-2">Delete Protocol?</h3>
            <p className="text-sm font-bold text-[var(--text-soft)] mb-8 uppercase tracking-widest opacity-70 italic">Critical Data Loss Expected.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmOpen(false)} className="btn flex-1 bg-[var(--bg-main)] border border-[var(--border)] text-[var(--text-soft)]">Abort</button>
              <button onClick={confirmDelete} className="btn bg-red-500 text-white flex-[2] hover:bg-red-600 disabled:opacity-50" disabled={deleting}>
                {deleting ? "Purging..." : "Confirm Deletion"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PATIENT PROFILE VIEW MODAL */}
      {viewPatient && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div onClick={() => setViewPatient(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div className="relative z-10 w-full max-w-2xl glass !p-8 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto scrollbar-hide">
            <button onClick={() => setViewPatient(null)} className="absolute right-6 top-6 text-[var(--text-muted)] hover:text-[var(--text-main)]"><FaTimes /></button>
            <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tighter uppercase mb-6 flex items-center gap-3">
              <FaUser className="text-[var(--brand-green)]" /> Subject Profile
            </h2>
            <div className="grid md:grid-cols-2 gap-8 mb-8 border-t border-[var(--border)] pt-8">
              <section className="space-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">Full Name</p>
                  <p className="text-sm font-black text-[var(--text-main)]">
                    {viewPatient.profile?.user ? `${viewPatient.profile.user.firstName} ${viewPatient.profile.user.lastName}` : viewPatient.name || "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">Email Address</p>
                  <p className="text-sm font-black text-[var(--text-main)]">
                    {viewPatient.profile?.user?.email || viewPatient.email || "—"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">Gender</p>
                    <p className="text-sm font-black text-[var(--text-main)]">{viewPatient.profile?.gender || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">Blood Type</p>
                    <p className="text-sm font-black text-[var(--brand-blue)] font-mono">{viewPatient.profile?.bloodGroup || "—"}</p>
                  </div>
                </div>
              </section>
              <section className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">Height</p>
                    <p className="text-sm font-black text-[var(--text-main)]">{viewPatient.profile?.height ? `${viewPatient.profile.height} cm` : "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">Weight</p>
                    <p className="text-sm font-black text-[var(--text-main)]">{viewPatient.profile?.weight ? `${viewPatient.profile.weight} kg` : "—"}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">Date of Birth</p>
                  <p className="text-sm font-black text-[var(--text-main)]">{viewPatient.profile?.dateOfBirth ? new Date(viewPatient.profile.dateOfBirth).toLocaleDateString() : "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">Emergency Contact</p>
                  <p className="text-xs font-bold text-[var(--text-soft)]">{viewPatient.profile?.emergencyContact || "—"}</p>
                </div>
              </section>
              <section className="md:col-span-2 space-y-6 pt-6 border-t border-[var(--border)]">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-[var(--brand-orange)] tracking-widest">Known Allergies</p>
                    <div className="bg-[var(--bg-main)]/50 p-4 rounded-2xl border border-[var(--border)] text-xs font-bold text-[var(--text-soft)] min-h-[60px]">
                      {viewPatient.profile?.allergies || "No allergies logged."}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-[var(--brand-blue)] tracking-widest">Current Medications</p>
                    <div className="bg-[var(--bg-main)]/50 p-4 rounded-2xl border border-[var(--border)] text-xs font-bold text-[var(--text-soft)] min-h-[60px]">
                      {viewPatient.profile?.medications || "No active medications."}
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">Medical History</p>
                  <div className="bg-[var(--bg-main)]/50 p-4 rounded-2xl border border-[var(--border)] text-xs font-bold text-[var(--text-soft)] min-h-[80px]">
                    {viewPatient.profile?.medicalHistory || "Historical records unavailable."}
                  </div>
                </div>
              </section>
            </div>
            <button onClick={() => setViewPatient(null)} className="btn btn-primary w-full shadow-lg">Close Protocol</button>
          </div>
        </div>
      )}

      {/* ASSIGN LAB MODAL */}
      {assignLabPatient && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div onClick={() => setAssignLabPatient(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div className="relative z-10 w-full max-w-lg glass !p-8 animate-in zoom-in-95 duration-300">
            <button onClick={() => setAssignLabPatient(null)} className="absolute right-6 top-6 text-[var(--text-muted)] hover:text-[var(--text-main)]"><FaTimes /></button>
            <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tighter uppercase mb-6 flex items-center gap-3">
              <FaFlask className="text-purple-500" /> Assign Lab Test
            </h2>
            <p className="text-sm text-[var(--text-soft)] mb-6">
              Assigning test for: <span className="font-bold text-[var(--text-main)]">{assignLabPatient.name}</span>
            </p>
            <form onSubmit={handleAssignLabSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Select Laboratory</label>
                <select required value={labForm.laboratoryId} onChange={(e) => setLabForm({...labForm, laboratoryId: e.target.value})} className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl py-3 px-4 outline-none text-sm appearance-none text-black">
                  <option value="" disabled>-- Select Lab --</option>
                  {laboratories.map(lab => (
                    <option key={lab.id} value={lab.id}>{lab.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Test Name</label>
                <input required type="text" placeholder="e.g. CBC, Lipid Profile" value={labForm.testName} onChange={(e) => setLabForm({...labForm, testName: e.target.value})} className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl py-3 px-4 outline-none text-sm text-[var(--text-main)]" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Priority</label>
                <select value={labForm.priority} onChange={(e) => setLabForm({...labForm, priority: e.target.value})} className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl py-3 px-4 outline-none text-sm appearance-none text-black">
                  <option value="ROUTINE">ROUTINE</option>
                  <option value="URGENT">URGENT</option>
                  <option value="STAT">STAT</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Notes (Optional)</label>
                <textarea placeholder="Any specific instructions for the lab..." value={labForm.notes} onChange={(e) => setLabForm({...labForm, notes: e.target.value})} className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl py-3 px-4 outline-none text-sm min-h-[80px] text-[var(--text-main)]" />
              </div>
              <button type="submit" disabled={submittingLab} className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-black uppercase tracking-widest py-4 rounded-2xl hover:opacity-90 transition-opacity disabled:opacity-50">
                {submittingLab ? "Assigning..." : "Assign Test"}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* EDIT ASSIGNED LAB TEST MODAL */}
      {editingLabTest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div onClick={() => setEditingLabTest(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div className="relative z-10 w-full max-w-lg glass !p-8 animate-in zoom-in-95 duration-300">
            <button onClick={() => setEditingLabTest(null)} className="absolute right-6 top-6 text-[var(--text-muted)] hover:text-[var(--text-main)]"><FaTimes /></button>
            <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tighter uppercase mb-6 flex items-center gap-3">
              <FaEdit className="text-[var(--brand-green)]" /> Edit Assigned Test
            </h2>
            <form onSubmit={handleEditLabSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Test Name</label>
                <input required type="text" value={editLabForm.testName} onChange={(e) => setEditLabForm({...editLabForm, testName: e.target.value})} className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl py-3 px-4 outline-none text-sm text-[var(--text-main)]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Priority</label>
                  <select value={editLabForm.priority} onChange={(e) => setEditLabForm({...editLabForm, priority: e.target.value})} className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl py-3 px-4 outline-none text-sm appearance-none text-black">
                    <option value="ROUTINE">ROUTINE</option>
                    <option value="URGENT">URGENT</option>
                    <option value="STAT">STAT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Status</label>
                  <select value={editLabForm.status} onChange={(e) => setEditLabForm({...editLabForm, status: e.target.value})} className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl py-3 px-4 outline-none text-sm appearance-none text-black">
                    <option value="ORDERED">ORDERED</option>
                    <option value="PENDING">PENDING</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Notes</label>
                <textarea value={editLabForm.notes} onChange={(e) => setEditLabForm({...editLabForm, notes: e.target.value})} className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl py-3 px-4 outline-none text-sm min-h-[80px] text-[var(--text-main)]" />
              </div>
              <button type="submit" disabled={submittingEditLab} className="w-full bg-[var(--brand-green)] text-white font-black uppercase tracking-widest py-4 rounded-2xl hover:opacity-90 transition-opacity disabled:opacity-50">
                {submittingEditLab ? "Updating..." : "Update Test Details"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE LAB TEST DIALOG */}
      {confirmDeleteLab && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div onClick={() => setConfirmDeleteLab(null)} className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
          <div className="relative z-10 w-full max-w-md glass !p-8 animate-in zoom-in-95 duration-200 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto text-2xl">
              <FaTrash />
            </div>
            <div>
              <h3 className="text-xl font-black text-[var(--text-main)] uppercase tracking-tighter">Confirm Delete</h3>
              <p className="text-sm text-[var(--text-soft)] mt-2">
                Kya aap is assigned lab test (<strong>{confirmDeleteLab.testName}</strong>) ko delete karna chahte hain?
              </p>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setConfirmDeleteLab(null)} className="flex-1 py-3 px-4 rounded-2xl border border-[var(--border)] text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] hover:bg-[var(--bg-main)]">
                Cancel
              </button>
              <button onClick={() => handleDeleteLabTest(confirmDeleteLab.id)} className="flex-1 py-3 px-4 rounded-2xl bg-red-500 text-white text-xs font-black uppercase tracking-widest hover:bg-red-600 shadow-lg">
                Delete Test
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE PROTOCOL ACTION DIALOG */}
      {confirmDeleteProtocolAction && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div onClick={() => setConfirmDeleteProtocolAction(null)} className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
          <div className="relative z-10 w-full max-w-md glass !p-8 animate-in zoom-in-95 duration-200 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto text-2xl">
              <FaTrash />
            </div>
            <div>
              <h3 className="text-xl font-black text-[var(--text-main)] uppercase tracking-tighter">Delete Protocol Action?</h3>
              <p className="text-sm text-[var(--text-soft)] mt-2">
                Kya aap is action ko delete karna chahte hain? Delete karne ke baad ye action turant UI aur database se remove ho jayega.
              </p>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setConfirmDeleteProtocolAction(null)} className="flex-1 py-3 px-4 rounded-2xl border border-[var(--border)] text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] hover:bg-[var(--bg-main)]">
                Cancel
              </button>
              <button onClick={() => handleDeleteProtocolActionConfirm(confirmDeleteProtocolAction)} className="flex-1 py-3 px-4 rounded-2xl bg-red-500 text-white text-xs font-black uppercase tracking-widest hover:bg-red-600 shadow-lg">
                Delete Action
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="top-right" autoClose={2200} />
    </DashboardLayout>
  );
}
