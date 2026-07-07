/**
 * @file webteizle.js
 * @description WebteIzle Scraper Provider for Stremio Addon
 * @author Abdulluh.X
 * @telegram https://t.me/Abdulluh_X
 */

const fetch = require('node-fetch');

const BASE_URL = 'https://webteizle3.xyz';
const TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
  'Referer': BASE_URL + '/'
};

function titleToSlug(t) {
  return (t || '').toLowerCase()
    .replace(/\u011f/g,'g').replace(/\u00fc/g,'u').replace(/\u015f/g,'s')
    .replace(/\u0131/g,'i').replace(/\u0130/g,'i').replace(/\u00f6/g,'o').replace(/\u00e7/g,'c')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

async function fetchTmdbInfo(tmdbId, mediaType) {
  var endpoint = (mediaType === 'tv') ? 'tv' : 'movie';
  const res = await fetch('https://api.themoviedb.org/3/' + endpoint + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR');
  const d = await res.json();
  return {
    titleTr: d.title || d.name || '',
    titleEn: d.original_title || d.original_name || ''
  };
}

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    const info = await fetchTmdbInfo(tmdbId, mediaType);
    var slugTr = titleToSlug(info.titleTr);
    
    let pageUrl = BASE_URL + '/izle/dublaj/' + slugTr;
    if (mediaType === 'tv' && season && episode) {
      pageUrl += '/' + season + '-sezon-' + episode + '-bolum';
    }

    const response = await fetch(pageUrl, { headers: HEADERS });
    if (!response.ok) return [];
    const html = await response.text();

    var idM = html.match(/data-id="(\d+)"/);
    if (!idM) return [];
    var filmId = idM[1];

    // جلب البدائل والسيرفرات الخلفية
    const altRes = await fetch(BASE_URL + '/ajax/dataAlternatif3.asp', {
      method: 'POST',
      headers: Object.assign({}, HEADERS, {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest'
      }),
      body: 'filmid=' + filmId + '&dil=0&s=' + (season || '') + '&b=' + (episode || '') + '&bot=0'
    });
    
    const altData = await altRes.json();
    if (!altData || !altData.data || !Array.isArray(altData.data)) return [];

    var streams = [];
    for (let emb of altData.data) {
      if (emb.baslik && emb.baslik.toLowerCase() !== 'pixel') {
        streams.push({
          name: "Abdulluh.X",
          title: `⌜ WEBTEIZLE ⌟ | ${emb.baslik} | TR Dublaj`,
          url: `${BASE_URL}/embed/${emb.id}`,
          quality: "1080p",
          headers: { 'Referer': pageUrl }
        });
      }
    }
    return streams;

  } catch (e) {
    return [];
  }
}

module.exports = { getStreams };
