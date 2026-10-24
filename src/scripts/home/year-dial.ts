import { $, $$ } from '../lib/dom';
import { gsap, ScrollTrigger, motion } from '../lib/motion';
import { createVine } from './vine';

const CENTER = 300;
const RADIUS = 236;

/**
 * Cadran des douze mois. Sur un écran assez haut, la section est épinglée et le défilement
 * fait avancer l'aiguille de janvier à décembre. Sinon, toutes les étapes restent affichées.
 */
export function initYearDial(): void {
  const section = $('#annee');
  const progress = $<SVGCircleElement>('.dial .progress');
  if (!section || !progress) return;
  const heads = $$<SVGCircleElement>('.dial .head circle');
  const labels = $$<SVGTextElement>('.dial .mlabel');
  const stages = $$('.stage', section);
  const num = $('#dial-num');
  const kicker = $('#dial-kicker');
  const bounds = stages.map((s) => Number(s.dataset.to));
  const vine = createVine(section);
  let current = -1;

  const set = (value: number) => {
    const p = Math.min(1, Math.max(0, value));
    progress.style.strokeDashoffset = String(1 - p);
    const a = ((-90 + p * 360) * Math.PI) / 180;
    const x = (CENTER + RADIUS * Math.cos(a)).toFixed(2);
    const y = (CENTER + RADIUS * Math.sin(a)).toFixed(2);
    heads.forEach((c) => {
      c.setAttribute('cx', x);
      c.setAttribute('cy', y);
    });
    const month = p * 12;
    if (num) num.textContent = String(Math.min(12, Math.floor(month) + 1)).padStart(2, '0');
    labels.forEach((l, i) => l.classList.toggle('is-on', i < month));
    vine?.seek(month);
    let index = stages.length - 1;
    for (let i = 0; i < bounds.length; i++) {
      if (month < bounds[i]) {
        index = i;
        break;
      }
    }
    if (index !== current) {
      current = index;
      stages.forEach((s, i) => s.classList.toggle('is-active', i === index));
    }
  };

  const staticMode = () => {
    if (kicker) kicker.textContent = 'Parrainage';
    set(1);
    if (num) num.textContent = '12';
    stages.forEach((s) => s.classList.add('is-active'));
    vine?.ripe();
    current = -1;
  };

  if (!motion) {
    staticMode();
    return;
  }

  const mm = gsap.matchMedia();
  mm.add('(min-height: 700px)', () => {
    section.classList.add('is-pinned');
    if (kicker) kicker.textContent = 'Mois';
    current = -1;
    set(0);
    let target = 0;
    let value = 0;
    ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: () => `+=${Math.round(window.innerHeight * 2.6)}`,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        target = self.progress;
      },
    });
    const tick = () => {
      if (Math.abs(target - value) < 0.0004) {
        if (value !== target) {
          value = target;
          set(value);
        }
        return;
      }
      value += (target - value) * 0.14;
      set(value);
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      section.classList.remove('is-pinned');
      staticMode();
    };
  });
  mm.add('(max-height: 699px)', () => {
    staticMode();
  });
}
