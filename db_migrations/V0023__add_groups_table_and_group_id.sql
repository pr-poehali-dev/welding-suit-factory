
CREATE TABLE t_p87775074_welding_suit_factory.groups (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(entity_type, name)
);

ALTER TABLE t_p87775074_welding_suit_factory.materials ADD COLUMN group_id INT REFERENCES t_p87775074_welding_suit_factory.groups(id) ON UPDATE CASCADE;
ALTER TABLE t_p87775074_welding_suit_factory.fittings ADD COLUMN group_id INT REFERENCES t_p87775074_welding_suit_factory.groups(id) ON UPDATE CASCADE;
ALTER TABLE t_p87775074_welding_suit_factory.operations ADD COLUMN group_id INT REFERENCES t_p87775074_welding_suit_factory.groups(id) ON UPDATE CASCADE;
ALTER TABLE t_p87775074_welding_suit_factory.clients ADD COLUMN group_id INT REFERENCES t_p87775074_welding_suit_factory.groups(id) ON UPDATE CASCADE;
ALTER TABLE t_p87775074_welding_suit_factory.workers ADD COLUMN group_id INT REFERENCES t_p87775074_welding_suit_factory.groups(id) ON UPDATE CASCADE;
