import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar.js";
import StudioDetailModal from "../components/StudioDetailModal.js";
import UpiPaymentModal from "../components/UpiPaymentModal.js";
import { authFetch } from "../context/AuthContext.js";
import { getBrowserSupabaseClient, getSupabaseUploadConfig } from "../lib/supabaseUploader.js";
import {
  Building2,
  Users,
  CreditCard,
  IndianRupee,
  BarChart3,
  HardDrive,
  Bell,
  Search,
  Filter,
  Plus,
  ShieldCheck,
  Eye,
  Edit,
  LogIn,
  Power,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  QrCode,
  History,
  TrendingUp,
  Download,
  Copy,
  ExternalLink,
  Sparkles,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function StudioClientsManager() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const currentTab = searchParams.get("tab") || "studios";

  // State
  const [stats, setStats] = useState<any>(null);
  const [studios, setStudios] = useState<any[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [upiSettings, setUpiSettings] = useState<any>(null);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [planFilter, setPlanFilter] = useState("All");

  // Modals state
  const [selectedStudioId, setSelectedStudioId] = useState<string | null>(null);
  const [showCreateStudioModal, setShowCreateStudioModal] = useState(false);
  const [showUpiPayModal, setShowUpiPayModal] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [viewingScreenshotUrl, setViewingScreenshotUrl] = useState<string | null>(null);

  // New Studio form state
  const [newStudioName, setNewStudioName] = useState("");
  const [newOwnerName, setNewOwnerName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPlan, setNewPlan] = useState<"Basic" | "Pro" | "Business">("Pro");
  const [creatingStudio, setCreatingStudio] = useState(false);

  // UPI Settings Form
  const [upiIdInput, setUpiIdInput] = useState("");
  const [qrCodeInput, setQrCodeInput] = useState("");
  const [recipientInput, setRecipientInput] = useState("");
  const [instructionsInput, setInstructionsInput] = useState("");
  const [savingUpi, setSavingUpi] = useState(false);

  // Data loading & Realtime sync
  const loadAllData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const [statsRes, studiosRes, prRes, notifRes, analyticsRes, upiRes, logsRes] = await Promise.all([
        authFetch("/api/studio-clients/dashboard-stats"),
        authFetch(`/api/studio-clients/studios?search=${encodeURIComponent(searchQuery)}&status=${statusFilter}&plan=${planFilter}`),
        authFetch("/api/studio-clients/payment-requests"),
        authFetch("/api/studio-clients/notifications"),
        authFetch("/api/studio-clients/analytics"),
        authFetch("/api/studio-clients/upi-settings"),
        authFetch("/api/studio-clients/activity-logs"),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (studiosRes.ok) {
        const json = await studiosRes.json();
        setStudios(json.studios || []);
      }
      if (prRes.ok) {
        const json = await prRes.json();
        setPaymentRequests(json.paymentRequests || []);
      }
      if (notifRes.ok) {
        const json = await notifRes.json();
        setNotifications(json.notifications || []);
      }
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
      if (upiRes.ok) {
        const json = await upiRes.json();
        setUpiSettings(json.upiSettings);
        setUpiIdInput(json.upiSettings?.upiId || "");
        setQrCodeInput(json.upiSettings?.qrCodeUrl || "");
        setRecipientInput(json.upiSettings?.recipientName || "");
        setInstructionsInput(json.upiSettings?.instructions || "");
      }
      if (logsRes.ok) {
        const json = await logsRes.json();
        setActivityLogs(json.activityLogs || []);
      }
    } catch (e) {
      console.error("Error loading studio clients data:", e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let isCancelled = false;
    let channel: any = null;
    let client: any = null;

    loadAllData();

    // Auto Polling every 6 seconds for Realtime Synchronization
    const interval = setInterval(() => {
      loadAllData(true);
    }, 6000);

    // Supabase Realtime Subscription if client configured
    getSupabaseUploadConfig().then((cfg) => {
      if (isCancelled) return;
      if (cfg.isSupabaseConfigured && cfg.supabaseUrl && cfg.supabaseAnonKey) {
        client = getBrowserSupabaseClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
        if (client) {
          const channelId = `studio-realtime-${Math.random().toString(36).substring(2, 9)}`;
          channel = client
            .channel(channelId)
            .on("postgres_changes", { event: "*", schema: "public" }, () => {
              loadAllData(true);
            });

          if (!isCancelled) {
            channel.subscribe();
          } else {
            client.removeChannel(channel);
          }
        }
      }
    });

    return () => {
      isCancelled = true;
      clearInterval(interval);
      if (channel && client) {
        client.removeChannel(channel);
      }
    };
  }, [searchQuery, statusFilter, planFilter]);

  // Actions
  const handleCreateStudioSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingStudio(true);

    try {
      const res = await authFetch("/api/studio-clients/studios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newStudioName,
          ownerName: newOwnerName,
          email: newEmail,
          phone: newPhone,
          plan: newPlan,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        alert("Studio created successfully!");
        setShowCreateStudioModal(false);
        setNewStudioName("");
        setNewOwnerName("");
        setNewEmail("");
        setNewPhone("");
        loadAllData(true);
      } else {
        throw new Error(json.error || "Failed to create studio.");
      }
    } catch (err: any) {
      alert(err.message || "Failed to create studio.");
    } finally {
      setCreatingStudio(false);
    }
  };

  const handleToggleStatus = async (studioId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "Suspended" ? "Active" : "Suspended";
    if (!window.confirm(`Are you sure you want to change status to ${nextStatus}?`)) return;

    try {
      const res = await authFetch(`/api/studio-clients/studios/${studioId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        loadAllData(true);
      }
    } catch (e) {
      alert("Failed to update status");
    }
  };

  const handleDeleteStudio = async (studioId: string, studioName: string) => {
    if (!window.confirm(`Are you sure you want to PERMANENTLY DELETE studio "${studioName}"?`)) return;

    try {
      const res = await authFetch(`/api/studio-clients/studios/${studioId}`, { method: "DELETE" });
      if (res.ok) {
        loadAllData(true);
      }
    } catch (e) {
      alert("Failed to delete studio");
    }
  };

  const handleImpersonate = async (studioId: string) => {
    try {
      const res = await authFetch(`/api/studio-clients/studios/${studioId}/impersonate`, { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        const origToken = localStorage.getItem("token");
        if (origToken) localStorage.setItem("super_admin_orig_token", origToken);
        localStorage.setItem("impersonation_token", json.impersonationToken);
        localStorage.setItem("token", json.impersonationToken);
        window.location.href = "/admin";
      } else {
        throw new Error(json.error);
      }
    } catch (e: any) {
      alert(e.message || "Failed to impersonate studio");
    }
  };

  const handleApprovePayment = async (prId: string) => {
    if (!window.confirm("Approve this payment request and automatically activate 1-month subscription?")) return;

    try {
      const res = await authFetch(`/api/studio-clients/payment-requests/${prId}/approve`, { method: "POST" });
      if (res.ok) {
        alert("Payment approved and subscription activated!");
        loadAllData(true);
      }
    } catch (e) {
      alert("Failed to approve payment");
    }
  };

  const handleRejectPayment = async (prId: string) => {
    const reason = window.prompt("Enter rejection reason:", "Payment screenshot or UTR invalid");
    if (!reason) return;

    try {
      const res = await authFetch(`/api/studio-clients/payment-requests/${prId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNotes: reason }),
      });
      if (res.ok) {
        alert("Payment request rejected.");
        loadAllData(true);
      }
    } catch (e) {
      alert("Failed to reject payment");
    }
  };

  const handleSaveUpiSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingUpi(true);

    try {
      const res = await authFetch("/api/studio-clients/upi-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          upiId: upiIdInput,
          qrCodeUrl: qrCodeInput,
          recipientName: recipientInput,
          instructions: instructionsInput,
        }),
      });

      if (res.ok) {
        alert("UPI Payment settings saved successfully!");
        loadAllData(true);
      }
    } catch (e) {
      alert("Failed to save UPI settings");
    } finally {
      setSavingUpi(false);
    }
  };

  const formatGB = (bytes: number) => {
    if (!bytes) return "0 GB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
  };

  const setTab = (tab: string) => {
    setSearchParams({ tab });
  };

  const pendingCount = paymentRequests.filter((pr) => pr.status === "Pending").length;

  return (
    <div className="min-h-screen bg-[#F4F3EF] flex flex-col lg:flex-row text-neutral-900 font-sans">
      {/* Sidebar */}
      <AdminSidebar currentTab={currentTab} />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Console Bar */}
        <header className="bg-neutral-950 text-white px-6 py-4 border-b border-neutral-800 flex items-center justify-between sticky top-0 z-30 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/30 text-[#D4AF37]">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-serif font-bold text-white tracking-wide">Studio Clients Management Console</h1>
                <span className="bg-gradient-to-r from-amber-500 to-[#D4AF37] text-neutral-950 text-[10px] font-mono px-2.5 py-0.5 rounded-full uppercase font-bold tracking-wider">
                  Super Admin
                </span>
                {isRefreshing && (
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 animate-pulse">
                    <RefreshCw className="h-3 w-3 animate-spin" /> Auto-syncing...
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400 font-sans">
                Real-time tenant analytics, subscription lifecycle, manual UPI payments & storage controls.
              </p>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3 relative">
            <button
              onClick={() => setShowUpiPayModal(true)}
              className="py-2 px-3.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-amber-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <IndianRupee className="h-4 w-4 text-[#D4AF37]" /> UPI Payment Request
            </button>

            <button
              onClick={() => setShowCreateStudioModal(true)}
              className="py-2 px-3.5 bg-[#D4AF37] hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-[#D4AF37]/10 transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Add New Studio
            </button>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                className="p-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-neutral-300 hover:text-white transition-colors cursor-pointer relative"
              >
                <Bell className="h-4 w-4" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-rose-500 text-white font-mono text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {notifications.length}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              <AnimatePresence>
                {showNotificationsDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-neutral-200 text-neutral-900 p-4 z-50 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                      <span className="text-xs font-serif font-bold text-neutral-900">Notifications & Alerts</span>
                      <span className="text-[10px] font-mono bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                        {notifications.length} Pending
                      </span>
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-2 text-xs">
                      {notifications.map((notif: any) => (
                        <div
                          key={notif.id}
                          className={`p-3 rounded-xl border text-xs ${
                            notif.severity === "warning"
                              ? "bg-amber-50 border-amber-200 text-amber-900"
                              : notif.severity === "error"
                              ? "bg-rose-50 border-rose-200 text-rose-900"
                              : "bg-blue-50 border-blue-200 text-blue-900"
                          }`}
                        >
                          <span className="font-bold block">{notif.title}</span>
                          <p className="mt-0.5 text-[11px] leading-tight opacity-90">{notif.message}</p>
                        </div>
                      ))}
                      {notifications.length === 0 && (
                        <p className="text-center text-neutral-400 py-4 text-xs">All studio client systems normal.</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Console Sub-Header Navigation Tabs */}
        <div className="bg-white border-b border-neutral-200 px-6 py-2 flex items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-neutral-200 sticky top-[65px] z-20 shadow-sm">
          {[
            { id: "studios", label: "Studio Clients List", icon: Building2 },
            { id: "payments", label: "UPI Payment Requests", icon: IndianRupee, badge: pendingCount > 0 ? pendingCount : null },
            { id: "subscriptions", label: "Subscriptions & Plans", icon: CreditCard },
            { id: "analytics", label: "Analytics & Growth", icon: BarChart3 },
            { id: "storage", label: "Storage Control", icon: HardDrive },
            { id: "upi-settings", label: "UPI Payment Settings", icon: QrCode },
            { id: "activity-logs", label: "Activity Audit Logs", icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className={`py-2 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? "bg-neutral-950 text-white font-bold shadow-sm"
                    : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-[#D4AF37]" : "text-neutral-400"}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="bg-rose-500 text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Main Content Area */}
        <main className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Top Realtime Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {[
              { title: "Total Studios", value: stats?.totalStudios || 0, icon: Building2, color: "text-neutral-900" },
              { title: "Active Studios", value: stats?.activeStudios || 0, icon: CheckCircle2, color: "text-emerald-600" },
              { title: "Trial Studios", value: stats?.trialStudios || 0, icon: Clock, color: "text-amber-600" },
              { title: "Expired", value: stats?.expiredStudios || 0, icon: AlertTriangle, color: "text-rose-600" },
              { title: "Suspended", value: stats?.suspendedStudios || 0, icon: Power, color: "text-neutral-500" },
              { title: "Pending UPI", value: stats?.pendingPayments || 0, icon: IndianRupee, color: "text-amber-600", badge: true },
              { title: "Monthly Revenue", value: `₹${stats?.monthlyRevenue || 0}`, icon: TrendingUp, color: "text-emerald-700" },
              { title: "Storage Used", value: formatGB(stats?.storageUsed), icon: HardDrive, color: "text-blue-600" },
            ].map((card, idx) => {
              const Icon = card.icon;
              return (
                <div key={idx} className="bg-white p-3.5 rounded-2xl border border-neutral-200/80 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block truncate">
                      {card.title}
                    </span>
                    <Icon className={`h-3.5 w-3.5 ${card.color}`} />
                  </div>
                  <div className={`text-lg font-serif font-bold mt-2 ${card.color}`}>{card.value}</div>
                </div>
              );
            })}
          </div>

          {/* TAB 1: STUDIO CLIENTS LIST */}
          {currentTab === "studios" && (
            <div className="space-y-4 animate-fade-in">
              {/* Search & Filter Bar */}
              <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search by studio name, owner, email, phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-500 font-semibold shrink-0">Status:</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="p-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Active">Active</option>
                      <option value="Trial">Trial</option>
                      <option value="Expired">Expired</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-500 font-semibold shrink-0">Plan:</span>
                    <select
                      value={planFilter}
                      onChange={(e) => setPlanFilter(e.target.value)}
                      className="p-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      <option value="All">All Plans</option>
                      <option value="Basic">Basic (₹299)</option>
                      <option value="Pro">Pro (₹599)</option>
                      <option value="Business">Business (₹999)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Table View */}
              <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-mono text-[10px] uppercase">
                      <tr>
                        <th className="p-4">Studio / Owner</th>
                        <th className="p-4">Contact</th>
                        <th className="p-4">Registered</th>
                        <th className="p-4">Plan & Status</th>
                        <th className="p-4">Trial Days</th>
                        <th className="p-4">Storage Used</th>
                        <th className="p-4">Clients & Albums</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {studios.map((st) => (
                        <tr key={st.id} className="hover:bg-neutral-50/80 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              {st.logoUrl ? (
                                <img src={st.logoUrl} alt="Logo" className="h-9 w-9 rounded-xl object-cover border border-neutral-200" />
                              ) : (
                                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-[#D4AF37] to-amber-200 text-neutral-950 font-bold text-xs flex items-center justify-center shrink-0">
                                  {st.name?.[0] || "S"}
                                </div>
                              )}
                              <div>
                                <span className="font-serif font-bold text-neutral-900 text-xs block">{st.name}</span>
                                <span className="text-[11px] text-neutral-500 block">Owner: {st.ownerName}</span>
                              </div>
                            </div>
                          </td>

                          <td className="p-4">
                            <span className="block font-mono text-neutral-800 text-[11px]">{st.email}</span>
                            <span className="block text-neutral-400 text-[10px] font-mono">{st.phone}</span>
                          </td>

                          <td className="p-4 text-neutral-500 font-mono text-[11px]">
                            {new Date(st.registrationDate).toLocaleDateString()}
                          </td>

                          <td className="p-4">
                            <div className="flex items-center gap-1.5">
                              <span className="bg-[#D4AF37]/20 text-[#D4AF37] text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase border border-[#D4AF37]/30">
                                {st.plan}
                              </span>
                              <span
                                className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                                  st.status === "Active"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : st.status === "Trial"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-rose-100 text-rose-800"
                                }`}
                              >
                                {st.status}
                              </span>
                            </div>
                          </td>

                          <td className="p-4 font-mono font-bold text-amber-600 text-xs">
                            {st.status === "Trial" ? `${st.trialDaysLeft} Days` : "—"}
                          </td>

                          <td className="p-4">
                            <div className="w-24">
                              <div className="flex justify-between text-[10px] font-mono text-neutral-500 mb-1">
                                <span>{formatGB(st.storageUsed)}</span>
                                <span>{formatGB(st.storageLimit)}</span>
                              </div>
                              <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-[#D4AF37] h-1.5 rounded-full"
                                  style={{ width: `${Math.min(100, ((st.storageUsed || 0) / (st.storageLimit || 1)) * 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="p-4 font-mono text-[11px] text-neutral-700">
                            {st.totalClients || 0} Clients • {st.totalAlbums || 0} Albums
                          </td>

                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setSelectedStudioId(st.id)}
                                title="View Details"
                                className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                              >
                                <Eye className="h-4 w-4" />
                              </button>

                              <button
                                onClick={() => handleImpersonate(st.id)}
                                title="Login As Studio (Impersonate Super Admin)"
                                className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <LogIn className="h-4 w-4" />
                              </button>

                              <button
                                onClick={() => handleToggleStatus(st.id, st.status)}
                                title={st.status === "Suspended" ? "Activate Studio" : "Suspend Studio"}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  st.status === "Suspended"
                                    ? "text-emerald-600 hover:bg-emerald-50"
                                    : "text-rose-600 hover:bg-rose-50"
                                }`}
                              >
                                <Power className="h-4 w-4" />
                              </button>

                              <button
                                onClick={() => handleDeleteStudio(st.id, st.name)}
                                title="Delete Studio"
                                className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {studios.length === 0 && (
                        <tr>
                          <td colSpan={8} className="p-12 text-center text-neutral-400 text-xs font-sans">
                            No studio clients found matching search criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MANUAL UPI PAYMENT REQUESTS */}
          {currentTab === "payments" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-serif font-bold text-neutral-900">Manual UPI Payment Requests</h2>
                  <p className="text-xs text-neutral-500">
                    Review and approve submitted UPI payment requests to auto-activate studio subscriptions.
                  </p>
                </div>
                <button
                  onClick={() => setShowUpiPayModal(true)}
                  className="py-2 px-3.5 bg-neutral-950 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="h-4 w-4 text-[#D4AF37]" /> Submit Test UPI Request
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-neutral-50 border-b border-neutral-200 font-mono text-[10px] uppercase text-neutral-500">
                    <tr>
                      <th className="p-4">Studio / Owner</th>
                      <th className="p-4">Plan & Amount</th>
                      <th className="p-4">UTR Number</th>
                      <th className="p-4">Screenshot</th>
                      <th className="p-4">Submitted Date</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {paymentRequests.map((pr) => (
                      <tr key={pr.id} className="hover:bg-neutral-50/80">
                        <td className="p-4">
                          <span className="font-bold text-neutral-900 block">{pr.studioName}</span>
                          <span className="text-[11px] text-neutral-500 font-mono">{pr.email}</span>
                        </td>

                        <td className="p-4 font-mono">
                          <span className="font-bold text-emerald-700 block">₹{pr.amount}</span>
                          <span className="text-[10px] text-neutral-400 uppercase">{pr.plan} Plan</span>
                        </td>

                        <td className="p-4 font-mono font-bold text-neutral-900">{pr.utrNumber}</td>

                        <td className="p-4">
                          {pr.screenshotUrl ? (
                            <button
                              onClick={() => setViewingScreenshotUrl(pr.screenshotUrl)}
                              className="text-amber-700 hover:underline font-mono text-[11px] flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5" /> View Proof
                            </button>
                          ) : (
                            <span className="text-neutral-400 font-mono text-[10px]">No image</span>
                          )}
                        </td>

                        <td className="p-4 font-mono text-neutral-500">
                          {new Date(pr.createdAt).toLocaleString()}
                        </td>

                        <td className="p-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                              pr.status === "Approved"
                                ? "bg-emerald-100 text-emerald-800"
                                : pr.status === "Pending"
                                ? "bg-amber-100 text-amber-800 animate-pulse"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {pr.status}
                          </span>
                        </td>

                        <td className="p-4 text-right">
                          {pr.status === "Pending" ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleApprovePayment(pr.id)}
                                className="py-1 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-sm"
                              >
                                Approve & Activate
                              </button>
                              <button
                                onClick={() => handleRejectPayment(pr.id)}
                                className="py-1 px-3 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold rounded-lg text-xs cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-neutral-400 font-mono">{pr.adminNotes || "Processed"}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {paymentRequests.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-12 text-center text-neutral-400 text-xs">
                          No UPI payment requests pending review.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: SUBSCRIPTIONS & PLANS */}
          {currentTab === "subscriptions" && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center max-w-xl mx-auto space-y-2">
                <h2 className="text-xl font-serif font-bold text-neutral-900">SaaS Subscription Architecture & Pricing Tiers</h2>
                <p className="text-xs text-neutral-500">
                  Automated trial logic, feature caps, and tier management across all studio accounts.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    name: "Basic Plan",
                    price: "299",
                    storage: "20 GB",
                    clients: "100 Clients",
                    features: ["Album Proofing", "Client Lightbox Gallery", "PDF Export", "WhatsApp Share"],
                    popular: false,
                  },
                  {
                    name: "Pro Plan",
                    price: "599",
                    storage: "100 GB",
                    clients: "Unlimited Clients",
                    features: ["Everything in Basic", "Wedding Crew Roster", "Studio Analytics", "Custom Watermark Branding"],
                    popular: true,
                  },
                  {
                    name: "Business Plan",
                    price: "999",
                    storage: "500 GB",
                    clients: "Unlimited Clients",
                    features: ["Everything in Pro", "Multi-Team Staff Accounts", "Priority VIP Support", "All Future Module Updates"],
                    popular: false,
                  },
                ].map((tier, idx) => (
                  <div
                    key={idx}
                    className={`bg-white p-6 rounded-3xl border shadow-sm relative flex flex-col justify-between ${
                      tier.popular ? "border-[#D4AF37] ring-2 ring-[#D4AF37]/20" : "border-neutral-200"
                    }`}
                  >
                    {tier.popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#D4AF37] text-neutral-950 text-[10px] font-mono font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                        Most Popular
                      </span>
                    )}

                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-serif font-bold text-neutral-900">{tier.name}</h3>
                        <div className="flex items-baseline gap-1 mt-2">
                          <span className="text-3xl font-serif font-extrabold text-neutral-950">₹{tier.price}</span>
                          <span className="text-xs text-neutral-500 font-mono">/ Month</span>
                        </div>
                      </div>

                      <div className="space-y-2 pt-4 border-t border-neutral-100 text-xs font-sans">
                        <div className="p-2 bg-neutral-50 rounded-xl font-mono text-[11px] font-semibold text-neutral-800">
                          Storage Limit: {tier.storage}
                        </div>
                        <div className="p-2 bg-neutral-50 rounded-xl font-mono text-[11px] font-semibold text-neutral-800">
                          Couples Allowed: {tier.clients}
                        </div>

                        <ul className="space-y-2 pt-2 text-neutral-600">
                          {tier.features.map((f, fi) => (
                            <li key={fi} className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: ANALYTICS & GROWTH */}
          {currentTab === "analytics" && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-base font-serif font-bold text-neutral-900">Studio SaaS Growth & Financial Metrics</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-4">
                  <h3 className="text-sm font-serif font-bold text-neutral-900 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-[#D4AF37]" /> Monthly Revenue Trend (₹)
                  </h3>
                  <div className="h-48 flex items-end gap-3 pt-8 pb-2 border-b border-neutral-200 px-2">
                    {analytics?.monthlyRevenue?.map((m: any, i: number) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                        <span className="text-[9px] font-mono font-bold text-neutral-600">₹{m.revenue}</span>
                        <div
                          className="w-full bg-[#D4AF37] rounded-t-lg transition-all"
                          style={{ height: `${Math.min(100, (m.revenue / 3000) * 100)}%` }}
                        />
                        <span className="text-[10px] font-mono text-neutral-400">{m.month}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-4">
                  <h3 className="text-sm font-serif font-bold text-neutral-900 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-emerald-600" /> New Studio Registrations
                  </h3>
                  <div className="h-48 flex items-end gap-3 pt-8 pb-2 border-b border-neutral-200 px-2">
                    {analytics?.newStudiosTrend?.map((m: any, i: number) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                        <span className="text-[9px] font-mono font-bold text-emerald-700">{m.studiosCount}</span>
                        <div
                          className="w-full bg-emerald-500 rounded-t-lg transition-all"
                          style={{ height: `${Math.min(100, (m.studiosCount / 6) * 100)}%` }}
                        />
                        <span className="text-[10px] font-mono text-neutral-400">{m.month}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: STORAGE CONTROL */}
          {currentTab === "storage" && (
            <div className="space-y-4 animate-fade-in bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
              <h2 className="text-base font-serif font-bold text-neutral-900 flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-[#D4AF37]" /> Global Storage Allocation & Quota Limits
              </h2>
              <p className="text-xs text-neutral-500">Manage high-resolution image storage allocations per studio client.</p>

              <div className="divide-y divide-neutral-100">
                {studios.map((st) => (
                  <div key={st.id} className="py-4 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-neutral-900 block">{st.name}</span>
                      <span className="text-neutral-500 text-[11px] font-mono">
                        Used: {formatGB(st.storageUsed)} / Limit: {formatGB(st.storageLimit)}
                      </span>
                    </div>

                    <button
                      onClick={() => setSelectedStudioId(st.id)}
                      className="py-1.5 px-3 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-lg text-xs cursor-pointer"
                    >
                      Manage Limit
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: UPI PAYMENT SETTINGS */}
          {currentTab === "upi-settings" && (
            <div className="max-w-2xl bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-6 animate-fade-in">
              <div>
                <h2 className="text-base font-serif font-bold text-neutral-900">Manual UPI Payment Gate Gateway Settings</h2>
                <p className="text-xs text-neutral-500">Configure admin UPI recipient ID and QR Code image URL for manual payment requests.</p>
              </div>

              <form onSubmit={handleSaveUpiSettings} className="space-y-4 text-xs font-sans">
                <div>
                  <label className="block text-neutral-800 font-bold mb-1">Admin UPI ID</label>
                  <input
                    type="text"
                    required
                    value={upiIdInput}
                    onChange={(e) => setUpiIdInput(e.target.value)}
                    placeholder="e.g. studiophoto@upi"
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl font-mono text-xs focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-neutral-800 font-bold mb-1">Recipient Name</label>
                  <input
                    type="text"
                    required
                    value={recipientInput}
                    onChange={(e) => setRecipientInput(e.target.value)}
                    placeholder="e.g. Studio Admin Services"
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-neutral-800 font-bold mb-1">QR Code Image URL</label>
                  <input
                    type="text"
                    required
                    value={qrCodeInput}
                    onChange={(e) => setQrCodeInput(e.target.value)}
                    placeholder="https://..."
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl font-mono text-xs focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-neutral-800 font-bold mb-1">Payment Instructions</label>
                  <textarea
                    rows={3}
                    value={instructionsInput}
                    onChange={(e) => setInstructionsInput(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingUpi}
                  className="py-3 px-6 bg-neutral-950 hover:bg-neutral-800 text-white font-serif font-bold text-xs rounded-xl cursor-pointer shadow-md"
                >
                  {savingUpi ? "Saving..." : "Save UPI Settings"}
                </button>
              </form>
            </div>
          )}

          {/* TAB 7: ACTIVITY AUDIT LOGS */}
          {currentTab === "activity-logs" && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-base font-serif font-bold text-neutral-900">Security Audit Trail & Impersonation Logs</h2>
              <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm space-y-3">
                {activityLogs.map((log: any) => (
                  <div key={log.id} className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/80 text-xs flex justify-between items-center">
                    <div>
                      <span className="font-bold font-serif text-neutral-900 block">{log.action}</span>
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
        </main>
      </div>

      {/* CREATE NEW STUDIO MODAL */}
      {showCreateStudioModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 space-y-4 relative">
            <button
              onClick={() => setShowCreateStudioModal(false)}
              className="absolute top-5 right-5 p-2 text-neutral-400 hover:text-neutral-900 rounded-full hover:bg-neutral-100 cursor-pointer"
            >
              <XCircle className="h-5 w-5" />
            </button>

            <h2 className="text-lg font-serif font-bold text-neutral-900">Register New Studio Client</h2>
            <form onSubmit={handleCreateStudioSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-neutral-800 mb-1">Studio Name</label>
                <input
                  type="text"
                  required
                  value={newStudioName}
                  onChange={(e) => setNewStudioName(e.target.value)}
                  placeholder="e.g. Royal Wedding Photography"
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-800 mb-1">Owner Full Name</label>
                <input
                  type="text"
                  required
                  value={newOwnerName}
                  onChange={(e) => setNewOwnerName(e.target.value)}
                  placeholder="e.g. Vikram Sharma"
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-800 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="vikram@royalweddings.com"
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-800 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-800 mb-1">Initial Subscription Plan</label>
                <select
                  value={newPlan}
                  onChange={(e) => setNewPlan(e.target.value as any)}
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-semibold cursor-pointer"
                >
                  <option value="Basic">Basic Plan (₹299/mo)</option>
                  <option value="Pro">Pro Plan (₹599/mo - Recommended)</option>
                  <option value="Business">Business Plan (₹999/mo)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={creatingStudio}
                className="w-full py-3 bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer mt-2"
              >
                {creatingStudio ? "Registering Studio..." : "Create Studio (Start 7-Day Trial)"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* STUDIO DETAIL MODAL */}
      {selectedStudioId && (
        <StudioDetailModal
          studioId={selectedStudioId}
          onClose={() => setSelectedStudioId(null)}
          onRefreshParent={() => loadAllData(true)}
        />
      )}

      {/* MANUAL UPI PAYMENT MODAL */}
      {showUpiPayModal && (
        <UpiPaymentModal
          onClose={() => setShowUpiPayModal(false)}
          onSuccess={() => loadAllData(true)}
        />
      )}

      {/* SCREENSHOT PROOF VIEWER MODAL */}
      {viewingScreenshotUrl && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-4 relative shadow-2xl space-y-3">
            <button
              onClick={() => setViewingScreenshotUrl(null)}
              className="absolute top-4 right-4 p-2 bg-neutral-900 text-white rounded-full cursor-pointer"
            >
              <XCircle className="h-5 w-5" />
            </button>
            <h3 className="font-serif font-bold text-sm text-neutral-900">Payment Screenshot Proof</h3>
            <img src={viewingScreenshotUrl} alt="Screenshot" className="w-full h-auto max-h-[70vh] object-contain rounded-2xl border" />
          </div>
        </div>
      )}
    </div>
  );
}
