/**
 * Découpe un titre en mots animables.
 * Le texte d'origine reste lisible par les lecteurs d'écran dans un span `.sr-only`,
 * la version découpée est masquée avec aria-hidden.
 * Un titre qui contient autre chose que du texte et des <br> (lien, mise en valeur) n'est pas découpé :
 * la découpe aplatirait ce balisage.
 */
export function splitWords(el: HTMLElement | null): HTMLElement[] {
  if (!el || el.dataset.splitDone) return [];
  if (Array.from(el.children).some((child) => child.tagName !== 'BR')) return [];
  el.dataset.splitDone = '1';
  const label = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  const visual = document.createElement('span');
  visual.setAttribute('aria-hidden', 'true');
  const words: HTMLElement[] = [];

  const addText = (text: string) => {
    text.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) {
        visual.appendChild(document.createTextNode(' '));
        return;
      }
      const w = document.createElement('span');
      w.className = 'w';
      const inner = document.createElement('span');
      inner.className = 'w-in';
      inner.textContent = part;
      w.appendChild(inner);
      visual.appendChild(w);
      words.push(inner);
    });
  };

  Array.from(el.childNodes).forEach((node) => {
    if (node.nodeName === 'BR') visual.appendChild(document.createElement('br'));
    else addText(node.textContent ?? '');
  });

  const sr = document.createElement('span');
  sr.className = 'sr-only';
  sr.textContent = label;
  el.textContent = '';
  el.append(sr, visual);
  el.classList.add('is-split');
  return words;
}
