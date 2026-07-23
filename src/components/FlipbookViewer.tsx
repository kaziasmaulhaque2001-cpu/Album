import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  MessageSquare,
  X,
  Lock,
  Grid,
  Sparkles
} from "lucide-react";
import { AlbumSpread, ProofingComment, ProofingSettings } from "../types/proofing.js";
import AnnotationModal from "./AnnotationModal.js";
import { SpreadImage } from "./SpreadImage.js";

interface FlipbookViewerProps {
  spreads: AlbumSpread[];
  comments?: ProofingComment[];
  settings?: ProofingSettings;
  side: "BRIDE" | "GROOM";
  albumTitle?: string;
  versionTitle?: string;
  albumCoverUrl?: string;
  onAddComment?: (comment: {
    spreadId: string;
    spreadNumber: number;
    spreadTitle: string;
    text: string;
    pinX?: number;
    pinY?: number;
    file: File | null;
  }) => Promise<void>;
  onResolveComment?: (commentId: string) => Promise<void>;
  isClientView?: boolean;
}

export type PageType =
  | "front_cover"
  | "inside_cover"
  | "spread"
  | "inside_back_cover"
  | "back_cover";

export interface AlbumPage {
  id: string;
  type: PageType;
  title: string;
  spread?: AlbumSpread;
  pageIndex: number;
}

