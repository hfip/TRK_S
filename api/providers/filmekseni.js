/**
 * @file filmekseni.js
 * @description FilmEkseni Scraper Provider for Stremio Addon
 * @author Abdulluh.X
 * @telegram https://t.me/Abdulluh_X
 */

const fetch = require('node-fetch');

const MAIN_URL = 'https://filmekseni.cc';
const TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:149.0) Gecko/20100101 Firefox/149.0',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8',
  'Referer': MAIN_URL + '/'
};

async function getTmdbInfo(tmdbId, mediaType) {
  const type = mediaType === 'tv' ? 'tv' : 'movie';
  const url = `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      title: data.title || data.name || '',
      originalTitle: data.original_title || data.original_name || '',
      year: (data.release_date || data.first_air_date || '').slice(0, 4),
    };
  } catch(e) { return null; }
}

async function searchFilmEkseni(query) {
  const url = `${MAIN_URL}/search/`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: Object.assign({}, HEADERS, {
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
      }),
      body: `query=${encodeURIComponent(query)}`
    });
    if (!res.ok) return [];
    const html = await res.text();
    const json = JSON.parse(html);
    return (json && json.result && Array.isArray(json.result)) ? json.result : [];
  } catch(e) { return []; }
}

function extractQuality(url) {
  const s = (url || '').toLowerCase();
  if (s.includes('2160') || s.includes('4k')) return '4K';
  if (s.includes('1080')) return '1080p';
  if (s.includes('720')) return '720p';
  return 'HD';
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  if (mediaType !== 'movie') return []; // دعم الأفلام بناءً على خوارزمية الباترون
  
  try {
    const tmdbInfo = await getTmdbInfo(tmdbId, mediaType);
    if (!tmdbInfo || !tmdbInfo.title) return [];

    let results = await searchFilmEkseni(tmdbInfo.title);
    if (!results.length && tmdbInfo.originalTitle) {
      results = await searchFilmEkseni(tmdbInfo.originalTitle);
    }

    if (!results.length) return [];
    var best = results[0];

    const pageUrl = `${MAIN_URL}/${best.slug}`;
    const pageRes = await fetch(pageUrl, { headers: HEADERS });
    const html = await pageRes.text();

    var streams = [];
    const iframeRegex = /<iframe\s+[^>]*data-src="([^"]+)"/i;
    var match = html.match(iframeRegex) || html.match(/<iframe\s+[^>]*src="([^"]+)"/i);
    
    if (match) {
      var embedUrl = match[1];
      if (embedUrl.startsWith('//')) embedUrl = 'https:' + embedUrl;

      if (embedUrl.includes('eksenload') || embedUrl.includes('vidload.top')) {
        const embedRes = await fetch(embedUrl, { headers: { 'Referer': pageUrl, 'User-Agent': HEADERS['User-Agent'] } });
        const embedHtml = await embedRes.text();
        
        const fileMatches = [...embedHtml.matchAll(/file\s*:\s*['"]([^'"]+)['"]/g)];
        fileMatches.forEach(m => {
          var rawPath = m[1];
          if (rawPath && (rawPath.includes('m3u8') || rawPath.includes('mp4'))) {
            streams.push({
              name:    'Abdulluh.X',
              title:   '⌜ FILMEKSENI ⌟ | EksenLoad | ' + extractQuality(rawPath),
              url:     rawPath,
              quality: extractQuality(rawPath),
              headers: { 'Referer': new URL(embedUrl).origin + '/', 'User-Agent': HEADERS['User-Agent'] }
            });
          }
        });
      }
    }
    return streams;
  } catch(e) { return []; }
}

module.exports = { getStreams };
