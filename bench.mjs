#!/usr/bin/env node
/**
 * Benchmark suite — Chocola vs SvelteKit
 * Measures: build times (cold/warm), dev server startup, node_modules size, build output size
 *
 * Usage:
 *   node bench.mjs [--runs=3] [--fixture=chocola|sveltekit] [--skip-dev] [--skip-build] [--json] [--markdown] [--out=results.json] [--verbose]
 */

import { spawn, execSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Privacy: helpers to ensure no absolute paths leak in output
function toRelative(p) {
  try {
    const rel = path.relative(__dirname, p);
    // Use forward slashes for portability and privacy
    return rel.replace(/\\/g, '/') || '.';
  } catch {
    return p;
  }
}

function sanitizeString(str) {
  if (!str || typeof str !== 'string') return str;
  let s = str;
  // Replace absolute benchmark root and cwd with relative '.'
  const roots = new Set([__dirname, process.cwd()]);
  for (const root of roots) {
    if (!root) continue;
    const variants = [
      root,
      root.replace(/\\/g, '/'),
      root.replace(/\//g, '\\'),
      path.normalize(root),
      path.normalize(root).replace(/\\/g, '/'),
    ];
    for (const v of variants) {
      if (!v) continue;
      s = s.split(v).join('.');
    }
  }
  // Clean up leading ./ or .\ after replacement
  s = s.replace(/\.\//g, '').replace(/\.\\/g, '');
  s = s.replace(/^\.[\\/]/, '');
  // Also strip any remaining drive-letter prefix like F:/ or F:\ at start of paths within string
  // Replace patterns like "F:\github\chocolajs\benchmark" already handled, but fallback for other homes
  s = s.replace(/[A-Z]:[\\/][^\s"'`]*benchmark[\\/]?/gi, (m) => {
    const rel = m.replace(/^[A-Z]:[\\/]/i, '').split('benchmark')[1] || '';
    return rel.replace(/^[\\/]/, '');
  });
  return s;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const FIXTURES = {
  chocola: {
    name: 'Chocola',
    dir: path.join(__dirname, 'fixtures', 'chocola'),
    buildCmd: { cmd: 'node', args: ['chocola.js'] },
    buildOut: 'dist',
    devCmd: { cmd: 'node', args: ['chocola.server.js'] },
    devPort: 3000,
    devReadyHint: /localhost:3000|listening|server/i,
    cacheDirs: ['dist', '.chocola'],
  },
  sveltekit: {
    name: 'SvelteKit',
    dir: path.join(__dirname, 'fixtures', 'sveltekit'),
    buildCmd: { cmd: 'npx', args: ['vite', 'build'] },
    buildOut: 'build',
    devCmd: { cmd: 'npx', args: ['vite', 'dev', '--port', '5174', '--host', '127.0.0.1'] },
    devPort: 5174,
    devReadyHint: /VITE.*ready|Local:.*5174|ready in/i,
    cacheDirs: ['build', '.svelte-kit'],
  },
};

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const opts = {
    runs: 3,
    fixture: null, // null = all
    skipDev: false,
    skipBuild: false,
    json: false,
    markdown: false,
    out: null,
    verbose: false,
    coldOnly: false,
  };
  for (const arg of argv) {
    if (arg.startsWith('--runs=')) opts.runs = Math.max(1, parseInt(arg.split('=')[1], 10) || 3);
    else if (arg.startsWith('--fixture=')) opts.fixture = arg.split('=')[1];
    else if (arg === '--skip-dev') opts.skipDev = true;
    else if (arg === '--skip-build') opts.skipBuild = true;
    else if (arg === '--json') opts.json = true;
    else if (arg === '--markdown') opts.markdown = true;
    else if (arg.startsWith('--out=')) opts.out = arg.split('=')[1];
    else if (arg === '--verbose') opts.verbose = true;
    else if (arg === '--cold-only') opts.coldOnly = true;
    else if (arg === '--help' || arg === '-h') {
      console.log(`
Benchmark — Chocola vs SvelteKit

Usage: node bench.mjs [options]

Options:
  --runs=N           Build runs per fixture (default 3)
  --fixture=NAME     Only bench one fixture (chocola|sveltekit)
  --skip-dev         Skip dev server startup measurement
  --skip-build       Skip build time measurement
  --json             Output JSON to stdout
  --markdown         Output markdown table to stdout
  --out=FILE         Write JSON results to FILE (default results.json when --json)
  --verbose          Verbose logs
  --cold-only        Only measure cold builds (skip warm)
  --help             Show this help
`);
      process.exit(0);
    }
  }
  return opts;
}

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const v = bytes / Math.pow(k, i);
  return `${v.toFixed(i === 0 ? 0 : 2)} ${sizes[i]} (${bytes.toLocaleString()} B)`;
}

function formatMs(ms) {
  if (ms < 1000) return `${ms.toFixed(0)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function median(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

async function getDirSize(dir, opts = {}) {
  const { followSymlinks = false } = opts;
  let total = 0;
  let files = 0;
  let byExt = {};
  let largest = [];

  async function walk(p) {
    let entries;
    try {
      entries = await fs.promises.readdir(p, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(p, e.name);
      try {
        const stat = followSymlinks ? await fs.promises.stat(full) : await fs.promises.lstat(full);
        if (stat.isSymbolicLink()) continue;
        if (stat.isDirectory()) {
          await walk(full);
        } else if (stat.isFile()) {
          total += stat.size;
          files++;
          const ext = path.extname(e.name).toLowerCase() || '(no-ext)';
          byExt[ext] = (byExt[ext] || 0) + stat.size;
          largest.push({ file: path.relative(dir, full).replace(/\\/g, '/'), size: stat.size });
        }
      } catch {}
    }
  }

  const exists = fs.existsSync(dir);
  if (!exists) return { bytes: 0, files: 0, byExt: {}, largest: [], exists: false };
  await walk(dir);
  largest.sort((a, b) => b.size - a.size);
  return { bytes: total, files, byExt, largest: largest.slice(0, 10), exists: true };
}

async function rmDir(p) {
  if (!fs.existsSync(p)) return;
  await fs.promises.rm(p, { recursive: true, force: true });
}

async function cleanFixture(fixture) {
  for (const d of fixture.cacheDirs) {
    await rmDir(path.join(fixture.dir, d));
  }
}

function resolveCmd(cmd) {
  if (process.platform === 'win32' && cmd === 'npx') return 'npx.cmd';
  if (process.platform === 'win32' && cmd === 'npm') return 'npm.cmd';
  return cmd;
}

function spawnWithFallback(cmd, args, opts) {
  const resolved = resolveCmd(cmd);
  const isCmd = resolved.endsWith('.cmd');
  if (process.platform === 'win32' && isCmd) {
    // .cmd files require shell via cmd.exe on Windows when shell:false
    return spawn('cmd.exe', ['/c', resolved, ...args], { ...opts, shell: false, windowsShell: false });
  }
  return spawn(resolved, args, { ...opts, shell: false });
}

// Run a command and measure wall time, capture stdout/stderr
function runMeasured(cmd, args, cwd, verbose) {
  return new Promise((resolve) => {
    const start = performance.now();
    const child = spawnWithFallback(cmd, args, {
      cwd,
      // Always pipe so we can sanitize absolute paths before printing (privacy)
      stdio: 'pipe',
      env: { ...process.env, FORCE_COLOR: '0', CI: '1' },
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (d) => {
      const raw = d.toString();
      const sanitized = sanitizeString(raw);
      if (verbose) process.stdout.write(sanitized);
      stdout += raw;
    });
    child.stderr?.on('data', (d) => {
      const raw = d.toString();
      const sanitized = sanitizeString(raw);
      if (verbose) process.stderr.write(sanitized);
      stderr += raw;
    });
    child.on('error', (err) => {
      const end = performance.now();
      resolve({ ms: end - start, code: 1, stdout, stderr: err.message, error: err });
    });
    child.on('close', (code) => {
      const end = performance.now();
      resolve({ ms: end - start, code: code ?? 0, stdout, stderr });
    });
  });
}

// Poll HTTP until success or timeout
function pollHttp(port, timeoutMs = 30000, intervalMs = 150) {
  return new Promise((resolve) => {
    const start = performance.now();
    let done = false;
    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        resolve({ success: false, ms: performance.now() - start, error: 'timeout' });
      }
    }, timeoutMs);

    const tryFetch = () => {
      if (done) return;
      const req = http.get({ hostname: '127.0.0.1', port, path: '/', timeout: 2000 }, (res) => {
        // any response (even 404) means server is up
        if (!done) {
          done = true;
          clearTimeout(timer);
          res.resume();
          resolve({ success: true, ms: performance.now() - start, status: res.statusCode });
        }
      });
      req.on('error', () => {
        if (!done) setTimeout(tryFetch, intervalMs);
      });
      req.on('timeout', () => {
        req.destroy();
        if (!done) setTimeout(tryFetch, intervalMs);
      });
    };
    setTimeout(tryFetch, 200);
  });
}

async function measureDevStartup(fixture, verbose) {
  const port = fixture.devPort;
  const cwd = fixture.dir;
  const { cmd, args } = fixture.devCmd;

  // ensure port free — try quick probe
  // spawn
  const start = performance.now();
  const child = spawnWithFallback(cmd, args, {
    cwd,
    stdio: 'pipe',
    env: { ...process.env, FORCE_COLOR: '0' },
  });

  let stdout = '';
  let stderr = '';
  let resolved = false;
  let readyViaLog = null;

  const logPromise = new Promise((resolve) => {
    const onData = (buf, isErr) => {
      const raw = buf.toString();
      const s = raw;
      if (isErr) stderr += s;
      else stdout += s;
      if (verbose) process.stderr.write(sanitizeString(raw));
      if (!readyViaLog && fixture.devReadyHint.test(s)) {
        readyViaLog = performance.now() - start;
      }
    };
    child.stdout?.on('data', (d) => onData(d, false));
    child.stderr?.on('data', (d) => onData(d, true));
    child.on('error', (e) => {
      if (!resolved) {
        resolved = true;
        resolve({ success: false, ms: performance.now() - start, error: e.message, stdout, stderr });
      }
    });
    // also watch close
    child.on('close', () => {
      if (!resolved) {
        resolved = true;
        resolve({ success: false, ms: performance.now() - start, error: 'process closed before ready', stdout, stderr });
      }
    });
  });

  // race: poll http vs log hint vs timeout
  const pollPromise = pollHttp(port, 30000, 150);

  const result = await Promise.race([
    pollPromise.then((r) => ({ ...r, source: 'http' })),
    // if log hint fires, wait a bit for http to also succeed, but use log time as ms if http succeeds soon
    new Promise((resolve) => {
      const check = setInterval(() => {
        if (readyViaLog !== null) {
          clearInterval(check);
          // wait up to 5s for http to confirm
          pollHttp(port, 5000, 100).then((pr) => {
            if (pr.success) resolve({ success: true, ms: readyViaLog, source: 'log+http', status: pr.status, logMs: readyViaLog, httpMs: pr.ms });
            else resolve({ success: true, ms: readyViaLog, source: 'log', logMs: readyViaLog });
          });
        }
      }, 100);
      setTimeout(() => {
        clearInterval(check);
      }, 30000);
    }),
  ]);

  // ensure we have a result, fallback to poll result if race didn't resolve log path
  let final = result;
  if (!final || !final.success) {
    // wait for poll to complete if not yet
    const pollResult = await pollPromise;
    final = pollResult.success ? pollResult : { success: false, ms: performance.now() - start, error: pollResult.error, stdout, stderr };
  } else if (final.source === 'http' && readyViaLog !== null) {
    // prefer log time if we saw it (more precise)
    final.ms = Math.min(final.ms, readyViaLog);
  }

  // cleanup
  await killProcess(child, verbose);

  // drain log promise (ignore)
  // give a moment for port to free
  await new Promise((r) => setTimeout(r, 500));

  return {
    success: final.success,
    ms: final.ms,
    source: final.source,
    stdout: stdout.slice(0, 4000),
    stderr: stderr.slice(0, 4000),
    error: final.error,
    status: final.status,
  };
}

async function killProcess(child, verbose) {
  if (!child || child.killed) return;
  try {
    if (process.platform === 'win32') {
      // taskkill for process tree
      try {
        execSync(`taskkill /pid ${child.pid} /t /f`, { stdio: 'ignore' });
      } catch {
        try { child.kill('SIGTERM'); } catch {}
      }
    } else {
      child.kill('SIGTERM');
      // force kill after 1s
      setTimeout(() => {
        try { if (!child.killed) child.kill('SIGKILL'); } catch {}
      }, 1000);
    }
  } catch (e) {
    if (verbose) console.error('kill error', e);
  }
  // wait for exit
  await new Promise((r) => {
    let done = false;
    child.on('close', () => { if (!done) { done = true; r(); } });
    setTimeout(() => { if (!done) { done = true; r(); } }, 2000);
  });
}

// ---------------------------------------------------------------------------
// Benchmark per fixture
// ---------------------------------------------------------------------------
async function benchFixture(key, opts) {
  const fixture = FIXTURES[key];
  if (!fixture) throw new Error(`Unknown fixture ${key}`);
  if (!fs.existsSync(fixture.dir)) {
    return { key, name: fixture.name, error: `Fixture dir missing: ${toRelative(fixture.dir)}` };
  }

  const verbose = opts.verbose;
  const runs = opts.runs;

  if (verbose) console.log(`\n— Benchmarking ${fixture.name} (${key}) —`);

  // node_modules info
  const nmDir = path.join(fixture.dir, 'node_modules');
  const nmInfo = await getDirSize(nmDir);
  const pkgJsonPath = path.join(fixture.dir, 'package.json');
  let depsCount = 0;
  let devDepsCount = 0;
  try {
    const pkg = JSON.parse(await fs.promises.readFile(pkgJsonPath, 'utf8'));
    depsCount = Object.keys(pkg.dependencies || {}).length;
    devDepsCount = Object.keys(pkg.devDependencies || {}).length;
  } catch {}

  let lockSize = 0;
  try {
    const stat = await fs.promises.stat(path.join(fixture.dir, 'package-lock.json'));
    lockSize = stat.size;
  } catch {}

  // build times
  let build = null;
  if (!opts.skipBuild) {
    const timesCold = [];
    const timesWarm = [];
    let lastErr = null;

    for (let i = 0; i < runs; i++) {
      if (verbose) console.log(`  [${key}] cold build ${i + 1}/${runs} — cleaning ${fixture.cacheDirs.join(', ')}`);
      await cleanFixture(fixture);
      // small delay to let FS settle
      await new Promise((r) => setTimeout(r, 200));
      const res = await runMeasured(fixture.buildCmd.cmd, fixture.buildCmd.args, fixture.dir, verbose);
        if (res.code !== 0) {
          lastErr = sanitizeString(res.stderr || res.stdout || `exit ${res.code}`);
          if (verbose) console.error(`  build failed: ${lastErr.slice(0, 500)}`);
          timesCold.push(null);
      } else {
        timesCold.push(res.ms);
        if (verbose) console.log(`  cold build ${i + 1}: ${formatMs(res.ms)}`);
      }
    }

    if (!opts.coldOnly) {
      // warm builds: build again without cleaning
      for (let i = 0; i < runs; i++) {
        if (verbose) console.log(`  [${key}] warm build ${i + 1}/${runs}`);
        const res = await runMeasured(fixture.buildCmd.cmd, fixture.buildCmd.args, fixture.dir, verbose);
        if (res.code !== 0) {
          timesWarm.push(null);
        } else {
          timesWarm.push(res.ms);
          if (verbose) console.log(`  warm build ${i + 1}: ${formatMs(res.ms)}`);
        }
      }
    }

    const validCold = timesCold.filter((v) => v !== null);
    const validWarm = timesWarm.filter((v) => v !== null);

    build = {
      runs,
      cold: {
        times: timesCold,
        valid: validCold,
        avg: validCold.length ? validCold.reduce((a, b) => a + b, 0) / validCold.length : null,
        median: validCold.length ? median(validCold) : null,
        min: validCold.length ? Math.min(...validCold) : null,
        max: validCold.length ? Math.max(...validCold) : null,
      },
      warm: validWarm.length
        ? {
            times: timesWarm,
            valid: validWarm,
            avg: validWarm.reduce((a, b) => a + b, 0) / validWarm.length,
            median: median(validWarm),
            min: Math.min(...validWarm),
            max: Math.max(...validWarm),
          }
        : null,
      error: lastErr,
    };
  }

  // ensure build output exists for size measurement (if we cleaned, last cold build should have left it)
  // if skipBuild, just measure whatever is there
  const outDir = path.join(fixture.dir, fixture.buildOut);
  const outInfo = await getDirSize(outDir);
  // also detailed breakdown
  let outBreakdown = null;
  if (outInfo.exists) {
    // count by extension already in byExt, add file list
    outBreakdown = {
      js: outInfo.byExt['.js'] || 0,
      css: outInfo.byExt['.css'] || 0,
      html: outInfo.byExt['.html'] || 0,
      svg: outInfo.byExt['.svg'] || 0,
      jpg: outInfo.byExt['.jpg'] || 0,
      other: Object.entries(outInfo.byExt)
        .filter(([k]) => !['.js', '.css', '.html', '.svg', '.jpg', '.jpeg', '.png', '.webp'].includes(k))
        .reduce((a, [, v]) => a + v, 0),
    };
  }

  // dev startup
  let dev = null;
  if (!opts.skipDev) {
    if (verbose) console.log(`  [${key}] measuring dev server startup (port ${fixture.devPort})...`);
    // ensure no leftover build interfering — not needed
    // kill any stale process on port? best effort: try to fetch port and warn if already in use
    const probe = await pollHttp(fixture.devPort, 800, 100);
    if (probe.success) {
      if (verbose) console.log(`  warning: port ${fixture.devPort} already in use, waiting...`);
      await new Promise((r) => setTimeout(r, 1000));
    }
    const devRes = await measureDevStartup(fixture, verbose);
    dev = {
      success: devRes.success,
      ms: devRes.success ? devRes.ms : null,
      source: devRes.source,
      error: sanitizeString(devRes.error),
    };
    if (verbose) console.log(`  dev startup: ${devRes.success ? formatMs(devRes.ms) : 'FAILED ' + sanitizeString(devRes.error)}`);
  }

  // svelte-kit or .chocola cache size (if not cleaned? after build it will exist)
  let cacheInfo = null;
  for (const cd of fixture.cacheDirs) {
    if (cd === fixture.buildOut) continue;
    const cp = path.join(fixture.dir, cd);
    const ci = await getDirSize(cp);
    if (ci.exists && ci.bytes > 0) {
      cacheInfo = cacheInfo || {};
      cacheInfo[cd] = { bytes: ci.bytes, files: ci.files };
    }
  }

  return {
    key,
    name: fixture.name,
    dir: toRelative(fixture.dir),
    nodeModules: {
      bytes: nmInfo.bytes,
      files: nmInfo.files,
      packages: depsCount + devDepsCount,
      deps: depsCount,
      devDeps: devDepsCount,
      lockBytes: lockSize,
      topLargest: nmInfo.largest.slice(0, 5),
    },
    build,
    buildOutput: {
      dir: fixture.buildOut,
      bytes: outInfo.bytes,
      files: outInfo.files,
      breakdown: outBreakdown,
      byExt: outInfo.byExt,
      largest: outInfo.largest.slice(0, 5),
      exists: outInfo.exists,
    },
    dev,
    cache: cacheInfo,
  };
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------
function buildReport(results, meta) {
  const lines = [];
  lines.push('# Benchmark Report - Chocola vs SvelteKit');
  lines.push('');
  lines.push(`> Generated ${new Date().toISOString()} - Node ${process.version} - ${os.platform()} ${os.arch()} - ${os.cpus()[0]?.model || 'unknown CPU'} x${os.cpus().length} - ${Math.round(os.totalmem() / 1024 / 1024)} MB RAM`);
  lines.push('');
  lines.push(`Runs per fixture: ${meta.runs} - cold + warm - dev startup measured once per fixture`);
  lines.push('');

  // summary table
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Chocola | SvelteKit | Winner | Delta |');
  lines.push('|---|---:|---:|---|---|');

  const c = results.find((r) => r.key === 'chocola');
  const s = results.find((r) => r.key === 'sveltekit');

  function row(metric, cVal, sVal, lowerIsBetter = true, fmt = (v) => v) {
    if (cVal == null || sVal == null) {
      lines.push(`| ${metric} | ${cVal == null ? '-' : fmt(cVal)} | ${sVal == null ? '-' : fmt(sVal)} | - | - |`);
      return;
    }
    const winner = cVal === sVal ? 'tie' : lowerIsBetter ? (cVal < sVal ? 'Chocola' : 'SvelteKit') : (cVal > sVal ? 'Chocola' : 'SvelteKit');
    const delta = cVal === 0 || sVal === 0 ? '-' : `${(Math.max(cVal, sVal) / Math.min(cVal, sVal)).toFixed(2)}x`;
    const sig = winner === 'Chocola' ? '[Chocola]' : winner === 'SvelteKit' ? '[SvelteKit]' : '-';
    lines.push(`| ${metric} | ${fmt(cVal)} | ${fmt(sVal)} | ${sig} ${winner} | ${delta} |`);
  }

  row('Cold build avg', c?.build?.cold?.avg, s?.build?.cold?.avg, true, formatMs);
  row('Warm build avg', c?.build?.warm?.avg, s?.build?.warm?.avg, true, formatMs);
  row('Cold build median', c?.build?.cold?.median, s?.build?.cold?.median, true, formatMs);
  row('Dev startup', c?.dev?.ms, s?.dev?.ms, true, formatMs);
  row('node_modules size', c?.nodeModules?.bytes, s?.nodeModules?.bytes, true, formatBytes);
  row('node_modules files', c?.nodeModules?.files, s?.nodeModules?.files, true, (v) => v.toLocaleString());
  row('Build output size', c?.buildOutput?.bytes, s?.buildOutput?.bytes, true, formatBytes);
  row('Build output files', c?.buildOutput?.files, s?.buildOutput?.files, true, (v) => v.toLocaleString());
  lines.push('');

  // detailed tables
  for (const r of results) {
    lines.push(`## ${r.name} (\`${r.key}\`)`);
    lines.push('');
    if (r.error) {
      lines.push(`> WARNING: Error: ${r.error}`);
      lines.push('');
    }
    lines.push(`- **Fixture dir:** \`${sanitizeString(r.dir).replace(/\\/g, '/')}\``);
    lines.push(`- **Dependencies:** ${r.nodeModules.deps} deps, ${r.nodeModules.devDeps} devDeps`);
    lines.push(`- **node_modules:** ${formatBytes(r.nodeModules.bytes)} - ${r.nodeModules.files.toLocaleString()} files - lock ${formatBytes(r.nodeModules.lockBytes)}`);
    if (r.build) {
      const cold = r.build.cold;
      lines.push(`- **Cold build:** avg ${cold.avg != null ? formatMs(cold.avg) : '-'} - median ${cold.median != null ? formatMs(cold.median) : '-'} - min ${cold.min != null ? formatMs(cold.min) : '-'} - max ${cold.max != null ? formatMs(cold.max) : '-'} - runs [${cold.times.map((v) => (v == null ? 'fail' : formatMs(v))).join(', ')}]`);
      if (r.build.warm) {
        const warm = r.build.warm;
        lines.push(`- **Warm build:** avg ${formatMs(warm.avg)} - median ${formatMs(warm.median)} - min ${formatMs(warm.min)} - max ${formatMs(warm.max)} - runs [${warm.times.map((v) => formatMs(v)).join(', ')}]`);
      }
      if (r.build.error) lines.push(`- **Build error:** \`${r.build.error.slice(0, 200)}\``);
    }
    lines.push(`- **Build output (\`${r.buildOutput.dir}\`):** ${formatBytes(r.buildOutput.bytes)} - ${r.buildOutput.files} files - ${r.buildOutput.exists ? 'exists' : 'MISSING'}`);
    if (r.buildOutput.breakdown) {
      const b = r.buildOutput.breakdown;
      lines.push(`  - JS: ${formatBytes(b.js)} - CSS: ${formatBytes(b.css)} - HTML: ${formatBytes(b.html)} - SVG: ${formatBytes(b.svg)} - JPG: ${formatBytes(b.jpg)} - other: ${formatBytes(b.other)}`);
    }
    if (r.buildOutput.largest?.length) {
      lines.push(`  - Largest: ${r.buildOutput.largest.map((x) => `${x.file} (${formatBytes(x.size)})`).join(', ')}`);
    }
    if (r.dev) {
      lines.push(`- **Dev startup (port ${FIXTURES[r.key].devPort}):** ${r.dev.success ? formatMs(r.dev.ms) + ` (${r.dev.source})` : `FAILED (${r.dev.error})`}`);
    }
    if (r.cache) {
      lines.push(`- **Cache:** ${Object.entries(r.cache).map(([k, v]) => `${k}: ${formatBytes(v.bytes)} (${v.files} files)`).join(', ')}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('### How to reproduce');
  lines.push('');
  lines.push('```bash');
  lines.push('npm run bench        # full (3 cold + 3 warm + dev)');
  lines.push('npm run bench:quick  # 1 cold, no dev');
  lines.push('node bench.mjs --runs=5 --verbose');
  lines.push('node bench.mjs --fixture=chocola --skip-dev');
  lines.push('```');
  lines.push('');
  return lines.join('\n');
}

function printConsoleTable(results) {
  const c = results.find((r) => r.key === 'chocola');
  const s = results.find((r) => r.key === 'sveltekit');

  const rows = [
    ['Metric', 'Chocola', 'SvelteKit', 'Winner'],
    ['─'.repeat(22), '─'.repeat(14), '─'.repeat(14), '─'.repeat(12)],
  ];

  function add(metric, cVal, sVal, fmt, lowerIsBetter = true) {
    const cf = cVal == null ? '-' : fmt(cVal);
    const sf = sVal == null ? '-' : fmt(sVal);
    let winner = '-';
    if (cVal != null && sVal != null) {
      if (cVal === sVal) winner = 'tie';
      else winner = lowerIsBetter ? (cVal < sVal ? 'Chocola' : 'SvelteKit') : (cVal > sVal ? 'Chocola' : 'SvelteKit');
    }
    rows.push([metric, cf, sf, winner]);
  }

  add('Cold build avg', c?.build?.cold?.avg, s?.build?.cold?.avg, formatMs);
  add('Cold median', c?.build?.cold?.median, s?.build?.cold?.median, formatMs);
  add('Warm build avg', c?.build?.warm?.avg, s?.build?.warm?.avg, formatMs);
  add('Dev startup', c?.dev?.ms, s?.dev?.ms, formatMs);
  add('node_modules', c?.nodeModules?.bytes, s?.nodeModules?.bytes, formatBytes);
  add('Build output', c?.buildOutput?.bytes, s?.buildOutput?.bytes, formatBytes);
  add('Output files', c?.buildOutput?.files, s?.buildOutput?.files, (v) => String(v));
  add('NM files', c?.nodeModules?.files, s?.nodeModules?.files, (v) => v.toLocaleString());

  const widths = [28, 22, 22, 14];
  for (const r of rows) {
    console.log(
      r.map((v, i) => String(v).padEnd(widths[i])).join(' | ')
    );
  }
  console.log('');
  for (const r of results) {
    console.log(`${r.name}:`);
    if (r.build) {
      const cold = r.build.cold;
      console.log(`  cold: avg ${cold.avg != null ? formatMs(cold.avg) : '—'} median ${cold.median != null ? formatMs(cold.median) : '—'} min ${cold.min != null ? formatMs(cold.min) : '—'} max ${cold.max != null ? formatMs(cold.max) : '—'}`);
      if (r.build.warm) console.log(`  warm: avg ${formatMs(r.build.warm.avg)} median ${formatMs(r.build.warm.median)}`);
    }
    console.log(`  node_modules: ${formatBytes(r.nodeModules.bytes)} (${r.nodeModules.files} files)`);
    console.log(`  build output (${r.buildOutput.dir}): ${formatBytes(r.buildOutput.bytes)} (${r.buildOutput.files} files)`);
    if (r.dev) console.log(`  dev startup: ${r.dev.success ? formatMs(r.dev.ms) : 'FAILED ' + r.dev.error}`);
    console.log('');
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const startAll = performance.now();

  const keys = opts.fixture ? [opts.fixture] : Object.keys(FIXTURES);
  for (const k of keys) if (!FIXTURES[k]) { console.error(`Unknown fixture: ${k}`); process.exit(1); }

  console.log(`\nBenchmark — Chocola vs SvelteKit`);
  console.log(`Node ${process.version} — ${os.platform()} ${os.arch()} — ${os.cpus()[0]?.model || ''} x${os.cpus().length}`);
  console.log(`Runs: ${opts.runs} cold${opts.coldOnly ? '' : ' + warm'} per fixture — fixtures: ${keys.join(', ')}${opts.skipDev ? ' (skip dev)' : ''}${opts.skipBuild ? ' (skip build)' : ''}\n`);

  const results = [];
  for (const k of keys) {
    const r = await benchFixture(k, opts);
    results.push(r);
  }

  const meta = {
    date: new Date().toISOString(),
    node: process.version,
    npm: (() => { try { return execSync('npm --version', { encoding: 'utf8' }).trim(); } catch { return null; } })(),
    platform: `${os.platform()} ${os.arch()}`,
    cpu: os.cpus()[0]?.model || null,
    cpus: os.cpus().length,
    totalMem: os.totalmem(),
    runs: opts.runs,
    opts,
    durationMs: performance.now() - startAll,
  };

  const payload = { meta, results };

  // Output handling
  if (opts.json || opts.markdown) {
    if (opts.json) {
      const json = JSON.stringify(payload, null, 2);
      if (opts.out) {
        await fs.promises.writeFile(path.resolve(opts.out), json, 'utf8');
        console.log(`JSON written to ${opts.out}`);
      } else {
        console.log(json);
      }
    }
    if (opts.markdown) {
      const md = buildReport(results, meta);
      if (opts.out && !opts.json) {
        await fs.promises.writeFile(path.resolve(opts.out), md, 'utf8');
        console.log(`Markdown written to ${opts.out}`);
      } else if (opts.markdown && !opts.json) {
        console.log(md);
      } else if (opts.json && opts.markdown) {
        // both: write markdown to REPORT.md
        const mdPath = path.join(__dirname, 'REPORT.md');
        await fs.promises.writeFile(mdPath, md, 'utf8');
        console.log(`Markdown also written to ${mdPath}`);
      }
    }
  } else {
    // default: console table + write files
    printConsoleTable(results);

    const jsonPath = path.join(__dirname, 'results.json');
    await fs.promises.writeFile(jsonPath, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`Results written to ${path.relative(process.cwd(), jsonPath)}`);

    const md = buildReport(results, meta);
    const mdPath = path.join(__dirname, 'REPORT.md');
    await fs.promises.writeFile(mdPath, md, 'utf8');
    console.log(`Report written to ${path.relative(process.cwd(), mdPath)}`);

    if (opts.out) {
      await fs.promises.writeFile(path.resolve(opts.out), JSON.stringify(payload, null, 2), 'utf8');
      console.log(`Also written to ${opts.out}`);
    }
  }

  // exit code: fail if any build/dev failed
  const anyFail = results.some((r) => r.build?.error || (r.dev && !r.dev.success && !opts.skipDev));
  if (anyFail && !opts.skipDev) {
    // don't fail hard, just warn
    console.warn('\nWarning: some measurements failed — see report for details');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
