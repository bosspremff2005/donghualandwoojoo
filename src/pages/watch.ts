import { layout } from './layout'
import { breadcrumb, genresFromJson } from './components'

export function watchPage(data: { anime: any, episode: any, allEpisodes: any[], prevEp: any, nextEp: any, recommended?: any[], siteName?: string }) {
  const { anime, episode, allEpisodes, prevEp, nextEp, recommended = [], siteName = 'DonghuaLand' } = data
  const genres = genresFromJson(anime.genres)

  // Determine what video source to show (legacy fallback)
  const hasEmbed = episode.embed_url && episode.embed_url.trim()
  const hasVideo = episode.video_url && episode.video_url.trim()

  let defaultPlayerHTML = ''
  if (hasEmbed) {
    defaultPlayerHTML = `<iframe
      src="${episode.embed_url}"
      allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
      scrolling="no"
      frameborder="0"
      loading="eager"
      referrerpolicy="no-referrer-when-downgrade"
      style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;background:#000;"
      title="Episode ${episode.episode_number} player"
    ></iframe>`
  } else if (hasVideo) {
    defaultPlayerHTML = `<video controls preload="metadata" playsinline
      style="position:absolute;top:0;left:0;width:100%;height:100%;background:#000;">
      <source src="${episode.video_url}" type="video/mp4">
      Your browser does not support video playback.
    </video>`
  } else {
    defaultPlayerHTML = `
    <div style="position:absolute;top:0;left:0;width:100%;height:100%;background:#0a0a0f;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;" id="noSrcPlaceholder">
      <i class="fas fa-video-slash" style="font-size:48px;color:var(--text4);"></i>
      <div style="text-align:center;padding:0 20px;">
        <div style="font-size:16px;font-weight:700;color:var(--text2);margin-bottom:8px;">Video Not Available</div>
        <div style="font-size:13px;color:var(--text3);">Select a server below or wait while servers load...</div>
        <div style="font-size:12px;color:var(--text4);margin-top:8px;">Admin can add server links via the admin panel.</div>
      </div>
    </div>`
  }

  // Sort episodes descending (newest first)
  const sortedEpisodes = [...allEpisodes].sort((a, b) => b.episode_number - a.episode_number)

  // Prev/Next hrefs
  const prevHref = prevEp ? `/watch/${anime.slug}-episode-${prevEp.episode_number}` : ''
  const nextHref = nextEp ? `/watch/${anime.slug}-episode-${nextEp.episode_number}` : ''

  // Genres tags HTML
  const genresHtml = genres.length > 0
    ? genres.map((g: string) => `<a href="/search?genre=${encodeURIComponent(g)}" class="ep-detail-genre-tag">${g}</a>`).join('')
    : ''

  // Studios
  let studios: string[] = []
  try { studios = JSON.parse(anime.studios || '[]') } catch { studios = [] }

  // Recommended anime
  const recHtml = recommended.slice(0, 12).map(r => {
    const recGenres = (() => { try { const g = JSON.parse(r.genres || '[]'); return g.slice(0,2).join(', ') } catch { return '' } })()
    return `
    <a href="/anime/${r.slug}" class="rec-card" title="${r.title}">
      <div class="rec-thumb-wrap">
        <img src="${r.cover_image || ''}" alt="${r.title}" class="rec-thumb"
             loading="lazy" decoding="async"
             onerror="this.style.display='none';this.parentElement.style.background='var(--bg5)';">
        <div class="rec-type-badge">${r.type || 'ONA'}</div>
        ${r.latest_ep ? `<div class="rec-ep-badge">EP ${r.latest_ep}</div>` : ''}
      </div>
      <div class="rec-info">
        <div class="rec-title">${r.title}</div>
        ${recGenres ? `<div class="rec-genres">${recGenres}</div>` : ''}
        <div class="rec-meta">
          ${r.rating ? `<span class="rec-rating"><i class="fas fa-star"></i> ${parseFloat(r.rating).toFixed(1)}</span>` : ''}
          <span class="rec-status ${r.status === 'Ongoing' ? 'rec-status-ongoing' : r.status === 'Completed' ? 'rec-status-done' : 'rec-status-up'}">${r.status || ''}</span>
        </div>
      </div>
    </a>`
  }).join('')

  const content = `
${breadcrumb([
  { label: 'Browse', href: '/search' },
  { label: anime.title, href: `/anime/${anime.slug}` },
  { label: `Episode ${episode.episode_number}` }
])}

<div class="watch-wrap" style="max-width:960px;margin:0 auto;min-height:50vh;">

  <!-- ====== VIDEO PLAYER SECTION ====== -->
  <div class="player-section">

    <!-- Video Player Box — inline styles prevent collapse on slow/CSS-less load -->
    <div class="player-box" id="playerBox"
         style="position:relative;aspect-ratio:16/9;background:#000;border-radius:14px;overflow:hidden;margin-bottom:14px;width:100%;">
      <div style="position:absolute;inset:0;" id="playerInner">
        ${defaultPlayerHTML}
      </div>
    </div>

    <!-- ====== SERVER SELECTOR ROW ====== -->
    <!-- NOW WATCHING + Audio type (SUB/DUB) + Server buttons -->
    <div class="server-selector-wrap" id="serverSelectorWrap" style="display:none;">
      <div class="server-selector-row">

        <!-- Left: Now watching label + episode number -->
        <div class="srv-label-wrap">
          <span class="srv-now-label">NOW WATCHING</span>
          <span class="srv-ep-label">Episode ${episode.episode_number}</span>
        </div>

        <!-- Audio type toggle: SUB / DUB -->
        <div class="srv-audio-toggle" id="srvAudioToggle">
          <button class="srv-audio-btn active" id="srvBtnSub" onclick="switchAudioType('sub')">
            <i class="fas fa-closed-captioning"></i> SUB
          </button>
          <button class="srv-audio-btn" id="srvBtnDub" onclick="switchAudioType('dub')">
            <i class="fas fa-microphone"></i> DUB
          </button>
        </div>

        <!-- Server buttons container -->
        <div class="srv-btns-wrap" id="srvBtnsWrap">
          <!-- Dynamically populated by JS -->
        </div>

      </div>
    </div>

    <!-- ====== BELOW-PLAYER ACTION ROW ====== -->
    <div class="watch-below-player-row">

      <!-- Left: Prev -->
      <div class="wbp-side wbp-left">
        ${prevEp
          ? `<a href="${prevHref}" class="wbp-nav-btn wbp-prev">
               <i class="fas fa-chevron-left"></i>
               <span class="wbp-nav-label">Prev</span>
             </a>`
          : `<button class="wbp-nav-btn wbp-prev disabled" disabled>
               <i class="fas fa-chevron-left"></i>
               <span class="wbp-nav-label">Prev</span>
             </button>`
        }
      </div>

      <!-- Middle: Watchlist + Share -->
      <div class="wbp-middle">
        <button class="wbp-action-btn wbp-watchlist" id="wlBtn" data-slug="${anime.slug}" onclick="addToWatchlist()">
          <i class="fas fa-bookmark"></i>
          <span>Watchlist</span>
        </button>
        <button class="wbp-action-btn wbp-share" onclick="openSharePopup()">
          <i class="fas fa-share-alt"></i>
          <span>Share</span>
        </button>
      </div>

      <!-- Right: Next -->
      <div class="wbp-side wbp-right">
        ${nextEp
          ? `<a href="${nextHref}" class="wbp-nav-btn wbp-next">
               <span class="wbp-nav-label">Next</span>
               <i class="fas fa-chevron-right"></i>
             </a>`
          : `<button class="wbp-nav-btn wbp-next disabled" disabled>
               <span class="wbp-nav-label">Next</span>
               <i class="fas fa-chevron-right"></i>
             </button>`
        }
      </div>

    </div><!-- end .watch-below-player-row -->

    <!-- Thin horizontal separator -->
    <div class="watch-divider"></div>

    <!-- ====== TABBED SECTION: Episodes + Comments ====== -->
    <div class="watch-tabs-container">

      <!-- Tab Headers — Episodes | Comments -->
      <div class="watch-tabs-header">
        <div class="watch-tabs-header-left">
          <button class="watch-tab-btn active" id="tabEpisodes" onclick="switchWatchTab('episodes')">
            <i class="fas fa-th-list"></i> Episodes
            <span class="watch-tab-count">${allEpisodes.length}</span>
          </button>
          <button class="watch-tab-btn" id="tabComments" onclick="switchWatchTab('comments')">
            <i class="fas fa-comments"></i> Comments
            <span class="watch-tab-count" id="tabCommentsCount"></span>
          </button>
        </div>
      </div>

      <!-- Tab: Episodes -->
      <div class="watch-tab-panel" id="panelEpisodes">
        <div class="cr-ep-list" id="crEpList">
          ${sortedEpisodes.map(ep => {
            const isActive = ep.episode_number === episode.episode_number
            const thumb = anime.cover_image || ''
            const title = ep.title || `Episode ${ep.episode_number}`
            return `
            <a href="/watch/${anime.slug}-episode-${ep.episode_number}"
               class="cr-ep-item${isActive ? ' active' : ''}"
               data-epnum="${ep.episode_number}"
               data-eptitle="${title.toLowerCase()}"
               title="${title}">
              <div class="cr-ep-thumb-wrap">
                <img src="${thumb}" alt="EP ${ep.episode_number}" class="cr-ep-thumb"
                     loading="lazy" decoding="async"
                     width="112" height="63"
                     onerror="this.style.display='none';this.parentElement.style.background='var(--bg5)';">
                ${isActive ? `<div class="cr-ep-playing"><i class="fas fa-volume-up"></i></div>` : ''}
                <div class="cr-ep-num-badge">EP ${ep.episode_number}</div>
              </div>
              <div class="cr-ep-info">
                <div class="cr-ep-title">${title}</div>
                <div class="cr-ep-sub">${anime.title}</div>
              </div>
            </a>`
          }).join('')}
        </div>
        <div class="cr-ep-empty" id="crEpEmpty" style="display:none;">
          <i class="fas fa-search" style="margin-right:6px;"></i> No episodes found
        </div>
      </div>

      <!-- Tab: Comments -->
      <div class="watch-tab-panel" id="panelComments" style="display:none;">
        <div class="comments-inner" style="padding:14px;">

          <!-- Post Comment Box -->
          <div class="comment-post-box" id="commentPostBox">
            <div id="commentLoginNotice" style="display:none; text-align:center; padding:14px; background:var(--bg4); border-radius:var(--r8); font-size:13px; color:var(--text3);">
              <a href="/user/login" style="color:var(--purple2);">Sign in</a> to leave a comment.
            </div>
            <div id="commentForm" style="display:none;">
              <div style="display:flex; gap:10px; align-items:flex-start;">
                <img id="commentUserAva" src="" alt="" style="width:36px;height:36px;border-radius:50%;flex-shrink:0;object-fit:cover;">
                <div style="flex:1;">
                  <textarea id="commentInput" placeholder="Share your thoughts about this episode..."
                    style="width:100%;min-height:80px;background:var(--bg4);border:1px solid var(--border2);border-radius:var(--r8);padding:10px;color:var(--text1);font-size:13px;resize:vertical;font-family:inherit;outline:none;transition:border-color 0.2s;"
                    onfocus="this.style.borderColor='var(--purple)'" onblur="this.style.borderColor='var(--border2)'"
                    maxlength="2000"></textarea>
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;flex-wrap:wrap;gap:8px;">
                    <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text3);cursor:pointer;">
                      <input type="checkbox" id="commentSpoiler" style="accent-color:var(--purple);">
                      Mark as spoiler
                    </label>
                    <div style="display:flex;gap:8px;align-items:center;">
                      <span id="commentCharCount" style="font-size:11px;color:var(--text4);">0/2000</span>
                      <button onclick="postComment()" id="commentSubmitBtn"
                        style="padding:8px 18px;background:var(--purple);color:#fff;border:none;border-radius:var(--r8);font-size:13px;font-weight:700;cursor:pointer;">
                        <i class="fas fa-paper-plane"></i> Post
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Comments List -->
          <div id="commentsList" style="margin-top:12px;">
            <div style="text-align:center;padding:20px;color:var(--text3);font-size:13px;" id="commentsLoading">
              <i class="fas fa-spinner fa-spin"></i> Loading comments...
            </div>
          </div>
          <div id="commentsLoadMore" style="text-align:center;padding:12px;display:none;">
            <button onclick="loadMoreComments()" style="background:var(--bg4);border:1px solid var(--border2);border-radius:var(--r8);padding:8px 20px;color:var(--text2);font-size:13px;cursor:pointer;">
              Load More Comments
            </button>
          </div>

        </div>
      </div>

    </div><!-- end .watch-tabs-container -->

  </div><!-- end .player-section -->

  <!-- ======================================================
       EPISODE DETAILS SECTION
       (Below tabs — shows anime banner, title, description, metadata)
  ====================================================== -->
  <div class="ep-detail-section">

    <!-- Anime Banner -->
    ${anime.banner_image ? `
    <div class="ep-detail-banner-wrap">
      <img src="${anime.banner_image}" alt="${anime.title} Banner" class="ep-detail-banner"
           loading="lazy" decoding="async"
           onerror="this.closest('.ep-detail-banner-wrap').style.display='none';">
      <div class="ep-detail-banner-overlay"></div>
    </div>` : ''}

    <div class="ep-detail-body">

      <!-- Left: Cover + quick stats -->
      <div class="ep-detail-cover-col">
        <img src="${anime.cover_image || ''}" alt="${anime.title} Cover" class="ep-detail-cover"
             loading="lazy"
             onerror="this.style.display='none';">

        <!-- Quick stats under cover -->
        <div class="ep-detail-quick-stats">
          ${anime.rating ? `
          <div class="ep-qs-item">
            <i class="fas fa-star" style="color:var(--gold);"></i>
            <span>${parseFloat(anime.rating).toFixed(1)}</span>
          </div>` : ''}
          ${anime.type ? `
          <div class="ep-qs-item">
            <i class="fas fa-tag" style="color:var(--purple2);"></i>
            <span>${anime.type}</span>
          </div>` : ''}
          ${anime.release_year ? `
          <div class="ep-qs-item">
            <i class="fas fa-calendar" style="color:var(--blue);"></i>
            <span>${anime.release_year}</span>
          </div>` : ''}
          <div class="ep-qs-item">
            <i class="fas fa-film" style="color:var(--green);"></i>
            <span>${allEpisodes.length} eps</span>
          </div>
        </div>

        <a href="/anime/${anime.slug}" class="ep-detail-anime-link">
          <i class="fas fa-info-circle"></i> View Anime Page
        </a>
      </div>

      <!-- Right: Info -->
      <div class="ep-detail-info-col">

        <!-- Current Episode Indicator -->
        <div class="ep-detail-now-ep">
          <span class="ep-detail-now-badge"><i class="fas fa-play"></i> Now Watching</span>
          <span class="ep-detail-ep-num">Episode ${episode.episode_number}${episode.title ? ` — ${episode.title}` : ''}</span>
        </div>

        <!-- Anime Title -->
        <h2 class="ep-detail-title">
          <a href="/anime/${anime.slug}">${anime.title}</a>
        </h2>
        ${anime.title_native ? `<div class="ep-detail-native">${anime.title_native}</div>` : ''}
        ${anime.title_english && anime.title_english !== anime.title ? `<div class="ep-detail-english">${anime.title_english}</div>` : ''}

        <!-- Status badge -->
        <div class="ep-detail-status-row">
          <span class="ep-detail-status-badge ep-detail-status-${(anime.status || 'Ongoing').toLowerCase()}">${anime.status || 'Ongoing'}</span>
          ${anime.country ? `<span class="ep-detail-meta-chip"><i class="fas fa-globe-asia"></i> ${anime.country}</span>` : ''}
          ${anime.duration ? `<span class="ep-detail-meta-chip"><i class="fas fa-clock"></i> ${anime.duration}</span>` : ''}
          ${studios.length > 0 ? `<span class="ep-detail-meta-chip"><i class="fas fa-building"></i> ${studios[0]}</span>` : ''}
        </div>

        <!-- Genres -->
        ${genresHtml ? `
        <div class="ep-detail-genres">
          ${genresHtml}
        </div>` : ''}

        <!-- Description -->
        ${anime.description ? `
        <div class="ep-detail-desc-wrap">
          <p class="ep-detail-desc" id="epDescText">${anime.description}</p>
          <button class="ep-detail-desc-toggle" id="epDescToggle" onclick="toggleEpDesc()">
            <i class="fas fa-chevron-down"></i> Show more
          </button>
        </div>` : ''}

        <!-- Episode air date -->
        ${episode.air_date ? `
        <div class="ep-detail-aired">
          <i class="fas fa-calendar-check" style="color:var(--purple2);margin-right:6px;"></i>
          Aired: <strong>${episode.air_date}</strong>
        </div>` : ''}

      </div>
    </div>
  </div><!-- end .ep-detail-section -->

  <!-- ======================================================
       YOU MAY LIKE / RECOMMENDATIONS
  ====================================================== -->
  ${recHtml ? `
  <div class="rec-section">
    <div class="rec-section-hd">
      <div class="rec-section-title">
        <i class="fas fa-fire" style="color:var(--purple2);"></i> You May Also Like
      </div>
      <a href="/search" class="rec-see-all">See All <i class="fas fa-arrow-right"></i></a>
    </div>
    <div class="rec-grid">
      ${recHtml}
    </div>
  </div>` : ''}

</div><!-- end .watch-wrap -->

<!-- ============================================================
     SHARE POPUP MODAL
============================================================ -->
<div class="share-modal-backdrop" id="shareModal" onclick="closeShareOnBackdrop(event)">
  <div class="share-modal-box">
    <div class="share-modal-head">
      <div class="share-modal-title"><i class="fas fa-share-alt"></i> Share Episode</div>
      <button class="share-modal-close" onclick="closeSharePopup()"><i class="fas fa-times"></i></button>
    </div>

    <!-- Copy Link -->
    <div class="share-copy-row">
      <input type="text" class="share-copy-input" id="shareLinkInput" readonly>
      <button class="share-copy-btn" id="shareCopyBtn" onclick="copyShareLink()">
        <i class="fas fa-copy"></i> Copy
      </button>
    </div>

    <!-- Share Options -->
    <div class="share-options-label">Share via</div>
    <div class="share-options-grid">
      <button class="share-opt-btn share-opt-twitter" onclick="shareToTwitter()">
        <i class="fab fa-x-twitter"></i>
        <span>X (Twitter)</span>
      </button>
      <button class="share-opt-btn share-opt-facebook" onclick="shareToFacebook()">
        <i class="fab fa-facebook"></i>
        <span>Facebook</span>
      </button>
      <button class="share-opt-btn share-opt-whatsapp" onclick="shareToWhatsApp()">
        <i class="fab fa-whatsapp"></i>
        <span>WhatsApp</span>
      </button>
      <button class="share-opt-btn share-opt-telegram" onclick="shareToTelegram()">
        <i class="fab fa-telegram"></i>
        <span>Telegram</span>
      </button>
      <button class="share-opt-btn share-opt-reddit" onclick="shareToReddit()">
        <i class="fab fa-reddit"></i>
        <span>Reddit</span>
      </button>
      <button class="share-opt-btn share-opt-native" onclick="nativeShare()" id="nativeShareBtn" style="display:none;">
        <i class="fas fa-ellipsis-h"></i>
        <span>More</span>
      </button>
    </div>

  </div>
</div>

<script>
// ==================== SERVER SELECTOR ====================
const EPISODE_SERVERS_API = '/api/episode-servers/${episode.id}';
let allServers = [];
let currentAudioType = 'sub'; // 'sub' or 'dub'
let currentServerId = null;

async function loadEpisodeServers() {
  try {
    const res = await fetch(EPISODE_SERVERS_API);
    const data = await res.json();
    allServers = data.data || [];
    if (allServers.length > 0) {
      // Show server selector wrapper
      const wrap = document.getElementById('serverSelectorWrap');
      if (wrap) wrap.style.display = 'block';
      // Check if DUB available
      const hasDub = allServers.some(s => s.audio_type === 'dub');
      const dubBtn = document.getElementById('srvBtnDub');
      if (dubBtn) dubBtn.style.display = hasDub ? '' : 'none';
      // Render servers for current audio type
      renderServerButtons();
      // Auto-load first server
      const firstSub = allServers.find(s => s.audio_type === 'sub') || allServers[0];
      if (firstSub) loadServer(firstSub.id);
    } else {
      // No multi-servers — keep legacy player visible
    }
  } catch(e) {
    console.warn('Failed to load episode servers:', e);
  }
}

function renderServerButtons() {
  const wrap = document.getElementById('srvBtnsWrap');
  if (!wrap) return;
  const filtered = allServers.filter(s => s.audio_type === currentAudioType);
  if (filtered.length === 0) {
    // Try other audio type
    const other = allServers.filter(s => s.audio_type !== currentAudioType);
    if (other.length > 0) {
      wrap.innerHTML = \`<span style="font-size:12px;color:var(--text4);padding:6px 0;">No \${currentAudioType.toUpperCase()} servers. Switch audio type.</span>\`;
    } else {
      wrap.innerHTML = '<span style="font-size:12px;color:var(--text4);">No servers available.</span>';
    }
    return;
  }
  wrap.innerHTML = filtered.map((s, i) => \`
    <button class="srv-server-btn\${i === 0 && currentServerId === null ? ' active' : currentServerId === s.id ? ' active' : ''}"
            id="srvBtn-\${s.id}"
            onclick="loadServer(\${s.id})"
            title="\${s.link_type === 'direct' ? 'Direct MP4' : 'Embed'}">
      \${escHtmlW(s.server_name)}
    </button>
  \`).join('');
}

function loadServer(serverId) {
  const server = allServers.find(s => s.id === serverId);
  if (!server) return;
  currentServerId = serverId;

  // Update active button state
  document.querySelectorAll('.srv-server-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById('srvBtn-' + serverId);
  if (activeBtn) activeBtn.classList.add('active');

  // Load player
  const playerInner = document.getElementById('playerInner');
  if (!playerInner) return;

  if (server.link_type === 'embed') {
    playerInner.innerHTML = \`<iframe
      src="\${escHtmlW(server.url)}"
      allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
      scrolling="no"
      frameborder="0"
      loading="eager"
      referrerpolicy="no-referrer-when-downgrade"
      style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;background:#000;"
      title="\${escHtmlW(server.server_name)} player"
    ></iframe>\`;
  } else {
    // Direct video
    playerInner.innerHTML = \`<video controls autoplay preload="auto" playsinline
      style="position:absolute;top:0;left:0;width:100%;height:100%;background:#000;">
      <source src="\${escHtmlW(server.url)}" type="video/mp4">
      Your browser does not support video playback.
    </video>\`;
  }
}

function switchAudioType(type) {
  currentAudioType = type;
  currentServerId = null;
  // Update toggle buttons
  const subBtn = document.getElementById('srvBtnSub');
  const dubBtn = document.getElementById('srvBtnDub');
  if (subBtn) subBtn.classList.toggle('active', type === 'sub');
  if (dubBtn) dubBtn.classList.toggle('active', type === 'dub');
  // Re-render server buttons
  renderServerButtons();
  // Auto-load first server of new audio type
  const first = allServers.find(s => s.audio_type === type);
  if (first) loadServer(first.id);
}

function escHtmlW(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ==================== EPISODE DESCRIPTION TOGGLE ====================
function toggleEpDesc() {
  const desc = document.getElementById('epDescText');
  const btn = document.getElementById('epDescToggle');
  if (!desc || !btn) return;
  const isExpanded = desc.classList.toggle('expanded');
  btn.innerHTML = isExpanded
    ? '<i class="fas fa-chevron-up"></i> Show less'
    : '<i class="fas fa-chevron-down"></i> Show more';
}

// Save to watch history
(function(){
  try {
    const hist = JSON.parse(localStorage.getItem('watchHistory') || '[]');
    const item = {
      slug: '${anime.slug}',
      title: '${anime.title.replace(/'/g, "\\'")}',
      cover: '${(anime.cover_image || '').replace(/'/g, "\\'")}',
      ep: ${episode.episode_number},
      href: '/watch/${anime.slug}-episode-${episode.episode_number}',
      date: new Date().toISOString()
    };
    const idx = hist.findIndex(h => h.slug === item.slug && h.ep === item.ep);
    if (idx >= 0) hist.splice(idx, 1);
    hist.unshift(item);
    localStorage.setItem('watchHistory', JSON.stringify(hist.slice(0, 100)));
  } catch(e) {}
})();

function addToWatchlist() {
  if (window.toggleWatchlist) {
    window.toggleWatchlist(
      '${anime.slug}',
      '${anime.title.replace(/'/g, "\\'")}',
      '${(anime.cover_image || '').replace(/'/g, "\\'")}',
      '${anime.type || 'ONA'}'
    );
  } else {
    window.showToast('Added to watchlist!', 'success');
  }
}

// ==================== SHARE POPUP ====================
function openSharePopup() {
  const modal = document.getElementById('shareModal');
  const input = document.getElementById('shareLinkInput');
  if (input) input.value = window.location.href;
  if (modal) modal.classList.add('open');
  if (navigator.share) {
    const nb = document.getElementById('nativeShareBtn');
    if (nb) nb.style.display = '';
  }
  document.body.style.overflow = 'hidden';
}

function closeSharePopup() {
  const modal = document.getElementById('shareModal');
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = '';
}

function closeShareOnBackdrop(e) {
  if (e.target === document.getElementById('shareModal')) closeSharePopup();
}

function copyShareLink() {
  const input = document.getElementById('shareLinkInput');
  const btn = document.getElementById('shareCopyBtn');
  if (!input) return;
  const url = input.value;
  navigator.clipboard.writeText(url).then(() => {
    if (btn) {
      btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.innerHTML = '<i class="fas fa-copy"></i> Copy';
        btn.classList.remove('copied');
      }, 2200);
    }
    window.showToast('Link copied to clipboard!', 'success');
  }).catch(() => {
    input.select();
    document.execCommand('copy');
    window.showToast('Link copied!', 'success');
  });
}

function shareToTwitter() {
  const url = encodeURIComponent(window.location.href);
  const text = encodeURIComponent('Watching: ${anime.title.replace(/'/g, "\\'")} - Episode ${episode.episode_number}');
  window.open('https://twitter.com/intent/tweet?url=' + url + '&text=' + text, '_blank', 'width=600,height=400');
}

function shareToFacebook() {
  const url = encodeURIComponent(window.location.href);
  window.open('https://www.facebook.com/sharer/sharer.php?u=' + url, '_blank', 'width=600,height=400');
}

function shareToWhatsApp() {
  const text = encodeURIComponent('${anime.title.replace(/'/g, "\\'")} - Episode ${episode.episode_number}: ' + window.location.href);
  window.open('https://wa.me/?text=' + text, '_blank');
}

function shareToTelegram() {
  const url = encodeURIComponent(window.location.href);
  const text = encodeURIComponent('${anime.title.replace(/'/g, "\\'")} - Episode ${episode.episode_number}');
  window.open('https://t.me/share/url?url=' + url + '&text=' + text, '_blank');
}

function shareToReddit() {
  const url = encodeURIComponent(window.location.href);
  const title = encodeURIComponent('${anime.title.replace(/'/g, "\\'")} - Episode ${episode.episode_number}');
  window.open('https://reddit.com/submit?url=' + url + '&title=' + title, '_blank', 'width=700,height=500');
}

async function nativeShare() {
  if (navigator.share) {
    try {
      await navigator.share({
        title: '${anime.title.replace(/'/g, "\\'")} - Episode ${episode.episode_number}',
        url: window.location.href
      });
    } catch(e) {}
  }
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeSharePopup();
});

// Tab switching
function switchWatchTab(tab) {
  const episodesPanel = document.getElementById('panelEpisodes');
  const commentsPanel = document.getElementById('panelComments');
  const episodesBtn   = document.getElementById('tabEpisodes');
  const commentsBtn   = document.getElementById('tabComments');

  if (tab === 'episodes') {
    episodesPanel.style.display = '';
    commentsPanel.style.display = 'none';
    episodesBtn.classList.add('active');
    commentsBtn.classList.remove('active');
    scrollToActiveEpisode();
  } else {
    episodesPanel.style.display = 'none';
    commentsPanel.style.display = '';
    episodesBtn.classList.remove('active');
    commentsBtn.classList.add('active');
  }
}

function scrollToActiveEpisode() {
  const active = document.querySelector('.cr-ep-item.active');
  const list = document.getElementById('crEpList');
  if (!active || !list) return;
  try {
    const listRect  = list.getBoundingClientRect();
    const itemRect  = active.getBoundingClientRect();
    const offset    = itemRect.top - listRect.top;
    const center    = offset - (list.clientHeight / 2) + (active.offsetHeight / 2);
    list.scrollTop += center;
  } catch(e) {
    list.scrollTop = active.offsetTop - (list.clientHeight / 2) + (active.offsetHeight / 2);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  scrollToActiveEpisode();
  if (window.initWatchlistBtn) window.initWatchlistBtn();
  initComments();
  loadEpisodeServers();
  // Init server selector radio highlights
  highlightAudioBtnW();
});

function highlightAudioBtnW() {
  const subBtn = document.getElementById('srvBtnSub');
  const dubBtn = document.getElementById('srvBtnDub');
  if (subBtn) subBtn.classList.toggle('active', currentAudioType === 'sub');
  if (dubBtn) dubBtn.classList.toggle('active', currentAudioType === 'dub');
}

// ==================== COMMENTS ====================
const EPISODE_ID = ${episode.id || 'null'};
const ANIME_ID = ${anime.id || 'null'};
let commentsPage = 1;
let totalComments = 0;
const COMMENTS_PER_PAGE = 10;
let replyingTo = null;

function initComments() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const loginNotice = document.getElementById('commentLoginNotice');
  const form = document.getElementById('commentForm');

  if (token && user) {
    if (form) form.style.display = 'block';
    if (loginNotice) loginNotice.style.display = 'none';
    const ava = document.getElementById('commentUserAva');
    if (ava) ava.src = user.profile_image || user.avatar || ('https://ui-avatars.com/api/?name=' + encodeURIComponent(user.username) + '&background=6c5ce7&color=fff&size=36&bold=true');

    const input = document.getElementById('commentInput');
    const charCount = document.getElementById('commentCharCount');
    if (input && charCount) {
      input.addEventListener('input', function() { charCount.textContent = input.value.length + '/2000'; });
    }
  } else {
    if (loginNotice) loginNotice.style.display = 'block';
    if (form) form.style.display = 'none';
  }

  loadComments(1);
}

async function loadComments(page) {
  const loading = document.getElementById('commentsLoading');
  const list = document.getElementById('commentsList');

  try {
    const params = new URLSearchParams({ page: String(page), limit: String(COMMENTS_PER_PAGE) });
    if (EPISODE_ID) params.set('episode_id', String(EPISODE_ID));
    else if (ANIME_ID) params.set('anime_id', String(ANIME_ID));

    const res = await fetch('/api/comments?' + params);
    const data = await res.json();

    if (loading) loading.style.display = 'none';

    totalComments = data.total || 0;
    const countEl = document.getElementById('commentsCount');
    if (countEl) countEl.textContent = totalComments + ' comment' + (totalComments !== 1 ? 's' : '');
    const tabCountEl = document.getElementById('tabCommentsCount');
    if (tabCountEl) tabCountEl.textContent = totalComments > 0 ? String(totalComments) : '';

    if (page === 1) list.innerHTML = '';

    if (!data.data || data.data.length === 0) {
      if (page === 1) list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text3);font-size:13px;"><i class="fas fa-comment-slash"></i> No comments yet. Be the first!</div>';
    } else {
      data.data.forEach(c => list.appendChild(buildCommentEl(c)));
      commentsPage = page;
    }

    const loadMoreBtn = document.getElementById('commentsLoadMore');
    if (loadMoreBtn) {
      loadMoreBtn.style.display = (data.totalPages && page < data.totalPages) ? 'block' : 'none';
    }
  } catch(e) {
    if (loading) loading.style.display = 'none';
    if (list && page === 1) list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text3);font-size:13px;">Failed to load comments.</div>';
  }
}

function buildCommentEl(c) {
  const div = document.createElement('div');
  div.className = 'comment-item';
  div.dataset.id = c.id;

  const ava = c.user_avatar || ('https://ui-avatars.com/api/?name=' + encodeURIComponent(c.username || '?') + '&background=6c5ce7&color=fff&size=36&bold=true');
  const isAdmin = c.user_role === 'admin';
  const date = c.created_at ? new Date(c.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '';

  const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
  const canDelete = currentUser && (currentUser.id === c.user_id || currentUser.role === 'admin');

  const repliesHtml = (c.replies || []).map(r => buildReplyHtml(r)).join('');

  div.innerHTML = \`
    <div class="comment-main">
      <img src="\${ava}" alt="\${c.username || 'User'}" class="comment-ava" onerror="this.src='https://ui-avatars.com/api/?name=?&background=333&color=fff&size=36'">
      <div class="comment-body">
        <div class="comment-meta">
          <span class="comment-user">\${escHtmlC(c.username || 'User')}\${isAdmin ? ' <span class="comment-admin-badge">Admin</span>' : ''}</span>
          <span class="comment-date">\${date}</span>
          \${c.is_spoiler ? '<span class="comment-spoiler-tag">Spoiler</span>' : ''}
        </div>
        \${c.is_spoiler
          ? \`<div class="comment-spoiler-wrap">
               <div class="comment-spoiler-blur" onclick="this.parentElement.classList.add('revealed')">
                 <i class="fas fa-eye-slash"></i> Spoiler — click to reveal
               </div>
               <p class="comment-text comment-spoiler-text">\${escHtmlC(c.content || '')}</p>
             </div>\`
          : \`<p class="comment-text">\${escHtmlC(c.content || '')}</p>\`
        }
        <div class="comment-actions">
          <button onclick="likeComment(\${c.id}, this)" class="comment-action-btn">
            <i class="fas fa-heart"></i> <span class="like-count">\${c.likes || 0}</span>
          </button>
          <button onclick="startReply(\${c.id}, '\${escHtmlC(c.username || 'User')}')" class="comment-action-btn">
            <i class="fas fa-reply"></i> Reply
          </button>
          \${canDelete ? \`<button onclick="deleteComment(\${c.id}, this)" class="comment-action-btn comment-delete-btn"><i class="fas fa-trash"></i></button>\` : ''}
        </div>
        <div class="reply-form-wrap" id="replyForm-\${c.id}" style="display:none;margin-top:10px;"></div>
        \${repliesHtml ? \`<div class="comment-replies">\${repliesHtml}</div>\` : ''}
      </div>
    </div>\`;
  return div;
}

function buildReplyHtml(r) {
  const ava = r.user_avatar || ('https://ui-avatars.com/api/?name=' + encodeURIComponent(r.username || '?') + '&background=6c5ce7&color=fff&size=30&bold=true');
  const isAdmin = r.user_role === 'admin';
  const date = r.created_at ? new Date(r.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric' }) : '';
  const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
  const canDelete = currentUser && (currentUser.id === r.user_id || currentUser.role === 'admin');

  return \`<div class="comment-reply" data-id="\${r.id}">
    <img src="\${ava}" alt="" class="comment-ava-sm" onerror="this.src='https://ui-avatars.com/api/?name=?&background=333&color=fff&size=30'">
    <div class="comment-body">
      <div class="comment-meta">
        <span class="comment-user">\${escHtmlC(r.username || 'User')}\${isAdmin ? ' <span class="comment-admin-badge">Admin</span>' : ''}</span>
        <span class="comment-date">\${date}</span>
      </div>
      <p class="comment-text">\${escHtmlC(r.content || '')}</p>
      <div class="comment-actions">
        <button onclick="likeComment(\${r.id}, this)" class="comment-action-btn"><i class="fas fa-heart"></i> <span class="like-count">\${r.likes||0}</span></button>
        \${canDelete ? \`<button onclick="deleteComment(\${r.id}, this.closest('.comment-reply'))" class="comment-action-btn comment-delete-btn"><i class="fas fa-trash"></i></button>\` : ''}
      </div>
    </div>
  </div>\`;
}

function escHtmlC(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function startReply(parentId, username) {
  document.querySelectorAll('.reply-form-wrap').forEach(function(el) { el.style.display = 'none'; el.innerHTML = ''; });

  replyingTo = parentId;
  const wrap = document.getElementById('replyForm-' + parentId);
  if (!wrap) return;

  const token = localStorage.getItem('token');
  if (!token) { window.showToast('Please sign in to reply', 'info'); return; }

  wrap.style.display = 'block';
  wrap.innerHTML = \`
    <div style="display:flex;gap:8px;align-items:flex-start;">
      <div style="flex:1;">
        <div style="font-size:11px;color:var(--purple2);margin-bottom:5px;">Replying to @\${escHtmlC(username)}</div>
        <textarea id="replyInput-\${parentId}" placeholder="Write a reply..." maxlength="1000"
          style="width:100%;min-height:60px;background:var(--bg5);border:1px solid var(--border2);border-radius:var(--r8);padding:8px;color:var(--text1);font-size:13px;resize:vertical;font-family:inherit;outline:none;"></textarea>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:6px;">
          <button onclick="cancelReply(\${parentId})" style="padding:6px 12px;background:transparent;border:1px solid var(--border2);border-radius:var(--r8);color:var(--text2);font-size:12px;cursor:pointer;">Cancel</button>
          <button onclick="submitReply(\${parentId})" style="padding:6px 14px;background:var(--purple);border:none;border-radius:var(--r8);color:#fff;font-size:12px;font-weight:700;cursor:pointer;"><i class="fas fa-paper-plane"></i> Reply</button>
        </div>
      </div>
    </div>\`;
  document.getElementById('replyInput-' + parentId)?.focus();
}

function cancelReply(parentId) {
  const wrap = document.getElementById('replyForm-' + parentId);
  if (wrap) { wrap.style.display = 'none'; wrap.innerHTML = ''; }
  replyingTo = null;
}

async function submitReply(parentId) {
  const input = document.getElementById('replyInput-' + parentId);
  if (!input) return;
  const content = input.value.trim();
  if (!content) { window.showToast('Reply cannot be empty', 'error'); return; }

  const token = localStorage.getItem('token');
  try {
    const body = { content, parent_id: parentId };
    if (EPISODE_ID) body.episode_id = EPISODE_ID;
    else if (ANIME_ID) body.anime_id = ANIME_ID;

    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.success) {
      cancelReply(parentId);
      window.showToast('Reply posted!', 'success');
      loadComments(1);
    } else {
      window.showToast(data.error || 'Failed to post reply', 'error');
    }
  } catch(e) { window.showToast('Error: ' + e.message, 'error'); }
}

async function postComment() {
  const input = document.getElementById('commentInput');
  const spoilerEl = document.getElementById('commentSpoiler');
  const token = localStorage.getItem('token');

  if (!token) { window.showToast('Please sign in to comment', 'info'); return; }
  if (!input || !input.value.trim()) { window.showToast('Comment cannot be empty', 'error'); return; }

  const btn = document.getElementById('commentSubmitBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }

  try {
    const body = {
      content: input.value.trim(),
      is_spoiler: spoilerEl ? spoilerEl.checked : false,
    };
    if (EPISODE_ID) body.episode_id = EPISODE_ID;
    else if (ANIME_ID) body.anime_id = ANIME_ID;

    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.success) {
      input.value = '';
      if (spoilerEl) spoilerEl.checked = false;
      const cc = document.getElementById('commentCharCount');
      if (cc) cc.textContent = '0/2000';
      window.showToast(data.is_approved ? 'Comment posted!' : 'Comment submitted for review', 'success');
      loadComments(1);
    } else {
      window.showToast(data.error || 'Failed to post comment', 'error');
    }
  } catch(e) { window.showToast('Error: ' + e.message, 'error'); }
  finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Post'; }
  }
}

async function likeComment(id, btn) {
  const token = localStorage.getItem('token');
  if (!token) { window.showToast('Sign in to like comments', 'info'); return; }

  try {
    const res = await fetch('/api/comments/' + id + '/like', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();
    if (data.success) {
      const countEl = btn.querySelector('.like-count');
      if (countEl) {
        const cur = parseInt(countEl.textContent) || 0;
        countEl.textContent = data.action === 'liked' ? cur + 1 : Math.max(0, cur - 1);
      }
      btn.style.color = data.action === 'liked' ? 'var(--red)' : '';
    }
  } catch(e) {}
}

async function deleteComment(id, el) {
  if (!confirm('Delete this comment?')) return;
  const token = localStorage.getItem('token');

  try {
    const res = await fetch('/api/comments/' + id, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();
    if (data.success) {
      if (el && el.closest) el.closest('.comment-item, .comment-reply')?.remove();
      window.showToast('Comment deleted', 'success');
      totalComments = Math.max(0, totalComments - 1);
      const countEl = document.getElementById('commentsCount');
      if (countEl) countEl.textContent = totalComments + ' comment' + (totalComments !== 1 ? 's' : '');
    }
  } catch(e) { window.showToast('Failed to delete', 'error'); }
}

window.loadMoreComments = function() {
  loadComments(commentsPage + 1);
};
</script>

<style>
/* ===================================================
   SERVER SELECTOR
=================================================== */
.server-selector-wrap {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--r12);
  padding: 10px 14px;
  margin-bottom: 10px;
}

.server-selector-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.srv-label-wrap {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-shrink: 0;
  padding-right: 10px;
  border-right: 1px solid var(--border);
}

.srv-now-label {
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--text4);
}

.srv-ep-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--text1);
}

.srv-audio-toggle {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.srv-audio-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  background: var(--bg4);
  border: 1px solid var(--border2);
  border-radius: 999px;
  color: var(--text3);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  white-space: nowrap;
}

.srv-audio-btn.active {
  background: var(--purple-dim);
  border-color: var(--purple);
  color: var(--purple2);
}

.srv-audio-btn:hover:not(.active) {
  background: var(--bg5);
  color: var(--text2);
}

.srv-btns-wrap {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
  flex: 1;
}

.srv-server-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 16px;
  background: var(--bg4);
  border: 1px solid var(--border2);
  border-radius: 999px;
  color: var(--text2);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  white-space: nowrap;
}

.srv-server-btn:hover:not(.active) {
  background: var(--bg5);
  border-color: rgba(108,92,231,0.4);
  color: var(--text1);
}

.srv-server-btn.active {
  background: rgba(239,68,68,0.12);
  border-color: rgba(239,68,68,0.5);
  color: #ef4444;
  font-weight: 700;
}

@media (max-width: 600px) {
  .server-selector-row {
    gap: 8px;
  }
  .srv-label-wrap {
    border-right: none;
    padding-right: 0;
    flex-direction: row;
    align-items: center;
    gap: 6px;
    width: 100%;
    border-bottom: 1px solid var(--border);
    padding-bottom: 8px;
  }
  .srv-now-label { font-size: 8px; }
  .srv-ep-label { font-size: 11px; }
}

/* ===================================================
   BELOW PLAYER ROW — Prev | [Watchlist + Share] | Next
=================================================== */
.watch-below-player-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 0 12px;
}

.wbp-side { flex-shrink: 0; }

.wbp-middle {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.wbp-nav-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: var(--r10);
  color: var(--text2);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  white-space: nowrap;
  font-family: inherit;
}
.wbp-nav-btn:hover:not(.disabled) {
  background: var(--purple-dim);
  border-color: var(--border-glow);
  color: var(--purple3);
}
.wbp-nav-btn.disabled {
  opacity: 0.35;
  cursor: not-allowed;
  pointer-events: none;
}

.wbp-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 20px;
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: var(--r10);
  color: var(--text2);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  font-family: inherit;
}
.wbp-action-btn:hover {
  background: var(--bg4);
  border-color: rgba(108,92,231,0.4);
  color: var(--purple2);
}
.wbp-watchlist.in-list {
  background: var(--purple-dim);
  border-color: rgba(124,58,237,0.45);
  color: var(--purple3);
}
.wbp-share:hover {
  background: rgba(6,182,212,0.1);
  border-color: rgba(6,182,212,0.4);
  color: var(--accent2);
}

@media (max-width: 767px) {
  .watch-below-player-row {
    display: grid;
    grid-template-columns: 1fr auto auto 1fr;
    gap: 8px;
    padding: 10px 0 14px;
    align-items: stretch;
  }
  .wbp-side.wbp-left  { grid-column: 1; display: flex; align-items: stretch; }
  .wbp-middle         { grid-column: 2 / 4; flex: unset; gap: 8px; }
  .wbp-side.wbp-right { grid-column: 4; display: flex; align-items: stretch; justify-content: flex-end; }
  .wbp-nav-btn   { padding: 10px 14px; font-size: 13px; gap: 6px; height: 100%; min-height: 42px; flex: 1; justify-content: center; }
  .wbp-nav-label { display: inline !important; }
  .wbp-action-btn { padding: 10px 14px; font-size: 13px; gap: 6px; min-height: 42px; }
  .wbp-action-btn span { display: inline !important; }
}

.watch-divider { height: 1px; background: var(--border2); margin: 0 0 0; }

/* ===================================================
   WATCH TABS
=================================================== */
.watch-tabs-container {
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: var(--r12);
  overflow: hidden;
  margin-top: 14px;
}

.watch-tabs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border);
  background: var(--bg2);
  padding-right: 12px;
  gap: 8px;
  flex-wrap: wrap;
}

.watch-tabs-header-left {
  display: flex;
  align-items: stretch;
}

.watch-tab-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 13px 20px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text3);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  bottom: -1px;
  font-family: inherit;
  white-space: nowrap;
}
.watch-tab-btn:hover { color: var(--text1); background: var(--bg3); }
.watch-tab-btn.active { color: var(--purple2); border-bottom-color: var(--purple2); background: var(--bg3); }
.watch-tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--bg4);
  color: var(--text3);
  font-size: 10px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 20px;
  min-width: 20px;
}
.watch-tab-btn.active .watch-tab-count { background: rgba(108,92,231,0.2); color: var(--purple2); }

.watch-tab-panel { min-height: 200px; }

/* ===================================================
   EPISODE DETAILS SECTION
=================================================== */
.ep-detail-section {
  margin-top: 28px;
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: var(--r16, 16px);
  overflow: hidden;
}

.ep-detail-banner-wrap {
  position: relative;
  width: 100%;
  height: 180px;
  overflow: hidden;
}

.ep-detail-banner {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
  filter: brightness(0.55);
}

.ep-detail-banner-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, transparent 30%, var(--bg3) 100%);
}

.ep-detail-body {
  display: flex;
  gap: 22px;
  padding: 22px;
  margin-top: -30px;
  position: relative;
}

.ep-detail-cover-col {
  flex-shrink: 0;
  width: 120px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
}

.ep-detail-cover {
  width: 120px;
  aspect-ratio: 2/3;
  object-fit: cover;
  border-radius: var(--r10);
  border: 2px solid var(--border2);
  box-shadow: 0 4px 24px rgba(0,0,0,0.5);
}

.ep-detail-quick-stats {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.ep-qs-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text2);
  background: var(--bg4);
  border-radius: var(--r8);
  padding: 5px 9px;
}
.ep-qs-item i { font-size: 11px; flex-shrink: 0; }

.ep-detail-anime-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 10px;
  background: var(--purple-dim);
  border: 1px solid rgba(108,92,231,0.3);
  border-radius: var(--r8);
  color: var(--purple2);
  font-size: 11px;
  font-weight: 700;
  text-decoration: none;
  width: 100%;
  text-align: center;
  transition: all 0.2s;
}
.ep-detail-anime-link:hover {
  background: var(--purple);
  color: #fff;
  border-color: var(--purple);
}

.ep-detail-info-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 30px;
}

.ep-detail-now-ep {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.ep-detail-now-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(239,68,68,0.15);
  border: 1px solid rgba(239,68,68,0.3);
  color: #ef4444;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 3px 10px;
  border-radius: 999px;
}

.ep-detail-ep-num {
  font-size: 12px;
  color: var(--text3);
  font-weight: 600;
}

.ep-detail-title {
  font-size: 20px;
  font-weight: 900;
  color: var(--text1);
  line-height: 1.3;
  margin: 0;
}
.ep-detail-title a {
  color: inherit;
  text-decoration: none;
}
.ep-detail-title a:hover { color: var(--purple2); }

.ep-detail-native {
  font-size: 13px;
  color: var(--text3);
  font-style: italic;
}
.ep-detail-english {
  font-size: 12px;
  color: var(--text4);
}

.ep-detail-status-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.ep-detail-status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.ep-detail-status-ongoing  { background: rgba(0,208,132,0.15); color: var(--green); border: 1px solid rgba(0,208,132,0.3); }
.ep-detail-status-completed{ background: rgba(52,152,219,0.15); color: var(--blue); border: 1px solid rgba(52,152,219,0.3); }
.ep-detail-status-upcoming { background: rgba(241,196,15,0.15); color: var(--gold); border: 1px solid rgba(241,196,15,0.3); }

.ep-detail-meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--text3);
  background: var(--bg4);
  padding: 4px 10px;
  border-radius: var(--r6);
}
.ep-detail-meta-chip i { font-size: 10px; }

.ep-detail-genres {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.ep-detail-genre-tag {
  display: inline-block;
  padding: 4px 12px;
  background: var(--bg4);
  border: 1px solid var(--border2);
  border-radius: 999px;
  color: var(--text2);
  font-size: 11px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.15s;
}
.ep-detail-genre-tag:hover {
  background: var(--purple-dim);
  border-color: rgba(108,92,231,0.4);
  color: var(--purple2);
}

.ep-detail-desc-wrap {
  position: relative;
}

.ep-detail-desc {
  font-size: 13px;
  color: var(--text3);
  line-height: 1.7;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0;
  transition: all 0.3s;
}
.ep-detail-desc.expanded {
  display: block;
  -webkit-line-clamp: unset;
  overflow: visible;
}

.ep-detail-desc-toggle {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: none;
  border: none;
  color: var(--purple2);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  padding: 4px 0;
  margin-top: 4px;
  font-family: inherit;
  transition: color 0.2s;
}
.ep-detail-desc-toggle:hover { color: var(--purple3); }

.ep-detail-aired {
  font-size: 12px;
  color: var(--text3);
  padding: 8px 12px;
  background: var(--bg4);
  border-radius: var(--r8);
  display: inline-flex;
  align-items: center;
}

/* Responsive episode details */
@media (max-width: 600px) {
  .ep-detail-body {
    flex-direction: column;
    gap: 14px;
    padding: 16px;
    margin-top: -20px;
  }
  .ep-detail-cover-col {
    flex-direction: row;
    width: 100%;
    align-items: flex-start;
  }
  .ep-detail-cover {
    width: 80px;
  }
  .ep-detail-quick-stats {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 5px;
  }
  .ep-qs-item { font-size: 11px; padding: 4px 7px; }
  .ep-detail-anime-link { width: auto; }
  .ep-detail-info-col { padding-top: 0; }
  .ep-detail-title { font-size: 16px; }
  .ep-detail-banner-wrap { height: 120px; }
}

/* ===================================================
   RECOMMENDATIONS SECTION
=================================================== */
.rec-section {
  margin-top: 28px;
}

.rec-section-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.rec-section-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--text1);
  display: flex;
  align-items: center;
  gap: 9px;
}

.rec-see-all {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 700;
  color: var(--purple2);
  text-decoration: none;
  padding: 6px 14px;
  border: 1px solid rgba(108,92,231,0.3);
  border-radius: 999px;
  transition: all 0.2s;
}
.rec-see-all:hover { background: var(--purple-dim); color: var(--purple3); }

.rec-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 14px;
}

.rec-card {
  text-decoration: none;
  color: inherit;
  display: block;
  border-radius: var(--r10);
  overflow: hidden;
  background: var(--bg3);
  border: 1px solid var(--border);
  transition: all 0.2s;
}
.rec-card:hover {
  border-color: rgba(108,92,231,0.4);
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
}

.rec-thumb-wrap {
  position: relative;
  aspect-ratio: 2/3;
  background: var(--bg5);
  overflow: hidden;
}

.rec-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}
.rec-card:hover .rec-thumb { transform: scale(1.05); }

.rec-type-badge {
  position: absolute;
  top: 6px;
  left: 6px;
  background: rgba(0,0,0,0.75);
  color: var(--purple2);
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 2px 7px;
  border-radius: 4px;
}

.rec-ep-badge {
  position: absolute;
  bottom: 6px;
  right: 6px;
  background: rgba(0,0,0,0.8);
  color: var(--text2);
  font-size: 9px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 4px;
}

.rec-info {
  padding: 9px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rec-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--text1);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.4;
}

.rec-genres {
  font-size: 10px;
  color: var(--text4);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rec-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}

.rec-rating {
  font-size: 10px;
  font-weight: 700;
  color: var(--gold);
  display: flex;
  align-items: center;
  gap: 3px;
}
.rec-rating i { font-size: 9px; }

.rec-status {
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.rec-status-ongoing { background: rgba(0,208,132,0.15); color: var(--green); }
.rec-status-done    { background: rgba(52,152,219,0.15); color: var(--blue); }
.rec-status-up      { background: rgba(241,196,15,0.15); color: var(--gold); }

@media (max-width: 600px) {
  .rec-grid { grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 10px; }
  .rec-section-title { font-size: 14px; }
}

/* ===================================================
   SHARE MODAL
=================================================== */
.share-modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  overflow-y: auto;
  overscroll-behavior: contain;
  visibility: hidden;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.22s ease, background 0.22s ease, visibility 0s linear 0.22s;
}
.share-modal-backdrop.open {
  visibility: visible;
  opacity: 1;
  pointer-events: auto;
  background: rgba(0,0,0,0.78);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: opacity 0.22s ease, background 0.22s ease, visibility 0s linear 0s;
}

.share-modal-box {
  background: var(--bg3);
  border: 1px solid var(--border2);
  border-radius: var(--r20);
  padding: 24px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 30px 90px rgba(0,0,0,0.8), 0 0 0 1px rgba(124,58,237,0.1);
  will-change: transform, opacity;
  transform: scale(0.94) translateY(14px);
  opacity: 0;
  transition: transform 0.22s ease, opacity 0.22s ease;
}
.share-modal-backdrop.open .share-modal-box { transform: scale(1) translateY(0); opacity: 1; }

.share-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}
.share-modal-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--text1);
  display: flex;
  align-items: center;
  gap: 9px;
}
.share-modal-title i { color: var(--purple3); }
.share-modal-close {
  width: 32px; height: 32px;
  border-radius: var(--r8);
  background: var(--bg5);
  border: 1px solid var(--border2);
  color: var(--text3);
  font-size: 14px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.2s;
  font-family: inherit;
}
.share-modal-close:hover { border-color: var(--red); color: var(--red); background: rgba(239,68,68,0.1); }

.share-copy-row { display: flex; gap: 8px; margin-bottom: 20px; }
.share-copy-input {
  flex: 1;
  padding: 10px 13px;
  background: var(--bg4);
  border: 1px solid var(--border2);
  border-radius: var(--r10);
  color: var(--text2);
  font-size: 12px;
  outline: none;
  min-width: 0;
  font-family: inherit;
  cursor: text;
}
.share-copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: linear-gradient(135deg, var(--purple) 0%, #4f46e5 100%);
  color: #fff;
  border: none;
  border-radius: var(--r10);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  font-family: inherit;
  flex-shrink: 0;
}
.share-copy-btn:hover { opacity: 0.9; transform: translateY(-1px); }
.share-copy-btn.copied { background: linear-gradient(135deg, var(--green) 0%, #059669 100%); }

.share-options-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text4);
  margin-bottom: 12px;
}
.share-options-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; }
.share-opt-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  padding: 14px 10px;
  background: var(--bg4);
  border: 1px solid var(--border2);
  border-radius: var(--r12);
  color: var(--text2);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}
.share-opt-btn i { font-size: 20px; transition: transform 0.2s; }
.share-opt-btn:hover { transform: translateY(-2px); border-color: transparent; }
.share-opt-btn:hover i { transform: scale(1.1); }

.share-opt-twitter:hover  { background: rgba(29,161,242,0.15);  color: #1da1f2; border-color: rgba(29,161,242,0.35); }
.share-opt-facebook:hover { background: rgba(24,119,242,0.15);  color: #1877f2; border-color: rgba(24,119,242,0.35); }
.share-opt-whatsapp:hover { background: rgba(37,211,102,0.15);  color: #25d366; border-color: rgba(37,211,102,0.35); }
.share-opt-telegram:hover { background: rgba(0,136,204,0.15);   color: #0088cc; border-color: rgba(0,136,204,0.35); }
.share-opt-reddit:hover   { background: rgba(255,69,0,0.15);    color: #ff4500; border-color: rgba(255,69,0,0.35); }
.share-opt-native:hover   { background: var(--purple-dim);       color: var(--purple3); border-color: rgba(124,58,237,0.4); }

/* ===================================================
   COMMENTS STYLES
=================================================== */
.comment-post-box { margin-bottom:16px; }
.comment-item { padding:12px 0; border-bottom:1px solid var(--border); }
.comment-item:last-child { border-bottom:none; }
.comment-main { display:flex; gap:10px; }
.comment-ava { width:36px; height:36px; border-radius:50%; flex-shrink:0; object-fit:cover; }
.comment-ava-sm { width:28px; height:28px; border-radius:50%; flex-shrink:0; object-fit:cover; }
.comment-body { flex:1; min-width:0; }
.comment-meta { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:5px; }
.comment-user { font-size:13px; font-weight:700; color:var(--text1); }
.comment-admin-badge { background:var(--purple-dim); color:var(--purple2); font-size:9px; padding:1px 6px; border-radius:20px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; }
.comment-date { font-size:11px; color:var(--text4); }
.comment-spoiler-tag { background:rgba(241,196,15,0.15); color:var(--gold); font-size:9px; padding:1px 6px; border-radius:20px; font-weight:700; text-transform:uppercase; }
.comment-text { font-size:13px; color:var(--text2); line-height:1.6; white-space:pre-wrap; word-break:break-word; margin:0; }
.comment-spoiler-wrap { position:relative; }
.comment-spoiler-blur { position:absolute; inset:0; backdrop-filter:blur(8px); background:rgba(var(--bg3-rgb,15,15,23),0.8); display:flex; align-items:center; justify-content:center; gap:6px; font-size:12px; color:var(--text3); cursor:pointer; border-radius:4px; z-index:1; }
.comment-spoiler-wrap.revealed .comment-spoiler-blur { display:none; }
.comment-actions { display:flex; align-items:center; gap:8px; margin-top:6px; }
.comment-action-btn { background:none; border:none; color:var(--text4); font-size:12px; cursor:pointer; padding:3px 7px; border-radius:var(--r6); transition:all 0.15s; display:flex; align-items:center; gap:4px; }
.comment-action-btn:hover { background:var(--bg4); color:var(--text2); }
.comment-delete-btn:hover { color:var(--red) !important; }
.comment-replies { margin-top:10px; padding-left:16px; border-left:2px solid var(--border); display:flex; flex-direction:column; gap:8px; }
.comment-reply { display:flex; gap:8px; }

/* ===================================================
   RESPONSIVE
=================================================== */
@media (max-width: 600px) {
  .watch-tabs-header { flex-wrap: nowrap; padding-right: 8px; }
  .watch-tab-btn { padding: 11px 14px; font-size: 12px; }
  .share-options-grid { grid-template-columns: repeat(3, 1fr); gap: 7px; }
  .share-opt-btn { padding: 11px 6px; font-size: 10px; }
  .share-opt-btn i { font-size: 18px; }
}

@media (max-width: 400px) {
  .wbp-nav-btn    { padding: 10px 10px; font-size: 12px; gap: 4px; }
  .wbp-action-btn { padding: 10px 10px; font-size: 12px; gap: 4px; }
  .watch-below-player-row { gap: 6px; }
  .wbp-middle { gap: 6px; }
}
</style>
`

  return layout(`Watch ${anime.title} Episode ${episode.episode_number} - ${siteName}`, content, '', siteName)
}
