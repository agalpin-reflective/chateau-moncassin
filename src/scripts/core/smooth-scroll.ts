import Lenis from 'lenis';
import { gsap, ScrollTrigger, motion, reduce } from '../lib/motion';
import { ease } from '../lib/ease';

let lenis: Lenis | null = null;
const locks = new Set<string>();
const raf = (time: number) => lenis?.raf(time * 1000);

/** Lenis est le seul moteur de défilement du site, synchronisé avec ScrollTrigger. */
export function initSmoothScroll(): Lenis | null {
  if (!motion || lenis) return lenis;
  lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

export const getLenis = () => lenis;

/** Bloque le défilement tant qu'au moins une raison est active (porte d'entrée, menu). */
export function lockScroll(reason: string, on: boolean): void {
  if (on) locks.add(reason);
  else locks.delete(reason);
  const locked = locks.size > 0;
  document.documentElement.classList.toggle('is-locked', locked);
  if (lenis) {
    if (locked) lenis.stop();
    else lenis.start();
  }
}

export function scrollToTarget(target: HTMLElement): void {
  if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.4, easing: ease });
  else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  const focusable = /^(A|BUTTON|INPUT|SUMMARY|MAIN)$/.test(target.tagName);
  if (!focusable && !target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
}

export function destroySmoothScroll(): void {
  gsap.ticker.remove(raf);
  lenis?.off('scroll', ScrollTrigger.update);
  lenis?.destroy();
  lenis = null;
}
