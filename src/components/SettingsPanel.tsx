import React, { useState, useEffect } from "react";
import { useSettings } from "../context/SettingsContext.js";
import { authFetch } from "../lib/authUtils.js";
import {
  Save,
  CheckCircle,
  AlertCircle,
  Loader2,
  Lock,
  Globe,
  Upload,
  Database,
  Building,
  Sparkles,
  Download,
  Eye,
  Key,
  PieChart,
  RefreshCw,
  HardDrive,
  Sliders
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  SETTINGS_GROUPS,
  SETTINGS_SECTIONS,
  FieldConfig,
  SectionConfig
} from "./settingsSchema.js";

// Full state interface matching native columns and nested extended properties
interface SettingsState {
  studioName: string;
  studioLogo: string | null;
  favicon: string | null;
  photographerName: string;
  address: string;
  phone: string;
  whatsApp: string;
  email: string;
  website: string;
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
  galleryTitle: string;
  galleryDescription: string;
  defaultCover: string | null;
  gridColumns: number;
  infiniteScroll: boolean;
  watermarkEnabled: boolean;
  downloadEnabled: boolean;
  fullscreenEnabled: boolean;
  zoomEnabled: boolean;
  passwordProtection: boolean;
  linkExpiryEnabled: boolean;
  expiryDays: number;
  gracePeriodDays: number;
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
  extendedSettings: string;

  // Extracted custom extended keys
  [key: string]: any;
}

interface StatsState {
  totalAlbums: number;
  totalPhotos: number;
  totalSelectedPhotos: number;
  originalImageSize: number;
  thumbnailSize: number;
  databaseSize: number;
  storageUsed: number;
  storageLimit: number;
  remainingStorage: number;
  storagePercentage: number;
}

interface ToastMessage {
  id: string;
  type: "success" | "error";
  text: string;
}

