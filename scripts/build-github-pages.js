#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = path.join(root, ".site");
const repository = process.env.GITHUB_REPOSITORY || "hcc-srcy/hcccr";
const [repositoryOwner, repositoryName] = repository.split("/");
const configuredBase = process.env.PAGES_BASE_PATH || `/${repositoryName}`;
const basePath = configuredBase === "/" ? "" : `/${configuredBase.replace(/^\/+|\/+$/g, "")}`;
const customDomain = String(process.env.PAGES_CUSTOM_DOMAIN || "").trim().toLowerCase();
const supabaseUrl = String(process.env.HCCCR_SUPABASE_URL || "").trim();
const supabaseAnonKey = String(process.env.HCCCR_SUPABASE_ANON_KEY || "").trim();
const sourceOrigin = "https://hcccr.bond";
const publicOrigin = customDomain ? `https://${customDomain}` : `https://${repositoryOwner}.github.io${basePath}`;
const entries = [
  "admin",
  "assets",
  "css",
  "js",
  "contact.html",
  "index.html",
  "LICENSE",
  "message-thread.html",
  "proposals.html",
  "rights.html",
  "robots.txt",
  "sitemap.xml",
  "survey-detail.html",
  "surveys.html",
  "team.html",
  "team-member.html",
  "terms.html",
];

if (path.basename(output) !== ".site") throw new Error("Refusing to clean an unexpected output path");

function pagesPath(value) {
  const match = value.match(/^([^?#]*)(.*)$/);
  const pathname = match[1];
  const suffix = match[2] || "";
  const mapped = ({ "/contact": "/contact.html", "/surveys": "/surveys.html", "/terms": "/terms.html" })[pathname] || pathname;
  return `${basePath}${mapped}${suffix}`;
}

function transformHtml(file) {
  const source = fs.readFileSync(file, "utf8");
  const transformed = source.replace(/\b(href|src)="(\/(?!\/)[^"]*)"/g, (full, attribute, value) => (
    `${attribute}="${pagesPath(value)}"`
  )).replaceAll(sourceOrigin, publicOrigin);
  fs.writeFileSync(file, transformed);
}

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(target);
    else if (target.endsWith(".html")) transformHtml(target);
  }
}

function walkForUnresolved(directory, unresolved) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walkForUnresolved(target, unresolved);
    else if (target.endsWith(".html")) {
      const html = fs.readFileSync(target, "utf8");
      const rootRelativeUrls = [...html.matchAll(/\b(?:href|src)="(\/(?!\/)[^"]*)"/g)].map((match) => match[1]);
      if (rootRelativeUrls.some((url) => basePath && !url.startsWith(`${basePath}/`))) {
        unresolved.push(path.relative(output, target));
      }
    }
  }
}

function isCurrentlyPublic(form) {
  const now = Date.now();
  return form?.visibility === "public"
    && form.is_open === true
    && (!form.start_date || new Date(form.start_date).getTime() <= now)
    && (!form.end_date || new Date(form.end_date).getTime() >= now);
}

async function getPublicSurveys() {
  if (!supabaseUrl || !supabaseAnonKey) return [];
  try {
    const response = await fetch(`${supabaseUrl.replace(/\/+$/, "")}/rest/v1/rpc/list_public_forms`, {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        "Content-Type": "application/json",
      },
      body: "{}",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const forms = await response.json();
    return Array.isArray(forms) ? forms.filter(isCurrentlyPublic) : [];
  } catch (error) {
    console.warn(`Could not load public surveys for sitemap: ${error.message}`);
    return [];
  }
}

function xmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function createSitemap(forms) {
  const staticUrls = ["/", "/surveys.html", "/contact.html", "/terms.html"].map((pathname) => ({
    loc: `${publicOrigin}${pathname}`,
  }));
  const surveyUrls = forms.map((form) => ({
    loc: `${publicOrigin}/survey-detail.html?id=${encodeURIComponent(form.slug || form.id)}`,
    lastmod: form.updated_at ? String(form.updated_at).slice(0, 10) : "",
  }));
  const urls = [...staticUrls, ...surveyUrls].map(({ loc, lastmod }) => (
    `  <url>\n    <loc>${xmlEscape(loc)}</loc>${lastmod ? `\n    <lastmod>${xmlEscape(lastmod)}</lastmod>` : ""}\n  </url>`
  )).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

async function build() {
  if (customDomain && !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(customDomain)) {
    throw new Error("PAGES_CUSTOM_DOMAIN is not a valid hostname");
  }

  fs.rmSync(output, { recursive: true, force: true });
  fs.mkdirSync(output, { recursive: true });
  for (const entry of entries) {
    fs.cpSync(path.join(root, entry), path.join(output, entry), { recursive: true });
  }
  walk(output);

  const runtimeConfig = path.join(output, "js", "env.js");
  fs.appendFileSync(runtimeConfig, `
window.HCCCR_ENV.BASE_PATH = ${JSON.stringify(basePath)};
window.HCCCR_ENV.GITHUB_PAGES = true;
window.HCCCR_ENV.SUPABASE_URL = ${JSON.stringify(supabaseUrl)};
window.HCCCR_ENV.SUPABASE_ANON_KEY = ${JSON.stringify(supabaseAnonKey)};
window.HCCCR_ENV.SITE_URL = ${JSON.stringify(publicOrigin)};
`);

  const publicSurveys = await getPublicSurveys();
  fs.writeFileSync(path.join(output, "robots.txt"), `User-agent: *\nAllow: ${basePath ? `${basePath}/` : "/"}\nDisallow: ${basePath}/admin/\nSitemap: ${publicOrigin}/sitemap.xml\n`);
  fs.writeFileSync(path.join(output, "sitemap.xml"), createSitemap(publicSurveys));
  fs.copyFileSync(path.join(output, "survey-detail.html"), path.join(output, "404.html"));
  fs.writeFileSync(path.join(output, ".nojekyll"), "");
  if (customDomain) fs.writeFileSync(path.join(output, "CNAME"), `${customDomain}\n`);

  const unresolved = [];
  walkForUnresolved(output, unresolved);
  if (unresolved.length) {
    throw new Error(`Unresolved root-relative URLs:\n${unresolved.join("\n")}`);
  }
  console.log(`GitHub Pages artifact created at ${output} for ${publicOrigin}.`);
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
