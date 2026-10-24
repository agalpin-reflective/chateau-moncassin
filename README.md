# Château Moncassin · Le Cercle des parrains

Site du parrainage symbolique d'un pied de vigne au Château Moncassin (SAS CMEV) : 150 € TTC pour 12 mois, deux formules (découverte ou domaine), une journée de vendanges avec repas et des réductions au domaine.

## Stack

- [Astro 7](https://astro.build) en sortie statique, TypeScript strict
- GSAP + ScrollTrigger pour les animations, Lenis comme unique moteur de défilement
- Shader WebGL brut pour le verre de vin du hero (image fixe de repli si WebGL manque ou si le mouvement réduit est demandé)
- Police Manrope et icônes Solar auto-hébergées (aucune requête vers Google Fonts ou un CDN)
- Images optimisées au build (AVIF, WebP) via `astro:assets`
- Sitemap, `robots.txt`, balises Open Graph, données structurées FAQ

## Démarrer

```bash
nvm use            # Node 22
npm install
cp .env.example .env
npm run dev        # http://localhost:4321
```

| Commande | Rôle |
| --- | --- |
| `npm run dev` | serveur de développement |
| `npm run check` | vérification TypeScript et des composants Astro |
| `npm run build` | build statique dans `dist/` |
| `npm run preview` | aperçu local du build |

## Configuration

Variables d'environnement (voir `.env.example`) :

| Variable | Usage |
| --- | --- |
| `SITE_URL` | URL publique du site, utilisée pour le canonical, le sitemap et les images de partage |
| `PUBLIC_STRIPE_LINK_DECOUVERTE` | lien de paiement Stripe de la formule découverte |
| `PUBLIC_STRIPE_LINK_DOMAINE` | lien de paiement Stripe de la formule domaine |

### Paiement

Tant que les deux liens Stripe sont vides, le formulaire reste en **mode démonstration** : rien n'est envoyé, le visiteur voit un récapitulatif et un message l'indique.

Pour activer le paiement :

1. Dans Stripe, créer deux **Payment Links** à 150 € TTC (un par formule).
2. Activer la collecte de l'adresse de livraison (France) et ajouter un champ personnalisé « Nom du parrain ».
3. Définir la page de confirmation sur `https://<votre-domaine>/merci`.
4. Renseigner les deux URL dans les variables d'environnement, puis redéployer.

Le formulaire envoie vers Stripe l'email prérempli (`prefilled_email`), la langue (`locale=fr`) et une référence `client_reference_id` de la forme `domaine_1729…` pour retrouver la formule choisie.

## Déploiement

Le build est un site statique : Vercel, Netlify ou Cloudflare Pages détectent Astro automatiquement.

1. Importer le dépôt dans l'hébergeur.
2. Commande de build `npm run build`, dossier publié `dist`.
3. Renseigner `SITE_URL` et, le moment venu, les liens Stripe.
4. Compléter l'hébergeur dans `src/data/site.ts` (mentions légales).

### GitHub Pages

Le workflow `.github/workflows/deploy.yml` publie le site sur GitHub Pages à chaque push sur `main` (ou à la demande depuis l'onglet Actions). L'adresse et le sous chemin (`/chateau-moncassin`) viennent de Pages : avec un domaine personnalisé, le build s'adapte sans modification.

- `BASE_PATH` : sous chemin de publication, lu par `astro.config.mjs` ; tous les liens internes passent par `href()` (`src/lib/url.ts`).
- `PUBLIC_NOINDEX` : `true` par défaut sur Pages, chaque page porte `noindex` tant que le contenu n'est pas validé. Créer la variable de dépôt `PUBLIC_NOINDEX=false` pour ouvrir le site aux moteurs.
- Aperçu local identique à Pages : `BASE_PATH=/chateau-moncassin npm run build && BASE_PATH=/chateau-moncassin npx astro preview`, puis ouvrir `/chateau-moncassin/`.

La CI GitHub Actions (`.github/workflows/ci.yml`) lance `npm run check` et `npm run build` à chaque push sur `main` et sur les pull requests. Les variables du dépôt `SITE_URL` et `PUBLIC_STRIPE_LINK_*` sont utilisées si elles existent.

## Structure

```
src/
  assets/            photos sources et image fixe du verre (optimisées au build)
  components/        une section de la page d'accueil par composant
  data/
    site.ts          informations du château, tarif, liens de paiement
    content.ts       formules, étapes de l'année, FAQ, avantages
  layouts/           gabarit commun (SEO, navigation, porte d'âge, pied de page)
  pages/             accueil, conditions, mentions légales, confidentialité, merci, 404, robots.txt
  scripts/
    app.ts           point d'entrée commun à toutes les pages
    core/            défilement, navigation, porte d'âge
    home/            verre WebGL, intro du hero, cadran de l'année, apparitions, FAQ, souscription
  styles/            tokens, base, une feuille par section
tools/render-poster.py   régénère l'image fixe du verre à partir de la même formule que le shader
```

## À compléter par le château

Les champs manquants s'affichent « À compléter » en rouge sur les pages concernées.

- `src/data/site.ts` : capital, siège, RCS, SIRET, TVA, directeur de la publication, email, téléphone, hébergeur
- Conditions générales de vente (page `conditions`)
- Durée de conservation des données de commande (page `confidentialite`)
- Liens de paiement Stripe
- Droits d'utilisation de la photo du château (source citée : tripadvisor.pt)
- Photos originales du domaine si possible (vignes, chai, bouteilles du château)

## Règles éditoriales et visuelles

- Une seule police (Manrope), pas d'italique, graisses de 200 à 700.
- Pas de trait d'union dans les textes affichés : on écrit « tee shirt » et les questions évitent l'inversion du sujet.
- Tailles de texte et espacements limités aux paliers définis dans `src/styles/tokens.css`.
- Toutes les transitions utilisent la courbe `cubic-bezier(0.32, 0.72, 0, 1)`.
- Mention obligatoire (loi Évin) dans le pied de page, le menu et la porte d'âge : « L'abus d'alcool est dangereux pour la santé. À consommer avec modération. »

## Crédits

- Photographie du château : tripadvisor.pt (droits à confirmer)
- Icônes : [Solar](https://icon-sets.iconify.design/solar/), CC BY 4.0
- Police : [Manrope](https://fonts.google.com/specimen/Manrope), SIL Open Font License
