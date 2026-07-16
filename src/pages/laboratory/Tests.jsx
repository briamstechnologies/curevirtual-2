import { useEffect, useState, useRef } from "react";
import { FiSearch, FiUploadCloud, FiCheckCircle, FiClock, FiAlertCircle, FiPlus, FiX, FiFileText, FiTrash, FiEdit } from "react-icons/fi";
import { toast } from "react-toastify";
import api from "../../Lib/api";
import { uploadLabReport } from "../../Lib/supabase";
import DashboardLayout from "../../layouts/DashboardLayout";

export default function Tests() {
  const [search, setSearch] = useState("");
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Modal form states
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [testName, setTestName] = useState("");
  const [reportFile, setReportFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Inline upload state
  const [uploadingOrderId, setUploadingOrderId] = useState(null);
  const inlineFileInputRef = useRef(null);

  // Edit Modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    id: "",
    testName: "",
    status: "ORDERED",
    priority: "ROUTINE",
    notes: "",
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const userId = localStorage.getItem("userId");
      const res = await api.get(`/laboratory/orders?userId=${userId}`);
      if (res.data && res.data.success) {
        setTests(res.data.data || []);
      }
    } catch (error) {
      console.error("Failed to load orders:", error);
      toast.error("Failed to load laboratory orders");
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownLists = async () => {
    try {
      const [patientsRes, doctorsRes] = await Promise.all([
        api.get("/laboratory/patients-list"),
        api.get("/laboratory/doctors-list")
      ]);
      if (patientsRes.data && patientsRes.data.success) {
        setPatients(patientsRes.data.data || []);
      }
      if (doctorsRes.data && doctorsRes.data.success) {
        setDoctors(doctorsRes.data.data || []);
      }
    } catch (error) {
      console.error("Failed to load dropdown lists:", error);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchDropdownLists();
  }, []);

  const handleCreateReport = async (e) => {
    e.preventDefault();
    if (!selectedPatientId) return toast.error("Please select a patient");
    if (!testName.trim()) return toast.error("Please enter a test name");
    if (!reportFile) return toast.error("Please select a report PDF file");

    try {
      setSubmitting(true);
      const userId = localStorage.getItem("userId");

      // 1. Upload file to Supabase Storage
      const resultUrl = await uploadLabReport(reportFile, userId);

      // 2. Submit to API to create and complete the order
      const payload = {
        userId,
        patientId: selectedPatientId,
        doctorId: selectedDoctorId || null,
        testName: testName.trim(),
        resultUrl,
      };

      const res = await api.post("/laboratory/orders", payload);
      if (res.data && res.data.success) {
        toast.success("Laboratory report successfully created and sent!");
        setIsModalOpen(false);
        // Reset fields
        setSelectedPatientId("");
        setSelectedDoctorId("");
        setTestName("");
        setReportFile(null);
        // Reload list
        fetchOrders();
      } else {
        toast.error(res.data.error || "Failed to create and send report");
      }
    } catch (error) {
      console.error("Error creating report:", error);
      toast.error(error.message || "Failed to create and send report");
    } finally {
      setSubmitting(false);
    }
  };

  const handleInlineUploadClick = (orderId) => {
    setUploadingOrderId(orderId);
    if (inlineFileInputRef.current) {
      inlineFileInputRef.current.click();
    }
  };

  const handleInlineFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !uploadingOrderId) return;

    try {
      setLoading(true);
      const userId = localStorage.getItem("userId");

      // 1. Upload to Supabase Storage
      const resultUrl = await uploadLabReport(file, userId);

      // 2. Patch status and url
      const res = await api.patch(`/laboratory/orders/${uploadingOrderId}/result`, {
        userId,
        resultUrl
      });

      if (res.data && res.data.success) {
        toast.success("Report successfully uploaded and sent!");
        fetchOrders();
      } else {
        toast.error(res.data.error || "Failed to upload report");
      }
    } catch (error) {
      console.error("Error uploading inline report:", error);
      toast.error(error.message || "Failed to upload report");
    } finally {
      setUploadingOrderId(null);
      e.target.value = "";
      setLoading(false);
    }
  };

  const handleDelete = async (orderId) => {
    if (!window.confirm("Are you sure you want to delete this laboratory request?")) {
      return;
    }

    try {
      setLoading(true);
      const userId = localStorage.getItem("userId");
      const res = await api.delete(`/laboratory/orders/${orderId}?userId=${userId}`);

      if (res.data && res.data.success) {
        toast.success("Order deleted successfully!");
        fetchOrders();
      } else {
        toast.error(res.data.error || "Failed to delete order");
      }
    } catch (error) {
      console.error("Error deleting order:", error);
      toast.error(error.message || "Failed to delete order");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (item) => {
    setEditForm({
      id: item.id,
      testName: item.testName || "",
      status: item.status || "ORDERED",
      priority: item.priority || "ROUTINE",
      notes: item.notes || "",
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      setEditSubmitting(true);
      const res = await api.put(`/laboratory/orders/${editForm.id}`, {
        testName: editForm.testName.trim(),
        priority: editForm.priority,
        notes: editForm.notes,
      });

      if (editForm.status) {
        await api.patch(`/laboratory/orders/${editForm.id}/status`, {
          status: editForm.status,
        });
      }

      if (res.data && res.data.success) {
        toast.success("Laboratory request updated successfully!");
        setEditModalOpen(false);
        fetchOrders();
      } else {
        toast.error(res.data?.error || "Failed to update request");
      }
    } catch (error) {
      console.error("Error updating test:", error);
      toast.error(error.message || "Failed to update request");
    } finally {
      setEditSubmitting(false);
    }
  };

  const filteredTests = tests.filter((item) => {
    const pName = item.patient?.user
      ? `${item.patient.user.firstName} ${item.patient.user.lastName}`
      : "";
    const dName = item.doctor?.user
      ? `${item.doctor.user.firstName} ${item.doctor.user.lastName}`
      : "";
    const searchLower = search.toLowerCase();
    return (
      pName.toLowerCase().includes(searchLower) ||
      dName.toLowerCase().includes(searchLower) ||
      item.testName?.toLowerCase().includes(searchLower) ||
      item.id?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (item) => {
    if (item.status === "COMPLETED") {
      return (
        <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-max">
          <FiCheckCircle /> Approved & Sent to Patient
        </span>
      );
    }
    if (item.resultNotes?.startsWith("REVISION REQUESTED:")) {
      return (
        <div className="flex flex-col gap-1">
          <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-max">
            <FiAlertCircle /> Revision Requested
          </span>
          <span className="text-[11px] text-red-400 max-w-xs line-clamp-2">
            {item.resultNotes.replace("REVISION REQUESTED:", "").trim()}
          </span>
        </div>
      );
    }
    if (item.status === "COMPLETED") {
      return (
        <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-max">
          <FiCheckCircle /> Approved & Sent to Patient
        </span>
      );
    }
    if (item.resultUrl && item.status === "PENDING") {
      return (
        <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-max">
          <FiClock /> Awaiting Doctor Review
        </span>
      );
    }
    switch (item.status) {
      case "IN_PROGRESS":
      case "SAMPLE_COLLECTED":
        return (
          <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-max">
            <FiClock /> Processing Sample
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-max">
            <FiAlertCircle /> Assigned
          </span>
        );
    }
  };

  return (
    <DashboardLayout role="LABORATORY">
      <div className="animate-in fade-in duration-700">
        {/* Hidden File Input for inline uploads */}
        <input
          ref={inlineFileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handleInlineFileChange}
        />

        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-5 mb-10">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-[var(--text-main)]">
              Laboratory Tests
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] mt-2">
              Manage All Laboratory Requests
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary bg-gradient-to-r from-[var(--brand-purple)] to-[var(--brand-blue)] border-none rounded-2xl px-6 flex items-center gap-2"
          >
            <FiPlus />
            Create & Upload Report
          </button>
        </div>

        {/* SEARCH */}
        <div className="glass-panel p-5 mb-8">
          <div className="relative">
            <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search by patient, doctor, test or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl py-4 pl-14 pr-5 outline-none"
            />
          </div>
        </div>

        {/* TABLE */}
        <div className="glass-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--bg-card)] border-b border-[var(--border)]">
                <tr>
                  <th className="text-left px-6 py-4 text-[10px] uppercase tracking-widest">
                    Test ID
                  </th>
                  <th className="text-left px-6 py-4 text-[10px] uppercase tracking-widest">
                    Patient
                  </th>
                  <th className="text-left px-6 py-4 text-[10px] uppercase tracking-widest">
                    Doctor
                  </th>
                  <th className="text-left px-6 py-4 text-[10px] uppercase tracking-widest">
                    Test
                  </th>
                  <th className="text-left px-6 py-4 text-[10px] uppercase tracking-widest">
                    Date
                  </th>
                  <th className="text-left px-6 py-4 text-[10px] uppercase tracking-widest">
                    Status
                  </th>
                  <th className="text-right px-6 py-4 text-[10px] uppercase tracking-widest">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="p-10 text-center text-sm text-[var(--text-muted)]">
                      Loading tests...
                    </td>
                  </tr>
                ) : filteredTests.length > 0 ? (
                  filteredTests.map((item) => {
                    const pName = item.patient?.user
                      ? `${item.patient.user.firstName} ${item.patient.user.lastName}`
                      : "Unknown Patient";
                    const dName = item.doctor?.user
                      ? `${item.doctor.user.firstName} ${item.doctor.user.lastName}`
                      : "Walk-in / N/A";
                    return (
                      <tr
                        key={item.id}
                        className="border-b border-[var(--border)] hover:bg-[var(--bg-card)] transition-all"
                      >
                        <td className="px-6 py-5 text-sm font-bold">{item.id.slice(0, 8)}...</td>
                        <td className="px-6 py-5 text-sm">{pName}</td>
                        <td className="px-6 py-5 text-sm">{dName}</td>
                        <td className="px-6 py-5 text-sm">{item.testName}</td>
                        <td className="px-6 py-5 text-sm">
                          {new Date(item.orderedAt || item.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-5">{getStatusBadge(item)}</td>
                        <td className="px-6 py-5 text-right flex items-center justify-end gap-3">
                          {item.status === "COMPLETED" ? (
                            <>
                              <a
                                href={item.resultUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="bg-green-500/10 text-green-500 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-500/20 transition-all"
                              >
                                View
                              </a>
                              <button
                                onClick={() => handleInlineUploadClick(item.id)}
                                className="bg-[var(--brand-blue)] text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all"
                              >
                                Re-upload
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleInlineUploadClick(item.id)}
                              className="bg-[var(--brand-purple)] text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all"
                            >
                              Upload
                            </button>
                          )}
                          <button
                            onClick={() => handleEditClick(item)}
                            className="bg-yellow-500/10 text-yellow-500 p-2 rounded-xl hover:bg-yellow-500/20 transition-all flex items-center justify-center text-sm"
                            title="Edit Request"
                          >
                            <FiEdit />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="bg-red-500/10 text-red-500 p-2 rounded-xl hover:bg-red-500/20 transition-all flex items-center justify-center text-sm"
                            title="Delete Request"
                          >
                            <FiTrash />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="p-10 text-center text-sm text-[var(--text-muted)]">
                      No laboratory tests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CREATE & UPLOAD MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="glass-panel w-full max-w-lg p-8 relative rounded-3xl border border-[var(--border)] shadow-2xl mx-4">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-6 top-6 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
            >
              <FiX className="text-xl" />
            </button>

            <h2 className="text-2xl font-black uppercase tracking-tight text-[var(--text-main)] mb-2 flex items-center gap-2">
              <FiFileText className="text-[var(--brand-purple)]" />
              Create & Send Report
            </h2>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-8">
              Select Patient & Doctor profiles to send report
            </p>

            <form onSubmit={handleCreateReport} className="space-y-6">
              {/* Patient Profile */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                  Select Patient *
                </label>
                <select
                  required
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl py-4 px-5 outline-none text-sm text-[var(--text-main)] appearance-none"
                >
                  <option value="">-- Choose Patient Profile --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Doctor Profile */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                  Select Doctor (Optional)
                </label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl py-4 px-5 outline-none text-sm text-[var(--text-main)] appearance-none"
                >
                  <option value="">-- Choose Doctor Profile (Walk-in / None) --</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Test Name */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                  Test Name / Type *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Complete Blood Count (CBC)"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl py-4 px-5 outline-none text-sm text-[var(--text-main)]"
                />
              </div>

              {/* PDF File Upload */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                  Upload PDF Report *
                </label>
                <div className="border-2 border-dashed border-[var(--border)] rounded-2xl p-6 text-center hover:border-[var(--brand-purple)] transition-colors cursor-pointer relative">
                  <input
                    type="file"
                    required
                    accept=".pdf"
                    onChange={(e) => setReportFile(e.target.files[0])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <FiUploadCloud className="mx-auto text-3xl text-[var(--text-muted)] mb-3" />
                  <p className="text-sm font-bold text-[var(--text-main)]">
                    {reportFile ? reportFile.name : "Click or drag PDF report file here"}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">PDF files only</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary w-1/2 rounded-2xl py-4"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary w-1/2 rounded-2xl py-4 bg-gradient-to-r from-[var(--brand-purple)] to-[var(--brand-blue)] border-none shadow-lg shadow-[var(--brand-purple)]/20"
                  disabled={submitting}
                >
                  {submitting ? "Uploading & Sending..." : "Send Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl relative">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-[var(--text-main)]">Edit Laboratory Request</h3>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors p-2"
              >
                <FiX className="text-xl" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                  Test Name / Type *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.testName}
                  onChange={(e) => setEditForm({ ...editForm, testName: e.target.value })}
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-3 px-4 text-sm text-[var(--text-main)]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                  Status
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-3 px-4 text-sm text-[var(--text-main)]"
                >
                  <option value="ORDERED">ORDERED</option>
                  <option value="SAMPLE_COLLECTED">SAMPLE COLLECTED</option>
                  <option value="IN_PROGRESS">IN PROGRESS</option>
                  <option value="COMPLETED">COMPLETED</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                  Priority
                </label>
                <select
                  value={editForm.priority}
                  onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-3 px-4 text-sm text-[var(--text-main)]"
                >
                  <option value="ROUTINE">ROUTINE</option>
                  <option value="URGENT">URGENT</option>
                  <option value="STAT">STAT</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                  Notes
                </label>
                <textarea
                  rows="3"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-3 px-4 text-sm text-[var(--text-main)]"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="btn btn-secondary w-1/2 rounded-2xl py-3"
                  disabled={editSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary w-1/2 rounded-2xl py-3 bg-[var(--brand-green)] text-white font-bold"
                  disabled={editSubmitting}
                >
                  {editSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
