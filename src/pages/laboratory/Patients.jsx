// FILE: src/pages/laboratory/Patients.jsx

import { useEffect, useState } from "react";
import { FiSearch, FiUser, FiPhone, FiMail, FiEye } from "react-icons/fi";
import DashboardLayout from "../../layouts/DashboardLayout";

export default function Patients() {
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState([]); // Initialized as empty
  const [loading, setLoading] = useState(true); // Added loading state
  const userName = localStorage.getItem("userName") || "Laboratory";

  useEffect(() => {
    // Yahan apni API call lagayein:
    // fetchPatients().then(data => { setPatients(data); setLoading(false); });

    // Filhal ke liye loading false kar rahe hain
    setLoading(false);
  }, []);

  const filteredPatients = patients.filter(
    (patient) =>
      patient.name.toLowerCase().includes(search.toLowerCase()) ||
      patient.email.toLowerCase().includes(search.toLowerCase()) ||
      patient.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout role="LABORATORY" user={{ name: userName }}>
      <div className="animate-in fade-in duration-700">
        {/* HEADER */}
        <div className="mb-10">
          <h1 className="text-3xl font-black uppercase tracking-tight text-[var(--text-main)]">
            Laboratory Patients
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] mt-2">
            Manage Patient Records
          </p>
        </div>

        {/* SEARCH */}
        <div className="glass-panel p-5 mb-8">
          <div className="relative">
            <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search patient..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] py-4 pl-14 pr-5 outline-none"
            />
          </div>
        </div>

        {/* PATIENT TABLE */}
        <div className="glass-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--bg-card)] border-b border-[var(--border)]">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] uppercase tracking-widest">
                    Patient
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] uppercase tracking-widest">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] uppercase tracking-widest">
                    Phone
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] uppercase tracking-widest">
                    Gender
                  </th>
                  <th className="px-6 py-4 text-right text-[10px] uppercase tracking-widest">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-6 py-10 text-center text-sm text-[var(--text-muted)]"
                    >
                      Loading...
                    </td>
                  </tr>
                ) : filteredPatients.length > 0 ? (
                  filteredPatients.map((patient, index) => (
                    <tr
                      key={index}
                      className="border-b border-[var(--border)] hover:bg-[var(--bg-card)] transition-all"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-[var(--brand-purple)]/10 text-[var(--brand-purple)] flex items-center justify-center">
                            <FiUser />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-[var(--text-main)]">
                              {patient.name}
                            </p>
                            <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                              {patient.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 text-sm">
                          <FiMail className="text-[var(--text-muted)]" />
                          {patient.email}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 text-sm">
                          <FiPhone className="text-[var(--text-muted)]" />
                          {patient.phone}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm">{patient.gender}</td>
                      <td className="px-6 py-5 text-right">
                        <button className="bg-[var(--brand-purple)] text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all inline-flex items-center gap-2">
                          <FiEye /> View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-6 py-10 text-center text-sm text-[var(--text-muted)]"
                    >
                      No patients found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
