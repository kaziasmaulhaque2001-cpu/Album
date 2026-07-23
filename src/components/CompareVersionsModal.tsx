import React, { useState } from "react";
import { X, Layers, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { ProofingVersion } from "../types/proofing.js";

interface CompareVersionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  versions: ProofingVersion[];
}

export default function CompareVersionsModal({
  isOpen,
  onClose,
  versions
}: CompareVersionsModalProps) {
  const [vAId, setVAId] = useState<string>(versions[0]?.id || "");
  const [vBId, setVBId] = useState<string>(versions[1]?.id || versions[0]?.id || "");
  const [spreadIndex, setSpreadIndex] = useState<number>(0);

  if (!isOpen || versions.length === 0) return null;

  const versionA = versions.find((v) => v.id === vAId) || versions[0];
  const versionB = versions.find((v) => v.id === vBId) || versions[1] || versions[0];

  const maxSpreads = Math.max(versionA.spreads.length, versionB.spreads.length);
  const spreadA = versionA.spreads[spreadIndex];
  const spreadB = versionB.spreads[spreadIndex];

  return (
    <div className="fixed inset-0 z-[100000] bg-black/90 backdrop-blur-xl flex flex-col justify-between p-4 md:p-6 overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-stone-800/80 pb-4">
        <div className="flex items-center gap-3">
          <Layers className="w-6 h-6 text-amber-400" />
          <div>
            <h2 className="text-stone-100 font-semibold text-lg">Compare Album Versions</h2>
            <p className="text-stone-400 text-xs">Side-by-side visual inspection between proofing versions</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-stone-400 hover:text-white p-2 rounded-xl bg-stone-900 border border-stone-800 hover:bg-stone-800 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Version Selectors Bar */}
      <div className="grid grid-cols-2 gap-6 my-4">
        <div className="bg-stone-900/60 p-3 rounded-xl border border-stone-800 flex items-center justify-between">
          <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider">Version A (Left):</label>
          <select
            value={vAId}
            onChange={(e) => setVAId(e.target.value)}
            className="bg-stone-950 text-stone-100 border border-stone-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-amber-400"
          >
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                Version {v.versionNumber} ({v.spreads.length} Spreads)
              </option>
            ))}
          </select>
        </div>

        <div className="bg-stone-900/60 p-3 rounded-xl border border-stone-800 flex items-center justify-between">
          <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider">Version B (Right):</label>
          <select
            value={vBId}
            onChange={(e) => setVBId(e.target.value)}
            className="bg-stone-950 text-stone-100 border border-stone-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-amber-400"
          >
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                Version {v.versionNumber} ({v.spreads.length} Spreads)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Side-by-Side Canvas */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 items-center justify-center min-h-0 py-2">
        {/* Left Side (A) */}
        <div className="h-full bg-stone-950 rounded-2xl border border-stone-800/80 p-4 flex flex-col items-center justify-center relative overflow-hidden group">
          <div className="absolute top-3 left-3 bg-stone-900/80 text-amber-400 border border-stone-800 text-[11px] font-bold px-3 py-1 rounded-lg backdrop-blur">
            Version {versionA.versionNumber} • {spreadA?.title || "No Spread"}
          </div>
          {spreadA ? (
            <img
              src={spreadA.url}
              alt={spreadA.title}
              className="max-h-[60vh] max-w-full object-contain shadow-2xl rounded-lg"
            />
          ) : (
            <div className="text-stone-500 text-xs">No spread at index {spreadIndex + 1}</div>
          )}
        </div>

        {/* Right Side (B) */}
        <div className="h-full bg-stone-950 rounded-2xl border border-stone-800/80 p-4 flex flex-col items-center justify-center relative overflow-hidden group">
          <div className="absolute top-3 left-3 bg-stone-900/80 text-amber-400 border border-stone-800 text-[11px] font-bold px-3 py-1 rounded-lg backdrop-blur">
            Version {versionB.versionNumber} • {spreadB?.title || "No Spread"}
          </div>
          {spreadB ? (
            <img
              src={spreadB.url}
              alt={spreadB.title}
              className="max-h-[60vh] max-w-full object-contain shadow-2xl rounded-lg"
            />
          ) : (
            <div className="text-stone-500 text-xs">No spread at index {spreadIndex + 1}</div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="border-t border-stone-800/80 pt-4 flex items-center justify-between">
        <button
          disabled={spreadIndex <= 0}
          onClick={() => setSpreadIndex((p) => Math.max(0, p - 1))}
          className="px-4 py-2 bg-stone-900 text-stone-300 border border-stone-800 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-2 disabled:opacity-30 transition"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous Spread</span>
        </button>

        <span className="text-xs font-mono text-amber-400 bg-stone-900 border border-stone-800 px-4 py-2 rounded-xl">
          Spread {spreadIndex + 1} of {maxSpreads || 1}
        </span>

        <button
          disabled={spreadIndex >= maxSpreads - 1}
          onClick={() => setSpreadIndex((p) => Math.min(maxSpreads - 1, p + 1))}
          className="px-4 py-2 bg-stone-900 text-stone-300 border border-stone-800 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-2 disabled:opacity-30 transition"
        >
          <span>Next Spread</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
