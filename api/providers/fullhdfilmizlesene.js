/**
 * @file fullhdfilmizlesene.js
 * @description FullHDFilmizlesene Scraper Provider for Stremio Addon
 * @author Abdulluh.X
 * @telegram https://t.me/Abdulluh_X
 */

const fetch = require('node-fetch');

var FALLBACK_URL    = 'https://www.fullhdfilmizlesene.life';
var TMDB_KEY        = '4ef0d7355d9ffb5151e987764708ce96';
var UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

function normalize(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

async function getStreams(tmdbId, mediaType, season, episode) {
  if (mediaType !== 'movie') return [];

  try {
    const tmdbRes = await fetch('https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=' + TMDB_KEY);
    const data = await tmdbRes.json();
    var slug = normalize(data.title || data.original_title);

    var filmUrl = FALLBACK_URL + '/' + slug;
    const pageRes = await fetch(filmUrl, { headers: { 'User-Agent': UA, 'Referer': FALLBACK_URL + '/' } });
    if (!pageRes.ok) return [];
    const html = await pageRes.text();

    var m = html.match(/vidid\s*=\s*['"](\d+)['"]/) || html.match(/data-id=['"](\d+)['"]/);
    if (!m) return [];
    var vidid = m[1];

    var streams = [];
    // جلب بيانات سيرفر Atom الافتراضي للموقع
    var atomUrl = FALLBACK_DOMAINS ? '' : FALLBACK_URL + '/player/api.php?id=' + vidid + '&type=t&name=atom&get=video&format=json';
    try {
      const atomRes = await fetch(atomUrl, { headers: { 'User-Agent': UA, 'Referer': filmUrl } });
      const atomJson = await res.json();
      if (atomJson && atomJson.html) {
        streams.push({
          name: data.title || 'Film',
          title: '⌜ FULLHDFILM ⌟ | Atom Server | 🇹🇷 Dublaj',
          url: atomJson.html.replace(/\\/g, ''),
          quality: '1080p',
          headers: { 'Referer': filmUrl }
        });
      }
    } catch(e) {}

    return streams;
  } catch(e) {
    return [];
  }
}

module.exports = { getStreams };
