import { defineConfig } from "astro/config";

import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
	// Static by default; API routes opt into SSR via `export const prerender = false`.
	output: "static",
	adapter: cloudflare({
		platformProxy: { enabled: true },
		// We only use static <img> from /public; optimize at build, not runtime
		// (Cloudflare Workers don't support sharp at runtime).
		imageService: "compile",
	}),
	integrations: [react()],

	vite: {
		plugins: [tailwindcss()],
	},
});
