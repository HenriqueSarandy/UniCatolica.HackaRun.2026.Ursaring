import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const FILE_NAME_RE = /^[A-Za-z0-9._-]+$/;

export class UploadError extends Error {
  constructor(public status: 413 | 415, public code: string) {
    super(code);
  }
}

const uploadsDir = () =>
  path.resolve(/*turbopackIgnore: true*/ process.env.UPLOADS_DIR ?? path.join(/*turbopackIgnore: true*/ process.cwd(), "uploads"));

/** Detecta o tipo real pela assinatura (magic bytes). */
export function sniffImage(buf: Uint8Array): { mime: string; ext: string } | null {
  const b = buf;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (
    b.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v)
  ) return { mime: "image/png", ext: "png" };
  if (
    b.length >= 12 &&
    String.fromCharCode(...b.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...b.slice(8, 12)) === "WEBP"
  ) return { mime: "image/webp", ext: "webp" };
  return null;
}

/** Valida tamanho e assinatura. Lança UploadError (413/415). */
export async function validatePhoto(file: File): Promise<{ bytes: Uint8Array; ext: string }> {
  if (file.size > MAX_PHOTO_BYTES) throw new UploadError(413, "foto_grande");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length > MAX_PHOTO_BYTES) throw new UploadError(413, "foto_grande");
  const kind = sniffImage(bytes);
  if (!kind) throw new UploadError(415, "tipo_invalido");
  return { bytes, ext: kind.ext };
}

/** Salva com nome gerado no servidor; retorna o nome do arquivo. */
export function savePhoto(ticketId: string, bytes: Uint8Array, ext: string): string {
  const dir = uploadsDir();
  fs.mkdirSync(dir, { recursive: true });
  const name = `${ticketId}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
  fs.writeFileSync(path.join(dir, name), bytes);
  return name;
}

const MIME: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

/** Lê um upload; null se nome inválido ou inexistente. */
export function readUpload(file: string): { data: Buffer; mime: string } | null {
  if (!FILE_NAME_RE.test(file) || file.includes("..")) return null;
  const mime = MIME[file.split(".").pop()?.toLowerCase() ?? ""];
  if (!mime) return null;
  const full = path.join(uploadsDir(), file);
  try {
    return { data: fs.readFileSync(full), mime };
  } catch {
    return null;
  }
}

export function deleteUpload(file: string): void {
  if (!FILE_NAME_RE.test(file) || file.includes("..")) return;
  try {
    fs.unlinkSync(path.join(uploadsDir(), file));
  } catch {
    /* já removido */
  }
}
