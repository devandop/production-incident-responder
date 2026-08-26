/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_TRUEFORGE_ORIGIN: string;
    readonly VITE_AGENT_NAME: string;
    readonly VITE_STORE_URL: string;
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
  