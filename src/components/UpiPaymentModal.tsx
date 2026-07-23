import React, { useState, useEffect } from "react";
import { X, IndianRupee, QrCode, Upload, CheckCircle2, Copy, AlertCircle, Sparkles } from "lucide-react";
import { authFetch } from "../context/AuthContext.js";

interface UpiPaymentModalProps {
  onClose: () => void;
  onSuccess: () => void;
  defaultPlan?: "Basic" | "Pro" | "Business";
}

export default function UpiPaymentModal({ onClose, onSuccess, defaultPlan = "Pro" }: UpiPaymentModalProps) {
  const [plan, setPlan] = useState<"Basic" | "Pro" | "Business">(defaultPlan);
  const [utrNumber, setUtrNumber] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [upiSettings, setUpiSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const amounts = {
    Basic: 299,
    Pro: 599,
    Business: 999,
  };

  useEffect(() => {
    async function loadUpi() {
      try {
        const res = await authFetch("/api/studio-clients/upi-settings");
        if (res.ok) {
          const json = await res.json();
          setUpiSettings(json.upiSettings);
        }
      } catch (e) {
        console.error("Failed to load UPI settings:", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadUpi();
  }, []);

  const handleCopyUpi = () => {
    if (upiSettings?.upiId) {
      navigator.clipboard.writeText(upiSettings.upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrNumber.trim() || utrNumber.trim().length < 8) {
      setErrorMsg("Please enter a valid 12-digit UTR/UPI Transaction Reference number.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await authFetch("/api/studio-clients/payment-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          amount: amounts[plan],
          screenshotUrl: screenshotUrl || "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=600&q=80",
          utrNumber: utrNumber.trim(),
        }),
      });

      const json = await res.json();
      if (res.ok) {
        alert("Payment request submitted successfully! Super Admin will review and auto-activate your subscription.");
        onSuccess();
        onClose();
      } else {
        throw new Error(json.error || "Failed to submit payment request.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred submitting payment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 space-y-6 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-neutral-400 hover:text-neutral-900 rounded-full hover:bg-neutral-100 transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-mono font-bold uppercase tracking-wider">
            <IndianRupee className="h-3 w-3" /> Manual UPI Payment Portal
          </div>
          <h2 className="text-xl font-serif font-bold text-neutral-900">Upgrade Studio Subscription</h2>
          <p className="text-xs text-neutral-500">Scan QR Code or copy UPI ID to complete your payment.</p>
        </div>

        {/* Plan Selector */}
        <div className="grid grid-cols-3 gap-2">
          {(["Basic", "Pro", "Business"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlan(p)}
              className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                plan === p
                  ? "border-[#D4AF37] bg-amber-50/50 shadow-sm"
                  : "border-neutral-200 bg-neutral-50 hover:bg-neutral-100"
              }`}
            >
              <span className="block text-[11px] font-bold text-neutral-900">{p} Plan</span>
              <span className="block text-sm font-serif font-extrabold text-neutral-950 mt-1">₹{amounts[p]}</span>
              <span className="block text-[9px] text-neutral-500 font-mono">/ Month</span>
            </button>
          ))}
        </div>

        {/* UPI QR & ID Box */}
        <div className="bg-neutral-950 text-white p-5 rounded-2xl border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-neutral-400 uppercase block">Recipient</span>
              <span className="text-sm font-semibold text-white">{upiSettings?.recipientName || "Studio Admin Services"}</span>
            </div>
            <span className="text-sm font-mono font-extrabold text-[#D4AF37]">₹{amounts[plan]}</span>
          </div>

          {/* QR Image */}
          <div className="flex items-center justify-center p-3 bg-white rounded-xl max-w-[180px] mx-auto border border-neutral-800 shadow-inner">
            <img
              src={upiSettings?.qrCodeUrl || "https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&w=400&q=80"}
              alt="UPI QR Code"
              className="h-36 w-36 object-contain"
            />
          </div>

          {/* UPI ID Copy */}
          <div className="flex items-center justify-between p-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs">
            <span className="font-mono text-neutral-300 truncate">{upiSettings?.upiId || "studiophoto@upi"}</span>
            <button
              type="button"
              onClick={handleCopyUpi}
              className="py-1 px-2.5 bg-[#D4AF37] hover:bg-amber-400 text-neutral-950 font-bold rounded-lg text-[10px] flex items-center gap-1 transition-colors cursor-pointer shrink-0"
            >
              {copied ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied!" : "Copy UPI"}
            </button>
          </div>
        </div>

        {/* Submission Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-800 mb-1">
              UTR / UPI Transaction Reference Number <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 123456789012 or UPI Ref ID"
              value={utrNumber}
              onChange={(e) => setUtrNumber(e.target.value)}
              className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-mono font-semibold text-neutral-900 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-800 mb-1">
              Payment Screenshot Image URL (Optional)
            </label>
            <input
              type="text"
              placeholder="https://... or upload screenshot"
              value={screenshotUrl}
              onChange={(e) => setScreenshotUrl(e.target.value)}
              className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-sans text-neutral-900 focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 bg-neutral-950 hover:bg-neutral-800 text-white font-serif font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Submitting Request...
              </>
            ) : (
              `Submit UPI Payment Request (₹${amounts[plan]})`
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
