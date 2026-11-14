// Apaga fotos de chamados concluídos há mais de 24 h (boa prática de LGPD).
// Uso: npm run purge:uploads
import { db } from "../src/server/db";
import { deleteUpload } from "../src/server/tickets/uploads";

const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const rows = db
  .prepare("SELECT id, photo_file FROM tickets WHERE status='concluido' AND photo_file IS NOT NULL AND closed_at < ?")
  .all(cutoff) as { id: string; photo_file: string }[];

const clear = db.prepare("UPDATE tickets SET photo_file = NULL WHERE id = ?");
for (const r of rows) {
  deleteUpload(r.photo_file);
  clear.run(r.id);
}
console.log(`✓ ${rows.length} foto(s) removida(s)`);

// LGPD: também apaga o contato de retorno de chamados concluídos há > 24 h.
const contacts = db
  .prepare("UPDATE tickets SET contact = NULL WHERE status='concluido' AND contact IS NOT NULL AND closed_at < ?")
  .run(cutoff);
console.log(`✓ ${contacts.changes} contato(s) removido(s)`);
