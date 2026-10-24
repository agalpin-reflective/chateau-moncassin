# Notes pour Claude

Site Astro statique du Cercle des parrains du Château Moncassin. Lire le README pour la stack, la configuration et la structure.

## Avant de livrer une modification

- `npm run check` puis `npm run build` doivent passer sans erreur.
- Vérifier le rendu à 390 px et à 1440 px de large : aucun défilement horizontal.
- Vérifier le comportement avec `prefers-reduced-motion: reduce` : pas de Lenis, pas d'épinglage, tout le contenu visible.

## Conventions

- Textes en français, sans trait d'union dans le contenu affiché (règle de la direction artistique).
- Contenus éditables dans `src/data/content.ts` et `src/data/site.ts`, pas en dur dans les composants.
- Couleurs, espacements et durées uniquement via les variables de `src/styles/tokens.css` ; tailles de texte sur les paliers 12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 96, 128 px.
- Une seule police (Manrope), pas d'italique, pas de dégradé en arrière plan (seul le titre du hero a un dégradé de texte).
- Icônes : composant `Icon.astro` (jeu Solar, variantes `-linear`).
- GSAP est le seul système d'animation, Lenis le seul moteur de défilement. Les triggers sont créés dans l'ordre de la page (`home/choreography.ts`) à cause de l'épinglage du cadran.
- Une apparition au défilement ne doit masquer un élément que s'il est sous la ligne de flottaison au chargement.
- Ne jamais présenter d'image, d'avis ou de logo qui ne vient pas du château. Les informations légales manquantes restent marquées « À compléter ».
- La mention loi Évin doit rester visible dans le pied de page, le menu et la porte d'âge.
