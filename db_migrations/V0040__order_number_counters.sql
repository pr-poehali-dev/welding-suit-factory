-- Счётчик номеров заказов по годам (номер выделяется навсегда, без пропусков при отмене)
CREATE TABLE IF NOT EXISTS t_p87775074_welding_suit_factory.order_number_counters (
  year INTEGER PRIMARY KEY,
  last_seq INTEGER NOT NULL DEFAULT 0
);