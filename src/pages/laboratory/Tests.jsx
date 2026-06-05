// FILE: src/pages/laboratory/LaboratoryTests.jsx

import { useEffect, useState } from "react";
import {
  FiSearch,
  FiUploadCloud,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
} from "react-icons/fi";
import DashboardLayout from "../../layouts/DashboardLayout";

export default function Tests() {
  const [search, setSearch] = useState("");
  const [tests, setTests] = useState([]);

  useEffect(() => {
    // Dummy API Data
    setTests([
      {
        id: "LAB-1001",
        patient: "Ali Khan",
        doctor: "Dr. Ahmed",
        test: "CBC",
        status: "Pending",
        date: "2026-01-15",
      },
      {
        id: "LAB-1002",
        patient: "Sara Noor",
        doctor: "Dr. Bilal",
        test: "Lipid Profile",
        status: "Processing",
        date: "2026-01-15",
      },
      {
        id: "LAB-1003",
        patient: "Usman Tariq",
        doctor: "Dr. Hamza",
        test: "HbA1c",
        status: "Completed",
        date: "2026-01-14",
      },
    ]);
  }, []);

  const filteredTests = tests.filter(
    (item) =>
      item.patient.toLowerCase().includes(search.toLowerCase()) ||
      item.test.toLowerCase().includes(search.toLowerCase()) ||
      item.id.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case "Completed":
        return (
          <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
            <FiCheckCircle />
            Completed
          </span>
        );

      case "Processing":
        return (
          <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
            <FiClock />
            Processing
          </span>
        );

      default:
        return (
          <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
            <FiAlertCircle />
            Pending
          </span>
        );
    }
  };

  return (
    <DashboardLayout role="LABORATORY">
      <div className="animate-in fade-in duration-700">
      
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

        <button className="btn btn-primary rounded-2xl px-6">
          <FiUploadCloud className="mr-2" />
          Upload Report
        </button>
      </div>

      {/* SEARCH */}
      <div className="glass-panel p-5 mb-8">
        <div className="relative">
          <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />

          <input
            type="text"
            placeholder="Search by patient, test or ID..."
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
              {filteredTests.map((item, index) => (
                <tr
                  key={index}
                  className="border-b border-[var(--border)] hover:bg-[var(--bg-card)] transition-all"
                >
                  <td className="px-6 py-5 text-sm font-bold">
                    {item.id}
                  </td>

                  <td className="px-6 py-5 text-sm">
                    {item.patient}
                  </td>

                  <td className="px-6 py-5 text-sm">
                    {item.doctor}
                  </td>

                  <td className="px-6 py-5 text-sm">
                    {item.test}
                  </td>

                  <td className="px-6 py-5 text-sm">
                    {item.date}
                  </td>

                  <td className="px-6 py-5">
                    {getStatusBadge(item.status)}
                  </td>

                  <td className="px-6 py-5 text-right">
                    <button className="bg-[var(--brand-purple)] text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all">
                      Upload
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredTests.length === 0 && (
            <div className="p-10 text-center text-sm text-[var(--text-muted)]">
              No laboratory tests found.
            </div>
          )}
      </div>
    </div>
  </div>
</DashboardLayout>
  );
}