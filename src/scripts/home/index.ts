import { ScrollTrigger, motion } from '../lib/motion';
import { getLenis } from '../core/smooth-scroll';
import { createGlass } from './glass';
import { createHero } from './hero';
import { initChoreography } from './choreography';
import { initFaq } from './faq';
import { initSubscription } from './subscription';

export function initHome({ gateOpen }: { gateOpen: boolean }) {
  const glass = createGlass();
  /* Le verre n'est affiché qu'à partir de 1024 px : le WebGL démarre seulement s'il devient visible. */
  const desktop = window.matchMedia('(min-width: 1024px)');
  if (desktop.matches) glass.init();
  else desktop.addEventListener('change', (e) => e.matches && glass.init(), { once: true });
  getLenis()?.on('scroll', (lenis) => glass.add(Math.min(0.06, Math.abs(lenis.velocity) * 0.004)));

  const hero = createHero();
  if (gateOpen) hero.prepare();

  initChoreography();
  initFaq();
  initSubscription();

  const refresh = () => {
    hero.paint();
    if (motion) ScrollTrigger.refresh();
  };
  document.fonts?.ready.then(refresh);
  window.addEventListener('load', refresh);
  let timer = 0;
  window.addEventListener('resize', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(hero.paint, 150);
  });
  window.addEventListener('pagehide', (e) => {
    if (!e.persisted) glass.destroy();
  });

  return {
    /** Lance l'entrée du hero une fois la porte du club franchie. */
    enter() {
      glass.kick(1.6);
      hero.play();
    },
  };
}
