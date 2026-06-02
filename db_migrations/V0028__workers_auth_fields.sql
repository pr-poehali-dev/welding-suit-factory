ALTER TABLE t_p87775074_welding_suit_factory.workers ADD COLUMN IF NOT EXISTS login VARCHAR(100);
ALTER TABLE t_p87775074_welding_suit_factory.workers ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE t_p87775074_welding_suit_factory.workers ADD COLUMN IF NOT EXISTS access_level VARCHAR(50);
ALTER TABLE t_p87775074_welding_suit_factory.workers ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS workers_login_uniq ON t_p87775074_welding_suit_factory.workers (login) WHERE login IS NOT NULL;
