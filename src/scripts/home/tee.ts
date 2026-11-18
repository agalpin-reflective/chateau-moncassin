import { $, $$ } from '../lib/dom';
import { gsap, finePointer, motion } from '../lib/motion';
import { ease } from '../lib/ease';

/** Le tee shirt de la formule domaine : l'année imprimée sur le cœur, et une légère inclinaison sous la souris. */
export function initTee(): void {
  const tilt = $('.tee-tilt');
  if (!tilt) return;

  /* L'année imprimée est celle de l'inscription : l'année en cours, même si le site a été généré l'an dernier. */
  const year = String(new Date().getFullYear());
  $$('[data-tee-year]').forEach((el) => {
    el.textContent = year;
  });

  if (!motion || !finePointer) return;
  const stage = tilt.parentElement!;
  const rx = gsap.quickTo(tilt, 'rotationX', { duration: 0.9, ease });
  const ry = gsap.quickTo(tilt, 'rotationY', { duration: 0.9, ease });
  stage.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect();
    ry(((e.clientX - r.left) / r.width - 0.5) * 14);
    rx(-((e.clientY - r.top) / r.height - 0.5) * 8);
  });
  const reset = () => {
    rx(0);
    ry(0);
  };
  stage.addEventListener('pointerleave', reset);
  window.addEventListener('blur', reset);
}
