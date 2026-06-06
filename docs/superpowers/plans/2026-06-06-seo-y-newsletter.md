# SEO y Newsletter — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar SEO completo (meta tags, sitemap, robots, datos estructurados, favicon set, páginas por workshop) y un newsletter con doble opt-in (Resend Broadcasts + Supabase) a la landing de Mermelada Tech.

**Architecture:** Astro `static` con SSR por ruta (`prerender = false`). El SEO se centraliza en `Layout.astro` (props por página) + builders puros en `src/lib/seo.ts`; las páginas de workshop son rutas dinámicas generadas con `getStaticPaths`. El newsletter usa Supabase para el flujo de doble opt-in (tabla `newsletter_subscribers`) y Resend para confirmación + Audience de Broadcasts.

**Tech Stack:** Astro 5, Tailwind CSS 4, TypeScript strict, Cloudflare Workers adapter, React (islas), Resend, Supabase, `@astrojs/sitemap`.

> **Nota sobre testing:** Este repo **no tiene framework de tests** (ver CLAUDE.md → "No Testing Framework"). La verificación de cada tarea es: `npm run build` (corre `astro check` = type-check), `npm run lint:fix` (Biome) e inspección visual en `npm run dev` (localhost:4321). No se escriben tests unitarios. Los pasos de verificación reflejan esto.

> **Spec de referencia:** [docs/superpowers/specs/2026-06-06-seo-y-newsletter-design.md](../specs/2026-06-06-seo-y-newsletter-design.md)

---

## File Structure

**FASE A — SEO**

| Archivo | Responsabilidad | Acción |
|---------|-----------------|--------|
| `astro.config.mjs` | `site` + integración sitemap | Modify |
| `src/lib/seo.ts` | Builders de JSON-LD + constantes del sitio | Create |
| `src/layouts/Layout.astro` | `<head>` SEO (canonical, OG, Twitter, favicon, JSON-LD) | Modify |
| `src/data/workshops.ts` | Campo `fechaISO?` para `Event` schema | Modify |
| `src/components/WorkshopCard.astro` | Tarjeta de workshop (markup CTA por estado) | Create (refactor) |
| `src/components/WaitlistModal.astro` | Modal de waitlist + su `<script>` | Create (refactor) |
| `src/scripts/checkout.ts` | Lógica de checkout Stripe (reutilizable) | Create (refactor) |
| `src/components/Workshops.astro` | Usa WorkshopCard + linkea a detalle | Modify |
| `src/pages/workshops/[slug].astro` | Página de detalle por workshop + Event schema | Create |
| `src/pages/workshops/gracias.astro` | `noindex` | Modify |
| `src/pages/workshops/pago-cancelado.astro` | `noindex` | Modify |
| `public/robots.txt` | Directivas de crawler + sitemap | Create |

**FASE B — Newsletter**

| Archivo | Responsabilidad | Acción |
|---------|-----------------|--------|
| `src/lib/env.ts` | `RESEND_AUDIENCE_ID` | Modify |
| `src/lib/newsletter.ts` | Token + alta de contacto en Audience | Create |
| `src/emails/NewsletterConfirm.tsx` | Email de confirmación (React Email) | Create |
| `src/pages/api/newsletter/subscribe.ts` | Alta + envío de confirmación | Create |
| `src/pages/api/newsletter/confirm.ts` | Confirmación + alta en Audience | Create |
| `src/components/NewsletterForm.astro` | Form reutilizable (`variant`) | Create |
| `src/components/Newsletter.astro` | Sección dedicada para el home | Create |
| `src/pages/newsletter/confirmado.astro` | Página de éxito (noindex) | Create |
| `src/components/Footer.astro` | Newsletter compacto | Modify |
| `src/pages/index.astro` | `<Newsletter />` antes del footer | Modify |
| `.env.example` | `RESEND_AUDIENCE_ID` | Modify |
| `PRODUCCION.md` | Secret + SQL + dep | Modify |

---

# FASE A — SEO

## Task A1: Instalar `@astrojs/sitemap` y configurar `site`

**Files:**
- Modify: `astro.config.mjs`
- Modify: `package.json` (vía npm install)

- [ ] **Step 1: Instalar la dependencia**

Run: `npx astro add sitemap --yes`

Expected: instala `@astrojs/sitemap`, agrega `import sitemap from "@astrojs/sitemap"` y `sitemap()` a `integrations`. Si el comando modifica el config de forma inesperada, revertir esa parte y editar a mano según el Step 2.

- [ ] **Step 2: Dejar `astro.config.mjs` exactamente así**

```js
import { defineConfig } from "astro/config";

import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

const SITE = process.env.PUBLIC_SITE_URL || "https://mermeladatech.com";

// Rutas que NO deben aparecer en el sitemap ni indexarse.
const NOINDEX_PATHS = [
	"/workshops/gracias",
	"/workshops/pago-cancelado",
	"/newsletter/confirmado",
];

// https://astro.build/config
export default defineConfig({
	site: SITE,
	// Static by default; API routes opt into SSR via `export const prerender = false`.
	output: "static",
	adapter: cloudflare({
		platformProxy: { enabled: true },
		// We only use static <img> from /public; optimize at build, not runtime
		// (Cloudflare Workers don't support sharp at runtime).
		imageService: "compile",
	}),
	integrations: [
		react(),
		sitemap({
			filter: (page) =>
				!NOINDEX_PATHS.some((p) => new URL(page).pathname.replace(/\/$/, "") === p),
		}),
	],

	vite: {
		plugins: [tailwindcss()],
	},
});
```

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: build OK. En `dist/` aparecen `sitemap-index.xml` y `sitemap-0.xml`. (Las páginas noindex aún no existen, no falla.)

- [ ] **Step 4: Commit**

```bash
git add astro.config.mjs package.json package-lock.json
git commit -m "feat(seo): add sitemap integration and configure site url

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task A2: `src/lib/seo.ts` — builders de structured data

**Files:**
- Create: `src/lib/seo.ts`

- [ ] **Step 1: Crear el archivo**

```ts
import type { Workshop } from "../data/workshops";

/** Datos canónicos del sitio reutilizados en meta tags y JSON-LD. */
export const SITE = {
	name: "Mermelada Tech",
	description: "Comunidad de mujeres en tecnología",
	defaultOgImage: "/og-image.png",
} as const;

/** Perfiles públicos de Nai / Mermelada Tech (para `sameAs`). */
const SAME_AS = [
	"https://linkedin.com/in/nadiaujovich",
	"https://instagram.com/mermelada.techok",
	"https://discord.gg/HFV4QXJKNh",
];

