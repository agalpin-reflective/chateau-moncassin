import 'reflect-metadata';
import { DataSource } from 'typeorm';

import { env } from '../config/env';

import { OrderEntity } from './entities/Order.entity';
import { PaymentNotificationEntity } from './entities/PaymentNotification.entity';

/** Le schéma est géré par les fichiers SQL de migrations/, jamais par la synchronisation automatique de TypeORM. */
export const DBDataSource = new DataSource({
  type: 'postgres',
  url: env.database.url,
  synchronize: false,
  logging: false,
  extra: { max: 5, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 },
  entities: [OrderEntity, PaymentNotificationEntity],
});
