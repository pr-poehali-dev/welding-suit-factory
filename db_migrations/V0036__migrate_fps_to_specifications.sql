-- Перенос существующих связей изделие↔ПФ в спецификации
-- 1) создать спецификацию "Основная" (активную) для каждого изделия, у которого есть состав
INSERT INTO t_p87775074_welding_suit_factory.specifications (finished_product_id, name, is_active)
SELECT DISTINCT fps.finished_product_id, 'Основная', true
FROM t_p87775074_welding_suit_factory.finished_product_semi fps
WHERE NOT EXISTS (
  SELECT 1 FROM t_p87775074_welding_suit_factory.specifications s
  WHERE s.finished_product_id = fps.finished_product_id
);

-- 2) привязать ПФ к активной спецификации соответствующего изделия и перенести qty
UPDATE t_p87775074_welding_suit_factory.semi_products sp
SET specification_id = s.id,
    spec_qty = fps.qty
FROM t_p87775074_welding_suit_factory.finished_product_semi fps
JOIN t_p87775074_welding_suit_factory.specifications s
  ON s.finished_product_id = fps.finished_product_id AND s.is_active = true
WHERE sp.id = fps.semi_product_id AND sp.specification_id IS NULL;