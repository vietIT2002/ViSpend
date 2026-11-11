// Phone-width check through the Chrome DevTools Protocol: emulates a 390px
// device, reports horizontal overflow per page and saves a screenshot.
// Usage: node mobile-check.mjs <outDir> <path> [<path>...]
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [outDir, ...paths] = process.argv.slice(2);
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9333;
if (!outDir || paths.length === 0) {
  console.error("Usage: node mobile-check.mjs <outDir> <path> [<path>...]");
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });
const profile = mkdtempSync(join(tmpdir(), "mcheck-"));
const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  "--force-prefers-reduced-motion", "about:blank",
], { stdio: "ignore" });

// Watchdog: never hang a verification run (e.g. Vite re-optimising dependencies on a cold start).
setTimeout(() => { console.error("mobile-check timed out after 120s"); chrome.kill(); process.exit(1); }, 120_000).unref();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    target = list.find((t) => t.type === "page");
  } catch {}
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0;
const pending = new Map();
ws.addEventListener("message", (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
});
const send = (method, params = {}) => new Promise((resolve) => { id += 1; pending.set(id, resolve); ws.send(JSON.stringify({ id, method, params })); });

await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
for (const path of paths) {
  await send("Page.navigate", { url: `http://localhost:5179${path}` });
  await sleep(4000);
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
  const v = r.result.result.value;
  console.log(`${path}  viewport ${v.vw}px  scrollWidth ${v.scrollWidth}px  ${v.scrollWidth > v.vw ? "OVERFLOW" : "ok"}`);
  v.wide.forEach((w) => console.log("   wider than viewport:", w));
  const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  writeFileSync(join(outDir, `m${path.replace(/\W+/g, "-") || "-home"}.png`), Buffer.from(shot.result.data, "base64"));
}
ws.close();
chrome.kill();
