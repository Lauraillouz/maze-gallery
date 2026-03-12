-- ============================================================
-- I18N — ajout des colonnes de traduction FR/EN
-- ============================================================

-- ROOM
alter table room
  add column name_fr        text,
  add column name_en        text,
  add column description_fr text,
  add column description_en text;

-- on migre les données existantes vers _fr par défaut
update room set name_fr = name, description_fr = description;

-- ARTWORK
alter table artwork
  add column title_fr       text,
  add column title_en       text,
  add column description_fr text,
  add column description_en text;

update artwork set title_fr = title;

-- ENIGMA
alter table enigma
  add column question_fr text,
  add column question_en text,
  add column answer_fr   text,
  add column answer_en   text,
  add column hint_fr     text,
  add column hint_en     text;

update enigma set question_fr = question, answer_fr = answer, hint_fr = hint;

-- CHARITABLE ORGANIZATION
alter table charitable_organization
  add column name_fr        text,
  add column name_en        text,
  add column description_fr text,
  add column description_en text;

update charitable_organization set name_fr = name, description_fr = description;
