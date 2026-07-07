/**
 * @file filmmakinesi.js
 * @description FilmMakinesi Scraper Provider for Stremio Addon
 * @author Abdulluh.X
 * @telegram https://t.me/Abdulluh_X
 */

const fetch = require('node-fetch');

const MAIN_URL = "https://filmmakinesi.to";
const TMDB_API_KEY = "500330721680edb6d5f7f12ba7cd9023";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
  "Cache-Control": "max-age=0"
};

function fixUrl(url) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  if (url.startsWith("//")) return "https:" + url;
  if (url.startsWith("/")) return MAIN_URL + url;
  return MAIN_URL + "/" + url;
}

function inferLanguage(label = "") {
  const value = (label || "").toLowerCase();
  if (value.includes("dublaj")) return "Dublaj";
  if (value.includes("altyazi") || value.includes("altyazı") || value.includes("sub")) return "Altyazi";
  return "Auto";
}

async function getTmdbTitle(tmdbId) {
  try {
    const url = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    return {
      trTitle: data.title || '',
      origTitle: data.original_title || data.title || ''
    };
  } catch (e) { return null; }
}

async function searchMovie(query) {
  try {
    const searchUrl = `${MAIN_URL}/arama/?s=${encodeURIComponent(query)}`;
    const res = await fetch(searchUrl, { headers: HEADERS });
    if (!res.ok) return null;
    const html = await res.text();
    
    const regex = /<div[^>]+class="[^"]*item-relative[^"]*"[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"/gi;
    const match = regex.exec(html);
    return match ? fixUrl(match[1]) : null;
  } catch (e) { return null; }
}

async function getStreams(tmdbId, mediaType, season, episode) {
  if (mediaType !== "movie") return [];

  try {
    const titles = await getTmdbTitle(tmdbId);
    if (!titles) return [];

    let movieUrl = await searchMovie(titles.trTitle);
    if (!movieUrl && titles.origTitle !== titles.trTitle) {
      movieUrl = await searchMovie(titles.origTitle);
    }

    if (!movieUrl) return [];

    const response = await fetch(movieUrl, { headers: HEADERS });
    if (!response.ok) return [];
    const html = await response.text();

    const streams = [];
    const embedRegex = /(https?:\/\/(?:closeload|rapid|vidmoly|sibnet)[^"'<\s]+)/gi;
    const matches = [...html.matchAll(embedRegex)];

    for (let i = 0; i < matches.length; i++) {
      const embedUrl = fixUrl(matches[i][1]);
      if (embedUrl.includes("youtube")) continue;

      let playerType = "Player";
      if (embedUrl.includes("vidmoly")) playerType = "VidMoly";
      else if (embedUrl.includes("closeload")) playerType = "CloseLoad";
      else if (embedUrl.includes("sibnet")) playerType = "Sibnet";

      streams.push({
        name: "Abdulluh.X",
        title: `⌜ FILMMAKINESI ⌟ | ${playerType} | ${inferLanguage(playerType)}`,
        url: embedUrl,
        quality: "1080p",
        headers: { "Referer": movieUrl, "User-Agent": HEADERS["User-Agent"] }
      });
    }

    return streams;
  } catch (error) {
    return [];
  }
}

module.exports = { getStreams };
