-- TODO: complete list
create type language_key_type as enum (
  'en',
  'en-US',
  'en-UK',
  'fr',
  'pt-PT',
  'zh-CN',
  'zh-HK',
  'zh-TW',
  'tr-TR',
  'ko-KR'
);

create table phrases (
  language_key language_key_type not null,
  translation jsonb /* @use Translation */ not null,
  primary key(language_key)
);
