# Diseño — SEO y Newsletter

**Fecha:** 2026-06-06
**Proyecto:** landing-mermelada (Mermelada Tech — mermeladatech.com)
**Branch:** claude/modest-goodall-T38Xe
**Stack:** Astro 5 (output `static` + SSR por ruta) · Tailwind CSS 4 · TypeScript strict · Cloudflare Workers · React (solo islas) · Resend · Supabase

Este documento define dos features independientes pero entregables en la misma sesión:

1. **SEO** — meta tags por página, sitemap, robots, datos estructurados schema.org y set de favicon completo.
2. **Newsletter** — suscripción con doble opt-in usando Resend Broadcasts + Supabase.

---

## Decisiones tomadas

| Decisión | Elección | Razón |
|----------|----------|-------|
| Proveedor newsletter | **Resend Broadcasts** | Resend ya integrado (dominio `mermeladatech.com` verificado, mismo From). Un vendor menos. Doble opt-in se construye sobre Supabase. |
| Scope SEO workshops | **Páginas propias por workshop** (`/workshops/[slug]`) | Mejor ranking para búsquedas específicas; cada una con su meta + `Event` schema + URL en sitemap. |
| Ubicación form newsletter | **Sección dedicada + footer** | Mayor visibilidad/conversión, más entrada compacta en el footer. |
| OG image y favicon | **Assets del design bundle** (ya en `public/`) | OG 1200×630 de marca + set de favicon multi-resolución provistos por el sistema de diseño. |
| Dominio canónico | **`https://mermeladatech.com`** | Dominio real de producción (el bundle usaba `mermelada.tech` por error). |

---

## Constantes y convenciones del proyecto (a respetar)

- **Idioma de contenido:** español rioplatense. Código/commits en inglés.
- **Design system neo-brutalist:** tokens `--merme-purple/#673773`, `--merme-sunflower/#F5C43E`, `--merme-paper/#E6F2F7`, `--merme-black/#1B1B1B`; sombra dura `4px 4px` sin blur; borde `1.5px` negro. Clases utilitarias existentes: `merme-card`, `merme-btn`.
- **Secrets en Cloudflare Workers:** no disponibles vía `import.meta.env` en runtime; se leen de `Astro.locals.runtime.env`. Patrón centralizado en [`src/lib/env.ts`](../../../src/lib/env.ts) (`getServerEnv`).
- **API routes:** estáticas por defecto; SSR vía `export const prerender = false`.
- **Variables `PUBLIC_*`:** se inlinean en build time, no en runtime.

---

# Feature 1 — SEO

## 1.1 Objetivo

Que el sitio rankee para búsquedas en español sobre **mentorías tech** y **workshops para mujeres en tecnología**, y que se vea bien al compartirse en redes (Open Graph / Twitter Card), con datos estructurados que habiliten rich results.

## 1.2 Mapa de rutas

| Ruta | Indexable | Schema.org | Notas |
|------|-----------|-----------|-------|
| `/` | ✅ | `WebSite` + `Person` (Nai) | Home single-page |
| `/workshops/[slug]` | ✅ **(nueva)** | `Event` | Detalle por workshop (2 hoy) |
| `/workshops/gracias` | ❌ noindex | — | Post-pago |
| `/workshops/pago-cancelado` | ❌ noindex | — | Post-cancel |
| `/newsletter/confirmado` | ❌ noindex | — | (feature 2) |

## 1.3 Componentes del diseño

### a) `astro.config.mjs`
- Setear `site` desde `process.env.PUBLIC_SITE_URL` con fallback `"https://mermeladatech.com"`. Habilita canonical via `Astro.site` y alimenta el sitemap.
- Agregar integración **`@astrojs/sitemap`** (nueva dependencia). Configurar `filter` para excluir las rutas `noindex` (`/workshops/gracias`, `/workshops/pago-cancelado`, `/newsletter/confirmado`).

### b) `src/layouts/Layout.astro` — head SEO completo
Extender `Props`:

```ts
interface Props {
  title: string;
  description?: string;
  canonical?: string;   // default: Astro.url normalizada contra Astro.site
  ogImage?: string;     // default: "/og-image.png" (absolutizada)
  ogType?: "website" | "article"; // default "website"
  noindex?: boolean;    // default false
  jsonLd?: object | object[]; // structured data a inyectar
}
```

Renderizar en `<head>`:
- **Canonical:** `<link rel="canonical" href={canonical}>`.
- **Favicon set** (assets ya en `public/`):
  ```html
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
  <link rel="icon" href="/favicon-16.png" sizes="16x16" type="image/png">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180">
  ```
