import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.jexi.app",
  appName: "Jexi",
  webDir: "../backend/public",
  server: {
    allowNavigation: ["jexi.onrender.com"],
    
  },
  
};

export default config;
