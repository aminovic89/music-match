require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./db');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function run() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name        VARCHAR(255) PRIMARY KEY,
      applied_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const { rows } = await db.query(
      'SELECT 1 FROM schema_migrations WHERE name = $1',
      [file]
    );
    if (rows.length > 0) {
      console.log(`⏭  ${file} déjà appliquée`);
      continue;
    }
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    console.log(`▶  Application de ${file}...`);
    await db.query(sql);
    await db.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
    console.log(`✅ ${file} appliquée`);
  }

  console.log('Migrations terminées.');
  await db.pool.end();
}

run().catch((err) => {
  console.error('Erreur lors des migrations :', err);
  process.exit(1);
});
