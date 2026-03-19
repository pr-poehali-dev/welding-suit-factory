UPDATE t_p87775074_welding_suit_factory.product_sizes
SET size_label = REPLACE(size_label, '158-166', '158-164')
WHERE size_label LIKE '%158-166%';