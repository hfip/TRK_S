/**
 * @file diziyo.js
 * @description DiziYo Scraper Provider for Stremio Addon
 * @author Abdulluh.X
 * @telegram https://t.me/Abdulluh_X
 */

const fetch = require('node-fetch');

var BASE_URL   = "https://www.diziyo.so";
var PLAYER_URL = "https://www.dzyhd.site";
var TMDB_KEY   = "500330721680edb6d5f7f12ba7cd9023";
var UA         = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

function trSlug(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function getStreams(tmdbId, mediaType, season, episode) {
  if (mediaType !== 'tv') return [];

  try {
    const tmdbRes = await fetch("https://api.themoviedb.org/3/tv/" + tmdbId + "?api_key=" + TMDB_KEY + "&language=tr-TR");
    const d = await tmdbRes.json();
    var slug = trSlug(d.name || d.original_name);

    var targetUrl = BASE_URL + "/" + slug + "-" + season + "-sezon-" + episode + "-bolum-izle";
    const r = await fetch(targetUrl, { headers: { "User-Agent": UA, "Referer": BASE_URL + "/" } });
    if (!r.ok) return [];
    const html = await r.text();

    var idM = html.match(/\/video\/([a-f0-9]{32})/i) || html.match(/\/video\/([A-Za-z0-9_-]+)/);
    if (!idM) return [];
    var videoId = idM[1];

    var streams = [];
    streams.push({
      name:    "Abdulluh.X",
      title:   "⌜ DIZIYO ⌟ | VidMoly Server | Auto",
      url:     `https://vidmoly.me/embed-${videoId}.html`,
      quality: "1080p",
      headers: { "Referer": targetUrl }
    });

    return streams;
  } catch(e) {
    return [];
  }
}

module.exports = { getStreams };
