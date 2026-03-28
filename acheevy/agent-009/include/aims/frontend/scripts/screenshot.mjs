/**
 * A.I.M.S. Screenshot Utility
 * Uses puppeteer-core with your existing Chrome installation.
 * No browser download needed — no $HOME issues.
 *
 * Usage:
 *   npm run screenshot                          # screenshots localhost:3000
 *   npm run screenshot -- --url /chat           # screenshots localhost:3000/chat
 *   npm run screenshot -- --url /dashboard      # screenshots localhost:3000/dashboard
 *   npm run screenshot -- --all                 # screenshots all main pages
 */

import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync } from 'fs';
import { resolve, join } from 'path';

// Find Chrome or Edge on Windows
const BROWSER_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

function findBrowser() {
  for (const p of BROWSER_PATHS) {
    if (existsSync(p)) return p;
  }
  return null;
}

const PAGES = [
  { path: '/', name: 'landing' },
  { path: '/auth/sign-in', name: 'sign-in' },
  { path: '/onboarding', name: 'onboarding' },
  { path: '/dashboard', name: 'dashboard' },
  { path: '/chat', name: 'chat' },
];

async function screenshot(browser, baseUrl, pagePath, name, outDir) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const url = `${baseUrl}${pagePath}`;
  console.log(`  Capturing: ${url}`);

  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });
  } catch {
    // networkidle0 can timeout if there are persistent connections; domcontentloaded is fine
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
  }

  // Brief wait for CSS animations to settle
  await new Promise(r => setTimeout(r, 1500));

  const filePath = join(outDir, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`  Saved: ${filePath}`);
  await page.close();
}

async function main() {
  const args = process.argv.slice(2);
  const baseUrl = 'http://localhost:3000';
  const outDir = resolve('screenshots');

  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const browserPath = findBrowser();
  if (!browserPath) {
    console.error('No Chrome or Edge found. Install Chrome or set CHROME_PATH.');
    process.exit(1);
  }

  console.log(`Using browser: ${browserPath}`);
  console.log(`Output: ${outDir}\n`);

  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    if (args.includes('--all')) {
      for (const p of PAGES) {
        await screenshot(browser, baseUrl, p.path, p.name, outDir);
      }
    } else {
      const urlFlag = args.indexOf('--url');
      const pagePath = urlFlag !== -1 && args[urlFlag + 1] ? args[urlFlag + 1] : '/';
      const name = pagePath.replace(/\//g, '-').replace(/^-/, '') || 'landing';
      await screenshot(browser, baseUrl, pagePath, name, outDir);
    }

    console.log('\nDone.');
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('Screenshot failed:', err.message);
  process.exit(1);
});