/** Construye una URL absoluta a partir de un path y el `site` configurado. */
export function absoluteUrl(path: string, site: URL | undefined): string {
	const base = site ?? new URL("https://mermeladatech.com");
	return new URL(path, base).href;
}

/** Schema.org WebSite para la home. */
export function buildWebSiteSchema(site: URL | undefined) {
	return {
		"@context": "https://schema.org",
		"@type": "WebSite",
		name: SITE.name,
		url: absoluteUrl("/", site),
		inLanguage: "es",
		description: SITE.description,
	};
}

/** Schema.org Person para Nai Ujovich. */
export function buildPersonSchema(site: URL | undefined) {
	return {
		"@context": "https://schema.org",
		"@type": "Person",
		name: "Nai Ujovich",
		alternateName: "Nadia Ujovich",
		jobTitle: "Mentora en tecnología",
		description:
			"Mentora para mujeres que crecen en tecnología. Workshops y mentorías 1:1.",
		url: absoluteUrl("/", site),
		knowsAbout: [
			"Mentoría tech",
			"Mujeres en tecnología",
			"Desarrollo de software",
			"Open source",
			"Inteligencia artificial",
		],
		worksFor: {
			"@type": "Organization",
			name: SITE.name,
			url: absoluteUrl("/", site),
		},
		sameAs: SAME_AS,
	};
}

/**
 * Schema.org Event para un workshop.
 * Devuelve `null` si el workshop no tiene `fechaISO` (Google exige fecha ISO 8601).
 */
export function buildEventSchema(workshop: Workshop, site: URL | undefined) {
	if (!workshop.fechaISO) return null;

	const isPresencial = workshop.formato.toLowerCase() === "presencial";

	return {
		"@context": "https://schema.org",
		"@type": "Event",
		name: workshop.titulo,
		description: workshop.descripcion,
		startDate: workshop.fechaISO,
		eventStatus: "https://schema.org/EventScheduled",
		eventAttendanceMode: isPresencial
			? "https://schema.org/OfflineEventAttendanceMode"
			: "https://schema.org/OnlineEventAttendanceMode",
		location: isPresencial
			? { "@type": "Place", name: "Por confirmar" }
			: {
					"@type": "VirtualLocation",
					url: absoluteUrl(`/workshops/${workshop.slug}`, site),
				},
		organizer: {
			"@type": "Organization",
			name: SITE.name,
			url: absoluteUrl("/", site),
		},
		offers: {
			"@type": "Offer",
			price: workshop.esGratis ? 0 : (workshop.precioEUR ?? 0),
			priceCurrency: "EUR",
			availability: "https://schema.org/InStock",
			url: absoluteUrl(`/workshops/${workshop.slug}`, site),
		},
		image: absoluteUrl(workshop.imagen ?? SITE.defaultOgImage, site),
	};
}
```

- [ ] **Step 2: Verificar type-check**

Run: `npm run build`
Expected: FALLA con error de tipos porque `Workshop` aún no tiene `fechaISO` ni `imagen`. Esto es esperado; se arregla en Task A3.

- [ ] **Step 3: (sin commit todavía — se commitea junto a A3)**

---

## Task A3: `src/data/workshops.ts` — campos SEO + fecha ISO real

**Files:**
- Modify: `src/data/workshops.ts`

- [ ] **Step 1: Agregar campos a la interface `Workshop`**

Después de la línea `waitlistMode?: boolean;` (antes del cierre `}` de la interface), agregar:

```ts
	/** Fecha en ISO 8601 (ej. "2026-06-18T18:00:00-03:00"). Habilita Event schema. */
	fechaISO?: string;
	/** Imagen OG específica del workshop (path en /public). Default: /og-image.png */
	imagen?: string;
```

- [ ] **Step 2: Cargar `fechaISO` en el workshop con fecha real**

En el objeto del workshop `manual-supervivencia-ia`, justo después de la línea `fecha: "18 de junio",`, agregar:

```ts
		fechaISO: "2026-06-18T18:00:00-03:00",
```

> El workshop `open-source-sin-sindrome-impostor` queda con `fecha: "Por definir"` y SIN `fechaISO` → no emitirá Event schema (correcto).

- [ ] **Step 3: Verificar type-check**

Run: `npm run build`
Expected: OK (ya no falla el error de A2). El build no usa todavía las funciones de `seo.ts`, pero compila.

- [ ] **Step 4: Commit (A2 + A3 juntos)**

```bash
git add src/lib/seo.ts src/data/workshops.ts
git commit -m "feat(seo): add structured-data builders and workshop ISO date

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task A4: `Layout.astro` — head SEO completo

**Files:**
- Modify: `src/layouts/Layout.astro`

- [ ] **Step 1: Reemplazar el archivo completo por:**

```astro
---
import NavBar from "../components/NavBar.astro";
import { SITE, absoluteUrl } from "../lib/seo.ts";
import "../styles/global.css";

interface Props {
	title: string;
	description?: string;
	canonical?: string;
	ogImage?: string;
	ogType?: "website" | "article";
	noindex?: boolean;
	jsonLd?: object | object[];
}

const {
	title,
	description = "Mermelada Tech — workshops y mentorías 1:1 con Nai Ujovich para mujeres que crecen en tecnología.",
	canonical,
	ogImage = SITE.defaultOgImage,
	ogType = "website",
	noindex = false,
	jsonLd,
} = Astro.props;

const canonicalUrl = canonical ?? absoluteUrl(Astro.url.pathname, Astro.site);
const ogImageUrl = absoluteUrl(ogImage, Astro.site);
const jsonLdItems = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
---

<!doctype html>
<html lang="es">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<meta name="generator" content={Astro.generator} />

		<title>{title}</title>
		<meta name="description" content={description} />
		<link rel="canonical" href={canonicalUrl} />
		{noindex && <meta name="robots" content="noindex,nofollow" />}

		<!-- Favicon set -->
		<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
		<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png" />
		<link rel="icon" href="/favicon-16.png" sizes="16x16" type="image/png" />
		<link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />

		<!-- Open Graph -->
		<meta property="og:type" content={ogType} />
		<meta property="og:site_name" content={SITE.name} />
		<meta property="og:locale" content="es_AR" />
		<meta property="og:title" content={title} />
		<meta property="og:description" content={description} />
		<meta property="og:url" content={canonicalUrl} />
		<meta property="og:image" content={ogImageUrl} />
		<meta property="og:image:width" content="1200" />
		<meta property="og:image:height" content="630" />

		<!-- Twitter / X -->
		<meta name="twitter:card" content="summary_large_image" />
		<meta name="twitter:title" content={title} />
		<meta name="twitter:description" content={description} />
		<meta name="twitter:image" content={ogImageUrl} />

		<!-- Fonts: Archivo (headings) + Inter (body) -->
		<link rel="preconnect" href="https://fonts.googleapis.com" />
		<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
		<link
			href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&family=Inter:wght@400;500;600&display=swap"
			rel="stylesheet"
		/>

		{
			jsonLdItems.map((item) => (
				<script type="application/ld+json" set:html={JSON.stringify(item)} />
			))
		}
	</head>
	<body class="bg-merme-paper text-merme-black">
		<NavBar />
		<slot />
	</body>
</html>
```

