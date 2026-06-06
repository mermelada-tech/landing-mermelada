import type { Resend } from "resend";

/** Tabla de Supabase para suscriptoras del newsletter (doble opt-in). */
export const NEWSLETTER_TABLE = "newsletter_subscribers";

/** Token de confirmación opaco para el doble opt-in. */
export function generateToken(): string {
	return crypto.randomUUID();
}

/**
 * Agrega (o reactiva) un contacto en el Audience de Resend Broadcasts.
 * Tolerante a "ya existe": Resend no falla duro, pero envolvemos por las dudas.
 */
export async function addContactToAudience(
	resend: Resend,
	audienceId: string,
	email: string,
): Promise<void> {
	try {
		await resend.contacts.create({
			email,
			audienceId,
			unsubscribed: false,
		});
	} catch (err) {
		// Si ya existía, no es un error fatal para el flujo de confirmación.
		console.error("resend contacts.create error", err);
	}
}
