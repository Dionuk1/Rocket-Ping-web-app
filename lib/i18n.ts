export const SUPPORTED_LANGUAGES = ["en", "sq"] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const languageLabel: Record<AppLanguage, string> = {
  en: "English",
  sq: "Shqip",
};

type TranslationMap = {
  navHome: string;
  navDevices: string;
  navActivity: string;
  navTopology: string;
  navSpeed: string;
  navTerminal: string;
  navSettings: string;
  navigation: string;
  homeTitle: string;
  dashboardTitle: string;
  refresh: string;
  wifiTrustScore: string;
  generateReport: string;
  live: string;
  offlineFallback: string;
  loadingNetworkDetails: string;
  lastUpdated: string;
  settingsTitle: string;
  monitoring: string;
  appearance: string;
  language: string;
  theme: string;
  darkMode: string;
  lightMode: string;
  about: string;
  scanInterval: string;
  notifications: string;
};

export const translations: Record<AppLanguage, TranslationMap> = {
  en: {
    navHome: "Home",
    navDevices: "Devices",
    navActivity: "Activity",
    navTopology: "Topology",
    navSpeed: "Speed",
    navTerminal: "Terminal",
    navSettings: "Settings",
    navigation: "Navigation",
    homeTitle: "NetPulse",
    dashboardTitle: "Network Dashboard",
    refresh: "Refresh",
    wifiTrustScore: "Wi-Fi Trust Score",
    generateReport: "Generate Report",
    live: "Live",
    offlineFallback: "Offline fallback",
    loadingNetworkDetails: "Loading live network details...",
    lastUpdated: "Last updated",
    settingsTitle: "Settings",
    monitoring: "Monitoring",
    appearance: "Appearance",
    language: "Language",
    theme: "Theme",
    darkMode: "Dark mode",
    lightMode: "Light mode",
    about: "About",
    scanInterval: "Scan Interval",
    notifications: "Notifications",
  },
  sq: {
    navHome: "Kreu",
    navDevices: "Pajisjet",
    navActivity: "Aktiviteti",
    navTopology: "Topologjia",
    navSpeed: "Shpejtësia",
    navTerminal: "Terminali",
    navSettings: "Cilësimet",
    navigation: "Navigimi",
    homeTitle: "NetPulse",
    dashboardTitle: "Paneli i Rrjetit",
    refresh: "Rifresko",
    wifiTrustScore: "Vlerësimi i Besimit Wi-Fi",
    generateReport: "Gjenero Raportin",
    live: "Në kohë reale",
    offlineFallback: "Modalitet fallback",
    loadingNetworkDetails: "Po ngarkohet informacioni i rrjetit...",
    lastUpdated: "Përditësuar para",
    settingsTitle: "Cilësimet",
    monitoring: "Monitorimi",
    appearance: "Pamja",
    language: "Gjuha",
    theme: "Tema",
    darkMode: "Tema e errët",
    lightMode: "Tema e çelët",
    about: "Rreth aplikacionit",
    scanInterval: "Intervali i Skanimit",
    notifications: "Njoftimet",
  },
};