- **Open Graph:** `og:title`, `og:description`, `og:url`, `og:type`, `og:site_name` (`Mermelada Tech`), `og:locale` (`es_AR`), `og:image` (absoluta), `og:image:width=1200`, `og:image:height=630`.
- **Twitter Card:** `twitter:card=summary_large_image`, `twitter:title`, `twitter:description`, `twitter:image`.
- **Robots:** cuando `noindex` → `<meta name="robots" content="noindex,nofollow">`.
- **JSON-LD:** por cada objeto en `jsonLd`, un `<script type="application/ld+json" set:html={JSON.stringify(obj)} />`.

Defaults de copy (de la referencia del design bundle):
- `og:title` por defecto: `Mermelada Tech`
- descripción por defecto: ya existe en Layout — `Mermelada Tech — workshops y mentorías 1:1 con Nai Ujovich para mujeres que crecen en tecnología.`

### c) `src/lib/seo.ts` — builders de structured data
Constantes del sitio (nombre, descripción, sameAs) y funciones puras:

- `buildWebSiteSchema()` → `@type: WebSite` (name, url, inLanguage `es`).
- `buildPersonSchema()` → `@type: Person` para Nai:
  - `name`: "Nai Ujovich" (`alternateName`: "Nadia Ujovich").
  - `jobTitle`: "Mentora en tecnología".
  - `description`, `knowsAbout`: ["Mentoría tech", "Mujeres en tecnología", "Desarrollo de software", "Open source", "IA"].
  - `sameAs`: LinkedIn (`linkedin.com/in/nadiaujovich`), Instagram (`instagram.com/mermelada.techok`), Discord.
  - `url`: home.
- `buildEventSchema(workshop)` → `@type: Event`:
  - `name`, `description`, `startDate` (de `fechaISO`), `eventAttendanceMode` (Online/Mixed según `formato`), `eventStatus: EventScheduled`.
  - `location`: `VirtualLocation` con `url` del sitio (workshops son Virtual/Online).
  - `organizer`: `Organization` Mermelada Tech.
  - `offers`: `Offer` con `price` (`0` si `esGratis`, si no `precioEUR`), `priceCurrency: EUR`, `availability`, `url` de la página del workshop.
  - **Solo se emite si `workshop.fechaISO` está definido** (Google exige fecha ISO 8601 válida).

### d) `src/data/workshops.ts` — campos para SEO
Agregar a la interface `Workshop`:
- `fechaISO?: string;` — fecha en ISO 8601 (ej. `"2026-06-18T18:00:00-03:00"`). Solo se completa cuando hay fecha real; habilita `Event` schema. El campo `fecha` legible se mantiene.
- (Opcional) `imagen?: string;` — OG image por workshop; default a `/og-image.png`.

> Dato a cargar: el workshop `manual-supervivencia-ia` tiene fecha "18 de junio" → completar `fechaISO`. `open-source-...` está "Por definir" → sin `fechaISO`, no emite `Event`.

### e) `src/pages/workshops/[slug].astro` — páginas de detalle (nuevas)
- `getStaticPaths()` sobre `workshops` (genera una página por slug).
- Usa `<Layout>` con `title`/`description`/`canonical`/`ogType="article"` propios y `jsonLd={buildEventSchema(workshop)}` (si aplica).
- Contenido con el design system: hero del workshop (badge gratis/precio, formato, duración, fecha, colaboración), `queAprenderas`, y **CTA reutilizando la lógica existente** de [`Workshops.astro`](../../../src/components/Workshops.astro): waitlist modal (`js-waitlist-open`) / checkout Stripe (`js-checkout`) / Discord / "Próximamente".
- **Refactor dirigido:** extraer el bloque de CTA + el `<script>` del modal de waitlist y de checkout a piezas reutilizables para no duplicar entre la sección del home y la página de detalle. Opciones:
  - `src/components/WorkshopCta.astro` (markup del botón según estado del workshop).
  - `src/components/WaitlistModal.astro` (modal + script, incluido una sola vez por página).
  - El checkout script puede vivir en un módulo `src/scripts/checkout.ts` importado por ambas vistas.
  Mantener el comportamiento idéntico al actual.

### f) Tarjetas del home → enlazan al detalle
En [`Workshops.astro`](../../../src/components/Workshops.astro), el título de cada tarjeta linkea a `/workshops/{slug}`. El CTA in-situ se conserva (no obligamos a navegar para anotarse).

### g) `public/robots.txt` (nuevo)
```
User-agent: *
Allow: /
Disallow: /api/

Sitemap: https://mermeladatech.com/sitemap-index.xml
```

### h) Assets (ya copiados a `public/`)
- `og-image.png` (1200×630).
- `favicon.svg` (versión actualizada), `favicon-16.png`, `favicon-32.png`, `favicon-48.png`, `favicon-512.png`, `apple-touch-icon.png` (180×180).
- Junk `*:Zone.Identifier` (WSL) eliminado; no estaba trackeado.

