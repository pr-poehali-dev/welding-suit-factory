CREATE TABLE IF NOT EXISTS t_p87775074_welding_suit_factory.auth_sessions (
    id SERIAL PRIMARY KEY,
    token VARCHAR(100) NOT NULL,
    worker_id INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL
);
