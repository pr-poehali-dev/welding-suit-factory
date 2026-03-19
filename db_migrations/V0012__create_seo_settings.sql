CREATE TABLE IF NOT EXISTS t_p87775074_welding_suit_factory.seo_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  meta_title VARCHAR(255) NOT NULL DEFAULT '',
  meta_description TEXT NOT NULL DEFAULT '',
  meta_keywords TEXT NOT NULL DEFAULT '',
  og_title VARCHAR(255) NOT NULL DEFAULT '',
  og_description TEXT NOT NULL DEFAULT '',
  og_image TEXT NOT NULL DEFAULT '',
  custom_head_tags TEXT NOT NULL DEFAULT '',
  custom_body_tags TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO t_p87775074_welding_suit_factory.seo_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;