# benchmark

Benchmarking suite to compare **Chocola** with **SvelteKit** (and other options) using faithful static fixtures.

- `fixtures/chocola` — original Chocola SFC app (`chocolajs.dev` snapshot, `chocola@2.0.0-next.9`)
- `fixtures/sveltekit` — SvelteKit static port (`adapter-static`, Svelte 5, Vite 5)

## Quick start

```bash
# install fixture deps (once)
npm --prefix fixtures/chocola install
npm --prefix fixtures/sveltekit install

# run full benchmark (3 cold + 3 warm builds + dev startup per fixture)
npm run bench
# or
node bench.mjs --runs=3 --verbose

# quick (1 cold build, no dev server)
npm run bench:quick
node bench.mjs --runs=1 --skip-dev

# single fixture
node bench.mjs --fixture=chocola
node bench.mjs --fixture=sveltekit --runs=5

# output formats
node bench.mjs --json --out=results.json
node bench.mjs --markdown --out=REPORT.md
```

## What is measured

| Metric | How | Why |
|---|---|---|
| **Cold build time** | `rm -rf dist/.chocola` (Chocola) / `rm -rf build/.svelte-kit` (SvelteKit) then `node chocola.js` / `vite build`, N runs, avg/median/min/max | Fair cold-start compiler cost |
| **Warm build time** | Same build without cleaning, N runs | Incremental / cache effectiveness |
| **Dev server startup** | Spawn `node chocola.server.js` (:3000) / `vite dev --port 5174`, poll `http://127.0.0.1:PORT` until 200, race with log hint | DX latency |
| **node_modules size** | Recursive `fs.stat` sum, file count, `package.json` deps, lock size | Install footprint |
| **Build output size** | Recursive sum of `dist/` / `build/`, breakdown by ext (js/css/html/svg/jpg), top 5 largest | Shipping cost |
| **Cache size** | `.chocola` / `.svelte-kit` after build | Incremental overhead |

All sizes are wall bytes + human `KB/MB`. Times are wall `ms/s` via `performance.now()`.

## Outputs

- **Console table** — summary winner per metric (`npm run bench`)
- **`results.json`** — machine-readable payload `{ meta, results }` (auto-written)
- **`REPORT.md`** — markdown report with summary table + per-fixture details (auto-written)

Example `results.json`:

```json
{
  "meta": { "date": "2026-09-06T...", "node": "v24.18.0", "platform": "win32 x64", "runs": 3 },
  "results": [
    {
      "key": "chocola",
      "name": "Chocola",
      "nodeModules": { "bytes": 12345, "files": 123 },
      "build": { "cold": { "avg": 450, "median": 440 }, "warm": { "avg": 380 } },
      "buildOutput": { "bytes": 98765, "files": 8 },
      "dev": { "ms": 320, "success": true }
    }
  ]
}
```

## Fixtures

See `fixtures/sveltekit/README.md` for porting notes.

## Adding a new fixture

1. Create `fixtures/<name>/` with `package.json` containing `build` and `dev` scripts
2. Register it in `bench.mjs` → `FIXTURES` (dir, buildCmd, buildOut, devCmd, devPort, cacheDirs)
3. Run `node bench.mjs --fixture=<name> --verbose` to validate

## Notes

- Windows + Powershell friendly (uses `spawn` with `shell: true`, `taskkill` for cleanup)
- Dev servers are killed after measurement; ports 3000 (Chocola) and 5174 (SvelteKit) must be free
- `.gitignore` at repo root ignores `build/`, `dist/`, `node_modules/`, `.svelte-kit/` — benchmark outputs go to `results.json` / `REPORT.md` (not ignored)
