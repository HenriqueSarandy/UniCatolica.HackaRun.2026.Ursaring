import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const MIGRATIONS_DIR = path.join(process.cwd(), "src", "server", "db", "migrations");

export function runMigrations(database: Database.Database = db): void {
  database.exec(
    "CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)",
  );
  const applied = new Set(
    (database.prepare("SELECT name FROM _migrations").all() as { name: string }[]).map((r) => r.name),
  );
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    database.transaction(() => {
      database.exec(sql);
      database
        .prepare("INSERT INTO _migrations (name, applied_at) VALUES (?, ?)")
        .run(file, new Date().toISOString());
    })();
  }
}

function open(): Database.Database {
  const file = process.env.CAPIBOT_DB ?? path.join(process.cwd(), "data", "capibot.sqlite");
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const d = new Database(file);
  d.pragma("journal_mode = WAL");
  d.pragma("foreign_keys = ON");
  return d;
}

const g = globalThis as unknown as { __capibotDb?: Database.Database };

export const db: Database.Database = g.__capibotDb ?? (g.__capibotDb = (() => {
  const d = open();
  runMigrations(d);
  return d;
})());
