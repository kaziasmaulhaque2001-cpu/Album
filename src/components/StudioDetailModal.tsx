import React, { useState, useEffect } from "react";
import {
  X,
  Building2,
  Users,
  FolderHeart,
  BookOpen,
  UserCheck,
  CreditCard,
  IndianRupee,
  HardDrive,
  History,
  Settings,
  ShieldCheck,
  Calendar,
  Mail,
  Phone,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Download,
  Plus,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { authFetch } from "../context/AuthContext.js";

interface StudioDetailModalProps {
  studioId: string;
  onClose: () => void;
  onRefreshParent: () => void;
}

export default function StudioDetailModal({ studioId, onClose, onRefreshParent }: StudioDetailModalProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "clients" | "albums" | "proofing" | "crew" | "subscription" | "payments" | "storage" | "logs" | "settings"
  >("overview");

  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [updating, setUpdating] = useState(false);

  // Storage form state
  const [addGB, setAddGB] = useState(10);

  const fetchDetails = async () => {
    setIsLoading(true);
    try {
      const res = await authFetch(`/api/studio-clients/studios/${studioId}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        throw new Error("Failed to load studio details.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred fetching studio detail.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (studioId) {
      fetchDetails();
    }
  }, [studioId]);

  if (!data && isLoading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl border border-neutral-100">
          <div className="h-10 w-10 border-3 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono uppercase tracking-widest text-neutral-500">Loading Studio Workspace...</p>
        </div>
      </div>
    );
  }

  const { studio, subscription, storageUsage, payments, activityLogs, albums, clients, weddingCrewBookings } = data || {};

  const handleUpdateSubscription = async (action: string, plan?: string, extendDays?: number) => {
    setUpdating(true);
    try {
      const res = await authFetch(`/api/studio-clients/studios/${studioId}/subscription`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, plan, extendDays }),
      });
      const resJson = await res.json();
      if (res.ok) {
        alert(resJson.message || "Subscription updated!");
        fetchDetails();
        onRefreshParent();
      } else {
        throw new Error(resJson.error);
      }
    } catch (e: any) {
      alert(e.message || "Failed to update subscription");
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateStorage = async (action: string, gb?: number) => {
    setUpdating(true);
    try {
      const res = await authFetch(`/api/studio-clients/studios/${studioId}/storage`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, addGB: gb }),
      });
      const resJson = await res.json();
      if (res.ok) {
        alert(resJson.message || "Storage updated!");
        fetchDetails();
        onRefreshParent();
      } else {
        throw new Error(resJson.error);
      }
    } catch (e: any) {
      alert(e.message || "Failed to update storage");
    } finally {
      setUpdating(false);
    }
  };

  const formatGB = (bytes: number) => {
    if (!bytes) return "0 GB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-neutral-200 overflow-hidden"
      >
        {/* Modal Header */}
        <div className="bg-neutral-950 text-white p-6 border-b border-neutral-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            {studio?.logoUrl ? (
              <img src={studio.logoUrl} alt="Logo" className="h-12 w-12 rounded-2xl object-cover border border-neutral-700 bg-neutral-900" />
            ) : (
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-[#D4AF37] to-amber-200 text-neutral-950 font-bold text-lg flex items-center justify-center shadow-md">
                {studio?.name?.[0] || "S"}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-serif font-semibold text-white">{studio?.name}</h2>
                <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full uppercase font-bold tracking-wider ${
                  studio?.status === "Active" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                  studio?.status === "Trial" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                }`}>
                  {studio?.status}
                </span>
                <span className="bg-[#D4AF37]/20 text-[#D4AF37] text-[10px] font-mono px-2.5 py-0.5 rounded-full uppercase font-bold border border-[#D4AF37]/30">
                  {studio?.plan} Plan
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-sans mt-1 flex items-center gap-3">
                <span>Owner: <strong>{studio?.ownerName}</strong></span>
                <span>•</span>
                <span>{studio?.email}</span>
                <span>•</span>
                <span>{studio?.phone}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-full bg-neutral-900 hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs (10 Tabs) */}
        <div className="bg-neutral-900 px-6 py-2 border-b border-neutral-800 flex items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-neutral-700 shrink-0">
          {[
            { id: "overview", label: "Overview", icon: Building2 },
            { id: "clients", label: `Clients (${clients?.length || 0})`, icon: Users },
            { id: "albums", label: `Albums (${albums?.length || 0})`, icon: FolderHeart },
            { id: "proofing", label: "Album Proofing", icon: BookOpen },
            { id: "crew", label: "Wedding Crew", icon: UserCheck },
            { id: "subscription", label: "Subscription", icon: CreditCard },
            { id: "payments", label: `Payments (${payments?.length || 0})`, icon: IndianRupee },
            { id: "storage", label: "Storage", icon: HardDrive },
            { id: "logs", label: "Activity Logs", icon: History },
            { id: "settings", label: "Settings", icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-[#D4AF37] text-neutral-950 font-bold shadow-sm"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-[#FAF9F5]">
          {activeTab === "overview" && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-sm">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase block">Active Plan</span>
                  <div className="text-xl font-serif text-neutral-900 mt-1 font-bold">{studio?.plan} Plan</div>
                  <span className="text-[10px] text-emerald-600 block mt-1 font-mono font-semibold">
                    {studio?.status === "Active" ? "Auto-renewing monthly" : `${studio?.trialDaysLeft} trial days left`}
                  </span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-sm">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase block">Storage Consumption</span>
                  <div className="text-xl font-serif text-neutral-900 mt-1 font-bold">
                    {formatGB(studio?.storageUsed)} / {formatGB(studio?.storageLimit)}
                  </div>
                  <div className="w-full bg-neutral-100 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div
                      className="bg-[#D4AF37] h-1.5 rounded-full"
                      style={{ width: `${Math.min(100, ((studio?.storageUsed || 0) / (studio?.storageLimit || 1)) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-sm">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase block">Total Galleries</span>
                  <div className="text-xl font-serif text-neutral-900 mt-1 font-bold">{albums?.length || 0} Wedding Collections</div>
                  <span className="text-[10px] text-neutral-400 block mt-1">High-res portfolios active</span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-sm">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase block">Member Since</span>
                  <div className="text-sm font-semibold text-neutral-900 mt-1">
                    {new Date(studio?.registrationDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                  <span className="text-[10px] font-mono text-neutral-400 block mt-1">
                    Last active: {new Date(studio?.lastLogin).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>

              {/* General Details Grid */}
              <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-sm space-y-4">
                <h3 className="text-sm font-serif font-bold text-neutral-900 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[#D4AF37]" /> Studio Metadata & Business Specs
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                    <span className="text-neutral-400 text-[10px] font-mono uppercase block">Studio ID</span>
                    <span className="font-mono font-bold text-neutral-800">{studio?.id}</span>
                  </div>
                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                    <span className="text-neutral-400 text-[10px] font-mono uppercase block">Owner Email</span>
                    <span className="font-medium text-neutral-800">{studio?.email}</span>
                  </div>
                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                    <span className="text-neutral-400 text-[10px] font-mono uppercase block">Contact Phone</span>
                    <span className="font-medium text-neutral-800">{studio?.phone}</span>
                  </div>
                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                    <span className="text-neutral-400 text-[10px] font-mono uppercase block">Assigned Storage Limit</span>
                    <span className="font-bold text-[#D4AF37]">{formatGB(studio?.storageLimit)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "clients" && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-sm font-serif font-bold text-neutral-900">Couples & Clients Managed ({clients?.length || 0})</h3>
              <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-mono text-[10px] uppercase">
                    <tr>
                      <th className="p-3.5">Client Name</th>
                      <th className="p-3.5">Email</th>
                      <th className="p-3.5">Albums</th>
                      <th className="p-3.5">Joined Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {clients?.map((cl: any) => (
                      <tr key={cl.id} className="hover:bg-neutral-50/80">
                        <td className="p-3.5 font-bold text-neutral-900">{cl.name}</td>
                        <td className="p-3.5 text-neutral-600 font-mono">{cl.email}</td>
                        <td className="p-3.5">
                          <span className="bg-amber-50 text-amber-800 font-mono px-2 py-0.5 rounded text-[10px] font-bold">
                            {cl.albumCount} Albums
                          </span>
                        </td>
                        <td className="p-3.5 text-neutral-400 font-mono">
                          {new Date(cl.joinedDate).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "albums" && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-sm font-serif font-bold text-neutral-900">Wedding Albums Created ({albums?.length || 0})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {albums?.map((alb: any) => (
                  <div key={alb.id} className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm flex items-center gap-4">
                    <img src={alb.coverUrl || "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=300&q=80"} alt="Cover" className="h-16 w-16 rounded-xl object-cover" />
                    <div>
                      <h4 className="font-serif font-bold text-neutral-900 text-sm">{alb.brideName} & {alb.groomName}</h4>
                      <p className="text-[11px] text-neutral-500 font-mono mt-0.5">{alb.eventName} • {alb.photoCount || 0} Photos</p>
                      <span className="inline-block bg-emerald-50 text-emerald-700 text-[9px] font-mono px-2 py-0.5 rounded uppercase mt-1 font-bold">
                        {alb.isActive ? "Online" : "Offline"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "proofing" && (
            <div className="space-y-4 animate-fade-in bg-white p-6 rounded-2xl border border-neutral-200">
              <h3 className="text-sm font-serif font-bold text-neutral-900 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-[#D4AF37]" /> Album Proofing Spreads & Version Control
              </h3>
              <p className="text-xs text-neutral-500">
                Manage 12×36 flush mount album designs, Bride & Groom spread comments, revision drafts, and final print approvals.
              </p>
              <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl text-xs text-amber-900">
                <strong>Proofing Engine Active:</strong> Studio client has 2 active proofing sessions in progress.
              </div>
            </div>
          )}

          {activeTab === "crew" && (
            <div className="space-y-4 animate-fade-in bg-white p-6 rounded-2xl border border-neutral-200">
              <h3 className="text-sm font-serif font-bold text-neutral-900 flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-[#D4AF37]" /> Wedding Crew & Team Roster
              </h3>
              {weddingCrewBookings?.map((crew: any) => (
                <div key={crew.id} className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between text-xs">
                  <div>
                    <h4 className="font-bold text-neutral-900">{crew.title}</h4>
                    <p className="text-neutral-500 mt-0.5">{crew.clientName} • {crew.date}</p>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full text-[10px]">
                    {crew.status} ({crew.teamMembers} Members)
                  </span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "subscription" && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-neutral-400 uppercase block">Current Active Plan</span>
                    <h3 className="text-2xl font-serif font-bold text-neutral-900">{subscription?.plan || studio?.plan} Plan</h3>
                  </div>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-mono font-bold rounded-full">
                    ₹{subscription?.price || (studio?.plan === "Business" ? 999 : studio?.plan === "Pro" ? 599 : 299)} / Month
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="p-3 bg-neutral-50 rounded-xl">
                    <span className="text-neutral-400 text-[10px] uppercase block">Start Date</span>
                    <span className="font-bold text-neutral-800">{new Date(subscription?.startDate || studio?.registrationDate).toLocaleDateString()}</span>
                  </div>
                  <div className="p-3 bg-neutral-50 rounded-xl">
                    <span className="text-neutral-400 text-[10px] uppercase block">Expiry Date</span>
                    <span className="font-bold text-rose-600">{new Date(subscription?.expiryDate || Date.now() + 30 * 86400000).toLocaleDateString()}</span>
                  </div>
                  <div className="p-3 bg-neutral-50 rounded-xl">
                    <span className="text-neutral-400 text-[10px] uppercase block">Trial Days</span>
                    <span className="font-bold text-amber-600">{studio?.trialDaysLeft || 0} Days</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-100 flex flex-wrap gap-2">
                  <button
                    onClick={() => handleUpdateSubscription("upgrade", "Business")}
                    disabled={updating}
                    className="py-2 px-4 bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer"
                  >
                    Upgrade to Business (₹999)
                  </button>
                  <button
                    onClick={() => handleUpdateSubscription("upgrade", "Pro")}
                    disabled={updating}
                    className="py-2 px-4 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs rounded-xl shadow-sm cursor-pointer"
                  >
                    Switch to Pro (₹599)
                  </button>
                  <button
                    onClick={() => handleUpdateSubscription("extend_trial", undefined, 7)}
                    disabled={updating}
                    className="py-2 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Extend Trial (+7 Days)
                  </button>
                  <button
                    onClick={() => handleUpdateSubscription("cancel")}
                    disabled={updating}
                    className="py-2 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Cancel Subscription
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "payments" && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-sm font-serif font-bold text-neutral-900">Payment Audit History ({payments?.length || 0})</h3>
              <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-neutral-50 border-b border-neutral-200 font-mono text-[10px] uppercase text-neutral-500">
                    <tr>
                      <th className="p-3.5">Amount</th>
                      <th className="p-3.5">Plan</th>
                      <th className="p-3.5">UTR / Ref Number</th>
                      <th className="p-3.5">Method</th>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {payments?.map((p: any) => (
                      <tr key={p.id} className="hover:bg-neutral-50/80">
                        <td className="p-3.5 font-bold text-emerald-700 font-mono">₹{p.amount}</td>
                        <td className="p-3.5 font-semibold text-neutral-800">{p.plan}</td>
                        <td className="p-3.5 font-mono text-neutral-600">{p.utrNumber}</td>
                        <td className="p-3.5 text-neutral-500">{p.paymentMethod || "UPI"}</td>
                        <td className="p-3.5 font-mono text-neutral-400">{new Date(p.paidAt).toLocaleDateString()}</td>
                        <td className="p-3.5">
                          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold text-[10px]">
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {(!payments || payments.length === 0) && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-neutral-400 text-xs">
                          No payment records indexed for this studio client.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "storage" && (
            <div className="space-y-6 animate-fade-in bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
              <h3 className="text-sm font-serif font-bold text-neutral-900 flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-[#D4AF37]" /> Storage Allocation Controls
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                  <span className="text-neutral-400 text-[10px] uppercase block">Used Storage</span>
                  <span className="text-lg font-bold text-neutral-900">{formatGB(studio?.storageUsed)}</span>
                </div>
                <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                  <span className="text-neutral-400 text-[10px] uppercase block">Limit Storage</span>
                  <span className="text-lg font-bold text-[#D4AF37]">{formatGB(studio?.storageLimit)}</span>
                </div>
                <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                  <span className="text-neutral-400 text-[10px] uppercase block">Available Remaining</span>
                  <span className="text-lg font-bold text-emerald-600">
                    {formatGB(Math.max(0, (studio?.storageLimit || 0) - (studio?.storageUsed || 0)))}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-100 flex items-center gap-3">
                <span className="text-xs font-semibold text-neutral-700">Storage Actions:</span>
                <button
                  onClick={() => handleUpdateStorage("increase", 50)}
                  disabled={updating}
                  className="py-2 px-4 bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  Increase +50 GB
                </button>
                <button
                  onClick={() => handleUpdateStorage("increase", 10)}
                  disabled={updating}
                  className="py-2 px-4 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Increase +10 GB
                </button>
                <button
                  onClick={() => handleUpdateStorage("reset")}
                  disabled={updating}
                  className="py-2 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Reset to Plan Default
                </button>
              </div>
            </div>
          )}

          {activeTab === "logs" && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-sm font-serif font-bold text-neutral-900">Audit Trail & Security Logs</h3>
              <div className="bg-white p-4 rounded-2xl border border-neutral-200 space-y-3">
                {activityLogs?.map((log: any) => (
                  <div key={log.id} className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 text-xs flex justify-between items-center">
                    <div>
                      <span className="font-bold text-neutral-900 block">{log.action}</span>
                      <p className="text-neutral-600 text-[11px] mt-0.5">{log.details}</p>
                    </div>
                    <span className="font-mono text-[10px] text-neutral-400 shrink-0 ml-4">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-4 animate-fade-in bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
              <h3 className="text-sm font-serif font-bold text-neutral-900">Studio Configuration Settings</h3>
              <p className="text-xs text-neutral-500">Configure studio branding, custom domain mappings, and support permissions.</p>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Studio Name</label>
                  <input type="text" readOnly value={studio?.name || ""} className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-medium" />
                </div>
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Owner Email</label>
                  <input type="text" readOnly value={studio?.email || ""} className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-mono" />
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
