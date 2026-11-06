# CLAUDE.md — landing-mermelada

This file provides guidance for AI assistants working on this codebase.

## Project Overview

**landing-mermelada** is the marketing landing page for **Mermelada Tech**, a Spanish-speaking community for women in technology. Content is written in Spanish; code follows English conventions.

**Stack:** Astro 5 · Tailwind CSS 4 · TypeScript 5 (strict) · Biome · Prettier

---

## Repository Structure

```
landing-mermelada/
├── public/                      # Static assets served at root
│   ├── favicon.svg              # Jar mark (brand icon)
│   ├── founder-nadia.jpg        # Nadia Ujovich (founder + mentora)
│   ├── mentora-sol.jpg          # Solange Guerrero (mentora, aliada LATAM)
│   └── logo-patreon.svg
├── src/
│   ├── components/              # Home sections (PascalCase)
│   │   ├── NavBar.astro, Footer.astro, Logo.astro
│   │   ├── Hero.astro           # Headline + animated terminal
│   │   ├── Ticker.astro, Features.astro, Mentorias.astro (teaser → /mentorias)
│   │   ├── About.astro, Testimonios.astro, Colaboradoras.astro, Faqs.astro, CtaFinal.astro
│   │   └── mentorias/           # /mentorias page sections
│   │       ├── MentoriasHero.astro, Tracks.astro, Mentoras.astro
│   │       └── Booking.astro    # Mentora picker + franja horaria + FormSubmit form
│   ├── data/
│   │   ├── links.ts             # Every external URL + contact email (single source of truth)
│   │   └── mentoras.ts          # Mentor profiles shown on home + /mentorias
│   ├── layouts/Layout.astro     # <head>, fonts, NavBar, <main class="page-{home|mentorias}">, Footer
│   ├── pages/
│   │   ├── index.astro          # → /
│   │   └── mentorias.astro      # → /mentorias ("Pedí tu mentoría")
│   └── styles/global.css        # Tailwind import + brand tokens + all component CSS
└── .github/workflows/deploy.yml # Cloudflare Pages on push to main
```

---

## Design System (rebrand 2026)

Dark, "console" aesthetic. Tokens live as CSS custom properties in `src/styles/global.css` (`:root`):

- Surfaces: `--ink #120E1A` (page), `--ink-2 #1B1526` (cards/bands), `--line #2C2439` (borders)
- Brand: `--grape #6E4FD6` (primary, gradient CTAs), `--cyan #64D5E5` (eyebrows/code), `--sun #FFD54F` (yellow CTA + ticker), `--rasp #EF4C7E` (submit)
- Type: Archivo 900 for headings, Inter for body, JetBrains Mono for eyebrows/menu/chips, Bungee for the wordmark (`.wm`)
- Shared classes: `.wrap`, `.btn.p|.s|.y|.r`, `.card`, `.chip`, `.tags`, `.eyebrow`, `.sec-head`
- Page-specific rules are nested under `.page-home { … }` and `.page-mentorias { … }` (native CSS nesting, compiled by Lightning CSS via Tailwind 4). Tailwind utilities remain available but the layout is authored in plain CSS classes.
- Single dark theme; there is no light mode or theme toggle.

### Mentorship form

`Booking.astro` posts to FormSubmit (`https://formsubmit.co/<links.email>`) with `_cc` to the LATAM ally. The first submission triggers a one-time activation email to the inbox. Change the CC/email in `src/data/links.ts` and the `formCc` const in `Booking.astro`.

---

## Development Workflows

### Common Commands

```bash
npm run dev          # Start dev server at localhost:4321
npm run build        # Type-check (astro check) then build to dist/
npm run preview      # Preview production build locally
npm run lint         # Biome lint with auto-fix
npm run lint:fix     # Biome check with auto-fix (broader)
```

### Development Server

The Astro dev server runs at `http://localhost:4321` with hot module replacement enabled.

### Build

`npm run build` runs `astro check && astro build`. **TypeScript errors will block the build.** The output goes to `dist/`.

