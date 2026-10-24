import type { APIRoute } from 'astro';
import { href } from '../lib/url';
import { noindexAll } from '../data/site';

export const GET: APIRoute = ({ site }) => {
  const lines = ['User-agent: *', `Allow: ${href()}`, `Disallow: ${href('merci')}`];
  if (site && !noindexAll) lines.push(`Sitemap: ${new URL(href('sitemap-index.xml'), site).href}`);
  return new Response(`${lines.join('\n')}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
