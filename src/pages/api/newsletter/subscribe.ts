export const prerender = false;

import { render } from "@react-email/components";
import type { APIRoute } from "astro";
import { Resend } from "resend";
import { NewsletterConfirm } from "../../../emails/NewsletterConfirm";
import { EMAIL_RE } from "../../../lib/constants.ts";
import { getServerEnv } from "../../../lib/env";
import {
	NEWSLETTER_TABLE as TABLE,
	generateToken,
} from "../../../lib/newsletter";
import { getSupabaseAdmin } from "../../../lib/supabase";

export const POST: APIRoute = async (context) => {
	const env = getServerEnv(context);

	let body: unknown;
	try {
		body = await context.request.json();
	} catch {
		return json({ error: "Cuerpo inválido" }, 400);
	}

	const { email, hp } = body as Record<string, unknown>;

	// Honeypot: si el campo trampa viene lleno, es un bot. Respondemos ok falso.
	if (typeof hp === "string" && hp.trim() !== "") {
		return json({ ok: true }, 200);
	}

	if (typeof email !== "string" || !EMAIL_RE.test(email)) {
		return json({ error: "Email inválido" }, 400);
	}

	if (
		!env.SUPABASE_URL ||
		!env.SUPABASE_SERVICE_ROLE_KEY ||
		!env.RESEND_API_KEY
	) {
		return json({ error: "Servicio no disponible" }, 503);
	}

	const cleanEmail = email.toLowerCase().trim();
	const supabase = getSupabaseAdmin(
		env.SUPABASE_URL,
		env.SUPABASE_SERVICE_ROLE_KEY,
	);

	// ¿Ya existe?
	const { data: existing } = await supabase
		.from(TABLE)
		.select("status")
		.eq("email", cleanEmail)
		.maybeSingle();

	if (existing?.status === "confirmed") {
		// Ya está suscripta y confirmada: no reenviamos.
		return json({ ok: true }, 200);
	}

	// Nuevo / pending / unsubscribed → (re)generar token y poner pending.
	const token = generateToken();
	const { error: upsertError } = await supabase.from(TABLE).upsert(
		{
			email: cleanEmail,
			status: "pending",
			token,
			confirmed_at: null,
		},
		{ onConflict: "email" },
	);

	if (upsertError) {
		console.error("newsletter upsert error", upsertError);
		return json({ error: "No se pudo procesar. Intentá de nuevo." }, 500);
	}

	// Enviar email de confirmación.
	const confirmUrl = new URL(
		`/api/newsletter/confirm?token=${token}`,
		env.PUBLIC_SITE_URL,
	).href;

	try {
		const resend = new Resend(env.RESEND_API_KEY);
		const html = await render(NewsletterConfirm({ confirmUrl }));
		await resend.emails.send({
			from: env.RESEND_FROM_EMAIL,
			to: cleanEmail,
			subject: "Confirmá tu suscripción · Mermelada Tech",
			html,
		});
	} catch (err) {
		console.error("newsletter confirm email error", err);
		return json({ error: "No se pudo enviar el mail de confirmación." }, 502);
	}

	return json({ ok: true }, 200);
};

function json(data: unknown, status: number) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}
