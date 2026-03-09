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
    navSpeed: "Speed",
    navTerminal: "Terminal",
    navSettings: "Settings",
    navigation: "Navigation",
    homeTitle: "RocketPing",
    dashboardTitle: "Network Dashboard",
    refresh: "Refresh",
    wifiTrustScore: "Wi-Fi Trust Score",
    generateReport: "Generate Report",
    live: "Live",
    offlineFallback: "Offline mode",
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
    scanInterval: "Scan interval",
    notifications: "Notifications",
  },
  sq: {
    navHome: "Ballina",
    navDevices: "Pajisjet",
    navActivity: "Aktiviteti",
    navSpeed: "Shpejtësia",
    navTerminal: "Terminali",
    navSettings: "Cilësimet",
    navigation: "Navigimi",
    homeTitle: "RocketPing",
    dashboardTitle: "Paneli i Rrjetit",
    refresh: "Rifresko",
    wifiTrustScore: "Vlerësimi i Besueshmërisë së Wi-Fi",
    generateReport: "Gjenero Raportin",
    live: "Në kohë reale",
    offlineFallback: "Modaliteti jashtë linje",
    loadingNetworkDetails: "Po ngarkohen të dhënat e rrjetit në kohë reale...",
    lastUpdated: "Përditësuar para",
    settingsTitle: "Cilësimet",
    monitoring: "Monitorimi",
    appearance: "Pamja",
    language: "Gjuha",
    theme: "Tema",
    darkMode: "Pamja e errët",
    lightMode: "Pamja e çelët",
    about: "Rreth aplikacionit",
    scanInterval: "Intervali i skanimit",
    notifications: "Njoftimet",
  },
};
