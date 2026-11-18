# Château Moncassin · Le Cercle des parrains

Site du parrainage symbolique d'un pied de vigne au Château Moncassin (SAS CMEV) : 150 € TTC pour 12 mois, deux formules (découverte ou domaine), une journée de vendanges avec repas et des réductions au domaine.

## Stack

- [Astro 7](https://astro.build) en sortie statique, TypeScript strict
- GSAP + ScrollTrigger pour les animations, Lenis comme unique moteur de défilement
- Verre de vin du hero dessiné en SVG, vu de face, animé par GSAP (immobile si le mouvement réduit est demandé)
- Polices Vidaloka (titres) et Manrope (texte), icônes Solar, le tout auto-hébergé (aucune requête vers Google Fonts ou un CDN)
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

Variables d'environnement du site (voir `.env.example`) :

| Variable | Usage |
| --- | --- |
| `SITE_URL` | URL publique du site, utilisée pour le canonical, le sitemap et les images de partage |
| `PUBLIC_PAYMENT_ENABLED` | `true` pour proposer le paiement en ligne ; vide, le formulaire reste en démonstration |
| `PUBLIC_API_URL` | adresse de l'API de commande, `/api` par défaut (même domaine que le site) |

### Paiement

Le paiement passe par **Up2pay e-Transactions** du Crédit Agricole, la solution déjà utilisée par la boutique du château. La signature de chaque paiement demande une clé secrète et la banque confirme le résultat de serveur à serveur : c'est le rôle de l'API, dans le dépôt `chateau-moncassin-api`.

Tant que `PUBLIC_PAYMENT_ENABLED` n'est pas à `true`, le formulaire reste en **mode démonstration** : rien n'est envoyé, le visiteur voit un récapitulatif et un message l'indique.

Le parcours, paiement activé :

1. `/souscrire` envoie la commande à l'API (`POST /api/v1/orders`), qui l'enregistre « en attente » et renvoie un formulaire signé. Le prix est fixé par le serveur, jamais par le navigateur.
2. Le navigateur envoie ce formulaire à la page de paiement de la banque.
3. La banque notifie l'API (`/api/v1/payments/etransactions/notification`). L'API vérifie la signature de la banque et le montant, passe la commande à « payée », puis envoie un email au château et un à l'acheteur.
4. L'acheteur revient sur `/merci?ref=…&t=…`, qui affiche son certificat.

### API

L'API vit dans son propre dépôt, privé : `agalpin-reflective/chateau-moncassin-api` (Node 24, TypeScript, Express 5, TypeORM, Postgres). Elle est déployée comme une seconde application du même Coolify, sous le chemin `/api` du domaine du site. Son README décrit ses routes, sa configuration (identifiants du contrat, clé publique de la banque, SMTP) et la mise en garde sur la clé HMAC.

Pour essayer le paiement en local : lancer l'API depuis son dépôt (`npm run start:dev`, port 4100), puis créer ici un `.env` avec `PUBLIC_PAYMENT_ENABLED=true`. Le serveur de développement du site relaie `/api` vers `localhost:4100`. La banque ne peut pas notifier une machine locale : le passage à « payée » se teste sur un serveur joignable.

Le prix et les formules de l'API (`src/v1/catalogue.ts`) doivent rester alignés avec `src/data/site.ts` et `src/data/content.ts`.

### Certificat de parrainage

Après le paiement, la page `/merci` affiche le certificat, au nom du parrain et daté du jour du paiement, et le propose en PDF (A4 paysage) ou à l'impression. Deux cas sont prévus dès le formulaire : « pour moi » (certificat au nom de l'acheteur) et « pour offrir » (certificat au nom de la personne, avec « Un cadeau de … » et un message facultatif).

- Paiement activé, le certificat n'est délivré que pour une commande payée : la page relit la commande auprès de l'API avec le lien personnel (`ref` et `t`), aussi envoyé par email. Le nom, la formule et la date viennent du serveur et ne sont pas modifiables ; seule la dédicace se règle.
- En mode démonstration, la souscription est gardée dans le navigateur (`src/scripts/lib/order.ts`) et tout reste modifiable.
- Le dessin est décrit une seule fois (`src/scripts/certificate/layout.ts`) et rendu deux fois : en SVG pour l'aperçu et l'impression, en PDF vectoriel avec `pdf-lib` pour le téléchargement (module chargé au clic seulement, environ 1 Mo).
- Contrôle hors navigateur : `node tools/render-certificate.mjs exemple.pdf` (ajouter `cadeau` pour la variante offerte).

## Déploiement

Le build est un site statique : Vercel, Netlify ou Cloudflare Pages détectent Astro automatiquement.

1. Importer le dépôt dans l'hébergeur.
2. Commande de build `npm run build`, dossier publié `dist`.
3. Renseigner `SITE_URL`. Le paiement en ligne demande en plus l'API du dépôt `chateau-moncassin-api` (voir Paiement).
4. Compléter l'hébergeur dans `src/data/site.ts` (mentions légales).

### Docker et Coolify

Le `Dockerfile` construit le site puis le sert avec nginx (`deploy/nginx.conf`) sur le port 80. C'est le mode prévu pour Coolify : source « dépôt Git », build pack « Dockerfile », port exposé 80.

