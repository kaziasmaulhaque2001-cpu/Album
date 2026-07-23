import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import QRCode from "qrcode";
import { useSettings } from "../context/SettingsContext.js";
import { 
  ArrowLeft, Calendar, User, Heart, Lock, CalendarOff, Settings, 
  Trash2, Copy, Check, Download, ExternalLink, RefreshCw, Eye, 
  Edit3, ShieldAlert, Image, Search, AlertCircle, Sparkles, ToggleLeft, ToggleRight, Clock,
  Folder as FolderIcon, Plus, MoveRight, Layers, CheckSquare, Square, BookOpen
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Album, Photo, Folder } from "../types.js";
import EditAlbumModal from "../components/EditAlbumModal.js";
import BatchUploader from "../components/BatchUploader.js";
import FolderCard from "../components/FolderCard.js";
import FolderModal from "../components/CreateFolderModal.js";
import MovePhotosModal from "../components/MovePhotosModal.js";

export default function AdminAlbumDetail() {
  const { id } = useParams<{ id: string }>();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [album, setAlbum] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Folder States
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [selectedSide, setSelectedSide] = useState<"BRIDE" | "GROOM" | null>(null);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [isMovePhotosModalOpen, setIsMovePhotosModalOpen] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);

  useEffect(() => {
    if (album) {
      document.title = `${album.brideName} & ${album.groomName} | ${settings.studioName || "My Studio"}`;
    } else {
      document.title = `${settings.studioName || "My Studio"} | Album Workspace`;
    }
  }, [album, settings.studioName]);
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & States
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [renamePhotoId, setRenamePhotoId] = useState<string | null>(null);
  const [newPhotoName, setNewPhotoName] = useState("");
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Copy state
  const [copied, setCopied] = useState(false);

  // Toasts HUD
  const [toasts, setToasts] = useState<{ id: string; type: "success" | "error"; text: string }[]>([]);

  const triggerToast = (text: string, type: "success" | "error" = "success") => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // QR Code canvas reference
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Client Selection states
  const [clientSelections, setClientSelections] = useState<any[]>([]);
  const [isLoadingSelections, setIsLoadingSelections] = useState(false);
  const [activeTab, setActiveTab] = useState<"media" | "selections">("media");
  const [downloadingZipKey, setDownloadingZipKey] = useState<string | null>(null);

  const fetchAlbumDetails = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/albums/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setAlbum(data.album);
        setPhotos(data.album.photos || []);
        setFolders(data.folders || []);
      } else {
        throw new Error(data.error || "Failed to load album.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  // Folder Actions
  const handleSaveFolder = async (folderData: { name: string; side: "BRIDE" | "GROOM" | "GENERAL"; coverUrl?: string }) => {
    try {
      if (editingFolder) {
        const res = await fetch(`/api/albums/${id}/folders/${editingFolder.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(folderData),
        });
        if (!res.ok) throw new Error("Failed to update folder.");
        triggerToast("Folder updated successfully.");
      } else {
        const res = await fetch(`/api/albums/${id}/folders`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(folderData),
        });
        if (!res.ok) throw new Error("Failed to create folder.");
        triggerToast("Folder created successfully.");
      }
      setEditingFolder(null);
      fetchAlbumDetails();
    } catch (err: any) {
      triggerToast(err.message || "Folder operation failed.", "error");
      throw err;
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm("Are you sure you want to delete this folder? Photos in this folder will remain in the album.")) return;
    try {
      const res = await fetch(`/api/albums/${id}/folders/${folderId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (res.ok) {
        triggerToast("Folder deleted.");
        if (activeFolderId === folderId) setActiveFolderId(null);
        fetchAlbumDetails();
      } else {
        const data = await res.json();
        triggerToast(data.error || "Failed to delete folder.", "error");
      }
    } catch (err: any) {
      triggerToast(err.message || "An error occurred.", "error");
    }
  };

  const handleReorderFolder = async (folderId: string, direction: "up" | "down") => {
    const sideFolders = folders.filter((f) => selectedSide === "ALL" || f.side === selectedSide);
    const index = sideFolders.findIndex((f) => f.id === folderId);
    if (index === -1) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sideFolders.length) return;

    const reordered = [...sideFolders];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    const folderOrders = reordered.map((f, i) => ({ id: f.id, order: i + 1 }));

    try {
      const res = await fetch(`/api/albums/${id}/folders/reorder`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ folderOrders }),
      });
      if (res.ok) {
        fetchAlbumDetails();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMovePhotos = async (targetFolderId: string | null) => {
    if (selectedPhotoIds.length === 0) return;
    try {
      const res = await fetch(`/api/albums/${id}/photos/move`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ photoIds: selectedPhotoIds, targetFolderId }),
      });
      if (res.ok) {
        triggerToast(`Successfully moved ${selectedPhotoIds.length} photo(s).`);
        setSelectedPhotoIds([]);
        fetchAlbumDetails();
      } else {
        const data = await res.json();
        triggerToast(data.error || "Failed to move photos.", "error");
      }
    } catch (err: any) {
      triggerToast(err.message || "An error occurred.", "error");
    }
  };

  const fetchClientSelections = async () => {
    setIsLoadingSelections(true);
    try {
      const response = await fetch(`/api/albums/${id}/client-selections`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setClientSelections(data.clientSelections || []);
      }
    } catch (err) {
      console.error("Failed to load client selections:", err);
    } finally {
      setIsLoadingSelections(false);
    }
  };

  const handleDownloadZip = async (clientEmail?: string, clientName?: string) => {
    const key = clientEmail || "all";
    setDownloadingZipKey(key);
    try {
      const emailQuery = clientEmail ? `?clientEmail=${encodeURIComponent(clientEmail)}` : "";
      const response = await fetch(`/api/albums/${id}/selections/download-zip${emailQuery}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to generate selection ZIP archive.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      const zipName = clientEmail ? `Selected_Photos_${clientEmail.replace(/[^a-zA-Z0-9]/g, "_")}.zip` : "Wedding_Selected_Photos.zip";
      link.setAttribute("download", zipName);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err: any) {
      alert(err.message || "An error occurred downloading selection ZIP.");
    } finally {
      setDownloadingZipKey(null);
    }
  };

  const handleDownloadFolderZip = async (folderId: string, folderName: string) => {
    if (!id) return;
    setDownloadingZipKey(`folder_${folderId}`);
    try {
      const response = await fetch(`/api/albums/${id}/folders/${folderId}/download-zip`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to generate folder ZIP archive.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const safeName = folderName.replace(/[^a-zA-Z0-9]/g, "_");
      link.setAttribute("download", `${safeName}_Selected_Photos.zip`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err: any) {
      alert(err.message || "An error occurred downloading folder ZIP.");
    } finally {
      setDownloadingZipKey(null);
    }
  };

  useEffect(() => {
    fetchAlbumDetails();
    fetchClientSelections();
  }, [id]);

  // Compute enriched folders with photo counts and selection counts
  const enrichedFolders = folders.map((f) => {
    const folderPhotos = photos.filter((p) => p.folderId === f.id);

    // Calculate selected photo count for this folder across all client selections
    const allSelectedPhotoIds = new Set(
      clientSelections.flatMap((cs) => cs.photos.map((p: any) => p.id))
    );
    const selectedCount = folderPhotos.filter((p) => allSelectedPhotoIds.has(p.id) || p.isFavorite).length;

    return {
      ...f,
      totalPhotos: folderPhotos.length,
      selectedPhotosCount: selectedCount,
    };
  });

  // Gallery link formula
  const galleryUrl = `${window.location.origin}/gallery/${id}`;

  // QR Code generation
  useEffect(() => {
    if (qrCanvasRef.current && album) {
      QRCode.toCanvas(
        qrCanvasRef.current,
        galleryUrl,
        {
          width: 160,
          margin: 1,
          color: {
            dark: "#121211",
            light: "#FFFFFF",
          },
        },
        (err) => {
          if (err) console.error("QR Code rendering error:", err);
        }
      );
    }
  }, [galleryUrl, album, isLoading]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(galleryUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    if (!qrCanvasRef.current || !album) return;
    const url = qrCanvasRef.current.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `QR-Gallery-${album.brideName}-${album.groomName}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDeleteAlbum = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/albums/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.ok) {
        triggerToast("Gallery deleted successfully!");
        setTimeout(() => navigate("/admin"), 1000);
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete album.");
      }
    } catch (err: any) {
      triggerToast(err.message || "Could not delete album.", "error");
    } finally {
      setIsDeleting(false);
      setIsDeleteConfirmOpen(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm("Are you sure you want to delete this photo from the album?")) return;

    try {
      const response = await fetch(`/api/albums/${id}/photos/${photoId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.ok) {
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
        triggerToast("Photo removed from collection.");
        // Also update coverUrl if it was cleared/changed
        fetchAlbumDetails();
      } else {
        const data = await response.json();
        triggerToast(data.error || "Could not delete photo.", "error");
      }
    } catch (err: any) {
      triggerToast(err.message || "An error occurred.", "error");
    }
  };

  const handleRenamePhoto = async (photoId: string) => {
    if (!newPhotoName) return;

    try {
      const response = await fetch(`/api/albums/${id}/photos/${photoId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ filename: newPhotoName }),
      });

      if (response.ok) {
        setPhotos((prev) =>
          prev.map((p) => (p.id === photoId ? { ...p, filename: newPhotoName } : p))
        );
        setRenamePhotoId(null);
        setNewPhotoName("");
      } else {
        const data = await response.json();
        alert(data.error || "Could not rename photo.");
      }
    } catch (err: any) {
      alert(err.message || "An error occurred.");
    }
  };

  const toggleLinkStatus = async () => {
    if (!album) return;
    try {
      const response = await fetch(`/api/albums/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ isActive: !album.isActive }),
      });

      if (response.ok) {
        setAlbum((prev) => prev ? { ...prev, isActive: !prev.isActive } : null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const filteredPhotos = photos.filter((p) =>
    p.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading && !album) {
    return (
      <div className="min-h-screen bg-[#FBFBFA] flex flex-col items-center justify-center text-gray-900">
        <div className="h-10 w-10 rounded-full border-2 border-[#D4AF37]/20 border-t-[#D4AF37] animate-spin" />
        <span className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase mt-4 block">
          Accessing Wedding Vault...
        </span>
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="min-h-screen bg-[#FBFBFA] flex flex-col items-center justify-center p-6 text-gray-900">
        <div className="text-rose-500 mb-4 border border-rose-100 bg-rose-50 p-4 rounded-full">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-serif text-neutral-900 mb-2">Vault Access Denied</h2>
        <p className="text-sm text-neutral-500 font-sans mb-6 text-center max-w-sm">
          {error || "We could not find the requested wedding album. It may have been deleted."}
        </p>
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 py-2 px-5 bg-neutral-900 text-white rounded-lg text-xs uppercase tracking-widest font-semibold font-sans"
        >
          <ArrowLeft className="h-4 w-4" /> Go to Studio
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-gray-900" id="album-workspace-root">
      {/* Workspace Header Nav */}
      <header className="border-b border-neutral-200/60 bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-mono tracking-wider text-neutral-500 hover:text-neutral-900 transition-colors uppercase font-semibold"
          >
            <ArrowLeft className="h-4 w-4" /> {settings.studioName || "My Studio"} Dashboard
          </Link>

          <div className="flex items-center gap-2.5">
            <Link
              to={`/admin/albums/${id}/proofing`}
              className="p-2 border border-amber-300 bg-amber-50 hover:bg-amber-100 text-stone-900 rounded-lg transition-all text-xs font-sans font-bold tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <BookOpen className="h-4 w-4 text-[#D4AF37]" /> 📖 Album Proofing
            </Link>
            <button
              onClick={() => setIsEditOpen(true)}
              className="p-2 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 hover:text-neutral-950 rounded-lg transition-all text-xs font-sans font-semibold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
            >
              <Settings className="h-4 w-4 text-[#C4A484]" /> Configure
            </button>
            <button
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="p-2 border border-rose-100 hover:bg-rose-50 text-rose-600 rounded-lg transition-all text-xs font-sans font-semibold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="h-4 w-4" /> Delete Album
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Album Overview Section */}
        <div className="flex flex-col lg:flex-row gap-10 items-stretch mb-10">
          {/* Left: Album cover / basic info */}
          <div className="w-full lg:w-2/3 bg-white border border-neutral-200/70 p-6 sm:p-8 rounded-2xl flex flex-col md:flex-row gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 h-40 w-40 bg-radial-[circle_at_center,_var(--tw-gradient-stops)] from-[#D4AF37]/5 to-transparent rounded-full -mr-10 -mt-10 pointer-events-none" />
            
            {/* Album Cover preview */}
            <div className="w-full md:w-1/3 aspect-[4/5] bg-neutral-100 rounded-xl overflow-hidden border border-neutral-200 shrink-0 relative flex items-center justify-center">
              {album.coverUrl?.trim() ? (
                <img
                  src={album.coverUrl.trim()}
                  alt="Wedding cover"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="text-center p-4">
                  <Image className="h-10 w-10 text-neutral-300 mx-auto mb-2" />
                  <span className="text-[10px] font-mono text-neutral-400 block uppercase">No Cover Art</span>
                </div>
              )}
              {album.coverUrl && (
                <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-[9px] font-mono font-semibold text-[#D4AF37] px-2 py-0.5 rounded uppercase">
                  Active Cover
                </div>
              )}
            </div>

            {/* General Metadata */}
            <div className="flex flex-col justify-between py-2">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 text-[10px] font-mono font-semibold uppercase px-2.5 py-0.5 rounded-full">
                    {album.eventName}
                  </span>
                  {!album.isActive && (
                    <span className="bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-mono font-semibold uppercase px-2.5 py-0.5 rounded-full">
                      Link Disabled
                    </span>
                  )}
                </div>

                <h1 className="text-3xl font-serif font-light text-neutral-900 tracking-wide mb-3 flex items-center gap-2.5">
                  {album.brideName} <Heart className="h-5 w-5 text-rose-500 fill-rose-50" /> {album.groomName}
                </h1>

                {album.description && (
                  <p className="text-neutral-500 font-sans font-light text-sm leading-relaxed mb-4 max-w-md">
                    {album.description}
                  </p>
                )}
              </div>

              <div className="space-y-2 border-t border-neutral-100 pt-4 text-xs font-mono text-neutral-600">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                  <span>Celebrated: {new Date(album.weddingDate).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>

                {album.password && (
                  <div className="flex items-center gap-2 text-amber-700">
                    <Lock className="h-3.5 w-3.5 shrink-0" />
                    <span>Passcode Protected: <strong className="font-semibold">{album.password}</strong></span>
                  </div>
                )}

                {album.expiryDate && (
                  <div className="flex items-center gap-2 text-rose-600">
                    <CalendarOff className="h-3.5 w-3.5 shrink-0" />
                    <span>Link Expiration: {new Date(album.expiryDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Gallery link and QR Sharing box */}
          <div className="w-full lg:w-1/3 bg-white border border-neutral-200/70 p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <span className="text-neutral-400 font-mono text-[9px] tracking-[0.25em] uppercase font-bold block mb-4">
                💎 Client Portal Access
              </span>

              {/* Copy URL panel */}
              <div className="bg-[#FAFAFA] border border-neutral-200 rounded-xl p-3 flex items-center justify-between gap-3 mb-6">
                <div className="min-w-0 flex-1">
                  <span className="block text-[9px] font-mono text-neutral-400 uppercase tracking-wider mb-0.5">Direct Access URL</span>
                  <a 
                    href={galleryUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-xs text-neutral-800 font-mono truncate hover:underline block font-semibold flex items-center gap-1"
                  >
                    {galleryUrl.replace("https://", "").replace("http://", "")} <ExternalLink className="h-3 w-3 inline" />
                  </a>
                </div>

                <button
                  onClick={handleCopyLink}
                  className="p-2 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer shrink-0"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>

              {/* QR Code and Activation Toggle */}
              <div className="flex items-center gap-4">
                <div className="p-2 border border-neutral-200 bg-white rounded-xl shadow-sm shrink-0 flex items-center justify-center">
                  <canvas ref={qrCanvasRef} className="h-28 w-28" />
                </div>

                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <span className="block text-xs font-semibold text-neutral-900">QR Code Gallery Access</span>
                    <p className="text-[10px] text-neutral-400 font-light mt-0.5 leading-normal">
                      Share with wedding guests or place on seating charts.
                    </p>
                  </div>

                  <button
                    onClick={handleDownloadQR}
                    className="mt-3 inline-flex items-center justify-center gap-1 px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-[10px] uppercase font-bold tracking-wider cursor-pointer shadow-sm w-full"
                  >
                    <Download className="h-3.5 w-3.5" /> Download QR
                  </button>
                </div>
              </div>
            </div>

            {/* Link toggle trigger */}
            <div className="border-t border-neutral-100 pt-4 mt-6 flex items-center justify-between text-xs">
              <span className="font-sans text-neutral-500 font-light">Status: <strong>{album.isActive ? "Online" : "Offline"}</strong></span>
              <button
                onClick={toggleLinkStatus}
                className="flex items-center gap-1 font-semibold transition-colors cursor-pointer text-xs uppercase font-sans tracking-wide"
              >
                {album.isActive ? (
                  <div className="flex items-center gap-1.5 text-emerald-600">
                    <span>Enabled</span>
                    <ToggleRight className="h-7 w-7 text-emerald-600" />
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-neutral-400">
                    <span>Disabled</span>
                    <ToggleLeft className="h-7 w-7 text-neutral-300" />
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Workspace Tabs Switcher */}
        <div className="border-b border-neutral-200/60 mb-8 flex gap-6">
          <button
            onClick={() => setActiveTab("media")}
            className={`pb-4 text-sm font-sans font-medium transition-all relative cursor-pointer ${
              activeTab === "media"
                ? "text-neutral-900 border-b-2 border-neutral-900 font-semibold"
                : "text-neutral-400 hover:text-neutral-900"
            }`}
          >
            Uploaded Media ({photos.length})
          </button>
          <button
            onClick={() => { setActiveTab("selections"); fetchClientSelections(); }}
            className={`pb-4 text-sm font-sans font-medium transition-all relative flex items-center gap-1.5 cursor-pointer ${
              activeTab === "selections"
                ? "text-rose-600 border-b-2 border-rose-500 font-semibold"
                : "text-neutral-400 hover:text-neutral-900"
            }`}
          >
            <Heart className={`h-4 w-4 ${activeTab === "selections" ? "fill-current text-rose-500" : ""}`} />
            <span>Client Selections ({clientSelections.length})</span>
          </button>
        </div>

        {/* Dynamic Workspace Panels */}
        <AnimatePresence mode="wait">
          {activeTab === "media" ? (
            /* Tab 1: Uploaded Media Grid & Folders Workflow */
            <motion.div
              key="media-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-8"
            >
              {/* TWO-LEVEL WEDDING FOLDERS NAVIGATION SECTION */}
              <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 shadow-sm">
                {!selectedSide && !activeFolderId ? (
                  /* LEVEL 1: DEFAULT VIEW - TWO LARGE CARDS ONLY */
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
                      <div>
                        <h2 className="text-lg font-serif text-neutral-900 tracking-wide font-bold">
                          Wedding Folder Portal
                        </h2>
                        <p className="text-xs text-neutral-500 font-light mt-0.5">
                          Select Bride Side or Groom Side to view event subfolders and manage uploads.
                        </p>
                      </div>
                      <button
                        onClick={() => { setEditingFolder(null); setIsFolderModalOpen(true); }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold px-4 py-2 text-xs shadow-sm transition cursor-pointer self-start sm:self-auto"
                      >
                        <Plus className="h-4 w-4 text-amber-400" />
                        <span>Create Custom Folder</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* BRIDE SIDE CARD */}
                      <div
                        onClick={() => setSelectedSide("BRIDE")}
                        className="group relative overflow-hidden bg-gradient-to-br from-pink-500/10 via-rose-500/5 to-amber-500/10 border-2 border-pink-200 hover:border-pink-500 rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-4xl">👰</span>
                            <span className="bg-pink-500 text-white font-bold text-xs uppercase px-3 py-1 rounded-full shadow-sm">
                              {enrichedFolders.filter(f => f.side === "BRIDE").length} Event Folders
                            </span>
                          </div>

                          <h3 className="font-serif text-2xl font-bold text-stone-900 group-hover:text-pink-600 transition-colors">
                            Bride Side
                          </h3>

                          <p className="text-xs text-stone-600 mt-2 font-medium leading-relaxed">
                            📁 {enrichedFolders.filter(f => f.side === "BRIDE").map(f => f.name).join(" • ") || "Aiburo Bhat • Mehendi • Wedding Day • Wedding Night • Biday"}
                          </p>

                          <div className="mt-6 flex flex-wrap items-center gap-3 text-xs font-mono text-stone-500">
                            <span className="bg-white/80 px-3 py-1.5 rounded-lg border border-pink-100 font-semibold text-pink-700 shadow-xs">
                              📸 {enrichedFolders.filter(f => f.side === "BRIDE").reduce((acc, f) => acc + (f.totalPhotos || 0), 0)} Photos
                            </span>
                            <span className="bg-white/80 px-3 py-1.5 rounded-lg border border-pink-100 font-semibold text-rose-600 shadow-xs">
                              ❤️ {enrichedFolders.filter(f => f.side === "BRIDE").reduce((acc, f) => acc + (f.selectedPhotosCount || 0), 0)} Selected
                            </span>
                          </div>
                        </div>

                        <div className="mt-8 pt-4 border-t border-pink-200/60 flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-pink-700 group-hover:translate-x-1 transition-transform">
                            Open Bride Side Folders →
                          </span>
                          <span className="p-2.5 bg-pink-500 text-white rounded-xl shadow-md group-hover:bg-pink-600 transition">
                            <FolderIcon className="h-4 w-4" />
                          </span>
                        </div>
                      </div>

                      {/* GROOM SIDE CARD */}
                      <div
                        onClick={() => setSelectedSide("GROOM")}
                        className="group relative overflow-hidden bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-amber-500/10 border-2 border-blue-200 hover:border-blue-500 rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-4xl">🤵</span>
                            <span className="bg-blue-600 text-white font-bold text-xs uppercase px-3 py-1 rounded-full shadow-sm">
                              {enrichedFolders.filter(f => f.side === "GROOM").length} Event Folders
                            </span>
                          </div>

                          <h3 className="font-serif text-2xl font-bold text-stone-900 group-hover:text-blue-600 transition-colors">
                            Groom Side
                          </h3>

                          <p className="text-xs text-stone-600 mt-2 font-medium leading-relaxed">
                            📁 {enrichedFolders.filter(f => f.side === "GROOM").map(f => f.name).join(" • ") || "Aiburo Bhat • Wedding Day • Wedding Night • Boron • Reception"}
                          </p>

                          <div className="mt-6 flex flex-wrap items-center gap-3 text-xs font-mono text-stone-500">
                            <span className="bg-white/80 px-3 py-1.5 rounded-lg border border-blue-100 font-semibold text-blue-700 shadow-xs">
                              📸 {enrichedFolders.filter(f => f.side === "GROOM").reduce((acc, f) => acc + (f.totalPhotos || 0), 0)} Photos
                            </span>
                            <span className="bg-white/80 px-3 py-1.5 rounded-lg border border-blue-100 font-semibold text-rose-600 shadow-xs">
                              ❤️ {enrichedFolders.filter(f => f.side === "GROOM").reduce((acc, f) => acc + (f.selectedPhotosCount || 0), 0)} Selected
                            </span>
                          </div>
                        </div>

                        <div className="mt-8 pt-4 border-t border-blue-200/60 flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-blue-700 group-hover:translate-x-1 transition-transform">
                            Open Groom Side Folders →
                          </span>
                          <span className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md group-hover:bg-blue-700 transition">
                            <FolderIcon className="h-4 w-4" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : activeFolderId ? (
                  /* LEVEL 3: ACTIVE SUBFOLDER VIEW */
                  <div>
                    <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 shadow-sm">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setActiveFolderId(null)}
                          className="py-2 px-3.5 bg-white hover:bg-stone-100 rounded-xl text-xs font-bold text-stone-800 border border-amber-200 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" />
                          <span>Back to {selectedSide === "BRIDE" || folders.find(f => f.id === activeFolderId)?.side === "BRIDE" ? "Bride Folders" : "Groom Folders"}</span>
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-serif text-base font-bold text-stone-900">
                              📁 {folders.find((f) => f.id === activeFolderId)?.name}
                            </h3>
                            <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900">
                              {folders.find((f) => f.id === activeFolderId)?.side === "BRIDE" ? "👰 Bride Side" : "🤵 Groom Side"}
                            </span>
                          </div>
                          <span className="text-xs text-stone-500">
                            Showing photos in this event folder ({photos.filter((p) => p.folderId === activeFolderId).length} files)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const f = folders.find((fol) => fol.id === activeFolderId);
                            if (f) {
                              setEditingFolder(f);
                              setIsFolderModalOpen(true);
                            }
                          }}
                          className="px-3 py-1.5 bg-white border border-amber-200 hover:bg-amber-100 text-stone-800 text-xs font-medium rounded-lg transition flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="h-3.5 w-3.5" /> Rename
                        </button>
                        <button
                          onClick={() => handleDeleteFolder(activeFolderId)}
                          className="px-3 py-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-xs font-medium rounded-lg transition flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete Folder
                        </button>
                      </div>
                    </div>

                    {/* Dedicated Folder Drag and Drop Uploader */}
                    <div className="mb-8">
                      <BatchUploader
                        albumId={album.id}
                        selectedFolderId={activeFolderId}
                        folders={folders}
                        onUploadSuccess={fetchAlbumDetails}
                      />
                    </div>
                  </div>
                ) : (
                  /* LEVEL 2: SUBFOLDERS PAGE FOR BRIDE OR GROOM SIDE */
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setSelectedSide(null)}
                          className="py-2 px-3.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm transition cursor-pointer"
                        >
                          <ArrowLeft className="h-4 w-4 text-amber-400" />
                          <span>Back to Main Sides</span>
                        </button>
                        <div>
                          <h2 className="text-lg font-serif font-bold text-stone-900 flex items-center gap-2">
                            <span>{selectedSide === "BRIDE" ? "👰 Bride Side Event Folders" : "🤵 Groom Side Event Folders"}</span>
                          </h2>
                          <p className="text-xs text-stone-500 mt-0.5">
                            Each event folder has its own upload trigger. Click a folder to view or upload photos.
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => { setEditingFolder(null); setIsFolderModalOpen(true); }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold px-4 py-2 text-xs shadow-sm transition cursor-pointer self-start sm:self-auto"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Create Folder</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      {enrichedFolders
                        .filter((f) => f.side === selectedSide)
                        .map((folder, idx, arr) => (
                          <FolderCard
                            key={folder.id}
                            folder={folder}
                            isActive={activeFolderId === folder.id}
                            isAdmin={true}
                            isFirst={idx === 0}
                            isLast={idx === arr.length - 1}
                            onClick={() => setActiveFolderId(folder.id)}
                            onEdit={() => {
                              setEditingFolder(folder);
                              setIsFolderModalOpen(true);
                            }}
                            onDelete={() => handleDeleteFolder(folder.id)}
                            onUploadDirect={() => setActiveFolderId(folder.id)}
                            onMoveUp={() => handleReorderFolder(folder.id, "up")}
                            onMoveDown={() => handleReorderFolder(folder.id, "down")}
                          />
                        ))}

                      {enrichedFolders.filter((f) => f.side === selectedSide).length === 0 && (
                        <div className="col-span-full py-8 text-center bg-stone-50 rounded-xl border border-dashed border-stone-200">
                          <FolderIcon className="h-8 w-8 text-stone-300 mx-auto mb-2" />
                          <p className="text-xs font-medium text-stone-500">No event folders found for this side.</p>
                          <button
                            onClick={() => { setEditingFolder(null); setIsFolderModalOpen(true); }}
                            className="mt-2 text-xs text-amber-600 font-bold hover:underline"
                          >
                            + Create a new folder
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* MEDIA VAULT PHOTOS HEADER & BATCH ACTION TOOLBAR */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <div>
                  <h2 className="text-lg font-serif text-neutral-900 tracking-wide font-bold flex items-center gap-2">
                    <span>
                      {activeFolderId
                        ? `Photos in "${folders.find((f) => f.id === activeFolderId)?.name}"`
                        : "All Wedding Photos"}
                    </span>
                    <span className="text-xs font-mono font-normal text-stone-500">
                      ({photos.filter((p) => (!activeFolderId ? true : p.folderId === activeFolderId) && p.filename.toLowerCase().includes(searchQuery.toLowerCase())).length} files)
                    </span>
                  </h2>
                  <p className="text-xs text-neutral-500 font-light mt-0.5">
                    Select photos to move them into different folders or perform batch actions
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Search */}
                  <div className="relative w-full sm:w-60">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                      <Search className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search photos..."
                      className="w-full pl-9 pr-4 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-sans text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-800 transition-colors shadow-sm"
                    />
                  </div>

                  {/* Batch Selection Action Buttons */}
                  {selectedPhotoIds.length > 0 && (
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl text-xs">
                      <span className="font-bold text-amber-900">{selectedPhotoIds.length} selected</span>
                      <button
                        onClick={() => setIsMovePhotosModalOpen(true)}
                        className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-lg transition flex items-center gap-1"
                      >
                        <MoveRight className="h-3.5 w-3.5" /> Move
                      </button>
                      <button
                        onClick={() => setSelectedPhotoIds([])}
                        className="px-2 py-1 text-stone-500 hover:text-stone-800"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* PHOTO GRID */}
              {photos.filter((p) => (!activeFolderId ? true : p.folderId === activeFolderId) && p.filename.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                <div className="bg-white border border-neutral-200/60 p-12 text-center rounded-2xl shadow-sm">
                  <Image className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-neutral-800">No images found</h3>
                  <p className="text-xs text-neutral-400 font-light mt-1 max-w-xs mx-auto">
                    {searchQuery ? "No results match your search query." : "Upload photos using the uploader above."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {photos
                    .filter((p) => (!activeFolderId ? true : p.folderId === activeFolderId) && p.filename.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((photo) => {
                      const isSelected = selectedPhotoIds.includes(photo.id);
                      const parentFolder = folders.find((f) => f.id === photo.folderId);

                      return (
                        <div 
                          key={photo.id}
                          className={`bg-white border rounded-xl overflow-hidden group shadow-sm hover:shadow-md transition-all relative ${
                            isSelected ? "border-amber-500 ring-2 ring-amber-500/40" : "border-neutral-200"
                          }`}
                        >
                          {/* Photo Display */}
                          <div className="aspect-square bg-neutral-100 relative overflow-hidden flex items-center justify-center">
                            {(photo.thumbnailUrl || photo.url) && (
                              <img
                                src={photo.thumbnailUrl || photo.url}
                                alt={photo.filename}
                                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            )}

                            {/* Batch Select Checkbox */}
                            <button
                              onClick={() => {
                                setSelectedPhotoIds((prev) =>
                                  prev.includes(photo.id)
                                    ? prev.filter((pid) => pid !== photo.id)
                                    : [...prev, photo.id]
                                );
                              }}
                              className={`absolute top-2 right-2 p-1.5 rounded-lg backdrop-blur-md transition z-10 ${
                                isSelected
                                  ? "bg-amber-500 text-stone-950 shadow"
                                  : "bg-black/40 text-white hover:bg-black/60"
                              }`}
                              title={isSelected ? "Deselect" : "Select for batch action"}
                            >
                              {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                            </button>

                            {/* Folder Badge if on All Folders view */}
                            {!activeFolderId && parentFolder && (
                              <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[9px] font-semibold px-2 py-0.5 rounded shadow-sm flex items-center gap-1">
                                <span>{parentFolder.side === "BRIDE" ? "👰" : parentFolder.side === "GROOM" ? "🤵" : "📁"}</span>
                                <span>{parentFolder.name}</span>
                              </div>
                            )}

                            {/* Quick Badge if it's Cover image */}
                            {album.coverUrl === photo.url && (
                              <div className="absolute bottom-2 left-2 bg-[#D4AF37] text-white text-[9px] font-mono tracking-wider px-2 py-0.5 rounded font-semibold uppercase shadow-sm">
                                Cover
                              </div>
                            )}

                            {/* Quick delete / rename overlay */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none group-hover:pointer-events-auto">
                              <button
                                onClick={() => {
                                  setRenamePhotoId(photo.id);
                                  setNewPhotoName(photo.filename);
                                }}
                                className="p-2 bg-white/90 hover:bg-white text-neutral-800 rounded-full cursor-pointer shadow"
                                title="Rename file"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeletePhoto(photo.id)}
                                className="p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full cursor-pointer shadow"
                                title="Delete photo"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {/* Info Row */}
                          <div className="p-3 border-t border-neutral-100">
                            {renamePhotoId === photo.id ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={newPhotoName}
                                  onChange={(e) => setNewPhotoName(e.target.value)}
                                  className="w-full bg-neutral-50 border border-neutral-200 rounded px-1.5 py-1 text-[11px] text-neutral-800 font-sans font-light focus:outline-none focus:border-neutral-800"
                                />
                                <button
                                  onClick={() => handleRenamePhoto(photo.id)}
                                  className="px-2 py-1 bg-neutral-900 text-white rounded text-[10px] font-mono cursor-pointer"
                                >
                                  OK
                                </button>
                                <button
                                  onClick={() => setRenamePhotoId(null)}
                                  className="px-2 py-1 border border-neutral-200 rounded text-[10px] font-mono cursor-pointer text-neutral-500"
                                >
                                  X
                                </button>
                              </div>
                            ) : (
                              <>
                                <span className="block text-[11px] font-medium text-neutral-800 truncate font-sans" title={photo.filename}>
                                  {photo.filename}
                                </span>
                                <div className="flex items-center justify-between mt-0.5 text-[10px] text-neutral-400 font-mono">
                                  <span>{formatSize(photo.size)}</span>
                                  {parentFolder && <span className="text-amber-700 font-sans font-semibold">{parentFolder.name}</span>}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </motion.div>
          ) : (
            /* Tab 2: Client Selections List & Folder Breakdown */
            <motion.div
              key="selections-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-8"
            >
              {/* Header & Master Download All Button */}
              <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 p-6 rounded-2xl text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📦</span>
                    <h2 className="text-lg font-serif font-bold tracking-wide">
                      Selected Photos Hub
                    </h2>
                  </div>
                  <p className="text-xs text-stone-300 font-light mt-1 max-w-xl leading-relaxed">
                    Automatically organizes client-selected photos into structured Bride Side and Groom Side folders with original image quality and original filenames.
                  </p>
                </div>

                <button
                  onClick={() => handleDownloadZip()}
                  disabled={downloadingZipKey === "all"}
                  className="py-3 px-6 bg-[#D4AF37] hover:bg-amber-500 disabled:bg-stone-700 text-stone-950 font-bold text-xs uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition cursor-pointer shrink-0"
                >
                  {downloadingZipKey === "all" ? (
                    <>
                      <div className="h-4 w-4 border-2 border-stone-950/30 border-t-stone-950 rounded-full animate-spin" />
                      <span>Packaging Wedding_Selected_Photos.zip...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      <span>📦 Download All Selected</span>
                    </>
                  )}
                </button>
              </div>

              {/* FOLDER-BY-FOLDER SELECTED BREAKDOWN (Requirements 8 & 9) */}
              <div className="space-y-6">
                <div className="border-b border-stone-200 pb-3 flex items-center justify-between">
                  <h3 className="font-serif text-base font-bold text-stone-900 flex items-center gap-2">
                    <span>📁 Selected Photos Grouped by Event Folders</span>
                  </h3>
                  <span className="text-xs font-mono text-stone-400">
                    Original quality downloads with original filenames
                  </span>
                </div>

                {/* BRIDE SIDE FOLDERS */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-pink-700 uppercase tracking-wider bg-pink-50 border border-pink-200/80 px-3.5 py-2 rounded-xl">
                    <span>👰</span> Bride Side Folders
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {enrichedFolders
                      .filter((f) => f.side === "BRIDE")
                      .map((f) => (
                        <div
                          key={f.id}
                          className="bg-white border border-stone-200 rounded-xl p-3.5 flex flex-col justify-between shadow-sm hover:border-pink-300 transition"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-serif text-sm font-bold text-stone-900 truncate" title={f.name}>
                                {f.name}
                              </span>
                              <span className="text-[10px] font-mono font-bold bg-pink-100 text-pink-800 px-2 py-0.5 rounded-full">
                                Bride
                              </span>
                            </div>

                            <div className="space-y-1 text-xs text-stone-600 mb-3 font-sans">
                              <div className="flex items-center justify-between">
                                <span className="text-stone-400 text-[11px]">Total Photos:</span>
                                <span className="font-mono font-semibold text-stone-800">{f.totalPhotos || 0}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-stone-400 text-[11px]">Selected (❤️):</span>
                                <span className="font-mono font-bold text-rose-600">{f.selectedPhotosCount || 0}</span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleDownloadFolderZip(f.id, f.name)}
                            disabled={downloadingZipKey === `folder_${f.id}` || (f.selectedPhotosCount || 0) === 0}
                            className="w-full py-1.5 px-3 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-200 disabled:text-stone-400 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            {downloadingZipKey === `folder_${f.id}` ? (
                              <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <Download className="h-3 w-3 text-amber-400" />
                            )}
                            <span>Download ZIP ({f.selectedPhotosCount || 0})</span>
                          </button>
                        </div>
                      ))}
                  </div>
                </div>

                {/* GROOM SIDE FOLDERS */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wider bg-blue-50 border border-blue-200/80 px-3.5 py-2 rounded-xl">
                    <span>🤵</span> Groom Side Folders
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {enrichedFolders
                      .filter((f) => f.side === "GROOM")
                      .map((f) => (
                        <div
                          key={f.id}
                          className="bg-white border border-stone-200 rounded-xl p-3.5 flex flex-col justify-between shadow-sm hover:border-blue-300 transition"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-serif text-sm font-bold text-stone-900 truncate" title={f.name}>
                                {f.name}
                              </span>
                              <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                Groom
                              </span>
                            </div>

                            <div className="space-y-1 text-xs text-stone-600 mb-3 font-sans">
                              <div className="flex items-center justify-between">
                                <span className="text-stone-400 text-[11px]">Total Photos:</span>
                                <span className="font-mono font-semibold text-stone-800">{f.totalPhotos || 0}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-stone-400 text-[11px]">Selected (❤️):</span>
                                <span className="font-mono font-bold text-rose-600">{f.selectedPhotosCount || 0}</span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleDownloadFolderZip(f.id, f.name)}
                            disabled={downloadingZipKey === `folder_${f.id}` || (f.selectedPhotosCount || 0) === 0}
                            className="w-full py-1.5 px-3 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-200 disabled:text-stone-400 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            {downloadingZipKey === `folder_${f.id}` ? (
                              <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <Download className="h-3 w-3 text-amber-400" />
                            )}
                            <span>Download ZIP ({f.selectedPhotosCount || 0})</span>
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* CLIENT SELECTIONS LIST */}
              <div className="space-y-4 pt-4 border-t border-stone-200">
                <h3 className="font-serif text-base font-bold text-stone-900 flex items-center justify-between">
                  <span>👥 Individual Client Selection Streams</span>
                  <span className="text-xs font-mono text-stone-400 font-normal">
                    {clientSelections.length} Client lists active
                  </span>
                </h3>

                {isLoadingSelections ? (
                  <div className="p-12 text-center">
                    <div className="h-8 w-8 rounded-full border-2 border-rose-200 border-t-rose-500 animate-spin mx-auto mb-4" />
                    <span className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase">Synchronizing favorites...</span>
                  </div>
                ) : clientSelections.length === 0 ? (
                  <div className="bg-white border border-neutral-200/60 p-12 text-center rounded-2xl shadow-sm max-w-xl mx-auto">
                    <Heart className="h-10 w-10 text-neutral-200 mx-auto mb-4 animate-pulse" />
                    <h3 className="text-sm font-semibold text-neutral-800">No client curation lists active</h3>
                    <p className="text-xs text-neutral-400 font-light mt-1 max-w-xs mx-auto leading-relaxed">
                      Once clients access their unique portfolio link and like photographs, their personalized lists and bulk ZIP download files will populate here instantly.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {clientSelections.map((sel) => (
                      <div
                        key={sel.clientEmail}
                        className="bg-white border border-neutral-200/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-4 mb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-serif font-bold text-neutral-900">
                                {sel.clientName || "Unnamed Curator"}
                              </span>
                              <span className="text-[10px] font-mono bg-rose-50 border border-rose-100 text-rose-600 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                {sel.photos.length} Selected
                              </span>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500 font-sans mt-1.5">
                              <span className="font-semibold text-neutral-700">{sel.clientEmail}</span>
                              <span className="text-neutral-300">|</span>
                              <span className="flex items-center gap-1 font-mono text-[11px]">
                                <Clock className="h-3.5 w-3.5 text-neutral-400" />
                                Latest edit: {new Date(sel.selectionDate).toLocaleString()}
                              </span>
                            </div>
                          </div>

                          {/* Individual Client Selection ZIP Download */}
                          <button
                            onClick={() => handleDownloadZip(sel.clientEmail, sel.clientName || "photos")}
                            disabled={downloadingZipKey === sel.clientEmail}
                            className="py-2 px-3.5 bg-neutral-950 hover:bg-neutral-800 disabled:bg-neutral-300 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
                          >
                            {downloadingZipKey === sel.clientEmail ? (
                              <>
                                <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Bundling ZIP...</span>
                              </>
                            ) : (
                              <>
                                <Download className="h-3.5 w-3.5 text-[#D4AF37]" />
                                <span>Download Client ZIP ({sel.photos.length} files)</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Photo strip preview */}
                        <div>
                          <h4 className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest mb-2.5">
                            Liked Photos
                          </h4>
                          
                          <div className="flex gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                            {sel.photos.map((photo: any) => (
                              <div
                                key={photo.id}
                                className="w-20 h-20 rounded-xl border border-neutral-200 overflow-hidden shrink-0 bg-neutral-50 relative group"
                              >
                                {(photo.thumbnailUrl || photo.url) && (
                                  <img
                                    src={photo.thumbnailUrl || photo.url}
                                    alt={photo.filename}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Edit Album Config Modal */}
      <EditAlbumModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSuccess={fetchAlbumDetails}
        album={album}
      />

      {/* Create / Edit Folder Modal */}
      <FolderModal
        isOpen={isFolderModalOpen}
        onClose={() => {
          setIsFolderModalOpen(false);
          setEditingFolder(null);
        }}
        onSubmit={handleSaveFolder}
        initialFolder={editingFolder}
        defaultSide={selectedSide === "ALL" ? "BRIDE" : selectedSide}
      />

      {/* Move Photos Modal */}
      <MovePhotosModal
        isOpen={isMovePhotosModalOpen}
        onClose={() => setIsMovePhotosModalOpen(false)}
        folders={folders}
        selectedCount={selectedPhotoIds.length}
        onMove={handleMovePhotos}
      />

      {/* Delete Album Confirmation Modal */}
      <AnimatePresence>
        {isDeleteConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full relative z-10 text-gray-900 border border-neutral-100 shadow-2xl"
            >
              <div className="text-center">
                <div className="h-12 w-12 rounded-full bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-serif text-neutral-950 mb-2">Delete Entire Gallery?</h3>
                <p className="text-xs text-neutral-500 font-sans font-light leading-normal mb-6">
                  This action is permanent. It will delete the database entries and erase all {photos.length} uploaded wedding photos from physical server storage completely.
                </p>

                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setIsDeleteConfirmOpen(false)}
                    disabled={isDeleting}
                    className="px-5 py-2.5 border border-neutral-200 text-neutral-700 hover:bg-neutral-50 rounded-lg text-xs font-semibold uppercase tracking-widest cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAlbum}
                    disabled={isDeleting}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold uppercase tracking-widest cursor-pointer flex items-center gap-1.5"
                  >
                    {isDeleting ? (
                      <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      "Erase Album"
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast HUD */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`px-4 py-3 rounded-xl border flex items-center gap-2 shadow-lg text-xs font-medium ${
                toast.type === "success"
                  ? "bg-white border-neutral-200 text-neutral-900"
                  : "bg-rose-50 border-rose-200 text-rose-800"
              }`}
            >
              {toast.type === "success" ? (
                <Check className="h-4 w-4 text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
              )}
              <span>{toast.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
