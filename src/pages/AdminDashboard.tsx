import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import { useSettings } from "../context/SettingsContext.js";
import { 
  LogOut, Shield, Clock, Heart, Users, FolderHeart, 
  CheckCircle, Database, ChevronRight, Plus, Search, Calendar,
  Eye, Image, Settings, AlertCircle, HeartHandshake, Sparkles, Download, ArrowRight, FolderDot, BookOpen, Building2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Album } from "../types.js";
import CreateAlbumModal from "../components/CreateAlbumModal.js";
import SettingsPanel from "../components/SettingsPanel.js";

interface SelectionSession {
  key: string;
  albumId: string;
  albumName: string;
  clientEmail: string;
  clientName: string | null;
  selectionDate: string;
  photos: {
    id: string;
    url: string;
    thumbnailUrl?: string | null;
    filename: string;
  }[];
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [allSelections, setAllSelections] = useState<SelectionSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSelections, setIsLoadingSelections] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  // Tab View selection
  const [activeTab, setActiveTab] = useState<"albums" | "curation" | "lifecycle" | "settings">("albums");
  const [albumFilter, setAlbumFilter] = useState<string>("all");
  const [downloadingZipKey, setDownloadingZipKey] = useState<string | null>(null);

  useEffect(() => {
    document.title = `${settings.studioName || "My Studio"} | Admin Console`;
  }, [settings.studioName]);

  // Lifecycle States
  const [lifecycleStats, setLifecycleStats] = useState<any>(null);
  const [loadingLifecycle, setLoadingLifecycle] = useState(false);
  const [evaluatingLifecycle, setEvaluatingLifecycle] = useState(false);

  const fetchLifecycleStats = async () => {
    setLoadingLifecycle(true);
    try {
      const response = await fetch("/api/albums/lifecycle/stats", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setLifecycleStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch lifecycle stats:", err);
    } finally {
      setLoadingLifecycle(false);
    }
  };

  const handleTriggerManualLifecycle = async () => {
    setEvaluatingLifecycle(true);
    try {
      const response = await fetch("/api/albums/lifecycle/evaluate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        alert(data.message || "Lifecycle sweep executed successfully.");
        await fetchLifecycleStats();
        await fetchAlbums();
      } else {
        throw new Error(data.error || "Failed to trigger evaluation.");
      }
    } catch (err: any) {
      alert(err.message || "Error running manual lifecycle cleanup.");
    } finally {
      setEvaluatingLifecycle(false);
    }
  };

  const handleRestoreAlbum = async (albumId: string) => {
    if (!window.confirm("Are you sure you want to restore this album to Active status? This will reset its expiration date.")) return;
    try {
      const response = await fetch(`/api/albums/${albumId}/lifecycle/restore`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        alert(data.message || "Album successfully restored.");
        await fetchLifecycleStats();
        await fetchAlbums();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      alert(err.message || "Failed to restore album.");
    }
  };

  const handleExtendExpiry = async (albumId: string, days: number = 30) => {
    if (!window.confirm(`Are you sure you want to extend this album's expiry by ${days} days?`)) return;
    try {
      const response = await fetch(`/api/albums/${albumId}/lifecycle/extend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ days }),
      });
      const data = await response.json();
      if (response.ok) {
        alert(data.message || `Album extended by ${days} days.`);
        await fetchLifecycleStats();
        await fetchAlbums();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      alert(err.message || "Failed to extend album.");
    }
  };

  const handleArchiveAlbum = async (albumId: string) => {
    if (!window.confirm("Are you sure you want to archive this album manually? It will be set to read-only.")) return;
    try {
      const response = await fetch(`/api/albums/${albumId}/lifecycle/archive`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        alert(data.message || "Album successfully archived.");
        await fetchLifecycleStats();
        await fetchAlbums();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      alert(err.message || "Failed to archive album.");
    }
  };

  const handleDeleteAlbumNow = async (albumId: string) => {
    if (!window.confirm("CRITICAL WARNING: This will permanently delete this album, all selections, all original high-res photos, and all thumbnail image assets, freeing up storage instantly. This is completely irreversible. Are you absolutely sure you want to proceed?")) return;
    try {
      const response = await fetch(`/api/albums/${albumId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        alert(data.message || "Album permanently deleted.");
        await fetchLifecycleStats();
        await fetchAlbums();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      alert(err.message || "Failed to permanently delete album.");
    }
  };

  const handleMarkNotificationRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/albums/lifecycle/notifications/${notificationId}/read`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (response.ok) {
        // Optimistically update notifications in state
        setLifecycleStats((prev: any) => {
          if (!prev) return null;
          return {
            ...prev,
            notifications: prev.notifications.map((n: any) =>
              n.id === notificationId ? { ...n, isRead: true } : n
            ),
          };
        });
      }
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const fetchAlbums = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/albums", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setAlbums(data.albums || []);
      } else {
        throw new Error(data.error || "Failed to load wedding albums.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred fetching albums.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSelections = async () => {
    setIsLoadingSelections(true);
    try {
      const response = await fetch("/api/albums/all-client-selections", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setAllSelections(data.clientSelections || []);
      }
    } catch (err) {
      console.error("Failed to load global curation sessions:", err);
    } finally {
      setIsLoadingSelections(false);
    }
  };

  useEffect(() => {
    fetchAlbums();
    fetchSelections();
  }, []);

  const handleCreateSuccess = (newAlbumId: string) => {
    navigate(`/admin/albums/${newAlbumId}`);
  };

  const handleDownloadZip = async (albumId: string, clientEmail?: string, clientName?: string) => {
    const key = `${albumId}_${clientEmail || "all"}`;
    setDownloadingZipKey(key);
    try {
      const emailQuery = clientEmail ? `?clientEmail=${encodeURIComponent(clientEmail)}` : "";
      const response = await fetch(`/api/albums/${albumId}/selections/download-zip${emailQuery}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to generate and download selection ZIP.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      const suffix = clientName ? `_${clientName.replace(/\s+/g, "_")}` : "";
      link.setAttribute("download", `selections_${albumId}${suffix}.zip`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err: any) {
      alert(err.message || "An error occurred downloading selection ZIP.");
    } finally {
      setDownloadingZipKey(null);
    }
  };

  // Calculate statistics
  const totalAlbums = albums.length;
  const totalPhotos = albums.reduce((sum, album) => sum + (album.photoCount || 0), 0);
  const activeLinks = albums.filter((album) => album.isActive).length;
  const activeSelectionsCount = allSelections.length;

  const filteredAlbums = albums.filter((album) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      album.brideName.toLowerCase().includes(searchLower) ||
      album.groomName.toLowerCase().includes(searchLower) ||
      album.eventName.toLowerCase().includes(searchLower)
    );
  });

  const filteredSelections = allSelections.filter((sel) => {
    if (albumFilter !== "all" && sel.albumId !== albumFilter) {
      return false;
    }
    const searchLower = searchQuery.toLowerCase();
    if (searchLower) {
      return (
        (sel.clientName && sel.clientName.toLowerCase().includes(searchLower)) ||
        sel.clientEmail.toLowerCase().includes(searchLower) ||
        sel.albumName.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-gray-900 animate-fade-in" id="admin-dashboard-root">
      {/* Premium Top Navigation Bar */}
      <header className="border-b border-neutral-200/60 bg-white/80 backdrop-blur-md sticky top-0 z-45">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {(settings.logoUrl?.trim() || settings.studioLogo?.trim()) ? (
              <img src={settings.logoUrl?.trim() || settings.studioLogo?.trim()} alt="logo" className="h-9 object-contain rounded" />
            ) : (
              <div className="h-9 w-9 rounded-full border border-[#D4AF37]/50 flex items-center justify-center bg-neutral-900">
                <Shield className="h-4.5 w-4.5 text-[#D4AF37]" />
              </div>
            )}
            <div>
              <span className="font-sans font-semibold tracking-widest text-xs uppercase block text-neutral-900 leading-none">
                {settings.studioName || "My Studio"}
              </span>
              <span className="font-mono text-[9px] tracking-wider text-[#C4A484] uppercase mt-1 block">
                ADMIN CONSOLE
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <span className="text-xs font-medium text-neutral-900 block leading-none">{user?.name}</span>
              <span className="text-[10px] font-mono text-neutral-400 uppercase mt-0.5 block">{user?.role}</span>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={logout}
              className="p-2 text-neutral-500 hover:text-neutral-950 hover:bg-neutral-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-neutral-200 flex items-center gap-2 text-xs uppercase tracking-wider font-semibold font-sans"
            >
              <LogOut className="h-4 w-4 text-rose-500" />
              <span className="hidden sm:inline">Logout</span>
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-light text-neutral-900 tracking-wide">
              {settings.studioName || "My Studio"}
            </h1>
            <p className="text-neutral-500 font-sans font-light text-sm mt-1">
              Photographer Administrator: <strong className="text-neutral-700">{user?.name}</strong>
            </p>
          </div>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="self-start md:self-auto py-2.5 px-5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold uppercase tracking-widest flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <Plus className="h-4.5 w-4.5 text-[#D4AF37]" /> Create Wedding Album
          </button>
        </div>

        {/* Dashboard Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Stat Item 1 */}
          <div className="bg-white border border-neutral-200/60 p-6 rounded-2xl relative overflow-hidden group shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono uppercase text-neutral-400 tracking-wider">Active Galleries</span>
              <div className="p-2 bg-neutral-50 text-neutral-900 rounded-lg group-hover:bg-[#D4AF37]/10 transition-colors">
                <FolderHeart className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-serif text-neutral-900">{totalAlbums}</div>
            <span className="text-[10px] text-neutral-400 block mt-2">Unlimited storage allowance</span>
          </div>

          {/* Stat Item 2 */}
          <div className="bg-white border border-neutral-200/60 p-6 rounded-2xl relative overflow-hidden group shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono uppercase text-neutral-400 tracking-wider">Photos Uploaded</span>
              <div className="p-2 bg-neutral-50 text-neutral-950 rounded-lg group-hover:bg-[#D4AF37]/10 transition-colors">
                <Database className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-serif text-neutral-900">{totalPhotos}</div>
            <span className="text-[10px] text-neutral-400 block mt-2">High-resolution catalogued</span>
          </div>

          {/* Stat Item 3 */}
          <div className="bg-white border border-neutral-200/60 p-6 rounded-2xl relative overflow-hidden group shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono uppercase text-neutral-400 tracking-wider">Online Portals</span>
              <div className="p-2 bg-neutral-50 text-[#D4AF37] rounded-lg group-hover:bg-[#D4AF37]/10 transition-colors">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-serif text-neutral-900">{activeLinks}</div>
            <span className="text-[10px] text-neutral-400 block mt-2">Currently active client links</span>
          </div>

          {/* Stat Item 4 */}
          <div className="bg-white border border-neutral-200/60 p-6 rounded-2xl relative overflow-hidden group shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono uppercase text-neutral-400 tracking-wider">Curation Hub</span>
              <div className="p-2 bg-neutral-50 text-neutral-900 rounded-lg group-hover:bg-rose-50 transition-colors">
                <Heart className="h-4 w-4 text-rose-500" />
              </div>
            </div>
            <div className="text-3xl font-serif text-neutral-900">{activeSelectionsCount}</div>
            <span className="text-[10px] text-neutral-400 block mt-2">Active client selection portfolios</span>
          </div>
        </div>

        {/* Dashboard Workspaces Tabs */}
        <div className="border-b border-neutral-200/60 mb-8 flex gap-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab("albums")}
            className={`pb-4 text-sm font-sans font-medium transition-all relative shrink-0 cursor-pointer ${
              activeTab === "albums"
                ? "text-neutral-900 border-b-2 border-neutral-900"
                : "text-neutral-400 hover:text-neutral-900"
            }`}
          >
            Wedding Collections ({albums.length})
          </button>
          <Link
            to="/admin/proofing"
            className="pb-4 text-sm font-sans font-bold transition-all relative shrink-0 flex items-center gap-1.5 text-amber-700 hover:text-amber-900 border-b-2 border-transparent hover:border-amber-500 cursor-pointer"
          >
            <BookOpen className="h-4 w-4 text-[#D4AF37]" />
            <span>📖 Album Proofing</span>
          </Link>
          <Link
            to="/admin/wedding-crew"
            className="pb-4 text-sm font-sans font-bold transition-all relative shrink-0 flex items-center gap-1.5 text-amber-800 hover:text-amber-950 border-b-2 border-transparent hover:border-amber-600 cursor-pointer"
          >
            <Users className="h-4 w-4 text-amber-600" />
            <span>👥 Wedding Crew</span>
          </Link>
          <Link
            to="/admin/studio-clients"
            className="pb-4 text-sm font-sans font-bold transition-all relative shrink-0 flex items-center gap-1.5 text-neutral-900 hover:text-black border-b-2 border-transparent hover:border-[#D4AF37] cursor-pointer"
          >
            <Building2 className="h-4 w-4 text-[#D4AF37]" />
            <span>🏢 Studio Clients</span>
            <span className="bg-[#D4AF37] text-neutral-950 text-[9px] font-mono px-1.5 py-0.5 rounded-full font-bold uppercase">
              NEW
            </span>
          </Link>
          <button
            onClick={() => { setActiveTab("curation"); fetchSelections(); }}
            className={`pb-4 text-sm font-sans font-medium transition-all relative shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeTab === "curation"
                ? "text-rose-600 border-b-2 border-rose-500"
                : "text-neutral-400 hover:text-neutral-900"
            }`}
          >
            <Heart className={`h-4 w-4 ${activeTab === "curation" ? "fill-current text-rose-500" : ""}`} />
            <span>Curation Hub ({allSelections.length})</span>
          </button>
          <button
            onClick={() => { setActiveTab("lifecycle"); fetchLifecycleStats(); }}
            className={`pb-4 text-sm font-sans font-medium transition-all relative flex items-center gap-1.5 cursor-pointer ${
              activeTab === "lifecycle"
                ? "text-[#D4AF37] border-b-2 border-[#D4AF37]"
                : "text-neutral-400 hover:text-neutral-900"
            }`}
          >
            <Clock className="h-4 w-4 text-[#D4AF37]" />
            <span>Album Lifecycles</span>
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`pb-4 text-sm font-sans font-medium transition-all relative flex items-center gap-1.5 cursor-pointer ${
              activeTab === "settings"
                ? "text-neutral-900 border-b-2 border-neutral-900"
                : "text-neutral-400 hover:text-neutral-900"
            }`}
          >
            <Settings className="h-4 w-4 text-neutral-400" />
            <span>Settings</span>
          </button>
        </div>

        {/* Dynamic Workspace Panel */}
        <AnimatePresence mode="wait">
          {activeTab === "albums" ? (
            /* Tab 1: Wedding Albums List */
            <motion.div
              key="albums-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-serif text-neutral-900 tracking-wide">
                    Bespoke Client Portfolios
                  </h2>
                  <p className="text-xs text-neutral-500 font-light mt-0.5">
                    Configure upload workflows, create galleries, generate QR tags, and track active statuses.
                  </p>
                </div>

                {/* Search */}
                <div className="relative w-full sm:w-80">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                    <Search className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by couples, events..."
                    className="w-full pl-9 pr-4 py-2 bg-white border border-neutral-200 rounded-xl text-xs font-sans text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-800 transition-colors shadow-sm"
                  />
                </div>
              </div>

              {isLoading ? (
                <div className="p-12 text-center">
                  <div className="h-8 w-8 rounded-full border-2 border-[#D4AF37]/20 border-t-[#D4AF37] animate-spin mx-auto mb-4" />
                  <span className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase">Synchronizing Collections...</span>
                </div>
              ) : filteredAlbums.length === 0 ? (
                <div className="bg-white border border-neutral-200/60 p-16 text-center rounded-2xl max-w-3xl mx-auto">
                  <Sparkles className="h-10 w-10 text-[#D4AF37] mx-auto mb-4 animate-pulse" />
                  <h3 className="text-sm font-semibold text-neutral-800">No wedding galleries found</h3>
                  <p className="text-xs text-neutral-400 font-light mt-1 max-w-xs mx-auto leading-relaxed">
                    {searchQuery ? "No portfolios match your query." : "Let's create your first wedding album workflow."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredAlbums.map((album) => (
                    <div
                      key={album.id}
                      className="bg-white border border-neutral-200/60 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col group"
                    >
                      <div className="h-48 bg-neutral-100 relative overflow-hidden flex items-center justify-center shrink-0 border-b border-neutral-100">
                        {album.coverUrl ? (
                          <img
                            src={album.coverUrl}
                            alt="Couples"
                            className="h-full w-full object-cover group-hover:scale-103 transition-transform duration-500"
                          />
                        ) : (
                          <div className="text-center p-6 text-neutral-300">
                            <Image className="h-12 w-12 mx-auto mb-2 text-neutral-200" />
                            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">Empty Media Vault</span>
                          </div>
                        )}

                        <div className="absolute top-4 left-4 flex flex-col gap-1.5">
                          <span className="bg-black/60 backdrop-blur-sm text-[#D4AF37] text-[9px] font-mono tracking-widest uppercase px-2.5 py-0.5 rounded-full border border-[#D4AF37]/20">
                            {album.eventName}
                          </span>
                          {!album.isActive && (
                            <span className="bg-rose-600 text-white text-[9px] font-mono tracking-widest uppercase px-2.5 py-0.5 rounded-full shadow">
                              Offline
                            </span>
                          )}
                        </div>

                        <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-lg shadow-sm border border-neutral-100 flex items-center gap-1 text-[11px] font-medium text-neutral-800">
                          <Image className="h-3.5 w-3.5 text-[#D4AF37]" />
                          <span>{album.photoCount || 0} Media</span>
                        </div>
                      </div>

                      <div className="p-6 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="text-xl font-serif text-neutral-900 group-hover:text-neutral-950 transition-colors">
                            {album.brideName} & {album.groomName}
                          </h3>

                          <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-mono mt-2">
                            <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                            <span>{new Date(album.weddingDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
                          </div>

                          {album.description && (
                            <p className="text-xs text-neutral-400 font-sans font-light mt-3 line-clamp-2 leading-relaxed">
                              {album.description}
                            </p>
                          )}
                        </div>

                        <div className="border-t border-neutral-100 pt-4 mt-6 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {album.password && (
                              <div className="p-1 bg-amber-50 text-amber-700 rounded border border-amber-100" title="Passcode Locked">
                                <Clock className="h-3.5 w-3.5 text-[#D4AF37]" />
                              </div>
                            )}
                            <span className="text-[10px] font-mono text-neutral-400 uppercase">
                              STUDIO PORTFOLIO
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Link
                              to={`/admin/albums/${album.id}/proofing`}
                              className="inline-flex items-center gap-1 py-1.5 px-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-stone-900 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                              title="Album Proofing & Flipbook"
                            >
                              <BookOpen className="h-3.5 w-3.5 text-[#D4AF37]" /> Proofing
                            </Link>

                            <Link
                              to={`/admin/albums/${album.id}`}
                              className="inline-flex items-center gap-1.5 py-1.5 px-3.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                            >
                              Workspace <ChevronRight className="h-3.5 w-3.5 text-[#D4AF37]" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : activeTab === "curation" ? (
            /* Tab 2: Client selections curation center */
            <motion.div
              key="curation-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-lg font-serif text-neutral-900 tracking-wide flex items-center gap-2">
                    <HeartHandshake className="h-5 w-5 text-rose-500 fill-rose-50" /> Client Curation Center
                  </h2>
                  <p className="text-xs text-neutral-500 font-light mt-0.5">
                    View real-time favorite lists compiled by your clients, verify submit timestamps, and packaging high-res selects.
                  </p>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Select Dropdown to Filter selections by Wedding Collection */}
                  <div className="relative">
                    <select
                      value={albumFilter}
                      onChange={(e) => setAlbumFilter(e.target.value)}
                      className="w-full sm:w-60 px-3.5 py-2 bg-white border border-neutral-200 rounded-xl text-xs font-sans text-neutral-800 focus:outline-none focus:border-neutral-950 shadow-sm"
                    >
                      <option value="all">All Wedding Collections</option>
                      {albums.map((album) => (
                        <option key={album.id} value={album.id}>
                          {album.brideName} & {album.groomName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Search client input */}
                  <div className="relative w-full sm:w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                      <Search className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search client email or name..."
                      className="w-full pl-9 pr-4 py-2 bg-white border border-neutral-200 rounded-xl text-xs font-sans text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-800 transition-colors shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {isLoadingSelections ? (
                <div className="p-12 text-center">
                  <div className="h-8 w-8 rounded-full border-2 border-rose-200 border-t-rose-500 animate-spin mx-auto mb-4" />
                  <span className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase">Indexing Favorites...</span>
                </div>
              ) : filteredSelections.length === 0 ? (
                <div className="bg-white border border-neutral-200/60 p-16 text-center rounded-2xl max-w-xl mx-auto shadow-sm">
                  <Heart className="h-10 w-10 text-neutral-200 mx-auto mb-4" />
                  <h3 className="text-sm font-semibold text-neutral-800">No client selections indexed</h3>
                  <p className="text-xs text-neutral-400 font-light mt-1 max-w-xs mx-auto leading-relaxed">
                    {searchQuery || albumFilter !== "all"
                      ? "No curated portfolios match your active filters."
                      : "Once couples begin favoriting portraits via their private link, selection records and ZIP packages will appear in this hub."}
                  </p>
                </div>
              ) : (
                /* Curated List cards */
                <div className="space-y-8">
                  {filteredSelections.map((sel) => (
                    <div
                      key={sel.key}
                      className="bg-white border border-neutral-200/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-neutral-100 pb-5 mb-5">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-serif font-semibold text-neutral-900">
                              {sel.clientName || "Unnamed Curator"}
                            </h3>
                            <span className="text-[10px] font-mono bg-rose-50 text-rose-600 px-2.5 py-0.5 rounded-full border border-rose-100 uppercase tracking-wider">
                              {sel.photos.length} Selected
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-neutral-500 font-sans mt-2">
                            <span className="font-medium text-neutral-700">{sel.clientEmail}</span>
                            <span className="text-neutral-300">|</span>
                            <span className="flex items-center gap-1">
                              <FolderDot className="h-3.5 w-3.5 text-[#D4AF37]" />
                              Gallery: <strong className="text-neutral-800">{sel.albumName}</strong>
                            </span>
                            <span className="text-neutral-300">|</span>
                            <span className="flex items-center gap-1 font-mono text-[11px]">
                              <Clock className="h-3.5 w-3.5 text-neutral-400" />
                              Latest select: {new Date(sel.selectionDate).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                            </span>
                          </div>
                        </div>

                        {/* ZIP Packaging Download Action */}
                        <button
                          onClick={() => handleDownloadZip(sel.albumId, sel.clientEmail, sel.clientName || "photos")}
                          disabled={downloadingZipKey === `${sel.albumId}_${sel.clientEmail}`}
                          className="py-2.5 px-4 bg-neutral-950 hover:bg-neutral-800 disabled:bg-neutral-300 text-white font-bold text-xs uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer self-start lg:self-auto"
                        >
                          {downloadingZipKey === `${sel.albumId}_${sel.clientEmail}` ? (
                            <>
                              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>Zipping Selects...</span>
                            </>
                          ) : (
                            <>
                              <Download className="h-4 w-4 text-[#D4AF37]" />
                              <span>Download ZIP ({sel.photos.length} files)</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Selected Images List */}
                      <div>
                        <h4 className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest mb-3">
                          Selected Photographic Strip
                        </h4>
                        
                        {/* Horizontal Image Scroll preview */}
                        <div className="flex gap-4 overflow-x-auto pb-3 pt-1 scrollbar-thin scrollbar-thumb-neutral-200">
                          {sel.photos.map((photo) => (
                            <div
                              key={photo.id}
                              className="w-28 h-28 rounded-xl border border-neutral-200 overflow-hidden shrink-0 bg-neutral-50 relative group"
                            >
                              <img
                                src={photo.thumbnailUrl || photo.url}
                                alt={photo.filename}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                <span className="text-[9px] text-white font-mono text-center px-1 truncate w-full">
                                  {photo.filename}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : activeTab === "lifecycle" ? (
            /* Tab 4: Album Lifecycle Management System */
            <motion.div
              key="lifecycle-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {/* Lifecycle Dashboard Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-xl font-serif text-neutral-900 tracking-wide flex items-center gap-2">
                    <Clock className="h-5 w-5 text-[#D4AF37]" /> Album Lifecycle Management System
                  </h2>
                  <p className="text-xs text-neutral-500 font-light mt-0.5">
                    Monitor album retention windows, manage expirations, trace deleted archives, and perform system cleanups.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase">
                    Auto-sweep daily 2:00 AM
                  </span>
                  <button
                    onClick={handleTriggerManualLifecycle}
                    disabled={evaluatingLifecycle}
                    className="py-2 px-4 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-200 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer border border-transparent"
                  >
                    {evaluatingLifecycle ? (
                      <>
                        <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Sweeping...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5 text-[#D4AF37]" />
                        <span>Trigger Manual Sweep</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {loadingLifecycle && !lifecycleStats ? (
                <div className="p-12 text-center">
                  <div className="h-8 w-8 rounded-full border-2 border-[#D4AF37]/20 border-t-[#D4AF37] animate-spin mx-auto mb-4" />
                  <span className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase">Analyzing System Lifecycles...</span>
                </div>
              ) : !lifecycleStats ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-neutral-100">
                  <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-neutral-800">Failed to load statistics</h3>
                  <p className="text-xs text-neutral-400 mt-1">Please try refreshing the page or checking your server connection.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Micro Statistics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white border border-neutral-200/60 p-4.5 rounded-xl shadow-sm">
                      <span className="text-[10px] font-mono text-neutral-400 uppercase block">Active Collections</span>
                      <div className="text-2xl font-serif text-neutral-800 mt-1">{lifecycleStats.activeAlbumsCount}</div>
                    </div>
                    <div className="bg-white border border-neutral-200/60 p-4.5 rounded-xl shadow-sm">
                      <span className="text-[10px] font-mono text-neutral-400 uppercase block">Expired (Read-Only)</span>
                      <div className="text-2xl font-serif text-[#C4A484] mt-1">{lifecycleStats.expiredAlbumsCount}</div>
                    </div>
                    <div className="bg-white border border-neutral-200/60 p-4.5 rounded-xl shadow-sm">
                      <span className="text-[10px] font-mono text-neutral-400 uppercase block font-medium">Grace Period (Days 30-37)</span>
                      <div className="text-2xl font-serif text-rose-500 mt-1">{lifecycleStats.gracePeriodAlbumsCount}</div>
                    </div>
                    <div className="bg-white border border-neutral-200/60 p-4.5 rounded-xl shadow-sm">
                      <span className="text-[10px] font-mono text-neutral-400 uppercase block">Storage Pending Purge</span>
                      <div className="text-2xl font-serif text-neutral-800 mt-1">
                        {formatBytes(lifecycleStats.storageToFree)}
                      </div>
                    </div>
                  </div>

                  {/* Main Grid: Left Expired, Right Alerts & Deleted logs */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column (2 cols width on desktop): Active Expired & Grace Period albums */}
                    <div className="lg:col-span-2 space-y-6">
                      <div className="bg-white border border-neutral-200/60 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-sm font-serif font-semibold text-neutral-900 mb-4 flex items-center gap-1.5">
                          <AlertCircle className="h-4.5 w-4.5 text-rose-500" /> Expired & Grace Period Wedding Galleries ({lifecycleStats.expiredAlbums.length})
                        </h3>

                        {lifecycleStats.expiredAlbums.length === 0 ? (
                          <div className="text-center py-12">
                            <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                            <h4 className="text-xs font-semibold text-neutral-800">All collections are active and protected</h4>
                            <p className="text-[11px] text-neutral-400 mt-1">No albums have reached their retention limit or grace window yet.</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-neutral-100">
                            {lifecycleStats.expiredAlbums.map((album: any) => {
                              const exp = new Date(album.expiryDate);
                              return (
                                <div key={album.id} className="py-4.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                  <div className="space-y-1">
                                    <h4 className="text-sm font-serif font-medium text-neutral-900">
                                      {album.brideName} & {album.groomName}
                                    </h4>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
                                      <span>Event: <strong>{album.eventName}</strong></span>
                                      <span>•</span>
                                      <span>Images: <strong>{album.photoCount}</strong></span>
                                      <span>•</span>
                                      <span>Storage: <strong>{formatBytes(album.storageSize)}</strong></span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1.5">
                                      <span className="text-[10px] font-mono bg-rose-50 text-rose-600 px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" /> Expired {exp.toLocaleDateString()}
                                      </span>
                                      {album.daysToDeletion <= 0 ? (
                                        <span className="text-[10px] font-mono bg-rose-600 text-white px-2.5 py-0.5 rounded-full font-bold uppercase animate-pulse">
                                          Queued for Purge
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-mono bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full font-medium">
                                          Purging in {album.daysToDeletion} days
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                                    <button
                                      onClick={() => handleRestoreAlbum(album.id)}
                                      className="py-1.5 px-3 bg-white border border-neutral-200 hover:border-neutral-900 text-neutral-800 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                                    >
                                      Restore Active
                                    </button>
                                    <button
                                      onClick={() => handleExtendExpiry(album.id, 30)}
                                      className="py-1.5 px-3 bg-neutral-900 hover:bg-neutral-800 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer border border-transparent"
                                    >
                                      +30 Days
                                    </button>
                                    <button
                                      onClick={() => handleDeleteAlbumNow(album.id)}
                                      className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer border border-transparent"
                                    >
                                      Delete Now
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Active Albums Listing under Lifecycle page with Extension Controls */}
                      <div className="bg-white border border-neutral-200/60 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-sm font-serif font-semibold text-neutral-900 mb-4 flex items-center gap-1.5">
                          <CheckCircle className="h-4.5 w-4.5 text-emerald-500" /> Active Wedding Galleries Retention Lifespans ({lifecycleStats.activeAlbums.length})
                        </h3>

                        {lifecycleStats.activeAlbums.length === 0 ? (
                          <div className="text-center py-12 text-neutral-400 text-xs">No active collections found.</div>
                        ) : (
                          <div className="divide-y divide-neutral-100">
                            {lifecycleStats.activeAlbums.map((album: any) => {
                              const exp = album.expiryDate ? new Date(album.expiryDate) : null;
                              return (
                                <div key={album.id} className="py-4.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                  <div className="space-y-1">
                                    <h4 className="text-sm font-serif font-medium text-neutral-900">
                                      {album.brideName} & {album.groomName}
                                    </h4>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
                                      <span>Date: <strong>{new Date(album.weddingDate).toLocaleDateString()}</strong></span>
                                      <span>•</span>
                                      <span>Storage: <strong>{formatBytes(album.storageSize)}</strong></span>
                                      <span>•</span>
                                      <span>Selections: <strong>{album.selectionCount}</strong></span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1.5">
                                      {album.status === "ARCHIVED" ? (
                                        <span className="text-[10px] font-mono bg-neutral-100 text-neutral-600 px-2.5 py-0.5 rounded-full font-medium">
                                          Archived (Read-Only)
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-medium">
                                          Active
                                        </span>
                                      )}
                                      {exp && (
                                        <span className="text-[10px] font-mono text-neutral-400">
                                          Expires: {exp.toLocaleDateString()} ({album.daysRemaining} days left)
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                                    <button
                                      onClick={() => handleExtendExpiry(album.id, 30)}
                                      className="py-1.5 px-3 bg-white border border-neutral-200 hover:border-neutral-900 text-neutral-800 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                                    >
                                      Extend 30d
                                    </button>
                                    {album.status !== "ARCHIVED" && (
                                      <button
                                        onClick={() => handleArchiveAlbum(album.id)}
                                        className="py-1.5 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer border border-transparent"
                                      >
                                        Archive Album
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Alerts & Deletion logs */}
                    <div className="space-y-6">
                      {/* Active Admin Alerts Center */}
                      <div className="bg-white border border-neutral-200/60 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-sm font-serif font-semibold text-neutral-900 mb-4 flex items-center justify-between">
                          <span>Live Admin Alerts Center</span>
                          <span className="text-[10px] font-mono bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full uppercase">
                            {lifecycleStats.notifications.filter((n: any) => !n.isRead).length} Unread
                          </span>
                        </h3>

                        {lifecycleStats.notifications.length === 0 ? (
                          <div className="text-center py-8 text-neutral-400 text-xs">No alerts compiled.</div>
                        ) : (
                          <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1">
                            {lifecycleStats.notifications.map((n: any) => (
                              <div key={n.id} className={`p-3 rounded-xl border text-xs transition-all relative ${
                                n.isRead 
                                  ? "bg-neutral-50 border-neutral-100 text-neutral-500" 
                                  : "bg-[#FBFBFA] border-amber-100 text-neutral-800 shadow-sm"
                              }`}>
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                  <span className="font-semibold text-[10px] font-mono tracking-wide text-neutral-500 uppercase">
                                    {n.albumName}
                                  </span>
                                  {!n.isRead && (
                                    <button
                                      onClick={() => handleMarkNotificationRead(n.id)}
                                      className="text-[9px] font-mono font-bold uppercase text-emerald-600 hover:text-emerald-700 cursor-pointer"
                                    >
                                      Mark Read
                                    </button>
                                  )}
                                </div>
                                <p className="leading-relaxed font-sans">{n.message}</p>
                                <span className="text-[9px] font-mono text-neutral-400 block mt-2">
                                  {new Date(n.createdAt).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Permanently Deleted Log */}
                      <div className="bg-white border border-neutral-200/60 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-sm font-serif font-semibold text-neutral-900 mb-4 flex items-center gap-1.5">
                          <FolderDot className="h-4 w-4 text-neutral-500" /> Permanently Deleted Archives ({lifecycleStats.deletedAlbums.length})
                        </h3>

                        {lifecycleStats.deletedAlbums.length === 0 ? (
                          <div className="text-center py-8 text-neutral-400 text-xs">No records deleted yet.</div>
                        ) : (
                          <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                            {lifecycleStats.deletedAlbums.map((album: any) => (
                              <div key={album.id} className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 text-xs space-y-1.5 font-sans">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-semibold font-serif text-neutral-800">
                                    {album.brideName} & {album.groomName}
                                  </h4>
                                  <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold">
                                    {formatBytes(album.freedStorage)} Freed
                                  </span>
                                </div>
                                <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
                                  <span>Photos: {album.photosCount} • Selections: {album.selectionsCount}</span>
                                  <span>Deleted: {new Date(album.deletedAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            /* Tab 3: Complete Settings Panel */
            <motion.div
              key="settings-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <SettingsPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Creation Modal */}
      <CreateAlbumModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
