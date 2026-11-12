import { PAGE } from './layout';
import type { Prim } from './layout';

const NS = 'http://www.w3.org/2000/svg';

/**
 * Le certificat en SVG, pour l'aperçu à l'écran et l'impression. Couleurs et polices viennent des classes
 * de pages/certificat.css, donc des jetons du site. Les textes passent par textContent : un nom saisi
 * par l'utilisateur ne peut pas injecter de balise.
 */
export function renderSvg(prims: Prim[], label: string): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${PAGE.width} ${PAGE.height}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', label);
  svg.classList.add('cert-svg');

  for (const prim of prims) {
    if (prim.kind === 'path') {
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', prim.d);
      path.setAttribute('transform', `translate(${prim.x} ${prim.y}) rotate(${prim.rotate ?? 0}) scale(${prim.scale ?? 1})`);
      path.setAttribute('class', `${prim.fill ? `cert-fill-${prim.fill}` : 'cert-fill-none'} ${prim.stroke ? `cert-stroke-${prim.stroke}` : ''}`.trim());
      if (prim.stroke) path.setAttribute('stroke-width', String(prim.width ?? 1));
      svg.appendChild(path);
      continue;
    }
    const text = document.createElementNS(NS, 'text');
    text.setAttribute('x', String(prim.x));
    text.setAttribute('y', String(prim.y));
    text.setAttribute('font-size', String(prim.size));
    text.setAttribute('text-anchor', prim.align);
    text.setAttribute('class', `cert-font-${prim.font} cert-fill-${prim.color}`);
    if (prim.tracking) text.setAttribute('letter-spacing', String(prim.tracking));
    text.textContent = prim.text;
    svg.appendChild(text);
  }
  return svg;
}
