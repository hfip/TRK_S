/**
 * @file index.js
 * @description Final Standard Addon Router with Automatic IMDB to TMDB Converter
 * @author Abdulluh.X
 * @telegram https://t.me/Abdulluh_X
 */

const express = require('express');
const cors = require('cors');
const manifest = require('./manifest');
const fetch = require('node-fetch');

const TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

const providersList = [
    'diziyou', 'filmmodu', 'cizgivedizi', 'dizilife', 'filmekseni', 
    'cizgimax', 'filmmakinesi', 'setfilm', 'webteizle', 'sezonlukdizi', 
    'm3u_provider', 'jetfilmizle', 'diziyo', 'fullhdfilmizlesene', 'sinewix'
];

const providers = {};
providersList.forEach(p => {
    try {
        providers[p] = require(`./providers/${p}`);
    } catch (e) {
        providers[p] = null;
    }
});

const app = express();
app.use(cors());

// دالة سريعة لتحويل الـ IMDB ID (tt...) إلى معرف TMDB رقمي
async function convertImdbToTmdb(imdbId, type) {
    const externalSource = type === 'movie' ? 'imdb_id' : 'imdb_id';
    const findUrl = `https://api.themoviedb.org/3/find/${imdbId}?api_key=${TMDB_API_KEY}&external_source=${externalSource}`;
    try {
        const res = await fetch(findUrl);
        if (!res.ok) return imdbId;
        const data = await res.json();
        
        if (type === 'movie' && data.movie_results && data.movie_results.length > 0) {
            return data.movie_results[0].id.toString();
        } else if (type === 'tv' && data.tv_results && data.tv_results.length > 0) {
            return data.tv_results[0].id.toString();
        }
        return imdbId;
    } catch (e) {
        return imdbId;
    }
}

app.get('/manifest.json', (req, res) => {
    res.setHeader('Cache-Control', 'max-age=86400, public');
    res.json(manifest);
});

app.get('/stream/:type/:id.json', async (req, res) => {
    let { type, id } = req.params;
    console.log(`[Abdulluh.X Addon] Request for Type: ${type}, ID: ${id}`);

    if (type === 'series') type = 'tv';

    let imdbId = '';
    let season = null;
    let episode = null;

    let cleanId = id.replace(/^(tmdb:|imdb:)/i, '');

    if (cleanId.startsWith('tt') || id.includes(':')) {
        const parts = cleanId.split(':');
        imdbId = parts[0];
        if (parts.length > 2) {
            season = parseInt(parts[1], 10);
            episode = parseInt(parts[2], 10);
        } else if (parts.length === 2 && type === 'tv') {
            season = 1;
            episode = parseInt(parts[1], 10);
        }
    } else {
        imdbId = cleanId;
    }

    // إذا كان المعرف يبدأ بـ tt، نقوم بتحويله فوراً لـ TMDB رقمي ليتوافق مع الإضافات داخلياً
    let finalTargetId = imdbId;
    if (imdbId.startsWith('tt')) {
        console.log(`[Abdulluh.X Addon] Converting IMDB ID ${imdbId} to TMDB ID...`);
        finalTargetId = await convertImdbToTmdb(imdbId, type);
        console.log(`[Abdulluh.X Addon] Converted Successfully to TMDB ID: ${finalTargetId}`);
    }

    const tasks = Object.entries(providers).map(([name, provider]) => {
        if (provider && typeof provider.getStreams === 'function') {
            return provider.getStreams(finalTargetId, type, season, episode)
                .then(streams => (Array.isArray(streams) ? streams : []))
                .catch(err => {
                    console.error(`[Abdulluh.X Addon] Error in [${name}]:`, err.message || err);
                    return [];
                });
        }
        return Promise.resolve([]);
    });

    try {
        const results = await Promise.allSettled(tasks);
        let allStreams = [];

        results.forEach((result) => {
            if (result.status === 'fulfilled' && result.value) {
                allStreams = allStreams.concat(result.value);
            }
        });

        // تنظيف وحذف أي تكرار في روابط البث المستخرجة
        const seenUrls = new Set();
        const validStreams = allStreams.filter(stream => {
            if (!stream || !stream.url) return false;
            if (seenUrls.has(stream.url)) return false;
            seenUrls.add(stream.url);
            return true;
        });

        console.log(`[Abdulluh.X Addon] Total streams for ${id}: ${validStreams.length}`);
        
        res.setHeader('Cache-Control', 'max-age=1800, public');
        res.json({ streams: validStreams });

    } catch (globalErr) {
        console.error('[Abdulluh.X Addon] Global Stream Error:', globalErr);
        res.json({ streams: [] });
    }
});

const PORT = process.env.PORT || 7000;
app.get('/', (req, res) => res.json(manifest));

app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`🚀 Addon perfectly patched and live under name: Abdulluh.X`);
    console.log(`==================================================`);
});

module.exports = app;
