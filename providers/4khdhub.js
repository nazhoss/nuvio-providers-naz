/**
 * 4khdhub - Built from src/4khdhub/
 * Updated with resilient link extraction, Hotlink Bypass, CDN Support, & Redirect Resolution
 */
"use strict";
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
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

// src/4khdhub/constants.js
var BASE_URL = "https://4khdhub.click";
var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";
var DOMAINS_URL = "https://raw.githubusercontent.com/phisher98/TVVVV/refs/heads/main/domains.json";

// src/4khdhub/utils.js
var domainCache = { url: BASE_URL, ts: 0 };
function fetchLatestDomain() {
  return __async(this, null, function* () {
    const now = Date.now();
    if (now - domainCache.ts < 36e5) return domainCache.url;
    try {
      const response = yield fetch(DOMAINS_URL);
      const data = yield response.json();
      if (data && data["4khdhub"]) {
        domainCache.url = data["4khdhub"];
        domainCache.ts = now;
      }
    } catch (e) {}
    return domainCache.url;
  });
}

// src/4khdhub/http.js
function fetchText(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    try {
      const response = yield fetch(url, {
        headers: __spreadValues({
          "User-Agent": USER_AGENT
        }, options.headers)
      });
      return yield response.text();
    } catch (err) {
      console.log(`[4KHDHub] Request failed for ${url}: ${err.message}`);
      return null;
    }
  });
}

