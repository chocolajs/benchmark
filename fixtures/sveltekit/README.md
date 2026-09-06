# SvelteKit fixture — Chocola app rebuild

Static SvelteKit port of `benchmark/fixtures/chocola` (the `chocolajs.dev` site) for benchmarking Chocola vs SvelteKit.

- **Framework:** SvelteKit 2 + Svelte 5 + `adapter-static`
- **Output:** `build/` (static, prerendered)
- **Source fidelity:** all components ported 1:1 from Chocola SFCs (`src/lib/*.html` → `src/lib/*.svelte`), same copy, CSS variables, and runtime behaviour

## Structure

```
src/
  app.html              # html shell (fonts, favicon)
  app.css               # global styles (ported from src/styles/main.css)
  routes/
    +layout.svelte      # imports app.css, sets <title>/meta
    +layout.js          # export const prerender = true
    +page.svelte        # composes VersionBanner, NavBar, Hero, Stats, LogicSection, ComponentsSection, CtaSection, CommonFooter
  lib/
    CommonButton.svelte
    CommonCard.svelte
    CommonFooter.svelte
    ComponentsSection.svelte
    CtaSection.svelte   # clipboard + animation (port of $runtime → Svelte refs)
    Demo.svelte         # compile toggle + reduced-motion (port of $runtime)
    Hero.svelte
    LogicSection.svelte # includes hidden switch/for:each via {#if false}
    NavBar.svelte
    Stats.svelte
    VersionBanner.svelte # sessionStorage dismiss
static/
  favicon.svg
  icons/favicon.svg
  img/banner.jpg
  img/footer_img.svg
```

## Commands

```bash
npm install
npm run dev     # Vite dev server
npm run build   # vite build → static site in build/
npm run preview # preview built site
```

## Porting notes

- Chocola `<template>` / `<script>` / `<style>` + `bind:self="x"` + `$runtime()` → Svelte `bind:this` + `onMount` / event handlers
- Chocola `:root` styling component root → scoped class selectors (e.g. `button`, `.card`, `footer`)
- Chocola `<void mount:if={false}>` (never renders) → `{#if false}` block preserved for parity
- `Chocola/src/static/*` → SvelteKit `static/*` (served at `/`)
- Global CSS (`src/styles/main.css`) → `src/app.css` imported in `+layout.svelte`
