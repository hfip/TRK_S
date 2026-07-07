/**
 * @file diziyou.js
 * @description DiziYou Scraper Provider for Stremio Addon
 * @author Abdulluh.X
 * @telegram https://t.me/Abdulluh_X
 */

const fetch = require('node-fetch');

const DOMAIN_LIST_URL = 'https://raw.githubusercontent.com/Kraptor123/domainListesi/refs/heads/main/eklenti_domainleri.txt';
const BASE_URL        = 'https://www.diziyou.one';
const STORAGE_URL     = 'https://storage.diziyou.one';
const TMDB_KEY        = 'c4ffcab48dfaa7b41625ac13d61aec31';
const CACHE_MS        = 60 * 60 * 1000;
const UA              = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

var _domain = null;
var _domainTs = 0;

async function getBaseUrl() {
  var now = Date.now();
  if (_domain && (now - _domainTs) < CACHE_MS) return _domain;
  try {
    const r = await fetch(DOMAIN_LIST_URL, { headers: { 'User-Agent': UA } });
    const text = r.ok ? await r.text() : '';
    var lines = text.split('\n');
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i].trim();
      if (l.toLowerCase().indexOf('diziyou=') === 0) {
        var d = l.substring(8).trim().replace(/\/$/, '');
        if (d) { _domain = d; _domainTs = Date.now(); return d; }
      }
    }
  } catch(e) {}
  _domain = BASE_URL; _domainTs = Date.now(); return BASE_URL;
}

async function getHtml(url, referer) {
  const r = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
      'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
      'Referer': referer || BASE_URL + '/',
    }
  });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return await r.text();
}