## 1.4 Verificación SEO
- `npm run build` (incluye `astro check`) sin errores de tipos.
- `dist/sitemap-index.xml` y `dist/sitemap-0.xml` generados, **sin** las rutas noindex.
- `dist/robots.txt` presente.
- Inspección del `<head>` en `/` y `/workshops/manual-supervivencia-ia`: canonical correcto, OG/Twitter completos, JSON-LD válido (validar mentalmente contra schema.org; opcional Rich Results Test post-deploy).
- Favicon visible en dev server (`/favicon.svg` y fallbacks 200 OK).

---

# Feature 2 — Newsletter (Resend Broadcasts + doble opt-in)

## 2.1 Objetivo
Permitir que las visitantes se suscriban al newsletter con **doble opt-in** (confirmación por email), guardando el consentimiento, y que las campañas se compongan y envíen desde la **UI de Resend Broadcasts** sobre un Audience.

## 2.2 Flujo

```
[Form sección/footer]
   └─ POST /api/newsletter/subscribe { email, hp? }
        ├─ valida email (regex), trim + lowercase
        ├─ honeypot: si campo "hp" viene lleno → 200 fake-ok (bot), no hace nada
        ├─ upsert en Supabase newsletter_subscribers:
        │     - nuevo            → status=pending, token=randomUUID
        │     - pending existente→ regenera token, reenvía confirmación
        │     - confirmed        → 200 { alreadyConfirmed:true } (no reenvía)
        │     - unsubscribed     → vuelve a pending, nuevo token, reenvía
        └─ Resend: envía email de confirmación (React Email) con link:
              https://mermeladatech.com/api/newsletter/confirm?token=<token>

[Usuaria clickea el link]
   └─ GET /api/newsletter/confirm?token=<token>
        ├─ busca por token; si no existe/expiró → redirige a /newsletter/confirmado?error=1
        ├─ status=confirmed, confirmed_at=now()
        ├─ Resend: contacts.create({ email, audienceId, unsubscribed:false })
        └─ 302 → /newsletter/confirmado

[Campañas]
   └─ Nai compone y envía Broadcasts desde la UI de Resend al Audience.
      Bajas + List-Unsubscribe los maneja Resend automáticamente.
```

## 2.3 Componentes del diseño

### a) Supabase — tabla `newsletter_subscribers`
SQL a ejecutar manualmente (mismo patrón documental que `waitlist`, sin tooling de migración en el repo):

```sql
create table if not exists public.newsletter_subscribers (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  status      text not null default 'pending'
              check (status in ('pending','confirmed','unsubscribed')),
  token       text,
  created_at  timestamptz not null default now(),
  confirmed_at timestamptz
);
alter table public.newsletter_subscribers enable row level security;
-- Sin policies: acceso solo vía service_role (server-side), igual que waitlist.
```

### b) `src/lib/env.ts` — nuevo secret
Agregar `RESEND_AUDIENCE_ID: string;` a `ServerEnv` y a `getServerEnv` (`read("RESEND_AUDIENCE_ID")`). Reutiliza `RESEND_API_KEY` y `RESEND_FROM_EMAIL` existentes.

### c) `src/lib/newsletter.ts` — helpers
- `generateToken()` → `crypto.randomUUID()` (disponible en Workers runtime).
- `addContactToAudience(resend, audienceId, email)` → `resend.contacts.create({ email, audienceId, unsubscribed: false })`; tolerante a "ya existe".

### d) API routes (`prerender = false`)
- **`src/pages/api/newsletter/subscribe.ts`** (POST): valida, aplica honeypot, upsert en Supabase con lógica de estado descrita, envía confirmación con Resend. Respuestas JSON `{ ok }` / `{ error }` con el helper `json()` ya usado en el repo. No revela si el email ya existía (privacidad): siempre responde con éxito genérico salvo error de validación/servidor.
- **`src/pages/api/newsletter/confirm.ts`** (GET): lee `token` de la query, confirma, agrega al Audience, redirige (`302`) a `/newsletter/confirmado` (o `?error=1`).

### e) `src/emails/NewsletterConfirm.tsx` — React Email
Template en el estilo de [`WaitlistBlast.tsx`](../../../src/emails/WaitlistBlast.tsx): saludo, explicación de doble opt-in, botón "Confirmar suscripción" → link de confirmación, nota de "si no fuiste vos, ignorá este mail". Solo ASCII en el display name del From (regla existente).

