import React, { createContext, useContext, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { authFetch } from "../lib/authUtils.js";

export interface Settings {
  id: string;
  studioName: string;
  studioLogo: string;
  favicon: string;
  photographerName: string;
  address: string;
  phone: string;
  whatsApp: string;
  email: string;
  website: string;

  // Branding
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  sidebarColor: string;
  topbarColor: string;
  cardColor: string;
  buttonColor: string;
  textColor: string;
  font: string;
  darkMode: boolean;
  lightMode: boolean;
  dashboardTheme: string;
  clientTheme: string;
  buttonStyle: string;
  cardStyle: string;

  // Gallery
  galleryTitle: string;
  galleryDescription: string;
  defaultCover: string;
  gridColumns: number;
  infiniteScroll: boolean;
  watermarkEnabled: boolean;
  watermarkText: string;
  downloadEnabled: boolean;
  fullscreenEnabled: boolean;
  zoomEnabled: boolean;

  // Client / Upload / Security / Notifications / Custom Domain / etc
  passwordProtection: boolean;
  linkExpiryEnabled: boolean;
  allowReselection: boolean;
  maxSelectionLimit: number;
  showSelectionCounter: boolean;
  allowComments: boolean;
  showPhotographerContact: boolean;
  maxUploadSize: number;
  allowedFileTypes: string;
  autoThumbnail: boolean;
  originalImageStorage: string;
  compressionLevel: number;
  sessionTimeout: number;
  twoFactorEnabled: boolean;
  loginHistory: string;
  emailNotification: boolean;
  whatsAppNotification: boolean;
  browserNotification: boolean;
  customDomain: string;
  sslStatus: string;
  seoKeywords: string;
  seoDescription: string;
  logoUrl?: string | null;
  theme?: string;
  [key: string]: any;
}

interface SettingsContextType {
  settings: Settings;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  loadSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<Settings>) => Promise<Settings>;
  uploadBranding: (file: File, type: "logo" | "favicon") => Promise<void>;
}

