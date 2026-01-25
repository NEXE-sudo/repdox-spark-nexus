/// <reference types="vite/client" />

// Add strongly-typed environment variables used in this project.
// This prevents unsafe `any` usage when accessing `import.meta.env`.
interface ImportMetaEnv {
	readonly VITE_SUPABASE_URL: string;
	readonly VITE_SUPABASE_ANON_KEY: string;
	// Optional: URL to a deployed Supabase Edge Function which can create signed URLs
	// for private storage objects using the service role key.
	readonly VITE_SUPABASE_FUNCTIONS_URL?: string;
	// add other VITE_... keys here as needed
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