// src/4khdhub/tmdb.js
function getTmdbDetails(tmdbId, type) {
  return __async(this, null, function* () {
    const isSeries = type === "series" || type === "tv";
    const endpoint = isSeries ? "tv" : "movie";
    const url = `https://api.themoviedb.org/3/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    console.log(`[4KHDHub] Fetching TMDB details from: ${url}`);
    try {
      const response = yield fetch(url);
      const data = yield response.json();
      if (isSeries) {
        return {
          title: data.name,
          year: data.first_air_date ? parseInt(data.first_air_date.split("-")[0]) : 0
        };
      } else {
        return {
          title: data.title,
          year: data.release_date ? parseInt(data.release_date.split("-")[0]) : 0
        };
      }
    } catch (error) {
      console.log(`[4KHDHub] TMDB request failed: ${error.message}`);
      return null;
    }
  });
}

// src/4khdhub/utils.js
function atob(input) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let str = String(input).replace(/=+$/, "");
  if (str.length % 4 === 1) {
    throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");
  }
  let output = "";
  for (let bc = 0, bs, buffer, i = 0; buffer = str.charAt(i++); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
    buffer = chars.indexOf(buffer);
  }
  return output;
}
function rot13Cipher(str) {
  return str.replace(/[a-zA-Z]/g, function(c) {
    return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
  });
}
function levenshteinDistance(s, t) {
  if (s === t) return 0;
  const n = s.length;
  const m = t.length;
  if (n === 0) return m;
  if (m === 0) return n;
  const d = [];
  for (let i = 0; i <= n; i++) {
    d[i] = [];
    d[i][0] = i;
  }
  for (let j = 0; j <= m; j++) {
    d[0][j] = j;
  }
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = s.charAt(i - 1) === t.charAt(j - 1) ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  }
  return d[n][m];
}
function parseBytes(val) {
  if (typeof val === "number") return val;
  if (!val) return 0;
  const match = val.match(/^([0-9.]+)\s*([a-zA-Z]+)$/);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  let multiplier = 1;
  if (unit.indexOf("k") === 0) multiplier = 1024;
  else if (unit.indexOf("m") === 0) multiplier = 1024 * 1024;
  else if (unit.indexOf("g") === 0) multiplier = 1024 * 1024 * 1024;
  else if (unit.indexOf("t") === 0) multiplier = 1024 * 1024 * 1024 * 1024;
  return num * multiplier;
}
function formatBytes(val) {
  if (val === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  let i = Math.floor(Math.log(val) / Math.log(k));
  if (i < 0) i = 0;
  return parseFloat((val / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// src/4khdhub/search.js
var cheerio = require("cheerio-without-node-native");
function fetchPageUrl(name, year, isSeries) {
  return __async(this, null, function* () {
    const domain = yield fetchLatestDomain();
    const searchUrl = `${domain}/?s=${encodeURIComponent(name + " " + year)}`;
    console.log(`[4KHDHub] Search Request URL: ${searchUrl}`);
    const html = yield fetchText(searchUrl);
    if (!html) {
      console.log("[4KHDHub] Search failed: No HTML response");
      return null;
    }
    const $ = cheerio.load(html);
    const targetType = isSeries ? "Series" : "Movies";
    console.log(`[4KHDHub] Parsing search results for type: ${targetType}`);
    const matchingCards = $(".movie-card").filter((_, el) => {
      const hasFormat = $(el).find(`.movie-card-format:contains("${targetType}")`).length > 0;
      return hasFormat;
    }).filter((_, el) => {
      const metaText = $(el).find(".movie-card-meta").text();
      const movieCardYear = parseInt(metaText);
      const yearMatch = !isNaN(movieCardYear) && Math.abs(movieCardYear - year) <= 1;
      if (!yearMatch) {
        console.log(`[4KHDHub] Skip: Year mismatch (${movieCardYear} vs ${year}) - ${$(el).find(".movie-card-title").text().trim()}`);
      }
      return yearMatch;
    }).filter((_, el) => {
      const movieCardTitle = $(el).find(".movie-card-title").text().replace(/\[.*?]/g, "").trim();
      const distance = levenshteinDistance(movieCardTitle.toLowerCase(), name.toLowerCase());
      const match = distance < 5;
      console.log(`[4KHDHub] Checking: "${movieCardTitle}" (Dist: ${distance}) vs "${name}"`);
      return match;
    }).map((_, el) => {
      let href = $(el).attr("href");
      if (href && !href.startsWith("http")) {
        href = domain + (href.startsWith("/") ? "" : "/") + href;
      }
      return href;
    }).get();
    
    if (matchingCards.length === 0) {
      console.log("[4KHDHub] No matching cards found after filtering");
    } else {
      console.log(`[4KHDHub] Found ${matchingCards.length} matching cards`);
    }
    return matchingCards.length > 0 ? matchingCards[0] : null;
  });
}

// src/4khdhub/extractor.js
var cheerio2 = require("cheerio-without-node-native");
function resolveRedirectUrl(redirectUrl) {
  return __async(this, null, function* () {
    const redirectHtml = yield fetchText(redirectUrl);
    if (!redirectHtml) return null;
    try {
      const redirectDataMatch = redirectHtml.match(/'o',\s*'(.*?)'/);
      if (!redirectDataMatch) return null;
      const step1 = atob(redirectDataMatch[1]);
      const step2 = atob(step1);
      const step3 = rot13Cipher(step2);
      const step4 = atob(step3);
      const redirectData = JSON.parse(step4);
      if (redirectData && redirectData.o) {
        return atob(redirectData.o);
      }
    } catch (e) {
      console.log(`[4KHDHub] Error resolving redirect: ${e.message}`);
    }
    return null;
  });
}

function extractSourceResults($, el) {
  return __async(this, null, function* () {
    const localHtml = $(el).html();
    const sizeMatch = localHtml.match(/([\d.]+ ?[GM]B)/i);
    const heightMatch = localHtml.match(/\d{3,}p/i);
    const title = $(el).find(".file-title, .episode-file-title").text().trim();
    let height = heightMatch ? parseInt(heightMatch[0]) : 0;
    
    if (height === 0 && (/4k/i.test(title) || /4k/i.test(localHtml))) {
      height = 2160;
    }
    const meta = {
      bytes: sizeMatch ? parseBytes(sizeMatch[1]) : 0,
      height,
      title
    };

    // Broadened to catch all known variations of the CDN
    const targetKeywords = ["hubcloud", "hubdrive", "hubcdn", "gpdl", "vcloud"];
    let targetLink = null;
    
    $(el).find("a").each((_, a) => {
        const text = $(a).text().toLowerCase();
        const href = $(a).attr("href") || "";
        const isMatch = targetKeywords.some(keyword => text.includes(keyword) || href.toLowerCase().includes(keyword));
        if (isMatch && !targetLink) {
            targetLink = href;
        }
    });

    if (targetLink) {
      let resolved = yield resolveRedirectUrl(targetLink) || targetLink;
      
      // If it resolved to HubDrive, we must dig deeper to find the actual Cloud/CDN link
      if (resolved && resolved.toLowerCase().includes("hubdrive")) {
        const innerHtml = yield fetchText(resolved);
        if (innerHtml) {
          const $2 = cheerio2.load(innerHtml);
          const innerLink = $2("a").filter((_, a) => {
              const text = $2(a).text().toLowerCase();
              const href = $2(a).attr("href") || "";
              return targetKeywords.some(keyword => text.includes(keyword) || href.toLowerCase().includes(keyword));
          }).attr("href");
          
          if (innerLink) resolved = innerLink;
        }
      }
      
      return { url: resolved, meta };
    }
    
    return null;
  });
}

function extractHubCloud(hubCloudUrl, baseMeta) {
  return __async(this, null, function* () {
    if (!hubCloudUrl) return [];
    
    // Dynamic Referer based on the extracted URL
    const urlObj = new URL(hubCloudUrl);
    const rootDomain = `${urlObj.protocol}//${urlObj.hostname}/`;
    
    const redirectHtml = yield fetchText(hubCloudUrl, { headers: { Referer: rootDomain } });
    if (!redirectHtml) return [];
    
    let finalLinksUrl = null;
    const redirectUrlMatch = redirectHtml.match(/url\s*=\s*['"]([^'"]+)['"]/i);
    
    if (redirectUrlMatch) {
        finalLinksUrl = redirectUrlMatch[1];
    } else {
        const metaRefresh = redirectHtml.match(/<meta[^>]+url=['"]?([^'">]+)['"]?/i);
        if (metaRefresh) {
            finalLinksUrl = metaRefresh[1];
        } else if (redirectHtml.includes('class="btn') || redirectHtml.includes('id="size"')) {
            finalLinksUrl = hubCloudUrl;
        }
    }

    if (!finalLinksUrl) return [];

    let linksHtml = redirectHtml;
    if (finalLinksUrl !== hubCloudUrl) {
        linksHtml = yield fetchText(finalLinksUrl, { headers: { Referer: rootDomain } });
        if (!linksHtml) return [];
    }
    
    const $ = cheerio2.load(linksHtml);
    const results = [];
    const sizeText = $("#size").text();
    const titleText = $("title").text().trim();
    const currentMeta = __spreadProps(__spreadValues({}, baseMeta), {
      bytes: parseBytes(sizeText) || baseMeta.bytes,
      title: titleText || baseMeta.title
    });

    // Extract the main drive link from the text input box
    $("input").each((_, el) => {
      const val = $(el).val();
      if (val && (val.includes("hubcloud") || val.includes("drive") || val.includes("hubcdn"))) {
        results.push({
          source: "HubCloud Main Drive",
          url: val,
          meta: currentMeta,
          requiresProxy: true,
          proxyHost: rootDomain 
        });
      }
    });

    let directDownloadBtn = $("#download").attr("href");
    if (!directDownloadBtn) {
        const match = linksHtml.match(/var url\s*=\s*['"]([^'"]+)['"];/i);
        if (match) directDownloadBtn = match[1];
    }

    if (directDownloadBtn && (directDownloadBtn.includes("hubrouting") || directDownloadBtn.includes("gpdl") || directDownloadBtn.includes("hubcdn"))) {
      
      let finalStreamUrl = directDownloadBtn;

      // Force fetch to resolve the 302 redirect and grab the raw media URL for Stremio
      try {
        const redirectRes = yield fetch(directDownloadBtn, {
          method: 'HEAD', // Use HEAD to just get the headers without downloading the video
          redirect: 'manual', // Stop at the redirect to grab the Location header
          headers: {
            "Referer": rootDomain,
            "User-Agent": USER_AGENT,
            "Cookie": "xla=s4t;"
          }
        });

        // If it returns a 30x redirect, grab the 'location' header
        if (redirectRes.status >= 300 && redirectRes.status < 400 && redirectRes.headers.has('location')) {
          finalStreamUrl = redirectRes.headers.get('location');
        } else if (redirectRes.url && redirectRes.url !== directDownloadBtn) {
           // Some fetch implementations follow automatically, grab the final URL
          finalStreamUrl = redirectRes.url;
        }
      } catch (err) {
        console.log(`[4KHDHub] Could not resolve routing URL: ${err.message}`);
      }

      results.push({
        source: directDownloadBtn.includes("gpdl") ? "GPDL Stream" : "HubCloud Stream",
        url: finalStreamUrl, 
        meta: currentMeta,
        requiresProxy: true,
        proxyHost: rootDomain 
      });
    }

    $("a").each((_, el) => {
      const text = $(el).text().toLowerCase();
      const href = $(el).attr("href");
      if (!href || href === "#" || href.includes("javascript:")) return;

      if (text.includes("fsl") || text.includes("download file") || text.includes("direct download") || text.includes("instant") || text.includes("10gbps")) {
        results.push({
          source: text.includes("10gbps") ? "10Gbps Server" : "FSL",
          url: href,
          meta: currentMeta
        });
      } else if (text.includes("pixelserver") || text.includes("pixel")) {
        const pixelUrl = href.replace("/u/", "/api/file/");
        results.push({
          source: "PixelServer",
          url: pixelUrl,
          meta: currentMeta
        });
      }
    });
    return results;
  });
}

