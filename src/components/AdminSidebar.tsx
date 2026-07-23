import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import { useSettings } from "../context/SettingsContext.js";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  UserCheck,
  Building2,
  CreditCard,
  IndianRupee,
  BarChart3,
  HardDrive,
  Settings,
  LogOut,
  ShieldAlert,
  ChevronRight,
  Menu,
  X,
  Sparkles,
  ArrowLeftRight,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AdminSidebarProps {
  currentTab?: string;
}

export default function AdminSidebar({ currentTab }: AdminSidebarProps) {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isSuperAdmin = true; // Super Admin access enabled for administrative control
  const impersonationToken = localStorage.getItem("impersonation_token");

  const navItems = [
    {
      name: "Dashboard",
      path: "/admin",
      icon: LayoutDashboard,
      active: location.pathname === "/admin" && !location.search.includes("tab="),
    },
    {
      name: "Clients",
      path: "/admin?tab=curation",
      icon: Users,
      active: location.pathname === "/admin" && location.search.includes("tab=curation"),
    },
    {
      name: "Album Proofing",
      path: "/admin/proofing",
      icon: BookOpen,
      active: location.pathname.startsWith("/admin/proofing"),
    },
    {
      name: "Wedding Crew",
      path: "/admin/wedding-crew",
      icon: UserCheck,
      active: location.pathname.startsWith("/admin/wedding-crew"),
    },
    {
      name: "Studio Clients",
      path: "/admin/studio-clients",
      icon: Building2,
      active: location.pathname === "/admin/studio-clients" && (!currentTab || currentTab === "overview" || currentTab === "studios"),
      badge: "NEW",
    },
    {
      name: "Subscriptions",
      path: "/admin/studio-clients?tab=subscriptions",
      icon: CreditCard,
      active: location.pathname === "/admin/studio-clients" && currentTab === "subscriptions",
    },
    {
      name: "Payments",
      path: "/admin/studio-clients?tab=payments",
      icon: IndianRupee,
      active: location.pathname === "/admin/studio-clients" && currentTab === "payments",
    },
    {
      name: "Analytics",
      path: "/admin/studio-clients?tab=analytics",
      icon: BarChart3,
      active: location.pathname === "/admin/studio-clients" && currentTab === "analytics",
    },
    {
      name: "Storage",
      path: "/admin/studio-clients?tab=storage",
      icon: HardDrive,
      active: location.pathname === "/admin/studio-clients" && currentTab === "storage",
    },
    {
      name: "Settings",
      path: "/admin?tab=settings",
      icon: Settings,
      active: (location.pathname === "/admin" && location.search.includes("tab=settings")) || (location.pathname === "/admin/studio-clients" && currentTab === "settings"),
    },
  ];

  const handleExitImpersonation = () => {
    localStorage.removeItem("impersonation_token");
    const origToken = localStorage.getItem("super_admin_orig_token");
    if (origToken) {
      localStorage.setItem("token", origToken);
      localStorage.removeItem("super_admin_orig_token");
    }
    window.location.href = "/admin/studio-clients";
  };

  return (
    <>
      {/* Mobile Header Toggle */}
      <div className="lg:hidden bg-neutral-900 border-b border-neutral-800 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-[#D4AF37] to-amber-200 flex items-center justify-center text-neutral-950 font-bold text-xs shadow-md">
            📸
          </div>
          <span className="font-serif text-sm font-semibold text-neutral-100 truncate max-w-[180px]">
            {settings.studioName || "Studio Admin"}
          </span>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-neutral-400 hover:text-white rounded-lg border border-neutral-800 bg-neutral-950/50 cursor-pointer"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Impersonation Warning Banner */}
      {impersonationToken && (
        <div className="bg-amber-500 text-neutral-950 px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-md z-50 sticky top-0">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-neutral-950 animate-pulse" />
            <span>
              <strong>SUPER ADMIN IMPERSONATION MODE ACTIVE:</strong> You are temporarily managing this Studio Client dashboard.
            </span>
          </div>
          <button
            onClick={handleExitImpersonation}
            className="py-1 px-3 bg-neutral-950 hover:bg-neutral-800 text-white rounded-lg text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
          >
            <ArrowLeftRight className="h-3 w-3" /> Exit Impersonation
          </button>
        </div>
      )}

      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Main Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-neutral-950 border-r border-neutral-800/80 flex flex-col justify-between transition-transform duration-300 ease-in-out shrink-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Top Studio Brand */}
        <div>
          <div className="p-6 border-b border-neutral-800/80 flex items-center justify-between">
            <Link to="/admin" className="flex items-center gap-3 group">
              {settings.studioLogo?.trim() ? (
                <img
                  src={settings.studioLogo.trim()}
                  alt="Studio Logo"
                  className="h-10 w-10 object-contain rounded-xl bg-neutral-900 p-1 border border-neutral-800"
                />
              ) : (
                <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#D4AF37] to-amber-200 flex items-center justify-center text-neutral-950 font-bold text-sm shadow-md group-hover:scale-105 transition-transform">
                  📸
                </div>
              )}
              <div className="overflow-hidden">
                <span className="font-serif text-sm font-semibold text-neutral-100 block truncate group-hover:text-[#D4AF37] transition-colors">
                  {settings.studioName || "Studio Admin"}
                </span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block">
                  Studio Portal
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Link List */}
          <nav className="px-3 py-6 space-y-1 overflow-y-auto max-h-[calc(100vh-210px)] scrollbar-thin scrollbar-thumb-neutral-800">
            <div className="px-3 mb-2 text-[10px] font-mono uppercase tracking-widest text-neutral-400">
              Core Modules
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group cursor-pointer ${
                    item.active
                      ? "bg-[#D4AF37] text-neutral-950 font-semibold shadow-md shadow-[#D4AF37]/10"
                      : "text-neutral-400 hover:text-white hover:bg-neutral-900/80"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`h-4 w-4 transition-colors ${
                        item.active ? "text-neutral-950" : "text-neutral-400 group-hover:text-[#D4AF37]"
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>

                  {item.badge ? (
                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${
                        item.active
                          ? "bg-neutral-950 text-[#D4AF37]"
                          : "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30"
                      }`}
                    >
                      {item.badge}
                    </span>
                  ) : (
                    <ChevronRight
                      className={`h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity ${
                        item.active ? "opacity-100 text-neutral-950" : "text-neutral-600"
                      }`}
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Info & Logout */}
        <div className="p-4 border-t border-neutral-800/80 bg-neutral-950">
          <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="h-8 w-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {user?.name?.[0]?.toUpperCase() || "A"}
              </div>
              <div className="truncate">
                <span className="text-xs font-medium text-neutral-200 block truncate leading-none">
                  {user?.name || "Super Admin"}
                </span>
                <span className="text-[9px] font-mono text-[#D4AF37] uppercase tracking-wider block mt-1">
                  Super Admin
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