- [ ] **Step 2: Verificar build + favicon**

Run: `npm run build`
Expected: OK.
Run: `npm run dev` y abrir `http://localhost:4321/` → ver el `<head>` (View Source): canonical, OG, Twitter y los 4 `<link rel="icon/apple-touch-icon">` presentes. El favicon se ve en la pestaña.

- [ ] **Step 3: Commit**

```bash
git add src/layouts/Layout.astro
git commit -m "feat(seo): full head meta (canonical, OG, Twitter, favicon set, JSON-LD)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task A5: `public/robots.txt`

**Files:**
- Create: `public/robots.txt`

- [ ] **Step 1: Crear el archivo**

```
User-agent: *
Allow: /
Disallow: /api/

Sitemap: https://mermeladatech.com/sitemap-index.xml
```

- [ ] **Step 2: Verificar**

Run: `npm run build`
Expected: `dist/robots.txt` existe con ese contenido.

- [ ] **Step 3: Commit**

```bash
git add public/robots.txt
git commit -m "feat(seo): add robots.txt

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task A6: Aplicar JSON-LD + noindex a páginas existentes

**Files:**
- Modify: `src/pages/index.astro`
- Modify: `src/pages/workshops/gracias.astro`
- Modify: `src/pages/workshops/pago-cancelado.astro`

- [ ] **Step 1: `index.astro` — agregar Person + WebSite schema**

Reemplazar el frontmatter y la apertura de `<Layout>` por:

```astro
---
import Footer from "../components/Footer.astro";
import Hero from "../components/Hero.astro";
import Mentorias from "../components/Mentorias.astro";
import SobreMi from "../components/SobreMi.astro";
import Workshops from "../components/Workshops.astro";
import Layout from "../layouts/Layout.astro";
import { buildPersonSchema, buildWebSiteSchema } from "../lib/seo.ts";

const jsonLd = [buildWebSiteSchema(Astro.site), buildPersonSchema(Astro.site)];
---

<Layout
	title="Mermelada Tech — Workshops y mentorías con Nai Ujovich"
	jsonLd={jsonLd}
>
```

(El resto del body —`<Hero />` … `<Footer />`— y el `</Layout>` quedan igual.)

- [ ] **Step 2: `workshops/gracias.astro` — noindex**

Cambiar la línea `<Layout title="¡Gracias por anotarte! — Mermelada Tech">` por:

```astro
<Layout title="¡Gracias por anotarte! — Mermelada Tech" noindex>
```

- [ ] **Step 3: `workshops/pago-cancelado.astro` — noindex**

Abrir el archivo, localizar la etiqueta `<Layout title="...">` y agregarle el atributo `noindex` (igual que el Step 2).

- [ ] **Step 4: Verificar**

Run: `npm run build`
Expected: OK. En dev, View Source de `/` muestra dos `<script type="application/ld+json">` (WebSite + Person). `/workshops/gracias` muestra `<meta name="robots" content="noindex,nofollow">`.

- [ ] **Step 5: Commit**

```bash
git add src/pages/index.astro src/pages/workshops/gracias.astro src/pages/workshops/pago-cancelado.astro
git commit -m "feat(seo): add home JSON-LD and noindex on post-checkout pages

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task A7: Refactor — extraer checkout script y modal de waitlist

> Objetivo: que la sección del home y la nueva página de detalle compartan la misma lógica de CTA sin duplicar. Comportamiento idéntico al actual.

**Files:**
- Create: `src/scripts/checkout.ts`
- Create: `src/components/WaitlistModal.astro`

- [ ] **Step 1: Crear `src/scripts/checkout.ts`**

```ts
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
```

- [ ] **Step 2: Crear `src/components/WaitlistModal.astro`**

Contiene el markup del modal (idéntico al de `Workshops.astro` líneas 124-179) y su `<script>` (líneas 181-273), exportando una función init. Incluir este componente UNA sola vez por página que tenga botones `.js-waitlist-open`.

```astro
---
// Modal de lista de espera. Incluir una vez por página.
// Se abre con cualquier botón `.js-waitlist-open` que tenga `data-slug`.
---

<div
	id="waitlist-modal"
	role="dialog"
	aria-modal="true"
	aria-labelledby="waitlist-modal-title"
	class="fixed inset-0 z-50 hidden items-center justify-center p-4 bg-merme-black/60"
>
	<div class="merme-card w-full max-w-md p-8 relative">
		<button
			type="button"
			id="waitlist-modal-close"
			class="absolute top-4 right-4 text-merme-black/60 hover:text-merme-black text-2xl leading-none"
			aria-label="Cerrar"
		>
			&times;
		</button>

		<div id="waitlist-form-wrap">
			<h2 id="waitlist-modal-title" class="text-xl font-bold text-merme-black mb-1">
				Anotarme a la lista de espera
			</h2>
			<p class="text-merme-black/75 text-sm mb-6">
				Te escribimos cuando el workshop esté confirmado para que puedas anotarte directo desde The Bridge.
			</p>
			<form id="waitlist-form" novalidate>
				<label for="waitlist-email" class="block text-sm font-semibold text-merme-black mb-1">
					Tu email
				</label>
				<input
					id="waitlist-email"
					type="email"
					name="email"
					required
					autocomplete="email"
					placeholder="vos@ejemplo.com"
					class="w-full border-[1.5px] border-merme-black rounded px-4 py-2.5 text-merme-black placeholder:text-merme-black/40 focus:outline-none focus:ring-2 focus:ring-merme-purple/40 mb-4"
				/>
				<p id="waitlist-error" class="text-red-600 text-sm mb-3 hidden"></p>
				<button type="submit" id="waitlist-submit" class="merme-btn w-full">
					Anotarme
				</button>
			</form>
		</div>

		<div id="waitlist-success" class="hidden text-center py-4">
			<p class="text-4xl mb-4">🍓</p>
			<h2 class="text-xl font-bold text-merme-black mb-2">¡Listo, te anotamos!</h2>
			<p class="text-merme-black/75 text-sm">
				Cuando el workshop se confirme te mandamos un mail con el link para inscribirte desde The Bridge.
			</p>
		</div>
	</div>
</div>

