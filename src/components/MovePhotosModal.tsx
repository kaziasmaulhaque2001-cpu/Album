import React, { useState } from "react";
import { Folder, MoveRight, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Folder as FolderType } from "../types.js";

interface MovePhotosModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: FolderType[];
  selectedCount: number;
  onMove: (targetFolderId: string | null) => Promise<void>;
}

export default function MovePhotosModal({
  isOpen,
  onClose,
  folders,
  selectedCount,
  onMove,
}: MovePhotosModalProps) {
  const [targetFolderId, setTargetFolderId] = useState<string | "ROOT">("ROOT");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const finalId = targetFolderId === "ROOT" ? null : targetFolderId;
      await onMove(finalId);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to move photos.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const brideFolders = folders.filter((f) => f.side === "BRIDE");
  const groomFolders = folders.filter((f) => f.side === "GROOM");
  const generalFolders = folders.filter((f) => f.side !== "BRIDE" && f.side !== "GROOM");

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <MoveRight className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100">
                  Move {selectedCount} {selectedCount === 1 ? "Photo" : "Photos"}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Select destination folder
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-xl bg-red-50 dark:bg-red-950/50 p-3 text-xs text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-2">
                Target Folder
              </label>
              
              <div className="max-h-60 overflow-y-auto space-y-1 rounded-xl border border-stone-200 dark:border-stone-800 p-2 bg-stone-50/50 dark:bg-stone-950/50">
                {/* General / Root Option */}
                <button
                  type="button"
                  onClick={() => setTargetFolderId("ROOT")}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left text-xs transition ${
                    targetFolderId === "ROOT"
                      ? "bg-amber-500 text-stone-950 font-semibold"
                      : "text-stone-700 dark:text-stone-300 hover:bg-stone-200/50 dark:hover:bg-stone-800"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Folder className="h-4 w-4" />
                    <span>Unassigned / Album Root</span>
                  </span>
                  {targetFolderId === "ROOT" && <Check className="h-4 w-4" />}
                </button>

                {/* Bride Side Folders */}
                {brideFolders.length > 0 && (
                  <div className="pt-2">
                    <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-pink-600 dark:text-pink-400 flex items-center gap-1">
                      <span>👰</span> Bride Side
                    </div>
                    {brideFolders.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setTargetFolderId(f.id)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left text-xs transition ${
                          targetFolderId === f.id
                            ? "bg-amber-500 text-stone-950 font-semibold"
                            : "text-stone-700 dark:text-stone-300 hover:bg-stone-200/50 dark:hover:bg-stone-800"
                        }`}
                      >
                        <span className="flex items-center gap-2 pl-2">
                          <Folder className="h-3.5 w-3.5 opacity-70" />
                          <span>{f.name}</span>
                        </span>
                        <span className="text-[11px] opacity-80">{f.totalPhotos || 0} photos</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Groom Side Folders */}
                {groomFolders.length > 0 && (
                  <div className="pt-2">
                    <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      <span>🤵</span> Groom Side
                    </div>
                    {groomFolders.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setTargetFolderId(f.id)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left text-xs transition ${
                          targetFolderId === f.id
                            ? "bg-amber-500 text-stone-950 font-semibold"
                            : "text-stone-700 dark:text-stone-300 hover:bg-stone-200/50 dark:hover:bg-stone-800"
                        }`}
                      >
                        <span className="flex items-center gap-2 pl-2">
                          <Folder className="h-3.5 w-3.5 opacity-70" />
                          <span>{f.name}</span>
                        </span>
                        <span className="text-[11px] opacity-80">{f.totalPhotos || 0} photos</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* General Folders */}
                {generalFolders.length > 0 && (
                  <div className="pt-2">
                    <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                      <span>📁</span> Other Folders
                    </div>
                    {generalFolders.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setTargetFolderId(f.id)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left text-xs transition ${
                          targetFolderId === f.id
                            ? "bg-amber-500 text-stone-950 font-semibold"
                            : "text-stone-700 dark:text-stone-300 hover:bg-stone-200/50 dark:hover:bg-stone-800"
                        }`}
                      >
                        <span className="flex items-center gap-2 pl-2">
                          <Folder className="h-3.5 w-3.5 opacity-70" />
                          <span>{f.name}</span>
                        </span>
                        <span className="text-[11px] opacity-80">{f.totalPhotos || 0} photos</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-2 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-semibold px-5 py-2 text-xs shadow-md shadow-amber-500/20 disabled:opacity-50 transition"
              >
                {isSubmitting ? (
                  <span>Moving...</span>
                ) : (
                  <>
                    <MoveRight className="h-4 w-4" />
                    <span>Move Photos</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
