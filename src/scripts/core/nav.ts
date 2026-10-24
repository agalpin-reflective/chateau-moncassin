import { $, $$ } from '../lib/dom';
import { reduce } from '../lib/motion';
import { lockScroll, scrollToTarget } from './smooth-scroll';

/** Événement émis quand un bouton « Choisir la formule … » est cliqué. */
export const FORMULE_EVENT = 'cercle:formule';

export function initNav(): void {
  const header = $('#site-header');
  const burger = $<HTMLButtonElement>('.burger');
  const menu = $('#menu');
  const main = $('#contenu');
  const footer = $('.footer');

  const openMenu = () => {
    if (!menu || !burger) return;
    menu.hidden = false;
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Fermer le menu');
    requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('is-open')));
    lockScroll('menu', true);
    if (main) main.inert = true;
    if (footer) footer.inert = true;
    window.setTimeout(() => $('.menu-link', menu)?.focus(), 160);
  };

  const closeMenu = (restoreFocus = true) => {
    if (!menu || !burger || menu.hidden) return;
    menu.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Ouvrir le menu');
    lockScroll('menu', false);
    if (main) main.inert = false;
    if (footer) footer.inert = false;
    window.setTimeout(() => {
      if (!menu.classList.contains('is-open')) menu.hidden = true;
    }, reduce ? 0 : 700);
    if (restoreFocus) burger.focus();
  };

  burger?.addEventListener('click', () => {
    if (!menu || menu.hidden || !menu.classList.contains('is-open')) openMenu();
    else closeMenu();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu && !menu.hidden) closeMenu();
  });
  window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => {
    if (e.matches) closeMenu(false);
  });

  /* Liens d'ancre de la page courante : défilement doux et focus sur la section. */
  document.addEventListener('click', (e) => {
    const link = (e.target as Element | null)?.closest<HTMLAnchorElement>('a[href*="#"]');
    if (!link || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname) return;
    const id = decodeURIComponent(url.hash.slice(1));
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    e.preventDefault();
    if (link.dataset.choose) {
      document.dispatchEvent(new CustomEvent(FORMULE_EVENT, { detail: link.dataset.choose }));
    }
    closeMenu(false);
    scrollToTarget(target);
  });

  if (!('IntersectionObserver' in window)) return;

  const hero = $('.hero');
  const sentinel = hero ?? $('.nav-sentinel');
  if (sentinel && header) {
    new IntersectionObserver(([entry]) => header.classList.toggle('is-scrolled', !entry.isIntersecting), {
      rootMargin: hero ? '-96px 0px 0px 0px' : '0px',
    }).observe(sentinel);
  }

  const links = $$<HTMLAnchorElement>('[data-nav]');
  const sections = ['top', 'principe', 'annee', 'experience', 'formules', 'privileges', 'etapes', 'questions', 'souscrire']
    .map((id) => document.getElementById(id))
    .filter((el): el is HTMLElement => Boolean(el));
  if (!links.length || !sections.length) return;
  const navIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) => {
          if (a.dataset.nav === entry.target.id) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      });
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );
  sections.forEach((el) => navIO.observe(el));
}
