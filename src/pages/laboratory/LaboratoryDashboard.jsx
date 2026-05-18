import { useState } from "react";
import { FiActivity, FiUsers, FiFileText, FiDollarSign, FiClock, FiUploadCloud, FiCheckCircle } from "react-icons/fi";
import { Link } from "react-router-dom";

export default function LaboratoryDashboard() {
  const labName = localStorage.getItem("userName") || "CureVirtual Lab";

  // Dummy data for demonstration
  const stats = [
    { label: "Pending Tests", value: "12", icon: <FiClock />, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Reports Uploaded", value: "148", icon: <FiCheckCircle />, color: "text-[var(--brand-green)]", bg: "bg-[var(--brand-green)]/10" },
    { label: "Total Patients", value: "320", icon: <FiUsers />, color: "text-[var(--brand-blue)]", bg: "bg-[var(--brand-blue)]/10" },
    { label: "Earnings", value: "$4,250", icon: <FiDollarSign />, color: "text-[var(--brand-purple)]", bg: "bg-[var(--brand-purple)]/10" },
  ];

  const pendingRequests = [
    { id: "REQ-001", patient: "Ali Khan", test: "Complete Blood Count (CBC)", date: "Today, 10:30 AM", status: "Sample Collected" },
    { id: "REQ-002", patient: "Sara Ahmed", test: "Lipid Profile", date: "Today, 11:15 AM", status: "Awaiting Sample" },
    { id: "REQ-003", patient: "Zainab Raza", test: "HbA1c", date: "Yesterday", status: "Processing" },
  ];

  return (
    <div className="p-6 md:p-10 min-h-screen bg-[var(--bg-main)] animate-in fade-in duration-700">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--text-main)] uppercase tracking-tighter">
            Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand-purple)] to-[var(--brand-blue)]">{labName}</span>
          </h1>
          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] mt-1">
            Laboratory Command Center
          </p>
        </div>
        <button className="btn btn-primary bg-gradient-to-r from-[var(--brand-purple)] to-[var(--brand-blue)] border-none shadow-lg shadow-[var(--brand-purple)]/20 text-[10px]">
          <FiActivity className="mr-2 text-sm" /> VIEW ALL TESTS
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {stats.map((stat, i) => (
          <div key={i} className="glass-panel p-6 flex items-center gap-5 hover:-translate-y-1 transition-transform cursor-pointer">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${stat.bg} ${stat.color} shadow-inner`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{stat.label}</p>
              <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tighter">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Pending Test Requests Table */}
        <div className="lg:col-span-2 glass-panel p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-black text-[var(--text-main)] uppercase tracking-tight flex items-center gap-2">
              <FiFileText className="text-[var(--brand-purple)]" /> Pending Test Requests
            </h2>
            <Link to="#" className="text-[10px] font-black text-[var(--brand-purple)] uppercase tracking-widest hover:underline">
              View All
            </Link>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="pb-3 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Patient</th>
                  <th className="pb-3 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Test Type</th>
                  <th className="pb-3 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Status</th>
                  <th className="pb-3 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.map((req, i) => (
                  <tr key={i} className="border-b border-[var(--border)]/50 hover:bg-[var(--bg-card)] transition-colors group">
                    <td className="py-4">
                      <p className="text-sm font-bold text-[var(--text-main)]">{req.patient}</p>
                      <p className="text-[9px] text-[var(--text-muted)] font-black tracking-widest uppercase">{req.id}</p>
                    </td>
                    <td className="py-4 text-xs font-bold text-[var(--text-soft)]">{req.test}</td>
                    <td className="py-4">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                        req.status === "Sample Collected" ? "bg-blue-500/10 text-blue-500" : 
                        req.status === "Awaiting Sample" ? "bg-amber-500/10 text-amber-500" : 
                        "bg-purple-500/10 text-purple-500"
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <button className="text-[10px] font-black bg-[var(--brand-purple)] text-white px-4 py-2 rounded-xl hover:bg-[var(--brand-purple)]/80 transition-all flex items-center gap-2 ml-auto shadow-sm">
                        <FiUploadCloud /> Upload Result
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions / Notice Board */}
        <div className="space-y-6">
          <div className="glass-panel p-8 bg-gradient-to-br from-[var(--brand-purple)]/5 to-transparent border-[var(--brand-purple)]/20">
            <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-widest mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-main)] border border-[var(--border)] hover:border-[var(--brand-purple)] transition-all group">
                <span className="text-[10px] font-black text-[var(--text-soft)] uppercase tracking-widest group-hover:text-[var(--brand-purple)]">Register Walk-in Patient</span>
                <FiUsers className="text-[var(--text-muted)] group-hover:text-[var(--brand-purple)]" />
              </button>
              <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-main)] border border-[var(--border)] hover:border-[var(--brand-purple)] transition-all group">
                <span className="text-[10px] font-black text-[var(--text-soft)] uppercase tracking-widest group-hover:text-[var(--brand-purple)]">Update Test Pricing</span>
                <FiDollarSign className="text-[var(--text-muted)] group-hover:text-[var(--brand-purple)]" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}