import React, { useState, useRef } from "react";
import {
  Upload,
  FolderPlus,
  Trash2,
  Copy,
  RefreshCw,
  MoveUp,
  MoveDown,
  Edit3,
  Check,
  AlertCircle,
  FileImage,
  Layers,
  Sparkles,
  Grid,
  CheckCircle2
} from "lucide-react";
import { AlbumSpread, ProofingSide, SpreadType } from "../types/proofing.js";
import { SpreadImage } from "./SpreadImage";

interface AlbumBuilderProps {
  albumId: string;
  side: ProofingSide;
  spreads: AlbumSpread[];
  versionId: string;
  onUploadSpreads: (files: FileList | File[], spreadType: SpreadType) => Promise<void>;
  onReorderSpreads: (updatedSpreads: AlbumSpread[]) => Promise<void>;
  onReplaceSpread: (spreadId: string, file: File) => Promise<void>;
  onDeleteSpread: (spreadId: string) => Promise<void>;
  onDuplicateSpread: (spreadId: string) => Promise<void>;
  onRenameSpread: (spreadId: string, newTitle: string) => Promise<void>;
}

export default function AlbumBuilder({
  albumId,
  side,
  spreads,
  versionId,
  onUploadSpreads,
  onReorderSpreads,
  onReplaceSpread,
  onDeleteSpread,
  onDuplicateSpread,
  onRenameSpread
}: AlbumBuilderProps) {
  const [selectedSpreadType, setSelectedSpreadType] = useState<SpreadType>("spread");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [editingSpreadId, setEditingSpreadId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceTargetSpreadId = useRef<string | null>(null);

  // Filter out any invalid file extensions
  const handleFileSelection = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setErrorMsg(null);

    const validFiles: File[] = [];
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      if (allowed.includes(f.type) || /\.(jpg|jpeg|png|webp)$/i.test(f.name)) {
        validFiles.push(f);
      }
    }

    if (validFiles.length === 0) {
      setErrorMsg("Invalid file format. Please select strictly JPG, JPEG, PNG, or WEBP spread images.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    try {
      // Simulate smooth progress bar for large multi-upload batches
      const timer = setInterval(() => {
        setUploadProgress((prev) => (prev >= 90 ? prev : prev + 15));
      }, 300);

      await onUploadSpreads(validFiles, selectedSpreadType);

      clearInterval(timer);
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(0), 1000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to upload image spreads. Auto retrying...");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelection(e.dataTransfer.files);
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= spreads.length) return;

    const copy = [...spreads];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;

    await onReorderSpreads(copy);
  };

  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && replaceTargetSpreadId.current) {
      setIsUploading(true);
      try {
        await onReplaceSpread(replaceTargetSpreadId.current, file);
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to replace spread.");
      } finally {
        setIsUploading(false);
        replaceTargetSpreadId.current = null;
      }
    }
  };

  const startEditingTitle = (s: AlbumSpread) => {
    setEditingSpreadId(s.id);
    setEditingTitle(s.title);
  };

  const saveEditingTitle = async (s: AlbumSpread) => {
    if (editingTitle.trim() && editingTitle !== s.title) {
      await onRenameSpread(s.id, editingTitle.trim());
    }
    setEditingSpreadId(null);
  };

  return (
    <div className="space-y-8">
      {/* Upload Zone & Controls */}
      <div className="bg-stone-900/60 backdrop-blur-xl border border-stone-800/80 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-stone-800/80">
          <div>
            <h3 className="text-stone-100 font-bold text-base flex items-center gap-2">
              <Upload className="w-5 h-5 text-amber-400" />
              <span>Spread Image Upload Section</span>
            </h3>
            <p className="text-stone-400 text-xs mt-1">
              Supports 12×36 inch high-resolution spreads (JPG, JPEG, PNG, WEBP). No PDF files.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-stone-300">Spread Category:</span>
            <select
              value={selectedSpreadType}
              onChange={(e) => setSelectedSpreadType(e.target.value as SpreadType)}
              className="bg-stone-950 border border-stone-800 text-stone-200 text-xs rounded-xl px-3 py-2 font-semibold focus:outline-none focus:border-amber-400"
            >
              <option value="spread">Album Spread (Pages 01..XX)</option>
              <option value="front_cover">Front Cover</option>
              <option value="inside_cover">Inside Cover</option>
              <option value="inside_back_cover">Inside Back Cover</option>
              <option value="back_cover">Back Cover</option>
            </select>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
            isDragOver
              ? "border-amber-400 bg-amber-400/10 scale-[0.99]"
              : "border-stone-800 hover:border-stone-700 bg-stone-950/40"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => handleFileSelection(e.target.files)}
            className="hidden"
          />
          <input
            type="file"
            ref={folderInputRef}
            // @ts-ignore
            webkitdirectory="true"
            directory=""
            onChange={(e) => handleFileSelection(e.target.files)}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Upload className="w-6 h-6" />
            </div>

            <div>
              <p className="text-stone-200 font-bold text-sm">Drag & drop spread images here</p>
              <p className="text-stone-500 text-xs mt-0.5">Supports multi-file batch or whole folder selection</p>
            </div>

            <div className="flex items-center gap-3 mt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2"
              >
                <FileImage className="w-4 h-4" />
                <span>Upload Files</span>
              </button>

              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-xs rounded-xl border border-stone-700 transition flex items-center gap-2"
              >
                <FolderPlus className="w-4 h-4 text-amber-400" />
                <span>Upload Folder</span>
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          {isUploading && (
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between text-xs text-stone-300 font-mono">
                <span>Uploading & Processing Spreads...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 w-full bg-stone-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Spread Manager Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-stone-100 font-bold text-base flex items-center gap-2">
            <Grid className="w-5 h-5 text-amber-400" />
            <span>Spread Manager</span>
            <span className="text-xs font-mono bg-stone-800 text-stone-400 px-2.5 py-0.5 rounded-full">
              {spreads.length} Spreads Total
            </span>
          </h3>
          <span className="text-xs text-stone-400 font-medium hidden sm:inline">
            Auto-Enforced Page Order: Front Cover → Inside Cover → Spreads → Last Inside → Back Cover
          </span>
        </div>

        {spreads.length === 0 ? (
          <div className="bg-stone-900/40 border border-stone-800 rounded-2xl p-12 text-center text-stone-500">
            No spreads added yet. Upload files above to build the album spreads.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {spreads.map((s, idx) => (
              <div
                key={s.id}
                className="bg-stone-900/80 backdrop-blur-md border border-stone-800/80 rounded-2xl overflow-hidden shadow-xl hover:border-amber-400/50 transition-all group flex flex-col justify-between"
              >
                {/* Thumbnail Preview Header */}
                <div className="relative aspect-[3/1] bg-stone-950 overflow-hidden border-b border-stone-800/80">
                  <SpreadImage
                    src={s.thumbnailUrl || s.url}
                    alt={s.title}
                    className="w-full h-full group-hover:scale-105 transition-transform duration-500"
                    objectFit="cover"
                  />
                  <span className="absolute top-2 left-2 bg-stone-950/90 backdrop-blur text-amber-400 font-mono font-bold text-[10px] px-2 py-0.5 rounded-md border border-stone-800 z-20">
                    {s.title}
                  </span>
                  <span className="absolute top-2 right-2 bg-stone-950/80 text-stone-400 font-mono text-[10px] px-1.5 py-0.5 rounded z-20">
                    12×36 Spread
                  </span>
                </div>

                {/* Info & Title Edit */}
                <div className="p-4 space-y-3 flex-1">
                  <div className="flex items-center justify-between">
                    {editingSpreadId === s.id ? (
                      <div className="flex items-center gap-1 w-full">
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          className="bg-stone-950 text-stone-100 text-xs border border-stone-700 rounded-lg px-2 py-1 w-full"
                        />
                        <button
                          onClick={() => saveEditingTitle(s)}
                          className="p-1 bg-amber-400 text-stone-950 rounded hover:bg-amber-300"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between w-full">
                        <span className="text-stone-200 font-bold text-xs truncate max-w-[150px]">
                          {s.title}
                        </span>
                        <button
                          onClick={() => startEditingTitle(s)}
                          className="text-stone-500 hover:text-amber-400 p-1"
                          title="Rename Spread"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Footer Bar */}
                <div className="bg-stone-950/80 border-t border-stone-800 px-3 py-2 flex items-center justify-between text-xs text-stone-400">
                  <div className="flex items-center gap-1">
                    <button
                      disabled={idx === 0}
                      onClick={() => handleMove(idx, "up")}
                      className="p-1 hover:text-white disabled:opacity-20 hover:bg-stone-800 rounded transition"
                      title="Move Left/Up"
                    >
                      <MoveUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={idx === spreads.length - 1}
                      onClick={() => handleMove(idx, "down")}
                      className="p-1 hover:text-white disabled:opacity-20 hover:bg-stone-800 rounded transition"
                      title="Move Right/Down"
                    >
                      <MoveDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        replaceTargetSpreadId.current = s.id;
                        replaceInputRef.current?.click();
                      }}
                      className="p-1 hover:text-amber-400 hover:bg-stone-800 rounded transition"
                      title="Replace Image"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDuplicateSpread(s.id)}
                      className="p-1 hover:text-blue-400 hover:bg-stone-800 rounded transition"
                      title="Duplicate Spread"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteSpread(s.id)}
                      className="p-1 hover:text-rose-400 hover:bg-stone-800 rounded transition"
                      title="Delete Spread"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <input
        type="file"
        ref={replaceInputRef}
        accept="image/jpeg,image/png,image/webp"
        onChange={handleReplaceFile}
        className="hidden"
      />
    </div>
  );
}
