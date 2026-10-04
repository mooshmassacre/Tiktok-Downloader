# Tik Downloader

Download TikTok videos, individual photos, and every image in photo carousels directly from TikTok. Videos support HD and no-watermark links when available.

Tik Downloader is a modern UserScript that integrates directly into TikTok's interface, allowing you to download videos and photo posts with a single click.

> **Este fork baixa vídeos, fotos individuais e todas as imagens de carrosséis.** As fotos são salvas separadamente, em ordem e com nomes numerados.
>
> Use os links da branch `safari-tampermonkey-download-fallback` abaixo; a `main` ainda contém a versão original enquanto o PR estiver aberto.

> **⭐ Recommended Installation:** `tikdownloader.client.user.js`
>
> The Client version automatically keeps Tik Downloader updated with the updates from this fork’s compatibility branch.

---

## 🌎 Select Language

| 🇺🇸 English | 🇧🇷 Português |
|------------|------------|
| [Go to English Documentation](#-english) | [Ir para a Documentação em Português](#-português) |

---

# 🇺🇸 English

## ✨ Features

- Download TikTok videos in MP4, without watermark when available
- Individual photos and every image in photo carousels (ordered, separate files)
- HD videos when available
- One-click download directly from TikTok
- Real-time progress bar
- Smart file naming
- Automatic updates through the Client version

## 📦 Project Structure

```text
📦 Tik Downloader
├── tikdownloader.client.user.js
└── tikdownloader.user.js
```

## 📊 Client vs Standalone

| Feature | Client | Standalone |
|----------|---------|---------|
| Videos in MP4 (without watermark when available) | ✅ | ✅ |
| HD videos when available | ✅ | ✅ |
| Individual photos | ✅ | ✅ |
| All images in photo carousels, in order | ✅ | ✅ |
| Numbered carousel filenames | ✅ | ✅ |
| Automatic updates | ✅ | ❌ |
| Local cache | ✅ | ❌ |

## ⚙️ Technologies

- JavaScript (ES6+)
- Tampermonkey
- TikWM API
- GM_xmlhttpRequest
- GM_download
- GM_setValue
- GM_getValue

## 🚀 Installation

1. Install Tampermonkey.
2. Install `tikdownloader.client.user.js` (recommended).
3. Open TikTok.
4. Open a video, individual photo, or photo carousel post.
5. Click the Tik Downloader button.

## Safari / Tampermonkey

Install Tampermonkey from its official Safari listing, enable it in Safari Extensions,
and allow access to TikTok. Install **only one** of these scripts from this fork's
`safari-tampermonkey-download-fallback` branch:

- [Standalone](https://raw.githubusercontent.com/mooshmassacre/Tiktok-Downloader/safari-tampermonkey-download-fallback/tikdownloader.user.js)
- [Client loader](https://raw.githubusercontent.com/mooshmassacre/Tiktok-Downloader/safari-tampermonkey-download-fallback/tikdownloader.client.user.js)

Chrome/Firefox continue to try `GM_download` first. If it is missing, throws,
rejects, reports an error or times out, the script requests the video or image bytes with
`GM_xmlhttpRequest`, then clicks a temporary Blob URL with the corresponding MP4 or image
filename. The URL is revoked after 60 seconds so WebKit can consume it.
If the extension request API is unavailable, the binary fallback uses `fetch`;
this last resort requires the media server to permit CORS. It cannot bypass CORS.

Both scripts retain their existing grants. `@connect *` is necessary because
TikWM can return or redirect to media hosts outside `www.tikwm.com`; approve only
the actual media host when Tampermonkey asks. The loader stays in the userscript
sandbox (no page script injection), supports synchronous or Promise cache APIs,
and uses a separate cache and this fork branch so upstream code cannot overwrite
the Safari fix. Disable the old client before installing this version.

The Blob fallback buffers each media file in memory. Success means the browser
was asked to save it, not that the save dialog or disk write completed. Allow
downloads for TikTok in Safari if prompted. Real Safari/Tampermonkey and live
TikTok/CDN behavior still need a manual smoke test; automated tests mock the
manager APIs and DOM and do not prove browser compatibility.

### Validation

Run `node --test tests/*.test.cjs` and `node --check tikdownloader.user.js` plus
`node --check tikdownloader.client.user.js`. For a browser smoke test, download a
public video and photo carousel in Safari, then Chrome/Firefox; verify filenames, playable MP4, image order,
progress/error UI, repeat downloads, and cached loader after reload/offline.
Disable Tampermonkey's download API to exercise the fallback and test a denied
media-host permission to verify errors do not report success.

## 🔄 Automatic Updates

The Client version automatically checks this fork branch for updates, downloads updates, stores them locally, and keeps the downloader up to date.

## 🔒 Privacy

The script sends the post URL to TikWM to extract media links. The Client also requests script updates from GitHub and caches script code locally.

---

# 🇧🇷 Português

## ✨ Recursos

- Download de vídeos em MP4, sem marca d’água quando disponível
- Fotos individuais e todas as imagens de carrosséis (arquivos separados, em ordem)
- Vídeos em HD quando disponível
- Download com apenas um clique
- Barra de progresso em tempo real
- Nomeação inteligente dos arquivos
- Atualizações automáticas através da versão Client

## 📦 Estrutura do Projeto

```text
📦 Tik Downloader
├── tikdownloader.client.user.js
└── tikdownloader.user.js
```

## 📊 Client vs Standalone

| Recurso | Client | Standalone |
|----------|---------|---------|
| Vídeos em MP4 (sem marca d’água quando disponível) | ✅ | ✅ |
| Vídeos em HD quando disponível | ✅ | ✅ |
| Fotos individuais | ✅ | ✅ |
| Todas as imagens de carrosséis, em ordem | ✅ | ✅ |
| Nomes numerados para imagens de carrosséis | ✅ | ✅ |
| Atualizações automáticas | ✅ | ❌ |
| Cache local | ✅ | ❌ |

## ⚙️ Tecnologias

- JavaScript (ES6+)
- Tampermonkey
- API TikWM
- GM_xmlhttpRequest
- GM_download
- GM_setValue
- GM_getValue

## 🚀 Instalação

1. Instale o Tampermonkey.
2. Instale `tikdownloader.client.user.js` (recomendado).
3. Acesse o TikTok.
4. Abra uma publicação de vídeo, foto individual ou carrossel de fotos.
5. Clique no botão do Tik Downloader.

## Safari / Tampermonkey

Instale o Tampermonkey pela loja oficial do Safari, habilite a extensão e permita
acesso ao TikTok. Use somente um dos scripts da branch
`safari-tampermonkey-download-fallback` deste fork: os links de instalação estão
na seção em inglês acima. Desative o Client antigo antes de instalar o novo.

Chrome/Firefox continuam tentando `GM_download` primeiro. Quando ele não existe
ou falha, o script obtém os bytes por `GM_xmlhttpRequest`, cria um Blob URL e
aciona `<a download>` mantendo o nome MP4 ou o nome numerado da imagem. O URL é revogado após 60 segundos.
`fetch` é usado somente quando a API de requisição da extensão não existe e ainda
depende de CORS. `@connect *` permite os hosts variáveis e redirecionamentos da
mídia retornada pelo TikWM; autorize o host solicitado pelo Tampermonkey.

O loader mantém as APIs GM no sandbox, aceita cache síncrono ou assíncrono e
busca esta branch do fork, com cache separado. O fallback mantém cada arquivo de mídia
na memória; “Concluído” indica que o pedido de salvar foi disparado, sem confirmar
a gravação no disco. Permita downloads no Safari quando solicitado.

Os testes automatizados simulam APIs e DOM. A validação real no Safari/Tampermonkey
com TikTok/CDN permanece necessária: confira MP4 reproduzível, fotos na ordem, nomes, progresso,
erros, downloads repetidos e cache após recarregar/offline. Repita no Chrome/Firefox.
Execute `node --test tests/*.test.cjs` para os testes locais.

## 🔄 Atualizações Automáticas

A versão Client verifica automaticamente novas versões nesta branch do fork, baixa atualizações, armazena localmente e mantém o downloader atualizado.

## 🔒 Privacidade

O script envia o link da publicação ao TikWM para extrair os links da mídia. O Client também busca atualizações no GitHub e guarda o código do script em cache local.

---

## 👤 Author

**Face Off**

https://github.com/OFaceOff/Tiktok-Downloader

## Photo posts / Publicações de fotos

Version 3.0.3 accepts `/photo/` posts as well as `/video/` posts. TikWM's
`data.images` array is downloaded sequentially in carousel order, with filenames
like `tiktok_creator_postid_01.jpg`, `_02.jpg`, etc. Image URL extensions are
preserved when available; otherwise JPEG is assumed. No MP4 is synthesized from
a carousel, and soundtrack audio is not downloaded. If TikWM cannot extract the
images, the UI reports that no media link was found.

A versão 3.0.3 baixa as imagens de publicações `/photo/` em ordem, com nomes
numerados e progresso por imagem. Vídeos continuam sendo baixados em MP4.
Permita múltiplos downloads no navegador se solicitado. O loader busca a versão
nova automaticamente; se já estiver aberto, recarregue após a atualização do cache.
O suporte depende de o TikWM retornar as imagens; testes reais com o post indicado
e Safari/Tampermonkey ainda são necessários.