- Variables à déclarer comme **variables de build** : `SITE_URL` (adresse publique, sans barre finale), `PUBLIC_PAYMENT_ENABLED=true` une fois l'API en place, et `PUBLIC_NOINDEX=false` le jour où le site peut être indexé (il ne l'est pas par défaut). Ne pas définir `BASE_PATH` sur un domaine dédié.
- Le HTTPS est terminé par le proxy de Coolify ; nginx n'écoute qu'en HTTP.
- Les pages sont servies sans redirection (`/souscrire` et `/souscrire/`), toujours revalidées ; les fichiers de `/_astro/` sont mis en cache un an.
- Essai local : `docker build --build-arg SITE_URL=http://localhost:8088 -t chateau-moncassin . && docker run --rm -p 8088:80 chateau-moncassin`.

Le site de production est servi par Coolify sur `https://parrains.chateaumoncassin.com`. Chaque push sur `main` y déclenche un déploiement : un webhook GitHub (événement push) appelle Coolify, qui reconstruit l'image et remplace le conteneur sans coupure. Le suivi se fait dans Coolify, onglet Deployment Logs de l'application.

### Sous chemin et indexation

- `BASE_PATH` : sous chemin de publication, lu par `astro.config.mjs`, pour héberger le site ailleurs qu'à la racine d'un domaine ; tous les liens internes passent par `href()` (`src/lib/url.ts`). Aperçu local : `BASE_PATH=/sous-chemin npm run build && BASE_PATH=/sous-chemin npx astro preview`.
- `PUBLIC_NOINDEX` : à `true`, chaque page porte `noindex`. C'est la valeur par défaut de l'image Docker tant que le contenu n'est pas validé.

Le site n'est plus publié sur GitHub Pages : la production est sur Coolify (voir ci dessus).

La CI GitHub Actions (`.github/workflows/ci.yml`) lance `npm run check` et `npm run build` à chaque push sur `main` et sur les pull requests. La variable de dépôt `SITE_URL` est utilisée si elle existe.

## Structure

```
src/
  assets/            photos sources (optimisées au build)
  components/        une section de la page d'accueil par composant, plus le logo, le cep (Vine) et le formulaire
  data/
    site.ts          informations du château, tarif, liens de paiement
    content.ts       formules, année de la vigne, tee shirt, alentours, FAQ, avantages
    logo.ts          tracé du logo officiel du château
    vine.ts          géométrie du pied de vigne (cadran, tee shirt, certificat)
  layouts/           gabarit commun (SEO, navigation, porte d'âge, pied de page)
  pages/             accueil, souscrire, conditions, mentions légales, confidentialité, merci, 404, robots.txt
  scripts/
    app.ts           point d'entrée commun à toutes les pages
    core/            défilement, navigation, porte d'âge
    home/            verre du hero, intro du hero, cadran de l'année, cep, tee shirt, apparitions, FAQ
    pages/           formulaire de souscription, page du certificat
    certificate/     dessin du certificat, rendu SVG et rendu PDF
  styles/            tokens, base, une feuille par section
tools/make-qr.mjs        génère le QR code du site (SVG et PNG) pour une adresse donnée
tools/render-certificate.mjs   génère un certificat d'exemple en PDF avec le code de la page
```

## À compléter par le château

Les champs manquants s'affichent « À compléter » en rouge sur les pages concernées.

- `src/data/site.ts` : capital, siège, RCS, SIRET, TVA, directeur de la publication, email, téléphone, hébergeur
- Conditions générales de vente (page `conditions`)
- Durée de conservation des données de commande (page `confidentialite`)
- Identifiants du contrat Up2pay e-Transactions pour ce site, clé publique de la banque et compte SMTP d'envoi des emails (voir Paiement)
- Durée de conservation des commandes enregistrées par l'API (aucune purge automatique pour l'instant)
- Droits d'utilisation de la photo du château (source citée : tripadvisor.pt)
- Photos originales du domaine si possible (vignes, chai, bouteilles du château)
- Deux photos demandées par le château : une vue plus large du château (section Privilèges, `src/assets/chateau.jpg`) et une photo de vendanges avec le propriétaire (section Le parrainage, `src/assets/vendanges.jpg`)
- Adresse définitive du site, pour générer le QR code à imprimer (`node tools/make-qr.mjs https://… dossier`) : un code imprimé ne se corrige plus
- Visuel définitif du tee shirt (la section de l'accueil montre un aperçu dessiné, non contractuel)
- Section Casteljaloux : noms des établissements, distances et liens, si le château souhaite les afficher
- Calendrier des travaux du vignoble (`stages` dans `content.ts`), repris d'une frise générique : à valider par le vigneron

## Règles éditoriales et visuelles

- Deux polices : Vidaloka pour les titres et les grands chiffres (graisse 400 uniquement), Manrope pour le texte (graisses de 200 à 700). Pas d'italique.
- Pas de trait d'union dans les textes affichés : on écrit « tee shirt » et les questions évitent l'inversion du sujet.
- Tailles de texte et espacements limités aux paliers définis dans `src/styles/tokens.css`.
- Toutes les transitions utilisent la courbe `cubic-bezier(0.32, 0.72, 0, 1)`.
- Mention obligatoire (loi Évin) dans le pied de page, le menu et la porte d'âge : « L'abus d'alcool est dangereux pour la santé. À consommer avec modération. »

## Crédits

- Photographie du château : tripadvisor.pt (droits à confirmer)
- Icônes : [Solar](https://icon-sets.iconify.design/solar/), CC BY 4.0
- Polices : [Vidaloka](https://fonts.google.com/specimen/Vidaloka) et [Manrope](https://fonts.google.com/specimen/Manrope), SIL Open Font License
- Logo : fourni par le château, vectorisé dans `src/data/logo.ts`
