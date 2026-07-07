/**
 * @file jetfilmizle.js
 * @description JetFilmizle Scraper Provider for Stremio Addon
 * @author Abdulluh.X
 * @telegram https://t.me/Abdulluh_X
 */

const fetch = require('node-fetch');

var BASE_URL     = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
  'User-Agent':    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
  'Accept':        'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language':'tr-TR,tr;q=0.9,en;q=0.8',
  'Referer':       BASE_URL + '/'
};

function titleToSlug(title) {
  return (title || '').toLowerCase()
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

async function getStreams(tmdbId, mediaType, season, episode) {
  if (mediaType !== 'movie') return [];

  try {
    const tmdbRes = await fetch('https://api.themoviedb.org/3/movie/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR');
    const d = await tmdbRes.json();
    var movieName = d.title || d.original_title;

    var slug = titleToSlug(movieName);
    var targetUrl = BASE_URL + '/film/' + slug;

    const pageRes = await fetch(targetUrl, { headers: HEADERS });
    if (!pageRes.ok) return [];
    const html = await pageRes.text();

    var streams = [];
    var iframeM = html.match(/<iframe[^>]+(?:data-litespeed-src|src)="([^"]+)"/i);
    
    if (iframeM) {
      var src = iframeM[1];
      if (src.startsWith('//')) src = 'https:' + src;

      streams.push({
        name:    'Abdulluh.X',
        title:   '⌜ JETFILM ⌟ | Player S1 | TR Dublaj',
        url:     src,
        quality: '1080p',
        headers: { 'Referer': targetUrl }
      });
    }

    var pdRe = /href="(https?:\/\/pixeldrain\.com\/u\/[^"]+)"/g;
    var m, index = 1;
    while ((m = pdRe.exec(html)) !== null) {
      var fileId = m[1].split('/u/').pop().split('?')[0];
      streams.push({
        name:    'Abdulluh.X',
        title:   `⌜ JETFILM ⌟ | Pixeldrain #${index} | TR Dublaj`,
        url:     'https://pixeldrain.com/api/file/' + fileId + '?download',
        quality: '1080p',
        headers: { 'Referer': 'https://pixeldrain.com/' }
      });
      index++;
    }

    return streams;
  } catch(e) {
    return [];
  }
}

module.exports = { getStreams };
