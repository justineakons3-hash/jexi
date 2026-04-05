import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.jexi.app",
  appName: "jexi",
  webDir: "../backend/public",
  server: {
    allowNavigation: ["jexi.onrender.com"],
    
  },
  
};

export default config;
