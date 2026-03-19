CREATE TABLE t_p87775074_welding_suit_factory.leads (
  id          serial PRIMARY KEY,
  org         varchar(255) NOT NULL DEFAULT '',
  contact     varchar(255) NOT NULL DEFAULT '',
  phone       varchar(50)  NOT NULL DEFAULT '',
  email       varchar(255) NOT NULL DEFAULT '',
  message     text         NOT NULL DEFAULT '',
  kind        varchar(20)  NOT NULL DEFAULT 'contact',
  order_json  text         NOT NULL DEFAULT '',
  order_total integer      NOT NULL DEFAULT 0,
  is_unsubscribed boolean  NOT NULL DEFAULT false,
  created_at  timestamptz  NOT NULL DEFAULT now()
);