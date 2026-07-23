import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.js";
import { useSettings } from "../context/SettingsContext.js";
import { Link, useNavigate } from "react-router-dom";
import { Camera, Lock, Mail, Eye, EyeOff, Sparkles, User as UserIcon, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";

export default function Login() {
  const { login, signUp, error, clearError, isLoading, isAuthenticated, user } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = `Login | ${settings.studioName || "My Studio"}`;
  }, [settings.studioName]);

  // Role based redirect if user is already logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      const role = user.role?.toLowerCase() || "";
      if (role === "super_admin" || role === "superadmin" || role === "super_admin_role" || user.role === "SUPER_ADMIN") {
        navigate("/admin/studio-clients", { replace: true });
      } else {
        navigate("/admin", { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [checkingSetup, setCheckingSetup] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("expired") === "1" || params.get("msg")) {
      setFormError(params.get("msg") || "Your session expired. Please login again.");
    }

    const verifySetup = async () => {
      try {
        const response = await fetch("/api/auth/setup-status");
        if (response.ok) {
          const data = await response.json();
          if (!data.adminExists) {
            navigate("/setup-admin", { replace: true });
          }
        }
      } catch (err) {
        console.error("Failed to verify workspace status:", err);
      } finally {
        setCheckingSetup(false);
      }
    };
    verifySetup();
  }, [navigate]);

  const handleModeSwitch = (newMode: "login" | "signup") => {
    setMode(newMode);
    setFormError("");
    setSuccessMsg("");
    clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSuccessMsg("");
    clearError();

    if (mode === "login") {
      if (!email || !password) {
        setFormError("Please enter both email and passcode.");
        return;
      }

      try {
        const loggedInUser = await login(email, password, rememberMe);
        const role = loggedInUser?.role?.toLowerCase() || "";
        if (role === "super_admin" || role === "superadmin" || role === "super_admin_role" || loggedInUser?.role === "SUPER_ADMIN") {
          navigate("/admin/studio-clients", { replace: true });
        } else {
          navigate("/admin", { replace: true });
        }
      } catch (err: any) {
        setFormError(err.message || "Failed to log in.");
      }
    } else {
      if (!fullName || !email || !password || !confirmPassword) {
        setFormError("Please fill in all fields.");
        return;
      }

      if (password !== confirmPassword) {
        setFormError("Passwords do not match.");
        return;
      }

      if (password.length < 6) {
        setFormError("Password must be at least 6 characters long.");
        return;
      }

      try {
        await signUp(fullName, email, password, confirmPassword);
        setSuccessMsg("Account created successfully with Supabase Auth! You can now log in.");
        setMode("login");
        setPassword("");
        setConfirmPassword("");
      } catch (err: any) {
        setFormError(err.message || "Failed to create account.");
      }
    }
  };

  if (checkingSetup) {
    return (
      <div className="min-h-screen bg-[#FBFBFA] flex flex-col items-center justify-center text-gray-900" id="login-checking">
        <div className="h-12 w-12 rounded-full border-2 border-[#D4AF37]/20 border-t-[#D4AF37] animate-spin" />
        <span className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase mt-4 block">
          Verifying Supabase Security...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFA] flex items-stretch text-gray-900" id="login-root">
      {/* Left Column: Editorial Media Section */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#121211] relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 bg-radial-[circle_at_center,_var(--tw-gradient-stops)] from-neutral-900/60 via-black to-black z-0" />
        <div className="absolute inset-0 border border-neutral-800/30 m-8 pointer-events-none z-10" />

        {/* Brand Header */}
        <div className="z-10 flex items-center gap-3">
          {(settings.logoUrl?.trim() || settings.studioLogo?.trim()) ? (
            <img src={settings.logoUrl?.trim() || settings.studioLogo?.trim()} alt="logo" className="h-10 object-contain rounded" />
          ) : (
            <div className="h-10 w-10 rounded-full border border-[#D4AF37]/50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <Camera className="h-5 w-5 text-[#D4AF37]" />
            </div>
          )}
          <span className="font-sans font-semibold tracking-widest text-white text-xs uppercase">
            {settings.studioName || "My Studio"}
          </span>
        </div>

        {/* Center Editorial Text */}
        <div className="z-10 my-auto max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="text-[#D4AF37] font-mono text-xs tracking-[0.3em] uppercase block mb-4">
              Supabase Auth Portal
            </span>
            <h1 className="text-4xl md:text-5xl font-serif font-light text-white tracking-wide leading-tight mb-6">
              Capturing light, <br />
              <span className="italic font-normal text-neutral-300">preserving emotion</span>, <br />
              curating legacies.
            </h1>
            <p className="text-neutral-400 font-sans font-light text-sm leading-relaxed max-w-md">
              A bespoke workspace for professional wedding photographers. Powered by cloud-native Supabase Authentication & PostgreSQL storage.
            </p>
          </motion.div>
        </div>

        {/* Footer info */}
        <div className="z-10 flex items-center justify-between text-neutral-500 font-mono text-[10px] tracking-widest uppercase border-t border-neutral-800/50 pt-6">
          <span>Est. 2026</span>
          <span className="flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-[#D4AF37]" /> Supabase Auth Enabled
          </span>
        </div>
      </div>

      {/* Right Column: Interactive Login / Create Account Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 lg:p-20 bg-white">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center lg:text-left mb-8">
            <div className="flex justify-center lg:hidden items-center gap-2 mb-6">
              {(settings.logoUrl?.trim() || settings.studioLogo?.trim()) ? (
                <img src={settings.logoUrl?.trim() || settings.studioLogo?.trim()} alt="logo" className="h-9 object-contain rounded" />
              ) : (
                <div className="h-9 w-9 rounded-full border border-[#D4AF37]/60 flex items-center justify-center bg-[#121211]">
                  <Camera className="h-4.5 w-4.5 text-[#D4AF37]" />
                </div>
              )}
              <span className="font-sans font-semibold tracking-widest text-[#121211] text-xs uppercase">
                {settings.studioName || "My Studio"}
              </span>
            </div>

            <h2 className="text-3xl font-serif font-light text-neutral-900 tracking-wide mb-2">
              {mode === "login" ? "Welcome back" : "Create Account"}
            </h2>
            <p className="text-neutral-500 font-sans font-light text-sm">
              {mode === "login" 
                ? "Enter your Supabase account credentials to sign in." 
                : "Register a new curator account on Supabase Auth."}
            </p>
          </div>

          {/* Mode Tabs */}
          <div className="flex bg-[#F4F4F5] p-1 rounded-xl mb-8 border border-neutral-200/80">
            <button
              type="button"
              onClick={() => handleModeSwitch("login")}
              className={`flex-1 py-2.5 text-xs font-mono tracking-wider uppercase rounded-lg transition-all cursor-pointer font-semibold ${
                mode === "login"
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch("signup")}
              className={`flex-1 py-2.5 text-xs font-mono tracking-wider uppercase rounded-lg transition-all cursor-pointer font-semibold ${
                mode === "signup"
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Success Banner */}
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-sans flex items-start gap-3"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>{successMsg}</div>
            </motion.div>
          )}

          {/* Error Banner */}
          {(formError || error) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-sans flex items-start gap-3"
            >
              <div className="h-1.5 w-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
              <div>{formError || error}</div>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name (Sign Up only) */}
            {mode === "signup" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
              >
                <label 
                  htmlFor="fullName" 
                  className="block text-[11px] font-mono tracking-widest text-neutral-500 uppercase mb-1.5"
                >
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <UserIcon className="h-4 w-4" />
                  </div>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-[#FAFAFA] border border-neutral-200 rounded-lg text-sm font-sans text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-800 transition-colors"
                    placeholder="Jane Doe"
                    disabled={isLoading}
                  />
                </div>
              </motion.div>
            )}

            {/* Email Field */}
            <div>
              <label 
                htmlFor="email" 
                className="block text-[11px] font-mono tracking-widest text-neutral-500 uppercase mb-1.5"
              >
                Account Email
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
                  className="w-full pl-10 pr-4 py-3 bg-[#FAFAFA] border border-neutral-200 rounded-lg text-sm font-sans text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-800 transition-colors"
                  placeholder="name@example.com"
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label 
                  htmlFor="password" 
                  className="block text-[11px] font-mono tracking-widest text-neutral-500 uppercase"
                >
                  Passcode
                </label>
                {mode === "login" && (
                  <Link
                    to="/forgot-password"
                    className="text-xs font-sans text-[#C4A484] hover:text-[#B39373] transition-colors"
                  >
                    Forgot passcode?
                  </Link>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-[#FAFAFA] border border-neutral-200 rounded-lg text-sm font-sans text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-800 transition-colors"
                  placeholder="••••••••••••"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
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

            {/* Confirm Password (Sign Up only) */}
            {mode === "signup" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
              >
                <label 
                  htmlFor="confirmPassword" 
                  className="block text-[11px] font-mono tracking-widest text-neutral-500 uppercase mb-1.5"
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
                    className="w-full pl-10 pr-4 py-3 bg-[#FAFAFA] border border-neutral-200 rounded-lg text-sm font-sans text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-800 transition-colors"
                    placeholder="••••••••••••"
                    autoComplete="new-password"
                    disabled={isLoading}
                  />
                </div>
              </motion.div>
            )}

            {/* Remember Me Checkbox (Login only) */}
            {mode === "login" && (
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-800 cursor-pointer"
                  />
                  <span className="text-xs text-neutral-600 font-sans">Remember me on this device</span>
                </label>
              </div>
            )}

            {/* Submit Button */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs uppercase font-semibold tracking-widest transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow-md disabled:bg-neutral-400 disabled:cursor-not-allowed mt-4"
            >
              {isLoading ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : mode === "login" ? (
                "Authorize Access"
              ) : (
                "Create Account"
              )}
            </motion.button>
          </form>
        </div>
      </div>
    </div>
  );
}
