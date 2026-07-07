/**
 * @file hdfilmcehennemi.js
 * @description HDFilmCehennemi Scraper Provider for Stremio Addon
 * @author Abdulluh.X
 * @telegram https://t.me/Abdulluh_X
 */

const fetch = require('node-fetch');

var TMDB_API_KEY   = '500330721680edb6d5f7f12ba7cd9023';
var PRIMARY_DOMAIN = 'https://www.hdfilmcehennemi.nl';

var HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36',
  'Accept': 'application/json, text/html, */*',
  'Accept-Language': 'tr-TR,tr;q=0.9',
  'authority': 'www.hdfilmcehennemi.pro'
};

async function fetchTmdbInfo(tmdbId, mediaType) {
  var ep = mediaType === 'tv' ? 'tv' : 'movie';
  const r = await fetch('https://api.themoviedb.org/3/' + ep + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR');
  const d = await r.json();
  return {
    titleTr: d.title || d.name || '',
    titleEn: d.original_title || d.original_name || '',
    year: (d.release_date || d.first_air_date || '').slice(0, 4)
  };
}

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    const info = await fetchTmdbInfo(tmdbId, mediaType);
    var searchUrl = PRIMARY_DOMAIN + '/search/?q=' + encodeURIComponent(info.titleTr || info.titleEn);
    
    const res = await fetch(searchUrl, { headers: Object.assign({}, HEADERS, { 'Referer': PRIMARY_DOMAIN + '/' }) });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.results || !data.results.length) return [];

    // استخراج أول رابط متوافق من نتائج الـ HTML المرجعة من الـ API الداخلي
    var firstMatch = data.results[0];
    var hrefM = firstMatch.match(/href="([^"]+)"/);
    if (!hrefM) return [];
    let pageUrl = hrefM[1];

    if (mediaType === 'tv' && season && episode) {
      pageUrl = pageUrl.replace(/\/$/, '') + `/sezon-${season}/bolum-${episode}-hd1/`;
    }

    // طلب كود الصفحة عبر الـ router الداخلي لتفادي الحظر
    var routerUrl = pageUrl + (pageUrl.indexOf('?') === -1 ? '?router=1' : '&router=1');
    const pageRes = await fetch(routerUrl, { headers: HEADERS });
    const json = await pageRes.json();
    const html = json.html || json.data || '';

    var streams = [];
    var altRe = /<button[^>]+data-video="([^"]+)"[^>]*>([\s\S]*?)<\/button>/g;
    var m;

    while ((m = altRe.exec(html)) !== null) {
      var videoId = m[1];
      var label = m[2].replace(/<[^>]+>/g, '').trim();

      streams.push({
        name: "Abdulluh.X",
        title: `⌜ HDFILMCEHENNEMI ⌟ | ${label || 'CDN'} | Auto`,
        url: PRIMARY_DOMAIN + '/video/' + videoId + '/',
        quality: 'Auto',
        headers: { 'Referer': pageUrl }
      });
    }

    return streams;
  } catch(e) {
    return [];
  }
}

module.exports = { getStreams };
