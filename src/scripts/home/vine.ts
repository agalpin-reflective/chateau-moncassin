import { $$ } from '../lib/dom';
import { gsap } from '../lib/motion';

/** Le pied de vigne tel qu'il s'affiche quand le cadran n'est pas piloté : grappes mûres, juste avant la récolte. */
const RIPE_MONTH = 10.2;
/** Durée des remises à zéro, jouées pendant que l'élément est invisible. */
const SNAP = 0.05;

/**
 * Le pied de vigne au centre du cadran, décrit comme une frise de douze mois qui suit l'année du vignoble :
 * novembre (0) chute des feuilles, février taille, mars pleurs et débourrement, juin floraison,
 * août véraison, septembre vendanges, octobre (12) retour à l'état de départ.
 * Le cadran fournit le mois courant et la frise se cale dessus : rien ne s'anime tout seul,
 * le défilement reste le seul moteur.
 *
 * La frise est lue dans les deux sens et à n'importe quel mois. Deux règles la rendent déterministe :
 * l'état de départ est posé hors de la frise, et chaque animation repart exactement de la valeur
 * laissée par la précédente sur la même propriété (aucun rendu immédiat à la création).
 */
export function createVine(root: ParentNode) {
  const shoots = $$<SVGPathElement>('.vine-shoot', root);
  const buds = $$<SVGCircleElement>('.vine-bud', root);
  const drops = $$<SVGPathElement>('.vine-drop', root);
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
  const clear = 'rgba(0, 0, 0, 0)';

  const shootsBare = { autoAlpha: 1, y: 0 };
  const shootsCut = { autoAlpha: 0, y: 6 };
  const leafAutumn = { fill: clear, stroke: wine };
  const leafSummer = { fill: goldSoft, stroke: gold };
  const fallOn = { autoAlpha: 1, x: 0, y: 0, rotation: 0 };
  const fallOff = {
    autoAlpha: 0,
    y: (i: number) => 38 + (i % 3) * 10,
    x: (i: number) => (i % 2 ? 8 : -8),
    rotation: (i: number) => (i % 2 ? 40 : -40),
  };
  const berryFlower = { fill: clear, stroke: gold };
  const berryGreen = { fill: goldSoft, stroke: gold };
  const berryRipe = { fill: wine, stroke: wine };

  /* Les origines sont fixées au repos : changées pendant qu'un élément est à l'échelle 0, GSAP les compenserait par un décalage.
     Chaque élément est dessiné autour de son point d'attache, (0, 0) dans son repère. */
  gsap.set([...leaves, ...falls, ...clusters, ...drops], { svgOrigin: '0 0' });
  gsap.set(buds, { transformOrigin: '50% 50%' });

  /* État de départ, début novembre : bois de l'année, feuilles rougies encore accrochées, plus de raisin. */
  gsap.set(shoots, { ...shootsBare, strokeDashoffset: 0, stroke: wood });
  gsap.set(buds, { scale: 1 });
  gsap.set(drops, { autoAlpha: 0, y: 0 });
  gsap.set(leaves, { scale: 1, ...leafAutumn });
  gsap.set(falls, fallOn);
  gsap.set(clusters, { autoAlpha: 0, scale: 0.3, y: 0 });
  gsap.set(berries, berryFlower);

  /* Une unité de temps = un mois, à partir de novembre. */
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none', immediateRender: false } });

  // Novembre : les feuilles tombent l'une après l'autre, la vigne entre en repos.
  tl.fromTo(falls, fallOn, { ...fallOff, duration: 0.6, stagger: 0.1 }, 0.15);

  // Février, la taille : les sarments sont coupés, il ne reste que le cordon et ses yeux.
  tl.fromTo(shoots, shootsBare, { ...shootsCut, duration: 0.3, stagger: 0.2 }, 3.1);

  // Mars, les pleurs : la sève perle sous les yeux du cordon, puis les bourgeons gonflent (débourrement).
  tl.fromTo(drops, { autoAlpha: 0, y: 0 }, { autoAlpha: 1, y: 3, duration: 0.2, stagger: 0.06 }, 4.0)
    .fromTo(drops, { autoAlpha: 1, y: 3 }, { autoAlpha: 0, y: 24, duration: 0.3, stagger: 0.06 }, 4.3)
    .fromTo(buds, { scale: 1 }, { scale: 1.6, duration: 0.4, stagger: 0.06 }, 4.5);

  // Pendant que rien n'est visible, les rameaux et les feuilles reviennent à leur point de départ de printemps.
  tl.fromTo(leaves, { scale: 1, ...leafAutumn }, { scale: 0, ...leafSummer, duration: SNAP }, 4.2)
    .fromTo(falls, fallOff, { ...fallOn, duration: SNAP }, 4.3)
    .fromTo(shoots, { strokeDashoffset: 0, stroke: wood }, { strokeDashoffset: 1, stroke: gold, duration: SNAP }, 4.5)
    .fromTo(shoots, shootsCut, { ...shootsBare, duration: SNAP }, 4.6);

  // Avril et mai, la croissance herbacée : les rameaux poussent, les feuilles se déploient.
  tl.fromTo(shoots, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 2, stagger: 0.12 }, 5.0)
    .fromTo(buds, { scale: 1.6 }, { scale: 1, duration: 0.5 }, 5.2)
    .fromTo(leaves.slice(0, 4), { scale: 0 }, { scale: 1, duration: 1, stagger: 0.1 }, 5.5)
    .fromTo(leaves.slice(4), { scale: 0 }, { scale: 1, duration: 1, stagger: 0.1 }, 6.3);

  // Juin, la floraison : les inflorescences apparaissent, chaque fleur deviendra un grain.
  tl.fromTo(clusters, { autoAlpha: 0, scale: 0.3 }, { autoAlpha: 1, scale: 0.5, duration: 0.8 }, 7.0);

  // Juillet : les grains se forment et les grappes grossissent. Août, la véraison : le raisin prend sa couleur.
  tl.fromTo(clusters, { scale: 0.5 }, { scale: 1, duration: 1.6 }, 8.0)
    .fromTo(berries, berryFlower, { ...berryGreen, duration: 0.6 }, 8.0)
    .fromTo(berries, berryGreen, { ...berryRipe, duration: 0.6, stagger: { each: 0.03, from: 'end' } }, 9.0);

  // Septembre, les vendanges : les grappes sont récoltées l'une après l'autre.
  tl.fromTo(clusters, { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: 14, duration: 0.35, stagger: 0.3 }, 10.4);

  // Octobre : les rameaux deviennent du bois, les feuilles rougissent. La vigne retrouve l'état de novembre.
  tl.fromTo(leaves, leafSummer, { ...leafAutumn, duration: 0.6, stagger: 0.04 }, 11.0)
    .fromTo(shoots, { stroke: gold }, { stroke: wood, duration: 0.8 }, 11.1)
    .fromTo(clusters, { scale: 1, y: 14 }, { scale: 0.3, y: 0, duration: SNAP }, 11.3)
    .fromTo(berries, berryRipe, { ...berryFlower, duration: SNAP }, 11.3)
    .set({}, {}, 12);

  return {
    /** Place la vigne au mois donné, de 0 (début novembre) à 12 (fin octobre). */
    seek(month: number) {
      tl.time(Math.min(12, Math.max(0, month)));
    },
    ripe() {
      tl.time(RIPE_MONTH);
    },
  };
}
