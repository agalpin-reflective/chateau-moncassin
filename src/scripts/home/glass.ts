import { $ } from '../lib/dom';
import { gsap, finePointer, motion } from '../lib/motion';

/* Géométrie du dessin (Hero.astro) : niveau du vin au repos, demi largeur de la surface, pied du verre. */
const LEVEL = 172;
const HALF = 128;
const FOOT = { x: 200, y: 548 };
/** Inclinaison maximale du vin, en radians : au delà il déborderait du dessin. */
const MAX_TILT = 0.2;

/**
 * Le verre de vin du hero, vu de face et plein. Le verre se penche vers le curseur ; le vin, lui, reste
 * à l'horizontale puis rattrape le mouvement comme un ressort amorti, ce qui le fait onduler dans le verre.
 * Le défilement et l'arrivée sur la page lui donnent aussi une impulsion. Tout passe par le ticker de GSAP,
 * arrêté hors écran ; avec le mouvement réduit, le verre reste immobile, le vin à l'horizontale.
 */
export function createGlass() {
  const fig = $('.glass');
  const hero = $('.hero');
  const body = $<SVGGElement>('.glass-body');
  const wine = $<SVGPathElement>('.glass-wine');
  const surface = $<SVGEllipseElement>('.glass-surface');

  /* Verre : angle visé (curseur) et angle courant, en degrés. Vin : angle et vitesse par rapport à l'horizontale, en radians. */
  let swayTarget = 0;
  let sway = 0;
  let tilt = 0;
  let speed = 0;
  let bulge = 0;
  let bulgeSpeed = 0;
  let time = 0;
  let lastX: number | null = null;
  let running = false;
  let initialized = false;
  const cleanups: (() => void)[] = [];

  const draw = (liquid: number) => {
    if (!body || !wine || !surface) return;
    const slope = Math.tan(Math.max(-MAX_TILT, Math.min(MAX_TILT, liquid)));
    const left = LEVEL + slope * HALF;
    const right = LEVEL - slope * HALF;
    body.setAttribute('transform', `rotate(${sway.toFixed(3)} ${FOOT.x} ${FOOT.y})`);
    wine.setAttribute('d', `M${200 - HALF} ${left.toFixed(2)}Q200 ${(LEVEL + bulge).toFixed(2)} ${200 + HALF} ${right.toFixed(2)}V380H${200 - HALF}Z`);
    surface.setAttribute('transform', `rotate(${((-Math.atan(slope) * 180) / Math.PI).toFixed(3)} 200 ${LEVEL})`);
    surface.setAttribute('cy', (LEVEL + bulge * 0.5).toFixed(2));
  };

  const tick = (_: number, deltaMs: number) => {
    const dt = Math.min(0.05, deltaMs / 1000);
    time += dt;
    const previous = sway;
    sway += (swayTarget - sway) * Math.min(1, dt * 3.2);
    /* Le verre qui bouge entraîne le vin : son déplacement angulaire devient une vitesse pour le liquide. */
    speed += (((sway - previous) * Math.PI) / 180) * 9;
    speed += (-34 * tilt - 2.6 * speed) * dt;
    tilt += speed * dt;
    bulgeSpeed += (-60 * bulge - 5 * bulgeSpeed - speed * 26) * dt;
    bulge += bulgeSpeed * dt;
    /* Au repos, une houle lente : le vin ne se fige jamais tout à fait. */
    const swell = Math.sin(time * 1.3) * 0.012;
    /* Dans le repère du verre, le vin penche à l'opposé du verre. */
    draw(tilt + swell - (sway * Math.PI) / 180);
  };

  const start = () => {
    if (running || !initialized || !motion) return;
    running = true;
    gsap.ticker.add(tick);
  };
  const stop = () => {
    if (!running) return;
    running = false;
    gsap.ticker.remove(tick);
  };

  const init = () => {
    if (initialized || !fig || !hero || !body) return;
    initialized = true;
    draw(0);
    if (!motion) return;
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()));
      io.observe(fig);
      cleanups.push(() => io.disconnect());
    } else {
      start();
    }
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVisibility);
    cleanups.push(() => document.removeEventListener('visibilitychange', onVisibility));

    /* Au doigt, le verre ne suit pas le geste, qui sert à défiler : il réagit seulement au défilement. */
    if (finePointer) {
      const onMove = (e: PointerEvent) => {
        const rect = fig.getBoundingClientRect();
        swayTarget = Math.max(-1, Math.min(1, (e.clientX - (rect.left + rect.width / 2)) / (rect.width * 1.4))) * 7;
        if (lastX !== null) speed += Math.max(-0.5, Math.min(0.5, (e.clientX - lastX) * 0.004));
        lastX = e.clientX;
      };
      const onLeave = () => {
        swayTarget = 0;
        lastX = null;
      };
      hero.addEventListener('pointermove', onMove, { passive: true });
      hero.addEventListener('pointerleave', onLeave);
      window.addEventListener('blur', onLeave);
      cleanups.push(() => {
        hero.removeEventListener('pointermove', onMove);
        hero.removeEventListener('pointerleave', onLeave);
        window.removeEventListener('blur', onLeave);
      });
    }
  };

  return {
    init,
    destroy() {
      stop();
      cleanups.splice(0).forEach((cleanup) => cleanup());
    },
    /** Donne une impulsion au vin : positive vers la droite. L'arrivée sur la page et le défilement s'en servent. */
    push(value: number) {
      speed += Math.max(-1.4, Math.min(1.4, value));
    },
  };
}
