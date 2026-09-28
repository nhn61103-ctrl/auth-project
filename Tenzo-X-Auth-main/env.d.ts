
interface ImportMetaEnv {
  readonly VITE_TURNSTILE_SITE_KEY: string;
  readonly VITE_CLIENT_DB_SECRET: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
