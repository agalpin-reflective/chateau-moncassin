import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
/* Sur téléphone, la barre d'adresse qui se replie change la hauteur de la fenêtre à chaque geste :
   sans ce réglage, ScrollTrigger recalcule tout en plein défilement et coupe l'élan. */
ScrollTrigger.config({ ignoreMobileResize: true });

export { gsap, ScrollTrigger };

export const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
/** Les animations pilotées au scroll ne tournent que si l'utilisateur n'a pas demandé à réduire le mouvement. */
export const motion = !reduce;
