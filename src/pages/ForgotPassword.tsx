import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.js";
import { useSettings } from "../context/SettingsContext.js";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, Send, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";

export default function ForgotPassword() {
  const { forgotPassword, isLoading, error, clearError } = useAuth();
  const { settings } = useSettings();
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);
  const [resetData, setResetData] = useState<{ resetLink?: string; message: string } | null>(null);

  useEffect(() => {
    document.title = `Forgot Password | ${settings.studioName || "My Studio"}`;
  }, [settings.studioName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    if (!email) return;

    try {
      const data = await forgotPassword(email);
      setResetData(data);
      setSuccess(true);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFA] flex items-center justify-center p-6 text-gray-900" id="forgot-password-root">
      <div className="w-full max-w-md bg-white border border-neutral-100 p-8 rounded-2xl shadow-xl shadow-neutral-100/50 relative overflow-hidden">
        {/* Decorative subtle header pattern */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-[#D4AF37]" />
        
        <div className="mb-8">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-mono tracking-wider text-neutral-500 hover:text-neutral-900 transition-colors uppercase"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Login
          </Link>
        </div>

        {!success ? (
          <div>
            <h2 className="text-2xl font-serif font-light tracking-wide text-neutral-900 mb-2">
              Reset Passcode
            </h2>
            <p className="text-neutral-500 font-sans font-light text-sm mb-6 leading-relaxed">
              Enter your registered administrator email address and we will generate a secure reset link.
            </p>

            {error && (
              <div className="mb-6 p-4 rounded-lg bg-rose-50 border border-rose-100 text-rose-700 text-xs font-sans font-light">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="block text-[11px] font-mono tracking-widest text-neutral-500 uppercase mb-2"
                >
                  Administrator Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-[#FAFAFA] border border-neutral-200 rounded-lg text-sm font-sans font-light text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-800 transition-colors"
                    placeholder="you@domain.com"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs uppercase font-semibold tracking-widest transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:bg-neutral-400"
              >
                {isLoading ? (
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" /> Generate Link
                  </>
                )}
              </motion.button>
            </form>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-4"
          >
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 mb-4">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-serif font-light text-neutral-900 mb-2">
              Passcode Link Generated
            </h2>
            <p className="text-neutral-500 font-sans font-light text-sm mb-6 max-w-sm mx-auto leading-relaxed">
              For testing in this environment, you can use the direct reset link below to update your password immediately:
            </p>

            {resetData?.resetLink && (() => {
              const fullUrl = resetData.resetLink.startsWith("http")
                ? resetData.resetLink
                : `${window.location.origin}${resetData.resetLink}`;
              return (
                <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-left mb-6">
                  <span className="block text-[10px] font-mono uppercase text-neutral-500 mb-1.5 tracking-wider">
                    Password Reset Link:
                  </span>
                  <a
                    href={fullUrl}
                    className="text-xs font-mono font-medium text-[#C4A484] hover:text-[#B39373] break-all block underline"
                  >
                    {fullUrl}
                  </a>
                </div>
              );
            })()}

            <p className="text-xs text-neutral-400 font-sans mb-6">
              In production, this would be dispatched to <span className="text-neutral-600">{email}</span>.
            </p>

            <Link
              to="/login"
              className="inline-flex items-center justify-center py-2.5 px-6 border border-neutral-200 hover:bg-neutral-50 rounded-lg text-xs uppercase tracking-widest font-semibold text-neutral-700 transition-colors"
            >
              Back to Sign In
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}
