import { useState } from "react";
import {
  FiUploadCloud,
  FiFileText,
  FiUser,
  FiCheckCircle,
} from "react-icons/fi";
import DashboardLayout from "../../layouts/DashboardLayout";

export default function UploadReport() {
  const [formData, setFormData] = useState({
    patientName: "",
    testName: "",
    remarks: "",
  });

  const [selectedFile, setSelectedFile] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Future API Integration
    console.log({
      ...formData,
      file: selectedFile,
    });

    alert("Report uploaded successfully!");

    setFormData({
      patientName: "",
      testName: "",
      remarks: "",
    });

    setSelectedFile(null);
  };

  return (
    <DashboardLayout role="LABORATORY">
      <div className="animate-in fade-in duration-700">

      {/* HEADER */}
      <div className="mb-10">
        <h1 className="text-3xl font-black uppercase tracking-tight text-[var(--text-main)]">
          Upload Report
        </h1>

        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] mt-2">
          Upload Laboratory Test Reports
        </p>
      </div>

      {/* FORM CARD */}
      <div className="glass-panel p-8 max-w-4xl">

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* PATIENT NAME */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest mb-2 block">
              Patient Name
            </label>

            <div className="relative">
              <FiUser className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />

              <input
                type="text"
                name="patientName"
                value={formData.patientName}
                onChange={handleChange}
                required
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] py-4 pl-14 pr-5 outline-none"
                placeholder="Enter patient name"
              />
            </div>
          </div>

          {/* TEST NAME */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest mb-2 block">
              Test Name
            </label>

            <div className="relative">
              <FiFileText className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />

              <input
                type="text"
                name="testName"
                value={formData.testName}
                onChange={handleChange}
                required
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] py-4 pl-14 pr-5 outline-none"
                placeholder="Enter test name"
              />
            </div>
          </div>

          {/* FILE UPLOAD */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest mb-2 block">
              Upload Report File
            </label>

            <label className="border-2 border-dashed border-[var(--border)] rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[var(--brand-purple)] transition-all bg-[var(--bg-card)]">
              
              <FiUploadCloud className="text-5xl text-[var(--brand-purple)] mb-4" />

              <p className="font-bold text-sm text-[var(--text-main)]">
                Click to upload report
              </p>

              <p className="text-xs text-[var(--text-muted)] mt-1">
                PDF, JPG, PNG supported
              </p>

              {selectedFile && (
                <div className="mt-4 bg-green-500/10 text-green-500 px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold">
                  <FiCheckCircle />
                  {selectedFile.name}
                </div>
              )}

              <input
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png"
              />
            </label>
          </div>

          {/* REMARKS */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest mb-2 block">
              Remarks
            </label>

            <textarea
              rows="5"
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 outline-none resize-none"
              placeholder="Write additional remarks..."
            />
          </div>

          {/* BUTTON */}
          <button
            type="submit"
            className="btn btn-primary rounded-2xl px-8 py-4 flex items-center gap-3"
          >
            <FiUploadCloud />
            Upload Report
          </button>

        </form>
      </div>
    </div>
  </DashboardLayout>
  );
}