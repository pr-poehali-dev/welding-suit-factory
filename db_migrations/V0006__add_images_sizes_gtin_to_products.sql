-- Фотогалерея (до 5 фото на товар)
CREATE TABLE t_p87775074_welding_suit_factory.product_images (
  id         serial PRIMARY KEY,
  product_id integer NOT NULL,
  url        text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Размерный ряд товара с наценкой в рублях
CREATE TABLE t_p87775074_welding_suit_factory.product_sizes (
  id           serial PRIMARY KEY,
  product_id   integer NOT NULL,
  size_label   varchar(50) NOT NULL,
  price_add    integer NOT NULL DEFAULT 0,
  is_available boolean NOT NULL DEFAULT true
);

-- GTIN и штрихкод к основной таблице
ALTER TABLE t_p87775074_welding_suit_factory.products
  ADD COLUMN gtin varchar(14) NOT NULL DEFAULT '',
  ADD COLUMN barcode_url text NOT NULL DEFAULT '';