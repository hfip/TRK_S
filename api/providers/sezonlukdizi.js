/**
 * @file sezonlukdizi.js
 * @description SezonlukDizi Scraper Provider for Stremio Addon
 * @author Abdulluh.X
 * @telegram https://t.me/Abdulluh_X
 */

const fetch = require('node-fetch');

const BASE_URL     = 'https://sezonlukdizi8.com';
const TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
  'Referer': BASE_URL + '/'
};

function titleToSlug(t) {
  if(!t) return "";
  return t.toLowerCase()
    .replace(/&/g,'and').replace(/'/g,'').replace(/’/g,'')
    .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
    .replace(/ı/g,'i').replace(/İ/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

async function fetchTmdbInfo(tmdbId) {
  const r = await fetch('https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR');
  const d = await r.json();
  return {
    title: d.name || d.original_name || 'Dizi',
    titleEn: d.original_name || '',
    titleTr: d.name || ''
  };
}

async function getStreams(tmdbId, mediaType, season, episode) {
  if (mediaType !== 'tv') return [];

  try {
    const info = await fetchTmdbInfo(tmdbId);
    var slug = titleToSlug(info.titleEn) || titleToSlug(info.titleTr);
    if (!slug) return [];

    var epUrl = BASE_URL + '/' + slug + '/' + season + '-sezon-' + episode + '-bolum.html';
    const r = await fetch(epUrl, { headers: HEADERS });
    if (!r.ok) return [];
    const html = await r.text();

    var bidM = html.match(/data-id="([^"]+)"/);
    if (!bidM) return [];
    var bid = bidM[1];

    // جلب السيرفرات لنسخة الدبلجة والترجمة بالتوازي
    const altRes = await fetch(BASE_URL + '/ajax/dataAlternatif.asp', {
      method: 'POST',
      headers: Object.assign({}, HEADERS, {
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': epUrl
      }),
      body: 'bid=' + encodeURIComponent(bid) + '&dil=0'
    });
    
    const text = await altRes.text();
    let jData = [];
    try { jvo = JSON.parse(text); jData = jvo.data || []; } catch(e) {}

    var streams = [];
    jData.forEach(function(v) {
      if (v.baslik && v.baslik.toLowerCase() !== 'pixel') {
        streams.push({
          name: "Abdulluh.X",
          title: `⌜ SEZONLUKDIZI ⌟ | ${v.baslik} | TR Dublaj`,
          url: `${BASE_URL}/embed/${v.id}`,
          quality: '1080p',
          headers: { 'Referer': epUrl }
        });
      }
    });

    return streams;
  } catch(e) {
    return [];
  }
}

module.exports = { getStreams };
