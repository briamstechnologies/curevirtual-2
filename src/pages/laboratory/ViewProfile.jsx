// FILE: src/pages/laboratory/ViewProfile.jsx

import {
  FiMail,
  FiPhone,
  FiMapPin,
  FiUser,
  FiAward,
  FiCheckCircle,
} from "react-icons/fi";
import DashboardLayout from "../../layouts/DashboardLayout";

export default function ViewProfile() {
  const laboratory = {
    name:
      localStorage.getItem("userName") ||
      "CureVirtual Laboratory",

    email:
      localStorage.getItem("email") ||
      "lab@example.com",

    phone: "+92 300 1234567",

    address: "Lahore, Pakistan",

    description:
      "Professional diagnostic laboratory providing high-quality medical testing services with accurate and timely reports.",

    joined: "January 2026",

    status: "Verified",
  };

  return (
    <DashboardLayout role="LABORATORY">
      <div className="animate-in fade-in duration-700">

      {/* HEADER */}
      <div className="mb-10">
        <h1 className="text-3xl font-black uppercase tracking-tight text-[var(--text-main)]">
          Laboratory Profile
        </h1>

        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] mt-2">
          View Laboratory Information
        </p>
      </div>

      {/* PROFILE CARD */}
      <div className="glass-panel p-8 max-w-5xl">

        {/* TOP */}
        <div className="flex flex-col md:flex-row md:items-center gap-6 mb-10">

          {/* AVATAR */}
          <div className="w-28 h-28 rounded-3xl bg-gradient-to-r from-[var(--brand-purple)] to-[var(--brand-blue)] flex items-center justify-center text-white text-5xl shadow-xl">
            <FiUser />
          </div>

          {/* INFO */}
          <div className="flex-1">

            <div className="flex flex-wrap items-center gap-3 mb-3">
              <h2 className="text-3xl font-black text-[var(--text-main)]">
                {laboratory.name}
              </h2>

              <span className="bg-green-500/10 text-green-500 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <FiCheckCircle />
                {laboratory.status}
              </span>
            </div>

            <p className="text-sm text-[var(--text-muted)] max-w-2xl leading-relaxed">
              {laboratory.description}
            </p>
          </div>
        </div>

        {/* DETAILS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* EMAIL */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-6 flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[var(--brand-blue)]/10 text-[var(--brand-blue)] flex items-center justify-center text-xl">
              <FiMail />
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                Email Address
              </p>

              <h3 className="font-bold text-sm text-[var(--text-main)]">
                {laboratory.email}
              </h3>
            </div>
          </div>

          {/* PHONE */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-6 flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[var(--brand-green)]/10 text-[var(--brand-green)] flex items-center justify-center text-xl">
              <FiPhone />
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                Phone Number
              </p>

              <h3 className="font-bold text-sm text-[var(--text-main)]">
                {laboratory.phone}
              </h3>
            </div>
          </div>

          {/* ADDRESS */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-6 flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[var(--brand-orange)]/10 text-[var(--brand-orange)] flex items-center justify-center text-xl">
              <FiMapPin />
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                Address
              </p>

              <h3 className="font-bold text-sm text-[var(--text-main)]">
                {laboratory.address}
              </h3>
            </div>
          </div>

          {/* JOINED */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-6 flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[var(--brand-purple)]/10 text-[var(--brand-purple)] flex items-center justify-center text-xl">
              <FiAward />
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                Member Since
              </p>

              <h3 className="font-bold text-sm text-[var(--text-main)]">
                {laboratory.joined}
              </h3>
            </div>
          </div>

        </div>
      </div>
    </div>
  </DashboardLayout>
  );
}