<script>
	const modal = document.getElementById("waitlist-modal");
	if (modal) {
		const formWrap = document.getElementById("waitlist-form-wrap")!;
		const successWrap = document.getElementById("waitlist-success")!;
		const form = document.getElementById("waitlist-form") as HTMLFormElement;
		const emailInput = document.getElementById("waitlist-email") as HTMLInputElement;
		const submitBtn = document.getElementById("waitlist-submit") as HTMLButtonElement;
		const errorEl = document.getElementById("waitlist-error")!;
		const closeBtn = document.getElementById("waitlist-modal-close")!;

		let currentSlug = "";

		function openModal(slug: string) {
			currentSlug = slug;
			formWrap.classList.remove("hidden");
			successWrap.classList.add("hidden");
			form.reset();
			errorEl.classList.add("hidden");
			modal!.classList.remove("hidden");
			modal!.classList.add("flex");
			emailInput.focus();
		}

		function closeModal() {
			modal!.classList.add("hidden");
			modal!.classList.remove("flex");
		}

		function showError(msg: string) {
			errorEl.textContent = msg;
			errorEl.classList.remove("hidden");
		}

		document.querySelectorAll<HTMLButtonElement>(".js-waitlist-open").forEach((btn) => {
			btn.addEventListener("click", () => openModal(btn.dataset.slug ?? ""));
		});

		closeBtn.addEventListener("click", closeModal);
		modal.addEventListener("click", (e) => {
			if (e.target === modal) closeModal();
		});
		document.addEventListener("keydown", (e) => {
			if (e.key === "Escape" && !modal!.classList.contains("hidden")) closeModal();
		});

		form.addEventListener("submit", async (e) => {
			e.preventDefault();
			errorEl.classList.add("hidden");
			const email = emailInput.value.trim();
			if (!email) {
				showError("Ingresá tu email.");
				emailInput.focus();
				return;
			}
			const originalText = submitBtn.textContent;
			submitBtn.disabled = true;
			submitBtn.textContent = "Enviando…";
			try {
				const res = await fetch("/api/waitlist", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ email, slug: currentSlug }),
				});
				const data = (await res.json()) as {
					ok?: boolean;
					alreadyRegistered?: boolean;
					error?: string;
				};
				if (data.ok) {
					formWrap.classList.add("hidden");
					successWrap.classList.remove("hidden");
					return;
				}
				showError(data.error ?? "No se pudo guardar. Intentá de nuevo.");
			} catch {
				showError("Error de conexión. Intentá de nuevo.");
			} finally {
				submitBtn.disabled = false;
				submitBtn.textContent = originalText ?? "Anotarme";
			}
		});
	}
</script>
```

- [ ] **Step 3: Verificar type-check**

Run: `npm run build`
Expected: OK (los nuevos archivos compilan; todavía no se usan).

- [ ] **Step 4: Commit**

```bash
git add src/scripts/checkout.ts src/components/WaitlistModal.astro
git commit -m "refactor(workshops): extract waitlist modal and checkout script

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task A8: `Workshops.astro` — usar pieza compartida + linkear a detalle

**Files:**
- Modify: `src/components/Workshops.astro`

- [ ] **Step 1: Reemplazar el archivo completo por:**

```astro
---
import { workshops } from "../data/workshops";
import WaitlistModal from "./WaitlistModal.astro";

const DISCORD_URL = "https://discord.gg/HFV4QXJKNh";
---

<section id="workshops" class="py-20 px-6 bg-merme-purple scroll-mt-20 relative overflow-hidden">
	<img
		src="/moon.svg"
		alt=""
		aria-hidden="true"
		class="absolute right-6 top-8 w-20 h-auto brightness-0 invert opacity-30 animate-wiggle [animation-duration:5s]"
	/>

	<div class="max-w-5xl mx-auto">
		<div class="text-center text-white">
			<span class="text-merme-sunflower font-semibold uppercase tracking-wide text-sm">Workshops</span>
			<h2 class="text-4xl sm:text-5xl mt-2">Talleres prácticos, en vivo</h2>
			<p class="text-white/85 text-lg mt-3 max-w-xl mx-auto">
				Sesiones intensivas donde salís con algo hecho, no con apuntes para "después".
			</p>
		</div>

		<div class="grid md:grid-cols-2 gap-6 mt-12">
			{
				workshops.map((w) => (
					<article class="merme-card flex flex-col p-6">
						<div class="flex items-center justify-between gap-3 mb-4">
							{w.esGratis ? (
								<span class="bg-merme-mint text-merme-black font-bold text-sm border-[1.5px] border-merme-black rounded-full px-3 py-1">
									GRATIS
								</span>
							) : (
								<span class="bg-merme-sunflower text-merme-black font-bold text-sm border-[1.5px] border-merme-black rounded-full px-3 py-1">
									{w.precioEUR}€
								</span>
							)}
							<span class="text-sm font-medium text-merme-black/70">
								{w.formato} · {w.duracion}
							</span>
						</div>

						<h3 class="text-merme-black text-2xl leading-tight">
							<a href={`/workshops/${w.slug}`} class="hover:text-merme-purple transition-colors">
								{w.titulo}
							</a>
						</h3>
						<p class="text-merme-purple font-semibold mt-1">{w.subtitulo}</p>

						{w.colaboracion && (
							<p class="text-sm font-medium text-merme-black/70 mt-2">
								{w.colaboracionUrl ? (
									<>
										En colaboración con{" "}
										<a
											href={w.colaboracionUrl}
											target="_blank"
											rel="noopener noreferrer"
											class="underline hover:text-merme-purple transition-colors"
										>
											The Bridge
										</a>
									</>
								) : (
									w.colaboracion
								)}
							</p>
						)}

						<p class="text-merme-black/85 mt-3">{w.descripcion}</p>

						<p class="text-sm font-semibold text-merme-black mt-4">📅 {w.fecha}</p>

						<ul class="mt-4 space-y-2 text-merme-black/90 text-[15px] list-none">
							{w.queAprenderas.map((item) => (
								<li class="flex gap-2">
									<span aria-hidden="true" class="text-merme-purple font-bold">→</span>
									<span>{item}</span>
								</li>
							))}
						</ul>

						<div class="mt-6 pt-2 flex flex-col gap-2">
							{w.waitlistMode ? (
								<button
									type="button"
									class="merme-btn w-full js-waitlist-open"
									data-slug={w.slug}
									data-titulo={w.titulo}
								>
									Anotarme a la lista de espera
								</button>
							) : !w.inscripcionAbierta ? (
								<button type="button" disabled class="merme-btn w-full opacity-50 cursor-not-allowed">
									Próximamente
								</button>
							) : w.esGratis ? (
								<a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" class="merme-btn w-full">
									Anotate gratis
								</a>
							) : (
								<button type="button" class="merme-btn w-full js-checkout" data-slug={w.slug}>
									Anotate ({w.precioEUR}€)
								</button>
							)}
							<a href={`/workshops/${w.slug}`} class="text-center text-sm font-semibold text-merme-purple hover:underline">
								Ver detalle →
							</a>
						</div>
					</article>
				))
			}
		</div>
	</div>
</section>

<WaitlistModal />

<script>
	import { initCheckout } from "../scripts/checkout.ts";
	initCheckout();
</script>
```

