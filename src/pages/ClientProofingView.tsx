import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  BookOpen,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Lock,
  Heart,
  ShieldCheck,
  Send,
  MessageSquare
} from "lucide-react";
import { AlbumProofingData, ProofingSide } from "../types/proofing.js";
import FlipbookViewer from "../components/FlipbookViewer.js";

export default function ClientProofingView() {
  const { albumId } = useParams<{ albumId: string }>();
  const navigate = useNavigate();

  const [activeSide, setActiveSide] = useState<ProofingSide>("BRIDE");
  const [proofingData, setProofingData] = useState<AlbumProofingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [clientName, setClientName] = useState("");

  const loadData = async () => {
    if (!albumId) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/proofing/${albumId}`);
      const result = await res.json();
      if (result.success && result.data) {
        setProofingData(result.data);
      } else {
        setErrorMsg("Album proofing data unavailable.");
      }
    } catch (err) {
      setErrorMsg("Failed to connect to proofing portal.");
    } finally {
      setIsLoading(false);
    }
  };

  const logView = async (side: ProofingSide) => {
    if (!albumId) return;
    try {
      await fetch(`/api/proofing/${albumId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          side,
          type: "View",
          description: `Client opened ${side === 'BRIDE' ? 'Bride' : 'Groom'} Side album proofing portal`,
          user: localStorage.getItem("clientName") || localStorage.getItem("clientEmail") || "Client"
        })
      });
    } catch (e) {
      // ignore view log error
    }
  };

  useEffect(() => {
    loadData();
    logView(activeSide);
  }, [albumId, activeSide]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Published versions for selected side
  const sideVersions = proofingData?.versions.filter((v) => v.side === activeSide) || [];
  const publishedVersion =
    sideVersions.find((v) => v.isPublished) ||
    sideVersions[sideVersions.length - 1];

  const spreads = publishedVersion?.spreads || [];
  const comments = proofingData?.comments.filter((c) => c.side === activeSide) || [];
  const currentStatus = activeSide === "BRIDE" ? proofingData?.brideStatus : proofingData?.groomStatus;

  const handleAddComment = async (comment: {
    spreadId: string;
    spreadNumber: number;
    spreadTitle: string;
    text: string;
    pinX?: number;
    pinY?: number;
    file: File | null;
  }) => {
    if (!albumId) return;
    const formData = new FormData();
    formData.append("spreadId", comment.spreadId);
    formData.append("spreadNumber", String(comment.spreadNumber));
    formData.append("spreadTitle", comment.spreadTitle);
    formData.append("side", activeSide);
    formData.append("versionNumber", String(publishedVersion?.versionNumber || 1));
    formData.append("author", clientName || "Valued Client");
    formData.append("authorRole", "Client");
    formData.append("text", comment.text);
    if (comment.pinX !== undefined) formData.append("pinX", String(comment.pinX));
    if (comment.pinY !== undefined) formData.append("pinY", String(comment.pinY));
    if (comment.file) formData.append("attachment", comment.file);

    const res = await fetch(`/api/proofing/${albumId}/comments`, {
      method: "POST",
      body: formData
    });
    const result = await res.json();
    if (result.success && result.data) {
      setProofingData(result.data);
      showToast("Your correction note has been sent to the design team.");
    } else {
      throw new Error(result.error || "Failed to submit comment.");
    }
  };

  const handleApproveAlbum = async () => {
    if (!albumId) return;
    const res = await fetch(`/api/proofing/${albumId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ side: activeSide, status: "Approved" })
    });
    const result = await res.json();
    if (result.success && result.data) {
      setProofingData(result.data);
      setIsApproveModalOpen(false);
      showToast(`Congratulations! ${activeSide === "BRIDE" ? "Bride" : "Groom"} Side Album approved for print!`);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Toast */}
        {toastMsg && (
          <div className="fixed top-6 right-6 z-[100000] bg-emerald-950 text-emerald-300 border border-emerald-500/40 p-4 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Portal Header */}
        <div className="bg-stone-900/60 backdrop-blur-2xl border border-stone-800 rounded-3xl p-6 shadow-2xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-stone-800/80">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(`/gallery/${albumId}`)}
                className="p-2.5 bg-stone-950 border border-stone-800 hover:bg-stone-800 rounded-2xl text-stone-300 hover:text-white transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-white">📖 Album Proofing Portal</h1>
                  <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-mono font-bold">
                    Album Ready for Review
                  </span>
                </div>
                <p className="text-xs text-stone-400 mt-0.5">
                  Interactive 12×36 Spread Flipbook Viewer & Correction Manager
                </p>
              </div>
            </div>

            {/* Side Switcher */}
            <div className="flex items-center gap-2 bg-stone-950 p-1.5 rounded-2xl border border-stone-800">
              <button
                onClick={() => setActiveSide("BRIDE")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeSide === "BRIDE"
                    ? "bg-gradient-to-r from-rose-500 to-amber-500 text-stone-950 shadow-lg"
                    : "text-stone-400 hover:text-white"
                }`}
              >
                <span>📕 Bride Side</span>
              </button>

              <button
                onClick={() => setActiveSide("GROOM")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeSide === "GROOM"
                    ? "bg-gradient-to-r from-blue-500 to-amber-500 text-stone-950 shadow-lg"
                    : "text-stone-400 hover:text-white"
                }`}
              >
                <span>📘 Groom Side</span>
              </button>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs text-stone-400">Proofing Status:</span>
              <span className="text-xs font-bold text-amber-400 bg-stone-950 border border-stone-800 px-3 py-1.5 rounded-xl">
                {currentStatus || "Published for Review"}
              </span>
              <span className="text-xs font-mono text-stone-400">
                {publishedVersion ? `Version ${publishedVersion.versionNumber}` : "Version 1"} • {spreads.length} Spreads
              </span>
            </div>

            {currentStatus !== "Approved" && (
              <button
                onClick={() => setIsApproveModalOpen(true)}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 text-stone-950 font-extrabold text-xs rounded-xl shadow-lg transition flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve {activeSide === "BRIDE" ? "Bride" : "Groom"} Side Album</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Luxury Flipbook Component */}
        {isLoading ? (
          <div className="bg-stone-900/40 border border-stone-800 rounded-2xl p-16 text-center text-stone-400 font-semibold">
            Loading Album Proofing Flipbook...
          </div>
        ) : (
          <FlipbookViewer
            spreads={spreads}
            comments={comments}
            settings={proofingData?.settings}
            side={activeSide}
            albumTitle={`${activeSide === "BRIDE" ? "Bride" : "Groom"} Side Luxury Album`}
            versionTitle={publishedVersion ? `Version ${publishedVersion.versionNumber}` : "Published Version"}
            onAddComment={handleAddComment}
            isClientView={true}
          />
        )}
      </div>

      {/* Approve Confirmation Modal */}
      {isApproveModalOpen && (
        <div className="fixed inset-0 z-[100000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-100">Approve Album for Print</h3>
                <p className="text-xs text-stone-400">
                  {activeSide === "BRIDE" ? "Bride" : "Groom"} Side • Version {publishedVersion?.versionNumber}
                </p>
              </div>
            </div>

            <p className="text-xs text-stone-300 leading-relaxed bg-stone-950 p-4 rounded-xl border border-stone-800">
              By confirming approval, you authorize the studio to send this layout directly to print binding.
            </p>

            <div>
              <label className="block text-xs font-semibold text-stone-400 mb-1">Your Full Name / Signature</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Type your name..."
                className="w-full bg-stone-950 border border-stone-800 rounded-xl p-2.5 text-xs text-stone-100 focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsApproveModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-stone-400 hover:text-white rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveAlbum}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs font-bold rounded-xl shadow-lg transition"
              >
                Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
