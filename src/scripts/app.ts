import { $ } from './lib/dom';
import { ScrollTrigger } from './lib/motion';
import { initSmoothScroll, scrollToTarget, destroySmoothScroll } from './core/smooth-scroll';
import { initNav } from './core/nav';
import { gateNeeded, initGate } from './core/gate';
import { initHome } from './home';

document.documentElement.classList.add('js');

initSmoothScroll();
initNav();

const home = $('[data-page="home"]') ? initHome({ gateOpen: gateNeeded() }) : null;

initGate(() => {
  home?.enter();
  const id = decodeURIComponent(location.hash.slice(1));
  const target = id ? document.getElementById(id) : null;
  if (target && id !== 'top') window.setTimeout(() => scrollToTarget(target), 400);
});

window.addEventListener('pagehide', (e) => {
  if (e.persisted) return;
  destroySmoothScroll();
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
});
