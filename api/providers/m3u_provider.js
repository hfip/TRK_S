/**
 * @file m3u_provider.js
 * @description M3U Custom Playlist Scraper Provider for Stremio Addon
 * @author Abdulluh.X
 * @telegram https://t.me/Abdulluh_X
 */

const fetch = require('node-fetch');

var M3U_URL      = 'https://raw.githubusercontent.com/mooncrown04/m3u/refs/heads/main/birlesik.m3u';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

function normalize(s) {
  return (s || '').toLowerCase()
    .replace(/[\u0130]/g, 'i').replace(/[\u0131]/g, 'i')
    .replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

async function fetchTmdbInfo(tmdbId) {
  const r = await fetch('https://api.themoviedb.org/3/movie/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR');
  const d = await r.json();
  return {
    titleTr: d.title || '',
    titleEn: d.original_title || '',
    year: (d.release_date || '').slice(0, 4)
  };
}

async function getStreams(tmdbId, mediaType, season, episode) {
  if (mediaType !== 'movie') return [];

  try {
    const info = await fetchTmdbInfo(tmdbId);
    const res = await fetch(M3U_URL);
    if (!res.ok) return [];
    const text = await res.text();

    var lines = text.split('\n');
    var streams = [];
    var targetTr = normalize(info.titleTr);
    var targetEn = normalize(info.titleEn);

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line.indexOf('#EXTINF') === 0) {
        var titleRaw = line.replace(/#EXTINF[^,]*,/, '').trim();
        var currentNorm = normalize(titleRaw);

        if (currentNorm && (currentNorm.includes(targetTr) || currentNorm.includes(targetEn))) {
          let nextUrl = "";
          for (var j = i + 1; j < lines.length; j++) {
            var next = lines[j].trim();
            if (next && !next.startsWith('#')) { nextUrl = next; break; }
          }
          if (nextUrl) {
            streams.push({
              name: "Abdulluh.X",
              title: `⌜ M3U PLAYLIST ⌟ | ${titleRaw.slice(0,30)} | Auto`,
              url: nextUrl,
              quality: 'Auto',
              headers: { 'User-Agent': 'Mozilla/5.0' }
            });
          }
        }
      }
    }
    return streams;
  } catch(e) {
    return [];
  }
}

module.exports = { getStreams };
