/**
 * @file cizgivedizi.js
 * @description ÇizgiVeDizi Scraper Provider for Stremio Addon
 * @author Abdulluh.X
 * @telegram https://t.me/Abdulluh_X
 */

const fetch = require('node-fetch');

var BASE_URL    = 'https://www.cizgivedizi.com';
var TMDB_KEY    = '500330721680edb6d5f7f12ba7cd9023';
var SIBNET_HOST = 'https://video.sibnet.ru';

var HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
  'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
  'Referer':         BASE_URL + '/'
};

function norm(s) {
  return (s || '').toLowerCase()
    .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
    .replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
    .replace(/[^a-z0-9]/g,'');
}

function b64decode(b64) {
  try {
    if (typeof Buffer !== 'undefined') {
      return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    }
    return null;
  } catch(e) { return null; }
}

async function getHtmlFull(url) {
  var pageUrl = url.indexOf('?') === -1 ? url + '?ajax=page' : url + '&ajax=page';
  const r = await fetch(pageUrl, { headers: HEADERS });
  return r.ok ? await r.text() : '';
}

function parseEmbeds(html) {
  var b64m = html.match(/window\.__embeds_b64\s*=\s*'([^']+)'/)
          || html.match(/window\.__embeds_b64\s*=\s*"([^"]+)"/);
  if (b64m) {
    var arr = b64decode(b64m[1]);
    if (Array.isArray(arr)) return arr.filter(Boolean);
  }
  return [];
}

async function extractSibnet(url) {
  try {
    const html = await getHtmlFull(url);
    var m = html.match(/player\.src\s*\(\s*\[\s*\{[^}]*src\s*:\s*["']([^"']+\.mp4)["']/i);
    if (!m) return null;
    var mp4 = m[1].indexOf('http') === 0 ? m[1] : SIBNET_HOST + m[1];
    return { url: mp4, headers: { 'Referer': url } };
  } catch(e) { return null; }
}

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    var ep = mediaType === 'tv' ? 'tv' : 'movie';
    const tmdbRes = await fetch('https://api.themoviedb.org/3/' + ep + '/' + tmdbId + '?api_key=' + TMDB_KEY + '&language=tr-TR');
    const d = await tmdbRes.json();
    var info = {
      titleTr: d.title || d.name || '',
      titleEn: d.original_title || d.original_name || '',
      year: (d.release_date || d.first_air_date || '').slice(0, 4)
    };

    var searchAnchor = mediaType === 'movie' ? BASE_URL + '/film/_/_' : BASE_URL + '/dizi/gmb/gumball';
    const srcRes = await fetch(searchAnchor + '?ajax=search&q=' + encodeURIComponent(info.titleTr), {
      headers: Object.assign({}, HEADERS, { 'X-Requested-With': 'XMLHttpRequest' })
    });
    const results = await srcRes.json();
    if (!results || !results.length) return [];

    var best = results[0]; 
    var typePath = mediaType === 'movie' ? 'film' : 'dizi';
    var epUrl = BASE_URL + '/' + typePath + '/' + best.id + '/' + best.slug;
    if (mediaType === 'tv') epUrl += '/' + episode;

    const pageHtml = await getHtmlFull(epUrl);
    var embeds = parseEmbeds(pageHtml);
    var streams = [];

    for (let emb of embeds) {
      if (emb.indexOf('sibnet') !== -1) {
        const s = await extractSibnet(emb);
        if (s) {
          streams.push({
            name:    'Abdulluh.X',
            title:   '⌜ ÇİZGİVEDİZİ ⌟ | Sibnet | Auto',
            url:     s.url,
            quality: 'Auto',
            headers: s.headers
          });
        }
      }
    }
    return streams;
  } catch(e) {
    return [];
  }
}

module.exports = { getStreams };
