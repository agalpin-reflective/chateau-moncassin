import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { env } from '../../config/env';
import { OrderEntity } from '../../dataSource/entities/Order.entity';
import { DURATION_MONTHS, formules, FormuleId } from '../catalogue';
import { OrderService } from '../services/OrderService';
import { parseOrderInput } from '../validation/order';

/** Ce que la page du certificat a le droit de connaître d'une commande : rien de l'adresse ni de l'email. */
const certificateView = (order: OrderEntity) => {
  const formule = formules[order.formule as FormuleId];
  return {
    reference: order.reference,
    status: order.status,
    formule: { id: order.formule, label: formule?.label ?? order.formule, summary: formule?.summary ?? '' },
    recipient: order.recipientName,
    gift: order.isGift,
    giver: order.isGift ? order.buyerFirstName : null,
    buyerFirstName: order.buyerFirstName,
    message: order.giftMessage,
    /** Le parrainage court à partir du paiement. */
    startsAt: (order.paidAt ?? order.createdAt).toISOString(),
    months: DURATION_MONTHS,
  };
};

export function ordersRouter(service: OrderService): Router {
  const router = Router();

  /* Ouvrir une commande ne coûte rien à l'appelant : on limite les abus par adresse IP. */
  const createLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false, skip: () => env.node.isTest });

  router.post('/', createLimiter, async (req, res) => {
    const { order, payment } = await service.createOrder(parseOrderInput(req.body));
    res.status(201).json({ reference: order.reference, payment });
  });

  router.get('/:reference', async (req, res) => {
    const token = typeof req.query.t === 'string' ? req.query.t : '';
    const order = await service.getOrder(req.params.reference, token);
    res.set('Cache-Control', 'no-store').json(certificateView(order));
  });

  return router;
}
