import { $, $$ } from '../lib/dom';
import { gsap, ScrollTrigger, motion } from '../lib/motion';
import { ease } from '../lib/ease';
import { splitWords } from '../lib/split';
import { initYearDial } from './year-dial';

/**
 * Animations liées au défilement, créées dans l'ordre de la page pour que
 * l'épinglage du cadran décale correctement les déclencheurs qui le suivent.
 * Les apparitions ne masquent que les éléments situés sous la ligne de flottaison au chargement,
 * et seulement par l'opacité : un élément en visibility hidden ne peut pas recevoir le focus,
 * ce qui rendrait la FAQ ou les boutons injoignables au clavier avant d'avoir défilé jusqu'à eux.
 */
export function initChoreography(): void {
  if (motion) {
    gsap.to('.hero-visual', { yPercent: 14, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.fromTo('.hero-copy', { opacity: 1, y: 0 }, { opacity: 0.15, y: -48, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.fromTo('.principe-frame', { clipPath: 'inset(12% 10% 12% 10% round 2px)' }, { clipPath: 'inset(0% 0% 0% 0% round 2px)', ease: 'none', scrollTrigger: { trigger: '.principe-media', start: 'top 92%', end: 'top 35%', scrub: 0.8 } });
    gsap.fromTo('.principe-frame img', { scale: 1.18 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.principe-media', start: 'top bottom', end: 'bottom top', scrub: 0.8 } });
    gsap.fromTo('.stamp svg', { rotation: 0 }, { rotation: 300, ease: 'none', scrollTrigger: { trigger: '.principe', start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
  }

  initYearDial();

  if (motion) {
    const tagline = $('#tagline');
    const words = splitWords(tagline);
    gsap.fromTo(words, { opacity: 0.3 }, {
      opacity: 1,
      ease,
      stagger: 0.5,
      duration: 1,
      scrollTrigger: { trigger: tagline, start: 'top 80%', end: 'bottom 45%', scrub: 0.5 },
    });
    gsap.fromTo('.priv-frame img', { scale: 1.2, yPercent: -4 }, { scale: 1.1, yPercent: 4, ease: 'none', scrollTrigger: { trigger: '.priv-frame', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo('.steps-fill', { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.steps-wrap', start: 'top 80%', end: 'bottom 55%', scrub: 0.6 } });
  }

  if (!motion || !('IntersectionObserver' in window)) return;

  const timelines = new Map<Element, gsap.core.Timeline>();
  const reveal = (el: Element) => {
    timelines.get(el)?.play();
    timelines.delete(el);
    io.unobserve(el);
  };
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) reveal(entry.target);
      });
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.01 },
  );
  /* Le focus clavier peut atteindre un élément avant qu'il n'entre dans la zone d'apparition. */
  document.addEventListener('focusin', (e) => {
    const target = e.target as Element;
    timelines.forEach((_, el) => {
      if (el.contains(target)) reveal(el);
    });
  });
  const belowFold = (el: Element) => el.getBoundingClientRect().top > window.innerHeight * 0.92;
  const register = (el: Element, tl: gsap.core.Timeline) => {
    timelines.set(el, tl);
    io.observe(el);
  };
  const hiddenState = { y: 64, opacity: 0, filter: 'blur(12px)' };
  const shownState = { y: 0, opacity: 1, filter: 'blur(0px)', duration: 1.1, ease, clearProps: 'filter,transform,opacity' };

  $$('[data-split]').forEach((el) => {
    const words = splitWords(el);
    if (!belowFold(el)) return;
    register(el, gsap.timeline({ paused: true }).fromTo(words, { yPercent: 105 }, { yPercent: 0, duration: 1.1, stagger: 0.045, ease }));
  });
  $$('[data-reveal]').forEach((el) => {
    if (!belowFold(el)) return;
    register(el, gsap.timeline({ paused: true }).fromTo(el, hiddenState, shownState));
  });
  $$('[data-reveal-group]').forEach((group) => {
    if (!belowFold(group)) return;
    register(group, gsap.timeline({ paused: true }).fromTo(Array.from(group.children), hiddenState, { ...shownState, stagger: 0.12 }));
  });

  ScrollTrigger.refresh();
}
