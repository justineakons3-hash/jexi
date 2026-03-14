declare module "*.gif" {
  const src: string;
  export default src;
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_URL: string;
  // Add other VITE_* vars here if needed (e.g., VITE_GEMINI_API_KEY)
  readonly VITE_GEMINI_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}