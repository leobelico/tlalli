import { chromium } from 'playwright';
export const BASE = 'http://localhost:3010';
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
