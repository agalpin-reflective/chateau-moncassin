import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';

import { createApp } from './app';
import { env } from './config/env';
import { DBDataSource } from './dataSource/data-source';
import { runMigrations } from './dataSource/migrate';
import { logger } from './utils/logger';
import { TypeOrmOrderRepository } from './v1/repositories/OrderRepository';
import { SmtpMailer } from './v1/services/MailService';
import { OrderService } from './v1/services/OrderService';

/** Clé publique de la banque : variable d'environnement (PEM, retours à la ligne en \n) ou fichier. */
function loadBankPublicKey(): string | null {
  if (env.etransactions.publicKey) return env.etransactions.publicKey.replace(/\\n/g, '\n');
  const file = env.etransactions.publicKeyFile;
  if (!file) return null;
  const path = isAbsolute(file) ? file : join(__dirname, '..', file);
  return existsSync(path) ? readFileSync(path, 'utf8') : null;
}

async function main(): Promise<void> {
  await DBDataSource.initialize();
  await runMigrations(DBDataSource);

  const bankPublicKey = loadBankPublicKey();
  if (!bankPublicKey) {
    logger.error('Clé publique de la banque absente : les notifications de paiement seront toutes rejetées, aucune commande ne passera à « payée ».');
  }
  if (!env.mail.host) logger.warn('SMTP non configuré : les emails de commande ne seront pas envoyés.');

  const orderService = new OrderService(new TypeOrmOrderRepository(DBDataSource), new SmtpMailer(env.mail, env.siteUrl), {
    siteUrl: env.siteUrl,
    publicApiUrl: env.publicApiUrl,
    etransactions: env.etransactions,
    bankPublicKey,
  });
  const app = createApp({
    orderService,
    isReady: async () => {
      await DBDataSource.query('SELECT 1');
      return true;
    },
  });

  const server = app.listen(env.port, () => {
    logger.info(`API du Cercle des parrains à l'écoute sur le port ${env.port} (paiement : ${env.etransactions.mode})`);
  });

  const shutdown = (signal: string) => {
    logger.info(`${signal} reçu : arrêt`);
    server.close(() => {
      DBDataSource.destroy().finally(() => process.exit(0));
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  logger.error('Démarrage impossible', { error: error instanceof Error ? (error.stack ?? error.message) : String(error) });
  process.exit(1);
});
