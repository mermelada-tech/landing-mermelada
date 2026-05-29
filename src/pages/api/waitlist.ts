export const prerender = false;

import type { APIRoute } from "astro";
import { getServerEnv } from "../../lib/env";
import { getSupabaseAdmin } from "../../lib/supabase";
import { workshops } from "../../data/workshops";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST: APIRoute = async (context) => {
	const env = getServerEnv(context);

	let body: unknown;
	try {
		body = await context.request.json();
	} catch {
		return json({ error: "Cuerpo inválido" }, 400);
	}

	const { email, slug } = body as Record<string, unknown>;

	if (typeof email !== "string" || !EMAIL_RE.test(email)) {
		return json({ error: "Email inválido" }, 400);
	}
	if (typeof slug !== "string" || !workshops.find((w) => w.slug === slug)) {
		return json({ error: "Workshop desconocido" }, 400);
	}

	if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
		return json({ error: "Servicio no disponible" }, 503);
	}

	const supabase = getSupabaseAdmin(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
	const { error } = await supabase
		.from("waitlist")
		.insert({ email: email.toLowerCase().trim(), workshop_slug: slug });

	if (error) {
		// Unique constraint violation → email ya registrado, no es un error real.
		if (error.code === "23505") {
			return json({ ok: true, alreadyRegistered: true }, 200);
		}
		console.error("waitlist insert error", error);
		return json({ error: "No se pudo guardar. Intentá de nuevo." }, 500);
	}

	return json({ ok: true }, 201);
};

function json(data: unknown, status: number) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}
