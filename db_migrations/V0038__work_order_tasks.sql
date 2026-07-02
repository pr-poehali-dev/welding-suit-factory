-- Задания по заказ-наряду, назначенные сотрудникам (для ФОТ и производства)
CREATE TABLE IF NOT EXISTS t_p87775074_welding_suit_factory.work_order_tasks (
  id SERIAL PRIMARY KEY,
  work_order_id INTEGER NOT NULL REFERENCES t_p87775074_welding_suit_factory.work_orders(id),
  worker_id INTEGER NOT NULL REFERENCES t_p87775074_welding_suit_factory.workers(id),
  qty NUMERIC(12,2) NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'assigned',
  started_at TIMESTAMPTZ NULL,
  finished_at TIMESTAMPTZ NULL,
  actual_material_qty NUMERIC(14,3) NULL,
  duration_seconds INTEGER NULL,
  labor_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wot_wo ON t_p87775074_welding_suit_factory.work_order_tasks(work_order_id);
CREATE INDEX IF NOT EXISTS idx_wot_worker ON t_p87775074_welding_suit_factory.work_order_tasks(worker_id);
CREATE INDEX IF NOT EXISTS idx_wot_status ON t_p87775074_welding_suit_factory.work_order_tasks(status);