import { $, $$ } from '../lib/dom';
import { gsap, ScrollTrigger, motion } from '../lib/motion';
import { ease } from '../lib/ease';

/** Ouverture et fermeture animées des questions, avec le comportement natif de <details> en repli. */
export function initFaq(): void {
  $$<HTMLDetailsElement>('.faq-item').forEach((item) => {
    const summary = $('summary', item);
    const answer = $('.faq-a', item);
    if (!summary || !answer) return;
    summary.addEventListener('click', (e) => {
      if (!motion) return;
      e.preventDefault();
      if (item.open) {
        gsap.fromTo(answer, { height: answer.offsetHeight }, {
          height: 0, opacity: 0, duration: 0.6, ease,
          onComplete: () => {
            item.open = false;
            gsap.set(answer, { clearProps: 'height,opacity' });
            ScrollTrigger.refresh();
          },
        });
      } else {
        item.open = true;
        gsap.fromTo(answer, { height: 0, opacity: 0 }, {
          height: 'auto', opacity: 1, duration: 0.8, ease,
          onComplete: () => {
            gsap.set(answer, { clearProps: 'height,opacity' });
            ScrollTrigger.refresh();
          },
        });
      }
    });
  });
}
