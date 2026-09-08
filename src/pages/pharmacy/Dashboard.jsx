import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../Lib/api';
import DashboardLayout from '../../layouts/DashboardLayout';
import { 
  FiPercent, 
  FiArrowRight, 
  FiShield, 
  FiFileText, 
  FiDollarSign, 
  FiTrendingUp, 
  FiCheckCircle, 
  FiClock 
} from 'react-icons/fi';

export default function PharmacyDashboard() {
  const navigate = useNavigate();
  const role = 'PHARMACY';
  const userId = localStorage.getItem('userId');
  const userName =
    localStorage.getItem('userName') ||
    localStorage.getItem('name') ||
    'Pharmacy';

  const [counts, setCounts] = useState({
    incoming: 0,
    ack: 0,
    ready: 0,
    dispensed: 0,
    totalPrescriptions: 0,
  });
  const [profile, setProfile] = useState(null);
  const [volumeTier, setVolumeTier] = useState({
    tierName: "Tier 1 (0–49 Orders)",
    commissionPct: 15,
    isSubscribed: false,
    nextTierMin: 50,
    ordersToNextTier: 50,
    progressPct: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [financials, setFinancials] = useState({
    grossEarningsGHS: 0,
    platformFeesGHS: 0,
    netEarningsGHS: 0
  });

  useEffect(() => {
    (async () => {
      try {
        const [resPrescriptions, resProfile, resStats] = await Promise.all([
          api.get('/pharmacy/prescriptions', { params: { userId } }).catch(() => ({ data: [] })),
          api.get('/pharmacy/profile', { params: { userId } }).catch(() => null),
          api.get('/pharmacy/stats', { params: { userId } }).catch(() => null)
        ]);

        const rawList = resPrescriptions.data?.data ?? resPrescriptions.data;
        const list = Array.isArray(rawList) ? rawList : [];

        const ack = list.filter(
          (x) => x && x.dispatchStatus === 'ACKNOWLEDGED'
        ).length;
        const ready = list.filter((x) => x && x.dispatchStatus === 'READY').length;
        const dispensed = list.filter(
          (x) => x && x.dispatchStatus === 'DISPENSED'
        ).length;
        const incoming = list.filter((x) =>
          x && ['NONE', 'SENT'].includes(String(x.dispatchStatus))
        ).length;

        setCounts({ incoming, ack, ready, dispensed, totalPrescriptions: list.length });
        
        if (resProfile?.data?.data) {
          setProfile(resProfile.data.data);
        }

        if (resStats?.data) {
          const s = resStats.data;
          if (s.volumeTier) setVolumeTier(s.volumeTier);
          if (Array.isArray(s.recentOrders)) setRecentOrders(s.recentOrders);
          setFinancials({
            grossEarningsGHS: Number(s.grossEarningsGHS) || 0,
            platformFeesGHS: Number(s.platformFeesGHS) || 0,
            netEarningsGHS: Number(s.netEarningsGHS) || 0
          });
        }
      } catch (e) {
        console.error('Failed to load pharmacy dashboard data:', e);
      }
    })();
  }, [userId]);

  const pharmacyId = profile?.referenceId || profile?.reference_id || `CV-PH-GH-2026-0001`;
  const statusLabel = profile?.verificationStatus === "VERIFIED" ? "Verified" : "Pending Verification";

  const realPharmacyName =
    profile?.displayName ||
    (profile?.user
      ? `${profile.user.firstName || ''} ${profile.user.lastName || ''}`.trim()
      : userName);

  const realLocation =
    [profile?.address, profile?.city, profile?.country].filter(Boolean).join(', ') ||
    'Location Not Provided';

  const realNodeStatus =
    profile?.verificationStatus === 'VERIFIED'
      ? 'Verified Node'
      : 'Pending Verification';

  return (
    <DashboardLayout role={role}>
      <div className="space-y-10 font-body">
        {/* Marketplace Fulfillment Header */}
        <section className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 bg-gradient-to-r from-emerald-500/10 via-sky-500/10 to-transparent p-6 rounded-3xl border border-[var(--border)]">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--text-main)] tracking-tighter uppercase italic">
              Pharmacy <span className="text-emerald-500 not-italic">Fulfillment Hub</span>
            </h1>
            <p className="text-[var(--text-soft)] text-sm md:text-base font-medium opacity-90 flex flex-wrap items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>warehouse</span>
              <span className="font-bold text-[var(--text-main)]">{realPharmacyName}</span>
              <span>•</span>
              <span>{realLocation}</span>
              <span>•</span>
              <span className="text-emerald-500 font-semibold">{realNodeStatus}</span>
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              <span className="px-3.5 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-black tracking-wide flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">badge</span>
                Pharmacy ID: {pharmacyId}
              </span>
              <span className="px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500 text-xs font-black tracking-wide flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                Status: {statusLabel}
              </span>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
             <Link
               to="/pharmacy/subscription"
               className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-sky-500 text-white font-black text-xs uppercase tracking-wider shadow-lg hover:opacity-90 transition flex items-center gap-2"
             >
               <FiShield /> Pharmacy Partner Plan (8% Rate)
             </Link>
             <button
               onClick={() => navigate('/pharmacy/prescriptions')}
               className="px-5 py-3 rounded-2xl bg-[var(--bg-glass)] border border-[var(--border)] text-[var(--text-main)] font-black text-xs uppercase tracking-wider hover:bg-[var(--bg-main)] transition flex items-center justify-center gap-2"
             >
               <span className="material-symbols-outlined text-sm">list_alt</span>
               All Prescriptions
             </button>
          </div>
        </section>

        {/* Spec Section 5: Pharmacy Volume Commission Tier Widget */}
        <div className="bg-gradient-to-r from-emerald-500/15 via-sky-500/10 to-purple-500/10 border border-emerald-500/30 p-6 md:p-8 rounded-3xl backdrop-blur-xl shadow-xl space-y-5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[var(--border)] pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                  <FiPercent /> Spec Section 5 Tier Engine
                </span>
                {volumeTier.isSubscribed ? (
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                    Pro Subscribed (8% Flat Rate)
                  </span>
                ) : (
                  <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                    Standard Volume Tier
                  </span>
                )}
              </div>
              <h2 className="text-xl font-black text-[var(--text-main)] tracking-tight">
                Current Commission Rate: <span className="text-emerald-400">{volumeTier.commissionPct}%</span> ({volumeTier.tierName})
              </h2>
            </div>

            {!volumeTier.isSubscribed && (
              <Link
                to="/pharmacy/subscription"
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-sky-500 hover:opacity-90 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md transition flex items-center gap-2"
              >
                Upgrade to 8% Flat Rate <FiArrowRight />
              </Link>
            )}
          </div>

          {/* Trailing 30-Day Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-[var(--text-soft)]">Trailing 30-Day Orders: <strong className="text-[var(--text-main)]">{counts.totalPrescriptions} orders</strong></span>
              {volumeTier.isSubscribed ? (
                <span className="text-emerald-400 font-black">Unlimited Orders @ 8% Flat Rate</span>
              ) : volumeTier.ordersToNextTier > 0 ? (
                <span className="text-emerald-400 font-black">{volumeTier.ordersToNextTier} more orders to unlock next tier rate</span>
              ) : (
                <span className="text-emerald-400 font-black">Top Tier Reached (10%)</span>
              )}
            </div>

            <div className="w-full bg-[var(--bg-main)] rounded-full h-3.5 p-0.5 border border-[var(--border)] overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 via-sky-500 to-purple-500 h-full rounded-full transition-all duration-1000 shadow-md"
                style={{ width: `${volumeTier.progressPct}%` }}
              />
            </div>

            <div className="grid grid-cols-3 text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] pt-1 text-center">
              <div className="text-left">Tier 1: 0–49 Orders (15%)</div>
              <div>Tier 2: 50–199 Orders (12%)</div>
              <div className="text-right">Tier 3: 200+ Orders (10%)</div>
            </div>
          </div>
        </div>

        {/* Fulfillment Pipeline Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <FulfillmentCard 
            icon="inbox_customize" 
            label="Inbound Queue" 
            value={counts.incoming} 
            color="secondary"
            onClick={() => navigate('/pharmacy/prescriptions?status=INCOMING')}
          />
          <FulfillmentCard 
            icon="checklist_rtl" 
            label="Verified Orders" 
            value={counts.ack} 
            color="primary"
            onClick={() => navigate('/pharmacy/prescriptions?status=ACKNOWLEDGED')}
          />
          <FulfillmentCard 
            icon="conveyor_belt" 
            label="Ready for Dispatch" 
            value={counts.ready} 
            color="tertiary"
            onClick={() => navigate('/pharmacy/prescriptions?status=READY')}
          />
          <FulfillmentCard 
            icon="local_shipping" 
            label="Shipped/Dispensed" 
            value={counts.dispensed} 
            color="primary"
            onClick={() => navigate('/pharmacy/prescriptions?status=DISPENSED')}
          />
        </section>

        {/* Pharmacy Earnings & Order History Financial Table */}
        <div className="glass-panel p-8 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--border)] pb-4">
            <div>
              <h2 className="text-lg font-black text-[var(--text-main)] uppercase tracking-tight flex items-center gap-2">
                <FiFileText className="text-emerald-500" /> Recent Pharmacy Orders & Tier Payouts
              </h2>
              <p className="text-xs text-[var(--text-soft)] mt-0.5">
                Financial breakdown showing gross medicine order revenue, applied commission %, platform fee, and net pharmacy payout.
              </p>
            </div>
            <div className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl">
              Net Earnings: GHS {financials.netEarningsGHS.toFixed(2)}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="pb-3 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                    Patient / Medication
                  </th>
                  <th className="pb-3 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                    Date
                  </th>
                  <th className="pb-3 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                    Gross Amount
                  </th>
                  <th className="pb-3 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                    Applied Tier %
                  </th>
                  <th className="pb-3 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                    Platform Fee
                  </th>
                  <th className="pb-3 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest text-right">
                    Net Pharmacy Payout
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]/50 text-xs font-medium">
                {Array.isArray(recentOrders) && recentOrders.length > 0 ? (
                  recentOrders.map((ord, i) => (
                    <tr
                      key={ord?.id || i}
                      className="hover:bg-[var(--bg-main)]/30 transition-colors"
                    >
                      <td className="py-4">
                        <div className="font-bold text-[var(--text-main)]">{ord?.patientName || "Patient"}</div>
                        <div className="text-[10px] text-emerald-400">{ord?.medicationName || "Prescription Fulfillment"}</div>
                      </td>
                      <td className="py-4 text-[var(--text-soft)]">
                        {ord?.createdAt ? new Date(ord.createdAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-4 font-bold text-[var(--text-main)]">
                        GHS {(ord?.amountGHS || 0).toFixed(2)}
                      </td>
                      <td className="py-4">
                        <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md font-black text-[10px]">
                          {ord?.commissionPct || 15}%
                        </span>
                      </td>
                      <td className="py-4 text-rose-400 font-bold">
                        -GHS {(ord?.platformFeeGHS || 0).toFixed(2)}
                      </td>
                      <td className="py-4 text-right font-black text-emerald-400">
                        GHS {(ord?.netPayoutGHS || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="py-10 text-center text-[var(--text-muted)] text-sm">
                      No prescription orders recorded yet. As orders are fulfilled, financial tier payouts will display here.
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

function FulfillmentCard({ icon, label, value, color, onClick }) {
  const colorMap = {
    primary: "text-primary bg-primary-container/10 border-primary/20",
    secondary: "text-secondary bg-secondary-container/10 border-secondary/20",
    tertiary: "text-tertiary bg-tertiary-fixed/30 border-tertiary/20"
  };

  return (
    <div 
      onClick={onClick}
      className={`card-premium flex flex-col justify-between hover:scale-[1.02] cursor-pointer border-2 ${colorMap[color]}`}
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6`}>
        <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
      </div>
      <div>
        <p className="text-[10px] font-bold opacity-60 tracking-widest uppercase mb-1">{label}</p>
        <p className="text-4xl font-extrabold text-on-surface tracking-tighter">{value}</p>
      </div>
    </div>
  );
}


