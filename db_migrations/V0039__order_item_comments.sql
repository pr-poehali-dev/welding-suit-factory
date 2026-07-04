-- Лента комментариев к позиции (модели) заказа
CREATE TABLE IF NOT EXISTS t_p87775074_welding_suit_factory.order_item_comments (
  id SERIAL PRIMARY KEY,
  order_item_id INTEGER NOT NULL REFERENCES t_p87775074_welding_suit_factory.order_items(id),
  worker_id INTEGER NULL REFERENCES t_p87775074_welding_suit_factory.workers(id),
  author_name VARCHAR(255) NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oic_item ON t_p87775074_welding_suit_factory.order_item_comments(order_item_id);