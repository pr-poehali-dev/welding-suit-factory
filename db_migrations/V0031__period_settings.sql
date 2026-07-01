CREATE TABLE IF NOT EXISTS t_p87775074_welding_suit_factory.period_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  lock_date DATE,
  auto_weekly BOOLEAN NOT NULL DEFAULT true,
  last_auto_run TIMESTAMPTZ,
  updated_by INTEGER,
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT period_settings_singleton CHECK (id = 1)
);

INSERT INTO t_p87775074_welding_suit_factory.period_settings (id, lock_date, auto_weekly)
VALUES (1, NULL, true)
ON CONFLICT (id) DO NOTHING;