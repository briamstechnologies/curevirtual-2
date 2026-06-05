  // // FILE: src/pages/admin/ManageUsers.jsx
  // import { useEffect, useState, useCallback } from "react";
  // import {
  //   FaEye,
  //   FaEdit,
  //   FaTrash,
  //   FaPause,
  //   FaPlus,
  //   FaTimes,
  //   FaUserShield,
  //   FaSearch,
  //   FaShieldAlt,
  // } from "react-icons/fa";
  // import DashboardLayout from "../../layouts/DashboardLayout";
  // import api from "../../Lib/api";
  // import { ToastContainer, toast } from "react-toastify";
  // import "react-toastify/dist/ReactToastify.css";

  // export default function ManageUsers() {
  //   const [users, setUsers] = useState([]);
  //   const [loading, setLoading] = useState(false);
  //   const [selectedUser, setSelectedUser] = useState(null);
  //   const [showCreateModal, setShowCreateModal] = useState(false);
  //   const [showEditModal, setShowEditModal] = useState(false);
  //   const [showProfileModal, setShowProfileModal] = useState(false);
  //   const [search, setSearch] = useState("");

  //   const [newUser, setNewUser] = useState({
  //     name: "",
  //     email: "",
  //     role: "SUPPORT",
  //   });

  //   const role = localStorage.getItem("role");
  //   const userName = localStorage.getItem("userName") || localStorage.getItem("name") || "Admin";

  //   const fetchUsers = useCallback(async () => {
  //     setLoading(true);
  //     try {
  //       const res = await api.get("/admin/users");
  //       const usersData = Array.isArray(res.data) ? res.data : res.data?.data || [];
  //       setUsers(usersData);
  //     } catch (err) {
  //       toast.error("Database Link Failure: Could not sync user registry.");
  //     } finally {
  //       setLoading(false);
  //     }
  //   }, []);

  //   useEffect(() => {
  //     fetchUsers();
  //   }, [fetchUsers]);

  //   const handleCreateUser = async (e) => {
  //     e.preventDefault();
  //     try {
  //       await api.post("/admin/users", newUser);
  //       toast.success("Identity Provisioned Successfully.");
  //       setShowCreateModal(false);
  //       setNewUser({ name: "", email: "", role: "SUPPORT" });
  //       fetchUsers();
  //     } catch (err) {
  //       toast.error("Provisioning Protocol Failed.");
  //     }
  //   };

  //   const handleSuspendUser = async (id) => {
  //     if (!window.confirm("Authorize Protocol: Revoke access for this identity?")) return;
  //     try {
  //       await api.patch(`/admin/users/${id}/suspend`);
  //       toast.warning("Identity Status: RESTRICTED.");
  //       fetchUsers();
  //     } catch (err) {
  //       toast.error("Suspension Overload: Protocol Aborted.");
  //     }
  //   };

  //   const handleDeleteUser = async (id) => {
  //     if (
  //       !window.confirm("⚠️ IRREVERSIBLE ACTION: Permanently purge this identity from central core?")
  //     )
  //       return;
  //     try {
  //       await api.delete(`/admin/users/${id}`);
  //       toast.info("Identity Purged Successfully.");
  //       fetchUsers();
  //     } catch (err) {
  //       toast.error("Purge Protocol Failure.");
  //     }
  //   };

  //   const handleUpdateUser = async (e) => {
  //     e.preventDefault();
  //     try {
  //       await api.put(`/admin/users/${selectedUser.id}`, selectedUser);
  //       toast.success("Identity Updates Synchronized.");
  //       setShowEditModal(false);
  //       fetchUsers();
  //     } catch (err) {
  //       toast.error("Synchronization Error.");
  //     }
  //   };

  //   const filteredUsers = users.filter(
  //     (u) =>
  //       u.name?.toLowerCase().includes(search.toLowerCase()) ||
  //       u.email?.toLowerCase().includes(search.toLowerCase())
  //   );

  //   return (
  //     <DashboardLayout role={role} user={{ name: userName }}>
  //       <div className="space-y-10 animate-in fade-in duration-700">
  //         <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
  //           <div>
  //             <h2 className="text-[10px] font-black text-[var(--brand-green)] uppercase tracking-[0.4em] mb-1">
  //               Internal Registry
  //             </h2>
  //             <h1 className="text-4xl font-black text-[var(--text-main)] tracking-tighter uppercase flex items-center gap-4">
  //               <FaShieldAlt className="text-[var(--brand-green)]" /> Personnel Data
  //             </h1>
  //           </div>
  //           <button
  //             onClick={() => setShowCreateModal(true)}
  //             className="btn btn-primary px-8 py-4 shadow-lg shadow-[var(--brand-green)]/20 flex items-center gap-3 border-[var(--brand-green)] bg-[var(--brand-green)] hover:bg-green-700"
  //           >
  //             <FaPlus /> Initialize Identity
  //           </button>
  //         </div>

  //         <div className="relative">
  //           <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
  //           <input
  //             type="text"
  //             placeholder="Search Personnel Registry..."
  //             value={search}
  //             onChange={(e) => setSearch(e.target.value)}
  //             className="w-full pl-12 pr-4 py-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl text-xs font-bold text-[var(--text-main)] focus:border-[var(--brand-green)] outline-none transition-all shadow-sm"
  //           />
  //         </div>

  //         <div className="card !p-0 overflow-hidden border border-[var(--border)] shadow-xl">
  //           <div className="overflow-x-auto">
  //             <table className="w-full text-left border-collapse">
  //               <thead>
  //                 <tr className="bg-[var(--bg-main)]/50 border-b border-[var(--border)]">
  //                   <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
  //                     Subject Name
  //                   </th>
  //                   <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
  //                     Uplink Gateway
  //                   </th>
  //                   <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
  //                     Authorization
  //                   </th>
  //                   <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
  //                     Protocol Status
  //                   </th>
  //                   <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center">
  //                     Operations
  //                   </th>
  //                 </tr>
  //               </thead>
  //               <tbody className="divide-y divide-[var(--border)]">
  //                 {loading ? (
  //                   <tr>
  //                     <td
  //                       colSpan="5"
  //                       className="px-8 py-12 text-center text-sm font-bold text-[var(--text-soft)] animate-pulse uppercase tracking-[0.2em]"
  //                     >
  //                       Syncing Central Directory...
  //                     </td>
  //                   </tr>
  //                 ) : filteredUsers.length === 0 ? (
  //                   <tr>
  //                     <td
  //                       colSpan="5"
  //                       className="px-8 py-12 text-center text-sm font-bold text-[var(--text-soft)] uppercase tracking-[0.2em]"
  //                     >
  //                       No Synchronized Identities.
  //                     </td>
  //                   </tr>
  //                 ) : (
  //                   filteredUsers.map((u) => (
  //                     <tr key={u.id} className="hover:bg-[var(--bg-main)]/30 transition-colors group">
  //                       <td className="px-8 py-5 text-sm font-black text-[var(--text-main)] uppercase tracking-tight">
  //                         {u.name}
  //                       </td>
  //                       <td className="px-8 py-5 text-xs font-bold text-[var(--text-soft)]">
  //                         {u.email}
  //                       </td>
  //                       <td className="px-8 py-5">
  //                         <span className="px-3 py-1 rounded-full bg-[var(--bg-main)] border border-[var(--border)] text-[9px] font-black uppercase tracking-widest text-[var(--brand-green)]">
  //                           {u.role}
  //                         </span>
  //                       </td>
  //                       <td className="px-8 py-5">
  //                         <span
  //                           className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
  //                             u.isSuspended
  //                               ? "bg-red-500/10 text-red-500 border border-red-500/20"
  //                               : "bg-green-500/10 text-green-500 border border-green-500/20"
  //                           }`}
  //                         >
  //                           {u.isSuspended ? "RESTRICTED" : "AUTHORIZED"}
  //                         </span>
  //                       </td>
  //                       <td className="px-8 py-5 text-center">
  //                         <div className="flex justify-center gap-3">
  //                           <button
  //                             onClick={() => {
  //                               setSelectedUser(u);
  //                               setShowProfileModal(true);
  //                             }}
  //                             className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-[var(--text-main)] transition-all shadow-sm"
  //                           >
  //                             <FaEye size={14} />
  //                           </button>
  //                           <button
  //                             onClick={() => {
  //                               setSelectedUser(u);
  //                               setShowEditModal(true);
  //                             }}
  //                             className="p-2.5 rounded-xl bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-[var(--text-main)] transition-all shadow-sm"
  //                           >
  //                             <FaEdit size={14} />
  //                           </button>
  //                           <button
  //                             onClick={() => handleSuspendUser(u.id)}
  //                             className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-[var(--text-main)] transition-all shadow-sm"
  //                             title="Suspend"
  //                           >
  //                             <FaPause size={14} />
  //                           </button>
  //                           <button
  //                             onClick={() => handleDeleteUser(u.id)}
  //                             className="p-2.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-[var(--text-main)] transition-all shadow-sm"
  //                             title="Delete"
  //                           >
  //                             <FaTrash size={14} />
  //                           </button>
  //                         </div>
  //                       </td>
  //                     </tr>
  //                   ))
  //                 )}
  //               </tbody>
  //             </table>
  //           </div>
  //         </div>
  //       </div>

  //       {/* Modals */}
  //       {(showCreateModal || showEditModal || showProfileModal) && (
  //         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
  //           <div
  //             className="absolute inset-0 bg-[var(--bg-main)]/90 backdrop-blur-md"
  //             onClick={() => {
  //               setShowCreateModal(false);
  //               setShowEditModal(null);
  //               setShowProfileModal(false);
  //             }}
  //           ></div>
  //           <div className="relative w-full max-w-lg glass !p-10 animate-in zoom-in-95 duration-300">
  //             {showCreateModal && (
  //               <>
  //                 <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tighter uppercase mb-8">
  //                   Initialize Identity
  //                 </h3>
  //                 <form onSubmit={handleCreateUser} className="space-y-6">
  //                   <UserForm newUser={newUser} setNewUser={setNewUser} />
  //                   <div className="flex gap-4 pt-6">
  //                     <button
  //                       type="button"
  //                       onClick={() => setShowCreateModal(false)}
  //                       className="btn flex-1 bg-[var(--bg-main)] border border-[var(--border)] text-[var(--text-soft)]"
  //                     >
  //                       Cancel
  //                     </button>
  //                     <button
  //                       type="submit"
  //                       className="btn btn-primary flex-[2] bg-[var(--brand-green)] border-[var(--brand-green)]"
  //                     >
  //                       Authorize Identity
  //                     </button>
  //                   </div>
  //                 </form>
  //               </>
  //             )}

  //             {showEditModal && selectedUser && (
  //               <>
  //                 <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tighter uppercase mb-8">
  //                   Refine Identity
  //                 </h3>
  //                 <form onSubmit={handleUpdateUser} className="space-y-6">
  //                   <UserForm newUser={selectedUser} setNewUser={setSelectedUser} />
  //                   <div className="flex gap-4 pt-6">
  //                     <button
  //                       type="button"
  //                       onClick={() => setShowEditModal(false)}
  //                       className="btn flex-1 bg-[var(--bg-main)] border border-[var(--border)] text-[var(--text-soft)]"
  //                     >
  //                       Cancel
  //                     </button>
  //                     <button
  //                       type="submit"
  //                       className="btn btn-primary flex-[2] bg-[var(--brand-green)] border-[var(--brand-green)]"
  //                     >
  //                       Sync Overrides
  //                     </button>
  //                   </div>
  //                 </form>
  //               </>
  //             )}

  //             {showProfileModal && selectedUser && (
  //               <>
  //                 <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tighter uppercase mb-6">
  //                   Identity Vault
  //                 </h3>
  //                 <div className="space-y-6 mb-10">
  //                   <div className="grid grid-cols-2 gap-6 pb-6 border-b border-[var(--border)]">
  //                     <div>
  //                       <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">
  //                         Clearance
  //                       </p>
  //                       <p className="text-sm font-black text-[var(--brand-green)]">
  //                         {selectedUser.role}
  //                       </p>
  //                     </div>
  //                     <div>
  //                       <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">
  //                         Protocol Status
  //                       </p>
  //                       <p className="text-sm font-black text-[var(--text-main)]">
  //                         {selectedUser.isSuspended ? "RESTRICTED" : "AUTHORIZED"}
  //                       </p>
  //                     </div>
  //                   </div>
  //                   <div className="space-y-1">
  //                     <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">
  //                       Full Identity
  //                     </p>
  //                     <p className="text-lg font-black text-[var(--text-main)] uppercase tracking-tight">
  //                       {selectedUser.name}
  //                     </p>
  //                   </div>
  //                   <div className="space-y-1">
  //                     <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">
  //                       Uplink Gateway
  //                     </p>
  //                     <p className="text-sm font-black text-[var(--text-soft)]">
  //                       {selectedUser.email}
  //                     </p>
  //                   </div>
  //                 </div>
  //                 <button
  //                   onClick={() => setShowProfileModal(false)}
  //                   className="btn btn-primary w-full shadow-lg bg-[var(--brand-green)] border-[var(--brand-green)]"
  //                 >
  //                   Close Vault
  //                 </button>
  //               </>
  //             )}
  //           </div>
  //         </div>
  //       )}
  //       <ToastContainer position="top-right" autoClose={2200} />
  //     </DashboardLayout>
  //   );
  // }

  // function UserForm({ newUser, setNewUser }) {
  //   return (
  //     <>
  //       <div className="space-y-1.5">
  //         <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">
  //           Identity Name
  //         </label>
  //         <input
  //           type="text"
  //           value={newUser.name}
  //           onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
  //           className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-4 px-5 text-sm font-bold text-[var(--text-main)] focus:border-[var(--brand-green)] outline-none"
  //           required
  //         />
  //       </div>
  //       <div className="space-y-1.5">
  //         <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">
  //           Uplink Email
  //         </label>
  //         <input
  //           type="email"
  //           value={newUser.email}
  //           onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
  //           className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-4 px-5 text-sm font-bold text-[var(--text-main)] focus:border-[var(--brand-green)] outline-none"
  //           required
  //         />
  //       </div>
  //       <div className="space-y-1.5">
  //         <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">
  //           Authorization Tier
  //         </label>
  //         <select
  //           value={newUser.role}
  //           onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
  //           className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-4 px-5 text-sm font-black text-black focus:border-[var(--brand-green)] outline-none"
  //         >
  //           <option value="SUPPORT">SUPPORT</option>
  //           <option value="ADMIN">ADMIN</option>
  //         </select>
  //       </div>
  //     </>
  //   );
  // }


  // FILE: src/pages/admin/ManageUsers.jsx
