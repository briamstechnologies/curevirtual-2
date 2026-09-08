// FILE: src/pages/shared/SubscribersList.jsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import api from '../../Lib/api';
import {
  FaEye,
  FaSearch,
  FaArrowLeft,
  FaArrowRight,
  FaEdit,
  FaTrash,
  FaTimes
} from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function SubscribersList({
  title = 'Subscribers',
  role = 'ADMIN',
  filterRole = 'DOCTOR',
  initialPlan = '',
}) {
  const userName =
    localStorage.getItem('userName') || localStorage.getItem('name') || role;

  const [q, setQ] = useState('');
  const [plan, setPlan] = useState(initialPlan);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );

  const [view, setView] = useState(null);
  const [err, setErr] = useState('');

  // Edit Subscription State
  const [editingSub, setEditingSub] = useState(null);
  const [editPlanId, setEditPlanId] = useState('');
  const [editExpiresAt, setEditExpiresAt] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [availablePlans, setAvailablePlans] = useState([]);
  const [deletingSubId, setDeletingSubId] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setErr('');
      const res = await api.get('/subscribers/list', {
        params: {
          role: filterRole || undefined,
          plan: plan || undefined,
          status: status || undefined,
          q: q || undefined,
          page,
          pageSize,
        },
      });
      const data = res.data?.data || {};
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      setErr('Failed to load clinical subscription registry.');
    } finally {
      setLoading(false);
    }
  }, [filterRole, plan, status, q, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [plan, status, q]);

  useEffect(() => {
    load();
  }, [load]);

  // Load available plans for editing
  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await api.get(`/subscriptions/plans?module=${filterRole.toLowerCase()}`);
        setAvailablePlans(res.data?.plans || []);
      } catch (e) {
        console.error("Error loading plans:", e);
      }
    }
    fetchPlans();
  }, [filterRole]);

  const toggleStatus = async (subscriptionId, next) => {
    try {
      await api.patch(`/subscribers/${subscriptionId}/status`, {
        status: next,
      });
      toast.success(`Subscription status updated to ${next}`);
      load();
    } catch (e) {
      toast.error('Failed to update subscription status.');
    }
  };

  const handleEditOpen = (item) => {
    if (!item.sub) {
      toast.error("No active subscription to edit.");
      return;
    }
    setEditingSub(item);
    setEditPlanId(item.sub.planId || '');
    setEditExpiresAt(item.sub.endDate ? new Date(item.sub.endDate).toISOString().slice(0, 16) : '');
    setEditStatus(item.sub.status || '');
  };

  const handleEditSave = async () => {
    try {
      await api.put(`/subscribers/${editingSub.sub.id}`, {
        planId: editPlanId,
        expiresAt: editExpiresAt ? new Date(editExpiresAt) : null,
        status: editStatus
      });
      toast.success("Subscription updated successfully!");
      setEditingSub(null);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to update subscription.");
    }
  };

  const handleDeleteSub = (subId) => {
    setDeletingSubId(subId);
  };

  const confirmDeleteSub = async () => {
    try {
      await api.delete(`/subscribers/${deletingSubId}`);
      toast.success("Subscription record deleted successfully.");
      setDeletingSubId(null);
      load();
    } catch (e) {
      toast.error("Failed to delete subscription.");
    }
  };

  return (
    <DashboardLayout role={role} user={{ name: userName }}>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-[10px] font-black text-[var(--brand-blue)] uppercase tracking-[0.3em] mb-1">
              Subscription Management
            </h2>
            <h1 className="text-3xl font-black text-[var(--text-main)] tracking-tighter uppercase">
              {title}
            </h1>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[2rem] p-6 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative group">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--brand-blue)] transition-all" />
              <input
                type="text"
                placeholder="Identity Search..."
                className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-3 pl-12 pr-6 text-xs font-bold focus:border-[var(--brand-blue)] outline-none"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <select
              className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-3 px-4 text-xs font-bold focus:border-[var(--brand-blue)] outline-none"
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
            >
              <option value="">All Plans</option>
              <option value="MONTHLY">Monthly Billing</option>
              <option value="YEARLY">Yearly Billing</option>
            </select>
            <select
              className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-3 px-4 text-xs font-bold focus:border-[var(--brand-blue)] outline-none"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">System Active</option>
              <option value="EXPIRED">Terminated</option>
              <option value="DEACTIVATED">Suspended</option>
              <option value="PENDING">Pending Auth</option>
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => load()}
                className="btn btn-secondary !py-3 !px-4 !text-[10px] flex-1"
              >
                Apply Protocol
              </button>
              <button
                onClick={() => {
                  setQ('');
                  setPlan('');
                  setStatus('');
                  setPage(1);
                }}
                className="btn btn-glass !py-3 !px-4 !text-[10px]"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {err && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></div>
            <p className="text-red-500 text-[10px] font-black uppercase tracking-widest">
              {err}
            </p>
          </div>
        )}

        <div className="card !p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--bg-main)]/50 border-b border-[var(--border)]">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                    Subject
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                    Encrypted Hub
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                    System Role
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                    Billing Plan
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                    Protocol Status
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center">
                    Operations
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {loading ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-6 py-12 text-center text-sm font-bold text-[var(--text-soft)] animate-pulse"
                    >
                      Syncing Subscriber DB...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-8 py-12 text-center font-bold text-[var(--text-soft)] uppercase tracking-widest text-xs"
                    >
                      No subscribers found in registry.
                    </td>
                  </tr>
                ) : (
                  items.map((it) => {
                    const sub = it.sub;
                    const canSuspend = sub && sub.status === 'ACTIVE';
                    const canActivate =
                      sub &&
                      (sub.status === 'DEACTIVATED' ||
                        sub.status === 'EXPIRED');
                    return (
                      <tr
                        key={it.id}
                        className="hover:bg-[var(--bg-main)]/30 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm font-black text-[var(--text-main)]">
                          {it.name}
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-[var(--text-soft)]">
                          {it.email}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 rounded-full bg-[var(--bg-main)]/50 border border-[var(--border)] text-[9px] font-black uppercase tracking-widest text-[var(--text-soft)]">
                            {it.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-mono font-bold text-[var(--brand-blue)]">
                          {sub?.plan || '—'}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                              sub?.status === 'ACTIVE'
                                ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                                : sub?.status === 'DEACTIVATED'
                                ? 'bg-red-500/20 text-red-500 border border-red-500/30'
                                : 'bg-orange-500/20 text-orange-500 border border-orange-500/30'
                            }`}
                          >
                            {sub?.status || 'NO_SUB'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-3">
                            <button
                              title="Inspect Identity"
                              className="p-2 rounded-xl bg-[var(--brand-blue)]/10 text-[var(--brand-blue)] hover:bg-[var(--brand-blue)] hover:text-white transition-all shadow-sm"
                              onClick={() => setView(it)}
                            >
                              <FaEye size={12} />
                            </button>
                            {sub && (
                              <>
                                <button
                                  title="Edit Dates / Plan"
                                  className="p-2 rounded-xl bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-white transition-all shadow-sm"
                                  onClick={() => handleEditOpen(it)}
                                >
                                  <FaEdit size={12} />
                                </button>
                                <button
                                  title="Delete Subscription"
                                  className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                  onClick={() => handleDeleteSub(sub.id)}
                                >
                                  <FaTrash size={12} />
                                </button>
                              </>
                            )}
                            {canSuspend && (
                              <button
                                className="btn !py-1.5 !px-3 !text-[9px] bg-red-600 !rounded-xl"
                                onClick={() =>
                                  toggleStatus(sub.id, 'DEACTIVATED')
                                }
                              >
                                Suspend
                              </button>
                            )}
                            {canActivate && (
                              <button
                                className="btn !py-1.5 !px-3 !text-[9px] bg-[var(--brand-green)] !rounded-xl"
                                onClick={() => toggleStatus(sub.id, 'ACTIVE')}
                              >
                                Restore
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-[var(--bg-main)]/50 px-6 py-4 border-t border-[var(--border)] flex justify-between items-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
              Protocol Page {page} / {totalPages} — Total Subjects: {total}
            </p>
            <div className="flex gap-2">
              <button
                className="p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] disabled:opacity-20 hover:text-[var(--text-main)] transition-all"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <FaArrowLeft size={12} />
              </button>
              <button
                className="p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] disabled:opacity-20 hover:text-[var(--text-main)] transition-all"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <FaArrowRight size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Inspect View Modal */}
      {view && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tighter uppercase mb-6 flex items-center gap-3">
              Subscriber Details
            </h2>
            <div className="space-y-4 mb-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">
                    Legal Name
                  </p>
                  <p className="text-sm font-bold text-[var(--text-main)]">
                    {view.name}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">
                    System Role
                  </p>
                  <p className="text-sm font-bold text-[var(--brand-green)]">
                    {view.role}
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">
                  Email Identity
                </p>
                <p className="text-sm font-bold text-[var(--text-main)]">
                  {view.email}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-[var(--border)] pt-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">
                    Service Plan
                  </p>
                  <p className="text-sm font-black text-[var(--brand-blue)]">
                    {view.sub?.plan || 'NONE'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">
                    Status
                  </p>
                  <p className="text-sm font-black text-[var(--text-main)]">
                    {view.sub?.status || 'OFFLINE'}
                  </p>
                </div>
              </div>
              {view.sub?.startDate && (
                <div className="grid grid-cols-2 gap-4 border-t border-[var(--border)] pt-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">
                      Start Date
                    </p>
                    <p className="text-xs text-[var(--text-soft)]">
                      {new Date(view.sub.startDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">
                      Expiry Date & Time
                    </p>
                    <p className="text-xs text-[var(--text-soft)]">
                      {new Date(view.sub.endDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => setView(null)}
              className="w-full py-3 bg-[var(--brand-blue)] hover:bg-blue-600 text-white rounded-xl font-bold shadow-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Edit Subscription Modal */}
      {editingSub && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-[var(--text-main)] tracking-tight uppercase">
                Modify Subscription
              </h2>
              <button onClick={() => setEditingSub(null)} className="text-[var(--text-muted)] hover:text-red-500">
                <FaTimes size={16} />
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--text-soft)] mb-2">Subscriber</label>
                <p className="text-sm font-bold">{editingSub.name} ({editingSub.email})</p>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--text-soft)] mb-2">Change Plan Tier</label>
                <select 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-3 px-4 text-xs font-bold outline-none focus:border-[var(--brand-blue)]"
                  value={editPlanId}
                  onChange={(e) => setEditPlanId(e.target.value)}
                >
                  {availablePlans.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (GHS {p.priceGHS})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--text-soft)] mb-2">Expiry Date & Time</label>
                <input 
                  type="datetime-local"
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-3 px-4 text-xs font-bold outline-none focus:border-[var(--brand-blue)]"
                  value={editExpiresAt}
                  onChange={(e) => setEditExpiresAt(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--text-soft)] mb-2">Status</label>
                <select 
                  className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-2xl py-3 px-4 text-xs font-bold outline-none focus:border-[var(--brand-blue)]"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                >
                  <option value="ACTIVE">ACTIVE (Restore Access)</option>
                  <option value="DEACTIVATED">DEACTIVATED (Suspend Access)</option>
                  <option value="EXPIRED">EXPIRED (Terminated)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setEditingSub(null)}
                className="flex-1 py-3 bg-[var(--border)] hover:bg-[var(--border)]/80 text-[var(--text-soft)] rounded-xl font-bold transition-all text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold transition-all text-xs shadow-lg"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Confirm Delete Modal */}
      {deletingSubId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[var(--bg-card)] border border-red-500/20 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black text-[var(--text-main)] mb-2 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
              Delete Subscription?
            </h3>
            <p className="text-xs text-[var(--text-soft)] mb-6 leading-relaxed">
              This action cannot be undone. The subscriber will immediately lose all plan benefits and features.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingSubId(null)}
                className="flex-1 py-2.5 bg-[var(--border)] hover:bg-[var(--border)]/80 text-[var(--text-soft)] rounded-xl font-bold transition-all text-xs"
              >
                Keep Active
              </button>
              <button
                onClick={confirmDeleteSub}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all text-xs shadow-lg"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="top-right" autoClose={2000} />
    </DashboardLayout>
  );
}
