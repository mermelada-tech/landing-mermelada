import type { APIRoute } from "astro";
import type Stripe from "stripe";
import { getServerEnv } from "../../lib/env";
import { getStripe } from "../../lib/stripe";

// Server-rendered on demand (verifies Stripe signatures).
export const prerender = false;

export const POST: APIRoute = async (context) => {
	const env = getServerEnv(context);
	const signature = context.request.headers.get("stripe-signature");

	if (!signature) {
		return new Response("Falta la firma de Stripe", { status: 400 });
	}
	if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
		return new Response("Stripe no está configurado", { status: 500 });
	}

	const stripe = getStripe(env.STRIPE_SECRET_KEY);
	const payload = await context.request.text();

	let event: Stripe.Event;
	try {
		// constructEventAsync: SubtleCrypto (Workers) verification is async.
		event = await stripe.webhooks.constructEventAsync(
			payload,
			signature,
			env.STRIPE_WEBHOOK_SECRET,
		);
	} catch (err) {
		console.error("[webhook] firma inválida:", err);
		return new Response("Firma inválida", { status: 400 });
	}

	switch (event.type) {
		case "checkout.session.completed": {
			const session = event.data.object as Stripe.Checkout.Session;
			console.log("[webhook] compra completada", {
				slug: session.metadata?.slug,
				titulo: session.metadata?.titulo,
				email: session.customer_details?.email,
				amount: session.amount_total,
				currency: session.currency,
			});
			// TODO: registrar la inscripción (DB) y enviar el mail de confirmación
			// con los datos de acceso al workshop.
			break;
		}
		default:
			// Ignoramos el resto de eventos por ahora.
			break;
	}

	return new Response(JSON.stringify({ received: true }), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
};
