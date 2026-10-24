import { $ } from '../lib/dom';
import { gsap, motion } from '../lib/motion';
import { ease } from '../lib/ease';
import { splitWords } from '../lib/split';

/** Titre découpé mot par mot avec un dégradé continu sur toute la largeur du titre. */
export function createHero() {
  const title = $('.hero-title');
  const words = motion ? splitWords(title) : [];
  let prepared = false;

  const paint = () => {
    if (!title || !words.length) return;
    const box = title.getBoundingClientRect();
    let right = box.left;
    words.forEach((w) => {
      right = Math.max(right, (w.parentElement as HTMLElement).getBoundingClientRect().right);
    });
    const width = Math.max(1, right - box.left);
    words.forEach((w) => {
      const r = (w.parentElement as HTMLElement).getBoundingClientRect();
      w.style.backgroundSize = `${width}px 100%`;
      w.style.backgroundPosition = `${box.left - r.left}px 0`;
    });
  };

  const prepare = () => {
    if (!motion || prepared) return;
    prepared = true;
    /* Opacité seule : le bouton reste cliquable et joignable au clavier pendant l'entrée. */
    gsap.set('.hero-eyebrow, .hero-sub, .hero-cta, .hero-proof', { opacity: 0, y: 24 });
    gsap.set(words, { yPercent: 110 });
    gsap.set('.glass', { autoAlpha: 0, scale: 0.86 });
    gsap.set('.glass-hint', { autoAlpha: 0 });
  };

  const play = () => {
    if (!motion) return;
    prepare();
    gsap
      .timeline({ defaults: { ease } })
      .to('.glass', { autoAlpha: 1, scale: 1, duration: 2 }, 0)
      .to('.hero-eyebrow', { opacity: 1, y: 0, duration: 1 }, 0.15)
      .to(words, { yPercent: 0, duration: 1.3, stagger: 0.07 }, 0.25)
      .to('.hero-sub', { opacity: 1, y: 0, duration: 1.1 }, 0.5)
      .to('.hero-cta, .hero-proof', { opacity: 1, y: 0, duration: 1, stagger: 0.1 }, 0.55)
      .to('.glass-hint', { autoAlpha: 1, duration: 1 }, 1.2);
  };

  paint();
  return { paint, prepare, play };
}
