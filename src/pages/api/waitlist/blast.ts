export const prerender = false;

import type { APIRoute } from "astro";
import { Resend } from "resend";
import { getServerEnv } from "../../../lib/env";
import { getSupabaseAdmin } from "../../../lib/supabase";
import { workshops } from "../../../data/workshops";

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

	if (typeof slug !== "string" || typeof bridge_url !== "string" || !bridge_url.startsWith("https://")) {
		return json({ error: "slug y bridge_url (https) requeridos" }, 400);
	}

	const workshop = workshops.find((w) => w.slug === slug);
	if (!workshop) {
		return json({ error: "Workshop desconocido" }, 400);
	}

	const supabase = getSupabaseAdmin(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
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

	const html = buildEmail(workshop.titulo, bridge_url);

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

function buildEmail(titulo: string, bridgeUrl: string): string {
	return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#E6F2F7;font-family:Inter,Arial,sans-serif;color:#1B1B1B;">
  <div style="max-width:580px;margin:40px auto;background:#fff;border:1.5px solid #1B1B1B;border-radius:8px;padding:40px;box-shadow:4px 4px 0 0 #1B1B1B;">
    <p style="margin:0 0 24px;font-size:28px;">🍓</p>
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">¡El workshop está confirmado!</h1>
    <p style="margin:0 0 12px;line-height:1.6;">Hola,</p>
    <p style="margin:0 0 12px;line-height:1.6;">
      Te escribo porque te anotaste en la lista de espera del workshop
      <strong>"${titulo}"</strong>.
    </p>
    <p style="margin:0 0 24px;line-height:1.6;">
      ¡Buenas noticias! El workshop ya está confirmado. Podés anotarte desde
      la página de The Bridge:
    </p>
    <a href="${bridgeUrl}"
       style="display:inline-block;background:#F5C43E;color:#1B1B1B;font-weight:700;text-decoration:none;padding:14px 28px;border:1.5px solid #1B1B1B;border-radius:4px;box-shadow:3px 3px 0 0 #1B1B1B;font-size:15px;">
      Anotarme al workshop →
    </a>
    <p style="margin:32px 0 0;font-size:13px;color:#666;border-top:1px solid #e5e5e5;padding-top:20px;line-height:1.6;">
      Mermelada Tech · <a href="https://mermelada.tech" style="color:#673773;">mermelada.tech</a><br>
      Te mandé este mail porque te suscribiste a la lista de espera.
    </p>
  </div>
</body>
</html>`;
}

function json(data: unknown, status: number) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}
