/**
 * 4KHDHub - Built from src/4KHDHub/
 * Final Polish: CSS-Agnostic Scraper (Immune to layout changes), Domain Updates
 */
var __create = Object.create;
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/4KHDHub/index.js
var FourKHDHub_exports = {};
__export(FourKHDHub_exports, {
  getStreams: () => getStreams
});
module.exports = __toCommonJS(FourKHDHub_exports);

// src/4KHDHub/extractor.js
var import_cheerio_without_node_native2 = __toESM(require("cheerio-without-node-native"));

// src/4KHDHub/http.js
var DOMAINS_URL = "https://raw.githubusercontent.com/phisher98/TVVVV/refs/heads/main/domains.json";
var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
// AMENDED: Default to .click to fix broken dad domains
var DEFAULT_MAIN_URL = "https://4khdhub.click";

var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Connection": "keep-alive",
  "Upgrade-Insecure-Requests": "1"
};

var cachedDomains = null;
function getDomains() {
  return __async(this, null, function* () {
    if (cachedDomains)
      return cachedDomains;
    try {
      const res = yield fetch(DOMAINS_URL, { headers: HEADERS });
      if (!res.ok)
        throw new Error(`HTTP ${res.status}`);
      cachedDomains = yield res.json();
    } catch (error) {
      console.warn(`[4KHDHub] domains.json could not be fetched: ${error.message}`);
      cachedDomains = {};
    }
    return cachedDomains;
  });
}
function getMainUrl() {
  return __async(this, null, function* () {
    const domains = yield getDomains();
    return domains["4khdhub"] || domains.n4khdhub || DEFAULT_MAIN_URL;
  });
}
function fixUrl(url, baseUrl) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("//")) return `https:${url}`;
  if (!baseUrl) return url;
  try { return new URL(url, baseUrl).toString(); } catch (_) { return url; }
}
function fetchText(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    const response = yield fetch(url, __spreadProps(__spreadValues({
      redirect: "follow"
    }, options), {
      headers: __spreadValues(__spreadValues({}, HEADERS), options.headers || {})
    }));
    if (!response.ok) throw new Error(`HTTP ${response.status} -> ${url}`);
    return yield response.text();
  });
}

// src/4KHDHub/tmdb.js
var import_cheerio_without_node_native = __toESM(require("cheerio-without-node-native"));
function getTmdbTitle(tmdbId, mediaType) {
  return __async(this, null, function* () {
    try {
      let decodeHtml = function(text) {
        return (text || "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#039;/g, "'");
      };
      const type = mediaType === "movie" ? "movie" : "tv";
      const url = `https://www.themoviedb.org/${type}/${tmdbId}?language=en-US`;
      const response = yield fetch(url, { headers: HEADERS });
      if (!response.ok) throw new Error(`TMDB HTML fetch error: ${response.status}`);
      const html = yield response.text();
      let title = "";
      const ogMatch = html.match(/<meta property="og:title" content="([^"]+)">/i);
      if (ogMatch) {
        title = decodeHtml(ogMatch[1]).split("(")[0].trim();
      } else {
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch) {
          title = decodeHtml(titleMatch[1]).split("(")[0].split("—")[0].split("–")[0].trim();
        }
      }
      return { trTitle: title, origTitle: title, shortTitle: title.split(":")[0].trim() };
    } catch (error) {
      console.error(`[4KHDHub] TMDB title error: ${error.message}`);
      return { trTitle: "", origTitle: "", shortTitle: "" };
    }
  });
}

// src/4KHDHub/extractor.js
var PROVIDER_NAME = "4KHDHub";
var REDIRECT_REGEX = /s\('o','([A-Za-z0-9+/=]+)'|ck\('_wp_http_\d+','([^']+)'/g;

function dedupeStreams(streams) {
  const seenFingerprints = new Set();
  return streams.filter((stream) => {
    const fingerprint = `${stream.url}|${stream.name}`.toLowerCase().replace(/\s/g, "");
    if (seenFingerprints.has(fingerprint)) return false;
    seenFingerprints.add(fingerprint);
    return true;
  });
}

function sortStreams(streams) {
  const qualityWeights = { "2160p": 5, "1080p": 4, "720p": 3, "480p": 2, "Auto": 1 };
  return streams.sort((a, b) => {
    const weightA = qualityWeights[a.quality] || 0;
    const weightB = qualityWeights[b.quality] || 0;
    return weightB - weightA;
  });
}

