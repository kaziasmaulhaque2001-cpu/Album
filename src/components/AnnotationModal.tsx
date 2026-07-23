import React, { useState } from "react";
import { X, MessageSquare, Upload, CheckCircle2, AlertCircle } from "lucide-react";

interface AnnotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (text: string, file: File | null) => Promise<void>;
  pinX?: number;
  pinY?: number;
  spreadTitle: string;
}

export default function AnnotationModal({
  isOpen,
  onClose,
  onSubmit,
  pinX,
  pinY,
  spreadTitle
}: AnnotationModalProps) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setError("Please type a comment description.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(text, file);
      setText("");
      setFile(null);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to submit comment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/50">
          <div className="flex items-center gap-2 text-stone-100 font-semibold">
            <MessageSquare className="w-5 h-5 text-amber-400" />
            <span>Add Correction / Comment</span>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-stone-950/60 p-3 rounded-xl border border-stone-800/80 text-xs text-stone-300 flex items-center justify-between">
            <span>Target: <strong className="text-amber-400">{spreadTitle}</strong></span>
            {pinX !== undefined && pinY !== undefined && (
              <span className="font-mono text-stone-400 bg-stone-800 px-2 py-0.5 rounded">
                Position Pin ({Math.round(pinX)}%, {Math.round(pinY)}%)
              </span>
            )}
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5 uppercase tracking-wider">
              Correction Notes
            </label>
            <textarea
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Describe requested change (e.g., 'Swap left photo with photo #42', 'Remove retouching artifact on right shoulder')..."
              className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-400 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5 uppercase tracking-wider">
              Attach Screenshot or Reference Photo (Optional)
            </label>
            <div className="relative border border-dashed border-stone-800 hover:border-amber-400/60 bg-stone-950/40 rounded-xl p-4 text-center cursor-pointer transition">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center gap-1.5">
                <Upload className="w-5 h-5 text-stone-400" />
                <span className="text-xs text-stone-300 font-medium">
                  {file ? file.name : "Click or drag image screenshot"}
                </span>
                <span className="text-[11px] text-stone-500">JPG, PNG, WEBP max 20MB</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-400 hover:text-white rounded-xl hover:bg-stone-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 text-xs font-bold rounded-xl shadow-lg transition flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit Correction</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