const defaultSettings: Settings = {
  id: "default",
  studioName: "My Studio",
  studioLogo: "",
  favicon: "",
  photographerName: "Studio Admin",
  address: "123 Studio Boulevard",
  phone: "+1 (555) 019-2834",
  whatsApp: "+1 (555) 019-2834",
  email: "studio@example.com",
  website: "www.example.com",

  primaryColor: "#121211",
  secondaryColor: "#D4AF37",
  accentColor: "#D4AF37",
  backgroundColor: "#fafafa",
  sidebarColor: "#f9f9f9",
  topbarColor: "#ffffff",
  cardColor: "#ffffff",
  buttonColor: "#121211",
  textColor: "#09090b",
  font: "Inter",
  darkMode: false,
  lightMode: true,
  dashboardTheme: "light",
  clientTheme: "light",
  buttonStyle: "rounded-xl",
  cardStyle: "rounded-2xl",

  galleryTitle: "Our Wedding Galleries",
  galleryDescription: "Relive the magic of your beautiful days in high resolution.",
  defaultCover: "",
  gridColumns: 4,
  infiniteScroll: false,
  watermarkEnabled: false,
  watermarkText: "© My Studio",
  downloadEnabled: true,
  fullscreenEnabled: true,
  zoomEnabled: true,

  passwordProtection: false,
  linkExpiryEnabled: false,
  allowReselection: true,
  maxSelectionLimit: 50,
  showSelectionCounter: true,
  allowComments: true,
  showPhotographerContact: true,
  maxUploadSize: 20,
  allowedFileTypes: "JPEG, PNG, WEBP",
  autoThumbnail: true,
  originalImageStorage: "local",
  compressionLevel: 80,
  sessionTimeout: 30,
  twoFactorEnabled: false,
  loginHistory: "[]",
  emailNotification: true,
  whatsAppNotification: false,
  browserNotification: false,
  customDomain: "",
  sslStatus: "Active",
  seoKeywords: "photography, wedding, gallery",
  seoDescription: "Professional photography portfolio and client gallery"
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();

  const processSettings = (rawSettings: any): Settings => {
    let ext: any = {};
    if (rawSettings.extendedSettings) {
      try {
        ext = typeof rawSettings.extendedSettings === "string"
          ? JSON.parse(rawSettings.extendedSettings)
          : rawSettings.extendedSettings;
      } catch (e) {
        console.error("Failed to parse extendedSettings", e);
      }
    }
    const merged = { ...defaultSettings, ...rawSettings, ...ext };
    if (!merged.studioName || !merged.studioName.trim()) {
      merged.studioName = "My Studio";
    }
    return merged;
  };

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setSettings(processSettings(data.settings));
        }
      }
    } catch (err: any) {
      console.error("Failed to load settings:", err);
      setError(err.message || "Failed to fetch settings.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // Apply branding criteria dynamically to document head & body
  useEffect(() => {
    if (!settings) return;

    // Dynamically update document title
    const currentStudioName = settings.studioName?.trim() || "My Studio";
    if (document.title.includes("My Google AI Studio App") || !document.title) {
      document.title = currentStudioName;
    }

    // Apply CSS Variables for Colors
    const root = document.documentElement;
    root.style.setProperty("--primary-color", settings.primaryColor || "#121211");
    root.style.setProperty("--secondary-color", settings.secondaryColor || "#D4AF37");
    root.style.setProperty("--accent-color", settings.accentColor || settings.secondaryColor || "#D4AF37");
    root.style.setProperty("--background-color", settings.backgroundColor || "#fafafa");
    root.style.setProperty("--sidebar-color", settings.sidebarColor || "#f9f9f9");
    root.style.setProperty("--topbar-color", settings.topbarColor || "#ffffff");
    root.style.setProperty("--card-color", settings.cardColor || "#ffffff");
    root.style.setProperty("--button-color", settings.buttonColor || "#121211");
    root.style.setProperty("--text-color", settings.textColor || "#09090b");

    // Dynamic Font Link Injection
    const fontId = "dynamic-google-font";
    let linkEl = document.getElementById(fontId) as HTMLLinkElement;
    if (!linkEl) {
      linkEl = document.createElement("link");
      linkEl.id = fontId;
      linkEl.rel = "stylesheet";
      document.head.appendChild(linkEl);
    }

    const fontMap: { [key: string]: string } = {
      "Inter": "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
      "Space Grotesk": "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap",
      "Playfair Display": "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&display=swap",
      "JetBrains Mono": "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600&display=swap"
    };

    const selectedFont = settings.font || "Inter";
    if (fontMap[selectedFont]) {
      linkEl.href = fontMap[selectedFont];
    }

    // Apply global font family to body
    root.style.setProperty("--font-sans", `"${selectedFont}", system-ui, sans-serif`);
    document.body.style.fontFamily = `"${selectedFont}", system-ui, sans-serif`;

    // Apply Button and Card styles using utility stylesheet injection
    const styleId = "dynamic-brand-styles";
    let styleEl = document.getElementById(styleId) as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    // Determine the border radius values based on style selections
    const buttonRadii: Record<string, string> = {
      "rounded-none": "0px",
      "rounded-md": "6px",
      "rounded-xl": "12px",
      "rounded-full": "9999px"
    };

    const cardRadii: Record<string, string> = {
      "rounded-none": "0px",
      "rounded-xl": "12px",
      "rounded-2xl": "16px",
      "rounded-3xl": "24px"
    };

    const btnRadius = buttonRadii[settings.buttonStyle] || "12px";
    const crdRadius = cardRadii[settings.cardStyle] || "16px";
    const heartCol = settings.heartColor || "#e11d48";

    styleEl.innerHTML = `
      :root {
        --btn-radius: ${btnRadius};
        --card-radius: ${crdRadius};
        --primary-color: ${settings.primaryColor || "#121211"};
        --secondary-color: ${settings.secondaryColor || "#D4AF37"};
        --accent-color: ${settings.accentColor || settings.secondaryColor || "#D4AF37"};
        --background-color: ${settings.backgroundColor || "#fafafa"};
        --sidebar-color: ${settings.sidebarColor || "#f9f9f9"};
        --topbar-color: ${settings.topbarColor || "#ffffff"};
        --card-color: ${settings.cardColor || "#ffffff"};
        --button-color: ${settings.buttonColor || "#121211"};
        --text-color: ${settings.textColor || "#09090b"};
      }
      body, 
      #root, 
      main,
      .bg-neutral-50, 
      .bg-gray-50, 
      .bg-\\[\\#FAFAFA\\], 
      .bg-\\[\\#FBFBFA\\],
      #login-root, 
      #login-checking {
        background-color: var(--background-color) !important;
        color: var(--text-color) !important;
      }
      .bg-neutral-50\\/50,
      .lg\\:w-72.border-r,
      .lg\\:w-72.bg-neutral-50\\/50,
      .bg-neutral-50\\/30,
      aside,
      [role="navigation"] {
        background-color: var(--sidebar-color) !important;
      }
      header, 
      .sticky.top-0, 
      .bg-white.border-b {
        background-color: var(--topbar-color) !important;
        border-color: rgba(0,0,0,0.06) !important;
      }
      .brand-card,
      .bg-white.border,
      .bg-white.border-neutral-200\\/60,
      .bg-white.rounded-2xl,
      .bg-white.rounded-xl,
      .bg-white.p-6,
      .bg-white.p-4,
      .bg-white.p-5,
      div.border-dashed.bg-white,
      form.bg-neutral-50\\/30 {
        background-color: var(--card-color) !important;
        border-color: rgba(0,0,0,0.06) !important;
      }
      .text-neutral-900,
      .text-neutral-800,
      .text-gray-900,
      .text-zinc-900,
      .text-neutral-700,
      .text-slate-900,
      .text-black {
        color: var(--text-color) !important;
      }
      .text-neutral-500,
      .text-neutral-400,
      .text-gray-500,
      .text-gray-400,
      .text-slate-500 {
        color: var(--text-color) !important;
        opacity: 0.75 !important;
      }
      input[type="text"],
      input[type="email"],
      input[type="password"],
      select,
      textarea {
        background-color: var(--card-color) !important;
        color: var(--text-color) !important;
        border-color: rgba(0,0,0,0.15) !important;
      }
      .fixed.inset-0 .bg-white {
        background-color: var(--card-color) !important;
        color: var(--text-color) !important;
      }
      .toast-notification,
      .bg-neutral-900.text-white {
        background-color: var(--button-color) !important;
        color: #ffffff !important;
      }
      .brand-btn,
      button.bg-neutral-900,
      button.bg-black,
      a.bg-neutral-900,
      a.bg-black,
      .bg-neutral-950,
      button[type="submit"]:not(.bg-rose-600),
      button[type="button"].bg-neutral-900 {
        background-color: var(--button-color) !important;
        color: #ffffff !important;
      }
      button.bg-neutral-900:hover,
      button.bg-black:hover,
      a.bg-neutral-900:hover,
      a.bg-black:hover,
      .bg-neutral-950:hover {
        opacity: 0.9 !important;
      }
      .brand-btn {
        border-radius: var(--btn-radius) !important;
      }
      .brand-card {
        border-radius: var(--card-radius) !important;
      }
      .heart-fill {
        fill: ${heartCol} !important;
        color: ${heartCol} !important;
      }
      .heart-bg {
        background-color: ${heartCol} !important;
      }
      .heart-text {
        color: ${heartCol} !important;
      }
      .heart-border {
        border-color: ${heartCol} !important;
      }
      .text-\\[\\#D4AF37\\] {
        color: var(--secondary-color, #D4AF37) !important;
      }
      .bg-\\[\\#D4AF37\\] {
        background-color: var(--secondary-color, #D4AF37) !important;
      }
      .border-\\[\\#D4AF37\\] {
        border-color: var(--secondary-color, #D4AF37) !important;
      }
      .hover\\:bg-\\[\\#C49F27\\]:hover {
        background-color: var(--accent-color, #C49F27) !important;
      }
      .hover\\:text-\\[\\#B39373\\]:hover {
        color: var(--accent-color, #B39373) !important;
      }
      .text-\\[\\#C4A484\\] {
        color: var(--accent-color, #C4A484) !important;
      }
      .border-t-\\[\\#D4AF37\\] {
        border-top-color: var(--secondary-color, #D4AF37) !important;
      }
    `;

    // Update Favicon dynamically
    if (settings.favicon) {
      let favEl = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!favEl) {
        favEl = document.createElement("link");
        favEl.rel = "icon";
        document.head.appendChild(favEl);
      }
      favEl.href = settings.favicon;
    }

    // Apply Theme dynamically (Router-aware: clients see clientTheme, admins see dashboardTheme)
    const isClientRoute = location.pathname.startsWith("/gallery/");
    const activeTheme = isClientRoute 
      ? (settings.clientTheme || "light")
      : (settings.dashboardTheme || "light");

    if (activeTheme === "dark") {
      root.classList.add("dark");
      root.style.backgroundColor = "#09090b";
      root.style.color = "#fafafa";
    } else {
      root.classList.remove("dark");
      root.style.backgroundColor = "#fafafa";
      root.style.color = "#09090b";
    }
  }, [settings, location.pathname]);

  const updateSettings = async (newSettings: Partial<Settings>): Promise<Settings> => {
    setIsSaving(true);
    try {
      const response = await authFetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newSettings)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update settings.");
      }

      const processed = processSettings(data.settings);
      setSettings(processed);
      return processed;
    } catch (err: any) {
      console.error("Save settings failed:", err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const uploadBranding = async (file: File, type: "logo" | "favicon") => {
    const formData = new FormData();
    formData.append(type, file);

    const response = await authFetch("/api/settings/upload", {
      method: "POST",
      body: formData
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `Failed to upload ${type}.`);
    }

    if (data.settings) {
      setSettings(processSettings(data.settings));
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        isLoading,
        isSaving,
        error,
        loadSettings,
        updateSettings,
        uploadBranding
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
