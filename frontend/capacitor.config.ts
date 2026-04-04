import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.jexi.app",
  appName: "jexi",
  webDir: "../backend/public", // ← change this line
  server: {
    allowNavigation: ["*.onrender.com"],
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