// src/4khdhub/index.js
var cheerio3 = require("cheerio-without-node-native");
function getStreams(tmdbId, type, season, episode) {
  return __async(this, null, function* () {
    const tmdbDetails = yield getTmdbDetails(tmdbId, type);
    if (!tmdbDetails) return [];
    const { title, year } = tmdbDetails;
    console.log(`[4KHDHub] Search: ${title} (${year})`);
    
    const isSeries = type === "series" || type === "tv";
    const pageUrl = yield fetchPageUrl(title, year, isSeries);
    
    if (!pageUrl) {
      console.log("[4KHDHub] Page not found");
      return [];
    }
    
    console.log(`[4KHDHub] Found page: ${pageUrl}`);
    const html = yield fetchText(pageUrl);
    if (!html) return [];
    
    const $ = cheerio3.load(html);
    const itemsToProcess = [];
    
    if (isSeries && season && episode) {
      const seasonStr = "S" + String(season).padStart(2, "0");
      const episodeStr = "Episode-" + String(episode).padStart(2, "0");
      $(".episode-item").each((_, el) => {
        if ($(".episode-title", el).text().includes(seasonStr)) {
          const downloadItems = $(".episode-download-item", el).filter((_2, item) => $(item).text().includes(episodeStr));
          downloadItems.each((_2, item) => {
            itemsToProcess.push(item);
          });
        }
      });
    } else {
      $(".download-item").each((_, el) => {
        itemsToProcess.push(el);
      });
    }
    
    console.log(`[4KHDHub] Processing ${itemsToProcess.length} items`);
    const streamPromises = itemsToProcess.map((item) => __async(this, null, function* () {
      try {
        const sourceResult = yield extractSourceResults($, item);
        if (sourceResult && sourceResult.url) {
          console.log(`[4KHDHub] Extracting from host: ${sourceResult.url}`);
          const extractedLinks = yield extractHubCloud(sourceResult.url, sourceResult.meta);
          
          return extractedLinks.map((link) => {
            const stream = {
              name: `4KHDHub - ${link.source}${sourceResult.meta.height ? ` ${sourceResult.meta.height}p` : ""}`,
              title: `${link.meta.title}\n${formatBytes(link.meta.bytes || 0)}`,
              url: link.url,
              quality: sourceResult.meta.height ? `${sourceResult.meta.height}p` : undefined,
              behaviorHints: {
                bingeGroup: `4khdhub-${link.source}`
              }
            };

            // Inject the proxyHeaders to bypass hotlink protection if flagged
            if (link.requiresProxy) {
              stream.behaviorHints.notWebReady = true;
              stream.behaviorHints.proxyHeaders = {
                request: {
                  "Referer": link.proxyHost, 
                  "User-Agent": USER_AGENT,
                  "Cookie": "xla=s4t;"
                }
              };
            }
            return stream;
          });
        }
        return [];
      } catch (err) {
        console.log(`[4KHDHub] Item processing error: ${err.message}`);
        return [];
      }
    }));
    
    const results = yield Promise.all(streamPromises);
    return results.reduce((acc, val) => acc.concat(val), []);
  });
}
module.exports = { getStreams };
