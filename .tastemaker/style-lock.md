# Style lock — Cercle des parrains, Château Moncassin

Established: 2026-10-26. Source: direction artistique existante, relevée dans `src/styles/tokens.css` et `CLAUDE.md` (aucune référence image, aucune palette générée). Ce fichier décrit la DA validée, il ne la redéfinit pas : `tokens.css` reste la source des valeurs.

## Palette
Univers sombre (une cave) avec une seule section claire couleur pierre (Formules).
- Background: #131209 (`--ink`, fond de page)
- Surface: #1f1f1f (`--ink-3`, ticket, encarts) ; #181818 (`--ink-2`, champs de formulaire)
- Primary: #eee7db (`--paper`, texte et fond du bouton principal)
- Accent: #cba56b (`--gold`, accents, focus, progression du cadran)
- Wine: #b43a52 (`--wine`, remplissages et bordures uniquement : grains, segment vendanges, badge)
- Text primary: #eee7db, contrast vs background 15.28 (AA pass)
- Text muted: #a9a397 (`--paper-2`), 7.49 sur le fond
- Text hint: #8c877b (`--paper-hint`, placeholder et état vide), 5.25 sur le fond, 4.60 sur la surface
- Wine as text: #cf697d (`--wine-text`), 5.34 sur le fond, 4.69 sur la surface
- Button label color: #131209 sur #eee7db, 15.28 ; sur #cba56b au survol, 8.17
- Section pierre : fond #e6e0d5, carte #efeae2, texte #131209, secondaire #57514a, vin #7a1629
- Dark mode: not needed for this project — single mode only (sombre, plus une section pierre)

## Color contract
Fond sombre (`check_contrast.py --matrix`, 2026-10-26) :
- Text-safe (>=4.5): text/bg, text/surface, on-primary/primary, accent/bg, accent/surface, muted/bg, muted/surface, hint/bg, hint/surface, wine-text/bg, wine-text/surface, wine sur text (texte clair sur fond vin)
- UI-safe (>=3.0 and <4.5): wine/bg (3.28) : bordure du badge vendanges, segment du cadran ; paper-3 (#6f6a60)/surface (3.07) : bordures de survol des champs
- Decorative (<3.0): wine/surface, bg/surface, toutes les lignes `--line*` (filets décoratifs)

Section pierre :
- Text-safe: text/bg, text/carte, secondaire/bg (5.96), secondaire/carte (6.54), vin/bg (8.10), vin/carte (8.88), carte sur vin (badge, survol du bouton)
- Decorative: bg/carte, secondaire/vin

Ajustements : `--wine-text` et `--paper-hint` ont été ajoutés le 2026-10-26, en éclaircissant la teinte, parce que `--wine` (3.28) et `--paper-3` (3.07) servaient de couleur de texte sous le seuil.

## Typography
- Display/heading font: Manrope, graisse 200 à 300 pour les titres, une seule famille (règle de la DA)
- Body font: Manrope 400, 16/24
- Scale: paliers 12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 96, 128 px
- Pas d'italique. Seul le titre du hero porte un dégradé de texte (blanc vers gris, exception assumée de la DA)

## Shape language
- Corner radius: `--r-xs` 2px (cadre photo), `--r-sm` 4px (cartes formules, case à cocher), `--r-md` 8px (champs, encarts), `--r-lg` 16px (ticket), `--r-pill` pour les boutons, le burger et les pastilles
- Shadow depth: plat, une seule ombre profonde sur le ticket (`--shadow-ticket`)
- Border usage: filets d'1px (`--line`, `--line-strong`) plutôt que des ombres

## Density & spacing
- Base unit: 4px, jetons `--s-25` à `--s-900` (2 à 96px)
- Section padding: 64px mobile, 96px desktop (`.section`) ; hero et cadran épinglé à pleine hauteur
- Content card internal padding: 24px (`--s-300`), 32px au dessus de 1024px
- Overall density: éditoriale, aérée
- Section separation: padding fixe, plus une section pierre en rupture de teinte (Formules)

## Structure
- Macrostructure: récit long en une page. Hero (verre WebGL), principe, cadran épinglé des douze mois, contenu du parrainage, phrase manifeste, formules, privilèges, étapes, FAQ, souscription
- Narrative arc: hook (hero) → solution (principe) → how it works (cadran, étapes) → proof (formules, privilèges) → close (souscription)
- Shared chrome: barre pilule centrée et flottante ; pied de page en trois colonnes avec mention loi Évin

## Reference intelligence
- Reference board: aucun, la DA préexistait à tastemaker
- Design read: site vitrine pour amateurs de vin, mode Persuade, couloir éditorial sombre et chaleureux
- Direction contract: Thèse « une année au rythme de la vigne » ; premier écran : le verre de vin vu du dessus ; système : le cercle partout (verre, cadran, cachet) ; risque : manque de photos du château

## Taste memory
- Profile priors used: none (`~/.tastemaker/profile.md` absent)
- Decision log: `.tastemaker/decisions.log`
- Pending review: voir le journal (dégradé du hero, cachet M, légende photo, sur-titres, échelle des titres, section Expérience)
- Profile promotion: none

## Mood descriptors
cave, chaleureux, éditorial, retenu

## Assets
- Anchor asset: `src/assets/robe-poster.webp` (le verre, rendu par le même calcul que le shader)
- Asset style: icônes Solar linéaires, trait fin ; dessin au trait doré pour le cep du cadran (schéma, pas une illustration)
- Illustration vs. photography split: photos du château uniquement (règle du projet : aucune image hors château) ; pas d'illustration de banque d'images
- Logo: cachet « M » dans un cercle doré, à remplacer par le logo officiel du château s'il existe

## Motion
- Feel: lent et feutré pour le récit, immédiat pour les retours d'état
- Curves: `--ease: cubic-bezier(0.32, 0.72, 0, 1)` partout, et la même courbe côté GSAP (`lib/ease.ts`)
- Durations: `--dur-state` 0.2s (survol, focus, sélection), `--dur-panel` 0.7s (menu, barre, étapes du cadran), `--dur-reveal` 1.2s (verre), `--dur-pulse` 1.4s (squelette de chargement), `--stagger` 0.05s
- Screen tracks: GSAP pour le récit (intro du hero, épinglage du cadran, apparitions), CSS pour les états
- Reduced motion: pas de Lenis, pas d'épinglage, verre en image fixe, cadran et cep à l'état mûr, transitions CSS ramenées à 0.01ms
- Verified by: `audit_motion.py src` sans HIGH, le 2026-10-26

## Do not
- Aucune image, aucun avis ni logo qui ne vient pas du château
- Pas de trait d'union ni de tiret cadratin dans les textes affichés
- Pas de couleur, d'arrondi ou de durée en dur hors de `tokens.css`
- Pas d'apparition au défilement en `visibility: hidden` (rend les éléments injoignables au clavier)
