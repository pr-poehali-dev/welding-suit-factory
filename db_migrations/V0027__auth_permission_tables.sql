CREATE UNIQUE INDEX IF NOT EXISTS auth_sessions_token_uniq ON t_p87775074_welding_suit_factory.auth_sessions (token);
CREATE INDEX IF NOT EXISTS auth_sessions_worker_idx ON t_p87775074_welding_suit_factory.auth_sessions (worker_id);

CREATE TABLE IF NOT EXISTS t_p87775074_welding_suit_factory.worker_permissions (
    id SERIAL PRIMARY KEY,
    worker_id INT NOT NULL,
    permission_key VARCHAR(100) NOT NULL,
    allowed BOOLEAN NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX IF NOT EXISTS worker_permissions_uniq ON t_p87775074_welding_suit_factory.worker_permissions (worker_id, permission_key);
CREATE INDEX IF NOT EXISTS worker_permissions_worker_idx ON t_p87775074_welding_suit_factory.worker_permissions (worker_id);

CREATE TABLE IF NOT EXISTS t_p87775074_welding_suit_factory.level_perm_templates (
    id SERIAL PRIMARY KEY,
    access_level VARCHAR(50) NOT NULL,
    permission_key VARCHAR(100) NOT NULL,
    allowed BOOLEAN NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX IF NOT EXISTS level_perm_templates_uniq ON t_p87775074_welding_suit_factory.level_perm_templates (access_level, permission_key);
