/* Master's Retreat · DOMA 2027 — interactions */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Language ---------- */
  var META = {
    ru: {
      title: 'Ретрит с Мастером Камильпашой в DOMA · 9–17 мая 2027 · Португалия',
      desc: 'Девять дней утренних и вечерних медитаций с Мастером Камильпашой в DOMA — сосновый лес в 30 минутах от Лиссабона и в 20 минутах от океана. 9–17 мая 2027.'
    },
    en: {
      title: 'Retreat with Master Kamilpasha at DOMA · 9–17 May 2027 · Portugal',
      desc: 'Nine days of morning and evening meditation with Master Kamilpasha at DOMA — a pine forest 30 minutes from Lisbon and 20 minutes from the ocean. 9–17 May 2027.'
    }
  };
  var metaDesc = document.querySelector('meta[name="description"]');
  var altImages = document.querySelectorAll('img[data-alt-en]');
  altImages.forEach(function (img) { img.dataset.altRu = img.getAttribute('alt') || ''; });

  function applyLang(lang) {
    if (!META[lang]) lang = 'ru';
    root.setAttribute('data-lang', lang);
    root.setAttribute('lang', lang);
    var bd = document.body.dataset;
    document.title = bd.titleRu ? (lang === 'en' ? bd.titleEn : bd.titleRu) : META[lang].title;
    if (metaDesc) metaDesc.setAttribute('content', META[lang].desc);
    document.querySelectorAll('[data-set-lang]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn.dataset.setLang === lang));
    });
    altImages.forEach(function (img) {
      img.setAttribute('alt', lang === 'en' ? img.dataset.altEn : img.dataset.altRu);
    });
    try { localStorage.setItem('lang', lang); } catch (e) { /* private mode */ }
  }

  document.querySelectorAll('[data-set-lang]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var lang = btn.dataset.setLang;
      applyLang(lang);
      try {
        var url = new URL(window.location.href);
        url.searchParams.set('lang', lang);
        history.replaceState(null, '', url);
      } catch (e) { /* file:// or old browser */ }
    });
  });

  applyLang(root.getAttribute('data-lang') || 'ru');

  /* ---------- Header state ---------- */
  var header = document.querySelector('.header');
  function onScroll() {
    header.classList.toggle('is-scrolled', window.scrollY > 40);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  var menu = document.getElementById('menu');
  var burger = document.querySelector('.burger');
  function setMenu(open) {
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    burger.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  }
  burger.addEventListener('click', function () { setMenu(!menu.classList.contains('is-open')); });
  menu.querySelector('.menu__close').addEventListener('click', function () { setMenu(false); });
  menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          revealIO.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach(function (el) { revealIO.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- Videos: play only while visible ---------- */
  document.querySelectorAll('video[data-autoplay]').forEach(function (video) {
    if (reduceMotion) {
      video.removeAttribute('autoplay');
      video.pause();
      return;
    }
    if (!('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          if (video.preload === 'none') video.preload = 'auto';
          var p = video.play();
          if (p && p.catch) p.catch(function () { /* autoplay blocked — poster stays */ });
        } else {
          video.pause();
        }
      });
    }, { threshold: 0.05 }).observe(video);
  });

  /* ---------- Hero: show the video the moment it really plays ---------- */
  var heroSection = document.querySelector('.hero');
  var heroVideo = heroSection && heroSection.querySelector('video');
  if (heroVideo) {
    var heroShown = false;
    var showHeroVideo = function () {
      if (heroShown) return;
      heroShown = true;
      heroSection.classList.add('is-playing');
    };
    heroVideo.addEventListener('playing', showHeroVideo);
    heroVideo.addEventListener('timeupdate', function () { if (heroVideo.currentTime > 0.04) showHeroVideo(); });
    if (!heroVideo.paused && heroVideo.readyState >= 3) showHeroVideo();
    if (!reduceMotion) { var pr = heroVideo.play(); if (pr && pr.catch) pr.catch(function () {}); }
  }

  /* ---------- Gallery arrows ---------- */
  document.querySelectorAll('[data-scroll]').forEach(function (btn) {
    var track = document.querySelector(btn.dataset.target);
    if (!track) return;
    btn.addEventListener('click', function () {
      var dir = btn.dataset.scroll === 'next' ? 1 : -1;
      track.scrollBy({ left: dir * track.clientWidth * 0.7, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });

  /* ---------- Mobile sticky CTA ---------- */
  var mcta = document.querySelector('.mcta');
  var hero = document.querySelector('.hero');
  var finalSection = document.getElementById('final');
  var footer = document.querySelector('.footer');
  if (mcta && hero && 'IntersectionObserver' in window) {
    var pastHero = false;
    var nearEnd = false;
    var update = function () {
      var show = pastHero && !nearEnd;
      mcta.classList.toggle('is-visible', show);
      mcta.setAttribute('aria-hidden', String(!show));
      mcta.querySelector('a').tabIndex = show ? 0 : -1;
    };
    new IntersectionObserver(function (entries) {
      pastHero = !entries[0].isIntersecting;
      update();
    }, { threshold: 0.1 }).observe(hero);
    var visibleEnd = new Set();
    var endIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) visibleEnd.add(e.target); else visibleEnd.delete(e.target);
      });
      nearEnd = visibleEnd.size > 0;
      update();
    });
    if (finalSection) endIO.observe(finalSection);
    if (footer) endIO.observe(footer);
  }

  /* ---------- Lightbox for the retreat photos ---------- */
  var lb = document.querySelector('.lightbox');
  var mosaicItems = Array.prototype.slice.call(document.querySelectorAll('.mosaic__item'));
  if (lb && mosaicItems.length) {
    var lbImg = lb.querySelector('img');
    var lbCount = lb.querySelector('.lightbox__count');
    var lbIndex = 0;
    var lastFocus = null;
    var lbShow = function (i) {
      lbIndex = (i + mosaicItems.length) % mosaicItems.length;
      var item = mosaicItems[lbIndex];
      lbImg.src = item.dataset.full;
      lbImg.alt = item.querySelector('img').alt;
      lbCount.textContent = (lbIndex + 1) + ' / ' + mosaicItems.length;
    };
    var lbOpen = function (i) {
      lastFocus = document.activeElement;
      lbShow(i);
      lb.classList.add('is-open');
      lb.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      lb.querySelector('.lightbox__close').focus();
    };
    var lbClose = function () {
      lb.classList.remove('is-open');
      lb.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (lastFocus) lastFocus.focus();
    };
    mosaicItems.forEach(function (item, i) {
      item.addEventListener('click', function () { lbOpen(i); });
    });
    lb.querySelector('.lightbox__close').addEventListener('click', lbClose);
    lb.querySelector('.lightbox__prev').addEventListener('click', function () { lbShow(lbIndex - 1); });
    lb.querySelector('.lightbox__next').addEventListener('click', function () { lbShow(lbIndex + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) lbClose(); });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') lbClose();
      if (e.key === 'ArrowLeft') lbShow(lbIndex - 1);
      if (e.key === 'ArrowRight') lbShow(lbIndex + 1);
    });
    var touchX = null;
    lb.addEventListener('touchstart', function (e) { touchX = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (touchX === null) return;
      var dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 40) lbShow(lbIndex + (dx < 0 ? 1 : -1));
      touchX = null;
    });
  }
})();
