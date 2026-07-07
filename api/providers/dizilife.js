/**
 * @file dizilife.js
 * @description DiziLife Scraper Provider for Stremio Addon
 * @author Abdulluh.X
 * @telegram https://t.me/Abdulluh_X
 */

const fetch = require('node-fetch');

const BASE_URL = "https://dizi65.life";
const TMDB_KEY = "500330721680edb6d5f7f12ba7cd9023";
const UA       = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function getHtml(url, referer) {
  const r = await fetch(url, {
    headers: {
      "User-Agent": UA,
      "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
      "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
      "Referer": referer || BASE_URL + "/",
    }
  });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return await r.text();
}

var TR_MAP = {"ğ":"g","ü":"u","ş":"s","ı":"i","ö":"o","ç":"c","Ğ":"g","Ü":"u","Ş":"s","İ":"i","Ö":"o","Ç":"c"};
function trSlug(s) {
  return s.replace(/[ğüşıöçĞÜŞİÖÇ]/g, function(c) { return TR_MAP[c] || c; })
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function getTmdbInfo(tmdbId, mediaType) {
  var ep = mediaType === "movie" ? "movie" : "tv";
  const r = await fetch("https://api.themoviedb.org/3/" + ep + "/" + tmdbId + "?api_key=" + TMDB_KEY + "&language=tr-TR");
  const d = await r.json();
  return {
    title:     (d.name || d.title || "").trim(),
    origTitle: (d.original_name || d.original_title || "").trim(),
  };
}

function extractPlayerUrl(html) {
  var m = html.match(/(https?:\/\/dcdl[a-z0-9]+\.xyz\/player\/[A-Za-z0-9_-]+)/i)
     || html.match(/href=["'](https?:\/\/[^"']+\/player\/[A-Za-z0-9_-]+)["']/i);
  return m ? m[1] : null;
}

async function trySlug(slug, season, episode, mediaType) {
  var url = mediaType === "movie"
    ? BASE_URL + "/film/" + slug
    : BASE_URL + "/dizi/" + slug + "/sezon/" + season + "/bolum/" + episode;
  try {
    const html = await getHtml(url, BASE_URL + "/");
    var p = extractPlayerUrl(html);
    return p ? { playerUrl: p, pageUrl: url } : null;
  } catch(e) { return null; }
}

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    const info = await getTmdbInfo(tmdbId, mediaType);
    var slugs = [];
    var s1 = trSlug(info.origTitle);
    var s2 = trSlug(info.title);
    if (s1) slugs.push(s1);
    if (s2 && s2 !== s1) slugs.push(s2);

    let result = null;
    for (let sl of slugs) {
      result = await trySlug(sl, season, episode, mediaType);
      if (result) break;
    }

    if (!result) return [];

    var tokenM = result.playerUrl.match(/\/player\/([A-Za-z0-9_-]+)/);
    var token = tokenM ? tokenM[1] : null;
    if (!token) return [];

    var CDN = "https://one.82b6b2a6748f1e.click";
    var m3u8 = CDN + "/" + token + "/master.m3u8";

    return [{
      name:    "Abdulluh.X",
      title:   "DiziLife — Auto HD",
      url:     m3u8,
      quality: "1080p",
      headers: { "Referer": BASE_URL + "/", "Origin": BASE_URL, "User-Agent": UA }
    }];

  } catch(e) {
    return [];
  }
}

module.exports = { getStreams };
