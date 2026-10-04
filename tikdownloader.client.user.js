// ==UserScript==
// @name         Tik Downloader (Client)
// @namespace    http://tampermonkey.net/
// @version      1.0.1
// @description  Client loader for TikTok video, photo, and carousel downloads. Updates the Safari-compatible fork.
// @author       Face Off
// @match        https://*.tiktok.com/*
// @match        https://ofaceoff.github.io/Tiktok-Downloader/*
// @icon         https://www.tiktok.com/favicon.ico
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_download
// @connect      raw.githubusercontent.com
// @connect      www.tikwm.com
// @connect      *
// ==/UserScript==

(function () {
    'use strict';

    const CONFIG = {
        REPO_URL: 'https://raw.githubusercontent.com/mooshmassacre/Tiktok-Downloader/safari-tampermonkey-download-fallback/tikdownloader.user.js',
        CACHE_VER_KEY: 'tikDownloader_safari_version',
        CACHE_CODE_KEY: 'tikDownloader_safari_code'
    };

    const isPt = (navigator.language || navigator.userLanguage).toLowerCase().startsWith('pt');

    const i18n = {
        updated: (ver) => isPt
            ? `Você acabou de baixar a última versão do TikDownloader - v${ver}`
            : `You just downloaded the latest version of TikDownloader - v${ver}`
    };

    const showToast = (version) => {
        const toast = document.createElement('div');

        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(22, 24, 35, 0.95);
            backdrop-filter: blur(5px);
            color: #00c851;
            border-left: 4px solid #00c851;
            padding: 12px 16px 12px 20px;
            border-radius: 8px;
            font: 600 14px system-ui, -apple-system, sans-serif; 
            box-shadow: 0 8px 24px rgba(0,0,0,0.5);
            z-index: 9999999;
            opacity: 0;
            transform: translateY(-20px);
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            display: flex;
            align-items: center;
            gap: 16px;
        `;

        // Elemento do texto
        const msg = document.createElement('span');
        msg.textContent = i18n.updated(version);

        // Elemento do botão de fechar (SVG minimalista)
        const closeBtn = document.createElement('div');
        closeBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        closeBtn.style.cssText = `
            cursor: pointer;
            opacity: 0.6;
            transition: opacity 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        closeBtn.onmouseover = () => closeBtn.style.opacity = '1';
        closeBtn.onmouseout = () => closeBtn.style.opacity = '0.6';

        toast.appendChild(msg);
        toast.appendChild(closeBtn);
        document.body.appendChild(toast);

        // Animação de entrada
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        // Função de remoção suave
        const removeToast = () => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => toast.remove(), 400);
        };

        // Autodestruição após 30 segundos
        const timer = setTimeout(removeToast, 30000);

        // Ação de fechar manual (cancela o timer)
        closeBtn.onclick = () => {
            clearTimeout(timer);
            removeToast();
        };
    };

    const executeScript = (code) => {
        try {
            // Direct evaluation stays in the userscript sandbox. Injecting a
            // page <script> would lose GM APIs and may be blocked by page CSP.
            eval(code);
            return true;
        } catch (err) {
            console.error('[TikDownloader] Core execution failed:', err);
            return false;
        }
    };

    const init = async () => {
        let localVer = '0.0.0';
        let localCode = '';
        try {
            // await accepts synchronous values as well as manager Promises.
            localVer = await GM_getValue(CONFIG.CACHE_VER_KEY, '0.0.0');
            localCode = await GM_getValue(CONFIG.CACHE_CODE_KEY, '');
        } catch (err) {
            console.warn('[TikDownloader] Cache unavailable:', err);
        }

        const running = typeof localCode === 'string' && localCode && executeScript(localCode);

        GM_xmlhttpRequest({
            method: 'GET',
            url: `${CONFIG.REPO_URL}?t=${Date.now()}`,
            timeout: 30000,
            onload: async (res) => {
                if (res.status !== 200) return;

                const code = res.responseText;
                const versionMatch = code.match(/@version\s+([0-9.]+)/);

                if (!versionMatch) return;

                const remoteVer = versionMatch[1];

                if (!running) executeScript(code);
                if (remoteVer !== localVer || !running) {
                    try {
                        await GM_setValue(CONFIG.CACHE_CODE_KEY, code);
                        await GM_setValue(CONFIG.CACHE_VER_KEY, remoteVer);
                    } catch (err) {
                        console.warn('[TikDownloader] Cache write failed:', err);
                    }
                    if (remoteVer !== localVer) showToast(remoteVer);
                }
            },
            onerror: (err) => console.error('[TikDownloader] Update check failed:', err),
            ontimeout: () => console.error('[TikDownloader] Update check timed out')
        });
    };

    init();
})();
