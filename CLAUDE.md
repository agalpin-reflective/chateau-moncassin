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
- Deux polices : Vidaloka (`--font-display`, graisse 400 uniquement, jamais de gras) pour les titres et les grands chiffres, Manrope (`--font`) pour le texte et l'interface. Pas d'italique, pas de dégradé en arrière plan (seul le titre du hero a un dégradé de texte).
- Logo : composant `Logo.astro` (tracé officiel dans `src/data/logo.ts`, vectorisé depuis le fichier du château). Ne pas le redessiner ni le recomposer.
- Icônes : composant `Icon.astro` (jeu Solar, variantes `-linear`).
- GSAP est le seul système d'animation, Lenis le seul moteur de défilement. Le cadran est épinglé en CSS (`position: sticky`), ScrollTrigger ne fait que lire la progression.
- Rien ne doit dépendre de la hauteur d'écran en direct (media query `height`, unités `vh` ou `svh` sur une hauteur de section) : sur téléphone, la barre du navigateur la fait varier pendant le défilement. Passer par la hauteur figée de `year-dial.ts` (`--annee-vh`).
- L'année de la vigne va de novembre à octobre (`vineMonths`, `stages` dans `content.ts`) ; la frise du cep (`home/vine.ts`) suit le même découpage.
- Le formulaire de souscription vit sur la page `/souscrire`, jamais sur l'accueil. Les cartes des formules y renvoient avec `?formule=`.
- Certificat (`/merci`) : la mise en page n'existe qu'à un endroit, `scripts/certificate/layout.ts`. L'aperçu SVG et le PDF la lisent tous les deux : ne jamais retoucher l'un sans l'autre, et contrôler le PDF avec `node tools/render-certificate.mjs`. Le module PDF reste en import dynamique (1 Mo).
- Une apparition au défilement ne doit masquer un élément que s'il est sous la ligne de flottaison au chargement.
- Ne jamais présenter d'image, d'avis ou de logo qui ne vient pas du château. Les informations légales manquantes restent marquées « À compléter ».
- La mention loi Évin doit rester visible dans le pied de page, le menu et la porte d'âge.
