# API du Cercle des parrains. Contexte de build : le dossier api/.

# ==========================================
# Étape 1 : compilation
# ==========================================
FROM node:24-alpine AS builder
WORKDIR /code
COPY package.json package-lock.json ./
RUN npm ci && npm cache clean --force
COPY . .
RUN npm run build
# La production reprend ce node_modules élagué plutôt que de relancer une installation.
RUN npm prune --omit=dev

# ==========================================
# Étape 2 : production
# ==========================================
FROM node:24-alpine AS production
ENV NODE_ENV=production
WORKDIR /code
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 && chown nodejs:nodejs /code
COPY --chown=nodejs:nodejs package.json package-lock.json ./
COPY --chown=nodejs:nodejs --from=builder /code/node_modules ./node_modules
COPY --chown=nodejs:nodejs --from=builder /code/dist ./dist
COPY --chown=nodejs:nodejs migrations ./migrations
# Clé publique de la banque (fichier public) quand elle est versionnée dans keys/.
COPY --chown=nodejs:nodejs keys ./keys
USER nodejs
EXPOSE 4100
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4100/healthcheck', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1
CMD ["node", "dist/index.js"]
