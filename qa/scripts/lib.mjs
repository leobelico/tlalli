import { chromium } from 'playwright';
import pg from 'pg';
// QA_BASE lets the suite run on another port when Windows reserves 3010 (Hyper-V excluded range).
export const BASE = process.env.QA_BASE || 'http://localhost:3010';
import { fileURLToPath } from 'url';
export const SHOTS = fileURLToPath(new URL('../capturas/', import.meta.url));
export async function browser() { return chromium.launch(); }
export async function login(b, email, { width = 1280, height = 800, password = 'Demo1234!' } = {}) {
  const ctx = await b.newContext({ viewport: { width, height }, locale: 'es-MX' });
  const p = await ctx.newPage();
  await p.goto(BASE + '/login');
  await p.fill('input[name=email]', email);
  await p.fill('input[name=password]', password);
  await Promise.all([p.waitForURL(/\/app/, { timeout: 30000 }), p.click('button[type=submit]')]);
  return { ctx, p };
}
export async function shot(p, name, full = true) { await p.screenshot({ path: SHOTS + name + '.png', fullPage: full }); }
export async function submitForm(p, buttonText, scope) {
  const root = scope ? p.locator(scope) : p;
  await root.getByRole('button', { name: buttonText }).first().click();
  await p.waitForLoadState('networkidle').catch(() => {});
  await p.waitForTimeout(900);
}
export async function msgs(p) {
  return (await p.locator('.text-red-700, .text-red-600, [role=alert], .text-green-700, .text-emerald-700, p.text-sm').allInnerTexts()).filter(t => t.trim()).join(' | ').slice(0, 800);
}

export async function sql(q, params = []) {
  const c = new pg.Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' });
  await c.connect();
  try { return (await c.query(q, params)).rows; } finally { await c.end(); }
}
export const orgOf = async (email) =>
  (await sql('select m.organization_id id from memberships m join users u on u.id=m.user_id where u.email=$1 limit 1', [email]))[0]?.id;
export const leadByPhone = async (orgId, phone) =>
  (await sql('select id from leads where organization_id=$1 and phone=$2', [orgId, phone]))[0]?.id;
