ALTER TABLE t_p87775074_welding_suit_factory.products
  ADD COLUMN IF NOT EXISTS protection_class VARCHAR(100) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS documentation    TEXT         NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS materials        TEXT         NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS extra_info       TEXT         NOT NULL DEFAULT '';