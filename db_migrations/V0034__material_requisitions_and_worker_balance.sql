-- Требования-накладные (лимитно-заборные карты): выдача материала рабочим
CREATE TABLE IF NOT EXISTS t_p87775074_welding_suit_factory.material_requisitions (
  id SERIAL PRIMARY KEY,
  doc_number VARCHAR(50) NOT NULL,
  warehouse_id INTEGER NOT NULL REFERENCES t_p87775074_welding_suit_factory.warehouses(id),
  worker_id INTEGER NOT NULL REFERENCES t_p87775074_welding_suit_factory.workers(id),
  work_order_id INTEGER REFERENCES t_p87775074_welding_suit_factory.work_orders(id),
  status VARCHAR(20) NOT NULL DEFAULT 'issued',
  issued_by INTEGER REFERENCES t_p87775074_welding_suit_factory.workers(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS t_p87775074_welding_suit_factory.material_requisition_items (
  id SERIAL PRIMARY KEY,
  requisition_id INTEGER NOT NULL REFERENCES t_p87775074_welding_suit_factory.material_requisitions(id),
  material_id INTEGER NOT NULL REFERENCES t_p87775074_welding_suit_factory.materials(id),
  issued_qty NUMERIC(12,4) NOT NULL DEFAULT 0,
  returned_qty NUMERIC(12,4) NOT NULL DEFAULT 0,
  norm_qty NUMERIC(12,4),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS t_p87775074_welding_suit_factory.worker_material_balance (
  id SERIAL PRIMARY KEY,
  worker_id INTEGER NOT NULL REFERENCES t_p87775074_welding_suit_factory.workers(id),
  material_id INTEGER NOT NULL REFERENCES t_p87775074_welding_suit_factory.materials(id),
  qty NUMERIC(12,4) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (worker_id, material_id)
);

CREATE INDEX IF NOT EXISTS idx_mat_req_worker ON t_p87775074_welding_suit_factory.material_requisitions(worker_id);
CREATE INDEX IF NOT EXISTS idx_mat_req_wo ON t_p87775074_welding_suit_factory.material_requisitions(work_order_id);
CREATE INDEX IF NOT EXISTS idx_mat_req_items_req ON t_p87775074_welding_suit_factory.material_requisition_items(requisition_id);