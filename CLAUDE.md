# CLAUDE.md — landing-mermelada

This file provides guidance for AI assistants working on this codebase.

## Project Overview

**landing-mermelada** is the marketing landing page for **Mermelada Tech**, a Spanish-speaking community for women in technology. Content is written in Spanish; code follows English conventions.

**Stack:** Astro 5 · Tailwind CSS 4 · TypeScript 5 (strict) · Biome · Prettier

---

## Repository Structure

```
landing-mermelada/
├── public/                  # Static assets served at root
│   ├── favicon.svg
│   ├── logo-mermelada.svg
│   ├── logo-patreon.svg
│   ├── cloud.svg            # Decorative animation element
│   ├── cross.svg            # Decorative element
│   └── moon.svg             # Decorative animation element
├── src/
│   ├── components/          # Reusable Astro components (PascalCase)
│   │   ├── Card.astro
│   │   ├── Hero.astro
│   │   └── NavBar.astro
│   ├── layouts/             # Page layout wrappers
│   │   └── Layout.astro
│   ├── pages/               # File-based routing (each file = a route)
│   │   └── index.astro      # → /
│   ├── styles/
│   │   └── global.css       # Tailwind import + @theme tokens
│   └── env.d.ts             # Astro client type reference
├── astro.config.mjs         # Astro config (Tailwind via Vite plugin)
├── tailwind.config.mjs      # Tailwind content paths
├── tsconfig.json            # TypeScript strict config
├── biome.json               # Biome linter/formatter config
└── .prettierrc.json         # Prettier config (with astro plugin)
```

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

### Styling with Tailwind CSS 4

- All Tailwind classes used inline on elements
- Use custom theme tokens defined in `src/styles/global.css` via `@theme`:
  - `bg-primary` → `#673773` (Grape Dark — primary brand color)
  - `bg-secondary` / `text-secondary` → `#1b1b1b` (Blacky)
  - `bg-grape-dark` → `#673773`
  - `bg-light-purple` → `#B6C2E3`
  - `bg-yellow-sunflower` → `#F5C43E` (CTAs/buttons)
- Use arbitrary values for precise one-off styles:
  ```
  shadow-[4px_6px_0_0_rgba(0,0,0,1)]
  bg-[repeating-linear-gradient(...)]
  ```
- Custom animation: `animate-wiggle` (defined in `@theme`, wiggles SVG decorations)

### Design System Patterns

- **Buttons:** white background, black border, drop shadow `shadow-[4px_6px_0_0_rgba(0,0,0,1)]`, `hover:scale-105` transition
- **Cards:** white background, black border, same shadow pattern, hover scale effect
- **Backgrounds:** gradient from cyan `#61CEE2` to purple tones, with grid overlay pattern
- **Decorative SVGs:** cloud, cross, moon — positioned absolutely with `animate-wiggle`

### File Organization Rules

| What | Where |
|------|-------|
| Reusable UI pieces | `src/components/` |
| Page wrapper with `<NavBar>` and `<slot>` | `src/layouts/` |
| Route pages | `src/pages/` |
| Global CSS / design tokens | `src/styles/global.css` |
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
2. Wrap content in `<Layout title="...">`
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
- Main branch: `master`
- Commit messages: imperative English, e.g. `feat: add hero section`, `fix: navbar alignment`
