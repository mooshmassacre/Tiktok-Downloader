// ==UserScript==
// @name         Tik Downloader
// @namespace    http://tampermonkey.net/
// @version      3.0.3
// @description  Download TikTok videos, photos, and all carousel images. Supports Safari fallback, progress, and numbered filenames.
// @author       Face Off
// @license      MIT
// @match        https://*.tiktok.com/*
// @match        https://ofaceoff.github.io/Tiktok-Downloader/*
// @icon         https://www.tiktok.com/favicon.ico
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @connect      www.tikwm.com
// @connect      *
// ==/UserScript==

(function () {
    'use strict';

    // --- Configuration & i18n ---
    const isPt = (navigator.language || navigator.userLanguage).toLowerCase().startsWith('pt');

    const i18n = {
        tooltip: isPt ? "Baixar Post Sem Marca d'Água" : "Download Post Without Watermark",
        processing: isPt ? "Processando..." : "Processing...",
        extracting: isPt ? "Extraindo link..." : "Extracting link...",
        starting: isPt ? "Iniciando download..." : "Starting download...",
        downloading: isPt ? "Baixando..." : "Downloading...",
        success: isPt ? "Concluído!" : "Success!",
        errVideo: isPt ? "Abra um vídeo ou publicação de fotos!" : "Open a video or photo post!",
        errBlocked: isPt ? "Download bloqueado!" : "Download blocked!",
        errNotFound: isPt ? "Link não encontrado." : "Link not found.",
        errRead: isPt ? "Erro de leitura." : "API read error.",
        errOffline: isPt ? "Servidor offline." : "Server offline.",
        errPrefix: isPt ? "Erro: " : "Error: ",
        errFail: isPt ? "Falha ao processar" : "Processing failed"
    };

    // --- SVG Assets ---
    const svgConfig = 'width="24" height="24" viewBox="0 0 512 512" fill="white"';
    const icons = {
        tiktok: `<svg ${svgConfig} viewBox="0 0 448 512"><path d="M448 209.91a210.06 210.06 0 0 1-122.77-39.25V349.38A162.55 162.55 0 1 1 185 188.31V278.2a74.62 74.62 0 1 0 52.23 71.18V0l88 0a121.18 121.18 0 0 0 1.86 22.17h0A122.18 122.18 0 0 0 381 102.39a121.43 121.43 0 0 0 67 20.14Z"/></svg>`,
        loading: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/></path></svg>`,
        success: `<svg ${svgConfig} viewBox="0 0 448 512"><path d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z"/></svg>`,
        error: `<svg ${svgConfig} viewBox="0 0 512 512"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zm0-384c13.3 0 24 10.7 24 24V264c0 13.3-10.7 24-24 24s-24-10.7-24-24V152c0-13.3 10.7-24 24-24zM224 352a32 32 0 1 1 64 0 32 32 0 1 1 -64 0z"/></svg>`
    };

    // --- UI Components ---

    // Main Download Button
    const btn = document.createElement('button');
    btn.innerHTML = icons.tiktok;
    btn.title = i18n.tooltip;
    btn.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 102.5px;
        z-index: 999999;
        width: 55px;
        height: 55px;
        background-color: #fe2c55;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 4px 8px rgba(0,0,0,0.5);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    // Button Interaction Effects
    btn.onmouseover = () => { if (!btn.disabled) { btn.style.backgroundColor = '#e0274c'; btn.style.transform = 'scale(1.05)'; } };
    btn.onmouseout = () => { if (!btn.disabled) { btn.style.backgroundColor = '#fe2c55'; btn.style.transform = 'scale(1)'; } };
    btn.onmousedown = () => { if (!btn.disabled) btn.style.transform = 'scale(0.95)'; };
    btn.onmouseup = () => { if (!btn.disabled) btn.style.transform = 'scale(1.05)'; };

    // Progress Panel
    const progressPanel = document.createElement('div');
    progressPanel.style.cssText = `
        position: fixed;
        bottom: 85px;
        left: 20px;
        z-index: 999999;
        width: 220px;
        box-sizing: border-box;
        background-color: rgba(22, 24, 35, 0.9);
        backdrop-filter: blur(5px);
        border-radius: 8px;
        padding: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s ease, visibility 0.3s ease;
    `;

    const progressText = document.createElement('div');
    progressText.innerText = i18n.processing;
    progressText.style.cssText = `
        color: white;
        font-size: 13px;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-weight: 600;
        margin-bottom: 8px;
        text-align: center;
    `;

    const trackBar = document.createElement('div');
    trackBar.style.cssText = `
        width: 100%;
        height: 6px;
        background-color: rgba(255,255,255,0.2);
        border-radius: 3px;
        overflow: hidden;
    `;

    const fillBar = document.createElement('div');
    fillBar.style.cssText = `
        width: 0%;
        height: 100%;
        background-color: #fe2c55;
        border-radius: 3px;
        transition: width 0.2s ease, background-color 0.3s ease;
    `;

    // DOM Injection
    trackBar.appendChild(fillBar);
    progressPanel.appendChild(progressText);
    progressPanel.appendChild(trackBar);
    document.body.appendChild(btn);
    document.body.appendChild(progressPanel);

    // --- Helper Functions ---

    const updateUI = (text, percent, color = '#fe2c55') => {
        progressPanel.style.opacity = '1';
        progressPanel.style.visibility = 'visible';
        progressText.innerText = text;
        fillBar.style.width = `${percent}%`;
        fillBar.style.backgroundColor = color;
    };

    const resetButton = () => {
        btn.innerHTML = icons.tiktok;
        btn.disabled = false;
        btn.style.backgroundColor = '#fe2c55';
        btn.style.opacity = '1';
        btn.style.transform = 'scale(1)';

        progressPanel.style.opacity = '0';
        setTimeout(() => {
            progressPanel.style.visibility = 'hidden';
            fillBar.style.width = '0%';
        }, 300);
    };

    const showError = (errorMessage) => {
        btn.innerHTML = icons.error;
        btn.style.backgroundColor = '#ff4444';
        btn.style.opacity = '1';
        updateUI(errorMessage, 100, '#ff4444');
        setTimeout(resetButton, 4000);
    };

    // Keep GM_download as the first choice on Chrome/Firefox. Safari managers
    // may expose it but reject downloads, so errors must fall back to bytes.
    const downloadMedia = async (url, name, onprogress, mimeType = 'video/mp4') => {
        if (typeof GM_download === 'function') {
            try {
                await new Promise((resolve, reject) => {
                    let settled = false;
                    let request;
                    let timer;
                    const finish = (callback, value) => {
                        if (settled) return;
                        settled = true;
                        clearTimeout(timer);
                        callback(value);
                    };
                    const armTimer = () => {
                        clearTimeout(timer);
                        timer = setTimeout(() => {
                            finish(reject, new Error('Download stalled'));
                            if (request && typeof request.abort === 'function') {
                                try { request.abort(); } catch (error) {
                                    console.warn('[TikDownloader] Download abort failed:', error);
                                }
                            }
                        }, 120000);
                    };
                    armTimer();
                    try {
                        request = GM_download({
                            url, name, timeout: 120000,
                            onprogress: (event) => {
                                if (!settled) { armTimer(); onprogress(event); }
                            },
                            onload: () => finish(resolve),
                            onerror: (error) => finish(reject, error),
                            ontimeout: () => finish(reject, new Error('Download timed out'))
                        });
                        // Some managers return a Promise instead of only callbacks.
                        if (request && typeof request.then === 'function') {
                            request.then(() => finish(resolve), (error) => finish(reject, error));
                        }
                    } catch (error) {
                        finish(reject, error);
                    }
                });
                return;
            } catch (error) {
                console.warn('[TikDownloader] GM_download failed; using binary fallback:', error);
            }
        }

        let blob;
        if (typeof GM_xmlhttpRequest === 'function') {
            // Extension requests can access cross-origin media where page fetch
            // is blocked by Safari CORS. Do not silently retry denied permissions.
            blob = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET', url, responseType: 'arraybuffer',
                    timeout: 120000, onprogress,
                    onload: (response) => {
                        if (response.status < 200 || response.status >= 300) {
                            reject(new Error(`Media HTTP ${response.status}`));
                            return;
                        }
                        const bytes = response.response;
                        if (!bytes || !bytes.byteLength) {
                            reject(new Error('Empty media response'));
                            return;
                        }
                        resolve(new Blob([bytes], { type: mimeType }));
                    },
                    onerror: () => reject(new Error('Media request failed')),
                    ontimeout: () => reject(new Error('Media request timed out')),
                    onabort: () => reject(new Error('Media request aborted'))
                });
            });
        } else {
            // Last resort only: fetch requires the media server to allow CORS.
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 120000);
            try {
                const response = await fetch(url, { signal: controller.signal });
                if (!response.ok) throw new Error(`Media HTTP ${response.status}`);
                const bytes = await response.arrayBuffer();
                if (!bytes.byteLength) throw new Error('Empty media response');
                blob = new Blob([bytes], { type: mimeType });
            } finally {
                clearTimeout(timer);
            }
        }

        const blobUrl = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = blobUrl;
        anchor.download = name;
        anchor.style.display = 'none';
        try {
            document.body.appendChild(anchor);
            anchor.click();
        } finally {
            anchor.remove();
            // WebKit needs time to consume the URL before it is revoked.
            setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        }
    };

    // --- Core Logic ---

    btn.addEventListener('click', () => {
        const videoUrl = window.location.href;

        const match = new URL(videoUrl).pathname.match(/^\/@([^/]+)\/(video|photo)\/(\d+)\/?$/);
        if (!match) {
            showError(i18n.errVideo);
            return;
        }
        const fileBase = `tiktok_${match[1]}_${match[3]}`;
        const isPhoto = match[2] === 'photo';

        btn.innerHTML = icons.loading;
        btn.disabled = true;
        btn.style.backgroundColor = '#333';
        updateUI(i18n.extracting, 10);

        GM_xmlhttpRequest({
            method: 'POST',
            url: 'https://www.tikwm.com/api/',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            },
            data: 'url=' + encodeURIComponent(videoUrl) + '&hd=1',
            onload: async function (response) {
                try {
                    const res = JSON.parse(response.responseText);

                    if (res.code !== 0) {
                        const msg = res.msg ? res.msg.substring(0, 25) : i18n.errFail;
                        showError(i18n.errPrefix + msg);
                        return;
                    }

                    const data = res.data || {};
                    const images = Array.isArray(data.images) ? data.images : [];
                    const media = images.length ? images.map((url, index) => {
                        // TikWM returns ordered image URLs. Infer common image
                        // extensions from the pathname, never the signed query.
                        const extension = new URL(url).pathname.match(/\.(jpe?g|png|webp|avif)$/i);
                        const ext = extension ? extension[1].toLowerCase() : 'jpg';
                        const type = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
                            webp: 'image/webp', avif: 'image/avif' }[ext];
                        return { url, name: `${fileBase}_${String(index + 1).padStart(2, '0')}.${ext}`, type };
                    }) : !isPhoto && (data.hdplay || data.play)
                        ? [{ url: data.hdplay || data.play, name: `${fileBase}.mp4`, type: 'video/mp4' }]
                        : [];
                    if (!media.length) {
                        showError(i18n.errNotFound);
                        return;
                    }
                    updateUI(i18n.starting, 20);
                    try {
                        // Sequential downloads preserve carousel order and avoid
                        // fetching every full-size photo into memory at once.
                        for (let index = 0; index < media.length; index++) {
                            const item = media[index];
                            const label = media.length > 1 ? ` ${index + 1}/${media.length}` : '';
                            updateUI(`${i18n.downloading}${label}`, 20 + Math.floor(index / media.length * 79));
                            await downloadMedia(item.url, item.name, (e) => {
                                const fraction = e.total > 0 ? Math.min(e.loaded / e.total, 1) : 0;
                                const percent = 20 + Math.floor((index + fraction) / media.length * 79);
                                const detail = e.total > 0 ? `${Math.floor(fraction * 100)}%`
                                    : `${(e.loaded / (1024 * 1024)).toFixed(1)}MB`;
                                updateUI(`${i18n.downloading}${label} ${detail}`, percent);
                            }, item.type);
                        }
                        btn.innerHTML = icons.success;
                        btn.style.backgroundColor = '#00c851';
                        updateUI(i18n.success, 100, '#00c851');
                        setTimeout(resetButton, 3500);
                    } catch (error) {
                        console.error('[TikDownloader] Download failed:', error);
                        showError(i18n.errBlocked);
                    }
                } catch (e) {
                    showError(i18n.errRead);
                }
            },
            onerror: function () {
                showError(i18n.errOffline);
            }
        });
    });
})();
