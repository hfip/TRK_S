/**
 * @file setfilm.js
 * @description SetFilmIzle Scraper Provider for Stremio Addon
 * @author Abdulluh.X
 * @telegram https://t.me/Abdulluh_X
 */

const fetch = require('node-fetch');

const MAIN_URL = "https://www.setfilmizle.uk";
const AJAX_URL = `${MAIN_URL}/wp-admin/admin-ajax.php`;
const TMDB_API_KEY = "500330721680edb6d5f7f12ba7cd9023";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8"
};

async function getTmdbTitle(tmdbId, mediaType) {
  try {
    const type = mediaType === "movie" ? "movie" : "tv";
    const url = `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      trTitle: data.title || data.name || "",
      origTitle: data.original_title || data.original_name || ""
    };
  } catch (e) { return null; }
}

async function searchSetFilm(query) {
  try {
    const body = new URLSearchParams();
    body.append("action", "ajax_search");
    body.append("search", query);
    
    const res = await fetch(AJAX_URL, {
      method: "POST",
      headers: Object.assign({}, HEADERS, {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": MAIN_URL
      }),
      body: body.toString()
    });
    if (!res.ok) return [];
    const data = await res.json();
    const html = data.html || "";
    
    const match = html.match(/href="([^"]+)"/i);
    return match ? [match[1]] : [];
  } catch (e) { return []; }
}

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    const titles = await getTmdbTitle(tmdbId, mediaType);
    if (!titles) return [];

    let results = await searchSetFilm(titles.trTitle);
    if (!results.length && titles.origTitle !== titles.trTitle) {
      results = await searchSetFilm(titles.origTitle);
    }

    if (!results.length) return [];
    let contentUrl = results[0].startsWith("http") ? results[0] : MAIN_URL + results[0];

    if (mediaType === "tv") {
      contentUrl = contentUrl.replace(/\/$/, '') + `/sezon-${season}/bolum-${episode}.html`;
    }

    const pageRes = await fetch(contentUrl, { headers: HEADERS });
    if (!pageRes.ok) return [];
    const html = await pageRes.text();

    const streams = [];
    const playerRegex = /data-player-name="([^"]+)"\s+data-post-id="(\d+)"/g;
    let match;

    while ((match = playerRegex.exec(html)) !== null) {
      const playerName = match[1];
      const postId = match[2];

      streams.push({
        name: "Abdulluh.X",
        title: `⌜ SETFILM ⌟ | ${playerName} | Auto`,
        url: `${MAIN_URL}/embed?id=${postId}&server=${playerName}`,
        quality: "Auto",
        headers: { "Referer": contentUrl, "User-Agent": HEADERS["User-Agent"] }
      });
    }

    return streams;
  } catch (error) {
    return [];
  }
}

module.exports = { getStreams };
