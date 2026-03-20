CREATE TABLE t_p87775074_welding_suit_factory.payment_options (
  id serial PRIMARY KEY,
  option_id varchar(50) NOT NULL UNIQUE,
  group_id varchar(30) NOT NULL,
  availability varchar(10) NOT NULL DEFAULT 'stock',
  label varchar(100) NOT NULL,
  description varchar(200) NOT NULL DEFAULT '',
  coeff numeric(6,4) NOT NULL DEFAULT 1.0,
  sort_order integer NOT NULL DEFAULT 0
);

INSERT INTO t_p87775074_welding_suit_factory.payment_options (option_id, group_id, availability, label, description, coeff, sort_order) VALUES
('stock_prepay_100', 'stock_prepay',   'stock', '100% предоплата',          'Базовая цена',          1.0000, 1),
('stock_def_14',     'stock_deferred', 'stock', 'Отсрочка 14 дней',        '+1.8% к базовой',       1.0180, 2),
('stock_def_30',     'stock_deferred', 'stock', 'Отсрочка 30 дней',        '+3.63% к базовой',      1.0363, 3),
('stock_def_60',     'stock_deferred', 'stock', 'Отсрочка 60 дней',        '+5.49% к базовой',      1.0549, 4),
('order_prepay_14',  'order_prepay',   'order', 'Подзаказ 14 дней',        '−1.8% от базовой',      0.9820, 5),
('order_prepay_30',  'order_prepay',   'order', 'Подзаказ 30 дней',        '−3.37% от базовой',     0.9663, 6),
('order_def_30',     'order_deferred', 'order', 'Подзаказ + отсрочка 30д', '+4.43% к базовой',      1.0443, 7),
('order_def_60',     'order_deferred', 'order', 'Подзаказ + отсрочка 60д', '+6.29% к базовой',      1.0629, 8);