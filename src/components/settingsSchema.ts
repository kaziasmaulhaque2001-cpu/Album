import {
  Home,
  Palette,
  Sparkles,
  Camera,
  Heart,
  Layout,
  Lock,
  Download,
  Clock,
  Database,
  Bell,
  Smartphone,
  Sliders,
  BarChart3,
  RefreshCw,
  Cpu,
  Brain,
  Globe,
  Package,
  CreditCard
} from "lucide-react";

export interface FieldConfig {
  id: string;
  label: string;
  type: "text" | "number" | "boolean" | "select" | "color" | "textarea" | "custom";
  placeholder?: string;
  options?: { value: string | number; label: string }[];
  colSpan?: number;
  helperText?: string;
}

export interface SectionConfig {
  id: string;
  name: string;
  group: string;
  icon: any;
  description: string;
  fields: FieldConfig[];
}

export const SETTINGS_GROUPS = [
  { id: "core", name: "Core Operating Env" },
  { id: "interaction", name: "Gallery & Client interaction" },
  { id: "operations", name: "Operations & Automation" },
  { id: "security_metrics", name: "Security & Metrics" }
];

export const SETTINGS_SECTIONS: SectionConfig[] = [
  {
    id: "general",
    name: "General",
    group: "core",
    icon: Home,
    description: "Manage overall studio profile, identity variables, and timezone localization.",
    fields: [
      { id: "studioName", label: "Studio Name", type: "text", colSpan: 1 },
      { id: "businessType", label: "Business Type", type: "text", colSpan: 1, placeholder: "e.g., Wedding Photography Studio" },
      { id: "photographerName", label: "Photographer Name", type: "text", colSpan: 1 },
      { id: "ownerName", label: "Owner/Principal Name", type: "text", colSpan: 1 },
      { id: "email", label: "Business Email", type: "text", colSpan: 1 },
      { id: "supportEmail", label: "Support Email", type: "text", colSpan: 1 },
      { id: "phone", label: "Phone Number", type: "text", colSpan: 1 },
      { id: "whatsApp", label: "WhatsApp Contact", type: "text", colSpan: 1 },
      { id: "website", label: "Official Website", type: "text", colSpan: 1 },
      { id: "facebook", label: "Facebook Link", type: "text", colSpan: 1, placeholder: "https://facebook.com/..." },
      { id: "instagram", label: "Instagram Link", type: "text", colSpan: 1, placeholder: "https://instagram.com/..." },
      { id: "youtube", label: "YouTube Link", type: "text", colSpan: 1, placeholder: "https://youtube.com/..." },
      { id: "googleMapsLink", label: "Google Maps Link", type: "text", colSpan: 1 },
      { id: "address", label: "Physical Address", type: "textarea", colSpan: 2 },
      { id: "city", label: "City", type: "text", colSpan: 1 },
      { id: "state", label: "State", type: "text", colSpan: 1 },
      { id: "country", label: "Country", type: "text", colSpan: 1 },
      { id: "businessHours", label: "Business Hours", type: "text", colSpan: 1, placeholder: "Mon-Fri: 9:00 AM - 6:00 PM" },
      {
        id: "timezone",
        label: "Timezone",
        type: "select",
        colSpan: 1,
        options: [
          { value: "America/New_York", label: "Eastern Time (EST/EDT)" },
          { value: "America/Chicago", label: "Central Time (CST/CDT)" },
          { value: "America/Denver", label: "Mountain Time (MST/MDT)" },
          { value: "America/Los_Angeles", label: "Pacific Time (PST/PDT)" },
          { value: "Asia/Kolkata", label: "India Standard Time (IST)" },
          { value: "UTC", label: "Coordinated Universal Time (UTC)" },
          { value: "Europe/London", label: "London (GMT/BST)" },
          { value: "Europe/Paris", label: "Paris (CET/CEST)" }
        ]
      },
      {
        id: "language",
        label: "Default Language",
        type: "select",
        colSpan: 1,
        options: [
          { value: "en", label: "English" },
          { value: "es", label: "Spanish (Español)" },
          { value: "fr", label: "French (Français)" },
          { value: "de", label: "German (Deutsch)" }
        ]
      },
      {
        id: "currency",
        label: "Default Currency",
        type: "select",
        colSpan: 1,
        options: [
          { value: "USD", label: "USD ($)" },
          { value: "INR", label: "INR (₹)" },
          { value: "EUR", label: "EUR (€)" },
          { value: "GBP", label: "GBP (£)" },
          { value: "CAD", label: "CAD ($)" }
        ]
      },
      {
        id: "dateFormat",
        label: "Date Format",
        type: "select",
        colSpan: 1,
        options: [
          { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
          { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
          { value: "YYYY-MM-DD", label: "YYYY-MM-DD" }
        ]
      },
      {
        id: "timeFormat",
        label: "Time Format",
        type: "select",
        colSpan: 1,
        options: [
          { value: "12h", label: "12-hour (am/pm)" },
          { value: "24h", label: "24-hour" }
        ]
      }
    ]
  },
  {
    id: "appearance",
    name: "Appearance",
    group: "core",
    icon: Palette,
    description: "Customize administrative workspace colors, border radii, and visual themes.",
    fields: [
      { id: "lightMode", label: "Enable Light Theme", type: "boolean", colSpan: 1 },
      { id: "darkMode", label: "Enable Dark Theme", type: "boolean", colSpan: 1 },
      { id: "autoTheme", label: "Match System Theme (Auto)", type: "boolean", colSpan: 1 },
      { id: "primaryColor", label: "Primary Base Color (Hex)", type: "color", colSpan: 1 },
      { id: "secondaryColor", label: "Secondary Theme Accent (Hex)", type: "color", colSpan: 1 },
      { id: "accentColor", label: "Alternative Accent Color (Hex)", type: "color", colSpan: 1 },
      { id: "backgroundColor", label: "Canvas Background (Hex)", type: "color", colSpan: 1 },
      { id: "sidebarColor", label: "Admin Sidebar Fill (Hex)", type: "color", colSpan: 1 },
      { id: "topbarColor", label: "Admin Topbar Fill (Hex)", type: "color", colSpan: 1 },
      { id: "cardColor", label: "Card Element Fill (Hex)", type: "color", colSpan: 1 },
      { id: "buttonColor", label: "Button & Solid Fills (Hex)", type: "color", colSpan: 1 },
      { id: "textColor", label: "Global Typography Ink (Hex)", type: "color", colSpan: 1 },
      {
        id: "cardStyle",
        label: "Card Border Radius",
        type: "select",
        colSpan: 1,
        options: [
          { value: "rounded-none", label: "None (Brutalist)" },
          { value: "rounded-xl", label: "Elegant (12px)" },
          { value: "rounded-2xl", label: "Curved (16px)" },
          { value: "rounded-3xl", label: "Pillowy (24px)" }
        ]
      },
      {
        id: "buttonStyle",
        label: "Button Radius Style",
        type: "select",
        colSpan: 1,
        options: [
          { value: "rounded-none", label: "Square" },
          { value: "rounded-md", label: "Mild Radius" },
          { value: "rounded-xl", label: "Default Pill" },
          { value: "rounded-full", label: "Stadium capsule" }
        ]
      },
      {
        id: "shadowStyle",
        label: "Component Shadows",
        type: "select",
        colSpan: 1,
        options: [
          { value: "none", label: "Flat (No Shadows)" },
          { value: "sm", label: "Subtle Depth (Small)" },
          { value: "md", label: "Elevated (Medium)" },
          { value: "lg", label: "Floating (Large)" }
        ]
      },
      {
        id: "font",
        label: "Typography Face",
        type: "select",
        colSpan: 1,
        options: [
          { value: "Inter", label: "Inter (Curated Clean)" },
          { value: "Space Grotesk", label: "Space Grotesk (Tech Modern)" },
          { value: "Playfair Display", label: "Playfair Display (Serif Elegance)" },
          { value: "JetBrains Mono", label: "JetBrains Mono (Console Mono)" }
        ]
      },
      {
        id: "fontSize",
        label: "Base Typography Scaling",
        type: "select",
        colSpan: 1,
        options: [
          { value: "sm", label: "Compact (Small)" },
          { value: "base", label: "Standard (Medium)" },
          { value: "lg", label: "High Legibility (Large)" }
        ]
      },
      {
        id: "animationSpeed",
        label: "Micro-animation Velocity",
        type: "select",
        colSpan: 1,
        options: [
          { value: "none", label: "Instantaneous (Disable)" },
          { value: "fast", label: "Crisp & Snappy" },
          { value: "normal", label: "Cinematic Natural" },
          { value: "slow", label: "Eased & Leisurely" }
        ]
      },
      {
        id: "dashboardLayout",
        label: "Dashboard Composition",
        type: "select",
        colSpan: 1,
        options: [
          { value: "grid", label: "Symmetrical Bento Grid" },
          { value: "list", label: "Linear Task Stream" }
        ]
      },
      { id: "compactMode", label: "Enable Compact Density Mode", type: "boolean", colSpan: 1 }
    ]
  },
  {
    id: "branding",
    name: "Logo & Branding",
    group: "core",
    icon: Sparkles,
    description: "Manage custom icons, client logos, and text copyrights.",
    fields: [
      { id: "logo_upload_trigger", label: "Logo & Favicon Handlers", type: "custom", colSpan: 2 },
      { id: "dashboardLogo", label: "Custom Dashboard Logo URL", type: "text", colSpan: 1 },
      { id: "loginLogo", label: "Custom Admin Login Logo URL", type: "text", colSpan: 1 },
      { id: "clientGalleryLogo", label: "Client Portal Logo URL Overlay", type: "text", colSpan: 1 },
      {
        id: "loadingScreen",
        label: "System Loading Screen Indicator",
        type: "select",
        colSpan: 1,
        options: [
          { value: "spinner", label: "Minimalist Mono Spinner" },
          { value: "logo", label: "Floating Brand Emblem Fade" },
          { value: "minimal", label: "Linear Progress Bar" }
        ]
      },
      { id: "splashScreen", label: "Display Greeting Splash Screen", type: "boolean", colSpan: 1 },
      { id: "copyrightText", label: "Copyright Statement Block", type: "text", colSpan: 1 },
      { id: "footerText", label: "Sub-Footer Narrative Message", type: "text", colSpan: 1 },
      { id: "poweredByText", label: "Attribution Tag (Powered By)", type: "text", colSpan: 1 }
    ]
  },
  {
    id: "photos",
    name: "Photo Settings",
    group: "core",
    icon: Camera,
    description: "Optimize uploading pipeline parameters, formats, compression levels, and thumbnailing.",
    fields: [
      {
        id: "uploadQuality",
        label: "Ingress Image Quality Level",
        type: "select",
        colSpan: 1,
        options: [
          { value: "original", label: "Preserve Absolute Original (Lossless)" },
          { value: "high", label: "High-Fidelity Optimized Web" },
          { value: "compressed", label: "Compressed Budget Saver" }
        ]
      },
      { id: "compressionLevel", label: "JPEG/WEBP Compression Value (0-100)", type: "number", colSpan: 1 },
      { id: "maxUploadSize", label: "Maximum File Limit Size (MB)", type: "number", colSpan: 1 },
      { id: "maxUploadCount", label: "Maximum Batch Upload Count Limit", type: "number", colSpan: 1 },
      { id: "rawSupport", label: "Accept RAW Formats (.CR2, .NEF, .ARW)", type: "boolean", colSpan: 1 },
      { id: "jpegSupport", label: "Accept Standard JPEG/JPG", type: "boolean", colSpan: 1 },
      { id: "pngSupport", label: "Accept Lossless PNG Format", type: "boolean", colSpan: 1 },
      { id: "webpSupport", label: "Accept Next-Gen WEBP Format", type: "boolean", colSpan: 1 },
      { id: "heicSupport", label: "Accept Apple HEIC Mobile Format", type: "boolean", colSpan: 1 },
      { id: "tiffSupport", label: "Accept Curated Archive TIFF Format", type: "boolean", colSpan: 1 },
      { id: "duplicateDetection", label: "Enable Hash-based Duplicate Image Check", type: "boolean", colSpan: 1 },
      {
        id: "duplicateAction",
        label: "Action on Duplicate Detected",
        type: "select",
        colSpan: 1,
        options: [
          { value: "skip", label: "Reject & Skip Upload" },
          { value: "overwrite", label: "Overrun Existing File" },
          { value: "rename", label: "Append Numerical Suffix" }
        ]
      },
      { id: "autoRename", label: "Normalize & Auto-Rename File Names", type: "boolean", colSpan: 1 },
      { id: "autoThumbnail", label: "Automatically Generate Web View Thumbnails", type: "boolean", colSpan: 1 },
      { id: "thumbnailQuality", label: "Thumbnail Target Quality (0-100)", type: "number", colSpan: 1 },
      { id: "thumbnailWidth", label: "Thumbnail Frame Width Constraint (px)", type: "number", colSpan: 1 },
      { id: "thumbnailHeight", label: "Thumbnail Frame Height Constraint (px)", type: "number", colSpan: 1 }
    ]
  },
  {
    id: "selection",
    name: "Client Selection",
    group: "interaction",
    icon: Heart,
    description: "Fine-tune selection parameters, favorite hearts, and client reselection rights.",
    fields: [
      { id: "heartColor", label: "Interactive Favorite Heart Color Fill", type: "color", colSpan: 1 },
      {
        id: "heartAnimation",
        label: "Activation Animation Effect",
        type: "select",
        colSpan: 1,
        options: [
          { value: "pulse", label: "Rhythmic Heartbeat Pulse" },
          { value: "scale", label: "Bouncing Expand" },
          { value: "float", label: "Floating Bubble Drift" }
        ]
      },
      { id: "showSelectionCounter", label: "Display Client Selection Counter Tracker", type: "boolean", colSpan: 1 },
      { id: "maxSelectionLimit", label: "Maximum Choice Selection Cap Limit", type: "number", colSpan: 1 },
      { id: "minSelectionLimit", label: "Minimum Choice Selection Hurdle Limit", type: "number", colSpan: 1 },
      { id: "selectionDeadline", label: "Global Selection Cutoff Deadline (ISO/Date)", type: "text", colSpan: 1, placeholder: "YYYY-MM-DD" },
      { id: "allowReselection", label: "Allow Unlocking & Client Resubmission", type: "boolean", colSpan: 1 },
      { id: "allowUnselect", label: "Allow De-selecting already selected images", type: "boolean", colSpan: 1 },
      { id: "confirmationDialog", label: "Require Confirm Dialog on Selection Submit", type: "boolean", colSpan: 1 },
      { id: "selectionSuccessMessage", label: "Submission Success Toast Message", type: "textarea", colSpan: 2 },
      { id: "selectionFailedMessage", label: "Submission Error Warning Message", type: "textarea", colSpan: 2 }
    ]
  },
  {
    id: "gallery",
    name: "Gallery Design",
    group: "interaction",
    icon: Layout,
    description: "Design front-end client-facing galleries, watermarking positions, and safety blocks.",
    fields: [
      { id: "galleryTitle", label: "Global Default Gallery Heading Title", type: "text", colSpan: 1 },
      { id: "galleryDescription", label: "Global Default Gallery Introduction text", type: "textarea", colSpan: 2 },
      {
        id: "gridStyle",
        label: "Grid Layout Composition",
        type: "select",
        colSpan: 1,
        options: [
          { value: "classic", label: "Symmetrical Clean Cards Grid" },
          { value: "masonry", label: "Organic Flowing Masonry Grid" },
          { value: "justified", label: "Dynamic Row-Justified Collage" }
        ]
      },
      { id: "gridColumns", label: "Symmetrical Column Count Target", type: "number", colSpan: 1 },
      {
        id: "gridGap",
        label: "Inter-image Cell Margin Gap",
        type: "select",
        colSpan: 1,
        options: [
          { value: "gap-1", label: "Ultra-compact hairline (4px)" },
          { value: "gap-2", label: "Consolidated slim (8px)" },
          { value: "gap-4", label: "Standard spaced (16px)" },
          { value: "gap-6", label: "Spacious breathing (24px)" }
        ]
      },
      { id: "lazyLoading", label: "Enable Adaptive Lazy Image Loading", type: "boolean", colSpan: 1 },
      { id: "infiniteScroll", label: "Enable Seamless Infinite Scroll Feed", type: "boolean", colSpan: 1 },
      { id: "zoomEnabled", label: "Enable Client Double-Click Zoom View", type: "boolean", colSpan: 1 },
      { id: "fullscreenEnabled", label: "Enable Full-Screen Presentation Mode", type: "boolean", colSpan: 1 },
      { id: "slideshowEnabled", label: "Enable Automated Grid Slideshow Playback", type: "boolean", colSpan: 1 },
      { id: "backgroundMusicUrl", label: "Ambient Background Music Track (MP3 URL)", type: "text", colSpan: 1 },
      { id: "musicVolume", label: "Music Playback Default Volume Level (0-100)", type: "number", colSpan: 1 },
      { id: "musicAutoPlay", label: "Automatically Play Audio on Load", type: "boolean", colSpan: 1 },
      { id: "watermarkEnabled", label: "Enable Dynamic Overlay Image Watermark", type: "boolean", colSpan: 1 },
      {
        id: "watermarkPosition",
        label: "Watermark Overlay Position Placement",
        type: "select",
        colSpan: 1,
        options: [
          { value: "center", label: "Centered Tile Overlay (High Security)" },
          { value: "bottom-right", label: "Discreet Bottom Right Corner" },
          { value: "bottom-left", label: "Discreet Bottom Left Corner" }
        ]
      },
      {
        id: "watermarkSize",
        label: "Watermark Aspect Size Scale",
        type: "select",
        colSpan: 1,
        options: [
          { value: "small", label: "Minor Corner Accent (15% Scale)" },
          { value: "medium", label: "Medium Protective Plate (30% Scale)" },
          { value: "large", label: "Absolute Full Plate (50% Scale)" }
        ]
      },
      { id: "watermarkOpacity", label: "Watermark Transparency Level Value (0-100)", type: "number", colSpan: 1 },
      { id: "disableRightClick", label: "Disable Client Right-Click Actions (Anti-Steal)", type: "boolean", colSpan: 1 },
      { id: "disableDownload", label: "Disable Direct Single Download Controls", type: "boolean", colSpan: 1 },
      { id: "disableDrag", label: "Disable Client File Drag-out Actions", type: "boolean", colSpan: 1 },
      { id: "hideExif", label: "Scrub Camera EXIF Properties from Served files", type: "boolean", colSpan: 1 }
    ]
  },
  {
    id: "client_portal",
    name: "Client Portal",
    group: "interaction",
    icon: Smartphone,
    description: "Manage client onboarding, custom instagram buttons, and greetings headers.",
    fields: [
      { id: "welcomeBannerUrl", label: "Custom Client Portal Cover Banner URL", type: "text", colSpan: 1 },
      { id: "welcomeText", label: "Header Title Greeting", type: "text", colSpan: 1 },
      { id: "clientInstructions", label: "Detailed Instructions Help text Box", type: "textarea", colSpan: 2 },
      {
        id: "portalBackground",
        label: "Interactive Area Theme Contrast",
        type: "select",
        colSpan: 1,
        options: [
          { value: "light", label: "Satin White Clean" },
          { value: "dark", label: "Deep Obsidian Black" }
        ]
      },
      {
        id: "portalTheme",
        label: "Aesthetics Style Vibe",
        type: "select",
        colSpan: 1,
        options: [
          { value: "serif", label: "Editorial Editorial (Playfair Display)" },
          { value: "sans", label: "Ultra Minimalist Sans (Inter)" }
        ]
      },
      { id: "portalFooter", label: "Client Area Footer Signature Text", type: "text", colSpan: 1 },
      { id: "showContactBtn", label: "Display Studio Contact Navigation Shortcut", type: "boolean", colSpan: 1 },
      { id: "showWhatsAppBtn", label: "Display Direct Call WhatsApp Anchor", type: "boolean", colSpan: 1 },
      { id: "showInstagramBtn", label: "Display Instagram Profile Badge", type: "boolean", colSpan: 1 },
      { id: "showFacebookBtn", label: "Display Facebook Messenger Trigger", type: "boolean", colSpan: 1 }
    ]
  },
  {
    id: "download",
    name: "Downloads",
    group: "interaction",
    icon: Download,
    description: "Configure batch delivery, metadata options, and ZIP structure.",
    fields: [
      { id: "downloadOriginal", label: "Allow Original File Deliveries (Lossless)", type: "boolean", colSpan: 1 },
      { id: "downloadWatermarked", label: "Deliver Watermarked copies for Downloads", type: "boolean", colSpan: 1 },
      { id: "zipNameFormat", label: "Export ZIP Filename Template Format", type: "text", colSpan: 1, placeholder: "e.g., {album_name}_selected" },
      {
        id: "folderStructure",
        label: "Internal ZIP Dir Composition Style",
        type: "select",
        colSpan: 1,
        options: [
          { value: "flat", label: "Flat Direct Catalog File Stream" },
          { value: "by_category", label: "Segmented by Sub-Category Sub-folders" }
        ]
      },
      { id: "includeExifInZip", label: "Include full EXIF Camera properties in ZIP", type: "boolean", colSpan: 1 },
      { id: "includeMetadataInZip", label: "Include custom user labels inside ZIP package", type: "boolean", colSpan: 1 },
      { id: "includeAlbumInfoInZip", label: "Generate and insert Album_Info.txt in package", type: "boolean", colSpan: 1 }
    ]
  },
  {
    id: "lifecycle",
    name: "Album Lifecycle",
    group: "operations",
    icon: Clock,
    description: "Auto-expire, archive, or purge galleries based on active lifecycle criteria.",
    fields: [
      { id: "expiryDays", label: "Default Active Online Expiration Limit (Days)", type: "number", colSpan: 1 },
      { id: "gracePeriodDays", label: "Offline Restorative Grace Period Margin (Days)", type: "number", colSpan: 1 },
      { id: "archivePeriodDays", label: "Post-grace Archival Period (Days)", type: "number", colSpan: 1 },
      { id: "autoArchive", label: "Auto-Move Expired Albums to Cloud Archive", type: "boolean", colSpan: 1 },
      { id: "autoDelete", label: "Enable Irreversible Auto-Purge from Storage", type: "boolean", colSpan: 1 }
    ]
  },
  {
    id: "storage",
    name: "Storage",
    group: "operations",
    icon: Database,
    description: "Inspect live cloud storage usage details, buckets, and quotas.",
    fields: [
      { id: "storage_custom_indicator", label: "Live Storage Stats Analyzer", type: "custom", colSpan: 2 },
      {
        id: "originalImageStorage",
        label: "Default Cloud Storage Target Bucket",
        type: "select",
        colSpan: 1,
        options: [
          { value: "local", label: "Local Secure Server Storage" },
          { value: "supabase", label: "Supabase S3 Cloud Storage Bucket" }
        ]
      }
    ]
  },
  {
    id: "notifications",
    name: "Notifications",
    group: "operations",
    icon: Bell,
    description: "Activate push alerts, SMS links, or email logs for key events.",
    fields: [
      { id: "emailNotification", label: "Global Server Outbound Email Alerts", type: "boolean", colSpan: 1 },
      { id: "browserNotification", label: "Web Push Browser Client Notifications", type: "boolean", colSpan: 1 },
      { id: "whatsAppNotification", label: "WhatsApp Messaging Integrations Outbound", type: "boolean", colSpan: 1 },
      { id: "notifyUploadFinished", label: "Alert Admin when Uploading Queue completes", type: "boolean", colSpan: 1 },
      { id: "notifySelectionSubmitted", label: "Alert Admin when Client Submits selection list", type: "boolean", colSpan: 1 },
      { id: "notifyAlbumExpiring", label: "Alert Photographer before Album Expiration deadline", type: "boolean", colSpan: 1 },
      { id: "notifyAlbumDeleted", label: "Dispatch notice upon automated system Album delete", type: "boolean", colSpan: 1 }
    ]
  },
  {
    id: "admin_dashboard",
    name: "Admin Dashboard",
    group: "operations",
    icon: Sliders,
    description: "Personalize metrics, widget placement, and administrator layouts.",
    fields: [
      { id: "recentUploadsEnabled", label: "Display Recent Upload Feed Module", type: "boolean", colSpan: 1 },
      { id: "recentSelectionsEnabled", label: "Display Client Selection Alert Ribbon", type: "boolean", colSpan: 1 },
      { id: "recentClientsEnabled", label: "Display Active Client Log Tracker", type: "boolean", colSpan: 1 },
      { id: "quickActionsEnabled", label: "Display Admin Fast Action Panel", type: "boolean", colSpan: 1 },
      { id: "shortcutsEnabled", label: "Display System Hotkey Navigation Guide", type: "boolean", colSpan: 1 }
    ]
  },
  {
    id: "security",
    name: "Security",
    group: "security_metrics",
    icon: Lock,
    description: "Manage credentials, password policies, and security tokens.",
    fields: [
      { id: "password_form_custom", label: "Administrator Passwords", type: "custom", colSpan: 2 },
      { id: "adminEmail", label: "Super Admin Recovery Email Address", type: "text", colSpan: 1 },
      { id: "sessionTimeout", label: "Auto Session Logout Idle Timeout (Minutes)", type: "number", colSpan: 1 },
      { id: "twoFactorEnabled", label: "Activate Outbound 2FA Authorization Checks", type: "boolean", colSpan: 1 },
      { id: "ipRestriction", label: "Whitelisted Developer Connection IPs (CSV format)", type: "text", colSpan: 1, placeholder: "e.g., 192.168.1.1, 12.34.56.78" },
      { id: "security_login_logs", label: "Access Audit Log", type: "custom", colSpan: 2 }
    ]
  },
  {
    id: "analytics",
    name: "Analytics",
    group: "security_metrics",
    icon: BarChart3,
    description: "Review detailed performance history, visitor charts, and QR download totals.",
    fields: [
      { id: "analytics_custom_dashboard", label: "Live Studio Metrics Engine", type: "custom", colSpan: 2 }
    ]
  },
  {
    id: "backup",
    name: "Backup Settings",
    group: "security_metrics",
    icon: RefreshCw,
    description: "Export, restore, or schedule automatic local database archives.",
    fields: [
      { id: "backup_custom_management", label: "Archive Systems Manager", type: "custom", colSpan: 2 },
      {
        id: "backupSchedule",
        label: "Scheduled Backup Frequency",
        type: "select",
        colSpan: 1,
        options: [
          { value: "daily", label: "Daily System Image Backup" },
          { value: "weekly", label: "Weekly Standard Backup" },
          { value: "monthly", label: "Monthly CURATED Backup" },
          { value: "none", label: "No Automation Backups (Manual Only)" }
        ]
      }
    ]
  },
  {
    id: "advanced",
    name: "Advanced CSS & API",
    group: "security_metrics",
    icon: Cpu,
    description: "Inject third-party tracking pixels, configure custom domains, and override custom CSS.",
    fields: [
      { id: "customDomain", label: "Assigned Custom Fully Qualified Domain Name (FQDN)", type: "text", colSpan: 1, placeholder: "e.g., gallery.yourbrand.com" },
      { id: "sslStatus", label: "SSL Certification Connection Status", type: "text", colSpan: 1 },
      { id: "googleAnalyticsId", label: "Google Analytics Tracking Stream ID (G-XXXXXX)", type: "text", colSpan: 1 },
      { id: "facebookPixelId", label: "Facebook Pixel SDK Stream Key Value", type: "text", colSpan: 1 },
      { id: "smtpHost", label: "Outbound SMTP Dispatch Server Host", type: "text", colSpan: 1 },
      { id: "smtpPort", label: "SMTP Communication Connection Port", type: "text", colSpan: 1 },
      { id: "smtpUser", label: "SMTP User Authorization Username", type: "text", colSpan: 1 },
      { id: "seoKeywords", label: "Dynamic HTML Head Meta Keywords Override", type: "text", colSpan: 1 },
      { id: "seoDescription", label: "Dynamic HTML Head Meta Description text", type: "textarea", colSpan: 2 },
      { id: "metaTags", label: "Generic Injection Raw HTML Head Meta Tags", type: "textarea", colSpan: 2 },
      { id: "customCss", label: "Injected Override Global Studio Stylesheet CSS", type: "textarea", colSpan: 2 },
      { id: "customJs", label: "Injected Post-DOMContentLoaded Scripts JS Block", type: "textarea", colSpan: 2 }
    ]
  },
  {
    id: "wedding_collections",
    name: "Wedding Collections",
    group: "operations",
    icon: Package,
    description: "Configure wedding photography collection packages, pricing tiers, and deliverables.",
    fields: [
      { id: "weddingCollectionDefault", label: "Primary Default Collection Package", type: "text", colSpan: 1, placeholder: "e.g. Royal Heritage Collection" },
      { id: "collectionPackage1", label: "Collection Tier 1 (Title & Price)", type: "text", colSpan: 1, placeholder: "Royal Heritage Collection - $2,500" },
      { id: "collectionPackage1Details", label: "Collection Tier 1 Deliverables & Features", type: "textarea", colSpan: 2, placeholder: "Full-day coverage, 2 photographers, heirloom album..." },
      { id: "collectionPackage2", label: "Collection Tier 2 (Title & Price)", type: "text", colSpan: 1, placeholder: "Cinematic Elegance Collection - $3,800" },
      { id: "collectionPackage2Details", label: "Collection Tier 2 Deliverables & Features", type: "textarea", colSpan: 2, placeholder: "10 hours, drone footage, 4K video highlights..." },
      { id: "collectionPackage3", label: "Collection Tier 3 (Title & Price)", type: "text", colSpan: 1, placeholder: "Luxury Wedding Legacy - $5,500" },
      { id: "collectionPackage3Details", label: "Collection Tier 3 Deliverables & Features", type: "textarea", colSpan: 2, placeholder: "Multi-day events, pre-wedding shoot, custom box..." }
    ]
  },
  {
    id: "invoice_payment",
    name: "Invoice & Payment",
    group: "operations",
    icon: CreditCard,
    description: "Manage invoice billing details, tax percentages, bank accounts, and UPI/PayPal details.",
    fields: [
      {
        id: "currency",
        label: "Primary Currency",
        type: "select",
        colSpan: 1,
        options: [
          { value: "USD", label: "USD ($)" },
          { value: "INR", label: "INR (₹)" },
          { value: "EUR", label: "EUR (€)" },
          { value: "GBP", label: "GBP (£)" },
          { value: "CAD", label: "CAD ($)" }
        ]
      },
      { id: "taxRate", label: "Tax / GST Rate Percentage (%)", type: "number", colSpan: 1, placeholder: "18" },
      { id: "bankName", label: "Bank Name", type: "text", colSpan: 1, placeholder: "e.g., Chase Bank / HDFC Bank" },
      { id: "accountName", label: "Account Holder Name", type: "text", colSpan: 1, placeholder: "Studio Account Name" },
      { id: "accountNumber", label: "Account Number / IBAN", type: "text", colSpan: 1, placeholder: "1234567890" },
      { id: "ifscCode", label: "IFSC Code / Swift / Routing Number", type: "text", colSpan: 1, placeholder: "SWIFT / IFSC Code" },
      { id: "upiId", label: "UPI ID / PayPal Email / Zelle Tag", type: "text", colSpan: 1, placeholder: "studio@upi / paypal.me/studio" },
      { id: "paymentTerms", label: "Invoice Payment Terms & Conditions", type: "textarea", colSpan: 2, placeholder: "50% retainer due upon booking. Remaining balance due 7 days prior..." },
      { id: "invoiceFooter", label: "Invoice Footer Note", type: "textarea", colSpan: 2, placeholder: "Thank you for choosing our studio for your wedding memories." }
    ]
  },
  {
    id: "future_ai",
    name: "Future AI Suite",
    group: "security_metrics",
    icon: Brain,
    description: "Configure modern AI photo operations, face recognition, and closed eye search.",
    fields: [
      { id: "aiFaceRecognition", label: "Enable Neural Face Recognition (AI Cataloging)", type: "boolean", colSpan: 1 },
      { id: "aiDuplicateDetection", label: "Enable AI Semantic Content Similarity Check", type: "boolean", colSpan: 1 },
      { id: "aiBlurDetection", label: "Enable Automated Blur Quality Scoring Block", type: "boolean", colSpan: 1 },
      { id: "aiClosedEyeDetection", label: "Enable Closed-Eye Portrait Warning Filter", type: "boolean", colSpan: 1 },
      { id: "aiSmileDetection", label: "Enable Positive Smile Sentiment Rating Score", type: "boolean", colSpan: 1 },
      { id: "aiPersonSearch", label: "Enable Multi-person Search Client Cataloging", type: "boolean", colSpan: 1 }
    ]
  }
];
