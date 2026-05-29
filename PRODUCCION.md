# Checklist de migración a producción — Mermelada Tech

Lista de todo lo que hay que hacer para pasar el sitio de pruebas a producción.
Marcá cada ítem al completarlo.

---

## 1. Stripe → modo LIVE

- [ ] Desactivar el toggle "modo test" en el Dashboard de Stripe.
- [ ] Recrear el producto y el **Price** en modo live (los IDs `price_...` de
      test NO sirven en live).
- [ ] Actualizar `stripePriceId` en `src/data/workshops.ts` con el Price ID live.
- [ ] Cargar la clave secreta live como secret de Cloudflare:
      `npx wrangler secret put STRIPE_SECRET_KEY` (valor `sk_live_...`).
- [ ] Crear el webhook **live** en Stripe apuntando a
      `https://mermeladatech.com/api/webhook` y cargar su secret:
      `npx wrangler secret put STRIPE_WEBHOOK_SECRET` (valor `whsec_...`).

## 2. Supabase

- [ ] Proyecto: `landing-mermelada` (region eu-west-3,
      ref `cdqezzpqlhbcctlqzhyt`). Ya creado.
- [ ] Tabla `waitlist` con RLS activado. Ya creada.
- [ ] Cargar secrets en Cloudflare:
  - [ ] `npx wrangler secret put SUPABASE_URL`
        (`https://cdqezzpqlhbcctlqzhyt.supabase.co`)
  - [ ] `npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY`
        (Settings → API → service_role — NUNCA en el cliente)

## 3. Resend (emails de la waitlist)

- [ ] Dominio `mermeladatech.com` verificado en Resend. **HECHO.**
- [ ] Cargar secrets en Cloudflare:
  - [ ] `npx wrangler secret put RESEND_API_KEY` (`re_...`)
  - [ ] `npx wrangler secret put RESEND_FROM_EMAIL`
        (`Nai de Mermelada Tech <nai@mermeladatech.com>` — solo ASCII en el nombre)
  - [ ] `npx wrangler secret put BLAST_SECRET` (generar con `openssl rand -hex 32`)

## 4. Cal.com (mentorías)

- [ ] Definir `PUBLIC_CALCOM_LINK` como variable de build en Cloudflare
      (`mermelada-tech-fdztum/sesion-inicial-gratuita`).
      > Las `PUBLIC_*` se inlinean en build time, no en runtime.

## 5. Cloudflare / sitio

- [ ] `PUBLIC_SITE_URL=https://mermeladatech.com` (sin barra final) como
      variable de build.
- [ ] `npm run build` y deploy (`npx wrangler deploy` o Pages conectado a Git).
- [ ] Verificar flujo completo en producción:
  - [ ] Checkout de workshop pago → pago real de prueba → página de gracias.
  - [ ] Alta en la waitlist → fila nueva en Supabase.
  - [ ] Embed de Cal.com renderiza y permite reservar.

---

## Tareas operativas pendientes (one-off)

Estas NO son de deploy, son acciones puntuales a ejecutar cuando corresponda:

- [ ] **Mandar los mails de la waitlist** (una vez, cuando el workshop con
      The Bridge esté confirmado). Disparar el blast:
      ```bash
      curl -X POST https://mermeladatech.com/api/waitlist/blast \
        -H "Content-Type: application/json" \
        -d '{ "secret":"<BLAST_SECRET>", "slug":"manual-supervivencia-ia", "bridge_url":"<URL-REAL-THE-BRIDGE>" }'
      ```
- [ ] **Limpiar la tabla `waitlist` de Supabase** (después de mandar el blast,
      para no re-enviar a las mismas personas en futuras campañas).
      ```sql
      delete from public.waitlist where workshop_slug = 'manual-supervivencia-ia';
      ```
