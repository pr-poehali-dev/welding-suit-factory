CREATE TABLE t_p87775074_welding_suit_factory.products (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    category    VARCHAR(100) NOT NULL DEFAULT '',
    description TEXT         NOT NULL DEFAULT '',
    gost        VARCHAR(100) NOT NULL DEFAULT '',
    badge       VARCHAR(50)           DEFAULT NULL,
    base_price  INTEGER      NOT NULL DEFAULT 0,
    image_url   TEXT                  DEFAULT NULL,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order  INTEGER      NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  t_p87775074_welding_suit_factory.products              IS 'Каталог товаров спецодежды';
COMMENT ON COLUMN t_p87775074_welding_suit_factory.products.name         IS 'Название товара';
COMMENT ON COLUMN t_p87775074_welding_suit_factory.products.category     IS 'Категория (Костюмы сварщика, Рабочая одежда, ...)';
COMMENT ON COLUMN t_p87775074_welding_suit_factory.products.description  IS 'Описание товара';
COMMENT ON COLUMN t_p87775074_welding_suit_factory.products.gost         IS 'ГОСТ / сертификат';
COMMENT ON COLUMN t_p87775074_welding_suit_factory.products.badge        IS 'Метка на карточке (ХИТ, НОВИНКА и т.д.)';
COMMENT ON COLUMN t_p87775074_welding_suit_factory.products.base_price   IS 'Базовая цена в рублях (100% предоплата, размер 44-54)';
COMMENT ON COLUMN t_p87775074_welding_suit_factory.products.image_url    IS 'URL изображения товара (S3 CDN)';
COMMENT ON COLUMN t_p87775074_welding_suit_factory.products.is_active    IS 'Показывать на сайте';
COMMENT ON COLUMN t_p87775074_welding_suit_factory.products.sort_order   IS 'Порядок сортировки';
