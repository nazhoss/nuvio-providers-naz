/**
 * UHDMovies Provider - Final Polish
 * Fixes: Punctuation Search Bug, Restored ResumeBot/Cloud links, Aggressive Context Matching
 */
"use strict";

const cheerio = require("cheerio-without-node-native");

const DOMAIN = "https://uhdmovies.pink";
const DOMAINS_URL = "https://raw.githubusercontent.com/phisher98/TVVVV/refs/heads/main/domains.json";
const DOMAIN_CACHE = { url: DOMAIN, ts: 0 };

const TMDB_API = "https://api.themoviedb.org/3";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const PROVIDER_NAME = "UHDMovies";

// ============ UTILITY FUNCTIONS ============

async function getLatestDomain() {
  const now = Date.now();
  if (now - DOMAIN_CACHE.ts < 36e5) return DOMAIN_CACHE.url;
  try {
    const res = await fetch(DOMAINS_URL);
    const data = await res.json();
    if (data && data["UHDMovies"]) {
      DOMAIN_CACHE.url = data["UHDMovies"];
      DOMAIN_CACHE.ts = now;
    }
  } catch (e) {
    console.warn(`[UHDMovies] domains.json failed, fallback: ${DOMAIN_CACHE.url}`);
  }
  return DOMAIN_CACHE.url;
}

function getBaseUrl(url) {
  try { return new URL(url).origin; } catch (e) { return DOMAIN; }
}

function fixUrl(url, domain) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  if (url.startsWith("//")) return `https:${url}`;
  return url.startsWith("/") ? `${domain}${url}` : `${domain}/${url}`;
}

function parseStreamDetails(rawText) {
  const lower = (rawText || "").toLowerCase();
  
  let quality = "Auto";
  const heightMatch = lower.match(/(2160|1080|720|480)p/);
  if (heightMatch) quality = heightMatch[0];
  else if (/4k|uhd/.test(lower)) quality = "2160p";

  const sizeMatch = lower.match(/(\d+(?:\.\d+)?)\s*(gb|mb)/i);
  const size = sizeMatch ? `${sizeMatch[1]} ${sizeMatch[2].toUpperCase()}` : "";

  let codec = "";
  if (/hevc|h\.?265|x\.?265/.test(lower)) codec = "HEVC";
  else if (/h\.?264|x\.?264|avc/.test(lower)) codec = "H264";

  let videoTech = [];
  if (/(hdr10\+|hdr10|hdr)/.test(lower)) videoTech.push("HDR");
  if (/(dv|dolby.?vision)/.test(lower)) videoTech.push("DV");
  if (/10.?bit/.test(lower)) videoTech.push("10bit");

  return { quality, size, codec, videoTech };
}

// ============ SEARCH FUNCTIONS ============

async function searchByTitle(title, year) {
  try {
    const domain = await getLatestDomain();
    
    // FIX 1: Strip colons and dashes so WP Search actually works
    const cleanQueryTitle = title.replace(/[:\-]/g, " ").replace(/\s+/g, " ").trim();
    const query = encodeURIComponent(cleanQueryTitle);
    
    const searchUrl = `${domain}/?s=${query}`;
    const response = await fetch(searchUrl, { headers: { "User-Agent": USER_AGENT } });
    const html = await response.text();
    const $ = cheerio.load(html);
    const results = [];

    $("article.gridlove-post").each((_, el) => {
      const $el = $(el);
      const titleRaw = $el.find("h1.sanket, h2.entry-title, .entry-title a").text().trim().replace(/^Download\s+/i, "");
      const href = $el.find("div.entry-image > a, .entry-title a").attr("href");

      if (href && titleRaw) {
        const cleanTitle = titleRaw.split(/1080p|720p|2160p|4K|Dual Audio/i)[0].replace(/[-|]+$/, "").trim();
        results.push({ title: cleanTitle, url: href, rawTitle: titleRaw });
      }
    });

    return results;
  } catch (error) {
    return [];
  }
}

// ============ BYPASS FUNCTIONS ============

