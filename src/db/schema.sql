-- PostgreSQL schema mirror — store.pg.js scaffold exists; wire at boot before production
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  korabi_cash NUMERIC DEFAULT 0,
  payout_method JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  order_id TEXT,
  reference TEXT,
  route TEXT,
  status TEXT,
  total_amount NUMERIC,
  total_currency TEXT,
  passenger_names JSONB,
  korabi_cash_earned NUMERIC DEFAULT 0,
  source TEXT,
  refund JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  seller_user_id TEXT REFERENCES users(id),
  buyer_user_id TEXT REFERENCES users(id),
  origin TEXT,
  destination TEXT,
  departing_at TIMESTAMPTZ,
  asking_price NUMERIC,
  fare_paid NUMERIC,
  currency TEXT,
  airline JSONB,
  pnr TEXT,
  status TEXT,
  verification JSONB,
  escrow JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  listing_id TEXT,
  seller_user_id TEXT,
  buyer_user_id TEXT,
  amount NUMERIC,
  currency TEXT,
  commission NUMERIC,
  payout NUMERIC,
  state TEXT,
  provider TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  released_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  type TEXT,
  title TEXT,
  message TEXT,
  meta JSONB,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS change_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  booking_id TEXT,
  route TEXT,
  reference TEXT,
  note TEXT,
  status TEXT,
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
