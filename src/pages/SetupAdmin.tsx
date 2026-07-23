import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSettings } from "../context/SettingsContext.js";
import { Camera, Lock, Mail, Eye, EyeOff, User, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";

export default function SetupAdmin() {
  const { settings } = useSettings();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isChecking, setIsChecking] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isSupabase, setIsSupabase] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch("/api/auth/setup-status");
        if (response.ok) {
          const data = await response.json();
          setIsSupabase(data.isSupabase);
          if (data.adminExists) {
            // Admin already exists, public setup is locked
            navigate("/login", { replace: true });
          }
        }
      } catch (err) {
        console.error("Error checking setup status:", err);
      } finally {
        setIsChecking(false);
      }
    };
    checkStatus();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill out all fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/setup-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create administrator account.");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-[#FBFBFA] flex flex-col items-center justify-center text-gray-900" id="setup-loading">
        <div className="h-12 w-12 rounded-full border-2 border-[#D4AF37]/20 border-t-[#D4AF37] animate-spin" />
        <span className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase mt-4 block">
          Verifying Workspace Security...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFA] flex items-stretch text-gray-900" id="setup-root">
      {/* Left Column: Editorial Atmospheric Brand Image */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#121211] relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 bg-radial-[circle_at_center,_var(--tw-gradient-stops)] from-neutral-900/60 via-black to-black z-0" />
        <div className="absolute inset-0 border border-neutral-800/30 m-8 pointer-events-none z-10" />

        <div className="z-10 flex items-center gap-3">
          {(settings.logoUrl?.trim() || settings.studioLogo?.trim()) ? (
            <img src={settings.logoUrl?.trim() || settings.studioLogo?.trim()} alt="logo" className="h-10 object-contain rounded" />
          ) : (
            <div className="h-10 w-10 rounded-full border border-[#D4AF37]/50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <Camera className="h-5 w-5 text-[#D4AF37]" />
            </div>
          )}
          <span className="font-sans font-semibold tracking-widest text-white text-xs uppercase">
            {settings.studioName}
          </span>
        </div>

        <div className="z-10 my-auto max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="text-[#D4AF37] font-mono text-xs tracking-[0.3em] uppercase block mb-4">
              Security Hub
            </span>
            <h1 className="text-4xl md:text-5xl font-serif font-light text-white tracking-wide leading-tight mb-6">
              Create your <br />
              <span className="italic font-normal text-neutral-300">first administrator</span> <br />
              to secure your studio.
            </h1>
            <p className="text-neutral-400 font-sans font-light text-sm leading-relaxed max-w-md">
              Establish your primary master credentials. This account will have full access to design galleries, manage contracts, review client photo selections, and configure studio integrations.
            </p>
          </motion.div>
        </div>

        <div className="z-10 flex items-center justify-between text-neutral-500 font-mono text-[10px] tracking-widest uppercase border-t border-neutral-800/50 pt-6">
          <span>Secure Setup</span>
          <span className="flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-[#D4AF37]" /> Active Security Shield
          </span>
        </div>
      </div>

      {/* Right Column: Setup Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 lg:p-20 bg-white">
        <div className="w-full max-w-md">
          {!success ? (
            <div>
              <div className="text-center lg:text-left mb-8">
                {/* Mobile-only Header */}
                <div className="flex justify-center lg:hidden items-center gap-2 mb-6">
                  {(settings.logoUrl?.trim() || settings.studioLogo?.trim()) ? (
                    <img src={settings.logoUrl?.trim() || settings.studioLogo?.trim()} alt="logo" className="h-9 object-contain rounded" />
                  ) : (
                    <div className="h-9 w-9 rounded-full border border-[#D4AF37]/60 flex items-center justify-center bg-[#121211]">
                      <Camera className="h-4.5 w-4.5 text-[#D4AF37]" />
                    </div>
                  )}
                  <span className="font-sans font-semibold tracking-widest text-[#121211] text-xs uppercase">
                    {settings.studioName}
                  </span>
                </div>

                <h2 className="text-3xl font-serif font-light text-neutral-900 tracking-wide mb-2">
                  Create Master Admin
                </h2>
                <p className="text-neutral-500 font-sans font-light text-sm">
                  Initialize your digital selection suite with your personal administrator account.
                </p>

                {isSupabase && (
                  <span className="inline-block mt-3 px-2.5 py-1 rounded-full text-[10px] font-mono uppercase bg-emerald-50 text-emerald-700 border border-emerald-100">
                    🟢 Supabase Auth Active
                  </span>
                )}
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 rounded-lg bg-rose-50 border border-rose-100 text-rose-700 text-xs font-sans font-light flex items-start gap-3"
                >
                  <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>{error}</div>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-[11px] font-mono tracking-widest text-neutral-500 uppercase mb-2"
                  >
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-[#FAFAFA] border border-neutral-200 rounded-lg text-sm font-sans font-light text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-800 transition-colors"
                      placeholder="e.g. Julian Montgomery"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-[11px] font-mono tracking-widest text-neutral-500 uppercase mb-2"
                  >
                    Primary Admin Email
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
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-[11px] font-mono tracking-widest text-neutral-500 uppercase mb-2"
                  >
                    Passcode (Min 6 chars)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 bg-[#FAFAFA] border border-neutral-200 rounded-lg text-sm font-sans font-light text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-800 transition-colors"
                      placeholder="••••••••"
                      required
                      disabled={isSubmitting}
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
                      placeholder="••••••••"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 mt-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs uppercase font-semibold tracking-widest transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow-md disabled:bg-neutral-400"
                >
                  {isSubmitting ? (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Create Account"
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
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 mb-6">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h2 className="text-2xl font-serif font-light text-neutral-900 mb-3 tracking-wide">
                Administrator Created!
              </h2>
              <p className="text-neutral-500 font-sans font-light text-sm mb-8 leading-relaxed max-w-sm mx-auto">
                Your master administrator account is registered successfully. Public registration is now disabled automatically for your workspace's security.
              </p>

              <Link
                to="/login"
                className="inline-flex items-center justify-center py-3 px-8 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs uppercase tracking-widest font-semibold transition-colors"
              >
                Access Curator Portal
              </Link>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
