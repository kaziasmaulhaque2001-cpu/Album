import React, { useState, useEffect } from "react";
import { Folder, X, Plus, Edit3, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Folder as FolderType } from "../types.js";

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (folderData: { name: string; side: "BRIDE" | "GROOM" | "GENERAL"; coverUrl?: string }) => Promise<void>;
  initialFolder?: FolderType | null;
  defaultSide?: "BRIDE" | "GROOM" | "GENERAL";
}

export default function FolderModal({
  isOpen,
  onClose,
  onSubmit,
  initialFolder,
  defaultSide = "BRIDE",
}: FolderModalProps) {
  const [name, setName] = useState("");
  const [side, setSide] = useState<"BRIDE" | "GROOM" | "GENERAL">("BRIDE");
  const [coverUrl, setCoverUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialFolder) {
      setName(initialFolder.name);
      setSide(initialFolder.side as any || "BRIDE");
      setCoverUrl(initialFolder.coverUrl || "");
    } else {
      setName("");
      setSide(defaultSide);
      setCoverUrl("");
    }
    setError("");
  }, [initialFolder, defaultSide, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Folder name is required.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await onSubmit({
        name: name.trim(),
        side,
        coverUrl: coverUrl.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save folder.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 shadow-2xl"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                {initialFolder ? <Edit3 className="h-5 w-5" /> : <Folder className="h-5 w-5" />}
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100">
                  {initialFolder ? "Rename Folder" : "Create New Folder"}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Organize wedding photos by event or side
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {/* Side Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-2">
                Folder Category / Side
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSide("BRIDE")}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition ${
                    side === "BRIDE"
                      ? "border-pink-500 bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 ring-2 ring-pink-500/30"
                      : "border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:border-stone-300"
                  }`}
                >
                  <span className="text-lg mb-1">👰</span>
                  <span>Bride Side</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSide("GROOM")}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition ${
                    side === "GROOM"
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/30"
                      : "border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:border-stone-300"
                  }`}
                >
                  <span className="text-lg mb-1">🤵</span>
                  <span>Groom Side</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSide("GENERAL")}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition ${
                    side === "GENERAL"
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/30"
                      : "border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:border-stone-300"
                  }`}
                >
                  <span className="text-lg mb-1">📁</span>
                  <span>General</span>
                </button>
              </div>
            </div>

            {/* Folder Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
                Folder Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sangeet, Haldi, Pre-Wedding"
                className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 px-3.5 py-2.5 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition"
                required
              />
            </div>

            {/* Optional Cover URL */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
                Cover Image URL <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <input
                type="url"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder="https://example.com/cover.jpg"
                className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 px-3.5 py-2.5 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition"
              />
              <p className="mt-1 text-[11px] text-stone-400">
                If left blank, the first photo uploaded into this folder will serve as the cover.
              </p>
            </div>

            {/* Submit / Cancel Actions */}
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
                  <span>Saving...</span>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>{initialFolder ? "Save Changes" : "Create Folder"}</span>
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
