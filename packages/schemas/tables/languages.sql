create table languages (
  key varchar(16) not null,
  translation jsonb /* @use Translation */ not null,
  primary key(key)
);
