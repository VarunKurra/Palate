(() => {
  'use strict';
  if (!document.documentElement.classList.contains('palate-home') || !('IntersectionObserver' in window) || !Element.prototype.animate) return;

  const all = selector => [...document.querySelectorAll(selector)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const easing = 'cubic-bezier(.22,1,.36,1)';
  const running = new Set();
  const targets = new Set();
  const paused = () => reduced.matches || document.body.classList.contains('motion-paused');
  const track = animation => {
    running.add(animation);
    animation.finished.then(() => running.delete(animation), () => running.delete(animation));
  };

  function prepare(element, type = 'rise', delay = 0) {
    if (!element || targets.has(element)) return;
    element.dataset.motion = type;
    element.dataset.motionDelay = delay;
    element.dataset.motionState = paused() ? 'visible' : 'pending';
    targets.add(element);
  }

  // Keep the heading's accessible name and original emphasis/line breaks intact.
  all('main > section:not(.hero) h2, .footer-invitation h2').forEach(heading => {
    const label = heading.innerText.replace(/\s+/g, ' ').trim();
    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const fragment = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) return fragment.append(document.createTextNode(part));
        const mask = document.createElement('span');
        mask.className = 'motion-word';
        mask.setAttribute('aria-hidden', 'true');
        const word = document.createElement('span');
        word.className = 'motion-word-inner';
        word.textContent = part;
        mask.append(word);
        fragment.append(mask);
      });
      node.replaceWith(fragment);
    });
    heading.setAttribute('aria-label', label);
    prepare(heading, 'words');
  });

  all('.section-heading > p, .section-heading > .eyebrow, .split-heading > p, .owner-copy > p, .owner-copy > .eyebrow, .pricing-intro > p, .pricing-intro > .eyebrow, .pricing-intro > .button, .feature-tabs, .check-list, .footer-invitation-actions').forEach(el => prepare(el));
  all('.product-stage, .dashboard-scene').forEach(el => prepare(el, 'panel'));
  all('.story-grid, .setup-editorial, .price-pair, .included-list, .faq-list, .footer-directory').forEach(group => {
    [...group.children].forEach((el, index) => prepare(el, 'rise', Math.min(index * 90, 270)));
  });
  all('.dining-scene, .dining-details').forEach((el, index) => prepare(el, 'panel', index * 100));
  prepare(document.querySelector('.footer-signature'), 'signature');

  function reveal(element, immediate = false) {
    if (element.dataset.motionState !== 'pending') return;
    element.dataset.motionState = 'visible';
    if (immediate || paused()) return;
    const delay = innerWidth < 601 ? Math.min(Number(element.dataset.motionDelay), 90) : Number(element.dataset.motionDelay);
    if (element.dataset.motion === 'words') {
      [...element.querySelectorAll('.motion-word-inner')].forEach((word, index) => {
        track(word.animate([
          { opacity: 0, transform: 'translateY(105%)' },
          { opacity: 1, transform: 'translateY(0)' }
        ], { duration: 680, delay: Math.min(index * 35, 210), easing, fill: 'backwards' }));
      });
      return;
    }
    const panel = element.dataset.motion === 'panel';
    const signature = element.dataset.motion === 'signature';
    track(element.animate([
      { opacity: 0, transform: panel ? 'translateY(24px) scale(.985)' : `translateY(${signature ? 18 : 20}px)` },
      { opacity: 1, transform: 'translateY(0) scale(1)' }
    ], { duration: panel || signature ? 820 : 680, delay, easing, fill: 'backwards' }));
  }

  const entrances = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      reveal(entry.target);
      entrances.unobserve(entry.target);
    });
  }, { threshold: 0, rootMargin: '0px 0px -32px 0px' });
  // At the page end the entire wordmark is reachable, even on short screens.
  targets.forEach(element => entrances.observe(element));

  // Modest scroll-linked depth on editorial food photos only; the hero stays untouched.
  const imageScenes = all('.story-image, .setup-photo, .dining-scene');
  const activeImages = new Set();
  let frame = 0;
  function renderDepth() {
    frame = 0;
    if (paused() || document.hidden) return;
    const amplitude = innerWidth < 601 ? .012 : .032;
    const updates = [...activeImages].map(scene => {
      const rect = scene.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, (innerHeight - rect.top) / (innerHeight * .65 + rect.height * .35)));
      return [scene.querySelector('img'), 1 + (1 - progress) * amplitude];
    });
    updates.forEach(([img, scale]) => { if (img) img.style.scale = scale.toFixed(4); });
  }
  function scheduleDepth() {
    if (!frame && !paused() && !document.hidden) frame = requestAnimationFrame(renderDepth);
  }
  const images = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) activeImages.add(entry.target);
      else activeImages.delete(entry.target);
    });
    scheduleDepth();
  }, { rootMargin: '80px' });
  imageScenes.forEach(scene => images.observe(scene));
  addEventListener('scroll', scheduleDepth, { passive: true });
  addEventListener('resize', scheduleDepth, { passive: true });
  document.addEventListener('visibilitychange', scheduleDepth);

  function syncMotion() {
    if (paused()) {
      cancelAnimationFrame(frame);
      frame = 0;
      targets.forEach(element => reveal(element, true));
      running.forEach(animation => animation.finish());
      imageScenes.forEach(scene => scene.querySelector('img')?.style.removeProperty('scale'));
    } else scheduleDepth();
  }
  reduced.addEventListener('change', syncMotion);
  addEventListener('palate:motion-change', syncMotion);
  // Keyboard navigation must never focus an invisible control.
  document.addEventListener('focusin', event => {
    let element = event.target.closest('[data-motion]');
    while (element) {
      reveal(element, true);
      element.getAnimations().forEach(animation => animation.finish());
      element = element.parentElement?.closest('[data-motion]');
    }
  });
  addEventListener('beforeprint', () => {
    targets.forEach(element => reveal(element, true));
    running.forEach(animation => animation.finish());
  });
  syncMotion();
})();