function rot13(value) {
  return value.replace(/[A-Za-z]/g, (char) => {
    const base = char <= "Z" ? 65 : 97;
    return String.fromCharCode((char.charCodeAt(0) - base + 13) % 26 + base);
  });
}
function decodeBase64(value) {
  try { return atob(value); } catch (_) { return ""; }
}

function tokenizeTitle(value) {
  return (value || "").toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);
}

function calculateMatchScore(query, targetTitle, targetUrl) {
  const qTokens = tokenizeTitle(query);
  const tTokens = tokenizeTitle(targetTitle);
  if (!qTokens.length) return 0;
  
  // Extract words from the URL slug (e.g., batman-begins-movie-49) to boost score
  let slugTokens = [];
  try {
     const path = new URL(targetUrl).pathname;
     slugTokens = tokenizeTitle(path.replace(/-/g, " ").replace(/\//g, " "));
  } catch(e) {}

  let matches = 0;
  for (const token of qTokens) {
    if (tTokens.includes(token) || slugTokens.includes(token)) matches++;
  }
  
  return matches / qTokens.length; 
}

function parseStreamDetails(releaseName, hosterName, urlSize) {
  const lower = (releaseName || "").toLowerCase();
  
  let quality = "Auto";
  const heightMatch = lower.match(/(2160|1080|720|480)p/);
  if (heightMatch) quality = heightMatch[0];
  else if (/4k|uhd/.test(lower)) quality = "2160p";

  let codec = "";
  if (/hevc|h\.?265|x\.?265/.test(lower)) codec = "HEVC";
  else if (/h\.?264|x\.?264|avc/.test(lower)) codec = "H264";

  let videoTech = [];
  if (/(hdr10\+|hdr10|hdr)/.test(lower)) videoTech.push("HDR");
  if (/(dv|dolby.?vision)/.test(lower)) videoTech.push("DV");
  if (/10.?bit/.test(lower)) videoTech.push("10bit");

  let source = "";
  if (/bluray|bdrip|brrip/.test(lower)) source = "BluRay";
  else if (/web-?dl|web-?rip/.test(lower)) source = "WEB";
  else if (/hdrip/.test(lower)) source = "HDRip";
  else if (/hdtv/.test(lower)) source = "HDTV";
  else if (/camrip|telesync|ts/.test(lower)) source = "CAM";

  const langs = [];
  if (lower.includes("hindi")) langs.push("HI");
  if (lower.includes("tamil")) langs.push("TA");
  if (lower.includes("telugu")) langs.push("TE");
  if (lower.includes("malayalam")) langs.push("ML");
  if (lower.includes("english")) langs.push("EN");
  
  let audio = "";
  if (langs.length >= 2) audio = `Multi (${langs.join('/')})`;
  else if (lower.includes("dual audio") || lower.includes("dual")) audio = "Dual Audio";
  else if (langs.length === 1) audio = langs[0];

  let line1 = [];
  if (source) line1.push(`🎥 ${source}`);
  if (audio) line1.push(`🔊 ${audio}`);

  let line2 = [];
  if (urlSize) line2.push(`📦 ${urlSize}`);
  if (codec) line2.push(`⚙️ ${codec}`);
  if (videoTech.length > 0) line2.push(`🎯 ${videoTech.join(', ')}`);

  let line3 = `🔗 ${hosterName || "Direct"}`;

  const finalTitle = [
    line1.join(' | '),
    line2.join(' | '),
    line3
  ].filter(line => line.trim().length > 0).join('\n');

  return {
    name: `${PROVIDER_NAME}\n${quality.toUpperCase()}`,
    title: finalTitle,
    quality: quality
  };
}

function buildStream(releaseName, url, hosterName = "", headers = {}, size = "") {
  let finalUrl = url;
  if (!/\.(m3u8|mp4|mkv)/i.test(finalUrl)) {
    finalUrl += finalUrl.includes("#") ? "" : "#.mkv";
  }
  const meta = parseStreamDetails(releaseName, hosterName, size);
  return {
    name: meta.name,
    title: meta.title,
    url: finalUrl,
    quality: meta.quality,
    headers: Object.keys(headers).length ? headers : void 0
  };
}

function getRedirectLinks(url) {
  return __async(this, null, function* () {
    let html = "";
    try { html = yield fetchText(url); } catch (error) { return ""; }
    let combined = "";
    let match;
    while ((match = REDIRECT_REGEX.exec(html)) !== null) {
      combined += match[1] || match[2] || "";
    }
    if (!combined) return "";
    try {
      const decoded = decodeBase64(rot13(decodeBase64(decodeBase64(combined))));
      const json = JSON.parse(decoded);
      const encodedUrl = decodeBase64(json.o || "").trim();
      if (encodedUrl) return encodedUrl;
      const data = decodeBase64(json.data || "");
      const blogUrl = json.blog_url || "";
      if (!data || !blogUrl) return "";
      const finalText = yield fetchText(`${blogUrl}?re=${encodeURIComponent(data)}`);
      return finalText.trim();
    } catch (error) { return ""; }
  });
}

function searchContent(query, mediaType) {
  return __async(this, null, function* () {
    const mainUrl = yield getMainUrl();
    const searchUrl = `${mainUrl}/?s=${encodeURIComponent(query)}`;
    const html = yield fetchText(searchUrl);
    const $ = import_cheerio_without_node_native2.default.load(html);
    const results = [];
    
    // AMENDED: CSS-Agnostic search scraper. Finds ALL valid deep links on the page.
    $("a[href]").each((_, el) => {
      const href = fixUrl($(el).attr("href"), mainUrl);
      if (!href || !href.startsWith(mainUrl)) return;
      
      const ignores = ["/category/", "/tag/", "/page/", "/author/", "/contact", "/about", "/dmca"];
      if (ignores.some(i => href.includes(i))) return;
      
      try {
         const path = new URL(href).pathname;
         if (path.length < 5 || path === "/") return;
      } catch(e) { return; }

      let title = $(el).attr("title") || $(el).find("h1, h2, h3, h4, .title, .post-title").first().text().trim() || $(el).find("img").attr("alt") || $(el).text().trim();
      if (!title || title.length < 2) return;

      if (!results.some(r => r.href === href)) {
        results.push({ title, href });
      }
    });
    
    if (!results.length) return null;

    let bestMatch = null;
    let highestScore = 0;

    for (const item of results) {
      const score = calculateMatchScore(query, item.title, item.href);
      if (score === 1.0) return item.href; 
      if (score > highestScore) {
        highestScore = score;
        bestMatch = item.href;
      }
    }
    
    return highestScore >= 0.6 ? bestMatch : null;
  });
}

function collectMovieLinks($, pageUrl) {
  const links = [];
  const seenUrls = new Set();

  // Primary sweep (clean buttons)
  $("div.download-item, a.btn").each((_, el) => {
    const anchor = $(el).is('a') ? $(el) : $(el).find("a[href]").first();
    const href = fixUrl(anchor.attr("href"), pageUrl);
    if (!href) return;
    const rawReleaseName = $(el).find("div.flex-1.text-left.font-semibold").text().trim() || $(el).text().trim();
    if (!seenUrls.has(href) && (href.includes('hub') || href.includes('pixel') || href.includes('id='))) {
       seenUrls.add(href);
       links.push({ url: href, releaseName: rawReleaseName });
    }
  });

  // Secondary Fallback sweep (CSS-Agnostic)
  $("a[href]").each((_, el) => {
    let href = fixUrl($(el).attr("href"), pageUrl);
    if (!href) return;
    const lower = href.toLowerCase();
    
    const isValid = lower.includes("hubcloud") || lower.includes("hubdrive") || 
                    lower.includes("hubcdn") || lower.includes("pixeldrain") || 
                    lower.includes("id=");
                    
    if (isValid && !seenUrls.has(href)) {
       seenUrls.add(href);
       let text = $(el).text().trim() || $(el).parent().text().trim();
       links.push({ url: href, releaseName: text });
    }
  });

  return links;
}

function collectEpisodeLinks($, pageUrl, season, episode) {
  const links = [];
  const seenUrls = new Set();
  
  // Primary structured sweep
  $("div.episodes-list div.season-item").each((_, seasonEl) => {
    const seasonText = $(seasonEl).find("div.episode-number").first().text();
    const seasonMatch = seasonText.match(/S?([1-9][0-9]*)/i);
    if (!seasonMatch || parseInt(seasonMatch[1], 10) !== Number(season)) return;
    
    $(seasonEl).find("div.episode-download-item").each((__, episodeEl) => {
      const episodeText = $(episodeEl).find("div.episode-file-info span.badge-psa").text();
      const episodeMatch = episodeText.match(/Episode-?0*([1-9][0-9]*)/i);
      if (!episodeMatch || parseInt(episodeMatch[1], 10) !== Number(episode)) return;
      
      const headerText = $(episodeEl).find("div.episode-file-info").text().trim();
      $(episodeEl).find("a[href]").each((___, linkEl) => {
        const href = fixUrl($(linkEl).attr("href"), pageUrl);
        if (!href) return;
        if(!seenUrls.has(href)) {
            seenUrls.add(href);
            links.push({ url: href, releaseName: headerText });
        }
      });
    });
  });

  // Pack sweeps
  $("div.download-item").each((_, item) => {
    const headerText = $(item).find("div.flex-1.text-left.font-semibold").text().trim() || $(item).text().trim();
    const seasonMatch = headerText.match(/S([0-9]+)/i);
    if (!seasonMatch || parseInt(seasonMatch[1], 10) !== Number(season)) return;
    
    $(item).find("a[href]").each((__, linkEl) => {
      const href = fixUrl($(linkEl).attr("href"), pageUrl);
      if (!href) return;
      if(!seenUrls.has(href)) {
          seenUrls.add(href);
          links.push({ url: href, releaseName: headerText });
      }
    });
  });
  
  if (links.length > 0) return links;

  // Secondary Fallback sweep (CSS-Agnostic Regex Matching)
  const sPattern = new RegExp(`S0?${season}\\b`, 'i');
  const ePattern = new RegExp(`E0?${episode}\\b`, 'i');
  const packPattern = new RegExp(`S0?${season}\\b.*(Pack|Complete|Season)`, 'i');
  
  $("a[href]").each((_, el) => {
    let href = fixUrl($(el).attr("href"), pageUrl);
    if (!href) return;
    
    const lowerHref = href.toLowerCase();
    const isValidHost = lowerHref.includes("hubcloud") || lowerHref.includes("hubdrive") || lowerHref.includes("hubcdn") || lowerHref.includes("pixeldrain") || lowerHref.includes("id=");
    
    if (isValidHost && !seenUrls.has(href)) {
      let textContext = `${$(el).text()} ${$(el).parent().text()} ${$(el).closest('div, section').prevAll('h2, h3, h4').first().text()}`;
      
      let isMatch = false;
      if (sPattern.test(textContext) && ePattern.test(textContext)) isMatch = true;
      else if (packPattern.test(textContext)) isMatch = true;
      else if (sPattern.test(textContext) && !/E\d+/i.test(textContext)) isMatch = true;

      if (isMatch) {
        seenUrls.add(href);
        links.push({ url: href, releaseName: textContext.replace(/\s+/g, ' ').trim() });
      }
    }
  });
  
  return links;
}

function resolveHubcdnDirect(url, releaseName) {
  return __async(this, null, function* () {
    const html = yield fetchText(url, { headers: __spreadValues({ Referer: url }, HEADERS) });
    const encoded = (html.match(/r=([A-Za-z0-9+/=]+)/)?.[1]) || (html.match(/reurl\s*=\s*"([^"]+)"/)?.[1]?.split("?r=").pop());
    if (!encoded) return [];
    const decoded = decodeBase64(encoded).split("link=").pop();
    if (!decoded || decoded === encoded) return [];
    return [buildStream(releaseName, decoded, "HubCDN", { Referer: url })];
  });
}

function resolveHubdrive(url, releaseName) {
  return __async(this, null, function* () {
    const html = yield fetchText(url);
    const $ = import_cheerio_without_node_native2.default.load(html);
    const href = $("a.btn.btn-primary.btn-user.btn-success1.m-1").attr("href");
    if (!href) return [];
    return yield resolveLink(fixUrl(href, url), releaseName, url);
  });
}

function resolveHubcloud(url, releaseName, referer) {
  return __async(this, null, function* () {
    const baseHeaders = referer ? { Referer: referer } : {};
    let entryUrl = url;
    if (!/hubcloud\.php/i.test(url)) {
      const html2 = yield fetchText(url, { headers: baseHeaders });
      const $2 = import_cheerio_without_node_native2.default.load(html2);
      const raw = $2("#download").attr("href") || $2(".btn-success").attr("href") || $2("a[href*='hubcloud']").attr("href");
      if (!raw) return [];
      entryUrl = fixUrl(raw, url);
    }
    
    const html = yield fetchText(entryUrl, { headers: __spreadValues({ Referer: url }, baseHeaders) });
    const $ = import_cheerio_without_node_native2.default.load(html);
    
    const size = $("i#size").first().text().trim();
    const fileHeader = $("div.card-header").first().text().trim() || releaseName;
    
    const streams = [];
    $("a.btn[href]").each((_, el) => {
      const link = fixUrl($(el).attr("href"), entryUrl);
      const btnText = $(el).text().trim().toLowerCase();
      if (!link) return;

      let hosterName = "HubCloud";
      if (btnText.includes("buzzserver") || link.includes("buzzserver")) hosterName = "BuzzServer";
      else if (btnText.includes("pixel") || link.includes("pixeldrain")) hosterName = "Pixeldrain";
      else if (btnText.includes("filepress")) hosterName = "FilePress";

      const finalUrl = (hosterName === "Pixeldrain" && !link.includes("/api/file/")) 
                       ? (link.split('/').pop() ? `${new URL(link).origin}/api/file/${link.split('/').pop()}?download` : link) 
                       : link;

      const streamHeaders = hosterName === "Pixeldrain" ? {} : { Referer: entryUrl };
      streams.push(buildStream(fileHeader, finalUrl, hosterName, streamHeaders, size));
    });
    return streams;
  });
}

function resolveLink(rawUrl, releaseName, referer = "") {
  return __async(this, null, function* () {
    let url = rawUrl;
    if (!url) return [];
    if (url.includes("id=")) {
      const redirected = yield getRedirectLinks(url);
      if (redirected) url = redirected;
    }
    const lower = url.toLowerCase();
    try {
      if (/\.(m3u8|mp4|mkv)(\?|$)/i.test(url)) {
        return [buildStream(releaseName, url, "Direct", referer ? { Referer: referer } : {})];
      }
      if (lower.includes("hubdrive")) return yield resolveHubdrive(url, releaseName);
      if (lower.includes("hubcloud")) return yield resolveHubcloud(url, releaseName, referer);
      if (lower.includes("hubcdn")) return yield resolveHubcdnDirect(url, releaseName);
      if (lower.includes("pixeldrain")) {
        const pdId = url.split('/').pop();
        const pdUrl = `https://pixeldrain.com/api/file/${pdId}?download`;
        return [buildStream(releaseName, pdUrl, "Pixeldrain", {})];
      }
    } catch (error) {}
    return [];
  });
}

function extractStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    const { trTitle, origTitle, shortTitle } = yield getTmdbTitle(tmdbId, mediaType);
    if (!trTitle && !origTitle) return [];
    
    let contentUrl = yield searchContent(trTitle, mediaType);
    if (!contentUrl && origTitle && origTitle !== trTitle) contentUrl = yield searchContent(origTitle, mediaType);
    if (!contentUrl && shortTitle) contentUrl = yield searchContent(shortTitle, mediaType);
    if (!contentUrl) return [];

    const html = yield fetchText(contentUrl);
    const $ = import_cheerio_without_node_native2.default.load(html);
    const isMoviePage = $("div.episodes-list").length === 0;
    
    let links = (mediaType === "movie" || isMoviePage) 
                ? collectMovieLinks($, contentUrl) 
                : collectEpisodeLinks($, contentUrl, season, episode);

    if (!links.length) return [];

    const allStreams = [];
    const resolvedUrls = new Set();

    for (const linkItem of links) {
      const resolved = yield resolveLink(linkItem.url, linkItem.releaseName, contentUrl);
      
      for (const stream of resolved) {
        const pureUrl = stream.url.split('#')[0].toLowerCase();
        if (!resolvedUrls.has(pureUrl)) {
          resolvedUrls.add(pureUrl);
          allStreams.push(stream);
        }
      }
    }
    return sortStreams(dedupeStreams(allStreams));
  });
}

function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      return yield extractStreams(tmdbId, mediaType, season, episode);
    } catch (error) {
      return [];
    }
  });
}
