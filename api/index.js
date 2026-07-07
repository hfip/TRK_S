/**
 * @file index.js
 * @description Main Router and Stream Handler for Stremio Addon
 * @author Abdulluh.X
 * @telegram https://t.me/Abdulluh_X
 */

const express = require('express');
const cors = require('cors');
const manifest = require('./manifest');

// مصفوفة تحتوي على أسماء الإضافات التي سنقوم بإنشائها تباعاً في مجلد providers
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
        // في حال لم يتم إنشاء ملف الـ provider بعد، نتجاهله مؤقتاً حتى لا يتوقف السيرفر
        providers[p] = null;
    }
});

const app = express();
app.use(cors());

// مسار المانيفست الأساسي
app.get('/manifest.json', (req, res) => {
    res.setHeader('Cache-Control', 'max-age=86400, public');
    res.json(manifest);
});

// المسار الرئيسي لمعالجة طلبات المشاهدة من ستريمو
app.get('/stream/:type/:id.json', async (req, res) => {
    const { type, id } = req.params;
    console.log(`[Abdulluh.X Addon] Request for Type: ${type}, ID: ${id}`);

    let imdbId = '';
    let season = null;
    let episode = null;

    if (id.startsWith('tt')) {
        const parts = id.split(':');
        imdbId = parts[0];
        if (parts.length > 2) {
            season = parseInt(parts[1], 10);
            episode = parseInt(parts[2], 10);
        }
    } else {
        imdbId = id;
    }

    const tasks = Object.entries(providers).map(([name, provider]) => {
        if (provider && typeof provider.getStreams === 'function') {
            return provider.getStreams(imdbId, type, season, episode)
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

        const validStreams = allStreams.filter(stream => stream && stream.url);
        console.log(`[Abdulluh.X Addon] Total streams for ${id}: ${validStreams.length}`);
        
        res.setHeader('Cache-Control', 'max-age=1800, public');
        res.json({ streams: validStreams });

    } catch (globalErr) {
        console.error('[Abdulluh.X Addon] Global Stream Error:', globalErr);
        res.json({ streams: [] });
    }
});

const PORT = process.env.PORT || 7000;
app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`🚀 Addon is running under name: Abdulluh.X`);
    console.log(`📱 Telegram Account: https://t.me/Abdulluh_X`);
    console.log(`🔗 Local Manifest: http://localhost:${PORT}/manifest.json`);
    console.log(`==================================================`);
});

module.exports = app;
