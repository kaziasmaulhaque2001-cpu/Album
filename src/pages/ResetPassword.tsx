import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.js";
import { useSettings } from "../context/SettingsContext.js";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Lock, ArrowLeft, KeyRound, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { motion } from "motion/react";

export default function ResetPassword() {
  const { resetPassword, isLoading, error, clearError } = useAuth();
  const { settings } = useSettings();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Extract token from search params or URL hash (e.g. Supabase Auth hash redirects)
  const extractToken = () => {
    let paramToken = searchParams.get("token") || searchParams.get("access_token") || "";
    if (!paramToken && typeof window !== "undefined" && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      paramToken = hashParams.get("access_token") || hashParams.get("token") || "";
    }
    return paramToken;
  };

  const token = extractToken();

  useEffect(() => {
    document.title = `Reset Password | ${settings.studioName || "My Studio"}`;
  }, [settings.studioName]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");
    clearError();

    if (!token) {
      setValidationError("This password reset link has expired. Please request a new one.");
      return;
    }

    if (newPassword.length < 6) {
      setValidationError("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setValidationError("Passwords do not match.");
      return;
    }

    try {
      await resetPassword(token, newPassword);
      setSuccess(true);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFA] flex items-center justify-center p-6 text-gray-900" id="reset-password-root">
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

        {!token ? (
          <div className="text-center py-6">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500 mb-4 border border-rose-100">
              <KeyRound className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-serif font-light text-neutral-900 mb-2">
              Link Expired or Invalid
            </h2>
            <p className="text-neutral-600 font-sans font-medium text-sm mb-6 max-w-xs mx-auto leading-relaxed">
              This password reset link has expired. Please request a new one.
            </p>
            <Link
              to="/forgot-password"
              className="inline-flex items-center justify-center py-2.5 px-6 bg-[#121211] text-white hover:bg-neutral-800 rounded-lg text-xs uppercase tracking-widest font-semibold transition-colors"
            >
              Request New Link
            </Link>
          </div>
        ) : !success ? (
          <div>
            <h2 className="text-2xl font-serif font-light tracking-wide text-neutral-900 mb-2">
              Define New Passcode
            </h2>
            <p className="text-neutral-500 font-sans font-light text-sm mb-6 leading-relaxed">
              Create a secure password for your administrator account.
            </p>

            {(validationError || error) && (
              <div className="mb-6 p-4 rounded-lg bg-rose-50 border border-rose-100 text-rose-700 text-xs font-sans font-light">
                {validationError || error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="newPassword"
                  className="block text-[11px] font-mono tracking-widest text-neutral-500 uppercase mb-2"
                >
                  New Passcode
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-[#FAFAFA] border border-neutral-200 rounded-lg text-sm font-sans font-light text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-800 transition-colors"
                    placeholder="Min 6 characters"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-[11px] font-mono tracking-widest text-neutral-500 uppercase mb-2"
                >
                  Confirm Passcode
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-[#FAFAFA] border border-neutral-200 rounded-lg text-sm font-sans font-light text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-800 transition-colors"
                    placeholder="••••••••••••"
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
                  "Update Passcode"
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
              Password Reset Complete
            </h2>
            <p className="text-emerald-800 bg-emerald-50 border border-emerald-200/80 p-3 rounded-xl font-sans font-medium text-sm mb-6 max-w-xs mx-auto">
              Your password has been changed successfully.
            </p>

            <button
              onClick={() => navigate("/login")}
              className="inline-flex items-center justify-center py-3 px-8 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs uppercase tracking-widest font-semibold transition-colors cursor-pointer w-full"
            >
              Log In Now
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