async function bypassHrefli(url) {
  const host = getBaseUrl(url);
  try {
    let res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    let html = await res.text();
    let $ = cheerio.load(html);

    for (let i = 0; i < 2; i++) {
      let formUrl = $("form#landing").attr("action");
      if (!formUrl) break;
      
      let formData = {};
      $("form#landing input").each((_, el) => { formData[$(el).attr("name")] = $(el).attr("value") || ""; });

      res = await fetch(formUrl, {
        method: "POST",
        headers: { "User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(formData).toString()
      });
      html = await res.text();
      $ = cheerio.load(html);
    }

    const script = $("script:contains(?go=)").html() || "";
    const skTokenMatch = script.match(/\?go=([^"]+)/);
    if (!skTokenMatch) return null;

    const skToken = skTokenMatch[1];
    let wpHttp2 = "";
    $("input[name='_wp_http2']").each((_, el) => { wpHttp2 = $(el).attr("value"); });

    res = await fetch(`${host}?go=${skToken}`, {
      headers: { "User-Agent": USER_AGENT, "Cookie": wpHttp2 ? `${skToken}=${wpHttp2}` : "" }
    });
    html = await res.text();

    $ = cheerio.load(html);
    const metaRefresh = $('meta[http-equiv="refresh"]').attr("content") || "";
    const driveUrlMatch = metaRefresh.match(/url=(.+)/i);
    
    if (driveUrlMatch) {
      const driveUrl = driveUrlMatch[1];
      res = await fetch(driveUrl, { headers: { "User-Agent": USER_AGENT } });
      html = await res.text();
      const pathMatch = html.match(/replace\("([^"]+)"\)/);
      if (pathMatch && pathMatch[1] !== "/404") {
        return fixUrl(pathMatch[1], getBaseUrl(driveUrl));
      }
      return driveUrl;
    }
    return null;
  } catch (error) {
    return null;
  }
}

// ============ EXTRACTOR FUNCTIONS ============

async function fetchApiToken(finallink, defaultHost) {
  try {
    const urlObj = new URL(finallink);
    const host = urlObj.host || defaultHost;
    const token = finallink.split("url=")[1] || finallink.split("?url=")[1];
    if (!token) return null;

    const res = await fetch(`https://${host}/api`, {
      method: "POST",
      headers: {
        "User-Agent": USER_AGENT,
        "Content-Type": "application/x-www-form-urlencoded",
        "x-token": host,
        "Referer": finallink
      },
      body: `keys=${encodeURIComponent(token)}`
    });
    const text = await res.text();
    const urlMatch = text.match(/url":"([^"]+)"/);
    return urlMatch ? urlMatch[1].replace(/\\\//g, "/") : null;
  } catch (e) { return null; }
}

async function extractResumeBot(url) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    const html = await res.text();
    const tokenMatch = html.match(/formData\.append\('token',\s*'([a-f0-9]+)'\)/);
    const pathMatch = html.match(/fetch\('\/download\?id=([a-zA-Z0-9\/+]+)'/);
    if (!tokenMatch || !pathMatch) return null;

    const token = tokenMatch[1];
    const path = pathMatch[1];
    const baseUrl = url.split("/download")[0];

    const postRes = await fetch(`${baseUrl}/download?id=${path}`, {
      method: "POST",
      headers: { "User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded", "Origin": baseUrl, "Referer": url },
      body: `token=${encodeURIComponent(token)}`
    });
    const json = JSON.parse(await postRes.text());
    return json.url && json.url.startsWith("http") ? json.url : null;
  } catch (e) { return null; }
}

async function extractResumeCloudLink(baseUrl, path) {
  try {
    const res = await fetch(baseUrl + path, { headers: { "User-Agent": USER_AGENT } });
    const html = await res.text();
    const $ = cheerio.load(html);
    const link = $("a.btn-success").first().attr("href");
    return link && link.startsWith("http") ? link : null;
  } catch (e) { return null; }
}

async function extractDriveseedPage(url) {
  const streams = [];
  try {
    let fetchUrl = url;
    if (url.includes("r?key=")) {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      const html = await res.text();
      const redirectMatch = html.match(/replace\("([^"]+)"\)/);
      if (redirectMatch) fetchUrl = getBaseUrl(url) + redirectMatch[1];
    }

    const res = await fetch(fetchUrl, { headers: { "User-Agent": USER_AGENT } });
    const html = await res.text();
    const $ = cheerio.load(html);
    const baseDomain = getBaseUrl(fetchUrl);

    const rawFileName = $("li.list-group-item").first().text() || "";
    const meta = parseStreamDetails(rawFileName);
    const finalQuality = meta.quality;
    
    const formatLine = (...items) => items.filter(Boolean).join(' | ');
    const line2 = formatLine(meta.size && `📦 ${meta.size}`, meta.codec && `⚙️ ${meta.codec}`, meta.videoTech.length && `🎯 ${meta.videoTech.join(', ')}`);

    const promises = $("div.text-center > a").map(async (_, el) => {
      const text = $(el).text().toLowerCase();
      const href = $(el).attr("href");
      if (!href) return;

      let link = null;
      let hoster = "Direct";

      // FIX 2: Restored specific video extractors
      if (text.includes("instant download")) {
        link = await fetchApiToken(href, href.includes("video-leech") ? "video-leech.pro" : "video-seed.pro");
        hoster = "Instant";
      } else if (text.includes("resume worker bot")) {
        link = await extractResumeBot(href);
        hoster = "ResumeBot";
      } else if (text.includes("resume cloud")) {
        link = await extractResumeCloudLink(baseDomain, href);
        hoster = "ResumeCloud";
      } else if (text.includes("direct links")) {
        link = href; 
        hoster = "CloudFlare";
      } else if (text.includes("cloud download")) {
        link = href;
        hoster = "Cloud Download";
      }

      if (link) {
        streams.push({
          name: `${PROVIDER_NAME}\n${finalQuality.toUpperCase()}`,
          title: formatLine(`🔗 ${hoster}`, line2) || "Driveseed Stream",
          url: link,
          quality: finalQuality
        });
      }
    }).get();

    await Promise.all(promises);
    return streams;
  } catch (error) {
    return [];
  }
}

// ============ CSS-AGNOSTIC EXTRACTION ============

function getContextText($, el) {
  // FIX 3: Aggressive DOM walker to find the nearest description text
  let textContext = "";
  let current = $(el).parent();
  
  for (let i = 0; i < 5; i++) {
    let prev = current.prev();
    if (prev.length > 0) {
      textContext = prev.text().trim();
      if (textContext.length > 5) break;
    }
    current = current.parent();
  }
  
  if (!textContext || textContext.length < 5) textContext = $(el).text().trim();
  return textContext.replace(/Download|From Google Drive|Mega|Direct/ig, "").replace(/\s+/g, " ").trim();
}

async function getMovieLinks(pageUrl) {
  try {
    const res = await fetch(pageUrl, { headers: { "User-Agent": USER_AGENT } });
    const html = await res.text();
    const $ = cheerio.load(html);
    const links = [];
    const seenUrls = new Set();

    $("a.maxbutton-1, a.maxbutton, a[href*='sid='], a[href*='unblockedgames']").each((_, el) => {
      const href = $(el).attr("href");
      if (!href || href.includes("youtube.com") || href.includes("imdb.com")) return;

      const textContext = getContextText($, el);

      if (!seenUrls.has(href)) {
        seenUrls.add(href);
        links.push({ sourceName: textContext || "UHDMovies Stream", sourceLink: href });
      }
    });
    return links;
  } catch (error) {
    return [];
  }
}

async function getTvEpisodeLink(pageUrl, targetSeason, targetEpisode) {
  try {
    const res = await fetch(pageUrl, { headers: { "User-Agent": USER_AGENT } });
    const html = await res.text();
    const $ = cheerio.load(html);
    const links = [];
    const seenUrls = new Set();

    // Adjusted Regex to match "S01E05" and "Season 1 Episode 5" equally well
    const sPattern = new RegExp(`(?:Season\\s*|S)0?${targetSeason}\\b`, 'i');
    const ePattern = new RegExp(`(?:Episode\\s*|E)0?${targetEpisode}\\b`, 'i');
    const packPattern = new RegExp(`(?:Season\\s*|S)0?${targetSeason}\\b.*(Pack|Complete|Season)`, 'i');

    $("a.maxbutton-1, a.maxbutton, a[href*='sid='], a[href*='unblockedgames']").each((_, el) => {
      const href = $(el).attr("href");
      if (!href || href.includes("youtube.com") || href.includes("imdb.com")) return;

      const fullContext = getContextText($, el);

      let isMatch = false;
      if (sPattern.test(fullContext) && ePattern.test(fullContext)) isMatch = true;
      else if (packPattern.test(fullContext)) isMatch = true;
      else {
        const epMatch = fullContext.match(/Episode\s*0?(\d+)/i);
        const seaMatch = fullContext.match(/Season\s*0?(\d+)/i);
        if (epMatch && parseInt(epMatch[1]) === targetEpisode) {
          if (seaMatch && parseInt(seaMatch[1]) === targetSeason) isMatch = true;
          else if (!seaMatch && targetSeason === 1) isMatch = true; 
        }
      }

      if (isMatch && !seenUrls.has(href)) {
        seenUrls.add(href);
        links.push({ sourceName: fullContext.substring(0, 150), sourceLink: href });
      }
    });
    return links;
  } catch (error) {
    return [];
  }
}

// ============ MAIN ENTRY POINT ============

async function getTmdbDetails(tmdbId, mediaType) {
  const isSeries = mediaType === "series" || mediaType === "tv";
  const url = `${TMDB_API}/${isSeries ? "tv" : "movie"}/${tmdbId}?api_key=${TMDB_API_KEY}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    return isSeries 
      ? { title: data.name, year: data.first_air_date ? parseInt(data.first_air_date.split("-")[0]) : null }
      : { title: data.title, year: data.release_date ? parseInt(data.release_date.split("-")[0]) : null };
  } catch (error) { return null; }
}

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    const tmdbDetails = await getTmdbDetails(tmdbId, mediaType);
    if (!tmdbDetails) return [];

    const searchResults = await searchByTitle(tmdbDetails.title, tmdbDetails.year);
    if (!searchResults.length) return [];

    const isSeries = mediaType === "series" || mediaType === "tv";
    let allStreams = [];

    const processPromises = searchResults.map(async (result) => {
      try {
        const links = isSeries 
          ? await getTvEpisodeLink(result.url, season, episode) 
          : await getMovieLinks(result.url);

        const resolvePromises = links.map(async (linkData) => {
          try {
            let finalLink = linkData.sourceLink;
            if (finalLink.includes("unblockedgames")) {
              const bypassed = await bypassHrefli(finalLink);
              if (bypassed) finalLink = bypassed;
            }

            if (!finalLink) return [];

            if (finalLink.includes("driveseed") || finalLink.includes("driveleech")) {
              return await extractDriveseedPage(finalLink);
            }

            if (finalLink.includes("video-seed")) {
              const url = await fetchApiToken(finalLink, "video-seed.xyz");
              if (url) {
                const meta = parseStreamDetails(linkData.sourceName);
                const formatLine = (...items) => items.filter(Boolean).join(' | ');
                const titleLine = formatLine(meta.size && `📦 ${meta.size}`, meta.codec && `⚙️ ${meta.codec}`, meta.videoTech.length && `🎯 ${meta.videoTech.join(', ')}`);
                
                return [{
                  name: `${PROVIDER_NAME}\n${meta.quality.toUpperCase()}`,
                  title: titleLine || linkData.sourceName,
                  url: url,
                  quality: meta.quality
                }];
              }
              return [];
            }

            const meta = parseStreamDetails(linkData.sourceName);
            return [{
              name: `${PROVIDER_NAME}\n${meta.quality.toUpperCase()}`,
              title: `🔗 External Link | ${linkData.sourceName}`,
              url: finalLink,
              quality: meta.quality
            }];
          } catch (e) { return []; } // Prevent single bad link from killing batch
        });

        const resolvedArrays = await Promise.all(resolvePromises);
        resolvedArrays.forEach(streams => allStreams.push(...streams));
      } catch (e) {} // Catch internal page errors safely
    });

    await Promise.all(processPromises);
    
    const qualityWeights = { "2160p": 5, "1080p": 4, "720p": 3, "480p": 2, "Auto": 1 };
    return allStreams.sort((a, b) => (qualityWeights[b.quality] || 0) - (qualityWeights[a.quality] || 0));

  } catch (error) { return []; }
}

module.exports = { getStreams };
