import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Upload,
  Layers,
  MessageSquare,
  Clock,
  Settings,
  Send,
  Eye,
  Heart,
  CheckCircle2,
  AlertCircle,
  Copy,
  RotateCcw,
  RefreshCw,
  Tag,
  Check,
  Shield,
  Sliders,
  SlidersHorizontal,
  ChevronRight,
  Maximize2
} from "lucide-react";
import {
  AlbumProofingData,
  AlbumSpread,
  ProofingSide,
  ProofingStatus,
  SpreadType
} from "../types/proofing.js";
import { authFetch } from "../context/AuthContext.js";
import AlbumBuilder from "../components/AlbumBuilder.js";
import ProofingTimeline from "../components/ProofingTimeline.js";
import CompareVersionsModal from "../components/CompareVersionsModal.js";
import FlipbookViewer from "../components/FlipbookViewer.js";

type TabType = "builder" | "versions" | "corrections" | "comments" | "timeline" | "settings";

export default function AdminProofingManager() {
  const { albumId } = useParams<{ albumId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeSide: ProofingSide = (searchParams.get("side") as ProofingSide) || "BRIDE";
  const [activeTab, setActiveTab] = useState<TabType>("builder");

  const [proofingData, setProofingData] = useState<AlbumProofingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Settings form local state
  const [settingsForm, setSettingsForm] = useState({
    watermarkText: "PROOF - DO NOT DUPLICATE",
    enableWatermark: false,
    allowComments: true,
    downloadEnabled: false,
    autoApproveDays: 14
  });

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const loadData = async () => {
    if (!albumId) return;
    setIsLoading(true);
    try {
      const res = await authFetch(`/api/proofing/${albumId}`);
      const result = await res.json();
      if (result.success && result.data) {
        setProofingData(result.data);
        if (result.data.settings) {
          setSettingsForm({
            watermarkText: result.data.settings.watermarkText || "PROOF - DO NOT DUPLICATE",
            enableWatermark: result.data.settings.enableWatermark ?? false,
            allowComments: result.data.settings.allowComments ?? true,
            downloadEnabled: result.data.settings.downloadEnabled ?? false,
            autoApproveDays: result.data.settings.autoApproveDays ?? 14
          });
        }
      }
    } catch (err) {
      showToast("Failed to connect to proofing engine.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [albumId]);

  const setSide = (side: ProofingSide) => {
    setSearchParams({ side });
  };

  // Helper getters for active side version & spreads
  const sideVersions = proofingData?.versions.filter((v) => v.side === activeSide) || [];
  const activeVerId = activeSide === "BRIDE" ? proofingData?.activeBrideVersionId : proofingData?.activeGroomVersionId;
  const activeVersion = sideVersions.find((v) => v.id === activeVerId) || sideVersions[sideVersions.length - 1];
  const activeSpreads = activeVersion?.spreads || [];
  const currentStatus = activeSide === "BRIDE" ? proofingData?.brideStatus : proofingData?.groomStatus;

  // Handlers
  const handleUploadSpreads = async (files: FileList | File[], spreadType: SpreadType) => {
    if (!albumId) return;
    const formData = new FormData();
    formData.append("side", activeSide);
    formData.append("spreadType", spreadType);

    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    const res = await authFetch(`/api/proofing/${albumId}/upload`, {
      method: "POST",
      body: formData
    });
    const result = await res.json();
    if (result.success && result.data) {
      setProofingData(result.data);
      showToast(result.message || "Spread images uploaded successfully.");
    } else {
      throw new Error(result.error || "Upload failed");
    }
  };

  const handleReorderSpreads = async (updatedSpreads: AlbumSpread[]) => {
    if (!albumId || !activeVersion) return;
    const res = await authFetch(`/api/proofing/${albumId}/spreads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        side: activeSide,
        versionId: activeVersion.id,
        spreads: updatedSpreads
      })
    });
    const result = await res.json();
    if (result.success && result.data) {
      setProofingData(result.data);
    }
  };

  const handleReplaceSpread = async (spreadId: string, file: File) => {
    if (!albumId || !activeVersion) return;
    const formData = new FormData();
    formData.append("side", activeSide);
    formData.append("versionId", activeVersion.id);
    formData.append("file", file);

    const res = await authFetch(`/api/proofing/${albumId}/spreads/${spreadId}`, {
      method: "PUT",
      body: formData
    });
    const result = await res.json();
    if (result.success && result.data) {
      setProofingData(result.data);
      showToast("Spread image replaced.");
    } else {
      throw new Error(result.error || "Replace failed");
    }
  };

  const handleDeleteSpread = async (spreadId: string) => {
    if (!albumId || !activeVersion) return;
    const res = await authFetch(`/api/proofing/${albumId}/spreads/${spreadId}?side=${activeSide}&versionId=${activeVersion.id}`, {
      method: "DELETE"
    });
    const result = await res.json();
    if (result.success && result.data) {
      setProofingData(result.data);
      showToast("Spread deleted.");
    }
  };

  const handleDuplicateSpread = async (spreadId: string) => {
    if (!albumId || !activeVersion) return;
    const res = await authFetch(`/api/proofing/${albumId}/spreads/${spreadId}/duplicate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ side: activeSide, versionId: activeVersion.id })
    });
    const result = await res.json();
    if (result.success && result.data) {
      setProofingData(result.data);
      showToast("Spread duplicated.");
    }
  };

  const handleRenameSpread = async (spreadId: string, newTitle: string) => {
    if (!albumId || !activeVersion) return;
    const formData = new FormData();
    formData.append("side", activeSide);
    formData.append("versionId", activeVersion.id);
    formData.append("title", newTitle);

    const res = await authFetch(`/api/proofing/${albumId}/spreads/${spreadId}`, {
      method: "PUT",
      body: formData
    });
    const result = await res.json();
    if (result.success && result.data) {
      setProofingData(result.data);
    }
  };

  const handleCreateVersion = async () => {
    if (!albumId) return;
    const res = await authFetch(`/api/proofing/${albumId}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ side: activeSide, notes: "New Version Draft" })
    });
    const result = await res.json();
    if (result.success && result.data) {
      setProofingData(result.data);
      showToast(`Created new Version draft.`);
    }
  };

  const handlePublishVersion = async (versionId: string) => {
    if (!albumId) return;
    const res = await authFetch(`/api/proofing/${albumId}/versions/${versionId}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ side: activeSide })
    });
    const result = await res.json();
    if (result.success && result.data) {
      setProofingData(result.data);
      showToast("Version published for client proofing review!");
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!albumId) return;
    const res = await authFetch(`/api/proofing/${albumId}/versions/${versionId}/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ side: activeSide })
    });
    const result = await res.json();
    if (result.success && result.data) {
      setProofingData(result.data);
      showToast("Restored past version into active workspace.");
    }
  };

  const handleStatusChange = async (newStatus: ProofingStatus) => {
    if (!albumId) return;
    const res = await authFetch(`/api/proofing/${albumId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ side: activeSide, status: newStatus })
    });
    const result = await res.json();
    if (result.success && result.data) {
      setProofingData(result.data);
      showToast(`Album status updated to "${newStatus}"`);
    }
  };

  const handleResolveComment = async (commentId: string) => {
    if (!albumId) return;
    const res = await authFetch(`/api/proofing/${albumId}/comments/${commentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Resolved" })
    });
    const result = await res.json();
    if (result.success && result.data) {
      setProofingData(result.data);
      showToast("Comment marked as resolved.");
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!albumId) return;
    const res = await authFetch(`/api/proofing/${albumId}/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settingsForm)
    });
    const result = await res.json();
    if (result.success && result.data) {
      setProofingData(result.data);
      showToast("Proofing settings saved.");
    }
  };

  const sideComments = proofingData?.comments.filter((c) => c.side === activeSide) || [];
  const sideActivities = proofingData?.activities.filter((a) => a.side === activeSide) || [];
  const totalViews = proofingData?.activities.filter((a) => a.type === "View").length || 0;
  const totalFavorites = proofingData?.activities.filter((a) => a.type === "Favorite").length || 0;
  const lastView = proofingData?.activities.find((a) => a.type === "View");
  const lastFavorite = proofingData?.activities.find((a) => a.type === "Favorite");

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Toast Notification */}
        {toastMsg && (
          <div
            className={`fixed top-6 right-6 z-[100000] p-4 rounded-xl shadow-2xl text-xs font-bold border flex items-center gap-3 animate-in fade-in zoom-in-95 ${
              toastMsg.type === "success"
                ? "bg-emerald-950 text-emerald-300 border-emerald-500/40"
                : "bg-rose-950 text-rose-300 border-rose-500/40"
            }`}
          >
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            <span>{toastMsg.text}</span>
          </div>
        )}

        {/* Top Header & Navigation Bar */}
        <div className="bg-stone-900/60 backdrop-blur-2xl border border-stone-800 rounded-3xl p-6 shadow-2xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-stone-800/80">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/admin/proofing")}
                className="p-2.5 bg-stone-950 border border-stone-800 hover:bg-stone-800 rounded-2xl text-stone-300 hover:text-white transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-white">Album Builder & Proofing</h1>
                  <span className="text-xs bg-amber-400/10 text-amber-400 border border-amber-400/30 px-2.5 py-0.5 rounded-full font-mono font-bold">
                    12×36 Spread Engine
                  </span>
                </div>
                <p className="text-xs text-stone-400 mt-0.5">
                  Album ID: <span className="font-mono text-stone-300">{albumId}</span>
                </p>
              </div>
            </div>

            {/* Side Switcher Pills */}
            <div className="flex items-center gap-2 bg-stone-950 p-1.5 rounded-2xl border border-stone-800">
              <button
                onClick={() => setSide("BRIDE")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  activeSide === "BRIDE"
                    ? "bg-gradient-to-r from-rose-500 to-amber-500 text-stone-950 shadow-lg"
                    : "text-stone-400 hover:text-white"
                }`}
              >
                <span>📕 Bride Side</span>
              </button>

              <button
                onClick={() => setSide("GROOM")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  activeSide === "GROOM"
                    ? "bg-gradient-to-r from-blue-500 to-amber-500 text-stone-950 shadow-lg"
                    : "text-stone-400 hover:text-white"
                }`}
              >
                <span>📘 Groom Side</span>
              </button>
            </div>
          </div>

          {/* Status & Action Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold text-stone-400">Current Status:</span>
              <select
                value={currentStatus || "Design Started"}
                onChange={(e) => handleStatusChange(e.target.value as ProofingStatus)}
                className="bg-stone-950 border border-stone-800 text-amber-400 font-bold text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-400"
              >
                <option value="Design Started">Design Started</option>
                <option value="Waiting Client">Waiting Client</option>
                <option value="Correction Pending">Correction Pending</option>
                <option value="Correction Uploaded">Correction Uploaded</option>
                <option value="Approved">Approved</option>
                <option value="Print Ready">Print Ready</option>
                <option value="Delivered">Delivered</option>
              </select>

              <span className="text-xs font-mono bg-stone-950 border border-stone-800 px-3 py-1.5 rounded-xl text-stone-300">
                {activeVersion ? `Active V${activeVersion.versionNumber}` : "V1 Draft"} • {activeSpreads.length} Spreads
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsPreviewOpen(true)}
                className="px-4 py-2.5 bg-stone-950 hover:bg-stone-800 text-stone-200 border border-stone-800 rounded-xl text-xs font-bold transition flex items-center gap-2"
              >
                <Eye className="w-4 h-4 text-amber-400" />
                <span>Client Flipbook Preview</span>
              </button>

              {activeVersion && (
                <button
                  onClick={() => handlePublishVersion(activeVersion.id)}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-extrabold text-xs rounded-xl shadow-lg transition flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Publish Version {activeVersion.versionNumber}</span>
                </button>
              )}
            </div>
          </div>

          {/* Tracking & Visibility Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-stone-800/80">
            <div
              onClick={() => setActiveTab("timeline")}
              className="bg-stone-950/80 hover:bg-stone-950 p-3.5 rounded-2xl border border-stone-800/80 cursor-pointer transition flex items-center gap-3 group"
            >
              <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:scale-110 transition-transform">
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Album Views</div>
                <div className="text-sm font-extrabold text-stone-100 font-mono">{totalViews} Session(s)</div>
              </div>
            </div>

            <div
              onClick={() => setActiveTab("timeline")}
              className="bg-stone-950/80 hover:bg-stone-950 p-3.5 rounded-2xl border border-stone-800/80 cursor-pointer transition flex items-center gap-3 group"
            >
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 group-hover:scale-110 transition-transform">
                <Heart className="w-4 h-4 fill-rose-500/30" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Photo Favorites</div>
                <div className="text-sm font-extrabold text-stone-100 font-mono">{totalFavorites} Favorited</div>
              </div>
            </div>

            <div
              onClick={() => setActiveTab("comments")}
              className="bg-stone-950/80 hover:bg-stone-950 p-3.5 rounded-2xl border border-stone-800/80 cursor-pointer transition flex items-center gap-3 group"
            >
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Client Notes</div>
                <div className="text-sm font-extrabold text-stone-100 font-mono">{sideComments.length} Note(s)</div>
              </div>
            </div>

            <div
              onClick={() => setActiveTab("timeline")}
              className="bg-stone-950/80 hover:bg-stone-950 p-3.5 rounded-2xl border border-stone-800/80 cursor-pointer transition flex items-center gap-3 group"
            >
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-110 transition-transform">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Last Activity</div>
                <div className="text-xs font-bold text-stone-200 truncate max-w-[120px]">
                  {lastView || lastFavorite ? new Date((lastView || lastFavorite)!.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "No client activity"}
                </div>
              </div>
            </div>
          </div>

          {/* Top Navigation Tabs */}
          <div className="flex items-center gap-2 border-t border-stone-800/80 pt-4 overflow-x-auto scrollbar-none">
            {[
              { id: "builder", label: "Album Builder", icon: Upload },
              { id: "versions", label: `Versions (${sideVersions.length})`, icon: Layers },
              { id: "corrections", label: `Corrections (${sideComments.filter((c) => c.status === "Pending").length})`, icon: AlertCircle },
              { id: "comments", label: `Comments (${sideComments.length})`, icon: MessageSquare },
              { id: "timeline", label: "Activity Timeline", icon: Clock },
              { id: "settings", label: "Settings", icon: Settings }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
                    isActive
                      ? "bg-amber-400 text-stone-950 shadow-md"
                      : "bg-stone-950/60 text-stone-400 hover:text-white hover:bg-stone-900 border border-stone-800/60"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab 1: Album Builder */}
        {activeTab === "builder" && (
          <AlbumBuilder
            albumId={albumId || "common"}
            side={activeSide}
            spreads={activeSpreads}
            versionId={activeVersion?.id || "v1"}
            onUploadSpreads={handleUploadSpreads}
            onReorderSpreads={handleReorderSpreads}
            onReplaceSpread={handleReplaceSpread}
            onDeleteSpread={handleDeleteSpread}
            onDuplicateSpread={handleDuplicateSpread}
            onRenameSpread={handleRenameSpread}
          />
        )}

        {/* Tab 2: Version Control */}
        {activeTab === "versions" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-stone-900/60 p-6 rounded-2xl border border-stone-800/80">
              <div>
                <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-400" />
                  <span>Version Control History</span>
                </h3>
                <p className="text-xs text-stone-400 mt-1">
                  Create new version drafts without overwriting previous review history.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsCompareOpen(true)}
                  className="px-4 py-2 bg-stone-950 border border-stone-800 hover:bg-stone-800 text-stone-200 text-xs font-bold rounded-xl transition flex items-center gap-2"
                >
                  <Copy className="w-4 h-4 text-amber-400" />
                  <span>Compare Versions</span>
                </button>

                <button
                  onClick={handleCreateVersion}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-stone-950 font-bold text-xs rounded-xl shadow-lg transition"
                >
                  Create New Version
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sideVersions.map((v) => (
                <div
                  key={v.id}
                  className={`bg-stone-900/80 border rounded-2xl p-6 shadow-xl space-y-4 relative ${
                    v.id === activeVerId ? "border-amber-400" : "border-stone-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-amber-400 font-bold font-mono text-sm">
                      Version {v.versionNumber}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                        v.isPublished
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : "bg-stone-800 text-stone-400 border-stone-700"
                      }`}
                    >
                      {v.isPublished ? "Published" : "Draft"}
                    </span>
                  </div>

                  <p className="text-stone-300 text-xs font-medium">{v.title}</p>
                  <p className="text-stone-500 text-[11px]">{v.notes || "No notes attached."}</p>

                  <div className="pt-3 border-t border-stone-800/80 text-xs text-stone-400 font-mono space-y-1">
                    <div>Spreads: {v.spreads.length}</div>
                    <div>Created: {new Date(v.createdAt).toLocaleString()}</div>
                  </div>

                  <div className="pt-3 flex items-center gap-2">
                    {!v.isPublished && (
                      <button
                        onClick={() => handlePublishVersion(v.id)}
                        className="w-full py-2 bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-bold rounded-xl transition"
                      >
                        Publish
                      </button>
                    )}
                    <button
                      onClick={() => handleRestoreVersion(v.id)}
                      className="w-full py-2 bg-stone-950 border border-stone-800 hover:bg-stone-800 text-stone-300 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Corrections */}
        {activeTab === "corrections" && (
          <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-6">
            <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              <span>Pending Corrections & Client Requests</span>
            </h3>

            {sideComments.filter((c) => c.status === "Pending").length === 0 ? (
              <p className="text-stone-500 text-xs text-center py-12">
                No pending correction requests for this side.
              </p>
            ) : (
              <div className="space-y-4">
                {sideComments
                  .filter((c) => c.status === "Pending")
                  .map((cmt) => (
                    <div
                      key={cmt.id}
                      className="bg-stone-950 border border-stone-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs text-amber-400 font-mono font-bold">
                          <span>{cmt.spreadTitle || `Spread ${cmt.spreadNumber}`}</span>
                          <span>• {cmt.author} ({cmt.authorRole})</span>
                        </div>
                        <p className="text-stone-200 text-sm font-medium">{cmt.text}</p>
                      </div>

                      <button
                        onClick={() => handleResolveComment(cmt.id)}
                        className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 font-bold text-xs rounded-xl transition"
                      >
                        Mark as Resolved
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Comments */}
        {activeTab === "comments" && (
          <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-6">
            <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-400" />
              <span>Spread Comments List</span>
            </h3>

            {sideComments.length === 0 ? (
              <p className="text-stone-500 text-xs text-center py-12">No comments logged yet.</p>
            ) : (
              <div className="space-y-4">
                {sideComments.map((cmt) => (
                  <div key={cmt.id} className="bg-stone-950 border border-stone-800 rounded-2xl p-5 space-y-2">
                    <div className="flex items-center justify-between text-xs text-stone-400">
                      <span className="font-bold text-stone-200">{cmt.author} ({cmt.authorRole})</span>
                      <span className="font-mono text-[11px]">{new Date(cmt.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-stone-300 text-sm">{cmt.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Activity Timeline */}
        {activeTab === "timeline" && <ProofingTimeline activities={sideActivities} />}

        {/* Tab 6: Settings */}
        {activeTab === "settings" && (
          <form onSubmit={handleSaveSettings} className="bg-stone-900/60 border border-stone-800 rounded-2xl p-8 shadow-xl space-y-6 max-w-2xl">
            <h3 className="text-base font-bold text-stone-100 flex items-center gap-2 border-b border-stone-800 pb-4">
              <Settings className="w-5 h-5 text-amber-400" />
              <span>Proofing & Security Options</span>
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-300 uppercase mb-1.5">
                  Watermark Text
                </label>
                <input
                  type="text"
                  value={settingsForm.watermarkText}
                  onChange={(e) => setSettingsForm({ ...settingsForm, watermarkText: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-stone-950 rounded-xl border border-stone-800">
                <div>
                  <span className="text-xs font-bold text-stone-200 block">Enable Proofing Watermark</span>
                  <span className="text-[11px] text-stone-500">Overlays watermark on client flipbook viewer</span>
                </div>
                <input
                  type="checkbox"
                  checked={settingsForm.enableWatermark}
                  onChange={(e) => setSettingsForm({ ...settingsForm, enableWatermark: e.target.checked })}
                  className="w-4 h-4 accent-amber-400 rounded"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-stone-950 rounded-xl border border-stone-800">
                <div>
                  <span className="text-xs font-bold text-stone-200 block">Allow Client Comments & Pins</span>
                  <span className="text-[11px] text-stone-500">Permit client to place correction pins on spreads</span>
                </div>
                <input
                  type="checkbox"
                  checked={settingsForm.allowComments}
                  onChange={(e) => setSettingsForm({ ...settingsForm, allowComments: e.target.checked })}
                  className="w-4 h-4 accent-amber-400 rounded"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-stone-950 font-extrabold text-xs rounded-xl shadow-lg transition"
            >
              Save Settings
            </button>
          </form>
        )}
      </div>

      {/* Compare Modal */}
      <CompareVersionsModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        versions={sideVersions}
      />

      {/* Flipbook Client Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-[100000] bg-black/95 backdrop-blur-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between p-2 border-b border-stone-800">
            <span className="text-xs font-bold text-amber-400">Client Flipbook Preview</span>
            <button
              onClick={() => setIsPreviewOpen(false)}
              className="px-3 py-1.5 bg-stone-900 border border-stone-800 hover:bg-stone-800 text-stone-300 rounded-lg text-xs font-semibold"
            >
              Close Preview
            </button>
          </div>
          <div className="flex-1 min-h-0 py-2">
            <FlipbookViewer
              spreads={activeSpreads}
              comments={sideComments}
              settings={proofingData?.settings}
              side={activeSide}
              isClientView={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
