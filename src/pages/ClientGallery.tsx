import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useSettings } from "../context/SettingsContext.js";
import { 
  Heart, Lock, Sparkles, ChevronLeft, ChevronRight, X, 
  RotateCw, ZoomIn, Eye, ShieldAlert, HeartHandshake, KeyRound, AlertCircle,
  Mail, User, Check, CheckCircle, FolderHeart, Info, LogOut,
  Download, Maximize2, Minimize2, ArrowLeft, Search, Folder as FolderIcon,
  Phone, Globe, Instagram, Facebook, MessageSquare, BookOpen
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import FolderCard from "../components/FolderCard.js";
import ClientLightboxViewer from "../components/ClientLightboxViewer.js";
import { Folder } from "../types.js";

interface PublicAlbum {
  id: string;
  brideName: string;
  groomName: string;
  weddingDate: string;
  eventName: string;
  coverUrl?: string;
  description?: string;
  passwordRequired: boolean;
  expiryDate?: string;
}

interface PublicPhoto {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
  filename: string;
  size: number;
  folderId?: string | null;
}

export default function ClientGallery() {
  const { id } = useParams<{ id: string }>();
  const { settings } = useSettings();
  const [album, setAlbum] = useState<PublicAlbum | null>(null);
  const [photos, setPhotos] = useState<PublicPhoto[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeSide, setActiveSide] = useState<"BRIDE" | "GROOM" | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordRequired, setPasswordRequired] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Client Selection Details
  const [clientEmail, setClientEmail] = useState(() => localStorage.getItem("clientEmail") || "");
  const [clientName, setClientName] = useState(() => localStorage.getItem("clientName") || "");
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  
  // Modal & Navigation States
  const [isIdentityModalOpen, setIsIdentityModalOpen] = useState(false);
  const [tempEmail, setTempEmail] = useState("");
  const [tempName, setTempName] = useState("");
  const [viewMode, setViewMode] = useState<"all" | "selected">("all");
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [savingSelectionId, setSavingSelectionId] = useState<string | null>(null);

  // Lightbox Viewer
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  const [rotateAngle, setRotateAngle] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [showScreenshotWarning, setShowScreenshotWarning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [comments, setComments] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(`gallery-comments-${id}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [hasProofingPublished, setHasProofingPublished] = useState(false);

  useEffect(() => {
    if (id) {
      fetch(`/api/proofing/${id}`)
        .then((res) => res.json())
        .then((resData) => {
          const proofing = resData.data || resData;
          if (proofing && proofing.versions && proofing.versions.some((v: any) => v.isPublished || v.spreads?.length > 0)) {
            setHasProofingPublished(true);
          }
        })
        .catch((e) => console.warn("Proofing check error:", e));
    }
  }, [id]);

  const handleSaveComment = (photoId: string, text: string) => {
    const updated = { ...comments, [photoId]: text };
    setComments(updated);
    localStorage.setItem(`gallery-comments-${id}`, JSON.stringify(updated));
  };

  const handleToggleFullscreen = () => {
    const el = document.getElementById("lightbox-root");
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(err => {
        console.error("Fullscreen failed:", err);
      });
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Swipe gesture variables
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const fetchGallery = async (galleryPassword = "") => {
    setIsLoading(true);
    setError("");
    setPasswordError("");

    try {
      const headers: HeadersInit = {};
      const actualPassword = galleryPassword || localStorage.getItem(`gallery-password-${id}`) || "";
      
      if (actualPassword) {
        headers["x-gallery-password"] = actualPassword;
      }

      const response = await fetch(`/api/albums/gallery-access/${id}`, {
        headers,
      });

      const data = await response.json();

      if (response.ok) {
        setAlbum(data.album);
        const isReq = data.album.passwordRequired && data.authError;
        setPasswordRequired(isReq);
        
        if (isReq && galleryPassword) {
          setPasswordError("Incorrect gallery passcode. Please try again.");
        } else if (!isReq && actualPassword) {
          // Store valid passcode for seamless refreshes
          localStorage.setItem(`gallery-password-${id}`, actualPassword);
        }
        
        setPhotos(data.photos || []);
        setFolders(data.folders || []);

        // Log view activity for project visibility
        try {
          fetch(`/api/proofing/${id}/activity`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              side: "BRIDE",
              type: "View",
              description: "Client opened public photo gallery",
              user: localStorage.getItem("clientName") || localStorage.getItem("clientEmail") || "Client"
            })
          }).catch(() => {});
        } catch (e) {}
      } else {
        throw new Error(data.error || "Failed to load wedding gallery.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSelections = async (email: string) => {
    if (!email) return;
    try {
      const response = await fetch(`/api/albums/gallery-access/${id}/selections?clientEmail=${encodeURIComponent(email)}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedPhotoIds(data.selectedPhotoIds || []);
      }
    } catch (err) {
      console.error("Failed to load selections:", err);
    }
  };

  useEffect(() => {
    fetchGallery();
  }, [id]);

  useEffect(() => {
    const studioName = settings.studioName || "My Studio";
    if (album) {
      document.title = `${album.brideName} & ${album.groomName} | ${studioName}`;
    } else {
      document.title = `Wedding Gallery | ${studioName}`;
    }
  }, [album, settings.studioName]);

  useEffect(() => {
    if (clientEmail) {
      fetchSelections(clientEmail);
    }
  }, [id, clientEmail]);

  // Handle keyboard events (Lightbox navigation, screenshots printscreen block)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Lightbox Controls
      if (activePhotoIndex !== null) {
        if (e.key === "ArrowRight") handleNextPhoto();
        if (e.key === "ArrowLeft") handlePrevPhoto();
        if (e.key === "Escape") handleCloseLightbox();
      }

      // Simulated screenshot triggers / copy blocks
      if (e.key === "PrintScreen" || (e.ctrlKey && e.key === "p") || (e.metaKey && e.shiftKey && e.key === "3") || (e.metaKey && e.shiftKey && e.key === "4")) {
        triggerScreenshotWarning();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePhotoIndex, photos]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    fetchGallery(password);
  };

  const handleIdentitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempEmail.trim()) return;

    localStorage.setItem("clientEmail", tempEmail.trim());
    localStorage.setItem("clientName", tempName.trim());
    setClientEmail(tempEmail.trim());
    setClientName(tempName.trim());
    setIsIdentityModalOpen(false);
    fetchSelections(tempEmail.trim());
  };

  const handleClearIdentity = () => {
    if (confirm("Are you sure you want to exit selection mode? Your saved selections will remain secure, but you will need to re-enter details to edit them.")) {
      localStorage.removeItem("clientEmail");
      localStorage.removeItem("clientName");
      setClientEmail("");
      setClientName("");
      setSelectedPhotoIds([]);
      setViewMode("all");
    }
  };

  const handleToggleSelect = async (e: React.MouseEvent | undefined, photoId: string) => {
    if (e) e.stopPropagation(); // Avoid triggering lightbox if clicked from gallery grid

    if (!clientEmail) {
      setTempEmail("");
      setTempName("");
      setIsIdentityModalOpen(true);
      return;
    }

    // Prevent action if gallery is expired
    if (album?.expiryDate && new Date() > new Date(album.expiryDate)) {
      alert("This gallery has expired. Selection updates are disabled.");
      return;
    }

    const isSelected = selectedPhotoIds.includes(photoId);

    // Limit check
    if (!isSelected && settings.maxSelectionLimit && settings.maxSelectionLimit > 0 && selectedPhotoIds.length >= settings.maxSelectionLimit) {
      alert(`Selection limit reached. You can select a maximum of ${settings.maxSelectionLimit} photographs for this portfolio.`);
      return;
    }

    setSavingSelectionId(photoId);

    // Optimistic UI update
    setSelectedPhotoIds((prev) =>
      isSelected ? prev.filter((pid) => pid !== photoId) : [...prev, photoId]
    );

    try {
      const response = await fetch(`/api/albums/gallery-access/${id}/selections`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          photoId,
          clientEmail,
          clientName,
          selected: !isSelected,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Failed to update selection.");
        // Revert selection status on error
        setSelectedPhotoIds((prev) =>
          isSelected ? [...prev, photoId] : prev.filter((pid) => pid !== photoId)
        );
      }
    } catch (err) {
      console.error(err);
      // Revert selection status on network error
      setSelectedPhotoIds((prev) =>
        isSelected ? [...prev, photoId] : prev.filter((pid) => pid !== photoId)
      );
    } finally {
      setSavingSelectionId(null);
    }
  };

  const handleSubmitSelection = () => {
    if (selectedPhotoIds.length === 0) {
      alert("Please select at least one photograph to submit.");
      return;
    }
    setIsSubmitConfirmOpen(true);
  };

  const handleConfirmSubmit = () => {
    setIsSubmitConfirmOpen(false);
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
    }, 6000);
  };

  // Lightbox actions
  const handleOpenLightbox = (index: number) => {
    // Check if the photo is from our current filtered displayed list
    const actualPhotoId = displayedPhotos[index].id;
    const originalIndex = photos.findIndex((p) => p.id === actualPhotoId);
    
    setActivePhotoIndex(originalIndex !== -1 ? originalIndex : index);
    setRotateAngle(0);
    setIsZoomed(false);
  };

  const handleCloseLightbox = () => {
    setActivePhotoIndex(null);
  };

  const handleNextPhoto = () => {
    if (activePhotoIndex === null) return;
    setActivePhotoIndex((activePhotoIndex + 1) % photos.length);
    setRotateAngle(0);
    setIsZoomed(false);
  };

  const handlePrevPhoto = () => {
    if (activePhotoIndex === null) return;
    setActivePhotoIndex((activePhotoIndex - 1 + photos.length) % photos.length);
    setRotateAngle(0);
    setIsZoomed(false);
  };

  const handleRotate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRotateAngle((prev) => (prev + 90) % 360);
  };

  const handleZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsZoomed(!isZoomed);
  };

  // Swipe detection for mobile touch support
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current - touchEndX.current > 75) {
      // Swiped Left
      handleNextPhoto();
    }
    if (touchStartX.current - touchEndX.current < -75) {
      // Swiped Right
      handlePrevPhoto();
    }
  };

  const triggerScreenshotWarning = () => {
    setShowScreenshotWarning(true);
    setTimeout(() => setShowScreenshotWarning(false), 5000);
  };

  if (isLoading && !album) {
    return (
      <div className="min-h-screen bg-[#FBFBFA] flex flex-col items-center justify-center text-gray-900">
        <div className="h-10 w-10 rounded-full border-2 border-[#D4AF37]/20 border-t-[#D4AF37] animate-spin" />
        <span className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase mt-4 block">
          Loading Luxury Gallery...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FBFBFA] flex flex-col items-center justify-center p-6 text-gray-900">
        <div className="text-amber-600 mb-4 border border-amber-100 bg-amber-50 p-4 rounded-full">
          <ShieldAlert className="h-6 w-6 animate-bounce" />
        </div>
        <h2 className="text-xl font-serif text-neutral-900 mb-2">Gallery Offline</h2>
        <p className="text-xs text-neutral-500 font-sans mb-6 text-center max-w-sm leading-relaxed">
          {error}
        </p>
      </div>
    );
  }

  // Password Wall View
  if (passwordRequired) {
    return (
      <div className="min-h-screen bg-[#121211] text-white flex items-center justify-center p-6 relative overflow-hidden">
        {/* Background Overlay */}
        <div className="absolute inset-0 bg-radial-[circle_at_center,_var(--tw-gradient-stops)] from-neutral-900/60 via-black to-black z-0" />
        <div className="absolute inset-0 border border-neutral-800/20 m-6 pointer-events-none z-10" />

        <div className="w-full max-w-md bg-neutral-950 border border-neutral-800/80 p-8 rounded-2xl relative z-10 text-center shadow-2xl">
          <div className="h-12 w-12 rounded-full border border-[#D4AF37]/50 flex items-center justify-center mx-auto mb-6 bg-black/40">
            <Lock className="h-5 w-5 text-[#D4AF37]" />
          </div>

          <span className="text-[#D4AF37] font-mono text-[9px] tracking-[0.3em] uppercase block mb-1">
            Secure Portrait Suite
          </span>
          <h2 className="text-2xl font-serif font-light text-white mb-3">
            Passcode Protected Gallery
          </h2>
          <p className="text-xs text-neutral-400 font-sans font-light max-w-xs mx-auto mb-8 leading-relaxed">
            Please enter the exclusive security passcode provided by your wedding photographer to view these collections.
          </p>

          {passwordError && (
            <div className="mb-6 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-sans font-light flex items-center gap-2 justify-center">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-5">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                <KeyRound className="h-4 w-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Gallery Passcode"
                className="w-full pl-10 pr-4 py-3 bg-neutral-900/50 border border-neutral-800 rounded-lg text-sm font-sans font-light text-white text-center tracking-[0.25em] focus:outline-none focus:border-[#D4AF37] transition-colors"
                autoFocus
              />
            </div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="w-full py-3 bg-[#D4AF37] hover:bg-[#C49F27] text-black font-semibold text-xs uppercase tracking-widest rounded-lg transition-colors cursor-pointer"
            >
              Verify Passcode
            </motion.button>
          </form>

          {/* Copyright badge */}
          <div className="mt-8 text-[9px] font-mono text-neutral-600 tracking-wider uppercase">
            © {settings.studioName || "My Studio"}
          </div>
        </div>
      </div>
    );
  }

  // Compute enriched folders with dynamic photo and selection counts
  const enrichedFolders = folders.map((f) => {
    const fPhotos = photos.filter((p) => p.folderId === f.id);
    return {
      ...f,
      totalPhotos: fPhotos.length,
      selectedPhotosCount: fPhotos.filter((p) => selectedPhotoIds.includes(p.id)).length,
      coverUrl: f.coverUrl || fPhotos[0]?.url || null,
    };
  });

  // Filter photos based on folder, side, search query, and favorites mode
  const displayedPhotos = photos.filter((p) => {
    // 1. Favorites view filter
    if (viewMode === "selected" && !selectedPhotoIds.includes(p.id)) {
      return false;
    }
    // 2. Active folder filter
    if (activeFolderId && p.folderId !== activeFolderId) {
      return false;
    }
    // 3. Side filter (when not inside a specific folder)
    if (!activeFolderId && activeSide) {
      const parentFolder = folders.find((f) => f.id === p.folderId);
      if (parentFolder && parentFolder.side !== activeSide) {
        return false;
      }
    }
    // 4. Search query filter
    if (searchQuery && !p.filename.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    return true;
  });

  return (
    <>
      <div 
        className={activePhotoIndex !== null ? "hidden" : "min-h-screen bg-[#FBFBFA] text-gray-900 selection:bg-neutral-900 selection:text-white"}
        id="gallery-root"
        aria-hidden={activePhotoIndex !== null}
        onContextMenu={(e) => e.preventDefault()} // Disable right-click save
      >
      {/* Floating screenshot warning banner */}
      <AnimatePresence>
        {showScreenshotWarning && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-6 inset-x-6 z-50 max-w-md mx-auto bg-neutral-950/95 border border-amber-500/30 text-white p-4 rounded-xl flex items-start gap-3.5 shadow-2xl backdrop-blur-md"
          >
            <ShieldAlert className="h-5 w-5 text-amber-500 mt-0.5 shrink-0 animate-bounce" />
            <div>
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Copyright Protected</h4>
              <p className="text-[11px] text-neutral-400 font-light mt-0.5 leading-relaxed">
                Screenshots and right-click saving are restricted. Please tap the Heart ❤️ button inside the grid to save your selections and submit them securely to our studio.
              </p>
            </div>
            <button 
              onClick={() => setShowScreenshotWarning(false)}
              className="text-neutral-500 hover:text-white ml-auto cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Submit Success Banner */}
      <AnimatePresence>
        {isSubmitted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          >
            <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-neutral-100 shadow-2xl text-center">
              <div className="h-16 w-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-5 border border-emerald-100">
                <Check className="h-8 w-8 stroke-[3]" />
              </div>
              <h3 className="text-2xl font-serif text-neutral-900 mb-2">Selection Submitted!</h3>
              <p className="text-xs text-neutral-500 font-sans font-light leading-relaxed mb-6">
                Thank you, <strong className="text-neutral-800 font-medium">{clientName || "Curator"}</strong>. Your beautiful wedding selection of <strong className="text-[#D4AF37] font-semibold">{selectedPhotoIds.length} photographs</strong> has been sent directly to the {settings.studioName} studio workflow.
              </p>
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/50 text-[10px] text-neutral-500 font-sans mb-6 text-left flex gap-2.5">
                <Info className="h-4 w-4 text-[#D4AF37] shrink-0 mt-0.5" />
                <span>You can still refine or edit your selections at any time before your studio link expires. Changes will synchronize automatically.</span>
              </div>
              <button
                onClick={() => setIsSubmitted(false)}
                className="w-full py-3 bg-neutral-900 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Return to Gallery
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Album Proofing Banner when published */}
      {hasProofingPublished && (
        <div className="bg-stone-900 border-b border-amber-500/40 text-white px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-[#D4AF37] shrink-0" />
            <span className="text-xs font-serif font-bold text-amber-300">
              📖 Album Proofing Ready
            </span>
            <span className="text-xs text-stone-300 hidden md:inline">
              Your wedding album layout spreads are ready for review and approval.
            </span>
          </div>
          <Link
            to={`/gallery/${id}/proofing`}
            className="px-4 py-1.5 bg-[#D4AF37] hover:bg-[#b89528] text-stone-950 font-extrabold text-xs rounded-xl transition shadow-md flex items-center gap-1.5 shrink-0"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Open Album Proofing</span>
          </Link>
        </div>
      )}

      {/* Hero Banner Section */}
      <section className="relative h-[55vh] bg-[#121211] text-white overflow-hidden flex items-center justify-center">
        {/* Background Cover image */}
        {(settings.defaultCover?.trim() || album?.coverUrl?.trim()) ? (
          <div className="absolute inset-0">
            <img
              src={settings.defaultCover?.trim() || album?.coverUrl?.trim()}
              alt="Wedding Cover"
              className="h-full w-full object-cover opacity-35 blur-[1px] scale-102"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#FBFBFA] via-neutral-950/40 to-neutral-950/70" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-t from-[#FBFBFA] via-neutral-950/20 to-neutral-950/50" />
        )}

        {/* Framing border */}
        <div className="absolute inset-6 border border-white/10 pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 text-center max-w-3xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
          >
            <span className="text-[#D4AF37] font-mono text-[9px] tracking-[0.4em] uppercase font-bold block mb-3">
              {album?.eventName || "Curated"} Collection
            </span>

            <h1 className="text-4xl md:text-5xl font-serif font-light text-white tracking-wide mb-3">
              {settings.galleryTitle || (album ? `${album.brideName} & ${album.groomName}` : "Wedding Gallery")}
            </h1>

            {album?.weddingDate && (
              <p className="text-[10px] font-mono text-[#D4AF37]/80 uppercase tracking-widest mb-4">
                {new Date(album.weddingDate).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            )}

            <p className="text-xs text-neutral-300 font-sans font-light max-w-md mx-auto leading-relaxed italic border-t border-white/5 pt-4">
              "{settings.galleryDescription || album?.description || "Bespoke photography and curated legacies."}"
            </p>
          </motion.div>
        </div>
      </section>

      {/* Client Identity & selection guide Bar */}
      <div className="bg-white border-y border-neutral-200/60 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
              <FolderHeart className="h-4 w-4" />
            </div>
            {clientEmail ? (
              <div>
                <span className="block text-[11px] font-mono uppercase text-neutral-400 tracking-wider">Curation active</span>
                <span className="text-xs font-semibold text-neutral-800 flex items-center gap-2">
                  {clientName || "Curator"} ({clientEmail})
                  <button 
                    onClick={handleClearIdentity}
                    className="p-1 hover:bg-neutral-100 rounded text-neutral-400 hover:text-rose-600 transition-colors cursor-pointer"
                    title="Change email/identity"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                </span>
              </div>
            ) : (
              <div>
                <span className="block text-[11px] font-mono uppercase text-neutral-400 tracking-wider">Selection suite</span>
                <button
                  onClick={() => setIsIdentityModalOpen(true)}
                  className="text-xs text-[#D4AF37] hover:text-[#C49F27] font-semibold underline text-left cursor-pointer"
                >
                  Enter details to activate favorites selection
                </button>
              </div>
            )}
          </div>

          {/* Controls: View modes, Proofing, and Submit */}
          <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 flex-wrap">
            <Link
              to={`/gallery/${id}/proofing`}
              className="py-1.5 px-3.5 bg-stone-900 hover:bg-stone-800 text-[#D4AF37] font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 border border-stone-800 cursor-pointer"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>📖 Album Proofing</span>
            </Link>

            {/* Toggle Tab Buttons */}
            <div className="flex bg-neutral-100 p-1 rounded-xl border border-neutral-200/50">
              <button
                onClick={() => setViewMode("all")}
                className={`py-1.5 px-3.5 rounded-lg text-xs font-sans font-medium transition-all cursor-pointer ${
                  viewMode === "all"
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                All Photos {settings.showSelectionCounter !== false ? `(${photos.length})` : ""}
              </button>
              <button
                onClick={() => setViewMode("selected")}
                className={`py-1.5 px-3.5 rounded-lg text-xs font-sans font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "selected"
                    ? "bg-rose-500 text-white shadow-sm"
                    : "text-neutral-500 hover:text-rose-600"
                }`}
              >
                <Heart className={`h-3.5 w-3.5 ${viewMode === "selected" ? "fill-current" : ""}`} />
                <span>Favorites {settings.showSelectionCounter !== false ? `(${selectedPhotoIds.length})` : ""}</span>
              </button>
            </div>

            {/* Submit Selection Button */}
            {selectedPhotoIds.length > 0 && (
              <button
                onClick={handleSubmitSelection}
                className="py-2 px-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <CheckCircle className="h-4 w-4 text-[#D4AF37]" /> Submit Selections
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Gallery Photos & Folders Block */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-20">
        {photos.length === 0 ? (
          <div className="bg-white border border-neutral-200/60 p-16 text-center rounded-2xl shadow-sm max-w-2xl mx-auto">
            <Sparkles className="h-10 w-10 text-[#D4AF37] mx-auto mb-4 animate-pulse" />
            <h3 className="text-base font-serif text-neutral-800">Preparing Curation</h3>
            <p className="text-xs text-neutral-400 font-sans font-light mt-1 max-w-xs mx-auto leading-relaxed">
              We are currently selecting and organizing the finest photographs from your celebration. Please check back shortly!
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* TWO-LEVEL FOLDER NAVIGATION FOR CLIENT GALLERY */}
            {viewMode === "all" && !activeFolderId && !searchQuery && (
              <div>
                {!activeSide ? (
                  /* LEVEL 1: DEFAULT VIEW - TWO LARGE CARDS ONLY */
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-neutral-200/60 pb-3">
                      <div>
                        <h3 className="font-serif text-lg font-bold text-neutral-900">
                          Wedding Event Galleries
                        </h3>
                        <p className="text-xs text-neutral-500 font-light mt-0.5">
                          Select Bride Side or Groom Side to browse event folders and select photos.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* BRIDE SIDE CARD */}
                      <div
                        onClick={() => setActiveSide("BRIDE")}
                        className="group relative overflow-hidden bg-gradient-to-br from-pink-500/10 via-rose-500/5 to-amber-500/10 border-2 border-pink-200 hover:border-pink-500 rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-4xl">👰</span>
                            <span className="bg-pink-500 text-white font-bold text-xs uppercase px-3 py-1 rounded-full shadow-sm">
                              {enrichedFolders.filter((f) => f.side === "BRIDE").length} Event Folders
                            </span>
                          </div>

                          <h3 className="font-serif text-2xl font-bold text-neutral-900 group-hover:text-pink-600 transition-colors">
                            Bride Side
                          </h3>

                          <p className="text-xs text-neutral-600 mt-2 font-medium leading-relaxed">
                            📁 {enrichedFolders.filter((f) => f.side === "BRIDE").map((f) => f.name).join(" • ") || "Aiburo Bhat • Mehendi • Wedding Day • Wedding Night • Biday"}
                          </p>

                          <div className="mt-6 flex flex-wrap items-center gap-3 text-xs font-mono text-neutral-500">
                            <span className="bg-white/80 px-3 py-1.5 rounded-lg border border-pink-100 font-semibold text-pink-700 shadow-xs">
                              📸 {enrichedFolders.filter((f) => f.side === "BRIDE").reduce((acc, f) => acc + (f.totalPhotos || 0), 0)} Photos
                            </span>
                            <span className="bg-white/80 px-3 py-1.5 rounded-lg border border-pink-100 font-semibold text-rose-600 shadow-xs">
                              ❤️ {enrichedFolders.filter((f) => f.side === "BRIDE").reduce((acc, f) => acc + (f.selectedPhotosCount || 0), 0)} Selected
                            </span>
                          </div>
                        </div>

                        <div className="mt-8 pt-4 border-t border-pink-200/60 flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-pink-700 group-hover:translate-x-1 transition-transform">
                            Open Bride Side Folders →
                          </span>
                          <span className="p-2.5 bg-pink-500 text-white rounded-xl shadow-md group-hover:bg-pink-600 transition">
                            <FolderHeart className="h-4 w-4" />
                          </span>
                        </div>
                      </div>

                      {/* GROOM SIDE CARD */}
                      <div
                        onClick={() => setActiveSide("GROOM")}
                        className="group relative overflow-hidden bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-amber-500/10 border-2 border-blue-200 hover:border-blue-500 rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-4xl">🤵</span>
                            <span className="bg-blue-600 text-white font-bold text-xs uppercase px-3 py-1 rounded-full shadow-sm">
                              {enrichedFolders.filter((f) => f.side === "GROOM").length} Event Folders
                            </span>
                          </div>

                          <h3 className="font-serif text-2xl font-bold text-neutral-900 group-hover:text-blue-600 transition-colors">
                            Groom Side
                          </h3>

                          <p className="text-xs text-neutral-600 mt-2 font-medium leading-relaxed">
                            📁 {enrichedFolders.filter((f) => f.side === "GROOM").map((f) => f.name).join(" • ") || "Aiburo Bhat • Wedding Day • Wedding Night • Boron • Reception"}
                          </p>

                          <div className="mt-6 flex flex-wrap items-center gap-3 text-xs font-mono text-neutral-500">
                            <span className="bg-white/80 px-3 py-1.5 rounded-lg border border-blue-100 font-semibold text-blue-700 shadow-xs">
                              📸 {enrichedFolders.filter((f) => f.side === "GROOM").reduce((acc, f) => acc + (f.totalPhotos || 0), 0)} Photos
                            </span>
                            <span className="bg-white/80 px-3 py-1.5 rounded-lg border border-blue-100 font-semibold text-rose-600 shadow-xs">
                              ❤️ {enrichedFolders.filter((f) => f.side === "GROOM").reduce((acc, f) => acc + (f.selectedPhotosCount || 0), 0)} Selected
                            </span>
                          </div>
                        </div>

                        <div className="mt-8 pt-4 border-t border-blue-200/60 flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-blue-700 group-hover:translate-x-1 transition-transform">
                            Open Groom Side Folders →
                          </span>
                          <span className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md group-hover:bg-blue-700 transition">
                            <FolderHeart className="h-4 w-4" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* LEVEL 2: SUBFOLDERS PAGE FOR BRIDE OR GROOM SIDE */
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-neutral-200/60 pb-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setActiveSide(null)}
                          className="py-2 px-3.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm transition cursor-pointer"
                        >
                          <ArrowLeft className="h-4 w-4 text-[#D4AF37]" />
                          <span>Back to Main Sides</span>
                        </button>
                        <div>
                          <h3 className="font-serif text-lg font-bold text-neutral-900 flex items-center gap-2">
                            <span>{activeSide === "BRIDE" ? "👰 Bride Side Event Folders" : "🤵 Groom Side Event Folders"}</span>
                            <span className="text-xs font-mono text-neutral-400 font-normal">
                              ({enrichedFolders.filter((f) => f.side === activeSide).length} folders)
                            </span>
                          </h3>
                          <span className="text-xs text-neutral-500 font-sans">
                            Tap any event folder to view photos and tap ❤️ to select your favorites
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      {enrichedFolders
                        .filter((f) => f.side === activeSide)
                        .map((folder) => (
                          <FolderCard
                            key={folder.id}
                            folder={folder}
                            isActive={false}
                            isAdmin={false}
                            onClick={() => setActiveFolderId(folder.id)}
                          />
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ACTIVE FOLDER BANNER (When client is inside a specific folder) */}
            {viewMode === "all" && activeFolderId && (
              <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3.5">
                  <button
                    onClick={() => setActiveFolderId(null)}
                    className="p-2 bg-white border border-amber-200 rounded-xl text-xs font-semibold text-stone-800 hover:bg-stone-50 transition flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
                  >
                    <ArrowLeft className="h-4 w-4 text-amber-700" />
                    <span>Back to Folders</span>
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif text-lg font-bold text-stone-900">
                        {folders.find((f) => f.id === activeFolderId)?.name}
                      </h3>
                      <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-amber-200/80 text-amber-900">
                        {folders.find((f) => f.id === activeFolderId)?.side === "BRIDE" ? "👰 Bride Side" : "🤵 Groom Side"}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 font-sans mt-0.5">
                      Browsing {displayedPhotos.length} photos • Tap ❤️ on any photo to save to your favorites
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* PHOTOS GRID HEADER */}
            <div className="flex items-center justify-between border-b border-neutral-200/60 pb-3">
              <span className="font-mono text-[10px] text-neutral-400 uppercase tracking-wider">
                {viewMode === "selected" ? "Your Favorites Vault" : activeFolderId ? `Folder Photos (${displayedPhotos.length})` : `All Photos (${displayedPhotos.length})`}
              </span>

              {album?.expiryDate && (
                <div className="flex items-center gap-1.5 text-xs text-rose-600 font-mono">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Closing on {new Date(album.expiryDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {/* EMPTY STATE FOR SEARCH OR FAVORITES */}
            {displayedPhotos.length === 0 ? (
              <div className="bg-white border border-neutral-200/60 p-12 text-center rounded-2xl shadow-sm max-w-xl mx-auto">
                {viewMode === "selected" ? (
                  <>
                    <Heart className="h-10 w-10 text-neutral-200 mx-auto mb-4 animate-bounce" />
                    <h3 className="text-base font-serif text-neutral-800">Your Favorites Vault is Empty</h3>
                    <p className="text-xs text-neutral-400 font-sans font-light mt-2 max-w-xs mx-auto leading-relaxed">
                      Browse the event folders and tap the ❤️ button on any photo to add it to your selection queue.
                    </p>
                    <button
                      onClick={() => setViewMode("all")}
                      className="mt-6 inline-flex items-center gap-1.5 py-2 px-4 bg-neutral-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer"
                    >
                      Browse Folders & Memories
                    </button>
                  </>
                ) : (
                  <>
                    <FolderIcon className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
                    <h3 className="text-base font-serif text-neutral-800">No photos match your filter</h3>
                    <p className="text-xs text-neutral-400 font-sans mt-1">
                      {searchQuery ? "Try searching with a different filename." : "No photos have been added to this folder yet."}
                    </p>
                  </>
                )}
              </div>
            ) : (
              /* PINTEREST STYLE STAGGERED COLUMNS GRID */
              <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-6">
                {displayedPhotos.map((photo, index) => {
                  const isSelected = selectedPhotoIds.includes(photo.id);
                  const parentFolder = folders.find((f) => f.id === photo.folderId);

                  return (
                    <motion.div
                      key={photo.id}
                      initial={{ opacity: 0, y: 15 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-50px" }}
                      transition={{ duration: 0.5, delay: (index % 4) * 0.05 }}
                      className="break-inside-avoid mb-6 bg-white border border-neutral-200/50 rounded-2xl overflow-hidden group shadow-sm hover:shadow-md transition-all relative cursor-zoom-in"
                      onClick={() => handleOpenLightbox(index)}
                    >
                      {/* Photo container */}
                      <div className="relative overflow-hidden select-none">
                        {(photo.thumbnailUrl || photo.url) && (
                          <img
                            src={photo.thumbnailUrl || photo.url}
                            alt={photo.filename}
                            loading="lazy"
                            className="w-full object-cover select-none pointer-events-none"
                            onContextMenu={(e) => e.preventDefault()}
                          />
                        )}

                        {/* Folder Badge if viewing All Folders */}
                        {!activeFolderId && parentFolder && (
                          <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white text-[10px] font-semibold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
                            <span>{parentFolder.side === "BRIDE" ? "👰" : "🤵"}</span>
                            <span>{parentFolder.name}</span>
                          </div>
                        )}

                        {settings.watermarkEnabled && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10 overflow-hidden">
                            <span className="text-white/20 font-serif text-[10px] tracking-[0.2em] uppercase rotate-[-30deg] border border-white/10 px-2 py-0.5 bg-black/10 backdrop-blur-[0.5px]">
                              {settings.watermarkText || settings.studioName || "Watermark"}
                            </span>
                          </div>
                        )}

                        {/* Floating Heart Checkbox - Premium, Mobile-First UI */}
                        <button
                          onClick={(e) => handleToggleSelect(e, photo.id)}
                          disabled={savingSelectionId === photo.id}
                          className={`absolute top-4 right-4 z-10 p-2.5 rounded-full backdrop-blur-md transition-all cursor-pointer ${
                            isSelected
                              ? "bg-rose-500 text-white scale-110 shadow-lg shadow-rose-500/20"
                              : "bg-black/45 text-white/90 hover:bg-black/60 hover:text-white"
                          }`}
                          title={isSelected ? "Remove from Favorites" : "Add to Favorites"}
                        >
                          {savingSelectionId === photo.id ? (
                            <div className="h-4.5 w-4.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <Heart className={`h-4.5 w-4.5 ${isSelected ? "fill-current animate-pulse" : ""}`} />
                          )}
                        </button>
                        
                        {/* Hover overlay with detail icon */}
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                          <div className="h-10 w-10 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center text-neutral-800 shadow">
                            <Eye className="h-4 w-4" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Dynamic Photographer Contact Footer */}
      {settings.showPhotographerContact && (
        <footer className="border-t border-neutral-200/60 dark:border-neutral-800/60 bg-neutral-50 dark:bg-neutral-900/40 py-16 mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <span className="font-mono text-[9px] text-[#D4AF37] uppercase tracking-[0.3em] font-semibold block mb-2">Creative Creator</span>
            <h3 className="text-xl font-serif text-neutral-800 dark:text-neutral-100 font-light mb-4">
              {settings.photographerName || "Julian Montgomery"}
            </h3>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto mb-8 font-sans font-light leading-relaxed">
              If you have any questions about selecting your photographs, print requests, or album layouts, feel free to reach out to the studio.
            </p>

            <div className="flex flex-wrap justify-center items-center gap-y-4 gap-x-8 text-xs text-neutral-500 dark:text-neutral-400">
              {settings.phone && (
                <a href={`tel:${settings.phone}`} className="flex items-center gap-2 hover:text-[#D4AF37] transition-colors">
                  <Phone className="h-3.5 w-3.5 text-[#D4AF37]/80" />
                  <span>{settings.phone}</span>
                </a>
              )}
              {settings.whatsApp && (
                <a href={`https://wa.me/${settings.whatsApp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-[#D4AF37] transition-colors">
                  <MessageSquare className="h-3.5 w-3.5 text-[#D4AF37]/80" />
                  <span>WhatsApp Chat</span>
                </a>
              )}
              {settings.email && (
                <a href={`mailto:${settings.email}`} className="flex items-center gap-2 hover:text-[#D4AF37] transition-colors">
                  <Mail className="h-3.5 w-3.5 text-[#D4AF37]/80" />
                  <span>{settings.email}</span>
                </a>
              )}
              {settings.website && (
                <a href={settings.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-[#D4AF37] transition-colors">
                  <Globe className="h-3.5 w-3.5 text-[#D4AF37]/80" />
                  <span>Visit Website</span>
                </a>
              )}
            </div>

            {/* Social Links */}
            {(settings.instagramUrl || settings.facebookUrl) && (
              <div className="flex items-center justify-center gap-4 mt-8 border-t border-neutral-200/40 dark:border-neutral-800/40 pt-8 max-w-xs mx-auto">
                {settings.instagramUrl && (
                  <a href={settings.instagramUrl} target="_blank" rel="noreferrer" className="p-2 bg-neutral-200/50 dark:bg-neutral-800/50 rounded-full hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] transition-all" title="Instagram Profile">
                    <Instagram className="h-4 w-4" />
                  </a>
                )}
                {settings.facebookUrl && (
                  <a href={settings.facebookUrl} target="_blank" rel="noreferrer" className="p-2 bg-neutral-200/50 dark:bg-neutral-800/50 rounded-full hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] transition-all" title="Facebook Page">
                    <Facebook className="h-4 w-4" />
                  </a>
                )}
              </div>
            )}
          </div>
        </footer>
      )}

      {/* Floating Bottom Navigation Bar for Mobile-First experience */}
      {selectedPhotoIds.length > 0 && (
        <div className="md:hidden fixed bottom-6 inset-x-6 z-40">
          <div className="bg-neutral-950/95 backdrop-blur-md border border-neutral-800/80 rounded-2xl py-3 px-4 flex items-center justify-between shadow-2xl">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-rose-500/10 text-rose-400 rounded-lg flex items-center justify-center">
                <Heart className="h-4.5 w-4.5 fill-current animate-pulse" />
              </div>
              <div>
                <span className="block text-[9px] font-mono uppercase text-neutral-500 tracking-wider">Selections</span>
                <span className="text-xs font-bold text-white">{selectedPhotoIds.length} Chosen</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setViewMode(viewMode === "all" ? "selected" : "all")}
                className="py-1.5 px-3 border border-neutral-800 text-neutral-300 hover:text-white rounded-xl text-[10px] uppercase font-bold tracking-wider cursor-pointer"
              >
                {viewMode === "all" ? "View Favs" : "View All"}
              </button>
              <button
                onClick={handleSubmitSelection}
                className="py-1.5 px-3 bg-[#D4AF37] text-black font-extrabold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Welcome & Identity Modal */}
      <AnimatePresence>
        {isIdentityModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsIdentityModalOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full relative z-10 text-gray-900 border border-neutral-100 shadow-2xl"
            >
              <button
                onClick={() => setIsIdentityModalOpen(false)}
                className="absolute top-5 right-5 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="text-center mb-6">
                <div className="h-12 w-12 rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] mx-auto mb-4">
                  <HeartHandshake className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-serif text-neutral-900">Activate Curated Selection</h3>
                <p className="text-xs text-neutral-400 font-sans font-light mt-1.5 leading-normal max-w-xs mx-auto">
                  Let's personalize your portfolio experience. Please provide your email to start creating and saving your selection of beautiful memories.
                </p>
              </div>

              <form onSubmit={handleIdentitySubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-neutral-400 tracking-wider mb-1.5">
                    Your Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      placeholder="e.g. Sarah Connor"
                      className="w-full pl-9 pr-3 py-2 border border-neutral-200 rounded-xl text-xs font-sans text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-neutral-400 tracking-wider mb-1.5">
                    Your Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={tempEmail}
                      onChange={(e) => setTempEmail(e.target.value)}
                      placeholder="e.g. sarah@example.com"
                      className="w-full pl-9 pr-3 py-2 border border-neutral-200 rounded-xl text-xs font-sans text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-900"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-100 text-[10px] text-amber-800 font-sans leading-normal">
                  No account setup is required. We only use your email to index and remember your chosen selections securely on our server.
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-colors cursor-pointer"
                >
                  Start Selection Mode
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Submit Confirmation Modal */}
      <AnimatePresence>
        {isSubmitConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSubmitConfirmOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full relative z-10 text-gray-900 border border-neutral-100 shadow-2xl"
            >
              <div className="text-center">
                <div className="h-12 w-12 rounded-full bg-rose-50 text-rose-500 border border-rose-100 flex items-center justify-center mx-auto mb-4">
                  <Heart className="h-6 w-6 fill-current animate-bounce" />
                </div>
                <h3 className="text-xl font-serif text-neutral-900">Confirm Photo Submission</h3>
                <p className="text-xs text-neutral-500 font-sans font-light mt-1.5 leading-relaxed mb-6">
                  You are about to submit <strong className="text-neutral-900 font-medium">{selectedPhotoIds.length} selected photographs</strong> to the studio as your official curation selection.
                </p>

                <div className="p-3 border border-neutral-100 rounded-xl bg-neutral-50/50 text-left text-xs mb-6 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Curator Name:</span>
                    <span className="font-medium text-neutral-800">{clientName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Email Address:</span>
                    <span className="font-medium text-neutral-800">{clientEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Total Selected:</span>
                    <span className="font-semibold text-[#D4AF37]">{selectedPhotoIds.length} Photos</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setIsSubmitConfirmOpen(false)}
                    className="flex-1 py-2.5 border border-neutral-200 text-neutral-700 hover:bg-neutral-50 rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer"
                  >
                    Keep Editing
                  </button>
                  <button
                    onClick={handleConfirmSubmit}
                    className="flex-1 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Submit Curation
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      </div>

      {/* True Fullscreen Lightbox Image Viewer */}
      <AnimatePresence>
        {activePhotoIndex !== null && (
          <ClientLightboxViewer
            photos={photos}
            activeIndex={activePhotoIndex}
            onClose={handleCloseLightbox}
            onNavigate={(newIndex) => setActivePhotoIndex(newIndex)}
            watermarkEnabled={settings.watermarkEnabled}
            watermarkText={settings.watermarkText || settings.studioName || ""}
          />
        )}
      </AnimatePresence>
    </>
  );
}
