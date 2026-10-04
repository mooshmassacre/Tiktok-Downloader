const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const core = fs.readFileSync(path.join(__dirname, '../tikdownloader.user.js'), 'utf8');
const client = fs.readFileSync(path.join(__dirname, '../tikdownloader.client.user.js'), 'utf8');
function harness(overrides = {}) {
    const elements = [], timers = [], clicked = [], revoked = [], blobs = [];
    const document = {
        body: { appendChild(e) { e.attached = true; } },
        createElement(tag) {
            const e = { tag, style: {}, children: [], listeners: {}, appendChild(c) { this.children.push(c); },
                addEventListener(n, fn) { this.listeners[n] = fn; },
                click() { clicked.push(this); }, remove() { this.attached = false; } };
            elements.push(e); return e;
        }
    };
    const sandbox = { document, navigator: { language: 'en' }, window: { location: { href: 'https://www.tiktok.com/@creator/video/123' } },
        Blob, AbortController, console: { warn() {}, error() {} },
        URL: { createObjectURL(b) { blobs.push(b); return 'blob:test'; }, revokeObjectURL(u) { revoked.push(u); } },
        setTimeout(fn, ms) { const t = { fn, ms, cleared: false }; timers.push(t); return t; },
        clearTimeout(t) { if (t) t.cleared = true; }, requestAnimationFrame(fn) { fn(); }, ...overrides };
    const context = vm.createContext(sandbox);
    const helper = core.slice(core.indexOf('    const downloadMedia ='), core.indexOf('    // --- Core Logic ---'));
    vm.runInContext(helper + '\nglobalThis.downloadMedia = downloadMedia;', context);
    return { context, elements, timers, clicked, revoked, blobs };
}
function xhrOk(details) { details.onprogress?.({ loaded: 4, total: 4 }); details.onload({ status: 200, response: new Uint8Array([0,1,2,3]).buffer }); }
test('working GM_download preserves URL, filename and progress without XHR', async () => {
    let progress;
    const h = harness({ GM_download(d) { assert.equal(d.name, 'test.mp4'); assert.equal(d.url, 'https://cdn.test/v'); d.onprogress({ loaded: 2, total: 4 }); d.onload(); }, GM_xmlhttpRequest() { assert.fail('XHR called'); } });
    await h.context.downloadMedia('https://cdn.test/v', 'test.mp4', e => progress = e);
    assert.equal(progress.loaded, 2); assert.equal(h.clicked.length, 0);
});
for (const [name, api] of Object.entries({ missing: undefined, throwing() { throw Error('unsupported'); }, error(d) { d.onerror({ error: 'not_enabled' }); }, timeout(d) { d.ontimeout(); }, rejected() { return Promise.reject(Error('unsupported')); } })) {
    test(`GM_download ${name} falls back to extension bytes and delayed cleanup`, async () => {
        let xhr = 0;
        const h = harness({ GM_download: api, GM_xmlhttpRequest(d) { xhr++; assert.equal(d.responseType, 'arraybuffer'); xhrOk(d); }, fetch() { assert.fail('fetch called'); } });
        await h.context.downloadMedia('https://cdn.test/v', 'creator_123.mp4', () => {});
        assert.equal(xhr, 1); assert.equal(h.clicked.length, 1); assert.equal(h.clicked[0].download, 'creator_123.mp4');
        assert.equal(h.clicked[0].attached, false); assert.deepEqual([...new Uint8Array(await h.blobs[0].arrayBuffer())], [0,1,2,3]);
        assert.equal(h.revoked.length, 0); h.timers.find(t => t.ms === 60000).fn(); assert.deepEqual(h.revoked, ['blob:test']);
    });
}
test('silent GM_download stalls: abort and ignore late success/progress', async () => {
    let native, aborted = 0, progress = 0;
    const h = harness({ GM_download(d) { native = d; return { abort() { aborted++; } }; }, GM_xmlhttpRequest: xhrOk });
    const result = h.context.downloadMedia('https://cdn.test/v', 'test.mp4', () => progress++);
    h.timers.find(t => t.ms === 120000).fn(); await result;
    native.onload(); native.onprogress({ loaded: 1, total: 1 });
    assert.equal(aborted, 1); assert.equal(h.clicked.length, 1); assert.equal(progress, 1);
});
test('Promise GM_download success does not trigger fallback', async () => {
    const h = harness({ GM_download() { return Promise.resolve(); }, GM_xmlhttpRequest() { assert.fail(); } });
    await h.context.downloadMedia('url', 'test.mp4', () => {}); assert.equal(h.clicked.length, 0);
});
for (const event of ['onerror','ontimeout','onabort','http','empty']) test(`binary ${event} fails without saving`, async () => {
    const h = harness({ GM_xmlhttpRequest(d) { if (event === 'http') d.onload({ status: 403 }); else if (event === 'empty') d.onload({ status: 200, response: new ArrayBuffer(0) }); else d[event](); } });
    await assert.rejects(h.context.downloadMedia('url', 'test.mp4', () => {})); assert.equal(h.clicked.length, 0);
});
test('fetch used only without extension request API', async () => {
    const h = harness({ fetch: async () => ({ ok: true, arrayBuffer: async () => new Uint8Array([7]).buffer }) });
    await h.context.downloadMedia('url', 'test.mp4', () => {}); assert.equal(h.clicked.length, 1);
});
test('fetch HTTP and CORS errors do not save', async () => {
    for (const fetch of [async () => ({ ok: false, status: 403 }), async () => { throw TypeError('CORS'); }]) {
        const h = harness({ fetch }); await assert.rejects(h.context.downloadMedia('url', 'x.mp4', () => {})); assert.equal(h.clicked.length, 0);
    }
});
test('complete core uses extracted HD URL and dynamic filename', async () => {
    const h = harness({ GM_xmlhttpRequest(d) { if (d.method === 'POST') return d.onload({ responseText: JSON.stringify({ code: 0, data: { hdplay: 'https://cdn.test/hd', play: 'https://cdn.test/sd' } }) }); assert.equal(d.url, 'https://cdn.test/hd'); xhrOk(d); } });
    vm.runInContext(core, h.context); const btn = h.elements.find(e => e.tag === 'button'); btn.listeners.click();
    await new Promise(setImmediate); assert.equal(h.clicked[0].download, 'tiktok_creator_123.mp4');
    assert.equal(btn.style.backgroundColor, '#00c851');
});
for (const asyncCache of [false, true]) test(`client cache APIs ${asyncCache ? 'Promise' : 'sync'} execute once inside GM sandbox`, async () => {
    let request, writes = [];
    const cached = '// @version 3.0.2\nGM_setValue("executed", true);';
    const h = harness({ GM_getValue(k, fallback) { const v = k.endsWith('code') ? cached : '3.0.2'; return asyncCache ? Promise.resolve(v) : v; },
        GM_setValue(k, v) { writes.push([k,v]); return asyncCache ? Promise.resolve() : undefined; }, GM_xmlhttpRequest(d) { request = d; } });
    vm.runInContext(client, h.context); await new Promise(setImmediate);
    assert.match(request.url, /mooshmassacre\/Tiktok-Downloader\/safari-tampermonkey-download-fallback/);
    await request.onload({ status: 200, responseText: cached }); assert.equal(writes.filter(([k]) => k === 'executed').length, 1);
});
test('client starts remote code even if cache read/write fail', async () => {
    let request, ran = 0;
    const h = harness({ GM_getValue() { throw Error('unavailable'); }, GM_setValue() { throw Error('unavailable'); },
        GM_xmlhttpRequest(d) { request = d; }, GM_download() { ran++; } });
    vm.runInContext(client, h.context); await new Promise(setImmediate);
    await request.onload({ status: 200, responseText: '// @version 3.0.2\nGM_download();' }); assert.equal(ran, 1);
});
