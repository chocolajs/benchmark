# Benchmark Report - Chocola vs SvelteKit

> Generated 2026-09-06T06:23:20.847Z - Node v24.18.0 - win32 x64 - AMD Ryzen 5 5600 6-Core Processor               x12 - 16310 MB RAM

Runs per fixture: 1 - cold + warm - dev startup measured once per fixture

## Summary

| Metric | Chocola | SvelteKit | Winner | Delta |
|---|---:|---:|---|---|
| Cold build avg | 350 ms | 5.96 s | [Chocola] Chocola | 17.03x |
| Warm build avg | 346 ms | 5.72 s | [Chocola] Chocola | 16.53x |
| Cold build median | 350 ms | 5.96 s | [Chocola] Chocola | 17.03x |
| Dev startup | - | - | - | - |
| node_modules size | 3.52 MB (3,692,451 B) | 28.18 MB (29,552,710 B) | [Chocola] Chocola | 8.00x |
| node_modules files | 1,153 | 1,529 | [Chocola] Chocola | 1.33x |
| Build output size | 214.34 KB (219,481 B) | 260.17 KB (266,413 B) | [Chocola] Chocola | 1.21x |
| Build output files | 10 | 21 | [Chocola] Chocola | 2.10x |

## Chocola (`chocola`)

- **Fixture dir:** `fixtures/chocola`
- **Dependencies:** 1 deps, 0 devDeps
- **node_modules:** 3.52 MB (3,692,451 B) - 1,153 files - lock 10.75 KB (11,011 B)
- **Cold build:** avg 350 ms - median 350 ms - min 350 ms - max 350 ms - runs [350 ms]
- **Warm build:** avg 346 ms - median 346 ms - min 346 ms - max 346 ms - runs [346 ms]
- **Build output (`dist`):** 214.34 KB (219,481 B) - 10 files - exists
  - JS: 21.01 KB (21,518 B) - CSS: 42.23 KB (43,239 B) - HTML: 16.55 KB (16,944 B) - SVG: 23.20 KB (23,755 B) - JPG: 111.35 KB (114,025 B) - other: 0 B
  - Largest: static/img/banner.jpg (111.35 KB (114,025 B)), sc-uwjo1h.css (36.45 KB (37,329 B)), static/img/footer_img.svg (21.01 KB (21,512 B)), index.html (16.55 KB (16,944 B)), run-7wegmx.js (8.62 KB (8,825 B))
- **Cache:** .chocola: 361 B (361 B) (1 files)

## SvelteKit (`sveltekit`)

- **Fixture dir:** `fixtures/sveltekit`
- **Dependencies:** 0 deps, 5 devDeps
- **node_modules:** 28.18 MB (29,552,710 B) - 1,529 files - lock 46.59 KB (47,704 B)
- **Cold build:** avg 5.96 s - median 5.96 s - min 5.96 s - max 5.96 s - runs [5.96 s]
- **Warm build:** avg 5.72 s - median 5.72 s - min 5.72 s - max 5.72 s - runs [5.72 s]
- **Build output (`build`):** 260.17 KB (266,413 B) - 21 files - exists
  - JS: 97.22 KB (99,557 B) - CSS: 14.41 KB (14,752 B) - HTML: 13.96 KB (14,297 B) - SVG: 23.20 KB (23,755 B) - JPG: 111.35 KB (114,025 B) - other: 27 B (27 B)
  - Largest: img/banner.jpg (111.35 KB (114,025 B)), _app/immutable/chunks/Crwxnk5c.js (26.76 KB (27,407 B)), _app/immutable/entry/start.Bp1Y7EJd.js (22.35 KB (22,884 B)), img/footer_img.svg (21.01 KB (21,512 B)), _app/immutable/nodes/2.CIM2g1Wm.js (17.91 KB (18,336 B))
- **Cache:** .svelte-kit: 663.94 KB (679,874 B) (63 files)

---

### How to reproduce

```bash
npm run bench        # full (3 cold + 3 warm + dev)
npm run bench:quick  # 1 cold, no dev
node bench.mjs --runs=5 --verbose
node bench.mjs --fixture=chocola --skip-dev
```
