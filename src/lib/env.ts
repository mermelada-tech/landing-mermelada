import type { APIContext } from "astro";

/**
 * Server-side secrets.
 *
 * On Cloudflare Workers, secrets are NOT available via `import.meta.env` at
 * runtime — they live on the request runtime context
 * (`Astro.locals.runtime.env`). During `astro dev` they come from `.env`
 * through `import.meta.env`. This helper reads from the runtime context first
 * and falls back to `import.meta.env` so both environments work.
 */
export interface ServerEnv {
	STRIPE_SECRET_KEY: string;
	STRIPE_WEBHOOK_SECRET: string;
	PUBLIC_SITE_URL: string;
	SUPABASE_URL: string;
	SUPABASE_SERVICE_ROLE_KEY: string;
	RESEND_API_KEY: string;
	RESEND_FROM_EMAIL: string;
	BLAST_SECRET: string;
}

type RuntimeEnv = Partial<Record<keyof ServerEnv, string>>;

export function getServerEnv(context: APIContext): ServerEnv {
	const runtimeEnv =
		(context.locals as { runtime?: { env?: RuntimeEnv } }).runtime?.env ?? {};

	const read = (key: keyof ServerEnv): string =>
		runtimeEnv[key] ?? (import.meta.env[key] as string | undefined) ?? "";

	return {
		STRIPE_SECRET_KEY: read("STRIPE_SECRET_KEY"),
		STRIPE_WEBHOOK_SECRET: read("STRIPE_WEBHOOK_SECRET"),
		PUBLIC_SITE_URL: read("PUBLIC_SITE_URL") || context.url.origin,
		SUPABASE_URL: read("SUPABASE_URL"),
		SUPABASE_SERVICE_ROLE_KEY: read("SUPABASE_SERVICE_ROLE_KEY"),
		RESEND_API_KEY: read("RESEND_API_KEY"),
		RESEND_FROM_EMAIL:
			read("RESEND_FROM_EMAIL") ||
			"Nai de Mermelada Tech <nai@mermeladatech.com>",
		BLAST_SECRET: read("BLAST_SECRET"),
	};
}