- [ ] **Step 2: Verificar**

Run: `npm run build` → OK.
Run: `npm run dev` → en `/`: la sección de workshops se ve igual; cada tarjeta tiene "Ver detalle →"; el botón de waitlist abre el modal; el de checkout (open-source) sigue redirigiendo (o mostrando el error de pago si no hay precio live). El título linkea a `/workshops/<slug>` (404 hasta Task A9).

- [ ] **Step 3: Commit**

```bash
git add src/components/Workshops.astro
git commit -m "feat(workshops): link cards to detail pages, reuse shared modal/checkout

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task A9: `src/pages/workshops/[slug].astro` — página de detalle + Event schema

**Files:**
- Create: `src/pages/workshops/[slug].astro`

- [ ] **Step 1: Crear el archivo**

```astro
---
import WaitlistModal from "../../components/WaitlistModal.astro";
import { type Workshop, workshops } from "../../data/workshops";
import Layout from "../../layouts/Layout.astro";
import { buildEventSchema } from "../../lib/seo.ts";

export function getStaticPaths() {
	return workshops.map((w) => ({
		params: { slug: w.slug },
		props: { workshop: w },
	}));
}

interface Props {
	workshop: Workshop;
}

const { workshop: w } = Astro.props;
const DISCORD_URL = "https://discord.gg/HFV4QXJKNh";

const eventSchema = buildEventSchema(w, Astro.site);
const description = `${w.subtitulo} ${w.descripcion}`.slice(0, 160);
---

<Layout
	title={`${w.titulo} — Workshop · Mermelada Tech`}
	description={description}
	ogType="article"
	ogImage={w.imagen ?? "/og-image.png"}
	jsonLd={eventSchema ?? undefined}
>
	<main class="px-6 py-16 max-w-3xl mx-auto">
		<a href="/#workshops" class="text-sm font-semibold text-merme-purple hover:underline">
			← Volver a workshops
		</a>

		<div class="merme-card p-8 mt-6">
			<div class="flex items-center justify-between gap-3 mb-4">
				{w.esGratis ? (
					<span class="bg-merme-mint text-merme-black font-bold text-sm border-[1.5px] border-merme-black rounded-full px-3 py-1">
						GRATIS
					</span>
				) : (
					<span class="bg-merme-sunflower text-merme-black font-bold text-sm border-[1.5px] border-merme-black rounded-full px-3 py-1">
						{w.precioEUR}€
					</span>
				)}
				<span class="text-sm font-medium text-merme-black/70">{w.formato} · {w.duracion}</span>
			</div>

			<h1 class="text-merme-black text-3xl sm:text-4xl leading-tight">{w.titulo}</h1>
			<p class="text-merme-purple font-semibold text-lg mt-2">{w.subtitulo}</p>

			{w.colaboracion && (
				<p class="text-sm font-medium text-merme-black/70 mt-2">
					{w.colaboracionUrl ? (
						<>
							En colaboración con{" "}
							<a href={w.colaboracionUrl} target="_blank" rel="noopener noreferrer" class="underline hover:text-merme-purple">
								The Bridge
							</a>
						</>
					) : (
						w.colaboracion
					)}
				</p>
			)}

			<p class="text-merme-black/85 mt-4 text-lg">{w.descripcion}</p>
			<p class="text-sm font-semibold text-merme-black mt-4">📅 {w.fecha}</p>

			<h2 class="text-xl mt-8 mb-3">Qué vas a aprender</h2>
			<ul class="space-y-2 text-merme-black/90 list-none">
				{w.queAprenderas.map((item) => (
					<li class="flex gap-2">
						<span aria-hidden="true" class="text-merme-purple font-bold">→</span>
						<span>{item}</span>
					</li>
				))}
			</ul>

			<div class="mt-8">
				{w.waitlistMode ? (
					<button type="button" class="merme-btn w-full js-waitlist-open" data-slug={w.slug} data-titulo={w.titulo}>
						Anotarme a la lista de espera
					</button>
				) : !w.inscripcionAbierta ? (
					<button type="button" disabled class="merme-btn w-full opacity-50 cursor-not-allowed">
						Próximamente
					</button>
				) : w.esGratis ? (
					<a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" class="merme-btn w-full">
						Anotate gratis
					</a>
				) : (
					<button type="button" class="merme-btn w-full js-checkout" data-slug={w.slug}>
						Anotate ({w.precioEUR}€)
					</button>
				)}
			</div>
		</div>
	</main>

	<WaitlistModal />
</Layout>

<script>
	import { initCheckout } from "../../scripts/checkout.ts";
	initCheckout();
</script>
```

- [ ] **Step 2: Verificar build + páginas**

Run: `npm run build`
Expected: OK. En `dist/workshops/` se generan `manual-supervivencia-ia/index.html` y `open-source-sin-sindrome-impostor/index.html`.
Run: `npm run dev` → `/workshops/manual-supervivencia-ia` renderiza con el design system; View Source muestra `<script type="application/ld+json">` con el `Event` (este sí tiene `fechaISO`). `/workshops/open-source-sin-sindrome-impostor` renderiza SIN bloque Event (correcto). Los CTA funcionan (modal / checkout).

- [ ] **Step 3: Verificar que el sitemap incluye las nuevas rutas**

Run: `npm run build` y revisar `dist/sitemap-0.xml`
Expected: contiene `/workshops/manual-supervivencia-ia/` y `/workshops/open-source-sin-sindrome-impostor/`, y NO contiene `/workshops/gracias/` ni `/workshops/pago-cancelado/`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/workshops/\[slug\].astro
git commit -m "feat(seo): add per-workshop detail pages with Event schema

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task A10: Lint + verificación final FASE A

- [ ] **Step 1: Lint**

Run: `npm run lint:fix`
Expected: sin errores (auto-fix aplica formato si hace falta).

- [ ] **Step 2: Build final**

Run: `npm run build`
Expected: OK, sin errores de tipos.

- [ ] **Step 3: Commit de cambios de lint (si los hubo)**

```bash
git add -A && git commit -m "style: biome formatting for SEO changes

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>" || echo "nada que commitear"
```

---

# FASE B — Newsletter

## Task B1: `src/lib/env.ts` — `RESEND_AUDIENCE_ID`

**Files:**
- Modify: `src/lib/env.ts`

- [ ] **Step 1: Agregar a la interface `ServerEnv`** (después de `BLAST_SECRET: string;`):

```ts
	RESEND_AUDIENCE_ID: string;
