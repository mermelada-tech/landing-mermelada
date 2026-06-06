export const prerender = false;

import { render } from "@react-email/components";
import type { APIRoute } from "astro";
import { Resend } from "resend";
import { workshops } from "../../../data/workshops";
import { WaitlistBlast } from "../../../emails/WaitlistBlast";
import { getServerEnv } from "../../../lib/env";
import { getSupabaseAdmin } from "../../../lib/supabase";

export const POST: APIRoute = async (context) => {
	const env = getServerEnv(context);

	let body: unknown;
	try {
		body = await context.request.json();
	} catch {
		return json({ error: "Cuerpo inválido" }, 400);
	}

	const { secret, slug, bridge_url } = body as Record<string, unknown>;

	if (!env.BLAST_SECRET || secret !== env.BLAST_SECRET) {
		return json({ error: "No autorizado" }, 401);
	}

	if (
		typeof slug !== "string" ||
		typeof bridge_url !== "string" ||
		!bridge_url.startsWith("https://")
	) {
		return json({ error: "slug y bridge_url (https) requeridos" }, 400);
	}

	const workshop = workshops.find((w) => w.slug === slug);
	if (!workshop) {
		return json({ error: "Workshop desconocido" }, 400);
	}

	const supabase = getSupabaseAdmin(
		env.SUPABASE_URL,
		env.SUPABASE_SERVICE_ROLE_KEY,
	);
	const { data: rows, error: dbError } = await supabase
		.from("waitlist")
		.select("email")
		.eq("workshop_slug", slug);

	if (dbError) {
		console.error("blast db error", dbError);
		return json({ error: "No se pudo leer la lista" }, 500);
	}

	if (!rows?.length) {
		return json({ ok: true, sent: 0, message: "Lista vacía" }, 200);
	}

	const resend = new Resend(env.RESEND_API_KEY);
	const emails = rows.map((r: { email: string }) => r.email);

	const html = await render(
		WaitlistBlast({ titulo: workshop.titulo, bridgeUrl: bridge_url }),
	);

	// Resend free plan: max 100 per batch. Chunk if needed.
	const CHUNK = 100;
	let sent = 0;
	for (let i = 0; i < emails.length; i += CHUNK) {
		const chunk = emails.slice(i, i + CHUNK);
		const { error: sendError } = await resend.batch.send(
			chunk.map((to) => ({
				from: env.RESEND_FROM_EMAIL,
				to,
				subject: `¡El workshop "${workshop.titulo}" está confirmado!`,
				html,
			})),
		);
		if (sendError) {
			console.error("blast send error", sendError);
			return json({ error: "Error al enviar emails", sent }, 500);
		}
		sent += chunk.length;
	}

	return json({ ok: true, sent }, 200);
};

function json(data: unknown, status: number) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}
