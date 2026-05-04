"use strict";

const cheerio = require("cheerio-without-node-native");

const DOMAINS_URL = "https://raw.githubusercontent.com/phisher98/TVVVV/refs/heads/main/domains.json";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0",
  "Accept": "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "Connection": "keep-alive"
};

let cachedDomain = null;

/* ---------------- FETCH ---------------- */
async function fetchText(url, options = {}) {
  try {
    const res = await fetch(url, {
      headers: { ...HEADERS, ...(options.headers || {}) },
      redirect: "follow"
    });
    return await res.text();
  } catch {
    return null;
  }
}

/* ---------------- DOMAIN ---------------- */
async function getMainUrl() {
  if (cachedDomain) return cachedDomain;

  try {
    const res = await fetch(DOMAINS_URL);
    const json = await res.json();
    cachedDomain = json["4khdhub"] || json.n4khdhub || "https://4khdhub.dad";
  } catch {
    cachedDomain = "https://4khdhub.dad";
  }

  return cachedDomain;
}

/* ---------------- HELPERS ---------------- */
function normalize(str = "") {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function matchTitle(a, b) {
  const A = normalize(a);
  const B = normalize(b);
  return A === B || A.includes(B) || B.includes(A);
}

function parseQuality(text = "") {
  const t = text.toLowerCase();
  if (/2160|4k|uhd/.test(t)) return "2160p";
  if (/1440/.test(t)) return "1440p";
  if (/1080/.test(t)) return "1080p";
  if (/720/.test(t)) return "720p";
  if (/480/.test(t)) return "480p";
  return "Auto";
}

function dedupe(list) {
  const seen = new Set();
  return list.filter(x => {
    const key = x.url.split("#")[0];
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/* ---------------- SEARCH ---------------- */
async function searchContent(query) {
  const base = await getMainUrl();
  const url = `${base}/?s=${encodeURIComponent(query)}`;

  const html = await fetchText(url);
  if (!html) return null;

  const $ = cheerio.load(html);
  const results = [];

  $("a.movie-card, div.card-grid a").each((_, el) => {
    const href = $(el).attr("href");
    const title = $(el).text().trim();

    if (href && title) {
      results.push({ title, href });
    }
  });

  if (!results.length) return null;

  return (
    results.find(r => matchTitle(r.title, query))?.href ||
    results[0].href
  );
}

/* ---------------- REDIRECT DECODER ---------------- */
function safeAtob(str) {
  try {
    return atob(str);
  } catch {
    return "";
  }
}

async function decodeRedirect(url) {
  const html = await fetchText(url);
  if (!html) return url;

  const patterns = [
    /'o','([^']+)'/,
    /atob\(['"]([^'"]+)['"]\)/,
    /var\s+o\s*=\s*['"]([^'"]+)/
  ];

  for (const p of patterns) {
    const m = html.match(p);
    if (m && m[1]) {
      const decoded = safeAtob(m[1]);
      if (decoded) return decoded;
    }
  }

  return url;
}

/* ---------------- PROVIDERS ---------------- */

async function resolveHubcloud(url) {
  const html = await fetchText(url, { headers: { Referer: url } });
  if (!html) return [];

  const match = html.match(/var\s+url\s*=\s*['"]([^'"]+)/);
  if (!match) return [];

  const next = match[1];
  const page = await fetchText(next, { headers: { Referer: url } });
  if (!page) return [];

  const $ = cheerio.load(page);
  const results = [];

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    const text = $(el).text();

    if (!href) return;

    if (/download|fsl|pixel|cdn/i.test(text + href)) {
      results.push({
        url: href,
        quality: parseQuality(text)
      });
    }
  });

  return results;
}

async function resolveHubdrive(url) {
  const html = await fetchText(url);
  if (!html) return [];

  const $ = cheerio.load(html);
  const next = $("a[href]").attr("href");

  if (!next) return [];

  return resolveLink(next);
}

async function resolvePixel(url) {
  const id = url.split("/").pop();
  return [{
    url: `https://pixeldrain.com/api/file/${id}?download`,
    quality: "Auto"
  }];
}

/* ---------------- UNIVERSAL RESOLVER ---------------- */
async function resolveLink(url) {
  if (!url) return [];

  if (url.includes("id=")) {
    url = await decodeRedirect(url);
  }

  const lower = url.toLowerCase();

  if (/\.(mp4|m3u8|mkv)/i.test(url)) {
    return [{ url, quality: "Auto" }];
  }

  if (lower.includes("hubcloud")) return resolveHubcloud(url);
  if (lower.includes("hubdrive")) return resolveHubdrive(url);
  if (lower.includes("pixeldrain")) return resolvePixel(url);

  return [];
}

/* ---------------- MAIN ---------------- */
async function getStreams(query) {
  try {
    const page = await searchContent(query);
    if (!page) return [];

    const html = await fetchText(page);
    if (!html) return [];

    const $ = cheerio.load(html);
    const links = [];

    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      const text = $(el).text();

      if (href && /hub|drive|pixel|download/i.test(text + href)) {
        links.push({
          url: href,
          label: text
        });
      }
    });

    let streams = [];

    for (const l of links) {
      const resolved = await resolveLink(l.url);
      streams.push(...resolved);
    }

    return dedupe(streams);

  } catch {
    return [];
  }
}

module.exports = { getStreams };