```

- [ ] **Step 2: Agregar al objeto que retorna `getServerEnv`** (después de la línea `BLAST_SECRET: read("BLAST_SECRET"),`):

```ts
		RESEND_AUDIENCE_ID: read("RESEND_AUDIENCE_ID"),
```

- [ ] **Step 3: Verificar**

Run: `npm run build`
Expected: OK.

- [ ] **Step 4: Commit**

```bash
git add src/lib/env.ts
git commit -m "feat(newsletter): add RESEND_AUDIENCE_ID to server env

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task B2: `src/lib/newsletter.ts` — helpers

**Files:**
- Create: `src/lib/newsletter.ts`

- [ ] **Step 1: Crear el archivo**

```ts
import type { Resend } from "resend";

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
```

- [ ] **Step 2: Verificar**

Run: `npm run build`
Expected: OK (el tipo `Resend` viene del paquete `resend` ya instalado).

- [ ] **Step 3: Commit**

```bash
git add src/lib/newsletter.ts
git commit -m "feat(newsletter): add token + audience helpers

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task B3: `src/emails/NewsletterConfirm.tsx` — email de confirmación

**Files:**
- Create: `src/emails/NewsletterConfirm.tsx`

- [ ] **Step 1: Crear el archivo** (mismos tokens/estilo que `WaitlistBlast.tsx`)

```tsx
import {
	Body,
	Button,
	Container,
	Head,
	Hr,
	Html,
	Link,
	Preview,
	Section,
	Text,
} from "@react-email/components";

export interface NewsletterConfirmProps {
	/** URL absoluta de confirmación (https://.../api/newsletter/confirm?token=...). */
	confirmUrl: string;
}

const COLOR = {
	purple: "#673773",
	sunflower: "#f5c43e",
	paper: "#e6f2f7",
	black: "#1b1b1b",
	white: "#ffffff",
	muted: "#666666",
} as const;

const FONT_HEADING = "'Archivo', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const FONT_BODY = "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif";

export function NewsletterConfirm({ confirmUrl }: NewsletterConfirmProps) {
	return (
		<Html lang="es">
			<Head />
			<Preview>Confirmá tu suscripción al newsletter de Mermelada Tech 🍓</Preview>
			<Body style={body}>
				<Container style={card}>
					<Text style={emoji}>🍓</Text>
					<Text style={heading}>Confirmá tu suscripción</Text>

					<Text style={paragraph}>¡Hola!</Text>
					<Text style={paragraph}>
						Gracias por sumarte al newsletter de Mermelada Tech. Solo falta un paso:
						confirmá que este es tu email tocando el botón.
					</Text>

					<Section style={buttonWrap}>
						<Button href={confirmUrl} style={button}>
							Confirmar suscripción →
						</Button>
					</Section>

					<Text style={paragraph}>
						Si no fuiste vos, ignorá este mail y no pasa nada.
					</Text>

					<Hr style={hr} />
					<Text style={footer}>
						Mermelada Tech ·{" "}
						<Link href="https://mermeladatech.com" style={footerLink}>
							mermeladatech.com
						</Link>
						<br />
						Recibís este mail porque alguien usó esta dirección para suscribirse.
					</Text>
				</Container>
			</Body>
		</Html>
	);
}

export default NewsletterConfirm;

const body: React.CSSProperties = {
	backgroundColor: COLOR.paper,
	fontFamily: FONT_BODY,
	color: COLOR.black,
	margin: 0,
	padding: "40px 0",
};

const card: React.CSSProperties = {
	backgroundColor: COLOR.white,
	border: `1.5px solid ${COLOR.black}`,
	borderRadius: "8px",
	boxShadow: `4px 4px 0 0 ${COLOR.black}`,
	maxWidth: "580px",
	margin: "0 auto",
	padding: "40px",
};

const emoji: React.CSSProperties = { fontSize: "28px", margin: "0 0 16px" };

const heading: React.CSSProperties = {
	fontFamily: FONT_HEADING,
	fontSize: "24px",
	fontWeight: 700,
	lineHeight: 1.3,
	color: COLOR.black,
	margin: "0 0 20px",
};

const paragraph: React.CSSProperties = {
	fontSize: "16px",
	lineHeight: 1.6,
	color: COLOR.black,
	margin: "0 0 14px",
};

const buttonWrap: React.CSSProperties = { margin: "28px 0 8px" };

const button: React.CSSProperties = {
	fontFamily: FONT_HEADING,
	backgroundColor: COLOR.sunflower,
	color: COLOR.black,
	fontWeight: 700,
	fontSize: "15px",
	textDecoration: "none",
	padding: "14px 28px",
	border: `1.5px solid ${COLOR.black}`,
	borderRadius: "4px",
	boxShadow: `3px 3px 0 0 ${COLOR.black}`,
	display: "inline-block",
};

const hr: React.CSSProperties = { borderColor: "#e5e5e5", margin: "32px 0 20px" };

const footer: React.CSSProperties = {
	fontSize: "13px",
	lineHeight: 1.6,
	color: COLOR.muted,
	margin: 0,
};

const footerLink: React.CSSProperties = {
	color: COLOR.purple,
	textDecoration: "underline",
};

NewsletterConfirm.PreviewProps = {
	confirmUrl: "https://mermeladatech.com/api/newsletter/confirm?token=demo-token",
} satisfies NewsletterConfirmProps;
```

- [ ] **Step 2: Verificar render**

Run: `npm run email:dev` (puerto 3001) y abrir `NewsletterConfirm` en el navegador.
Expected: el email renderiza con el estilo de marca y el botón apunta al confirmUrl de preview. Cortar el server (Ctrl-C) al terminar.

- [ ] **Step 3: Commit**

```bash
git add src/emails/NewsletterConfirm.tsx
git commit -m "feat(newsletter): add double opt-in confirmation email template

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task B4: `src/pages/api/newsletter/subscribe.ts` — alta + confirmación

**Files:**
- Create: `src/pages/api/newsletter/subscribe.ts`

- [ ] **Step 1: Crear el archivo**

