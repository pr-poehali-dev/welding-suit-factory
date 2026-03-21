CREATE TABLE t_p87775074_welding_suit_factory.login_attempts (
    id SERIAL PRIMARY KEY,
    ip TEXT NOT NULL,
    attempted_at TIMESTAMP NOT NULL DEFAULT NOW()
);