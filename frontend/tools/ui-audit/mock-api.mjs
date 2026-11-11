// Mock ViSpend API with fixture data, for the UI audit only. In-memory, resets on restart.
import http from "node:http";
import { randomUUID } from "node:crypto";

// Any username signs in with this password; anything else is invalid_credentials.
const PASSWORD = "demo1234";
// 1x1 PNG served as the receipt image.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const PORT = Number(process.env.MOCK_PORT || 5181);
const TODAY = "2026-11-11";

const user = {
  id: "u1", username: "lan", email: "lan@example.com", full_name: "Nguyễn Thị Lan",
  phone: "0903123456", language: "vi", is_verified: true, is_google: false,
};

const cat = (n, name, type, icon, color, key = null) => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`, name, type, icon, color, key, is_default: key !== null,
});
const categories = [
  cat(1, "Food", "expense", "food", "#b94d47", "food"),
  cat(2, "Transport", "expense", "bus", "#1f6c9f", "transport"),
  cat(3, "Shopping", "expense", "cart", "#7a5c9e", "shopping"),
  cat(4, "Bills", "expense", "bill", "#956400", "bills"),
  cat(5, "Health", "expense", "pill", "#0f766e", "health"),
  cat(6, "Cà phê", "expense", "coffee", "#b5651d"),
  cat(7, "Phòng gym", "expense", "dumbbell", "#5b6770"),
  cat(8, "Salary", "income", "wallet", "#217a4b", "salary"),
  cat(9, "Freelance", "income", "coins", "#3cb371", "freelance"),
  // 60 characters, to exercise truncation
  cat(10, "Chi phí sinh hoạt gia đình và các khoản phát sinh hàng tháng", "expense", "tag", "#7f6a3d"),
];
const byName = Object.fromEntries(categories.map((c) => [c.icon, c.id]));

// Deterministic pseudo-random
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

const acct = (n, name, type, opening, extra = {}) => ({
  id: `00000000-0000-4000-9000-${String(n).padStart(12, "0")}`, name, type, opening_balance: `${opening}.00`,
  brand: null, icon: null, color: null, archived: false, ...extra,
});
const accounts = [
  acct(1, "Tiền mặt", "cash", 8000000, { icon: "wallet" }),
  acct(2, "Vietcombank", "bank", 15000000, { brand: "vietcombank" }),
  acct(3, "MoMo", "ewallet", 8000000, { brand: "momo" }),
  acct(4, "Thẻ tín dụng Techcombank", "credit", 0, { brand: "techcombank" }),
  acct(5, "Sổ tiết kiệm dài hạn", "bank", 12450000000, { color: "#217a4b" }), // no transactions: deletable
  acct(6, "Ví cũ (đã đóng)", "ewallet", 0, { archived: true }),
];
const transfers = [];
const addTransfer = (from, to, amount, date, note) => transfers.push({
  id: randomUUID(), from_account_id: from, to_account_id: to, amount: `${amount}.00`, occurred_on: date, note: note || null,
  created_at: `${date}T10:00:00Z`,
});
addTransfer(accounts[1].id, accounts[0].id, 3000000, "2026-11-02", "Rút tiền mặt");
function balanceOf(a) {
  let b = Number(a.opening_balance);
  for (const t of transactions) if (t.account_id === a.id) b += t.type === "income" ? Number(t.amount) : -Number(t.amount);
  for (const t of transfers) { if (t.from_account_id === a.id) b -= Number(t.amount); if (t.to_account_id === a.id) b += Number(t.amount); }
  return b;
}
const accountView = (a) => ({ ...a, balance: `${balanceOf(a)}.00` });

const transactions = [];
const notes = ["Phở bò", "Grab về nhà", "Tiền điện tháng 10", "Siêu thị Co.opmart", "Cà phê với đồng nghiệp", "", "Thuốc cảm", "Áo khoác", ""];
function addTxn(date, type, catId, amount, note, createdAt) {
  const pool = type === "income" ? [accounts[1]] : [accounts[0], accounts[1], accounts[2], accounts[3]];
  transactions.push({
    id: randomUUID(), type, amount: `${amount}.00`, category_id: catId, account_id: pool[Math.floor(rnd() * pool.length)].id, occurred_on: date,
    method: ["cash", "transfer", "card"][Math.floor(rnd() * 3)], note: note || null,
    created_at: createdAt ?? `${date}T09:30:00Z`, has_receipt: rnd() > 0.8,
  });
}
const expenseCats = categories.filter((c) => c.type === "expense" && c.icon !== "tag");
for (let d = 1; d <= 41; d++) {
  const day = new Date(Date.UTC(2026, 9, d)); // Oct 1 .. Nov 10
  const iso = day.toISOString().slice(0, 10);
  const n = 2 + Math.floor(rnd() * 3); // ~3 a day, ~125 rows in total
  for (let i = 0; i < n; i++) {
    const c = expenseCats[Math.floor(rnd() * expenseCats.length)];
    addTxn(iso, "expense", c.id, Math.round((20 + rnd() * 480)) * 1000, notes[Math.floor(rnd() * notes.length)]);
  }
}
addTxn("2026-10-05", "income", byName.wallet, 25000000, "Lương tháng 9");
addTxn("2026-11-05", "income", byName.wallet, 25000000, "Lương tháng 10");
addTxn("2026-11-08", "income", byName.coins, 3500000, "Dự án logo");
// Recorded within the last 24 hours: still editable.
addTxn("2026-11-11", "expense", byName.food, 85000, "Bún chả", new Date(Date.now() - 2 * 3600_000).toISOString());
addTxn("2026-11-11", "expense", byName.coffee, 45000, "Bạc xỉu", new Date(Date.now() - 30 * 60_000).toISOString());
transactions.sort((a, b) => (a.occurred_on < b.occurred_on ? 1 : a.occurred_on > b.occurred_on ? -1 : a.created_at < b.created_at ? 1 : -1));

const allocations = {
  "2026-11": [
    { id: randomUUID(), category_id: byName.food, amount: "3000000.00", effective_from: "2026-11-01" },
    { id: randomUUID(), category_id: byName.bus, amount: "800000.00", effective_from: "2026-11-01" },
    { id: randomUUID(), category_id: byName.coffee, amount: "400000.00", effective_from: "2026-11-01" },
    { id: randomUUID(), category_id: byName.cart, amount: "2500000.00", effective_from: "2026-11-06" },
  ],
  "2026-10": [
    { id: randomUUID(), category_id: byName.food, amount: "3000000.00", effective_from: "2026-10-01" },
    { id: randomUUID(), category_id: byName.bill, amount: "1500000.00", effective_from: "2026-10-01" },
  ],
};

const inRange = (t, from, to) => (!from || t.occurred_on >= from) && (!to || t.occurred_on <= to);
const sum = (list, type) => list.filter((t) => t.type === type).reduce((s, t) => s + Number(t.amount), 0);
const lastDay = (month) => { const [y, m] = month.split("-").map(Number); return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10); };

function alertFor(spent, limit) {
  if (limit <= 0) return "safe";
  const r = spent / limit;
  return r >= 1 ? "over" : r >= 0.9 ? "tight" : r >= 0.7 ? "watch" : "safe";
}

function plan(month) {
  const from = `${month}-01`, to = lastDay(month);
  const items = (allocations[month] ?? []).map((a) => {
    const c = categories.find((x) => x.id === a.category_id);
    const spentAll = transactions.filter((t) => t.category_id === a.category_id && t.type === "expense" && inRange(t, from, to));
    const spent = spentAll.filter((t) => t.occurred_on >= a.effective_from).reduce((s, t) => s + Number(t.amount), 0);
    const before = spentAll.filter((t) => t.occurred_on < a.effective_from).reduce((s, t) => s + Number(t.amount), 0);
    const limit = Number(a.amount);
    return {
      id: a.id, category_id: a.category_id, category: c.name, color: c.color, amount: a.amount,
      effective_from: a.effective_from, spent: `${spent}.00`, spent_before_effective: `${before}.00`,
      remaining: `${limit - spent}.00`, usage_percent: Math.round((spent / limit) * 100), alert: alertFor(spent, limit),
    };
  });
  const budget = items.reduce((s, i) => s + Number(i.amount), 0);
  const spent = items.reduce((s, i) => s + Number(i.spent), 0);
  const list = transactions.filter((t) => t.occurred_on <= to);
  const counts = { safe: 0, watch: 0, tight: 0, over: 0 };
  items.forEach((i) => counts[i.alert]++);
  return {
    month, monthly_budget: `${budget}.00`, available_money: `${sum(list, "income") - sum(list, "expense")}.00`,
    total_spent: `${spent}.00`, total_remaining: `${budget - spent}.00`,
    total_usage_percent: budget ? Math.round((spent / budget) * 100) : 0, total_alert: alertFor(spent, budget),
    alerts: counts, items,
  };
}

function trend(granularity, from, to) {
  const buckets = new Map();
  for (const t of transactions.filter((x) => inRange(x, from, to))) {
    let key = t.occurred_on;
    if (granularity === "month") key = t.occurred_on.slice(0, 7);
    if (granularity === "week") {
      const d = new Date(`${t.occurred_on}T00:00:00Z`);
      const thursday = new Date(d); thursday.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7));
      const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
      key = `${thursday.getUTCFullYear()}-W${String(Math.ceil(((thursday - yearStart) / 86400000 + 1) / 7)).padStart(2, "0")}`;
    }
    const b = buckets.get(key) ?? { period: key, income: 0, expense: 0 };
    b[t.type] += Number(t.amount);
    buckets.set(key, b);
  }
  return [...buckets.values()].sort((a, b) => (a.period < b.period ? -1 : 1)).map((b) => ({ ...b, income: `${b.income}.00`, expense: `${b.expense}.00` }));
}

function send(res, status, body) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(body === undefined ? "" : JSON.stringify(body));
}

function readRaw(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
  });
}
async function readBody(req) {
  const data = await readRaw(req);
  try { return data ? JSON.parse(data) : {}; } catch { return {}; }
}
// Multipart or urlencoded form fields (login sends FormData).
function formFields(raw) {
  const out = {};
  const nl = String.fromCharCode(13) + "?" + String.fromCharCode(10);
  const re = new RegExp('name="([^"]+)"' + nl + nl + "([^" + String.fromCharCode(13, 10) + "]*)", "g");
  for (const m of raw.matchAll(re)) out[m[1]] = m[2];
  if (!Object.keys(out).length) for (const [k, v] of new URLSearchParams(raw)) out[k] = v;
  return out;
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const p = url.pathname.replace(/^\/api/, "");
  const q = Object.fromEntries(url.searchParams);
  const m = req.method;

  if (p === "/auth/login" && m === "POST") {
    const f = formFields(await readRaw(req));
    if (!f.username || f.password !== PASSWORD) return send(res, 401, { detail: "invalid_credentials" });
    return send(res, 200, { access_token: "mock-token", refresh_token: "mock-refresh", token_type: "bearer", user });
  }
  if (p === "/auth/refresh" && m === "POST") {
    const b = await readBody(req);
    if (b.refresh_token !== "mock-refresh") return send(res, 401, { detail: "invalid_token" });
    return send(res, 200, { access_token: "mock-token", refresh_token: "mock-refresh", token_type: "bearer", user });
  }
  if (p === "/auth/register" && m === "POST") {
    const b = await readBody(req);
    if (b.username === user.username) return send(res, 409, { detail: "username_taken" });
    return send(res, 201, { ...user, id: randomUUID(), username: b.username, email: null, full_name: null });
  }
  if (p === "/auth/google" && m === "POST") {
    await readBody(req);
    return send(res, 200, { access_token: "mock-token", refresh_token: "mock-refresh", token_type: "bearer", user });
  }
  if (p === "/auth/forgot-password" && m === "POST") {
    await readBody(req);
    return send(res, 200, { detail: "ok", reset_token: "mock-reset-token" });
  }
  if (p === "/auth/reset-password" && m === "POST") {
    const b = await readBody(req);
    if (b.token !== "mock-reset-token") return send(res, 400, { detail: "invalid_reset_token" });
    return send(res, 200, { detail: "Password has been reset" });
  }
  if (p === "/auth/change-password" && m === "POST") {
    const b = await readBody(req);
    if (b.current_password !== PASSWORD) return send(res, 400, { detail: "current_password_incorrect" });
    return send(res, 200, { detail: "Password updated" });
  }
  if (p === "/health") return send(res, 200, { status: "ok" });
  if (p === "/auth/me" && m === "GET") return send(res, 200, user);
  if (p === "/auth/me" && m === "PATCH") { Object.assign(user, await readBody(req)); return send(res, 200, user); }
  if (p === "/categories" && m === "GET") return send(res, 200, categories);
  if (p === "/categories" && m === "POST") { const b = await readBody(req); const c = { id: randomUUID(), key: null, is_default: false, icon: "tag", color: null, ...b }; categories.push(c); return send(res, 201, c); }
  if (p.startsWith("/categories/") && m === "DELETE") {
    const id = p.split("/")[2];
    if (transactions.some((t) => t.category_id === id)) return send(res, 409, { detail: "category_in_use" });
    const i = categories.findIndex((c) => c.id === id);
    if (i < 0) return send(res, 404, { detail: "category_not_found" });
    categories.splice(i, 1); return send(res, 204);
  }
  if (p === "/transactions/receipt-duplicate") return send(res, 200, { duplicate: false });
  if (p === "/transactions" && m === "GET") {
    const list = transactions.filter((t) => inRange(t, q.from, q.to) && (!q.type || t.type === q.type) && (!q.category_id || t.category_id === q.category_id) && (!q.method || t.method === q.method) && (!q.account_id || t.account_id === q.account_id));
    const page = Number(q.page || 1), size = Math.min(Number(q.page_size || 20), 100);
    return send(res, 200, { items: list.slice((page - 1) * size, page * size), total: list.length, page, page_size: size });
  }
  if (p === "/transactions" && m === "POST") { const b = await readBody(req); const t = { id: randomUUID(), created_at: new Date().toISOString(), has_receipt: false, ...b }; transactions.unshift(t); return send(res, 201, t); }
  if (p.startsWith("/transactions/") && m === "PATCH") {
    const t = transactions.find((x) => x.id === p.split("/")[2]);
    if (!t) return send(res, 404, { detail: "transaction_not_found" });
    Object.assign(t, await readBody(req)); return send(res, 200, t);
  }
  if (p.startsWith("/categories/") && m === "PATCH") {
    const c = categories.find((x) => x.id === p.split("/")[2]);
    if (!c) return send(res, 404, { detail: "category_not_found" });
    Object.assign(c, await readBody(req)); return send(res, 200, c);
  }
  if (p === "/transactions/parse" && m === "POST") {
    const b = await readBody(req);
    const text = String(b.text ?? "");
    const num = text.match(/([0-9]+(?:[.,][0-9]+)?) ?(k|tr|triệu|nghìn)?/i);
    let amount = null;
    if (num) { const mult = /^(k|nghìn)$/i.test(num[2] ?? "") ? 1000 : /^(tr|triệu)$/i.test(num[2] ?? "") ? 1000000 : 1; amount = `${Math.round(Number(num[1].replace(",", ".")) * mult)}.00`; }
    return send(res, 200, { type: "expense", amount, occurred_on: TODAY, category_id: byName.food, note: text || null, method: "cash", confidence: 0.82 });
  }
  const parts = p.split("/"); // ["", "transactions", id, "receipt"]
  const receiptMatch = parts.length === 4 && parts[1] === "transactions" && parts[3] === "receipt" ? parts : null;
  if (receiptMatch && (m === "POST" || m === "GET")) {
    const t = transactions.find((x) => x.id === receiptMatch[2]);
    if (!t) { await readBody(req); return send(res, 404, { detail: "transaction_not_found" }); }
    if (m === "POST") { await readBody(req); t.has_receipt = true; return send(res, 200, t); }
    if (!t.has_receipt) return send(res, 404, { detail: "receipt_not_found" });
    res.writeHead(200, { "content-type": "image/png" }); return res.end(PNG);
  }
  if (p.startsWith("/transactions/") && m === "DELETE") {
    const i = transactions.findIndex((t) => t.id === p.split("/")[2]);
    if (i < 0) return send(res, 404, { detail: "transaction_not_found" });
    transactions.splice(i, 1); return send(res, 204);
  }
  if (p === "/budgets" && m === "GET") return send(res, 200, plan(q.month));
  if (p === "/budgets/allocations" && m === "PUT") {
    const b = await readBody(req); const list = (allocations[b.month] ??= []);
    const found = list.find((a) => a.category_id === b.category_id);
    if (found) found.amount = b.amount; else list.push({ id: randomUUID(), category_id: b.category_id, amount: b.amount, effective_from: b.effective_from ?? `${b.month}-01` });
    return send(res, 200, plan(b.month));
  }
  if (p.startsWith("/budgets/allocations/") && m === "DELETE") {
    const id = p.split("/")[3];
    for (const list of Object.values(allocations)) {
      const i = list.findIndex((a) => a.id === id);
      if (i >= 0) { list.splice(i, 1); return send(res, 204); }
    }
    return send(res, 404, { detail: "allocation_not_found" });
  }
  if (p === "/budgets/copy" && m === "POST") {
    const b = await readBody(req); const src = allocations[b.from_month] ?? [];
    if (!src.length) return send(res, 422, { detail: "budget_nothing_to_copy" });
    const dst = (allocations[b.to_month] ??= []);
    for (const a of src) if (!dst.some((d) => d.category_id === a.category_id)) dst.push({ ...a, id: randomUUID(), effective_from: `${b.to_month}-01` });
    return send(res, 200, plan(b.to_month));
  }
  if (p === "/accounts" && m === "GET") {
    const views = accounts.filter((a) => q.archived === "true" || !a.archived).map(accountView);
    const net = views.filter((a) => !a.archived).reduce((sum, a) => sum + Number(a.balance), 0);
    return send(res, 200, { total_net_worth: `${net}.00`, accounts: views });
  }
  if (p === "/accounts" && m === "POST") {
    const b = await readBody(req);
    const a = { id: randomUUID(), brand: null, icon: null, color: null, archived: false, ...b };
    accounts.push(a); return send(res, 201, accountView(a));
  }
  if (p === "/accounts/transfers" && m === "POST") {
    const b = await readBody(req);
    addTransfer(b.from_account_id, b.to_account_id, Number(b.amount), b.occurred_on, b.note);
    return send(res, 201, transfers[transfers.length - 1]);
  }
  if (p.startsWith("/accounts/") && (m === "PATCH" || m === "DELETE")) {
    const i = accounts.findIndex((x) => x.id === p.split("/")[2]);
    if (i < 0) return send(res, 404, { detail: "account_not_found" });
    if (m === "PATCH") { Object.assign(accounts[i], await readBody(req)); return send(res, 200, accountView(accounts[i])); }
    if (transactions.some((t) => t.account_id === accounts[i].id)) return send(res, 409, { detail: "account_in_use" });
    accounts.splice(i, 1); return send(res, 204);
  }
  if (p === "/dashboard/summary") {
    const list = transactions.filter((t) => inRange(t, q.from, q.to));
    const inc = sum(list, "income"), exp = sum(list, "expense");
    return send(res, 200, { total_income: `${inc}.00`, total_expense: `${exp}.00`, balance: `${inc - exp}.00` });
  }
  if (p === "/dashboard/categories") {
    const cur = transactions.filter((t) => t.type === "expense" && inRange(t, q.from, q.to));
    const total = cur.reduce((s, t) => s + Number(t.amount), 0) || 1;
    const rows = expenseCats.map((c) => {
      const v = cur.filter((t) => t.category_id === c.id).reduce((s, t) => s + Number(t.amount), 0);
      return { category_id: c.id, category: c.name, color: c.color, total: `${v}.00`, percent: Math.round((v / total) * 1000) / 10, prev_total: `${Math.round(v * (0.6 + rnd() * 0.8))}.00` };
    }).filter((r) => Number(r.total) > 0).sort((a, b) => Number(b.total) - Number(a.total));
    return send(res, 200, rows);
  }
  if (p === "/dashboard/trend") return send(res, 200, trend(q.granularity ?? "day", q.from, q.to));
  console.log(`UNHANDLED ${m} ${p}`);
  send(res, 404, { detail: "not_found" });
}).listen(PORT, "127.0.0.1", () => console.log(`mock api on ${PORT}, today ${TODAY}`));