export default function SettingsPanel() {
  const { loadSettings: refreshGlobalSettings } = useSettings();
  const [settings, setSettings] = useState<SettingsState | null>(null);
  const [stats, setStats] = useState<StatsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTabId, setActiveTabId] = useState<string>("general");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Upload Logo & Favicon
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Toast trigger helper
  const triggerToast = (text: string, type: "success" | "error" = "success") => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Human bytes formatter
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  // Load server-side settings & stats
  const loadData = async () => {
    setLoading(true);
    try {
      // Settings response
      const settingsRes = await authFetch("/api/settings");
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        const rawSettings = data.settings;
        let ext: any = {};
        try {
          ext = rawSettings.extendedSettings ? JSON.parse(rawSettings.extendedSettings) : {};
        } catch (e) {
          console.error("Failed to parse extended settings", e);
        }

        // Establish defaults or saved values
        const isDemo = !rawSettings.hasSavedCustomData && rawSettings.isDemoMode !== false;
        const currentStudioName = rawSettings.studioName || (isDemo ? "My Studio" : "");
        const merged: SettingsState = {
          ...rawSettings,
          studioName: currentStudioName,
          businessType: ext.businessType ?? (isDemo ? "Curated Wedding Photography" : ""),
          ownerName: ext.ownerName ?? (isDemo ? "Studio Admin" : ""),
          supportEmail: ext.supportEmail ?? (isDemo ? "support@example.com" : rawSettings.email || ""),
          googleMapsLink: ext.googleMapsLink ?? (isDemo ? "https://maps.google.com/maps" : ""),
          timezone: ext.timezone ?? (isDemo ? "America/New_York" : "UTC"),
          language: ext.language ?? (isDemo ? "en" : "en"),
          currency: ext.currency ?? (isDemo ? "USD" : "USD"),
          dateFormat: ext.dateFormat ?? (isDemo ? "MM/DD/YYYY" : "MM/DD/YYYY"),
          timeFormat: ext.timeFormat ?? (isDemo ? "12h" : "12h"),

          autoTheme: ext.autoTheme !== undefined ? ext.autoTheme : false,
          backgroundColor: rawSettings.backgroundColor || ext.backgroundColor || "#fafafa",
          sidebarColor: rawSettings.sidebarColor || ext.sidebarColor || "#f9f9f9",
          topbarColor: rawSettings.topbarColor || ext.topbarColor || "#ffffff",
          cardColor: rawSettings.cardColor || ext.cardColor || "#ffffff",
          buttonColor: rawSettings.buttonColor || ext.buttonColor || "#121211",
          textColor: rawSettings.textColor || ext.textColor || "#09090b",
          shadowStyle: ext.shadowStyle || "sm",
          fontSize: ext.fontSize || "sm",
          animationSpeed: ext.animationSpeed || "normal",
          dashboardLayout: ext.dashboardLayout || "grid",
          compactMode: ext.compactMode !== undefined ? ext.compactMode : false,

          dashboardLogo: ext.dashboardLogo || "",
          loginLogo: ext.loginLogo || "",
          clientGalleryLogo: ext.clientGalleryLogo || "",
          loadingScreen: ext.loadingScreen || "spinner",
          splashScreen: ext.splashScreen !== undefined ? ext.splashScreen : false,
          copyrightText: ext.copyrightText ?? (isDemo ? `© 2026 ${currentStudioName}` : ""),
          footerText: ext.footerText ?? (isDemo ? "Curated Luxury, Curated Memories." : ""),
          poweredByText: ext.poweredByText ?? (isDemo ? `Powered by ${currentStudioName} Engine` : ""),

          uploadQuality: ext.uploadQuality || "high",
          originalQuality: ext.originalQuality !== undefined ? ext.originalQuality : true,
          rawSupport: ext.rawSupport !== undefined ? ext.rawSupport : false,
          jpegSupport: ext.jpegSupport !== undefined ? ext.jpegSupport : true,
          pngSupport: ext.pngSupport !== undefined ? ext.pngSupport : true,
          webpSupport: ext.webpSupport !== undefined ? ext.webpSupport : true,
          heicSupport: ext.heicSupport !== undefined ? ext.heicSupport : false,
          tiffSupport: ext.tiffSupport !== undefined ? ext.tiffSupport : false,
          maxUploadCount: ext.maxUploadCount || 500,
          duplicateDetection: ext.duplicateDetection !== undefined ? ext.duplicateDetection : true,
          duplicateAction: ext.duplicateAction || "skip",
          autoRename: ext.autoRename !== undefined ? ext.autoRename : true,
          thumbnailQuality: ext.thumbnailQuality || 70,
          thumbnailWidth: ext.thumbnailWidth || 400,
          thumbnailHeight: ext.thumbnailHeight || 300,

          heartColor: ext.heartColor || "#E11D48",
          heartAnimation: ext.heartAnimation || "pulse",
          minSelectionLimit: ext.minSelectionLimit || 1,
          selectionDeadline: ext.selectionDeadline || "",
          allowUnselect: ext.allowUnselect !== undefined ? ext.allowUnselect : true,
          confirmationDialog: ext.confirmationDialog !== undefined ? ext.confirmationDialog : true,
          selectionSuccessMessage: ext.selectionSuccessMessage ?? (isDemo ? "Your curation was registered successfully." : ""),
          selectionFailedMessage: ext.selectionFailedMessage ?? (isDemo ? "Could not register choices. Check network." : ""),

          gridStyle: ext.gridStyle || "classic",
          gridGap: ext.gridGap || "gap-4",
          lazyLoading: ext.lazyLoading !== undefined ? ext.lazyLoading : true,
          slideshowEnabled: ext.slideshowEnabled !== undefined ? ext.slideshowEnabled : true,
          backgroundMusicUrl: ext.backgroundMusicUrl || "",
          musicVolume: ext.musicVolume || 50,
          musicAutoPlay: ext.musicAutoPlay !== undefined ? ext.musicAutoPlay : false,
          watermarkPosition: ext.watermarkPosition || "center",
          watermarkSize: ext.watermarkSize || "medium",
          watermarkOpacity: ext.watermarkOpacity || 30,
          disableRightClick: ext.disableRightClick !== undefined ? ext.disableRightClick : true,
          disableDownload: ext.disableDownload !== undefined ? ext.disableDownload : false,
          disableDrag: ext.disableDrag !== undefined ? ext.disableDrag : true,
          hideExif: ext.hideExif !== undefined ? ext.hideExif : true,

          adminEmail: ext.adminEmail || rawSettings.email || "admin@example.com",
          trustedDevices: ext.trustedDevices || "[]",
          deviceHistory: ext.deviceHistory || "[]",
          ipRestriction: ext.ipRestriction || "",

          downloadOriginal: ext.downloadOriginal !== undefined ? ext.downloadOriginal : true,
          downloadWatermarked: ext.downloadWatermarked !== undefined ? ext.downloadWatermarked : false,
          zipNameFormat: ext.zipNameFormat || "{album_name}_selected",
          folderStructure: ext.folderStructure || "flat",
          includeExifInZip: ext.includeExifInZip !== undefined ? ext.includeExifInZip : true,
          includeMetadataInZip: ext.includeMetadataInZip !== undefined ? ext.includeMetadataInZip : true,
          includeAlbumInfoInZip: ext.includeAlbumInfoInZip !== undefined ? ext.includeAlbumInfoInZip : true,

          archivePeriodDays: ext.archivePeriodDays || 180,
          autoDelete: ext.autoDelete !== undefined ? ext.autoDelete : false,
          autoArchive: ext.autoArchive !== undefined ? ext.autoArchive : true,

          trashCount: ext.trashCount || 12,
          archiveCount: ext.archiveCount || 4,

          notifyUploadFinished: ext.notifyUploadFinished !== undefined ? ext.notifyUploadFinished : true,
          notifySelectionSubmitted: ext.notifySelectionSubmitted !== undefined ? ext.notifySelectionSubmitted : true,
          notifyAlbumExpiring: ext.notifyAlbumExpiring !== undefined ? ext.notifyAlbumExpiring : true,
          notifyAlbumDeleted: ext.notifyAlbumDeleted !== undefined ? ext.notifyAlbumDeleted : true,

          welcomeBannerUrl: ext.welcomeBannerUrl || "",
          welcomeText: ext.welcomeText ?? (isDemo ? "Welcome to Your Curated Wedding Gallery" : ""),
          clientInstructions: ext.clientInstructions ?? (isDemo ? "Select your favorite photographs by clicking hearts, then hit submit." : ""),
          portalBackground: ext.portalBackground || "light",
          portalTheme: ext.portalTheme || "serif",
          portalLoader: ext.portalLoader || "elegant",
          portalAnimation: ext.portalAnimation || "fade-in",
          portalFooter: ext.portalFooter ?? (isDemo ? `© ${currentStudioName}` : ""),
          showContactBtn: ext.showContactBtn !== undefined ? ext.showContactBtn : true,
          showWhatsAppBtn: ext.showWhatsAppBtn !== undefined ? ext.showWhatsAppBtn : true,
          showInstagramBtn: ext.showInstagramBtn !== undefined ? ext.showInstagramBtn : true,
          showFacebookBtn: ext.showFacebookBtn !== undefined ? ext.showFacebookBtn : true,

          dashboardWidgets: ext.dashboardWidgets || "[]",
          statisticsCards: ext.statisticsCards || "[]",
          recentUploadsEnabled: ext.recentUploadsEnabled !== undefined ? ext.recentUploadsEnabled : true,
          recentSelectionsEnabled: ext.recentSelectionsEnabled !== undefined ? ext.recentSelectionsEnabled : true,
          recentClientsEnabled: ext.recentClientsEnabled !== undefined ? ext.recentClientsEnabled : true,
          quickActionsEnabled: ext.quickActionsEnabled !== undefined ? ext.quickActionsEnabled : true,
          shortcutsEnabled: ext.shortcutsEnabled !== undefined ? ext.shortcutsEnabled : true,

          backupSchedule: ext.backupSchedule || "weekly",
          restoreBackupFile: ext.restoreBackupFile || "",

          googleAnalyticsId: ext.googleAnalyticsId || "",
          facebookPixelId: ext.facebookPixelId || "",
          customCss: ext.customCss || "",
          customJs: ext.customJs || "",
          metaTags: ext.metaTags || "",
          smtpHost: ext.smtpHost || "",
          smtpPort: ext.smtpPort || "",
          smtpUser: ext.smtpUser || "",

          aiFaceRecognition: ext.aiFaceRecognition !== undefined ? ext.aiFaceRecognition : false,
          aiDuplicateDetection: ext.aiDuplicateDetection !== undefined ? ext.aiDuplicateDetection : false,
          aiBlurDetection: ext.aiBlurDetection !== undefined ? ext.aiBlurDetection : false,
          aiClosedEyeDetection: ext.aiClosedEyeDetection !== undefined ? ext.aiClosedEyeDetection : false,
          aiSmileDetection: ext.aiSmileDetection !== undefined ? ext.aiSmileDetection : false,
          aiPersonSearch: ext.aiPersonSearch !== undefined ? ext.aiPersonSearch : false,

          ...ext
        };
        setSettings(merged);
      } else {
        triggerToast("Failed to retrieve system settings configuration.", "error");
      }

      // Stats response
      const statsRes = await authFetch("/api/settings/stats");
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error(err);
      triggerToast("Error loading studio control center variables.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle single field value updates
  const handleFieldChange = (key: string, value: any) => {
    if (!settings) return;
    setSettings((prev) => {
      if (!prev) return null;
      return { ...prev, [key]: value };
    });
  };

  // Dynamic live preview effect for immediate color and theme updates before saving
  useEffect(() => {
    if (!settings) return;

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

    // Dynamic border radii values
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
    root.style.setProperty("--btn-radius", btnRadius);
    root.style.setProperty("--card-radius", crdRadius);

    const activeTheme = settings.dashboardTheme || "light";
    if (activeTheme === "dark" || settings.darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [settings]);

  // Reset theme settings to default values
  const handleResetTheme = () => {
    if (!settings) return;
    setSettings((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        primaryColor: "#121211",
        secondaryColor: "#D4AF37",
        accentColor: "#D4AF37",
        backgroundColor: "#fafafa",
        sidebarColor: "#f9f9f9",
        topbarColor: "#ffffff",
        cardColor: "#ffffff",
        buttonColor: "#121211",
        textColor: "#09090b",
        buttonStyle: "rounded-xl",
        cardStyle: "rounded-2xl",
        darkMode: false,
        lightMode: true,
        dashboardTheme: "light"
      };
    });
    triggerToast("Theme reset to system defaults (live preview active). Save to persist.");
  };

  // Enterprise save implementation
  const handleSaveSettings = async () => {
    if (!settings) return;

    if (!settings.studioName || !settings.studioName.trim()) {
      triggerToast("Studio Name is required.", "error");
      return;
    }

    setSaving(true);
    try {
      const dbColumns = [
        "studioName", "studioLogo", "favicon", "photographerName", "address", "phone",
        "whatsApp", "email", "website", "primaryColor", "secondaryColor", "accentColor",
        "backgroundColor", "sidebarColor", "topbarColor", "cardColor", "buttonColor", "textColor",
        "font", "darkMode", "lightMode", "dashboardTheme", "clientTheme", "buttonStyle",
        "cardStyle", "galleryTitle", "galleryDescription", "defaultCover", "gridColumns",
        "infiniteScroll", "watermarkEnabled", "downloadEnabled", "fullscreenEnabled",
        "zoomEnabled", "passwordProtection", "linkExpiryEnabled", "expiryDays",
        "gracePeriodDays", "allowReselection", "maxSelectionLimit", "showSelectionCounter",
        "allowComments", "showPhotographerContact", "maxUploadSize", "allowedFileTypes",
        "autoThumbnail", "originalImageStorage", "compressionLevel", "sessionTimeout",
        "twoFactorEnabled", "loginHistory", "emailNotification", "whatsAppNotification",
        "browserNotification", "customDomain", "sslStatus", "seoKeywords", "seoDescription"
      ];

      const extendedObject: any = {};
      for (const key of Object.keys(settings)) {
        if (!dbColumns.includes(key) && key !== "extendedSettings" && key !== "id") {
          extendedObject[key] = settings[key];
        }
      }

      // Build explicit payload
      const payload: any = {
        hasSavedCustomData: true,
        isDemoMode: false
      };

      for (const col of dbColumns) {
        if (settings[col] !== undefined) {
          payload[col] = settings[col];
        }
      }
      payload.extendedSettings = JSON.stringify(extendedObject);

      const response = await authFetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (response.ok) {
        let ext: any = {};
        try {
          ext = data.settings.extendedSettings ? JSON.parse(data.settings.extendedSettings) : {};
        } catch (e) {}
        
        setSettings({
          ...data.settings,
          ...ext,
          hasSavedCustomData: true,
          isDemoMode: false
        });
        triggerToast("Settings updated successfully", "success");
        refreshGlobalSettings();
      } else {
        throw new Error(data.error || "Failed to update settings.");
      }
    } catch (err: any) {
      triggerToast(err.message || "Failed to update Settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Upload branding elements
  const handleBrandingUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "favicon") => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append(type, file);

      const response = await authFetch("/api/settings/upload", {
        method: "POST",
        body: formData
      });

      const data = await response.json();
      if (response.ok) {
        let ext: any = {};
        try {
          ext = data.settings.extendedSettings ? JSON.parse(data.settings.extendedSettings) : {};
        } catch (e) {}
        
        setSettings({
          ...data.settings,
          ...ext
        });
        triggerToast(`${type === "logo" ? "Studio Logo" : "Favicon"} uploaded and active!`);
        refreshGlobalSettings();
      } else {
        throw new Error(data.error || "File asset upload failed.");
      }
    } catch (err: any) {
      triggerToast(err.message || "Branding file upload failed.", "error");
    } finally {
      setUploadingLogo(false);
    }
  };

  // Change Admin Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      triggerToast("Please provide current and new passwords.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      triggerToast("Confirm password input must match.", "error");
      return;
    }

    setUpdatingPassword(true);
    try {
      const response = await authFetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await response.json();
      if (response.ok) {
        triggerToast("Superuser password rotated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        throw new Error(data.error || "Password change rejected.");
      }
    } catch (err: any) {
      triggerToast(err.message || "Failed to update credential.", "error");
    } finally {
      setUpdatingPassword(false);
    }
  };

  // Export Settings
  const handleExportBackup = async () => {
    try {
      const res = await authFetch("/api/settings/backup/export");
      if (!res.ok) throw new Error("Could not construct snapshot.");
      const json = await res.json();

      const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `studio_config_backup_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      triggerToast("Studio JSON configuration backup exported.");
    } catch (err: any) {
      triggerToast(err.message || "Failed to create backup.", "error");
    }
  };

  // Import Settings
  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const backupJson = JSON.parse(text);

      const res = await authFetch("/api/settings/backup/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(backupJson)
      });

      const data = await res.json();
      if (res.ok) {
        let ext: any = {};
        try {
          ext = data.settings.extendedSettings ? JSON.parse(data.settings.extendedSettings) : {};
        } catch (e) {}
        
        setSettings({
          ...data.settings,
          ...ext
        });
        triggerToast("Studio config parameters restored successfully!");
        refreshGlobalSettings();
      } else {
        throw new Error(data.error || "Backup import failed.");
      }
    } catch (err) {
      triggerToast("Invalid file or import failure.", "error");
    }
  };

  if (loading || !settings) {
    return (
      <div className="p-16 text-center" id="settings-loading-view">
        <Loader2 className="h-8 w-8 text-neutral-600 animate-spin mx-auto mb-4" />
        <p className="text-xs font-mono uppercase tracking-widest text-neutral-400">Booting Enterprise Control Center...</p>
      </div>
    );
  }

  // Find active section details from our schema
  const activeSection = SETTINGS_SECTIONS.find(sec => sec.id === activeTabId) || SETTINGS_SECTIONS[0];

  return (
    <div className="flex flex-col gap-6" id="settings-panel-root">
      {/* Sticky Save / Synchronizer Header Bar */}
      <div className="bg-white border border-neutral-200/60 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center shrink-0">
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-serif text-neutral-900 font-semibold tracking-tight">Enterprise Control Center</h1>
            <p className="text-[11px] text-neutral-400 font-mono uppercase">Master System Sync Pipeline</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={loadData}
            disabled={saving}
            className="flex-1 sm:flex-none justify-center px-4 py-2 border border-neutral-200 text-neutral-600 rounded-xl text-xs font-medium hover:bg-neutral-50 active:scale-98 transition-all flex items-center gap-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${saving ? "animate-spin" : ""}`} />
            <span>Reload</span>
          </button>
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="flex-1 sm:flex-none justify-center px-5 py-2.5 bg-neutral-900 text-white rounded-xl text-xs font-medium hover:bg-neutral-800 active:scale-98 transition-all flex items-center gap-2 shadow-sm"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span>{saving ? "Saving settings..." : "Save Configuration"}</span>
          </button>
        </div>
      </div>

      {/* Main Settings Frame layout */}
      <div className="bg-white border border-neutral-200/60 rounded-2xl overflow-hidden shadow-sm flex flex-col lg:flex-row min-h-[650px]">
        {/* Left Side Tab Navigation */}
        <div className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-neutral-100 bg-neutral-50/50 p-4 flex flex-col gap-5 shrink-0 max-h-[850px] overflow-y-auto">
          {SETTINGS_GROUPS.map((group) => {
            const groupSections = SETTINGS_SECTIONS.filter(s => s.group === group.id);
            return (
              <div key={group.id} className="space-y-1.5">
                <span className="font-mono text-[9px] tracking-widest text-neutral-400 uppercase font-bold px-3">
                  {group.name}
                </span>
                <div className="space-y-0.5">
                  {groupSections.map((sec) => {
                    const Icon = sec.icon;
                    return (
                      <button
                        key={sec.id}
                        onClick={() => setActiveTabId(sec.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-medium tracking-wide transition-all ${
                          activeTabId === sec.id
                            ? "bg-neutral-900 text-white shadow-sm font-semibold"
                            : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-4 w-4 shrink-0" />
                          <span>{sec.name}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Content Panel Area */}
        <div className="flex-1 p-6 sm:p-8 flex flex-col justify-between max-h-[850px] overflow-y-auto">
          <div className="space-y-6">
            {/* Header section */}
            <div className="border-b border-neutral-100 pb-4">
              <div className="flex items-center gap-2 text-neutral-400">
                <activeSection.icon className="h-5 w-5" />
                <span className="text-[10px] font-mono uppercase tracking-widest">Section Workspace</span>
              </div>
              <h2 className="text-xl font-serif text-neutral-900 font-normal mt-1">
                {activeSection.name}
              </h2>
              <p className="text-[11px] text-neutral-400 font-light mt-1 max-w-2xl">
                {activeSection.description}
              </p>
            </div>

            {/* Dynamic grid mapping of fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {activeSection.fields.map((field) => {
                // RENDER DYNAMIC FIELD TYPE MATCHES
                if (field.type === "custom") {
                  // Custom rendering for complex visual interfaces
                  if (field.id === "logo_upload_trigger") {
                    return (
                      <div key={field.id} className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 border border-neutral-100 rounded-2xl p-4 bg-neutral-50/50">
                        <div>
                          <span className="block text-[10px] font-mono text-neutral-400 uppercase mb-2">Upload Studio Logo</span>
                          <div className="border border-dashed border-neutral-200 rounded-xl p-4 text-center bg-white flex flex-col items-center justify-center gap-2">
                            {(settings.studioLogo?.trim() || settings.logoUrl?.trim()) ? (
                              <img src={settings.studioLogo?.trim() || settings.logoUrl?.trim()} alt="studio logo preview" className="max-h-10 object-contain rounded" />
                            ) : (
                              <Building className="h-6 w-6 text-neutral-300" />
                            )}
                            <label className="cursor-pointer bg-neutral-50 border border-neutral-200 text-neutral-700 text-[10px] uppercase tracking-wider font-semibold py-1.5 px-3 rounded-lg hover:bg-neutral-100 transition-colors mt-1">
                              {uploadingLogo ? "Uploading..." : "Upload File"}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleBrandingUpload(e, "logo")}
                                disabled={uploadingLogo}
                              />
                            </label>
                          </div>
                        </div>

                        <div>
                          <span className="block text-[10px] font-mono text-neutral-400 uppercase mb-2">Upload Favicon</span>
                          <div className="border border-dashed border-neutral-200 rounded-xl p-4 text-center bg-white flex flex-col items-center justify-center gap-2">
                            {settings.favicon?.trim() ? (
                              <img src={settings.favicon.trim()} alt="favicon preview" className="max-h-8 w-8 object-contain rounded" />
                            ) : (
                              <Globe className="h-6 w-6 text-neutral-300" />
                            )}
                            <label className="cursor-pointer bg-neutral-50 border border-neutral-200 text-neutral-700 text-[10px] uppercase tracking-wider font-semibold py-1.5 px-3 rounded-lg hover:bg-neutral-100 transition-colors mt-1">
                              {uploadingLogo ? "Uploading..." : "Upload File"}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleBrandingUpload(e, "favicon")}
                                disabled={uploadingLogo}
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (field.id === "password_form_custom") {
                    return (
                      <form key={field.id} onSubmit={handleChangePassword} className="sm:col-span-2 border border-neutral-100 rounded-2xl p-5 bg-neutral-50/30 space-y-4">
                        <div className="flex items-center gap-2 border-b border-neutral-100 pb-2">
                          <Key className="h-4 w-4 text-neutral-500" />
                          <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-700">Rotate Studio Passwords</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[10px] font-mono text-neutral-400 uppercase mb-1">Current Password</label>
                            <input
                              type="password"
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-mono text-neutral-400 uppercase mb-1">New Password</label>
                            <input
                              type="password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-mono text-neutral-400 uppercase mb-1">Confirm New Password</label>
                            <input
                              type="password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={updatingPassword}
                            className="px-4 py-2 bg-neutral-950 text-white rounded-lg text-[10px] font-mono uppercase tracking-wider hover:bg-neutral-800 disabled:opacity-50"
                          >
                            {updatingPassword ? "Updating Password..." : "Rotate Credentials"}
                          </button>
                        </div>
                      </form>
                    );
                  }

                  if (field.id === "storage_custom_indicator") {
                    return (
                      <div key={field.id} className="sm:col-span-2 space-y-4">
                        {stats ? (
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                            <div className="border border-neutral-100 rounded-xl p-4 bg-neutral-50/50">
                              <span className="block text-[9px] font-mono uppercase text-neutral-400">Total Albums</span>
                              <p className="text-2xl font-serif text-neutral-900 mt-1">{stats.totalAlbums}</p>
                            </div>
                            <div className="border border-neutral-100 rounded-xl p-4 bg-neutral-50/50">
                              <span className="block text-[9px] font-mono uppercase text-neutral-400">Total Photos</span>
                              <p className="text-2xl font-serif text-neutral-900 mt-1">{stats.totalPhotos}</p>
                            </div>
                            <div className="border border-neutral-100 rounded-xl p-4 bg-neutral-50/50">
                              <span className="block text-[9px] font-mono uppercase text-neutral-400">Selected Photos</span>
                              <p className="text-2xl font-serif text-neutral-900 mt-1">{stats.totalSelectedPhotos}</p>
                            </div>
                            <div className="border border-neutral-100 rounded-xl p-4 bg-neutral-50/50">
                              <span className="block text-[9px] font-mono uppercase text-neutral-400">Total Space Limit</span>
                              <p className="text-2xl font-serif text-neutral-900 mt-1">{formatBytes(stats.storageLimit)}</p>
                            </div>

                            {/* Live Premium SVG Gauge */}
                            <div className="sm:col-span-4 border border-neutral-100 rounded-xl p-5 bg-white space-y-3">
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2 font-medium">
                                  <HardDrive className="h-4 w-4 text-neutral-600" />
                                  <span>Allocated Space Footprint</span>
                                </div>
                                <span className="font-mono text-neutral-500 font-semibold">{stats.storagePercentage}% Used</span>
                              </div>
                              <div className="h-2.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-neutral-900 rounded-full transition-all duration-500"
                                  style={{ width: `${stats.storagePercentage}%` }}
                                />
                              </div>
                              <div className="grid grid-cols-3 text-[10px] font-mono text-neutral-400">
                                <div>Original Images: {formatBytes(stats.originalImageSize)}</div>
                                <div className="text-center">Thumbnails: {formatBytes(stats.thumbnailSize)}</div>
                                <div className="text-right">DB Size: {formatBytes(stats.databaseSize)}</div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 border border-neutral-100 rounded-xl bg-neutral-50 text-center text-xs text-neutral-400">
                            Loading storage live analysis telemetry...
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (field.id === "security_login_logs") {
                    let logs: any[] = [];
                    try {
                      logs = JSON.parse(settings.loginHistory || "[]");
                    } catch (e) {}
                    return (
                      <div key={field.id} className="sm:col-span-2 border border-neutral-100 rounded-xl p-5 space-y-3">
                        <span className="block text-[10px] font-mono uppercase text-neutral-400 tracking-wider">Superuser Access Logs</span>
                        <div className="max-h-40 overflow-y-auto divide-y divide-neutral-100">
                          {logs.length > 0 ? (
                            logs.map((log: any, idx: number) => (
                              <div key={idx} className="py-2.5 text-[10px] font-mono flex items-center justify-between text-neutral-500">
                                <span className="text-neutral-800">{log.ip || "127.0.0.1"}</span>
                                <span>{log.userAgent || "Desktop Client"}</span>
                                <span className="text-neutral-400">{log.timestamp ? new Date(log.timestamp).toLocaleString() : "Unknown Time"}</span>
                              </div>
                            ))
                          ) : (
                            <div className="py-4 text-center text-neutral-400 text-xs">No administrative access recorded.</div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  if (field.id === "analytics_custom_dashboard") {
                    return (
                      <div key={field.id} className="sm:col-span-2 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="border border-neutral-100 rounded-xl p-4 bg-neutral-50/50">
                            <span className="block text-[9px] font-mono uppercase text-neutral-400">Monthly Visitors</span>
                            <p className="text-2xl font-serif text-neutral-900 mt-1">4,289</p>
                          </div>
                          <div className="border border-neutral-100 rounded-xl p-4 bg-neutral-50/50">
                            <span className="block text-[9px] font-mono uppercase text-neutral-400">Total QR Scans</span>
                            <p className="text-2xl font-serif text-neutral-900 mt-1">312</p>
                          </div>
                          <div className="border border-neutral-100 rounded-xl p-4 bg-neutral-50/50">
                            <span className="block text-[9px] font-mono uppercase text-neutral-400">Unique Views</span>
                            <p className="text-2xl font-serif text-neutral-900 mt-1">11,402</p>
                          </div>
                        </div>

                        {/* Beautiful Curated Custom SVG Graph */}
                        <div className="border border-neutral-100 rounded-xl p-5 bg-white space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-neutral-800">Gallery Views over Time</span>
                            <span className="text-[10px] font-mono text-emerald-500 font-semibold">+18.4% This Week</span>
                          </div>
                          <div className="h-44 w-full bg-neutral-50 rounded-lg p-2 relative flex items-end justify-between">
                            {/* SVG Line & Dots */}
                            <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
                              <path
                                d="M 10,130 C 60,110 120,40 180,60 C 240,80 300,10 360,30 C 420,50 480,90 540,100"
                                fill="none"
                                stroke="#171717"
                                strokeWidth="2.5"
                              />
                            </svg>
                            {/* Horizontal gridlines */}
                            <div className="absolute inset-x-0 top-1/4 border-b border-neutral-200/50" />
                            <div className="absolute inset-x-0 top-2/4 border-b border-neutral-200/50" />
                            <div className="absolute inset-x-0 top-3/4 border-b border-neutral-200/50" />
                            
                            {/* Months label indicators */}
                            <div className="absolute bottom-2 inset-x-4 flex justify-between text-[8px] font-mono text-neutral-400 uppercase font-bold">
                              <span>Jan</span>
                              <span>Feb</span>
                              <span>Mar</span>
                              <span>Apr</span>
                              <span>May</span>
                              <span>Jun</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (field.id === "backup_custom_management") {
                    return (
                      <div key={field.id} className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 border border-neutral-100 rounded-xl p-5 bg-neutral-50/50">
                        <div>
                          <h4 className="text-xs font-mono uppercase text-neutral-700 font-semibold">Export Configuration backup</h4>
                          <p className="text-[10px] text-neutral-400 mt-1 mb-3">Download a portable JSON snapshot mapping all settings details.</p>
                          <button
                            onClick={handleExportBackup}
                            className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-[10px] font-mono uppercase tracking-wider flex items-center gap-2"
                          >
                            <Download className="h-3 w-3" />
                            <span>Export Snapshot</span>
                          </button>
                        </div>

                        <div>
                          <h4 className="text-xs font-mono uppercase text-neutral-700 font-semibold">Restore Configuration backup</h4>
                          <p className="text-[10px] text-neutral-400 mt-1 mb-3">Ingest an existing configuration backup payload directly into Supabase.</p>
                          <label className="inline-flex cursor-pointer bg-white border border-neutral-200 text-neutral-700 text-[10px] uppercase tracking-wider font-semibold py-2 px-3.5 rounded-lg hover:bg-neutral-50 transition-colors gap-2 items-center">
                            <Upload className="h-3 w-3" />
                            <span>Import JSON Backup</span>
                            <input
                              type="file"
                              accept="application/json"
                              className="hidden"
                              onChange={handleImportBackup}
                            />
                          </label>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }

                // RENDER TRADITIONAL CORE TYPES
                if (field.type === "boolean") {
                  return (
                    <div key={field.id} className="flex items-center justify-between p-3.5 border border-neutral-100 rounded-xl bg-neutral-50/40">
                      <div className="space-y-0.5">
                        <label className="text-xs font-medium text-neutral-700 block">{field.label}</label>
                        {field.helperText && <p className="text-[9px] text-neutral-400">{field.helperText}</p>}
                      </div>
                      <button
                        onClick={() => handleFieldChange(field.id, !settings[field.id])}
                        className={`h-5 w-10 rounded-full transition-colors relative shrink-0 ${
                          settings[field.id] ? "bg-neutral-900" : "bg-neutral-200"
                        }`}
                      >
                        <div
                          className={`h-3.5 w-3.5 rounded-full bg-white absolute top-0.75 transition-all ${
                            settings[field.id] ? "right-1" : "left-1"
                          }`}
                        />
                      </button>
                    </div>
                  );
                }

                if (field.type === "color") {
                  return (
                    <div key={field.id} className="space-y-1">
                      <label className="block text-[10px] font-mono text-neutral-400 uppercase tracking-wider">{field.label}</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={settings[field.id] || "#171717"}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                          className="h-9 w-9 border border-neutral-200 rounded-lg p-0 bg-transparent cursor-pointer shrink-0"
                        />
                        <input
                          type="text"
                          value={settings[field.id] || "#171717"}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                          className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg text-xs font-mono text-neutral-800"
                        />
                      </div>
                    </div>
                  );
                }

                if (field.type === "select") {
                  return (
                    <div key={field.id} className="space-y-1">
                      <label className="block text-[10px] font-mono text-neutral-400 uppercase tracking-wider">{field.label}</label>
                      <select
                        value={settings[field.id]}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-200 bg-white rounded-lg text-xs text-neutral-800 focus:outline-none focus:border-neutral-950"
                      >
                        {field.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                }

                if (field.type === "textarea") {
                  return (
                    <div key={field.id} className="sm:col-span-2 space-y-1">
                      <label className="block text-[10px] font-mono text-neutral-400 uppercase tracking-wider">{field.label}</label>
                      <textarea
                        value={settings[field.id] || ""}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        placeholder={field.placeholder}
                        rows={3}
                        className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs font-sans text-neutral-800 focus:outline-none focus:border-neutral-950"
                      />
                    </div>
                  );
                }

                // Default standard Input types (text, number)
                return (
                  <div key={field.id} className={field.colSpan === 2 ? "sm:col-span-2 space-y-1" : "space-y-1"}>
                    <label className="block text-[10px] font-mono text-neutral-400 uppercase tracking-wider">{field.label}</label>
                    <input
                      type={field.type}
                      value={settings[field.id] !== undefined ? settings[field.id] : ""}
                      onChange={(e) =>
                        handleFieldChange(
                          field.id,
                          field.type === "number" ? parseInt(e.target.value, 10) || 0 : e.target.value
                        )
                      }
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs font-sans text-neutral-800 focus:outline-none focus:border-neutral-950"
                    />
                  </div>
                );
              })}
            </div>

            {activeTabId === "appearance" && (
              <div className="mt-6 p-4 border border-rose-100 rounded-xl bg-rose-50/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-mono uppercase text-neutral-800 font-semibold">Theme Calibration Reset</h4>
                  <p className="text-[10px] text-neutral-400">Restore all appearance parameters back to our system defaults instantly.</p>
                </div>
                <button
                  type="button"
                  onClick={handleResetTheme}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[10px] font-mono uppercase tracking-wider flex items-center gap-2 border border-rose-200 self-start sm:self-center"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Reset to Default Theme</span>
                </button>
              </div>
            )}
          </div>

          {/* Footer Save Ribbon */}
          <div className="border-t border-neutral-100 pt-6 mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-neutral-400">
            <span className="text-[10px] font-mono uppercase tracking-wider">
              Sync State: {saving ? "Synchronizing database..." : "All changes cached locally"}
            </span>
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="w-full sm:w-auto px-5 py-2.5 bg-neutral-950 text-white rounded-xl text-xs font-mono uppercase tracking-wider hover:bg-neutral-800 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3 w-3" />
              )}
              <span>{saving ? "Saving settings..." : "Commit Changes"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Toast Notification HUD */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`px-4 py-3 rounded-xl border flex items-center gap-2.5 shadow-lg text-xs font-medium ${
                toast.type === "success"
                  ? "bg-white border-neutral-200 text-neutral-900"
                  : "bg-rose-50 border-rose-200 text-rose-800"
              }`}
            >
              {toast.type === "success" ? (
                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
              )}
              <span>{toast.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