var TR_MAP = { 'ğ':'g','ü':'u','ş':'s','ı':'i','ö':'o','ç':'c','Ğ':'g','Ü':'u','Ş':'s','İ':'i','Ö':'o','Ç':'c' };
function trSlug(s) {
  return s.replace(/[ğüşıöçĞÜŞİÖÇ]/g, function(c) { return TR_MAP[c] || c; })
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function epSlug(showSlug, s, e) {
  return showSlug + '-' + s + '-sezon-' + e + '-bolum';
}

async function getTmdbInfo(tmdbId, mediaType) {
  var ep = mediaType === 'movie' ? 'movie' : 'tv';
  const r = await fetch('https://api.themoviedb.org/3/' + ep + '/' + tmdbId + '?api_key=' + TMDB_KEY + '&language=tr-TR');
  const d = await r.json();
  return {
    title:    (d.name  || d.title  || '').trim(),
    origTitle:(d.original_name || d.original_title || '').trim(),
  };
}

function extractPlayerId(html) {
  var patterns = [
    /id=["']diziyouPlayer["'][^>]+src=["'][^"']*\/player\/(\d+)\.html/i,
    /src=["'][^"']*\/player\/(\d+)\.html["'][^>]*id=["']diziyouPlayer["']/i,
    /["']https?:\/\/[^"']*\/player\/(\d+)\.html["']/i,
  ];
  for (var i = 0; i < patterns.length; i++) {
    var m = html.match(patterns[i]);
    if (m) return m[1];
  }
  return null;
}

function parseEpisodes(html) {
  var list = [];
  var re = /<div[^>]+class="[^"]*otherepisodes[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
  var m;
  while ((m = re.exec(html)) !== null) {
    var block = m[1];
    var hM = block.match(/href=["']([^"']+)["']/i);
    var nM = block.match(/class="[^"]*epidosename[^"]*"[^>]*>([\s\S]*?)<\/(?:div|a)>/i);
    if (!hM || !nM) continue;
    var name = nM[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
    var sM = name.match(/(\d+)\.\s*Sezon/i);
    var eM = name.match(/(\d+)\.\s*B[oö]l[uü]m/i);
    if (sM && eM) list.push({ season: +sM[1], episode: +eM[1], url: hM[1] });
  }
  return list;
}

function sim(a, b) {
  if (!a || !b) return 0;
  a = a.toLowerCase(); b = b.toLowerCase();
  if (a === b) return 1;
  if (a.indexOf(b) !== -1 || b.indexOf(a) !== -1) return 0.8;
  var aw = a.split(/\s+/), bw = b.split(/\s+/), c = 0;
  aw.forEach(function(w) { if (bw.indexOf(w) !== -1 && w.length > 1) c++; });
  return c / Math.max(aw.length, bw.length);
}

async function tryGet(url, referer) {
  try {
    const html = await getHtml(url, referer);
    var id = extractPlayerId(html);
    return id ? { playerId: id, html: html, url: url } : null;
  } catch(e) { return null; }
}

async function buildSingleStream(playerId, isDub, episodeUrl) {
  var suffix    = isDub ? '_tr' : '';
  var playerUrl = BASE_URL + '/player/' + playerId + suffix + '.html';
  var epBase    = STORAGE_URL + '/episodes/' + playerId + suffix;
  var subBase   = STORAGE_URL + '/subtitles/' + playerId + suffix;
  var subOrig   = STORAGE_URL + '/subtitles/' + playerId;

  try {
    const ph = await getHtml(playerUrl, episodeUrl);
    var srcM = ph.match(/id=["']diziyouSource["'][^>]*src=["']([^"']+)["']/i)
            || ph.match(/src=["']([^"']+\.m3u8[^"']*)["'][^>]*type=["']application\/x-mpegURL["']/i);
    var m3u8 = srcM ? srcM[1] : (epBase + '/play.m3u8');

    return {
      name:    "Abdulluh.X",
      title:   isDub ? 'DiziYou — Türkçe Dublaj' : 'DiziYou — Türkçe Altyazılı',
      url:     m3u8,
      quality: '1080p',
      headers: { 'Referer': BASE_URL + '/', 'Origin': BASE_URL, 'User-Agent': UA }
    };
  } catch(e) {
    return {
      name:    "Abdulluh.X",
      title:   isDub ? 'DiziYou — Türkçe Dublaj' : 'DiziYou — Türkçe Altyazılı',
      url:     epBase + '/play.m3u8',
      quality: '1080p',
      headers: { 'Referer': BASE_URL + '/', 'Origin': BASE_URL, 'User-Agent': UA }
    };
  }
}

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    const baseUrl = await getBaseUrl();
    const info = await getTmdbInfo(tmdbId, mediaType);
    let result = null;

    if (mediaType === 'movie') {
      var slugEn = trSlug(info.origTitle);
      var slugTr = trSlug(info.title);
      var candidates = [baseUrl + '/' + slugEn + '/', baseUrl + '/' + slugTr + '/'];
      for (let url of candidates) {
        result = await tryGet(url, baseUrl + '/');
        if (result) break;
      }
    } else {
      var slugEn = trSlug(info.origTitle);
      var slugTr = trSlug(info.title);
      var epCandidates = [];
      if (slugEn) epCandidates.push(baseUrl + '/' + epSlug(slugEn, season, episode) + '/');
      if (slugTr && slugTr !== slugEn) epCandidates.push(baseUrl + '/' + epSlug(slugTr, season, episode) + '/');

      for (let url of epCandidates) {
        result = await tryGet(url, baseUrl + '/');
        if (result) break;
      }

      if (!result) {
        var q = info.title || info.origTitle;
        const searchHtml = await getHtml(baseUrl + '/?s=' + encodeURIComponent(q), baseUrl + '/');
        var showRe = /href=["'](https?:\/\/(?:www\.)?diziyou\.[a-z]+\/([^"'\/]+)\/)["'][^>]*title=["']([^"']+)["']/gi;
        var shows = [], sm;
        while ((sm = showRe.exec(searchHtml)) !== null) {
          shows.push({ url: sm[1], title: sm[3] });
        }
        var best = null, bestScore = 0.3;
        shows.forEach(function(s) {
          var score = Math.max(sim(s.title, info.title), sim(s.title, info.origTitle));
          if (score > bestScore) { bestScore = score; best = s; }
        });
        if (best) {
          const showHtml = await getHtml(best.url, baseUrl + '/');
          var eps = parseEpisodes(showHtml);
          for (var k = 0; k < eps.length; k++) {
            if (eps[k].season === season && eps[k].episode === episode) {
              result = await tryGet(eps[k].url, baseUrl + '/');
              break;
            }
          }
        }
      }
    }

    if (!result) return [];
    
    const streams = await Promise.all([
      buildSingleStream(result.playerId, false, result.url),
      buildSingleStream(result.playerId, true, result.url)
    ]);
    return streams.filter(Boolean);

  } catch(e) {
    return [];
  }
}

module.exports = { getStreams };
