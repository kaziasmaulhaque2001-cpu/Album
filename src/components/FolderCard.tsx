import React from "react";
import { Folder as FolderIcon, Image as ImageIcon, Heart, Edit3, Trash2, Upload, ChevronUp, ChevronDown, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { Folder } from "../types.js";

interface FolderCardProps {
  key?: React.Key;
  folder: Folder;
  isActive?: boolean;
  onClick: () => void;
  onEdit?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
  onUploadDirect?: (e: React.MouseEvent) => void;
  onMoveUp?: (e: React.MouseEvent) => void;
  onMoveDown?: (e: React.MouseEvent) => void;
  isAdmin?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
}

export default function FolderCard({
  folder,
  isActive = false,
  onClick,
  onEdit,
  onDelete,
  onUploadDirect,
  onMoveUp,
  onMoveDown,
  isAdmin = false,
  isFirst = false,
  isLast = false,
}: FolderCardProps) {
  const isBride = folder.side === "BRIDE";
  const sideBadgeText = isBride ? "Bride Side" : folder.side === "GROOM" ? "Groom Side" : "General";
  const sideIcon = isBride ? "👰" : folder.side === "GROOM" ? "🤵" : "📁";

  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md ${
        isActive
          ? "border-amber-500/80 bg-amber-50/20 dark:bg-amber-950/20 ring-2 ring-amber-500/30"
          : "border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-amber-300 dark:hover:border-stone-700"
      }`}
      onClick={onClick}
    >
      {/* Cover Image Container */}
      <div className="relative h-44 w-full overflow-hidden bg-stone-100 dark:bg-stone-800">
        {folder.coverUrl?.trim() ? (
          <img
            src={folder.coverUrl.trim()}
            alt={folder.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-stone-100 to-amber-50/30 dark:from-stone-900 dark:to-stone-800 p-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-2">
              <FolderIcon className="h-6 w-6" />
            </div>
            <span className="text-xs font-medium text-stone-400 dark:text-stone-500">No photos added yet</span>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-md shadow-sm ${
              isBride
                ? "bg-pink-500/80 text-white border border-pink-400/30"
                : folder.side === "GROOM"
                ? "bg-blue-600/80 text-white border border-blue-400/30"
                : "bg-stone-800/80 text-stone-200 border border-stone-700/30"
            }`}
          >
            <span>{sideIcon}</span>
            <span>{sideBadgeText}</span>
          </span>

          {folder.selectedPhotosCount !== undefined && folder.selectedPhotosCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 text-stone-950 px-2.5 py-1 text-xs font-bold shadow-sm backdrop-blur-md">
              <Heart className="h-3 w-3 fill-stone-950" />
              <span>{folder.selectedPhotosCount} selected</span>
            </span>
          )}
        </div>

        {/* Quick Admin Reorder Controls overlay on cover */}
        {isAdmin && (onMoveUp || onMoveDown) && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-stone-900/80 backdrop-blur-md rounded-lg p-1 border border-stone-700/50">
            {onMoveUp && !isFirst && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveUp(e);
                }}
                className="p-1 text-stone-300 hover:text-white hover:bg-stone-800 rounded transition"
                title="Move folder up"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
            )}
            {onMoveDown && !isLast && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveDown(e);
                }}
                className="p-1 text-stone-300 hover:text-white hover:bg-stone-800 rounded transition"
                title="Move folder down"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Card Content Footer */}
      <div className="flex flex-col justify-between p-4 flex-1 bg-white dark:bg-stone-900">
        <div>
          <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100 line-clamp-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
            {folder.name}
          </h3>
          <div className="mt-1.5 flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400">
            <span className="inline-flex items-center gap-1">
              <ImageIcon className="h-3.5 w-3.5 text-stone-400" />
              <span>{folder.totalPhotos || 0} photos</span>
            </span>
            {folder.selectedPhotosCount !== undefined && (
              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                <Heart className="h-3 w-3 fill-amber-500/20" />
                <span>{folder.selectedPhotosCount} loved</span>
              </span>
            )}
          </div>
        </div>

        {/* Admin Action Buttons */}
        {isAdmin && (
          <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-1">
            {onUploadDirect && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUploadDirect(e);
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 px-2 py-1 rounded transition"
                title="Upload photos directly to this folder"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Upload</span>
              </button>
            )}

            <div className="flex items-center gap-1 ml-auto">
              {onEdit && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(e);
                  }}
                  className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded transition"
                  title="Rename folder"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(e);
                  }}
                  className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded transition"
                  title="Delete folder"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