export default function FlipbookViewer({
  spreads = [],
  comments = [],
  settings,
  side,
  albumTitle = "Wedding Album",
  versionTitle = "Published Proofing Version",
  albumCoverUrl,
  onAddComment,
  onResolveComment,
  isClientView = true
}: FlipbookViewerProps) {
  // Page Sequence Generation according to strict fixed slots:
  // Slot 1: Front Cover
  // Slot 2: Inside Cover
  // Slot 3..N: Spreads
  // Slot Last-1: Inside Back Cover
  // Slot Last: Back Cover
  const pages: AlbumPage[] = React.useMemo(() => {
    const list: AlbumPage[] = [];
    let idx = 0;

    const findSpreadByPageType = (pt: PageType) => {
      return spreads.find((s) => {
        const typeVal = String(s.pageType || s.type || "").toLowerCase();
        if (pt === "front_cover") return typeVal === "front_cover" || typeVal === "front";
        if (pt === "inside_cover") return typeVal === "inside_cover" || typeVal === "inside";
        if (pt === "inside_back_cover") return typeVal === "inside_back_cover" || typeVal === "inside_back" || typeVal === "last_inside_cover";
        if (pt === "back_cover") return typeVal === "back_cover" || typeVal === "back";
        return false;
      });
    };

    const frontSpread = findSpreadByPageType("front_cover");
    const insideSpread = findSpreadByPageType("inside_cover");
    const insideBackSpread = findSpreadByPageType("inside_back_cover");
    const backSpread = findSpreadByPageType("back_cover");

    const normalSpreads = spreads.filter((s) => {
      const typeVal = String(s.pageType || s.type || "").toLowerCase();
      return (
        typeVal !== "front_cover" &&
        typeVal !== "front" &&
        typeVal !== "inside_cover" &&
        typeVal !== "inside" &&
        typeVal !== "inside_back_cover" &&
        typeVal !== "inside_back" &&
        typeVal !== "last_inside_cover" &&
        typeVal !== "back_cover" &&
        typeVal !== "back"
      );
    });

    normalSpreads.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

    // 1. Front Cover (Slot 1)
    list.push({
      id: frontSpread?.id || "slot-front-cover",
      type: "front_cover",
      title: "Front Cover",
      spread: frontSpread,
      pageIndex: idx++,
    });

    // 2. Inside Cover (Slot 2)
    list.push({
      id: insideSpread?.id || "slot-inside-cover",
      type: "inside_cover",
      title: "Inside Cover",
      spread: insideSpread,
      pageIndex: idx++,
    });

    // 3. Spreads (Slot 3..N)
    if (normalSpreads.length === 0) {
      list.push({
        id: "slot-spread-1",
        type: "spread",
        title: "Spread 01",
        spread: undefined,
        pageIndex: idx++,
      });
    } else {
      normalSpreads.forEach((s, i) => {
        list.push({
          id: s.id || `slot-spread-${i + 1}`,
          type: "spread",
          title: s.title || `Spread ${String(i + 1).padStart(2, "0")}`,
          spread: s,
          pageIndex: idx++,
        });
      });
    }

    // 4. Inside Back Cover
    list.push({
      id: insideBackSpread?.id || "slot-inside-back-cover",
      type: "inside_back_cover",
      title: "Inside Back Cover",
      spread: insideBackSpread,
      pageIndex: idx++,
    });

    // 5. Back Cover
    list.push({
      id: backSpread?.id || "slot-back-cover",
      type: "back_cover",
      title: "Back Cover",
      spread: backSpread,
      pageIndex: idx++,
    });

    return list;
  }, [spreads]);

  // Active View States
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [showCommentsSidebar, setShowCommentsSidebar] = useState(false);
  const [pinMode, setPinMode] = useState(false);
  const [selectedPin, setSelectedPin] = useState<{ x: number; y: number } | null>(null);
  const [isAnnotationOpen, setIsAnnotationOpen] = useState(false);

  // Transition States (Smooth Fade/Slide - 200–250ms)
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"next" | "prev" | "fade">("fade");

  // Zoom & Pan State
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDraggingPan, setIsDraggingPan] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number }>({ x: 0, y: 0, panX: 0, panY: 0 });

  // Touch Swipe & Pinch Gesture Refs
  const touchStartRef = useRef<{ x: number; y: number; time: number; initialDist?: number }>({ x: 0, y: 0, time: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const activeThumbnailRef = useRef<HTMLButtonElement>(null);

  const currentPage = pages[currentIndex] || pages[0];
  const totalPages = pages.length;

  // Auto-scroll active thumbnail into view
  useEffect(() => {
    if (activeThumbnailRef.current) {
      activeThumbnailRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center"
      });
    }
  }, [currentIndex, showThumbnails]);

  // Preload Images (Prev 2, Current, Next 2 spreads) for instant high performance
  useEffect(() => {
    const urlsToPreload: string[] = [];
    [-2, -1, 0, 1, 2].forEach((offset) => {
      const idx = currentIndex + offset;
      if (idx >= 0 && idx < pages.length) {
        const p = pages[idx];
        if (p.spread?.url) urlsToPreload.push(p.spread.url);
        if (p.spread?.thumbnailUrl) urlsToPreload.push(p.spread.thumbnailUrl);
      }
    });

    urlsToPreload.forEach((url) => {
      const img = new Image();
      img.src = url;
    });
  }, [currentIndex, pages]);

  // Prevent Context Menu & Image Dragging
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleDragStart = (e: DragEvent) => e.preventDefault();
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("dragstart", handleDragStart);
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("dragstart", handleDragStart);
    };
  }, []);

  // Smooth Page Navigation Transition
  const goToPage = useCallback(
    (targetIndex: number, direction: "next" | "prev" | "fade" = "fade") => {
      if (targetIndex < 0 || targetIndex >= totalPages || targetIndex === currentIndex) return;

      setIsTransitioning(true);
      setSlideDirection(direction);

      // Reset zoom & pan on page switch
      setZoomLevel(1);
      setPanPosition({ x: 0, y: 0 });

      setTimeout(() => {
        setCurrentIndex(targetIndex);
        setTimeout(() => {
          setIsTransitioning(false);
        }, 50);
      }, 150);
    },
    [currentIndex, totalPages]
  );

  const handleNext = useCallback(() => {
    goToPage(currentIndex + 1, "next");
  }, [currentIndex, goToPage]);

  const handlePrev = useCallback(() => {
    goToPage(currentIndex - 1, "prev");
  }, [currentIndex, goToPage]);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAnnotationOpen) return;
      if (e.key === "ArrowRight" || e.key === "Space" || e.key === "PageDown") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "Escape") {
        if (isFullscreen) {
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }
          setIsFullscreen(false);
        }
        setZoomLevel(1);
        setPanPosition({ x: 0, y: 0 });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev, isAnnotationOpen, isFullscreen]);

  // Fullscreen Handler
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  // Zoom Controls
  const handleZoomIn = () => {
    setZoomLevel((z) => Math.min(3.5, z + 0.5));
  };

  const handleZoomOut = () => {
    setZoomLevel((z) => {
      const next = Math.max(1, z - 0.5);
      if (next === 1) setPanPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  };

  // Double Tap / Double Click Zoom
  const handleDoubleTapZoom = (e: React.MouseEvent<HTMLDivElement>) => {
    if (pinMode) return;
    if (zoomLevel > 1) {
      handleResetZoom();
    } else {
      if (stageRef.current) {
        const rect = stageRef.current.getBoundingClientRect();
        const offsetX = (e.clientX - (rect.left + rect.width / 2)) * -0.5;
        const offsetY = (e.clientY - (rect.top + rect.height / 2)) * -0.5;
        setPanPosition({ x: offsetX, y: offsetY });
      }
      setZoomLevel(2.2);
    }
  };

  // Wheel Zoom
  const handleWheelZoom = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey || zoomLevel > 1) {
      e.preventDefault();
      if (e.deltaY < 0) {
        setZoomLevel((z) => Math.min(3.5, z + 0.2));
      } else {
        setZoomLevel((z) => {
          const nz = Math.max(1, z - 0.2);
          if (nz === 1) setPanPosition({ x: 0, y: 0 });
          return nz;
        });
      }
    }
  };

  // Drag Pan Handlers
  const handleMouseDownPan = (e: React.MouseEvent) => {
    if (zoomLevel > 1 && !pinMode) {
      setIsDraggingPan(true);
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        panX: panPosition.x,
        panY: panPosition.y
      };
    }
  };

  const handleMouseMovePan = (e: React.MouseEvent) => {
    if (isDraggingPan && zoomLevel > 1) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setPanPosition({
        x: panStartRef.current.panX + dx,
        y: panStartRef.current.panY + dy
      });
    }
  };

  const handleMouseUpPan = () => {
    setIsDraggingPan(false);
  };

  // Touch Swipe & Pinch Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      };

      if (zoomLevel > 1) {
        setIsDraggingPan(true);
        panStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          panX: panPosition.x,
          panY: panPosition.y
        };
      }
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartRef.current.initialDist = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDraggingPan && zoomLevel > 1) {
      const dx = e.touches[0].clientX - panStartRef.current.x;
      const dy = e.touches[0].clientY - panStartRef.current.y;
      setPanPosition({
        x: panStartRef.current.panX + dx,
        y: panStartRef.current.panY + dy
      });
    } else if (e.touches.length === 2 && touchStartRef.current.initialDist) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = dist / touchStartRef.current.initialDist;
      setZoomLevel((z) => Math.min(3.5, Math.max(1, z * (delta > 1 ? 1.03 : 0.97))));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsDraggingPan(false);
    if (zoomLevel === 1 && e.changedTouches.length === 1) {
      const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
      const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
      const dt = Date.now() - touchStartRef.current.time;

      if (dt < 400 && Math.abs(dx) > 40 && Math.abs(dy) < 80) {
        if (dx < 0) {
          handleNext();
        } else {
          handlePrev();
        }
      }
    }
  };

  // Correction Pin Click
  const handleSpreadClickForPin = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pinMode || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setSelectedPin({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
    setIsAnnotationOpen(true);
    setPinMode(false);
  };

  const handleAnnotationSubmit = async (text: string, file: File | null) => {
    if (!onAddComment || !currentPage) return;
    await onAddComment({
      spreadId: currentPage.spread?.id || currentPage.id,
      spreadNumber: currentPage.pageIndex,
      spreadTitle: currentPage.title,
      text,
      pinX: selectedPin?.x,
      pinY: selectedPin?.y,
      file
    });
    setSelectedPin(null);
  };

  const currentComments = currentPage.spread?.id
    ? comments.filter((c) => c.spreadId === currentPage.spread?.id)
    : [];

  // Render Page Content
  const renderPageContent = (page: AlbumPage) => {
    // If image artwork is uploaded for this slot, render full spread image
    if (page.spread?.url) {
      return (
        <div className="w-full h-full flex items-center justify-center relative">
          <SpreadImage
            src={page.spread.url}
            alt={page.title}
            className="w-full h-full max-h-[75vh] rounded-lg shadow-2xl object-contain"
            enableWatermark={settings?.enableWatermark}
          />
        </div>
      );
    }

    // Otherwise render empty slot banner with "Not Uploaded Yet" badge
    return (
      <div className="w-full max-w-2xl aspect-[3/2] bg-stone-900/90 border border-stone-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center select-none shadow-2xl my-auto">
        <div className="max-w-md space-y-4 text-stone-300">
          <div className="w-12 h-12 mx-auto rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 font-serif text-lg">
            ✦
          </div>
          <h2 className="text-xl font-serif text-stone-200">{page.title}</h2>
          <div className="inline-block px-3 py-1 bg-stone-950 border border-stone-800 text-amber-400 font-mono text-xs rounded-full uppercase tracking-wider font-bold">
            Not Uploaded Yet
          </div>
          <p className="text-xs font-mono text-stone-500 pt-2">
            This album slot is ready for page upload.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-screen bg-stone-950 text-stone-100 flex flex-col overflow-hidden select-none ${
        isFullscreen ? "p-0" : ""
      }`}
      onWheel={handleWheelZoom}
    >
      {/* Top Header Controls Bar */}
      <div className="z-40 bg-stone-900/90 backdrop-blur-md border-b border-stone-800 px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-stone-950 flex items-center justify-center font-bold text-xs shadow-md">
            {currentIndex + 1}
          </div>
          <div>
            <h2 className="text-xs font-bold text-stone-200 tracking-wide uppercase flex items-center gap-2">
              <span>{albumTitle}</span>
              <span className="text-stone-600">•</span>
              <span className="text-amber-400">{currentPage.title}</span>
            </h2>
            <p className="text-[10px] text-stone-400 font-mono">
              {versionTitle} ({side})
            </p>
          </div>
        </div>

        {/* Central Page Indicator Badge */}
        <div className="hidden md:flex items-center gap-2 bg-stone-950 border border-stone-800 px-3 py-1.5 rounded-full text-xs font-mono text-stone-300">
          <button
            onClick={handlePrev}
            disabled={currentIndex <= 0}
            className="text-stone-400 hover:text-amber-400 disabled:opacity-30 transition"
            title="Previous Spread (Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span>
            <strong className="text-amber-400">{currentIndex + 1}</strong> / {totalPages}
          </span>
          <button
            onClick={handleNext}
            disabled={currentIndex >= totalPages - 1}
            className="text-stone-400 hover:text-amber-400 disabled:opacity-30 transition"
            title="Next Spread (Right Arrow)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right Tools Bar */}
        <div className="flex items-center gap-2">
          {/* Zoom Toolbar */}
          <div className="flex items-center bg-stone-950 border border-stone-800 rounded-lg p-1 text-stone-300">
            <button
              onClick={handleZoomOut}
              className="p-1.5 hover:text-white rounded hover:bg-stone-800 transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-[10px] font-mono min-w-[36px] text-center text-amber-300">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 hover:text-white rounded hover:bg-stone-800 transition"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            {zoomLevel > 1 && (
              <button
                onClick={handleResetZoom}
                className="p-1.5 hover:text-amber-400 rounded hover:bg-stone-800 transition border-l border-stone-800 ml-1"
                title="Reset Zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Comment Pin Mode Toggle */}
          {onAddComment && (
            <button
              onClick={() => setPinMode(!pinMode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                pinMode
                  ? "bg-amber-400 text-stone-950 shadow-lg shadow-amber-400/20 animate-pulse"
                  : "bg-stone-950 border border-stone-800 text-stone-300 hover:text-white"
              }`}
            >
              <span>📍</span>
              <span className="hidden sm:inline">{pinMode ? "Click Image to Pin Note" : "Add Note Pin"}</span>
            </button>
          )}

          {/* Toggle Comments Sidebar */}
          <button
            onClick={() => setShowCommentsSidebar(!showCommentsSidebar)}
            className="px-3 py-1.5 bg-stone-950 border border-stone-800 text-stone-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Comments ({comments.length})</span>
          </button>

          {/* Thumbnail Strip Toggle */}
          <button
            onClick={() => setShowThumbnails(!showThumbnails)}
            className={`p-2 border rounded-lg transition ${
              showThumbnails
                ? "bg-amber-400/10 border-amber-400 text-amber-400"
                : "bg-stone-950 border-stone-800 text-stone-400 hover:text-white"
            }`}
            title="Toggle Thumbnails Strip"
          >
            <Grid className="w-4 h-4" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-stone-950 border border-stone-800 text-stone-300 hover:text-white rounded-lg transition"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Album Preview Stage */}
      <div
        className="relative flex-1 bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 flex items-center justify-center p-2 sm:p-6 min-h-0 overflow-hidden"
        onMouseDown={handleMouseDownPan}
        onMouseMove={handleMouseMovePan}
        onMouseUp={handleMouseUpPan}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* On-Screen Previous Button */}
        <button
          onClick={handlePrev}
          disabled={currentIndex <= 0}
          className="absolute left-2 sm:left-6 z-30 p-3.5 rounded-full bg-stone-900/80 hover:bg-amber-400 hover:text-stone-950 border border-stone-700/80 text-stone-200 shadow-2xl transition-all transform hover:scale-110 disabled:opacity-0 disabled:pointer-events-none"
          title="Previous Spread"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* On-Screen Next Button */}
        <button
          onClick={handleNext}
          disabled={currentIndex >= totalPages - 1}
          className="absolute right-2 sm:right-6 z-30 p-3.5 rounded-full bg-stone-900/80 hover:bg-amber-400 hover:text-stone-950 border border-stone-700/80 text-stone-200 shadow-2xl transition-all transform hover:scale-110 disabled:opacity-0 disabled:pointer-events-none"
          title="Next Spread"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Zoom & Pan Container Stage */}
        <div
          ref={stageRef}
          onClick={handleDoubleTapZoom}
          className={`relative w-full h-full max-w-6xl max-h-[75vh] flex items-center justify-center transition-transform duration-200 ease-out ${
            zoomLevel > 1
              ? isDraggingPan
                ? "cursor-grabbing"
                : "cursor-grab"
              : pinMode
              ? "cursor-crosshair"
              : "cursor-default"
          }`}
          style={{
            transform: `scale(${zoomLevel}) translate(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px)`
          }}
        >
          {/* Main Display Box with Transition Fade/Slide */}
          <div
            onClick={handleSpreadClickForPin}
            className={`relative w-full h-full flex items-center justify-center transition-all duration-200 ease-out ${
              isTransitioning
                ? slideDirection === "next"
                  ? "opacity-30 -translate-x-4"
                  : slideDirection === "prev"
                  ? "opacity-30 translate-x-4"
                  : "opacity-30 scale-98"
                : "opacity-100 translate-x-0 scale-100"
            }`}
          >
            {renderPageContent(currentPage)}

            {/* Correction Comment Pins */}
            {currentComments.map((cmt, idx) => {
              if (cmt.pinX === undefined || cmt.pinY === undefined) return null;
              return (
                <div
                  key={cmt.id}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full font-bold text-xs flex items-center justify-center shadow-2xl cursor-pointer border-2 transition transform hover:scale-125 z-35 ${
                    cmt.status === "Resolved"
                      ? "bg-emerald-500 text-stone-950 border-emerald-300"
                      : "bg-amber-400 text-stone-950 border-white animate-bounce"
                  }`}
                  style={{ left: `${cmt.pinX}%`, top: `${cmt.pinY}%` }}
                  title={`${cmt.author}: ${cmt.text}`}
                >
                  {idx + 1}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Thumbnail Navigation Strip */}
      {showThumbnails && (
        <div className="z-40 bg-stone-900/90 backdrop-blur-md border-t border-stone-800 p-3 flex items-center gap-2.5 overflow-x-auto scrollbar-thin scrollbar-thumb-stone-700 select-none">
          {pages.map((p, idx) => {
            const isActive = idx === currentIndex;
            const isUploaded = Boolean(p.spread?.url || p.spread?.thumbnailUrl);
            return (
              <button
                key={p.id}
                ref={isActive ? activeThumbnailRef : null}
                onClick={() => goToPage(idx, idx > currentIndex ? "next" : "prev")}
                className={`shrink-0 relative rounded-lg overflow-hidden border-2 transition-all min-w-[96px] h-14 ${
                  isActive
                    ? "border-amber-400 scale-105 shadow-xl ring-2 ring-amber-400/30"
                    : "border-stone-800 opacity-70 hover:opacity-100 hover:scale-102 bg-stone-950"
                }`}
              >
                {isUploaded ? (
                  <SpreadImage
                    src={p.spread!.thumbnailUrl || p.spread!.url}
                    alt={p.title}
                    className="h-14 w-28 object-cover"
                    objectFit="cover"
                  />
                ) : (
                  <div className="h-14 w-28 bg-stone-950 flex flex-col items-center justify-center p-1 text-[9px] font-mono text-stone-400 text-center border border-stone-800/80">
                    <span className="font-bold text-amber-300 truncate max-w-[85px]">{p.title}</span>
                    <span className="text-[8px] text-stone-500 font-sans mt-0.5 bg-stone-900 px-1 py-0.2 rounded border border-stone-800">
                      Not Uploaded Yet
                    </span>
                  </div>
                )}
                <span className="absolute bottom-0 right-0 bg-stone-950/90 text-[9px] text-amber-300 font-mono px-1 rounded-tl border-t border-l border-stone-800 font-bold">
                  {idx + 1}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Comments Sidebar Drawer */}
      {showCommentsSidebar && (
        <div className="absolute right-0 top-14 bottom-0 w-80 md:w-96 bg-stone-900/95 backdrop-blur-2xl border-l border-stone-800 z-50 p-4 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <h3 className="text-sm font-bold text-stone-100 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-400" />
              <span>Spread Comments</span>
            </h3>
            <button
              onClick={() => setShowCommentsSidebar(false)}
              className="text-stone-400 hover:text-white p-1 rounded hover:bg-stone-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-3 space-y-3">
            {currentComments.length === 0 ? (
              <p className="text-stone-500 text-xs text-center py-8">No comments on this spread yet.</p>
            ) : (
              currentComments.map((c) => (
                <div key={c.id} className="bg-stone-950 border border-stone-800 rounded-xl p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-stone-400">
                    <span className="font-semibold text-stone-200">
                      {c.author} ({c.authorRole})
                    </span>
                    <span className="font-mono text-[10px]">
                      {new Date(c.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-stone-300 font-medium">{c.text}</p>

                  {c.attachmentUrl && (
                    <a
                      href={c.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-lg overflow-hidden border border-stone-800 mt-2 hover:border-amber-400 transition"
                    >
                      <img src={c.attachmentUrl} alt="attachment" className="max-h-24 w-full object-cover" />
                    </a>
                  )}

                  {c.designerReply && (
                    <div className="mt-2 pt-2 border-t border-stone-800/80 bg-stone-900/50 p-2 rounded-lg">
                      <span className="text-[10px] font-bold text-amber-400 uppercase">Designer Reply:</span>
                      <p className="text-stone-300 text-xs mt-0.5">{c.designerReply}</p>
                    </div>
                  )}

                  {!isClientView && onResolveComment && c.status === "Pending" && (
                    <button
                      onClick={() => onResolveComment(c.id)}
                      className="w-full mt-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[11px] font-semibold transition"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Footer Status Bar */}
      <div className="z-40 bg-stone-950/90 border-t border-stone-800 px-4 py-2 flex items-center justify-between text-[11px] text-stone-400 font-mono">
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Protected Album Proofing Experience</span>
          <span className="sm:hidden">Protected Proof</span>
        </div>
        <div className="flex items-center gap-3">
          <span>{currentPage.type === "spread" ? `Spread ${currentPage.title}` : currentPage.title}</span>
          <span className="text-stone-600">•</span>
          <strong className="text-amber-400">Page {currentIndex + 1}</strong> of <strong>{totalPages}</strong>
        </div>
      </div>

      {/* Annotation Popup Modal */}
      <AnnotationModal
        isOpen={isAnnotationOpen}
        onClose={() => setIsAnnotationOpen(false)}
        onSubmit={handleAnnotationSubmit}
        pinX={selectedPin?.x}
        pinY={selectedPin?.y}
        spreadTitle={currentPage?.title || "Spread"}
      />
    </div>
  );
}
