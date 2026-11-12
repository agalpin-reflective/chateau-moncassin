/**
 * Géométrie du pied de vigne : un cep taillé en cordon, quatre rameaux, huit feuilles, deux grappes.
 * Dessiné dans le repère du cadran (centre en 300, sol à 330). La même géométrie sert au cadran,
 * au dos du tee shirt (composant Vine.astro) et au certificat de parrainage (scripts/certificate).
 */
export const vine = {
  /** Boîte englobante du dessin à maturité, dans son repère. */
  box: { x: 200, y: 158, width: 200, height: 176 },
  ground: 'M258 330H342',
  wire: 'M206 262H394',
  trunk: 'M293 330C291 318 296 308 293 297C290 286 295 276 294 267M307 330C309 318 304 309 307 298C310 287 306 277 306 267',
  arm: 'M294 267C284 262 262 261 226 262M306 267C316 262 338 261 374 262',
  shoots: [
    'M238 262C236 242 229 220 223 196',
    'M270 262C270 240 267 216 263 188',
    'M330 262C330 240 333 216 337 188',
    'M362 262C364 242 371 220 377 196',
  ],
  /** Les yeux du cordon : abscisse de chaque bourgeon, à la hauteur du fil (262). */
  buds: [238, 270, 330, 362],
  budY: 262,
  /** Une feuille par point : position du pétiole, inclinaison, taille. */
  leaves: [
    { x: 231, y: 228, r: -58, s: 0.9 },
    { x: 268, y: 222, r: 38, s: 0.85 },
    { x: 332, y: 222, r: -38, s: 0.85 },
    { x: 369, y: 228, r: 58, s: 0.9 },
    { x: 223, y: 196, r: -24, s: 1 },
    { x: 263, y: 188, r: -8, s: 1.05 },
    { x: 337, y: 188, r: 8, s: 1.05 },
    { x: 377, y: 196, r: 24, s: 1 },
  ],
  /** Feuille palmée à cinq lobes, pétiole en (0, 0), symétrique pour que l'origine des transformations tombe sur le pétiole. */
  leaf: 'M0 0V-3C-3 0-8 0-10-3L-16-9L-10-12L-14-21L-6-19L0-28L6-19L14-21L10-12L16-9L10-3C8 0 3 0 0-3ZM0-3V-23M0-3L-11-17M0-3L11-17M0-3L-12-8M0-3L12-8',
  /** Point d'attache de chaque grappe sur le cordon. */
  clusters: [252, 348],
  clusterY: 263,
  stem: 'M0 0V9',
  /** Grappes en triangle : 4, 3, 2 puis 1 grain, autour du point d'attache. */
  berries: [4, 3, 2, 1].flatMap((n, row) =>
    Array.from({ length: n }, (_, i) => ({ x: (i - (n - 1) / 2) * 8.4, y: 14 + row * 7.6 })),
  ),
  berryRadius: 3.7,
  /** Les pleurs : une goutte de sève sous chaque œil du cordon. */
  drop: 'M0 0C2.4 3.4 3.2 5 3.2 6.6A3.2 3.2 0 0 1-3.2 6.6C-3.2 5-2.4 3.4 0 0Z',
};
