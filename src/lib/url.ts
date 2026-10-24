/** Construit un lien interne qui respecte l'option `base` d'Astro. */
export function href(path = ''): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  if (path.startsWith('#')) return `${base}/${path}`;
  return `${base}/${path.replace(/^\//, '')}`;
}
