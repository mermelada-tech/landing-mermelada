export const prerender = false;

import type { APIRoute } from "astro";
import { Resend } from "resend";
import { getServerEnv } from "../../../lib/env";
import { addContactToAudience } from "../../../lib/newsletter";
import { getSupabaseAdmin } from "../../../lib/supabase";

const TABLE = "newsletter_subscribers";

export const GET: APIRoute = async (context) => {
	const env = getServerEnv(context);
	const token = context.url.searchParams.get("token");

	const dest = (error?: string) =>
		new URL(
			`/newsletter/confirmado${error ? `?error=${error}` : ""}`,
			env.PUBLIC_SITE_URL,
		).href;

	if (!token) return context.redirect(dest("token"), 302);

	if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
		return context.redirect(dest("server"), 302);
	}

	const supabase = getSupabaseAdmin(
		env.SUPABASE_URL,
		env.SUPABASE_SERVICE_ROLE_KEY,
	);

	const { data: row } = await supabase
		.from(TABLE)
		.select("email,status")
		.eq("token", token)
		.maybeSingle();

	if (!row) return context.redirect(dest("token"), 302);

	// Marcar confirmado (idempotente) y limpiar el token.
	const { error: updErr } = await supabase
		.from(TABLE)
		.update({
			status: "confirmed",
			confirmed_at: new Date().toISOString(),
			token: null,
		})
		.eq("token", token);

	if (updErr) {
		console.error("newsletter confirm update error", updErr);
		return context.redirect(dest("server"), 302);
	}

	// Alta en el Audience de Resend (best-effort).
	if (env.RESEND_API_KEY && env.RESEND_AUDIENCE_ID) {
		const resend = new Resend(env.RESEND_API_KEY);
		await addContactToAudience(resend, env.RESEND_AUDIENCE_ID, row.email);
	}

	return context.redirect(dest(), 302);
};
