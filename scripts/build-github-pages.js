#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = path.join(root, ".site");
const repository = process.env.GITHUB_REPOSITORY || "hcc-srcy/hcccr";
const repositoryName = repository.split("/").pop();
const configuredBase = process.env.PAGES_BASE_PATH || `/${repositoryName}`;
const basePath = configuredBase === "/" ? "" : `/${configuredBase.replace(/^\/+|\/+$/g, "")}`;
const entries = [
  "admin",
  "assets",
  "css",
  "js",
  "index.html",
  "LICENSE",
  "survey-detail.html",
  "surveys.html",
  "terms.html",
];

if (path.basename(output) !== ".site") throw new Error("Refusing to clean an unexpected output path");
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

for (const entry of entries) {
  fs.cpSync(path.join(root, entry), path.join(output, entry), { recursive: true });
}

function pagesPath(value) {
  const match = value.match(/^([^?#]*)(.*)$/);
  const pathname = match[1];
  const suffix = match[2] || "";
  const mapped = ({ "/surveys": "/surveys.html", "/terms": "/terms.html" })[pathname] || pathname;
  return `${basePath}${mapped}${suffix}`;
}

function transformHtml(file) {
  const source = fs.readFileSync(file, "utf8");
  const transformed = source.replace(/\b(href|src)="(\/(?!\/)[^"]*)"/g, (full, attribute, value) => (
    `${attribute}="${pagesPath(value)}"`
  ));
  fs.writeFileSync(file, transformed);
}

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(target);
    else if (target.endsWith(".html")) transformHtml(target);
  }
}

walk(output);

const runtimeConfig = path.join(output, "js", "env.js");
fs.appendFileSync(runtimeConfig, `
window.HCCCR_ENV.BASE_PATH = ${JSON.stringify(basePath)};
window.HCCCR_ENV.GITHUB_PAGES = true;
`);
fs.copyFileSync(path.join(output, "survey-detail.html"), path.join(output, "404.html"));
fs.writeFileSync(path.join(output, ".nojekyll"), "");

const unresolved = [];
walkForUnresolved(output);
if (unresolved.length) {
  throw new Error(`Unresolved root-relative URLs:\n${unresolved.join("\n")}`);
}

function walkForUnresolved(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walkForUnresolved(target);
    else if (target.endsWith(".html")) {
      const html = fs.readFileSync(target, "utf8");
      const rootRelativeUrls = [...html.matchAll(/\b(?:href|src)="(\/(?!\/)[^"]*)"/g)].map((match) => match[1]);
      if (rootRelativeUrls.some((url) => basePath && !url.startsWith(`${basePath}/`))) {
        unresolved.push(path.relative(output, target));
      }
    }
  }
}

console.log(`GitHub Pages artifact created at ${output} with base path ${basePath || "/"}.`);
