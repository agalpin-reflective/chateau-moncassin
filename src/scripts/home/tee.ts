import { $, $$ } from '../lib/dom';
import { gsap, finePointer, motion } from '../lib/motion';
import { ease } from '../lib/ease';

type Side = 'front' | 'back';

/**
 * Le tee shirt de la formule domaine : deux faces dos à dos, retournées autour de l'axe vertical.
 * Il se présente de face, se retourne une fois quand il arrive à l'écran pour montrer le dos
 * (l'année d'inscription et le pied de vigne), puis les boutons ou un clic le font tourner.
 */
export function initTee(): void {
  const tee = $('#tee-model');
  if (!tee) return;
  const tilt = $('.tee-tilt');
  const faces: Record<Side, HTMLElement | null> = { front: $('.tee-front', tee), back: $('.tee-back', tee) };
  const buttons = $$<HTMLButtonElement>('[data-tee-side]');
  let side: Side = 'front';
  let touched = false;

  /* L'année imprimée au dos est celle de l'inscription : l'année en cours, même si le site a été généré l'an dernier. */
  const year = String(new Date().getFullYear());
  $$('[data-tee-year]').forEach((el) => {
    el.textContent = year;
  });

  const show = (next: Side, animate = true) => {
    side = next;
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.teeSide === next)));
    (Object.keys(faces) as Side[]).forEach((key) => faces[key]?.setAttribute('aria-hidden', String(key !== next)));
    const rotationY = next === 'back' ? 180 : 0;
    if (motion && animate) gsap.to(tee, { rotationY, duration: 1.2, ease, overwrite: true });
    else gsap.set(tee, { rotationY });
  };
  show('front', false);

  buttons.forEach((b) =>
    b.addEventListener('click', () => {
      touched = true;
      show(b.dataset.teeSide === 'back' ? 'back' : 'front');
    }),
  );
  tee.addEventListener('click', () => {
    touched = true;
    show(side === 'front' ? 'back' : 'front');
  });

  if (!motion) return;

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        if (!touched) show('back');
      },
      { threshold: 0.7 },
    );
    io.observe(tee);
  }

  /* Sous la souris, le tee shirt s'incline légèrement, comme tenu à bout de bras. */
  if (finePointer && tilt) {
    const stage = tilt.parentElement!;
    const rx = gsap.quickTo(tilt, 'rotationX', { duration: 0.9, ease });
    const ry = gsap.quickTo(tilt, 'rotationY', { duration: 0.9, ease });
    stage.addEventListener('pointermove', (e) => {
      const r = stage.getBoundingClientRect();
      ry(((e.clientX - r.left) / r.width - 0.5) * 16);
      rx(-((e.clientY - r.top) / r.height - 0.5) * 8);
    });
    const reset = () => {
      rx(0);
      ry(0);
    };
    stage.addEventListener('pointerleave', reset);
    window.addEventListener('blur', reset);
  }
}