### f) UI
- **`src/components/NewsletterForm.astro`** — form reutilizable con prop `variant: "section" | "footer"`:
  - Campo email + honeypot oculto (`hp`) + botón.
  - Estados idle / enviando / success / error con `<script>` inline (mismo patrón que el modal de waitlist en `Workshops.astro`).
  - Mensaje de éxito: "Te mandamos un mail para confirmar tu suscripción 🍓".
  - `variant` ajusta layout/clases (sección = vertical y prominente con `merme-card`; footer = inline compacto sobre fondo oscuro).
- **`src/components/Newsletter.astro`** — sección dedicada para el home, con copy de invitación + `<NewsletterForm variant="section" />`. Estética neo-brutalist.
- **`src/pages/index.astro`** — insertar `<Newsletter />` antes de `<Footer />`.
- **`src/components/Footer.astro`** — agregar `<NewsletterForm variant="footer" />` (entrada compacta).

### g) `src/pages/newsletter/confirmado.astro` (nueva, noindex)
Página de éxito con el design system. Lee `?error` para mostrar estado de éxito o de token inválido. `<Layout noindex>`.

### h) NavBar (opcional)
No se agrega link de nav al newsletter (la sección + footer alcanzan). Sin cambios en `NavBar.astro`.

## 2.4 Privacidad / GDPR
- Doble opt-in = consentimiento explícito; `confirmed_at` queda como registro.
- Bajas y header `List-Unsubscribe` los gestiona Resend Broadcasts automáticamente.
- El endpoint no filtra si un email ya estaba registrado.

## 2.5 Fuera de scope
- Rate-limiting fino del endpoint de alta (requeriría Cloudflare KV). Mitigación actual: doble opt-in + honeypot. Anotar como mejora futura.
- Importación masiva de contactos / migración de la `waitlist` al newsletter.

## 2.6 Verificación Newsletter
- `npm run build` sin errores de tipos.
- `npm run email:dev` renderiza `NewsletterConfirm.tsx`.
- En dev (con secrets locales): alta → fila `pending` en Supabase + email de confirmación; click → fila `confirmed` + contacto en el Audience de Resend; redirección a `/newsletter/confirmado`.
- Reintento de alta con email pending → reenvía; con confirmed → no duplica.

---

# Resumen de cambios de infraestructura / operativos

Agregar a **PRODUCCION.md**:
- **Dep nueva:** `@astrojs/sitemap`.
- **Secret nuevo de Cloudflare:** `npx wrangler secret put RESEND_AUDIENCE_ID` (crear antes el Audience en Resend Dashboard → Audiences).
- **Supabase:** ejecutar el SQL de `newsletter_subscribers`.
- **Build var:** confirmar `PUBLIC_SITE_URL=https://mermeladatech.com` (ya listado).
- **`.env.example`:** sumar `RESEND_AUDIENCE_ID`.

# Archivos afectados (resumen)

**Nuevos:**
- `src/lib/seo.ts`
- `src/lib/newsletter.ts`
- `src/pages/workshops/[slug].astro`
- `src/pages/api/newsletter/subscribe.ts`
- `src/pages/api/newsletter/confirm.ts`
- `src/pages/newsletter/confirmado.astro`
- `src/emails/NewsletterConfirm.tsx`
- `src/components/Newsletter.astro`
- `src/components/NewsletterForm.astro`
- (refactor) `src/components/WaitlistModal.astro`, `src/components/WorkshopCta.astro`, `src/scripts/checkout.ts`
- `public/robots.txt`
- `public/og-image.png`, `public/favicon*.png`, `public/apple-touch-icon.png`, `public/favicon.svg` (actualizado) — **ya copiados**

**Modificados:**
- `astro.config.mjs` (site + sitemap)
- `src/layouts/Layout.astro` (head SEO)
- `src/data/workshops.ts` (`fechaISO?`, `imagen?`)
- `src/components/Workshops.astro` (links a detalle + uso de piezas extraídas)
- `src/components/Footer.astro` (newsletter compacto)
- `src/pages/index.astro` (`<Newsletter />`)
- `src/pages/workshops/gracias.astro`, `pago-cancelado.astro` (`noindex`)
- `src/lib/env.ts` (`RESEND_AUDIENCE_ID`)
- `PRODUCCION.md`, `.env.example`

# Orden de implementación sugerido
1. SEO base: assets (hecho), Layout head, `seo.ts`, `astro.config` (site+sitemap), `robots.txt`, noindex en páginas existentes.
2. Páginas de workshop + refactor de CTA/modal + links desde el home + `fechaISO`.
3. Newsletter backend: env, tabla SQL (doc), `newsletter.ts`, endpoints, email template.
4. Newsletter UI: `NewsletterForm`, `Newsletter`, footer, página de confirmación.
5. Docs (PRODUCCION.md, .env.example) y verificación final (`npm run build`).
