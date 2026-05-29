import Stripe from "stripe";

/**
 * Build a Stripe client.
 *
 * The secret key is passed in (read from the server runtime env — see
 * `lib/env.ts`) and NEVER imported into client code. On Cloudflare Workers the
 * Node `http`/`https` modules aren't available, so we use Stripe's fetch-based
 * HTTP client, which runs on the Workers `fetch` API.
 */
export function getStripe(secretKey: string): Stripe {
	return new Stripe(secretKey, {
		apiVersion: "2025-02-24.acacia",
		httpClient: Stripe.createFetchHttpClient(),
	});
}
