import React, { useState } from "react";
import { X, Calendar, User, Heart, Lock, CalendarOff, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CreateAlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newAlbumId: string) => void;
}

export default function CreateAlbumModal({ isOpen, onClose, onSuccess }: CreateAlbumModalProps) {
  const [brideName, setBrideName] = useState("");
  const [groomName, setGroomName] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [eventName, setEventName] = useState("Wedding Ceremony");
  const [description, setDescription] = useState("");
  const [password, setPassword] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!brideName || !groomName || !weddingDate || !eventName) {
      setError("Please fill in all required fields.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/albums", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          brideName,
          groomName,
          weddingDate,
          eventName,
          description,
          password: password || null,
          expiryDate: expiryDate || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create wedding album.");
      }

      // Reset fields
      setBrideName("");
      setGroomName("");
      setWeddingDate("");
      setEventName("Wedding Ceremony");
      setDescription("");
      setPassword("");
      setExpiryDate("");
      
      onSuccess(data.album.id);
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="bg-white w-full max-w-2xl rounded-2xl border border-neutral-100 shadow-2xl overflow-hidden relative z-10 text-gray-900"
          >
            {/* Header banner */}
            <div className="bg-[#121211] p-6 text-white relative">
              <div className="absolute inset-0 bg-radial-[circle_at_center,_var(--tw-gradient-stops)] from-neutral-800/40 to-transparent pointer-events-none" />
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <span className="text-[#D4AF37] font-mono text-[9px] tracking-[0.3em] uppercase block mb-1">
                Bespoke Creation Suite
              </span>
              <h2 className="text-2xl font-serif font-light tracking-wide flex items-center gap-2">
                Create Wedding Album <Heart className="h-5 w-5 text-[#D4AF37] fill-[#D4AF37]/20" />
              </h2>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
              {error && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-sans font-light flex items-center gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Primary Wedding Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-neutral-500 uppercase mb-2">
                    Bride's Full Name *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#D4AF37]">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={brideName}
                      onChange={(e) => setBrideName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm font-sans font-light text-neutral-900 focus:outline-none focus:border-neutral-800 transition-colors"
                      placeholder="e.g. Clara"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-neutral-500 uppercase mb-2">
                    Groom's Full Name *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#D4AF37]">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={groomName}
                      onChange={(e) => setGroomName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm font-sans font-light text-neutral-900 focus:outline-none focus:border-neutral-800 transition-colors"
                      placeholder="e.g. Sebastian"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-neutral-500 uppercase mb-2">
                    Wedding Celebration Date *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <input
                      type="date"
                      required
                      value={weddingDate}
                      onChange={(e) => setWeddingDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm font-mono text-neutral-700 focus:outline-none focus:border-neutral-800 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-neutral-500 uppercase mb-2">
                    Event Type *
                  </label>
                  <select
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm font-sans font-light text-neutral-900 focus:outline-none focus:border-neutral-800 transition-colors"
                  >
                    <option value="Wedding Ceremony">Wedding Ceremony</option>
                    <option value="Pre-Wedding Shoot">Pre-Wedding Shoot</option>
                    <option value="Reception Banquet">Reception Banquet</option>
                    <option value="Engagement Ceremony">Engagement Ceremony</option>
                    <option value="Silver Jubilee Anniversary">Silver Jubilee Anniversary</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] font-mono tracking-widest text-neutral-500 uppercase mb-2">
                  Album Story / Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm font-sans font-light text-neutral-900 focus:outline-none focus:border-neutral-800 transition-colors resize-none"
                  placeholder="Share a brief narrative of their magical day..."
                />
              </div>

              {/* Optional Security Options */}
              <div className="border-t border-neutral-100 pt-6">
                <span className="text-[#C4A484] font-mono text-[9px] tracking-[0.2em] uppercase font-bold block mb-4">
                  🔒 Premium Access controls
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-mono tracking-widest text-neutral-500 uppercase mb-2">
                      Passcode Protection (Optional)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm font-mono text-neutral-900 focus:outline-none focus:border-neutral-800 transition-colors placeholder-neutral-300"
                        placeholder="Leave empty for public link"
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono tracking-widest text-neutral-500 uppercase mb-2">
                      Gallery Link Expiration (Optional)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                        <CalendarOff className="h-4 w-4" />
                      </div>
                      <input
                        type="date"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm font-mono text-neutral-700 focus:outline-none focus:border-neutral-800 transition-colors"
                        min={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="border-t border-neutral-100 pt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="px-5 py-2.5 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 rounded-lg text-xs uppercase tracking-widest font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs uppercase tracking-widest font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer disabled:bg-neutral-400 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Initiate Gallery"
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
