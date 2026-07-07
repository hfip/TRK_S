/**
 * @file manifest.js
 * @description Stremio Addon Manifest Configuration
 * @author Abdulluh.X
 * @telegram https://t.me/Abdulluh_X
 */

const manifest = {
    id: "community.abdulluhx.turkish.addon",
    version: "1.0.0",
    name: "Abdulluh.X Turkish Addon",
    description: "Multi-provider Stremio addon for Turkish Movies & Series. Developed by Abdulluh.X.",
    logo: "https://www.google.com/s2/favicons?domain=stremio.com&sz=128",
    resources: ["stream"],
    types: ["movie", "tv"],
    idPrefixes: ["tt"],
    catalogs: []
};

module.exports = manifest;
