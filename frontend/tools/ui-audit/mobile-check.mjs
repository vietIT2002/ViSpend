// Phone-width check through the Chrome DevTools Protocol: emulates a 390px
// device, reports horizontal overflow per page and saves a screenshot.
// Usage: node mobile-check.mjs <outDir> <path> [<path>...]
// Env: CHROME_PATH (default C:/Program Files/Google/Chrome/Application/chrome.exe)
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [outDir, ...paths] = process.argv.slice(2);
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9333;
const LOAD_TIMEOUT_MS = 30_000;
const SETTLE_MS = 1500;
if (!outDir || paths.length === 0) {
  console.error("Usage: node mobile-check.mjs <outDir> <path> [<path>...]");
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = mkdtempSync(join(tmpdir(), "mcheck-"));
let chrome;
let ws;
let failed = false;

function cleanup() {
  try { ws?.close(); } catch {}
  try { chrome?.kill(); } catch {}
  try { rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch {}
}

// Watchdog: never hang a verification run (e.g. Vite re-optimising dependencies on a cold start).
setTimeout(() => { console.error("mobile-check timed out after 180s"); cleanup(); process.exit(1); }, 180_000).unref();

try {
  const spawnError = new Promise((_, reject) => {
    chrome = spawn(CHROME, [
      "--headless=new", "--disable-gpu", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
      "--force-prefers-reduced-motion", "about:blank",
    ], { stdio: "ignore" });
    chrome.on("error", (e) => reject(new Error(`could not start Chrome at "${CHROME}" (${e.message}). Set CHROME_PATH to chrome.exe.`)));
  });
  spawnError.catch(() => {}); // surfaced through the race below

  const findTarget = async () => {
    for (let i = 0; i < 50; i++) {
      await sleep(200);
      try {
        const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
        const t = list.find((x) => x.type === "page");
        if (t) return t;
      } catch {}
    }
    throw new Error(`Chrome did not expose a page target on port ${PORT}. Check CHROME_PATH (now "${CHROME}") and that no other Chrome uses port ${PORT}.`);
  };
  const target = await Promise.race([findTarget(), spawnError]);

  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", () => reject(new Error("DevTools websocket connection failed")), { once: true });
  });
  let id = 0;
  const pending = new Map();
  const listeners = new Set();
  ws.addEventListener("message", (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    else listeners.forEach((fn) => fn(msg));
  });
  const send = (method, params = {}) => new Promise((resolve) => { id += 1; pending.set(id, resolve); ws.send(JSON.stringify({ id, method, params })); });
  const loaded = () => new Promise((resolve, reject) => {
    const timer = setTimeout(() => { listeners.delete(fn); reject(new Error(`page did not finish loading in ${LOAD_TIMEOUT_MS / 1000}s`)); }, LOAD_TIMEOUT_MS);
    const fn = (msg) => { if (msg.method === "Page.loadEventFired") { clearTimeout(timer); listeners.delete(fn); resolve(); } };
    listeners.add(fn);
  });

  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  for (const path of paths) {
    try {
      const done = loaded();
      const nav = await send("Page.navigate", { url: `http://localhost:5179${path}` });
      if (nav.error || nav.result?.errorText) throw new Error(`navigation failed: ${nav.error?.message ?? nav.result.errorText} (is "npm run audit:serve" running?)`);
      await done;
      await sleep(SETTLE_MS); // let the SPA fetch data and render
      const r = await send("Runtime.evaluate", {
        returnByValue: true,
        expression: `(() => {
          const vw = document.documentElement.clientWidth;
          const wide = [...document.querySelectorAll('body *')].filter(el => {
            const b = el.getBoundingClientRect();
            if (!(b.width > 0 && b.right > vw + 1)) return false;
            if (getComputedStyle(el).position === 'fixed') return false;
            for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
              if (getComputedStyle(p).overflowX !== 'visible') return false;
            }
            return true;
          }).slice(0, 5).map(el => el.tagName.toLowerCase() + '.' + String(el.className).split(' ').slice(0, 4).join('.') + ' right=' + Math.round(el.getBoundingClientRect().right));
          return { vw, scrollWidth: document.documentElement.scrollWidth, wide };
        })()`,
      });
      if (r.error || r.result?.exceptionDetails || !r.result?.result?.value) {
        throw new Error(`could not measure the page: ${r.error?.message ?? r.result?.exceptionDetails?.text ?? "no value returned"}`);
      }
      const v = r.result.result.value;
      console.log(`${path}  viewport ${v.vw}px  scrollWidth ${v.scrollWidth}px  ${v.scrollWidth > v.vw ? "OVERFLOW" : "ok"}`);
      v.wide.forEach((w) => console.log("   wider than viewport:", w));
      const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      if (shot.result?.data) writeFileSync(join(outDir, `m${path.replace(/[^A-Za-z0-9]+/g, "-") || "-home"}.png`), Buffer.from(shot.result.data, "base64"));
    } catch (e) {
      failed = true;
      console.log(`${path}  ERROR ${e.message}`);
    }
  }
} catch (e) {
  failed = true;
  console.error(`mobile-check failed: ${e.message}`);
} finally {
  cleanup();
}
process.exit(failed ? 1 : 0);
