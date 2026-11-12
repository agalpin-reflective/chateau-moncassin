/**
 * Déballe une police WOFF en TrueType ou OpenType brut.
 * Un PDF incorpore les tables de la police telles quelles : un fichier WOFF (tables compressées) y serait illisible,
 * et les polices du site ne sont distribuées qu'en WOFF. Le format est un simple conteneur : un en-tête,
 * un répertoire, puis chaque table compressée en zlib.
 */
async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function woffToSfnt(input: ArrayBuffer | Uint8Array): Promise<Uint8Array> {
  const source = input instanceof Uint8Array ? input : new Uint8Array(input);
  const view = new DataView(source.buffer, source.byteOffset, source.byteLength);
  /* Déjà une police brute (TrueType, OpenType) : rien à faire. */
  if (view.getUint32(0) !== 0x774f4646) return source;

  const flavor = view.getUint32(4);
  const count = view.getUint16(12);
  const tables = await Promise.all(
    Array.from({ length: count }, async (_, i) => {
      const entry = 44 + i * 20;
      const offset = view.getUint32(entry + 4);
      const compLength = view.getUint32(entry + 8);
      const origLength = view.getUint32(entry + 12);
      const raw = source.subarray(offset, offset + compLength);
      return {
        tag: view.getUint32(entry),
        checksum: view.getUint32(entry + 16),
        data: compLength < origLength ? await inflate(raw) : raw,
      };
    }),
  );

  const pad = (n: number) => (n + 3) & ~3;
  const headerSize = 12 + count * 16;
  const out = new Uint8Array(headerSize + tables.reduce((sum, t) => sum + pad(t.data.length), 0));
  const target = new DataView(out.buffer);
  const entrySelector = Math.floor(Math.log2(count));
  const searchRange = 2 ** entrySelector * 16;
  target.setUint32(0, flavor);
  target.setUint16(4, count);
  target.setUint16(6, searchRange);
  target.setUint16(8, entrySelector);
  target.setUint16(10, count * 16 - searchRange);
  let offset = headerSize;
  tables.forEach((table, i) => {
    const record = 12 + i * 16;
    target.setUint32(record, table.tag);
    target.setUint32(record + 4, table.checksum);
    target.setUint32(record + 8, offset);
    target.setUint32(record + 12, table.data.length);
    out.set(table.data, offset);
    offset += pad(table.data.length);
  });
  return out;
}
