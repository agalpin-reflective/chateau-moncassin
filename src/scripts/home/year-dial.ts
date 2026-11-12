import { $, $$ } from '../lib/dom';
import { gsap, ScrollTrigger, motion } from '../lib/motion';
import { createVine } from './vine';

const CENTER = 300;
const RADIUS = 236;
/** En dessous de cette hauteur, le cadran épinglé ne tient pas à l'écran : les étapes s'affichent en liste. */
const MIN_PIN_HEIGHT = 700;
/** Sous cette hauteur, le cadran épinglé se passe de la ligne des travaux pour tenir dans l'écran d'un téléphone. */
const COMPACT_HEIGHT = 840;

/**
 * Cadran des douze mois de la vigne. Sur un écran assez haut, la section est épinglée et le défilement
 * fait avancer l'aiguille de novembre à octobre. Sinon, toutes les étapes restent affichées.
 * L'épinglage est un position: sticky en CSS, composité par le navigateur : un pin ScrollTrigger
 * repositionne l'élément depuis JavaScript et tremble sur Safari iOS, où le défilement tourne sur un autre fil.
 * ScrollTrigger ne fait que lire la progression.
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
  const months = JSON.parse(section.dataset.months ?? '[]') as string[];
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
    const label = months[Math.min(11, Math.floor(month))];
    if (num && label && num.textContent !== label) num.textContent = label;
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

  /* Hauteur du petit viewport (barres du navigateur affichées), lue une fois dans une sonde en svh. */
  const smallViewport = () => {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100svh;visibility:hidden;pointer-events:none';
    document.body.appendChild(probe);
    const height = probe.offsetHeight || window.innerHeight;
    probe.remove();
    return height;
  };

  const pin = () => {
    section.classList.add('is-pinned');
    if (kicker) kicker.textContent = 'Mois';
    current = -1;
    set(0);
    let target = 0;
    let value = 0;
    const trigger = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: 'bottom bottom',
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
      trigger.kill();
      section.classList.remove('is-pinned');
    };
  };

  /*
   * Le choix entre cadran épinglé et liste dépend de la hauteur de l'écran, et la piste de défilement est figée en pixels.
   * Les deux ne suivent pas la hauteur en direct : sur téléphone, la barre du navigateur qui se replie change cette hauteur
   * pendant le geste (Chrome et Edge redimensionnent la page), et la section changerait de taille sous le doigt,
   * ce qui bloque ou fait sauter le défilement. Au doigt, on ne recalcule que si la largeur change (rotation).
   */
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  let unpin: (() => void) | null = null;
  let width = window.innerWidth;
  const apply = () => {
    const height = smallViewport();
    section.style.setProperty('--annee-vh', `${height}px`);
    const tall = height >= MIN_PIN_HEIGHT;
    section.classList.toggle('is-compact', height < COMPACT_HEIGHT);
    if (tall && !unpin) unpin = pin();
    if (!tall) {
      unpin?.();
      unpin = null;
      staticMode();
    }
  };
  apply();
  let timer = 0;
  window.addEventListener('resize', () => {
    if (coarse && window.innerWidth === width) return;
    width = window.innerWidth;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      apply();
      ScrollTrigger.refresh();
    }, 200);
  });
}
