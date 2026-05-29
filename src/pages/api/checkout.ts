import type { APIRoute } from "astro";
import { getWorkshop } from "../../data/workshops";
import { getServerEnv } from "../../lib/env";
import { getStripe } from "../../lib/stripe";

// Server-rendered on demand (needs the Stripe secret key).
export const prerender = false;

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});

export const POST: APIRoute = async (context) => {
	let slug: string | undefined;
	try {
		const payload = (await context.request.json()) as { slug?: string };
		slug = payload.slug;
	} catch {
		return json({ error: "Body inválido" }, 400);
	}

	if (!slug) return json({ error: "Falta el slug del workshop" }, 400);

	const workshop = getWorkshop(slug);
	if (!workshop) return json({ error: "Workshop no encontrado" }, 404);

	if (workshop.esGratis) {
		return json({ error: "Este workshop es gratuito" }, 400);
	}
	if (!workshop.stripePriceId) {
		return json(
			{ error: "El workshop no tiene Price ID de Stripe configurado" },
			400,
		);
	}

	const env = getServerEnv(context);
	if (!env.STRIPE_SECRET_KEY) {
		return json({ error: "Stripe no está configurado" }, 500);
	}

	try {
		const stripe = getStripe(env.STRIPE_SECRET_KEY);
		const session = await stripe.checkout.sessions.create({
			mode: "payment",
			line_items: [{ price: workshop.stripePriceId, quantity: 1 }],
			success_url: `${env.PUBLIC_SITE_URL}/workshops/gracias?slug=${workshop.slug}`,
			cancel_url: `${env.PUBLIC_SITE_URL}/workshops/pago-cancelado?slug=${workshop.slug}`,
			metadata: { slug: workshop.slug, titulo: workshop.titulo },
		});

		if (!session.url) return json({ error: "Stripe no devolvió URL" }, 502);
		return json({ url: session.url });
	} catch (err) {
		console.error("[checkout] error creando sesión:", err);
		return json({ error: "No se pudo iniciar el pago" }, 500);
	}
};
