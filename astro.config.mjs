import { defineConfig } from "astro/config";

import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

const SITE = process.env.PUBLIC_SITE_URL || "https://mermeladatech.com";

// Rutas que NO deben aparecer en el sitemap ni indexarse.
const NOINDEX_PATHS = [
	"/workshops/gracias",
	"/workshops/pago-cancelado",
	"/newsletter/confirmado",
];

// https://astro.build/config
export default defineConfig({
	site: SITE,
	// Static by default; API routes opt into SSR via `export const prerender = false`.
	output: "static",
	adapter: cloudflare({
		platformProxy: { enabled: true },
		// We only use static <img> from /public; optimize at build, not runtime
		// (Cloudflare Workers don't support sharp at runtime).
		imageService: "compile",
	}),
	integrations: [
		react(),
		sitemap({
			filter: (page) =>
				!NOINDEX_PATHS.some((p) => new URL(page).pathname.replace(/\/$/, "") === p),
		}),
	],

	vite: {
		plugins: [tailwindcss()],
	},
});
