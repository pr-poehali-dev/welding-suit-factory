-- Ежедневные снимки остатков склада (сохраняются в 8:00)
CREATE TABLE IF NOT EXISTS t_p87775074_welding_suit_factory.stock_snapshots (
  id SERIAL PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  warehouse_id INTEGER NOT NULL REFERENCES t_p87775074_welding_suit_factory.warehouses(id),
  item_type VARCHAR(20) NOT NULL,
  item_id INTEGER NOT NULL,
  qty NUMERIC(14,3) NOT NULL DEFAULT 0,
  reserved_qty NUMERIC(14,3) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (snapshot_date, warehouse_id, item_type, item_id)
);

CREATE INDEX IF NOT EXISTS idx_snap_date ON t_p87775074_welding_suit_factory.stock_snapshots(snapshot_date);