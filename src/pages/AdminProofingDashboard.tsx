import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Heart,
  User,
  Sparkles,
  Send,
  CheckCircle2,
  Clock,
  ArrowRight,
  Layers,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Plus
} from "lucide-react";
import { AlbumProofingData, ProofingStatus } from "../types/proofing.js";
import { authFetch } from "../context/AuthContext.js";

interface AlbumOption {
  id: string;
  title: string;
  clientName: string;
  weddingDate?: string;
}

export default function AdminProofingDashboard() {
  const navigate = useNavigate();
  const [albums, setAlbums] = useState<AlbumOption[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>("");
  const [proofingData, setProofingData] = useState<AlbumProofingData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. Fetch available wedding albums
  useEffect(() => {
    async function loadAlbums() {
      try {
        const res = await authFetch("/api/albums");
        const data = await res.json();
        const albumList = data.albums || [];
        setAlbums(albumList);
        if (albumList.length > 0) {
          setSelectedAlbumId(albumList[0].id);
        } else {
          // Default fallback album ID
          setSelectedAlbumId("default-wedding-album");
        }
      } catch (err) {
        console.warn("Using default album context:", err);
        setSelectedAlbumId("default-wedding-album");
      }
    }
    loadAlbums();
  }, []);

  // 2. Fetch proofing data when album is selected
  useEffect(() => {
    if (!selectedAlbumId) return;
    async function loadProofing() {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const res = await authFetch(`/api/proofing/${selectedAlbumId}`);
        const result = await res.json();
        if (result.success && result.data) {
          setProofingData(result.data);
        }
      } catch (err: any) {
        setErrorMsg("Failed to load proofing data.");
      } finally {
        setIsLoading(false);
      }
    }
    loadProofing();
  }, [selectedAlbumId]);

  const activeAlbum = albums.find((a) => a.id === selectedAlbumId) || {
    id: selectedAlbumId,
    title: "Curated Luxury Wedding Album",
    clientName: "Bride & Groom"
  };

  const getBrideVersion = () => {
    if (!proofingData) return null;
    return proofingData.versions.find((v) => v.side === "BRIDE" && v.id === proofingData.activeBrideVersionId) ||
      proofingData.versions.filter((v) => v.side === "BRIDE").pop();
  };

  const getGroomVersion = () => {
    if (!proofingData) return null;
    return proofingData.versions.find((v) => v.side === "GROOM" && v.id === proofingData.activeGroomVersionId) ||
      proofingData.versions.filter((v) => v.side === "GROOM").pop();
  };

  const brideVer = getBrideVersion();
  const groomVer = getGroomVersion();

  const getStatusBadgeClass = (status: ProofingStatus) => {
    switch (status) {
      case "Approved":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "Waiting Client":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      case "Correction Pending":
        return "bg-rose-500/20 text-rose-300 border-rose-500/30";
      case "Print Ready":
      case "Delivered":
        return "bg-purple-500/20 text-purple-300 border-purple-500/30";
      default:
        return "bg-stone-800 text-stone-300 border-stone-700";
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 p-6 md:p-10 font-sans">
      {/* Top Header */}
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-stone-800/80 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-stone-950 flex items-center justify-center font-bold text-lg shadow-lg">
                📖
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                Album Proofing Workspace
              </h1>
            </div>
            <p className="text-stone-400 text-xs md:text-sm pl-13">
              Manage Bride & Groom side 12×36 album spreads, version control, client comments, and approvals.
            </p>
          </div>

          {/* Album Selector */}
          <div className="flex items-center gap-3 bg-stone-900/80 p-2 rounded-2xl border border-stone-800">
            <span className="text-xs font-semibold text-stone-400 pl-2">Active Album:</span>
            <select
              value={selectedAlbumId}
              onChange={(e) => setSelectedAlbumId(e.target.value)}
              className="bg-stone-950 text-stone-100 border border-stone-800 text-xs rounded-xl px-3 py-2 font-bold focus:outline-none focus:border-amber-400"
            >
              {albums.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title} ({a.clientName})
                </option>
              ))}
              {albums.length === 0 && (
                <option value="default-wedding-album">Default Wedding Album</option>
              )}
            </select>
          </div>
        </div>

        {/* Main Content */}
        {isLoading ? (
          <div className="bg-stone-900/40 border border-stone-800 rounded-2xl p-16 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
            <p className="text-stone-300 text-sm font-semibold">Loading Proofing Control Center...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Cards Grid: Bride Side Album & Groom Side Album */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* 📕 Bride Side Album Card */}
              <div
                onClick={() => navigate(`/admin/albums/${selectedAlbumId}/proofing?side=BRIDE`)}
                className="group cursor-pointer bg-stone-900/60 hover:bg-stone-900 backdrop-blur-2xl border border-stone-800 hover:border-amber-400/80 rounded-3xl p-8 shadow-2xl transition-all duration-300 flex flex-col justify-between space-y-6 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl group-hover:bg-amber-400/10 transition-all pointer-events-none" />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">📕</span>
                      <div>
                        <h2 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors">
                          Bride Side Album
                        </h2>
                        <p className="text-xs text-stone-400">Custom 12×36 Spreads Curation</p>
                      </div>
                    </div>

                    <span
                      className={`text-xs font-mono font-semibold px-3 py-1 rounded-full border ${getStatusBadgeClass(
                        proofingData?.brideStatus || "Design Started"
                      )}`}
                    >
                      {proofingData?.brideStatus || "Design Started"}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-stone-800/80 text-xs">
                    <div className="bg-stone-950/60 p-3 rounded-2xl border border-stone-800/60">
                      <span className="text-stone-500 block text-[10px] uppercase tracking-wider font-semibold">
                        Version
                      </span>
                      <span className="text-stone-100 font-bold font-mono text-sm">
                        {brideVer ? `V${brideVer.versionNumber}` : "V1 (Draft)"}
                      </span>
                    </div>

                    <div className="bg-stone-950/60 p-3 rounded-2xl border border-stone-800/60">
                      <span className="text-stone-500 block text-[10px] uppercase tracking-wider font-semibold">
                        Total Spreads
                      </span>
                      <span className="text-stone-100 font-bold font-mono text-sm">
                        {brideVer ? brideVer.spreads.length : 0} Spreads
                      </span>
                    </div>

                    <div className="bg-stone-950/60 p-3 rounded-2xl border border-stone-800/60">
                      <span className="text-stone-500 block text-[10px] uppercase tracking-wider font-semibold">
                        Publish Status
                      </span>
                      <span className="text-stone-100 font-bold text-[11px]">
                        {brideVer?.isPublished ? "🟢 Published" : "🟡 Draft"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-stone-800/80">
                  <span className="text-[11px] text-stone-500 font-mono">
                    Updated: {brideVer ? new Date(brideVer.updatedAt).toLocaleDateString() : "Just now"}
                  </span>

                  <button className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 group-hover:from-amber-400 group-hover:to-amber-500 text-stone-950 font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2">
                    <span>Open Album Builder</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>

              {/* 📘 Groom Side Album Card */}
              <div
                onClick={() => navigate(`/admin/albums/${selectedAlbumId}/proofing?side=GROOM`)}
                className="group cursor-pointer bg-stone-900/60 hover:bg-stone-900 backdrop-blur-2xl border border-stone-800 hover:border-amber-400/80 rounded-3xl p-8 shadow-2xl transition-all duration-300 flex flex-col justify-between space-y-6 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-amber-400/10 transition-all pointer-events-none" />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">📘</span>
                      <div>
                        <h2 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors">
                          Groom Side Album
                        </h2>
                        <p className="text-xs text-stone-400">Custom 12×36 Spreads Curation</p>
                      </div>
                    </div>

                    <span
                      className={`text-xs font-mono font-semibold px-3 py-1 rounded-full border ${getStatusBadgeClass(
                        proofingData?.groomStatus || "Design Started"
                      )}`}
                    >
                      {proofingData?.groomStatus || "Design Started"}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-stone-800/80 text-xs">
                    <div className="bg-stone-950/60 p-3 rounded-2xl border border-stone-800/60">
                      <span className="text-stone-500 block text-[10px] uppercase tracking-wider font-semibold">
                        Version
                      </span>
                      <span className="text-stone-100 font-bold font-mono text-sm">
                        {groomVer ? `V${groomVer.versionNumber}` : "V1 (Draft)"}
                      </span>
                    </div>

                    <div className="bg-stone-950/60 p-3 rounded-2xl border border-stone-800/60">
                      <span className="text-stone-500 block text-[10px] uppercase tracking-wider font-semibold">
                        Total Spreads
                      </span>
                      <span className="text-stone-100 font-bold font-mono text-sm">
                        {groomVer ? groomVer.spreads.length : 0} Spreads
                      </span>
                    </div>

                    <div className="bg-stone-950/60 p-3 rounded-2xl border border-stone-800/60">
                      <span className="text-stone-500 block text-[10px] uppercase tracking-wider font-semibold">
                        Publish Status
                      </span>
                      <span className="text-stone-100 font-bold text-[11px]">
                        {groomVer?.isPublished ? "🟢 Published" : "🟡 Draft"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-stone-800/80">
                  <span className="text-[11px] text-stone-500 font-mono">
                    Updated: {groomVer ? new Date(groomVer.updatedAt).toLocaleDateString() : "Just now"}
                  </span>

                  <button className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 group-hover:from-amber-400 group-hover:to-amber-500 text-stone-950 font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2">
                    <span>Open Album Builder</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
