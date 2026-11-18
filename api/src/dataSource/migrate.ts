import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { DataSource } from 'typeorm';

import { logger } from '../utils/logger';

/**
 * Applique, dans l'ordre, les fichiers SQL de migrations/ qui ne l'ont pas encore été.
 * Un verrou Postgres évite que deux instances démarrées en même temps ne les jouent deux fois.
 */
export async function runMigrations(dataSource: DataSource, directory = join(__dirname, '..', '..', 'migrations')): Promise<void> {
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  try {
    await runner.query('SELECT pg_advisory_lock(4815162342)');
    await runner.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    const applied = new Set((await runner.query('SELECT name FROM schema_migrations')).map((row: { name: string }) => row.name));
    const files = readdirSync(directory).filter((file) => file.endsWith('.sql')).sort();
    for (const file of files) {
      if (applied.has(file)) continue;
      await runner.startTransaction();
      try {
        await runner.query(readFileSync(join(directory, file), 'utf8'));
        await runner.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await runner.commitTransaction();
        logger.info(`Migration appliquée : ${file}`);
      } catch (error) {
        await runner.rollbackTransaction();
        throw error;
      }
    }
  } finally {
    await runner.query('SELECT pg_advisory_unlock(4815162342)').catch(() => undefined);
    await runner.release();
  }
}
