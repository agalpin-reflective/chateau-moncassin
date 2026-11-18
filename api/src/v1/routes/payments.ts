import { Router } from 'express';

import { OrderService } from '../services/OrderService';

export function paymentsRouter(service: OrderService): Router {
  const router = Router();

  /**
   * Notification de paiement de la banque (IPN), en GET par défaut. La banque attend une page vide, sans redirection.
   * La chaîne de paramètres est prise telle que reçue : la signature porte sur les données encore encodées.
   */
  router.all('/etransactions/notification', async (req, res) => {
    const rawQuery = req.method === 'POST' && typeof req.body === 'string' ? req.body : (req.originalUrl.split('?')[1] ?? '');
    const outcome = await service.handleNotification(rawQuery, req.ip ?? null);
    res.status(outcome === 'rejected' ? 403 : 200).type('html').send('');
  });

  return router;
}