---

## Code Conventions

### Astro Components

- Use PascalCase filenames: `MyComponent.astro`
- Separate frontmatter (TypeScript logic) from the template with `---` fences
- Destructure props explicitly from `Astro.props`:

```astro
---
const { title, description, image } = Astro.props;
---
```

- Interface/type for props goes in the frontmatter when props exist

### TypeScript

- Strict mode is enabled — no implicit `any`, null checks required
- Use `const` by default (Biome enforces this as an error in `.astro` files)
- Use `import type` for type-only imports (Biome enforces this as an error in `.astro` files)
- Target: ESNext

### Styling

- Prefer the shared classes and tokens documented in **Design System** above; use Tailwind utilities only for one-off spacing.
- New colors go in `:root` of `src/styles/global.css` as `--name` custom properties.

### File Organization Rules

| What | Where |
|------|-------|
| Reusable UI pieces | `src/components/` |
| Page wrapper with `<NavBar>` and `<slot>` | `src/layouts/` |
| Route pages | `src/pages/` |
| Global CSS / design tokens | `src/styles/global.css` |
| External links, email, mentor profiles | `src/data/` |
| Static files (images, SVGs, fonts) | `public/` |

### Naming Conventions

- **Components/Layouts:** PascalCase (`NavBar.astro`, `Layout.astro`)
- **Pages:** lowercase kebab-case (`index.astro`, `about-us.astro`)
- **CSS custom properties:** `--color-<name>` in `@theme`
- **Props interfaces:** match component name (`CardProps`, `LayoutProps`)

---

## Linting & Formatting

Two tools are configured — they complement each other:

| Tool | Purpose | Config |
|------|---------|--------|
| **Biome** | Linting + import ordering | `biome.json` |
| **Prettier** | Formatting (especially `.astro` files) | `.prettierrc.json` |

**Key Biome rules enforced:**
- `useConst` — prefer `const` over `let` when variable is never reassigned
- `useImportType` — use `import type` for type-only imports
- Double quotes for JS strings
- Tab indentation

Run `npm run lint:fix` before committing to auto-fix most issues.

---

## TypeScript Notes

- No path aliases configured — use relative imports
- `src/env.d.ts` sets up Astro client types (`/// <reference types="astro/client" />`)
- `astro check` runs as part of `npm run build`; TypeScript errors block production builds

---

## No Testing Framework

There are no unit or integration tests configured. Verification relies on:
1. TypeScript type checking (`astro check`)
2. Biome linting
3. Visual inspection via dev server

If adding tests, Vitest is the recommended choice for Astro projects.

---

## Key Implementation Details

### Layout Pattern

Every page wraps content in `Layout.astro`, which injects `NavBar` automatically:

```astro
---
import Layout from '../layouts/Layout.astro';
---
<Layout title="Page Title">
  <!-- page content -->
</Layout>
```

### Adding a New Page

1. Create `src/pages/my-page.astro`
2. Wrap content in `<Layout title="..." page="home">` (add the page key to the `Props` union in `Layout.astro`/`NavBar.astro` and a `.page-<key>` block in `global.css` if it needs its own styles)
3. Add navigation link in `src/components/NavBar.astro`

### Adding a New Component

1. Create `src/components/MyComponent.astro`
2. Define props interface in frontmatter if needed
3. Use Tailwind classes + theme tokens for styling

### Adding New Colors / Tokens

Add to `src/styles/global.css` inside `@theme {}`:

```css
@theme {
  --color-my-color: #hexvalue;
}
```

This makes `bg-my-color`, `text-my-color`, `border-my-color` etc. available as Tailwind classes.

---

## Content Language

All user-facing content is in **Spanish**. When modifying copy, labels, or navigation links, write in Spanish. Code, variable names, comments, and commit messages use English.

---

## Git Workflow

- Active development branch: feature branches prefixed with `claude/`
- Main branch: `main`
- Commit messages: imperative English, e.g. `feat: add hero section`, `fix: navbar alignment`
