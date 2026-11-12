import { PDFDocument, LineCapStyle, LineJoinStyle, degrees, rgb, setCharacterSpacing, setLineJoin } from 'pdf-lib';
import type { PDFFont } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { PAGE, buildCertificate, certificateText } from './layout';
import type { CertificateData, ColorKey, FontKey, TextEnv } from './layout';
import { familyOf, runs, subsetsFor, supports } from './fonts';
import type { FontRanges } from './fonts';
import { woffToSfnt } from './woff';

export interface PdfAssets {
  /** Plages Unicode de chaque jeu de caractères, par famille. */
  ranges: FontRanges;
  /** Fichier de police (WOFF ou TTF) pour une police et un jeu de caractères. */
  loadFont(font: FontKey, subset: string): Promise<ArrayBuffer | Uint8Array>;
  /** Couleurs de la page, composantes de 0 à 1. */
  palette: Record<ColorKey, [number, number, number]>;
}

const FONTS: FontKey[] = ['display', 'text', 'label'];
/* Ligatures et variantes contextuelles coupées : leurs glyphes ne figurent pas dans la table des largeurs que pdf-lib écrit
   (elle ne couvre que les caractères adressables), et le lecteur PDF leur donnerait une largeur par défaut, donc un trou après « fi ». */
const FEATURES = { liga: false, clig: false, calt: false, rlig: false, dlig: false };

/**
 * Le certificat en PDF vectoriel, une page A4 paysage, polices incorporées.
 * Seuls les jeux de caractères utiles au texte sont chargés (le latin de base suffit presque toujours).
 */
export async function renderPdf(data: CertificateData, assets: PdfAssets): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(`Certificat de parrainage · ${data.recipient}`);
  doc.setAuthor('Château Moncassin');
  doc.setSubject("Parrainage d'un pied de vigne");
  doc.setCreationDate(data.start);

  const allText = certificateText(data);
  const fonts = new Map<string, PDFFont>();
  await Promise.all(
    FONTS.flatMap((font) =>
      subsetsFor(allText, assets.ranges[familyOf(font)]).map(async (subset) => {
        const bytes = await woffToSfnt(await assets.loadFont(font, subset));
        fonts.set(`${font}:${subset}`, await doc.embedFont(bytes, { subset: false, features: FEATURES }));
      }),
    ),
  );
  const split = (text: string, font: FontKey) =>
    runs(text, assets.ranges[familyOf(font)]).map((run) => ({ text: run.text, font: fonts.get(`${font}:${run.subset}`) ?? fonts.get(`${font}:latin`)! }));

  const env: TextEnv = {
    measure: (text, font, size) => split(text, font).reduce((sum, run) => sum + run.font.widthOfTextAtSize(run.text, size), 0),
    supports: (text, font) => supports(text, assets.ranges[familyOf(font)]),
  };

  const page = doc.addPage([PAGE.width, PAGE.height]);
  const color = (key: ColorKey) => rgb(...assets.palette[key]);
  page.pushOperators(setLineJoin(LineJoinStyle.Round));

  for (const prim of buildCertificate(data, env)) {
    if (prim.kind === 'path') {
      page.drawSvgPath(prim.d, {
        x: prim.x,
        y: PAGE.height - prim.y,
        scale: prim.scale ?? 1,
        rotate: degrees(-(prim.rotate ?? 0)),
        color: prim.fill ? color(prim.fill) : undefined,
        borderColor: prim.stroke ? color(prim.stroke) : undefined,
        borderWidth: prim.stroke ? (prim.width ?? 1) : 0,
        borderLineCap: LineCapStyle.Round,
      });
      continue;
    }
    const tracking = prim.tracking ?? 0;
    const pieces = split(prim.text, prim.font);
    const count = Array.from(prim.text).length;
    const width = pieces.reduce((sum, run) => sum + run.font.widthOfTextAtSize(run.text, prim.size), 0) + tracking * Math.max(0, count - 1);
    let x = prim.align === 'middle' ? prim.x - width / 2 : prim.align === 'end' ? prim.x - width : prim.x;
    page.pushOperators(setCharacterSpacing(tracking));
    for (const run of pieces) {
      page.drawText(run.text, { x, y: PAGE.height - prim.y, size: prim.size, font: run.font, color: color(prim.color) });
      x += run.font.widthOfTextAtSize(run.text, prim.size) + tracking * Array.from(run.text).length;
    }
    page.pushOperators(setCharacterSpacing(0));
  }

  return doc.save();
}
