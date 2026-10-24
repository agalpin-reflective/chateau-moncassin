import { $$ } from '../lib/dom';
import { gsap } from '../lib/motion';

/** Le pied de vigne tel qu'il s'affiche quand le cadran n'est pas piloté : grappes mûres, juste avant la récolte. */
const RIPE_MONTH = 8.8;

/**
 * Le pied de vigne au centre du cadran, décrit comme une frise de douze mois.
 * Le cadran fournit le mois courant et la frise se cale dessus : rien ne s'anime tout seul,
 * le défilement reste le seul moteur.
 */
export function createVine(root: ParentNode) {
  const shoots = $$<SVGPathElement>('.vine-shoot', root);
  const buds = $$<SVGCircleElement>('.vine-bud', root);
  const leaves = $$<SVGPathElement>('.vine-leaf', root);
  const falls = $$<SVGGElement>('.vine-leaf-fall', root);
  const clusters = $$<SVGGElement>('.vine-cluster', root);
  const berries = $$<SVGCircleElement>('.vine-berry', root);
  if (!shoots.length) return null;

  const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const gold = token('--gold');
  const wood = token('--paper-2');
  const goldSoft = token('--gold-soft');
  const wine = token('--wine');

  /* Les origines sont fixées au repos : changées pendant qu'un élément est à l'échelle 0, GSAP les compenserait par un décalage.
     Chaque élément est dessiné autour de son point d'attache, (0, 0) dans son repère. */
  gsap.set([...leaves, ...falls, ...clusters], { svgOrigin: '0 0' });
  gsap.set(buds, { transformOrigin: '50% 50%' });

  /* Une unité de temps = un mois. Janvier commence avec les sarments de l'an dernier, décembre finit au même état. */
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });

  // La taille : les sarments sont coupés, il ne reste que le cordon et ses yeux.
  tl.fromTo(shoots, { autoAlpha: 1, y: 0, stroke: wood }, { autoAlpha: 0, y: 6, duration: 0.7, stagger: 0.35 }, 0.6)
    .set(shoots, { strokeDashoffset: 1, autoAlpha: 1, y: 0, stroke: gold }, 2.6)
    .fromTo(buds, { scale: 0.6 }, { scale: 1.3, duration: 0.6, stagger: 0.1 }, 2.3);

  // Le réveil : les rameaux poussent, les feuilles se déploient, les petites grappes se forment.
  tl.to(shoots, { strokeDashoffset: 0, duration: 2.2, stagger: 0.15 }, 3.0)
    .to(buds, { scale: 1, duration: 0.6 }, 3.4)
    .fromTo(leaves.slice(0, 4), { scale: 0 }, { scale: 1, duration: 1.1, stagger: 0.12 }, 3.9)
    .fromTo(leaves.slice(4), { scale: 0 }, { scale: 1, duration: 1.1, stagger: 0.12 }, 4.9)
    .fromTo(clusters, { autoAlpha: 0, scale: 0.3, y: 0 }, { autoAlpha: 1, scale: 0.6, duration: 1 }, 5.0);

  // La véraison : les grappes grossissent et le raisin prend sa couleur.
  tl.to(clusters, { scale: 1, duration: 2 }, 6.0)
    .fromTo(berries, { fill: goldSoft, stroke: gold }, { fill: wine, stroke: wine, duration: 0.8, stagger: { each: 0.04, from: 'end' } }, 6.4);

  // Les vendanges : les grappes sont récoltées l'une après l'autre.
  tl.to(clusters, { autoAlpha: 0, y: 14, duration: 0.5, stagger: 0.4 }, 9.2);

  // Le chai : la vigne se met au repos, les rameaux deviennent du bois, les feuilles rougissent puis tombent.
  tl.to(shoots, { stroke: wood, duration: 1.2 }, 10.0)
    .fromTo(leaves, { fill: goldSoft, stroke: gold }, { fill: 'rgba(0, 0, 0, 0)', stroke: wine, duration: 0.7, stagger: 0.05 }, 10.0)
    .fromTo(falls, { autoAlpha: 1, x: 0, y: 0, rotation: 0 }, {
      autoAlpha: 0,
      y: (i) => 38 + (i % 3) * 10,
      x: (i) => (i % 2 ? 8 : -8),
      rotation: (i) => (i % 2 ? 40 : -40),
      duration: 0.7,
      stagger: 0.08,
    }, 10.7)
    .set({}, {}, 12);

  return {
    /** Place la vigne au mois donné, de 0 (début janvier) à 12 (fin décembre). */
    seek(month: number) {
      tl.time(Math.min(12, Math.max(0, month)));
    },
    ripe() {
      tl.time(RIPE_MONTH);
    },
  };
}
