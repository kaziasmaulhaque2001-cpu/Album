import React, { useState, useEffect } from "react";
import { AlertTriangle, RefreshCw, Image as ImageIcon } from "lucide-react";

interface SpreadImageProps {
  src?: string;
  alt?: string;
  className?: string;
  objectFit?: "cover" | "contain" | "fill";
  watermarkText?: string;
  enableWatermark?: boolean;
  onLoadSuccess?: () => void;
  onLoadError?: (errMsg: string) => void;
}

/**
 * Resolves full or relative image URLs cleanly, preventing Mixed Content and Localhost domain mismatches.
 */
export function resolveImageUrl(url?: string): string {
  if (!url) return "";
  let cleanUrl = url.trim();

  // Strip hardcoded localhost / origin host if it contains /uploads/
  if (cleanUrl.includes("/uploads/")) {
    const idx = cleanUrl.indexOf("/uploads/");
    return cleanUrl.substring(idx);
  }

  // Force HTTPS if page is HTTPS and image URL starts with HTTP
  if (typeof window !== "undefined" && window.location.protocol === "https:" && cleanUrl.startsWith("http:")) {
    cleanUrl = cleanUrl.replace("http:", "https:");
  }

  return cleanUrl;
}

export const SpreadImage: React.FC<SpreadImageProps> = ({
  src,
  alt = "Album spread",
  className = "",
  objectFit = "contain",
  watermarkText = "PROOF - DO NOT DUPLICATE",
  enableWatermark = false,
  onLoadSuccess,
  onLoadError,
}) => {
  const resolvedSrc = resolveImageUrl(src);
  const [retryCount, setRetryCount] = useState(0);
  const [currentSrc, setCurrentSrc] = useState<string>(resolvedSrc);
  const [isLoading, setIsLoading] = useState<boolean>(!resolvedSrc ? false : true);
  const [hasError, setHasError] = useState<boolean>(!resolvedSrc);
  const [errorMessage, setErrorMessage] = useState<string>(!resolvedSrc ? "No image path provided." : "");

  useEffect(() => {
    if (!resolvedSrc) {
      setHasError(true);
      setErrorMessage("No image path provided.");
      setIsLoading(false);
      setCurrentSrc("");
      return;
    }

    setHasError(false);
    setIsLoading(true);
    setErrorMessage("");
    setRetryCount(0);
    setCurrentSrc(resolvedSrc);
  }, [resolvedSrc]);

  const handleImageError = () => {
    if (retryCount < 3) {
      const nextRetry = retryCount + 1;
      setRetryCount(nextRetry);
      // Append cache buster
      const separator = resolvedSrc.includes("?") ? "&" : "?";
      const retryUrl = `${resolvedSrc}${separator}retry=${nextRetry}&t=${Date.now()}`;
      
      setTimeout(() => {
        setCurrentSrc(retryUrl);
      }, 500 * nextRetry);
    } else {
      setIsLoading(false);
      setHasError(true);
      const msg = `Unable to load image after ${retryCount} attempts (${resolvedSrc})`;
      setErrorMessage(msg);
      if (onLoadError) onLoadError(msg);
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
    if (onLoadSuccess) onLoadSuccess();
  };

  const handleManualRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoading(true);
    setHasError(false);
    setRetryCount(0);
    const separator = resolvedSrc.includes("?") ? "&" : "?";
    setCurrentSrc(`${resolvedSrc}${separator}manual_retry=${Date.now()}`);
  };

  if (!resolvedSrc || !currentSrc || hasError) {
    return (
      <div className={`relative flex flex-col items-center justify-center p-4 bg-slate-900/80 border border-red-500/30 rounded-lg text-center ${className}`}>
        <AlertTriangle className="w-8 h-8 text-amber-400 mb-2 animate-bounce" />
        <p className="text-xs font-semibold text-red-300">Image Load Failed</p>
        <p className="text-[10px] text-slate-400 max-w-full truncate px-2 mt-1" title={errorMessage || resolvedSrc}>
          {errorMessage || "Invalid image URL"}
        </p>
        <button
          onClick={handleManualRetry}
          className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Retry Load
        </button>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-800/80 backdrop-blur-sm animate-pulse">
          <ImageIcon className="w-8 h-8 text-slate-500 mb-2 animate-pulse" />
          <span className="text-[11px] text-slate-400 font-medium">Loading spread image...</span>
          {retryCount > 0 && (
            <span className="text-[10px] text-amber-400 mt-1">Retrying ({retryCount}/3)...</span>
          )}
        </div>
      )}

      <img
        src={currentSrc}
        alt={alt}
        loading="lazy"
        onLoad={handleImageLoad}
        onError={handleImageError}
        style={{ objectFit }}
        className={`w-full h-full transition-opacity duration-300 ${isLoading ? "opacity-0" : "opacity-100"}`}
      />

      {enableWatermark && watermarkText && !isLoading && !hasError && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20 select-none overflow-hidden">
          <div className="transform -rotate-25 text-white/20 font-bold text-2xl md:text-4xl tracking-widest whitespace-nowrap uppercase border-2 border-white/20 px-8 py-3 rounded-xl backdrop-blur-[1px]">
            {watermarkText}
          </div>
        </div>
      )}
    </div>
  );
};