import { useEffect, useState, useCallback } from "react";
import {
  FaEye, FaEdit, FaTrash, FaPause, FaPlus,
  FaUserShield, FaSearch, FaShieldAlt, FaLink,
} from "react-icons/fa";
import DashboardLayout from "../../layouts/DashboardLayout";
import api from "../../Lib/api";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showLinkPAModal, setShowLinkPAModal] = useState(false); // ✅ NEW
  const [selectedPA, setSelectedPA] = useState(null);            // ✅ NEW
  const [search, setSearch] = useState("");

  const [newUser, setNewUser] = useState({ name: "", email: "", role: "SUPPORT" });

  const role = localStorage.getItem("role");
  const userName = localStorage.getItem("userName") || localStorage.getItem("name") || "Admin";

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/users");
      const usersData = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setUsers(usersData);
    } catch (err) {
      toast.error("Database Link Failure: Could not sync user registry.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/users", newUser);
      toast.success("Identity Provisioned Successfully.");
      setShowCreateModal(false);
      setNewUser({ name: "", email: "", role: "SUPPORT" });
      fetchUsers();
    } catch (err) {
      toast.error("Provisioning Protocol Failed.");
    }
  };

  const handleSuspendUser = async (id) => {
    if (!window.confirm("Authorize Protocol: Revoke access for this identity?")) return;
    try {
      await api.patch(`/admin/users/${id}/suspend`);
      toast.warning("Identity Status: RESTRICTED.");
      fetchUsers();
    } catch (err) {
      toast.error("Suspension Overload: Protocol Aborted.");
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm("⚠️ IRREVERSIBLE ACTION: Permanently purge this identity from central core?")) return;
    try {
      await api.delete(`/admin/users/${id}`);
      toast.info("Identity Purged Successfully.");
      fetchUsers();
    } catch (err) {
      toast.error("Purge Protocol Failure.");
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/admin/users/${selectedUser.id}`, selectedUser);
      toast.success("Identity Updates Synchronized.");
      setShowEditModal(false);
      fetchUsers();
    } catch (err) {
      toast.error("Synchronization Error.");
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout role={role} user={{ name: userName }}>
      <div className="space-y-10 animate-in fade-in duration-700">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h2 className="text-[10px] font-black text-[var(--brand-green)] uppercase tracking-[0.4em] mb-1">
              Internal Registry
            </h2>
            <h1 className="text-4xl font-black text-[var(--text-main)] tracking-tighter uppercase flex items-center gap-4">
              <FaShieldAlt className="text-[var(--brand-green)]" /> Personnel Data
            </h1>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary px-8 py-4 shadow-lg shadow-[var(--brand-green)]/20 flex items-center gap-3 border-[var(--brand-green)] bg-[var(--brand-green)] hover:bg-green-700"
          >
            <FaPlus /> Initialize Identity
          </button>
        </div>

        <div className="relative">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search Personnel Registry..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl text-xs font-bold text-[var(--text-main)] focus:border-[var(--brand-green)] outline-none transition-all shadow-sm"
          />
        </div>

        <div className="card !p-0 overflow-hidden border border-[var(--border)] shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--bg-main)]/50 border-b border-[var(--border)]">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Subject Name</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Uplink Gateway</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Authorization</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Protocol Status</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-8 py-12 text-center text-sm font-bold text-[var(--text-soft)] animate-pulse uppercase tracking-[0.2em]">
                      Syncing Central Directory...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-8 py-12 text-center text-sm font-bold text-[var(--text-soft)] uppercase tracking-[0.2em]">
                      No Synchronized Identities.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-[var(--bg-main)]/30 transition-colors group">
                      <td className="px-8 py-5 text-sm font-black text-[var(--text-main)] uppercase tracking-tight">
                        {u.name}
                      </td>
                      <td className="px-8 py-5 text-xs font-bold text-[var(--text-soft)]">{u.email}</td>
                      <td className="px-8 py-5">
                        <span className="px-3 py-1 rounded-full bg-[var(--bg-main)] border border-[var(--border)] text-[9px] font-black uppercase tracking-widest text-[var(--brand-green)]">
                          {u.role}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          u.isSuspended
                            ? "bg-red-500/10 text-red-500 border border-red-500/20"
                            : "bg-green-500/10 text-green-500 border border-green-500/20"
                        }`}>
                          {u.isSuspended ? "RESTRICTED" : "AUTHORIZED"}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <div className="flex justify-center gap-3">
                          <button
                            onClick={() => { setSelectedUser(u); setShowProfileModal(true); }}
                            className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-all shadow-sm"
                            title="View"
                          >
                            <FaEye size={14} />
                          </button>
                          <button
                            onClick={() => { setSelectedUser(u); setShowEditModal(true); }}
                            className="p-2.5 rounded-xl bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-white transition-all shadow-sm"
                            title="Edit"
                          >
                            <FaEdit size={14} />
                          </button>

                          {/* ✅ PHYSICIAN_ASSISTANT ke liye Link PA button */}
                          {u.role === "PHYSICIAN_ASSISTANT" && (
                            <button
                              onClick={() => { setSelectedPA(u); setShowLinkPAModal(true); }}
                              className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500 hover:bg-purple-500 hover:text-white transition-all shadow-sm"
                              title="Link to Doctor"
                            >
                              <FaLink size={14} />
                            </button>
                          )}

                          <button
                            onClick={() => handleSuspendUser(u.id)}
                            className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white transition-all shadow-sm"
                            title="Suspend"
                          >
                            <FaPause size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-2.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                            title="Delete"
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
      </div>

      {/* ===================== MODALS ===================== */}
      {(showCreateModal || showEditModal || showProfileModal) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[var(--bg-main)]/90 backdrop-blur-md"
            onClick={() => { setShowCreateModal(false); setShowEditModal(false); setShowProfileModal(false); }}
          />
          <div className="relative w-full max-w-lg glass !p-10 animate-in zoom-in-95 duration-300">
            {showCreateModal && (
              <>
                <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tighter uppercase mb-8">Initialize Identity</h3>
                <form onSubmit={handleCreateUser} className="space-y-6">
                  <UserForm newUser={newUser} setNewUser={setNewUser} />
                  <div className="flex gap-4 pt-6">
                    <button type="button" onClick={() => setShowCreateModal(false)} className="btn flex-1 bg-[var(--bg-main)] border border-[var(--border)] text-[var(--text-soft)]">Cancel</button>
                    <button type="submit" className="btn btn-primary flex-[2] bg-[var(--brand-green)] border-[var(--brand-green)]">Authorize Identity</button>
                  </div>
                </form>
              </>
            )}

            {showEditModal && selectedUser && (
              <>
                <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tighter uppercase mb-8">Refine Identity</h3>
                <form onSubmit={handleUpdateUser} className="space-y-6">
                  <UserForm newUser={selectedUser} setNewUser={setSelectedUser} />
                  <div className="flex gap-4 pt-6">
                    <button type="button" onClick={() => setShowEditModal(false)} className="btn flex-1 bg-[var(--bg-main)] border border-[var(--border)] text-[var(--text-soft)]">Cancel</button>
                    <button type="submit" className="btn btn-primary flex-[2] bg-[var(--brand-green)] border-[var(--brand-green)]">Sync Overrides</button>
                  </div>
                </form>
              </>
            )}

            {showProfileModal && selectedUser && (
              <>
                <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tighter uppercase mb-6">Identity Vault</h3>
                <div className="space-y-6 mb-10">
                  <div className="grid grid-cols-2 gap-6 pb-6 border-b border-[var(--border)]">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Clearance</p>
                      <p className="text-sm font-black text-[var(--brand-green)]">{selectedUser.role}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Protocol Status</p>
                      <p className="text-sm font-black text-[var(--text-main)]">{selectedUser.isSuspended ? "RESTRICTED" : "AUTHORIZED"}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Full Identity</p>
                    <p className="text-lg font-black text-[var(--text-main)] uppercase tracking-tight">{selectedUser.name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Uplink Gateway</p>
                    <p className="text-sm font-black text-[var(--text-soft)]">{selectedUser.email}</p>
                  </div>
                </div>
                <button onClick={() => setShowProfileModal(false)} className="btn btn-primary w-full bg-[var(--brand-green)] border-[var(--brand-green)]">Close Vault</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ✅ PA LINK MODAL */}
      {showLinkPAModal && selectedPA && (
        <LinkPAModal
          pa={selectedPA}
          onClose={() => { setShowLinkPAModal(false); setSelectedPA(null); }}
          onSuccess={() => {
            setShowLinkPAModal(false);
            setSelectedPA(null);
            toast.success(`${selectedPA.name} successfully linked to doctor!`);
            fetchUsers();
          }}
        />
      )}

      <ToastContainer position="top-right" autoClose={2200} />
    </DashboardLayout>
  );
}

// ================================================================
// ✅ PA LINK MODAL COMPONENT
// ================================================================
function LinkPAModal({ pa, onClose, onSuccess }) {
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [linking, setLinking] = useState(false);
  const [searchDoc, setSearchDoc] = useState("");

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await api.get("/admin/doctors");
        setDoctors(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        toast.error("Doctors list load nahi ho saki");
      } finally {
        setLoadingDoctors(false);
      }
    };
    fetchDoctors();
  }, []);

  const handleLink = async () => {
    if (!selectedDoctorId) {
      toast.warning("Pehle ek doctor select karo");
      return;
    }
    setLinking(true);
    try {
      await api.post("/admin/assign-pa", {
        paId: pa.id,
        doctorId: selectedDoctorId,
      });
      onSuccess();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Link nahi ho saka");
    } finally {
      setLinking(false);
    }
  };

  const filteredDoctors = doctors.filter((d) =>
    `${d.user?.firstName} ${d.user?.lastName} ${d.user?.email}`
      .toLowerCase()
      .includes(searchDoc.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[var(--bg-main)]/90 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-md glass !p-8 animate-in zoom-in-95 duration-300">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-black text-[var(--text-main)] uppercase tracking-tight">
              Link PA to Doctor
            </h3>
            <p className="text-xs text-[var(--text-soft)] mt-1">
              PA: <span className="font-black text-purple-500">{pa.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[var(--bg-main)] hover:bg-red-500/10 text-[var(--text-soft)] hover:text-red-500 transition-all"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs" />
          <input
            type="text"
            placeholder="Doctor ka naam ya email search karo..."
            value={searchDoc}
            onChange={(e) => setSearchDoc(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl text-xs font-bold text-[var(--text-main)] focus:border-purple-500 outline-none transition-all"
          />
        </div>

        {/* Doctors List */}
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1 mb-6">
          {loadingDoctors ? (
            <p className="text-center text-xs text-[var(--text-soft)] py-8 animate-pulse uppercase tracking-widest">
              Loading Doctors...
            </p>
          ) : filteredDoctors.length === 0 ? (
            <p className="text-center text-xs text-[var(--text-soft)] py-8 uppercase tracking-widest">
              Koi doctor nahi mila
            </p>
          ) : (
            filteredDoctors.map((doc) => (
              <div
                key={doc.id}
                onClick={() => setSelectedDoctorId(doc.user?.id)}
                className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer border transition-all ${
                  selectedDoctorId === doc.user?.id
                    ? "border-purple-500 bg-purple-500/10"
                    : "border-[var(--border)] bg-[var(--bg-main)] hover:border-purple-500/50"
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-black text-sm">
                  {doc.user?.firstName?.[0] || "D"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-[var(--text-main)] truncate">
                    Dr. {doc.user?.firstName} {doc.user?.lastName}
                  </p>
                  <p className="text-[10px] text-[var(--text-soft)] truncate">{doc.user?.email}</p>
                  {doc.specialization && (
                    <p className="text-[9px] text-purple-500 font-bold uppercase tracking-wider">{doc.specialization}</p>
                  )}
                </div>
                {selectedDoctorId === doc.user?.id && (
                  <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-white text-[10px]">✓</div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="btn flex-1 bg-[var(--bg-main)] border border-[var(--border)] text-[var(--text-soft)] text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleLink}
            disabled={!selectedDoctorId || linking}
            className="btn flex-[2] bg-purple-600 border-purple-600 text-white font-black text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {linking ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><FaLink size={12} /> Link PA to Doctor</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function UserForm({ newUser, setNewUser }) {
  return (
    <>
      <div className="space-y-1.5">
        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Identity Name</label>
        <input
          type="text"
          value={newUser.name}
          onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
          className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-4 px-5 text-sm font-bold text-[var(--text-main)] focus:border-[var(--brand-green)] outline-none"
          required
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Uplink Email</label>
        <input
          type="email"
          value={newUser.email}
          onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
          className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-4 px-5 text-sm font-bold text-[var(--text-main)] focus:border-[var(--brand-green)] outline-none"
          required
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Authorization Tier</label>
        <select
          value={newUser.role}
          onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
          className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-4 px-5 text-sm font-black text-black focus:border-[var(--brand-green)] outline-none"
        >
          <option value="SUPPORT">SUPPORT</option>
          <option value="ADMIN">ADMIN</option>
          <option value="PHYSICIAN_ASSISTANT">PHYSICIAN ASSISTANT</option>
        </select>
      </div>
    </>
  );
}
