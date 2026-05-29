# Setup — Mermelada Tech

Guía para dejar funcionando workshops (Stripe) y mentorías (Cal.com).

## 0. Requisitos

```bash
npm install
cp .env.example .env   # completá los valores
npm run dev            # http://localhost:4321
```

El sitio es **estático por defecto** (Astro `output: 'static'`); solo los
endpoints `/api/checkout` y `/api/webhook` corren server-side
(`export const prerender = false`) sobre el adapter **Cloudflare**.

> **Cloudflare + secrets:** en Workers los secrets NO están en
> `import.meta.env` en runtime, viven en `Astro.locals.runtime.env`. El helper
> `src/lib/env.ts` lee de ahí con fallback a `import.meta.env` (que sí funciona
> en `astro dev`). En producción cargá los secrets con
> `wrangler secret put STRIPE_SECRET_KEY` (idem `STRIPE_WEBHOOK_SECRET`), y las
> `PUBLIC_*` como variables normales.

---

## 1. Stripe (modo test)

### 1.1 Crear producto y precio

1. Dashboard de Stripe → activá **modo test** (toggle arriba a la derecha).
2. **Catálogo de productos → + Añadir producto**.
3. Para el workshop pago ("Open Source sin Síndrome Impostor"):
   - Nombre: `Workshop Open Source`
   - Precio: **45,00 EUR**, **pago único** (one-time).
4. Guardá y copiá el **Price ID** (empieza con `price_...`, NO el `prod_...`).

### 1.2 Pegar el Price ID

En `src/data/workshops.ts`, en el workshop pago:

```ts
stripePriceId: "price_xxx", // ← el Price ID de modo test
```

Workshops gratuitos (`esGratis: true`) no necesitan Price ID: su botón
linkea al registro/Discord, no dispara checkout.

### 1.3 Claves

En `.env`:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Dashboard → **Desarrolladores → Claves de API**.

### 1.4 Probar el webhook en local

En una terminal aparte:

```bash
stripe login
stripe listen --forward-to localhost:4321/api/webhook
```

`stripe listen` imprime un **`whsec_...`** → pegalo en `.env` como
`STRIPE_WEBHOOK_SECRET` y reiniciá `npm run dev`.

Disparar una compra de prueba: desde el sitio, botón **"Anotate (45€)"**, y en
el Checkout usá una **tarjeta de prueba**:

| Caso        | Número                | Exp.    | CVC   |
| ----------- | --------------------- | ------- | ----- |
| Pago OK     | `4242 4242 4242 4242` | 12/34   | 123   |
| Requiere 3DS| `4000 0025 0000 3155` | 12/34   | 123   |
| Rechazada   | `4000 0000 0000 9995` | 12/34   | 123   |

Tras el pago OK redirige a `/workshops/gracias` y el webhook loggea
`checkout.session.completed` (ver el `// TODO` en `src/pages/api/webhook.ts`
para enganchar mail/registro).

### 1.5 Producción

- Repetí producto/precio en **modo live**, pegá el `price_live_...`.
- Webhook live: Dashboard → **Desarrolladores → Webhooks → + endpoint**,
  URL `https://TU-DOMINIO/api/webhook`, evento `checkout.session.completed`.
  Copiá el signing secret a los secrets de Cloudflare.
- Nunca pongas `sk_live_...` en el repo ni en `import.meta.env` del cliente.

---

## 2. Cal.com (mentorías)

### 2.1 Event types

En tu cuenta de Cal.com creá dos event types:

1. **Sesión inicial — 20 min** (gratuita). Es la que embebe la home.
2. **Sesión de mentoría — 50 min** (para CLARITY / STRATEGY / RITMO).

En cada uno, **Limits / Availability**, fijá la zona horaria en
**Europe/Madrid** (el embed además fuerza `timeZone: "Europe/Madrid"` desde
`src/components/CalEmbed.tsx`).

### 2.2 Enlace

El embed usa `PUBLIC_CALCOM_LINK`, en formato `usuario/event-type`:

```
PUBLIC_CALCOM_LINK=nadiaujovich/sesion-inicial
```

(Tomá el slug de la URL pública del event type: `cal.com/<usuario>/<slug>`.)

La home embebe la **sesión inicial gratuita**. Si querés embeber también las
sesiones pagas, duplicá el componente con otro `calLink`.

---

## 3. Deploy (Cloudflare)

```bash
npm run build
```

- Cargá los secrets: `wrangler secret put STRIPE_SECRET_KEY`,
  `wrangler secret put STRIPE_WEBHOOK_SECRET`.
- Definí `PUBLIC_SITE_URL` y `PUBLIC_CALCOM_LINK` como variables del proyecto.
- Apuntá el webhook de Stripe (live) a `https://TU-DOMINIO/api/webhook`.
