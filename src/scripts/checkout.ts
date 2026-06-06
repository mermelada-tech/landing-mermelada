// Lógica de checkout Stripe: se ejecuta en el cliente. Se importa con
// `import "../scripts/checkout.ts"` dentro de un <script> de Astro.
// Engancha cualquier botón con la clase `.js-checkout` y `data-slug`.
export function initCheckout(): void {
	const buttons = document.querySelectorAll<HTMLButtonElement>(".js-checkout");
	buttons.forEach((btn) => {
		btn.addEventListener("click", async () => {
			const slug = btn.dataset.slug;
			if (!slug) return;
			const original = btn.textContent;
			btn.disabled = true;
			btn.textContent = "Redirigiendo…";
			try {
				const res = await fetch("/api/checkout", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ slug }),
				});
				const data = (await res.json()) as { url?: string; error?: string };
				if (data.url) {
					window.location.href = data.url;
					return;
				}
				throw new Error(data.error ?? "No se pudo iniciar el pago");
			} catch (err) {
				console.error(err);
				alert("Ups, no pudimos abrir el pago. Probá de nuevo en un momento.");
				btn.disabled = false;
				btn.textContent = original;
			}
		});
	});
}