```ts
export const prerender = false;

import { render } from "@react-email/components";
import type { APIRoute } from "astro";
import { Resend } from "resend";
import { NewsletterConfirm } from "../../../emails/NewsletterConfirm";
import { getServerEnv } from "../../../lib/env";
import { generateToken } from "../../../lib/newsletter";
import { getSupabaseAdmin } from "../../../lib/supabase";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TABLE = "newsletter_subscribers";

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
	const supabase = getSupabaseAdmin(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

	// ¿Ya existe?
	const { data: existing } = await supabase
		.from(TABLE)
		.select("status")
		.eq("email", cleanEmail)
		.maybeSingle();

	if (existing?.status === "confirmed") {
		// Ya está suscripta y confirmada: no reenviamos.
		return json({ ok: true, alreadyConfirmed: true }, 200);
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

	return json({ ok: true }, 201);
};

function json(data: unknown, status: number) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}
```

- [ ] **Step 2: Verificar type-check**

Run: `npm run build`
Expected: OK. (El endpoint compila; el comportamiento runtime se prueba en Task B8.)

- [ ] **Step 3: Commit**

```bash
git add src/pages/api/newsletter/subscribe.ts
git commit -m "feat(newsletter): add subscribe endpoint with double opt-in + honeypot

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task B5: `src/pages/api/newsletter/confirm.ts` — confirmación

**Files:**
- Create: `src/pages/api/newsletter/confirm.ts`

- [ ] **Step 1: Crear el archivo**

```ts
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

	const supabase = getSupabaseAdmin(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

	const { data: row } = await supabase
		.from(TABLE)
		.select("email,status")
		.eq("token", token)
		.maybeSingle();

	if (!row) return context.redirect(dest("token"), 302);

	// Marcar confirmado (idempotente) y limpiar el token.
	const { error: updErr } = await supabase
		.from(TABLE)
		.update({ status: "confirmed", confirmed_at: new Date().toISOString(), token: null })
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
```

- [ ] **Step 2: Verificar**

Run: `npm run build`
Expected: OK.

- [ ] **Step 3: Commit**

```bash
git add src/pages/api/newsletter/confirm.ts
git commit -m "feat(newsletter): add confirm endpoint + audience signup

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task B6: `NewsletterForm.astro` + página de confirmación

**Files:**
- Create: `src/components/NewsletterForm.astro`
- Create: `src/pages/newsletter/confirmado.astro`

- [ ] **Step 1: Crear `src/components/NewsletterForm.astro`**

```astro
---
interface Props {
	variant?: "section" | "footer";
}
const { variant = "section" } = Astro.props;
const isFooter = variant === "footer";

// id único por instancia para no chocar si hay 2 forms en la misma página.
const uid = isFooter ? "nl-footer" : "nl-section";
---

<form
	class:list={["js-newsletter-form", isFooter ? "flex flex-col sm:flex-row gap-2" : "flex flex-col gap-3 max-w-md"]}
	data-uid={uid}
	novalidate
>
	<label for={`${uid}-email`} class="sr-only">Tu email</label>
	<input
		id={`${uid}-email`}
		type="email"
		name="email"
		required
		autocomplete="email"
		placeholder="vos@ejemplo.com"
		class:list={[
			"border-[1.5px] border-merme-black rounded px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-merme-purple/40",
			isFooter ? "flex-1 text-merme-black" : "w-full text-merme-black",
		]}
	/>
	<!-- Honeypot anti-bot: oculto para humanos. -->
	<input type="text" name="hp" tabindex="-1" autocomplete="off" aria-hidden="true" class="hidden" />
	<button type="submit" class:list={["merme-btn", isFooter ? "" : "w-full"]}>
		Suscribirme
	</button>
	<p class="js-newsletter-msg text-sm mt-1 hidden" role="status"></p>
</form>

<script>
	document.querySelectorAll<HTMLFormElement>(".js-newsletter-form").forEach((form) => {
		const emailInput = form.querySelector<HTMLInputElement>('input[name="email"]')!;
		const hpInput = form.querySelector<HTMLInputElement>('input[name="hp"]')!;
		const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
		const msg = form.querySelector<HTMLElement>(".js-newsletter-msg")!;

		function showMsg(text: string, ok: boolean) {
			msg.textContent = text;
			msg.classList.remove("hidden");
			msg.classList.toggle("text-merme-purple", ok);
			msg.classList.toggle("text-red-600", !ok);
		}

		form.addEventListener("submit", async (e) => {
			e.preventDefault();
			const email = emailInput.value.trim();
			if (!email) {
				showMsg("Ingresá tu email.", false);
				return;
			}
			const original = submitBtn.textContent;
			submitBtn.disabled = true;
			submitBtn.textContent = "Enviando…";
			try {
				const res = await fetch("/api/newsletter/subscribe", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ email, hp: hpInput.value }),
				});
				const data = (await res.json()) as { ok?: boolean; alreadyConfirmed?: boolean; error?: string };
				if (data.ok) {
					if (data.alreadyConfirmed) {
						showMsg("¡Ya estabas suscripta! 🍓", true);
					} else {
						showMsg("Te mandamos un mail para confirmar tu suscripción 🍓", true);
						form.reset();
					}
				} else {
					showMsg(data.error ?? "No se pudo procesar. Intentá de nuevo.", false);
				}
			} catch {
				showMsg("Error de conexión. Intentá de nuevo.", false);
			} finally {
				submitBtn.disabled = false;
				submitBtn.textContent = original ?? "Suscribirme";
			}
		});
	});
</script>
```

- [ ] **Step 2: Crear `src/pages/newsletter/confirmado.astro`**

```astro
---
import Layout from "../../layouts/Layout.astro";

const error = Astro.url.searchParams.get("error");
const isError = error !== null;
---

<Layout title="Suscripción confirmada — Mermelada Tech" noindex>
	<section class="min-h-[70vh] grid place-items-center px-6 py-20">
		<div class="merme-card max-w-lg w-full p-8 sm:p-10 text-center">
			{
				isError ? (
					<>
						<div class="text-5xl mb-4" aria-hidden="true">🤔</div>
						<h1 class="text-merme-black text-3xl sm:text-4xl">No pudimos confirmar</h1>
						<p class="text-merme-black/85 mt-4">
							El link no es válido o ya lo usaste. Probá suscribirte de nuevo desde la página principal.
						</p>
					</>
				) : (
					<>
						<div class="text-5xl mb-4" aria-hidden="true">🍓</div>
						<h1 class="text-merme-black text-3xl sm:text-4xl">¡Suscripción confirmada!</h1>
						<p class="text-merme-black/85 mt-4">
							Listo, ya estás en el newsletter de Mermelada Tech. Te vamos a escribir con novedades, workshops y recursos. 💜
						</p>
					</>
				)
			}
			<div class="mt-8">
				<a href="/" class="merme-btn">Volver al inicio</a>
			</div>
		</div>
	</section>
</Layout>
```

- [ ] **Step 3: Verificar**

Run: `npm run build` → OK. `/newsletter/confirmado` y `?error=token` renderizan los dos estados; el `<head>` tiene `noindex`.

- [ ] **Step 4: Commit**

```bash
git add src/components/NewsletterForm.astro src/pages/newsletter/confirmado.astro
git commit -m "feat(newsletter): add subscription form and confirmation page

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task B7: Integrar el form en home (sección) y footer

**Files:**
- Create: `src/components/Newsletter.astro`
- Modify: `src/pages/index.astro`
- Modify: `src/components/Footer.astro`

- [ ] **Step 1: Crear `src/components/Newsletter.astro`**

```astro
---
import NewsletterForm from "./NewsletterForm.astro";
---

<section id="newsletter" class="py-20 px-6 bg-merme-paper scroll-mt-20">
	<div class="merme-card max-w-2xl mx-auto p-8 sm:p-10 text-center">
		<span class="text-merme-purple font-semibold uppercase tracking-wide text-sm">Newsletter</span>
		<h2 class="text-3xl sm:text-4xl mt-2 text-merme-black">No te pierdas nada</h2>
		<p class="text-merme-black/80 text-lg mt-3 max-w-xl mx-auto">
			Novedades, workshops y recursos para mujeres que crecen en tecnología. Directo a tu mail, sin spam.
		</p>
		<div class="mt-6 flex justify-center">
			<NewsletterForm variant="section" />
		</div>
	</div>
</section>
```

- [ ] **Step 2: `index.astro` — insertar `<Newsletter />` antes del Footer**

Agregar el import junto a los demás:

```astro
import Newsletter from "../components/Newsletter.astro";
```

Y en el body, entre `<Mentorias />` y `<Footer />`:

```astro
	<Mentorias />
	<Newsletter />
	<Footer />
```

- [ ] **Step 3: `Footer.astro` — agregar form compacto**

En el bloque del `<div>` izquierdo del footer (el que tiene el logo y el párrafo), después del `<p>` descriptivo, agregar el import en el frontmatter:

```astro
import NewsletterForm from "./NewsletterForm.astro";
```

Y dentro del `<div>` que contiene el logo + párrafo (después del `</p>`), agregar:

```astro
				<div class="mt-5 max-w-sm">
					<p class="text-white font-semibold mb-2 text-sm">Sumate al newsletter</p>
					<NewsletterForm variant="footer" />
				</div>
```

- [ ] **Step 4: Verificar**

Run: `npm run build` → OK.
Run: `npm run dev` → en `/`: aparece la sección Newsletter antes del footer, y el footer tiene el form compacto. Ambos forms tienen ids únicos (`nl-section`, `nl-footer`), no chocan.

- [ ] **Step 5: Commit**

```bash
git add src/components/Newsletter.astro src/pages/index.astro src/components/Footer.astro
git commit -m "feat(newsletter): add newsletter section and footer form to home

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task B8: Docs + verificación end-to-end

**Files:**
- Modify: `.env.example`
- Modify: `PRODUCCION.md`

- [ ] **Step 1: `.env.example` — agregar la var**

Agregar una línea (junto a las otras `RESEND_*`):

```
# ID del Audience de Resend Broadcasts para el newsletter
RESEND_AUDIENCE_ID=
```

- [ ] **Step 2: `PRODUCCION.md` — documentar secret + SQL + dep**

En la sección "## 3. Resend (emails de la waitlist)", agregar al final de la lista de secrets:

```markdown
  - [ ] `npx wrangler secret put RESEND_AUDIENCE_ID` (crear antes el Audience
        en Resend → Audiences; es el destino de los Broadcasts del newsletter)
```

Y agregar una sección nueva después de la de Supabase (sección 2):

```markdown
## 2b. Supabase — tabla `newsletter_subscribers` (newsletter)

- [ ] Crear la tabla con doble opt-in (RLS on, acceso solo service_role):
      ```sql
      create table if not exists public.newsletter_subscribers (
        id           uuid primary key default gen_random_uuid(),
        email        text not null unique,
        status       text not null default 'pending'
                     check (status in ('pending','confirmed','unsubscribed')),
        token        text,
        created_at   timestamptz not null default now(),
        confirmed_at timestamptz
      );
      alter table public.newsletter_subscribers enable row level security;
      ```
```

- [ ] **Step 3: Verificación end-to-end en dev** (requiere secrets locales en `.env.local`: `SUPABASE_*`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_AUDIENCE_ID`, `PUBLIC_SITE_URL`)

Run: `npm run dev`
- [ ] Suscribirse con un email de prueba en la sección Newsletter → mensaje "Te mandamos un mail para confirmar…".
- [ ] Verificar en Supabase: fila nueva en `newsletter_subscribers` con `status='pending'` y `token` seteado.
- [ ] Abrir el email de confirmación recibido (Resend) → click en "Confirmar suscripción".
- [ ] Verificar redirección a `/newsletter/confirmado` (estado éxito) y en Supabase `status='confirmed'`, `confirmed_at` seteado, `token` null.
- [ ] Verificar en Resend → Audiences que el contacto aparece.
- [ ] Reintentar suscripción con el MISMO email → mensaje "¡Ya estabas suscripta!", sin reenviar.
- [ ] Probar honeypot: con devtools, llenar el input `name="hp"` y enviar → respuesta ok pero NO se crea fila.

> Si no hay secrets locales para una prueba real, al menos validar que el endpoint responde 503 ("Servicio no disponible") sin secrets, y que el type-check pasa.

- [ ] **Step 4: Lint + build final**

Run: `npm run lint:fix && npm run build`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add .env.example PRODUCCION.md
git commit -m "docs(newsletter): document audience secret and subscribers table

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review del plan (completado por el autor)

- **Cobertura del spec:** SEO → sitemap (A1), schemas (A2/A6/A9), Layout head + favicon (A4), robots (A5), páginas workshop + refactor (A7/A8/A9), noindex (A6). Newsletter → env (B1), helpers (B2), email (B3), endpoints (B4/B5), UI sección+footer (B6/B7), confirmación (B6), tabla SQL + secret (B8). ✅ Todo el spec tiene tarea.
- **Placeholders:** sin TBD/TODO; todo el código está completo.
- **Consistencia de tipos:** `Workshop.fechaISO`/`imagen` definidos en A3 y usados en A2/A9; `RESEND_AUDIENCE_ID` definido en B1 y usado en B2/B5; `generateToken`/`addContactToAudience` definidos en B2 y usados en B4/B5; clases `.js-checkout`/`.js-waitlist-open` consistentes entre WaitlistModal, Workshops y [slug]. ✅
- **Nota de testing:** adaptado a build/lint/inspección por ausencia de framework de tests (instrucción del repo). ✅
