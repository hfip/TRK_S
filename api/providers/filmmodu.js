/**
 * @file filmmodu.js
 * @description FilmModu Scraper Provider for Stremio Addon
 * @author Abdulluh.X
 * @telegram https://t.me/Abdulluh_X
 */

const fetch = require('node-fetch');

var BASE_URL = 'https://www.filmmodu.one';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
  'Referer': BASE_URL + '/'
};

function decodeHtml(str) {
  if (!str) return '';
  return str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, ' ').trim();
}

function isHighQuality(label) {
  if (!label) return false;
  var l = String(label).toLowerCase().replace(/\s/g, '');
  if (l.indexOf('4k') !== -1 || l.indexOf('2160') !== -1 || l.indexOf('1080') !== -1) return true;
  var num = parseInt(l);
  return (!isNaN(num) && num >= 1080);
}

function parseMovieList(html) {
  var results = [];
  var blockRegex = /<div[^>]+class="[^"]*movie[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g;
  var match;
  while ((match = blockRegex.exec(html)) !== null) {
    var block = match[0];
    var hrefMatch = block.match(/href="([^"]+)"/);
    var href = hrefMatch ? hrefMatch[1] : null;
    if (!href) continue;
    var textMatch = block.match(/<a[^>]*>([^<]+)<\/a>/);
    var text = textMatch ? decodeHtml(textMatch[1]) : null;
    if (href && text) {
      results.push({ href: href.startsWith('http') ? href : BASE_URL + href, text: text });
    }
  }
  return results;
}

function parseAlternateLinks(html) {
  var links = [];
  var altBlockMatch = html.match(/<div[^>]+class="[^"]*alternates[^"]*"[^>]*>([\s\S]*?)<\/div>/);
  if (!altBlockMatch) return links;
  var altBlock = altBlockMatch[1];
  var linkRegex = /<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
  var match;
  while ((match = linkRegex.exec(altBlock)) !== null) {
    var href = match[1].trim();
    var name = match[2].trim();
    if (name && name !== 'Fragman' && href) {
      links.push({ href: href.startsWith('http') ? href : BASE_URL + href, name: name });
    }
  }
  return links;
}

function normalizeStr(s) {
  return (s || '').toLowerCase()
    .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
    .replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
    .replace(/[^a-z0-9]/g,' ').replace(/\s+/g,' ').trim();
}

function findBestMatch(results, titleEn, titleTr, year) {
  var nEn = normalizeStr(titleEn);
  var nTr = normalizeStr(titleTr);
  var scored = results.map(function(r) {
    var score = 0;
    var nHref = normalizeStr(r.href);
    var nText = normalizeStr(r.text);
    if (nEn && nHref.indexOf(nEn.replace(/ /g, '-')) !== -1) score += 100;
    else if (nTr && nHref.indexOf(nTr.replace(/ /g, '-')) !== -1) score += 100;
    if (nEn && nText === nEn) score += 50;
    else if (nTr && nText === nTr) score += 50;
    if (year && r.href.indexOf(year) !== -1) score += 80;
    return { r: r, score: score };
  });
  scored.sort(function(a, b) { return b.score - a.score; });
  if (scored.length && scored[0].score >= 50) return scored[0].r.href;
  return null;
}

async function fetchStreamsFromAlt(altLink, filmUrl) {
  try {
    var altHeaders = Object.assign({}, HEADERS, { 'Referer': filmUrl });
    const r = await fetch(altLink.href, { headers: altHeaders });
    if (!r.ok) return [];
    const altHtml = await r.text();
    var videoIdMatch   = altHtml.match(/var videoId\s*=\s*'([^']+)'/);
    var videoTypeMatch = altHtml.match(/var videoType\s*=\s*'([^']+)'/);
    if (!videoIdMatch || !videoTypeMatch) return [];

    var sourceUrl = BASE_URL + '/get-source?movie_id=' + videoIdMatch[1] + '&type=' + videoTypeMatch[1];
    var sourceHeaders = Object.assign({}, HEADERS, {
      'Referer':          altLink.href,
      'X-Requested-With': 'XMLHttpRequest',
      'Accept':           'application/json, text/javascript, */*'
    });

    const res = await fetch(sourceUrl, { headers: sourceHeaders });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data || !data.sources || data.sources.length === 0) return [];

    var streams = [];
    data.sources.forEach(function(source) {
      if (!source.src) return;
      var qualityLabel = source.label || (source.res ? (source.res + 'p') : 'HD');
      if (!isHighQuality(qualityLabel)) return;

      var srcUrl = source.src;
      if (srcUrl.indexOf('.m3u8') === -1 && srcUrl.indexOf('.mp4') === -1) srcUrl = srcUrl + '.m3u8';

      streams.push({
        name:    'Abdulluh.X',
        title:   '⌜ FILMMODU ⌟ | ' + altLink.name + ' | ' + qualityLabel,
        url:     srcUrl,
        quality: qualityLabel,
        headers: { 'Referer': BASE_URL + '/', 'User-Agent': HEADERS['User-Agent'] }
      });
    });
    return streams;
  } catch(e) { return []; }
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  if (mediaType !== 'movie') return [];
  try {
    const r = await fetch('https://api.themoviedb.org/3/movie/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR');
    if (!r.ok) return [];
    const data = await r.json();
    var info = {
      titleTr: data.title || '',
      titleEn: data.original_title || '',
      year:    data.release_date ? data.release_date.slice(0, 4) : ''
    };

    var searchUrl = BASE_URL + '/film-ara?term=' + encodeURIComponent(info.titleEn || info.titleTr);
    const srcRes = await fetch(searchUrl, { headers: HEADERS, redirect: 'follow' });
    var finalUrl = srcRes.url || searchUrl;
    let filmUrl = null;

    if (finalUrl !== searchUrl && finalUrl.indexOf('/film-ara') === -1) {
      filmUrl = finalUrl;
    } else {
      const html = await srcRes.text();
      var canonicalMatch = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/);
      if (canonicalMatch && html.indexOf('class="alternates"') !== -1) {
        filmUrl = canonicalMatch[1];
      } else {
        var results = parseMovieList(html);
        if (results.length > 0) filmUrl = findBestMatch(results, info.titleEn, info.titleTr, info.year);
      }
    }

    if (!filmUrl) return [];
    const pageRes = await fetch(filmUrl, { headers: HEADERS });
    const pageHtml = await pageRes.text();
    var altLinks = parseAlternateLinks(pageHtml);
    if (altLinks.length === 0) return [];

    let allStreams = [];
    for (let alt of altLinks) {
      const s = await fetchStreamsFromAlt(alt, filmUrl);
      allStreams = allStreams.concat(s);
    }
    return allStreams;
  } catch(e) {
    return [];
  }
}

module.exports = { getStreams };
