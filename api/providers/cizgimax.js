/**
 * @file cizgimax.js
 * @description CizgiMax Scraper Provider for Stremio Addon
 * @author Abdulluh.X
 * @telegram https://t.me/Abdulluh_X
 */

const fetch = require('node-fetch');

var MAIN_URL = 'https://cizgimax.online';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
  'Referer':         MAIN_URL + '/'
};

var B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function b64Decode(str) {
  try {
    str = str.replace(/[^A-Za-z0-9+/]/g, '');
    var out = '', bits = 0, buf = 0;
    for (var i = 0; i < str.length; i++) {
      buf = (buf << 6) | B64.indexOf(str[i]);
      bits += 6;
      if (bits >= 8) { bits -= 8; out += String.fromCharCode((buf >> bits) & 0xFF); }
    }
    return out;
  } catch(e) { return null; }
}

function normalizeStr(s) {
  return (s || '').toLowerCase()
    .replace(/[ğ]/g,'g').replace(/[ü]/g,'u').replace(/[ş]/g,'s')
    .replace(/[ı]/g,'i').replace(/[ö]/g,'o').replace(/[ç]/g,'c')
    .replace(/[^a-z0-9]/g,' ').replace(/\s+/g,' ').trim();
}

function buildEpisodeUrl(diziUrl, season, episode) {
  var m = diziUrl.match(/\/diziler\/(.+?)-izle\//);
  if (!m) return null;
  return MAIN_URL + '/' + m[1] + '-' + season + '-sezon-' + episode + '-bolum-izle/';
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  try {
    var ep = (mediaType === 'movie') ? 'movie' : 'tv';
    const tmdbRes = await fetch('https://api.themoviedb.org/3/' + ep + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR');
    const d = await tmdbRes.json();
    var title = d.title || d.name || '';

    const srcRes = await fetch(MAIN_URL + '/api/search/suggest/?q=' + encodeURIComponent(title), {
      headers: Object.assign({}, HEADERS, { 'Accept': 'application/json' })
    });
    const searchData = await srcRes.json();
    var animes = searchData.animes || [];
    if (!animes.length) return [];

    var best = animes[0];
    var epUrl = buildEpisodeUrl(MAIN_URL + best.url, seasonNum || 1, episodeNum || 1);
    if (!epUrl) return [];

    const pageRes = await fetch(epUrl, { headers: HEADERS });
    const html = await pageRes.text();

    var b64 = (html.match(/var servers\s*=\s*JSON\.parse\(atob\("([^"]+)"\)\)/) || [])[1];
    if (!b64) return [];
    var decoded = b64Decode(b64);
    if (!decoded) return [];

    var servers = JSON.parse(decoded);
    var streams = [];

    servers.forEach(function(server) {
      if (server.type === 'sibnet' && server.streamUrl) {
        var streamUrl = server.streamUrl.startsWith('http') ? server.streamUrl : MAIN_URL + server.streamUrl;
        streams.push({
          name:    'Abdulluh.X',
          title:   '⌜ CİZGİMAX ⌟ | ' + (server.label || 'Sibnet'),
          url:     streamUrl,
          quality: 'Auto',
          headers: { 'Referer': epUrl, 'User-Agent': HEADERS['User-Agent'] }
        });
      }
    });

    return streams;
  } catch(e) { return []; }
}

module.exports = { getStreams };
