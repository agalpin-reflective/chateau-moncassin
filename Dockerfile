# Image du site pour Coolify (ou tout hébergeur Docker) : construction Astro, puis fichiers statiques servis par nginx.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# Les dépendances de développement servent au build (icônes, types) : on les installe même si NODE_ENV vaut production.
RUN npm ci --include=dev
COPY . .
# Variables lues par Astro pendant le build. Dans Coolify, les déclarer comme variables de build.
ARG SITE_URL
ARG BASE_PATH
# « true » pour proposer le paiement en ligne (l'API du dossier api/ doit alors être déployée sous /api).
ARG PUBLIC_PAYMENT_ENABLED
ARG PUBLIC_API_URL
# Non indexé par défaut tant que le contenu n'est pas validé : passer PUBLIC_NOINDEX=false pour ouvrir le site aux moteurs.
ARG PUBLIC_NOINDEX=true
ENV SITE_URL=$SITE_URL \
    BASE_PATH=$BASE_PATH \
    PUBLIC_PAYMENT_ENABLED=$PUBLIC_PAYMENT_ENABLED \
    PUBLIC_API_URL=$PUBLIC_API_URL \
    PUBLIC_NOINDEX=$PUBLIC_NOINDEX
RUN npm run build

FROM nginx:stable-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -q --spider http://127.0.0.1/ || exit 1
