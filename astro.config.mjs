// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Une variable de dépôt absente arrive en chaîne vide dans la CI : on la traite comme non définie.
const SITE_URL = process.env.SITE_URL?.trim() || undefined;
// Sous chemin de publication, par exemple /chateau-moncassin sur GitHub Pages. Vide pour un domaine dédié.
const BASE_PATH = process.env.BASE_PATH?.trim() || undefined;
if (!SITE_URL && process.argv.includes('build')) {
  console.warn('\n[chateau-moncassin] SITE_URL non défini : les URL absolues (canonical, sitemap, partage) pointeront vers localhost.\n');
}

export default defineConfig({
  site: SITE_URL ?? 'http://localhost:4321',
  base: BASE_PATH,
  compressHTML: true,
  integrations: [
    sitemap({
      filter: (page) => !/\/(merci|404)\/?$/.test(page),
    }),
  ],
});
