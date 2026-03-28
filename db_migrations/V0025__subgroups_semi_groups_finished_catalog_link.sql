
-- Подгруппы: parent_id для неограниченной вложенности
ALTER TABLE t_p87775074_welding_suit_factory.groups
  ADD COLUMN parent_id INT REFERENCES t_p87775074_welding_suit_factory.groups(id) ON UPDATE CASCADE;

-- Группы в полуфабрикатах
ALTER TABLE t_p87775074_welding_suit_factory.semi_products
  ADD COLUMN group_id INT REFERENCES t_p87775074_welding_suit_factory.groups(id) ON UPDATE CASCADE;

-- Связь готовой продукции с каталогом
ALTER TABLE t_p87775074_welding_suit_factory.finished_products
  ADD COLUMN catalog_product_id INT REFERENCES t_p87775074_welding_suit_factory.products(id) ON UPDATE CASCADE;

ALTER TABLE t_p87775074_welding_suit_factory.finished_products
  ADD COLUMN catalog_size_id INT REFERENCES t_p87775074_welding_suit_factory.product_sizes(id) ON UPDATE CASCADE;

ALTER TABLE t_p87775074_welding_suit_factory.finished_products
  ADD COLUMN size_label VARCHAR(50);

ALTER TABLE t_p87775074_welding_suit_factory.finished_products
  ADD COLUMN group_id INT REFERENCES t_p87775074_welding_suit_factory.groups(id) ON UPDATE CASCADE;
