const WINDY_IMAGE_URL = chrome.runtime.getURL('windy.png');

const HOME_PRESETS = [
  'scale(1.15) translate(-2%, 1%) rotate(0deg)',
  'scale(1.22) translate(-5%, 4%) rotate(-2deg)',
  'scale(1.18) translate(-3%, 0%) rotate(2deg)',
  'scale(1.20) translate(-2%, 2%) rotate(-3deg)',
  'scale(1.16) translate(-6%, -1%) rotate(-1deg)',
  'scale(1.24) translate(-4%, 5%) rotate(-2deg)',
  'scale(1.17) translate(-2%, -2%) rotate(1deg)',
  'scale(1.21) translate(-4%, 3%) rotate(3deg)'
];

const SEARCH_PRESETS = [
  'scale(1.04) translate(-1%, 0%) rotate(0deg)',
  'scale(1.08) translate(-2%, 2%) rotate(-1.5deg)',
  'scale(1.06) translate(-2%, -1%) rotate(-1.5deg)',
  'scale(1.09) translate(-3%, 1%) rotate(-2deg)',
  'scale(1.05) translate(-1.5%, 0%) rotate(1deg)'
];

function getRandomPreset(isSearch) {
  const list = isSearch ? SEARCH_PRESETS : HOME_PRESETS;
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}

function isWindy31Page() {
  const url = window.location.href.toLowerCase();
  const pageKeywords = ['windy31', 'windy31letsgoodplays', 'виндярус'];
  return pageKeywords.some(keyword => url.includes(keyword));
}

function isWindy31Video(container) {

  if (isWindy31Page()) return true;

  const videoCard = container.closest(
    'ytd-rich-item-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer, ytd-video-renderer, ytd-item-section-renderer, yt-lockup-view-model'
  );
  if (!videoCard) return false;

  const textContent = videoCard.innerText.toLowerCase();
  const windyKeywords = ['windy31', 'винди31', 'виндярус', '@windy31', 'windy31letsgoodplays'];

  if (windyKeywords.some(keyword => textContent.includes(keyword))) {
    return true;
  }

  const links = videoCard.querySelectorAll('a[href]');
  for (const link of links) {
    const href = link.getAttribute('href').toLowerCase();
    if (windyKeywords.some(keyword => href.includes(keyword))) {
      return true;
    }
  }

  return false;
}

function injectCSSRules() {
  if (document.getElementById('windyfy-style')) return;
  const style = document.createElement('style');
  style.id = 'windyfy-style';
  
  style.textContent = `
    /* Жесткая маска для предотвращения вылезания за границы */
    ytd-thumbnail a#thumbnail,
    ytd-thumbnail yt-image,
    .ytThumbnailViewModelImage {
      overflow: hidden !important;
      border-radius: inherit !important;
    }
    
    /* Скрываем Винди без анимации, пока не прогрузится оригинальное превью */
    .windyfy-overlay-img {
      display: block !important;
      pointer-events: none !important;
      opacity: 0;
      visibility: hidden;
      transition: none !important;
    }

    /* РЕЗКО и МГНОВЕННО показываем Винди в момент готовности оригинала */
    [data-windyfy-loaded="true"] .windyfy-overlay-img,
    :has(yt-image[loaded]) .windyfy-overlay-img,
    :has(.yt-core-image--loaded) .windyfy-overlay-img {
      opacity: 1 !important;
      visibility: visible !important;
      transition: none !important;
    }

    /* Гарантируем, что красная полоска просмотра лежит СВЕРХУ Винди */
    ytd-thumbnail-overlay-resume-playback-renderer,
    ytd-thumbnail-overlay-resume-playback-renderer #progress {
      position: absolute !important;
      z-index: 99 !important;
    }

    /* Поднимаем таймер и бейджи над оверлеем */
    #overlays,
    .ytd-thumbnail-overlay-time-status-renderer,
    badge-shape,
    .badge-shape-wiz {
      z-index: 25 !important;
    }

    /* МГНОВЕННОЕ скрытие Винди БЕЗ МИГАНИЯ при предпросмотре */
    ytd-thumbnail[has-preview] .windyfy-overlay-img,
    ytd-thumbnail:has(ytd-moving-thumbnail-renderer[ready]) .windyfy-overlay-img,
    ytd-thumbnail:has(video) .windyfy-overlay-img,
    ytd-rich-item-renderer[has-preview] .windyfy-overlay-img,
    ytd-video-renderer[has-preview] .windyfy-overlay-img,
    ytd-compact-video-renderer[has-preview] .windyfy-overlay-img,
    yt-lockup-view-model[has-preview] .windyfy-overlay-img,
    ytd-moving-thumbnail-renderer .windyfy-overlay-img {
      opacity: 0 !important;
      visibility: hidden !important;
      transition: none !important;
    }
  `;
  document.head.appendChild(style);
}

function applyWindyOverlay(element) {
  if (isWindy31Video(element)) return;

  const container = element.querySelector('a#thumbnail') || element;

  if (container.dataset.windyfyApplied || container.querySelector('.windyfy-overlay-img')) {
    return;
  }
  container.dataset.windyfyApplied = 'true';

  const isSearchOrCompact = !!container.closest('ytd-video-renderer, ytd-compact-video-renderer');

  const overlay = document.createElement('img');
  overlay.src = WINDY_IMAGE_URL;
  overlay.className = 'windyfy-overlay-img';

  Object.assign(overlay.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    pointerEvents: 'none',
    zIndex: '20',
    transformOrigin: '20% 50%',
    transform: getRandomPreset(isSearchOrCompact)
  });

  if (window.getComputedStyle(container).position === 'static') {
    container.style.position = 'relative';
  }

  container.appendChild(overlay);

  const mainImg = container.querySelector('img');

  function revealOverlay() {
    container.dataset.windyfyLoaded = 'true';
  }

  if (mainImg) {
    if (mainImg.complete && mainImg.naturalWidth > 0) {
      revealOverlay();
    } else {
      mainImg.addEventListener('load', revealOverlay, { once: true });
      if (mainImg.complete && mainImg.naturalWidth > 0) {
        revealOverlay();
      }
    }
  } else {
    revealOverlay();
  }
}

function scanThumbnails() {
  injectCSSRules();

  const targets = document.querySelectorAll('.ytThumbnailViewModelImage, ytd-thumbnail');

  targets.forEach(el => {
    if (el.closest('ytd-reel-item-renderer, ytd-rich-section-renderer[is-shorts], [is-shorts], ytd-reel-shelf-renderer')) {
      return;
    }

    if (el.offsetWidth > 0 && el.offsetHeight > 0) {
      applyWindyOverlay(el);
    }
  });
}

scanThumbnails();
setInterval(scanThumbnails, 500);

const observer = new MutationObserver(() => {
  scanThumbnails();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});