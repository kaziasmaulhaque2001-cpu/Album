import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface LightboxPhoto {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
  filename: string;
}

interface ClientLightboxViewerProps {
  photos: LightboxPhoto[];
  activeIndex: number;
  onClose: () => void;
  onNavigate: (newIndex: number) => void;
  watermarkEnabled?: boolean;
  watermarkText?: string;
}

export default function ClientLightboxViewer({
  photos,
  activeIndex,
  onClose,
  onNavigate,
  watermarkEnabled = false,
  watermarkText = "",
}: ClientLightboxViewerProps) {
  const currentPhoto = photos[activeIndex];

  // Zoom & Pan State
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [direction, setDirection] = useState(1); // 1 = next, -1 = prev

  // Refs for Touch & Mouse Handling
  const isMouseDownRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const swipeStartXRef = useRef<number | null>(null);
  const swipeStartYRef = useRef<number | null>(null);
  const lastTapTimeRef = useRef(0);
  const touchStartDistRef = useRef<number | null>(null);
  const initialTouchScaleRef = useRef(1);

  // Reset zoom/pan when changing photos
  useEffect(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
    setIsDragging(false);
  }, [activeIndex]);

  // Lock Body Scroll and hide background elements on Mount
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("lightbox-active");

    const styleEl = document.createElement("style");
    styleEl.id = "lightbox-isolation-styles";
    styleEl.innerHTML = `
      body.lightbox-active {
        overflow: hidden !important;
        touch-action: none !important;
      }
      body.lightbox-active #root > div:not(#lightbox-fullscreen-viewer) {
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(styleEl);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.classList.remove("lightbox-active");
      const existing = document.getElementById("lightbox-isolation-styles");
      if (existing) existing.remove();
    };
  }, []);

  // Navigation Wrappers
  const handleNext = useCallback(() => {
    setDirection(1);
    onNavigate((activeIndex + 1) % photos.length);
  }, [activeIndex, photos.length, onNavigate]);

  const handlePrev = useCallback(() => {
    setDirection(-1);
    onNavigate((activeIndex - 1 + photos.length) % photos.length);
  }, [activeIndex, photos.length, onNavigate]);

  // Keyboard Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "Escape") {
        onClose();
      } else if (e.key === "+" || e.key === "=") {
        setScale((s) => Math.min(s + 0.5, 4));
      } else if (e.key === "-") {
        setScale((s) => {
          const nextS = Math.max(s - 0.5, 1);
          if (nextS === 1) setPan({ x: 0, y: 0 });
          return nextS;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev, onClose]);

  // Zoom Helpers
  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setScale((prev) => {
      const nextScale = Math.max(prev - 0.5, 1);
      if (nextScale === 1) setPan({ x: 0, y: 0 });
      return nextScale;
    });
  };

  const handleResetZoom = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  // Double Tap / Click Zoom Toggle
  const handleDoubleTap = () => {
    if (scale > 1) {
      setScale(1);
      setPan({ x: 0, y: 0 });
    } else {
      setScale(2.5);
    }
  };

  // Touch Event Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch start
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDistRef.current = dist;
      initialTouchScaleRef.current = scale;
      return;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const now = Date.now();
      
      // Double tap check
      if (now - lastTapTimeRef.current < 300) {
        handleDoubleTap();
        lastTapTimeRef.current = 0;
        return;
      }
      lastTapTimeRef.current = now;

      swipeStartXRef.current = touch.clientX;
      swipeStartYRef.current = touch.clientY;

      if (scale > 1) {
        setIsDragging(true);
        dragStartRef.current = { x: touch.clientX, y: touch.clientY };
        panStartRef.current = { ...pan };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      // Pinching
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / touchStartDistRef.current;
      const newScale = Math.min(Math.max(initialTouchScaleRef.current * factor, 1), 4);
      setScale(newScale);
      if (newScale === 1) setPan({ x: 0, y: 0 });
      return;
    }

    if (e.touches.length === 1 && scale > 1 && isDragging) {
      // Panning zoomed image
      const touch = e.touches[0];
      const dx = touch.clientX - dragStartRef.current.x;
      const dy = touch.clientY - dragStartRef.current.y;
      setPan({
        x: panStartRef.current.x + dx,
        y: panStartRef.current.y + dy,
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchStartDistRef.current = null;
    setIsDragging(false);

    // Swipe logic for unzoomed view
    if (scale === 1 && swipeStartXRef.current !== null) {
      const touch = e.changedTouches[0];
      if (touch) {
        const diffX = touch.clientX - swipeStartXRef.current;
        const diffY = touch.clientY - (swipeStartYRef.current || 0);

        if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
          if (diffX < 0) {
            handleNext();
          } else {
            handlePrev();
          }
        }
      }
    }
    swipeStartXRef.current = null;
    swipeStartYRef.current = null;
  };

  // Mouse Drag / Pan Handlers for Desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      e.preventDefault();
      isMouseDownRef.current = true;
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      panStartRef.current = { ...pan };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (scale > 1 && isMouseDownRef.current) {
      e.preventDefault();
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPan({
        x: panStartRef.current.x + dx,
        y: panStartRef.current.y + dy,
      });
    }
  };

  const handleMouseUp = () => {
    isMouseDownRef.current = false;
    setIsDragging(false);
  };

  if (!currentPhoto) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[999999] bg-black/95 backdrop-blur-2xl flex flex-col justify-between select-none overflow-hidden text-white"
      id="lightbox-fullscreen-viewer"
    >
      {/* Safe Area Top Header */}
      <div className="h-16 px-4 md:px-8 flex items-center justify-between z-30 bg-black/50 backdrop-blur-md border-b border-white/10 pt-safe">
        {/* Left: Image Counter */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs md:text-sm text-neutral-200 font-semibold tracking-wider">
            {activeIndex + 1} / {photos.length}
          </span>
          <span className="hidden sm:inline-block text-xs text-neutral-400 truncate max-w-[200px] md:max-w-[300px]">
            {currentPhoto.filename}
          </span>
        </div>

        {/* Right Controls: Minimal Zoom & Close */}
        <div className="flex items-center gap-1.5 md:gap-2">
          {scale > 1 && (
            <button
              onClick={handleResetZoom}
              className="p-2 hover:bg-white/10 rounded-full transition text-xs font-mono text-amber-400 cursor-pointer flex items-center gap-1 px-2.5 bg-white/5"
              title="Reset Zoom"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">100%</span>
            </button>
          )}

          <button
            onClick={handleZoomOut}
            disabled={scale <= 1}
            className="p-2 hover:bg-white/10 rounded-full transition text-neutral-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Zoom Out (-)"
          >
            <ZoomOut className="h-4.5 w-4.5" />
          </button>

          <button
            onClick={handleZoomIn}
            disabled={scale >= 4}
            className="p-2 hover:bg-white/10 rounded-full transition text-neutral-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Zoom In (+)"
          >
            <ZoomIn className="h-4.5 w-4.5" />
          </button>

          <div className="h-4 w-px bg-white/15 mx-1" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2.5 bg-white/10 hover:bg-white/20 active:scale-95 rounded-full transition text-white cursor-pointer"
            title="Close Viewer (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Centered Interactive Image Viewport */}
      <div
        className="flex-1 relative w-full h-full flex items-center justify-center overflow-hidden p-2 md:p-6"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Left Arrow (Previous) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          className="fixed left-3 md:left-6 top-1/2 -translate-y-1/2 z-40 p-3.5 md:p-4 rounded-full bg-black/60 hover:bg-black/90 active:scale-95 border border-white/20 text-white transition-all cursor-pointer shadow-2xl hover:border-white/40"
          title="Previous Image (←)"
        >
          <ChevronLeft className="h-6 w-6 md:h-7 md:w-7" />
        </button>

        {/* Animated Photo Box */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentPhoto.id}
            custom={direction}
            initial={{
              opacity: 0,
              x: direction * 80,
              scale: 0.96,
            }}
            animate={{
              opacity: 1,
              x: scale > 1 ? pan.x : 0,
              y: scale > 1 ? pan.y : 0,
              scale: scale,
            }}
            exit={{
              opacity: 0,
              x: direction * -80,
              scale: 0.96,
            }}
            transition={{
              x: { type: scale > 1 ? "just" : "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
              scale: { duration: 0.2 },
            }}
            className="relative flex items-center justify-center max-h-full max-w-full"
            onDoubleClick={handleDoubleTap}
          >
            {(currentPhoto.url || currentPhoto.thumbnailUrl) && (
              <img
                src={currentPhoto.url || currentPhoto.thumbnailUrl}
                alt={currentPhoto.filename}
                className={`max-h-[82vh] max-w-[88vw] md:max-w-[82vw] object-contain rounded-lg shadow-2xl select-none pointer-events-auto ${
                  scale > 1 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in"
                }`}
                onContextMenu={(e) => e.preventDefault()}
                draggable={false}
              />
            )}

            {/* Optional Watermark */}
            {watermarkEnabled && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10 overflow-hidden">
                <span className="text-white/20 font-serif text-sm md:text-lg tracking-[0.3em] uppercase rotate-[-30deg] border border-white/10 px-4 py-2 bg-black/10 backdrop-blur-[0.5px]">
                  {watermarkText || "Watermark"}
                </span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Right Arrow (Next) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          className="fixed right-3 md:right-6 top-1/2 -translate-y-1/2 z-40 p-3.5 md:p-4 rounded-full bg-black/60 hover:bg-black/90 active:scale-95 border border-white/20 text-white transition-all cursor-pointer shadow-2xl hover:border-white/40"
          title="Next Image (→)"
        >
          <ChevronRight className="h-6 w-6 md:h-7 md:w-7" />
        </button>
      </div>
    </motion.div>
  );
}
