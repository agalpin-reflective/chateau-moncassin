import express, { Express } from 'express';
import helmet from 'helmet';

import { errorHandler } from './utils/errorHandler';
import { ordersRouter } from './v1/routes/orders';
import { paymentsRouter } from './v1/routes/payments';
import { OrderService } from './v1/services/OrderService';

export interface AppDependencies {
  orderService: OrderService;
  /** Vrai quand la base répond : sert au contrôle de santé de Coolify. */
  isReady: () => Promise<boolean>;
}

/** L'application Express, séparée du démarrage pour être testée avec supertest. */
export function createApp({ orderService, isReady }: AppDependencies): Express {
  const app = express();
  /* Un seul proxy devant l'API (Traefik, dans Coolify) : l'adresse du client est lue dans X-Forwarded-For. */
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '20kb' }));
  /* La banque peut notifier en POST : le corps est alors gardé tel quel, pour la vérification de signature. */
  app.use(express.text({ type: 'application/x-www-form-urlencoded', limit: '20kb' }));

  app.get('/healthcheck', async (_req, res) => {
    const ready = await isReady().catch(() => false);
    res.status(ready ? 200 : 503).json({ status: ready ? 'ok' : 'unavailable' });
  });

  app.use('/v1/orders', ordersRouter(orderService));
  app.use('/v1/payments', paymentsRouter(orderService));

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', reason: null, message: 'Route introuvable', details: null } });
  });
  app.use(errorHandler);
  return app;
}
