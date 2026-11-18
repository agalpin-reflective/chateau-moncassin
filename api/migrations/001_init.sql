-- Schéma initial : commandes de parrainage et journal des notifications de paiement.
-- Toute évolution du schéma passe par un nouveau fichier NNN_description.sql, jamais par une modification de celui ci.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  access_token text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID')),
  formule text NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'EUR',
  buyer_first_name text NOT NULL,
  buyer_last_name text NOT NULL,
  buyer_email text NOT NULL,
  address_line1 text NOT NULL,
  address_line2 text,
  zip_code text NOT NULL,
  city text NOT NULL,
  country text NOT NULL DEFAULT 'FR',
  is_gift boolean NOT NULL DEFAULT false,
  recipient_name text NOT NULL,
  gift_message text,
  delivery_address text,
  paid_at timestamptz,
  bank_transaction text,
  bank_authorization text,
  last_error_code text,
  emails_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_status_created_idx ON orders (status, created_at DESC);

CREATE TABLE IF NOT EXISTS payment_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text,
  raw_query text NOT NULL,
  signature_valid boolean NOT NULL,
  error_code text,
  source_ip text,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_notifications_reference_idx ON payment_notifications (reference);
