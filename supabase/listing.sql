-- rooms table (structural data; connections stay in code)
create table if not exists room (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,  -- matches RoomType enum
  name       text not null,
  x          int not null,
  y          int not null
);

-- listings table, linked to room by FK
create table if not exists listing (
  id             uuid primary key default gen_random_uuid(),
  room_id        uuid not null references room(id) on delete cascade,
  static_id      text unique,
  content_type   text not null check (content_type in ('artwork','book','article','music')),
  wall           text not null check (wall in ('north','south','east','west')),
  title          text not null,
  artist_name    text not null,
  artist_id      uuid,
  medium         text,
  description    text,
  size           text,
  price          numeric,
  edition_size   int,
  edition_number int,
  for_sale       boolean not null default false,
  image_url      text,
  sort_order     int not null default 0,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- RLS
alter table room enable row level security;
create policy "public read" on room for select using (true);
create policy "auth write" on room for all using (auth.role() = 'authenticated');

alter table listing enable row level security;
create policy "public read" on listing for select using (true);
create policy "auth write" on listing for all using (auth.role() = 'authenticated');

-- seed rooms
insert into room (slug, name, x, y) values
  ('entrance', 'Entrance Hall', 2, 3),
  ('garden',   'The Garden',    1, 2),
  ('library',  'The Library',   3, 2),
  ('studio',   'The Studio',    1, 1),
  ('archive',  'The Archive',   3, 1),
  ('salon',    'The Salon',     2, 1);

-- seed listings (room_id looked up by slug)
insert into listing (room_id, static_id, content_type, wall, title, artist_name, medium, description, size, price, edition_size, edition_number, for_sale, sort_order)
select r.id, l.static_id, l.content_type, l.wall, l.title, l.artist_name, l.medium, l.description, l.size, l.price, l.edition_size, l.edition_number, l.for_sale, l.sort_order
from (values
  ('entrance', 'en-1', 'artwork', 'north', 'Threshold',              'Hortense Veil', 'Oil on linen',                    'A liminal space between worlds — the first painting visitors encounter.',           '120 × 90 cm',  4200, null, null, true,  0),
  ('entrance', 'en-2', 'article', 'east',  'Manifesto',              'Hortense Veil', null,                               'The founding text of the gallery. On labyrinths, perception, and the gaze.',        null,           null, null, null, false, 1),

  ('garden',   'ga-1', 'artwork', 'north', 'Garden I',               'Hortense Veil', 'Risograph print',                 'First in a series of botanical fever-dreams. 2-color risograph on munken paper.',   '50 × 70 cm',   380,  40,  7,    true,  0),
  ('garden',   'ga-2', 'artwork', 'west',  'Garden II',              'Hortense Veil', 'Risograph print',                 'Companion piece to Garden I. Dense foliage, impossible geometry.',                   '50 × 70 cm',   380,  40,  12,   true,  1),
  ('garden',   'ga-3', 'book',    'east',  'Garden Journal',         'Hortense Veil', 'Artist book, softcover',          '88 pages of field notes, drawings, and pressed specimens. Offset printed.',          null,           28,   null, null, true,  2),

  ('library',  'li-1', 'book',    'north', 'Collected Works Vol. I', 'Hortense Veil', 'Hardcover monograph',             'A survey of the first decade. 240 pages, sewn binding, full-color plates.',         null,           65,   null, null, true,  0),
  ('library',  'li-2', 'book',    'north', 'References',             'Hortense Veil', 'Zine, A5',                        'A curated reading list with annotations. 32 pages, risograph.',                     null,           12,   200, 88,   true,  1),
  ('library',  'li-3', 'article', 'east',  'Reading List',           'Hortense Veil', null,                               'An annotated bibliography — free to read online.',                                  null,           null, null, null, false, 2),

  ('studio',   'st-1', 'artwork', 'north', 'Work in Progress',       'Hortense Veil', 'Acrylic on canvas',               'Not yet for sale. Shown here as a gesture of transparency.',                        '80 × 100 cm',  null, null, null, false, 0),
  ('studio',   'st-2', 'artwork', 'north', 'Sketch Series #4',       'Hortense Veil', 'Ink on paper',                    'One of nine studies made in a single session. Framed.',                             '21 × 29.7 cm', 950,  null, null, true,  1),
  ('studio',   'st-3', 'artwork', 'west',  'Study',                  'Hortense Veil', 'Gouache on cardboard',            'A preparatory painting that became its own thing.',                                 '30 × 40 cm',   620,  null, null, true,  2),
  ('studio',   'st-4', 'article', 'east',  'Process Notes',          'Hortense Veil', null,                               'Raw notes on methodology — what works, what fails, what stays.',                   null,           null, null, null, false, 3),
  ('studio',   'st-5', 'music',   'south', 'Studio Tape Vol. 2',     'Hortense Veil', 'CD',                              'Field recordings and improvised piano from the studio sessions. Digipak.',          null,           16,   null, null, true,  4),

  ('archive',  'ar-1', 'artwork', 'north', 'Early Work #2',          'Hortense Veil', 'Oil pastel on newsprint',         'From the first year of the practice. Fragile and honest.',                         '42 × 59.4 cm', 1800, null, null, true,  0),
  ('archive',  'ar-2', 'book',    'west',  'Archive Vol. I',         'Hortense Veil', 'Catalog, staple-bound',           'Documentation of 2018–2020. 60 pages, black and white.',                           null,           18,   100, 34,   true,  1),
  ('archive',  'ar-3', 'article', 'east',  'Historical Notes',       'Hortense Veil', null,                               'Context for the archive — the years, the places, the influences.',                 null,           null, null, null, false, 2),

  ('salon',    'sa-1', 'artwork', 'north', 'Guest Work I',           'Mara Özdemir',  'Screen print',                    'A guest contribution by Berlin-based Mara Özdemir. 3-color screenprint.',           '40 × 50 cm',   290,  30,  5,    true,  0),
  ('salon',    'sa-2', 'artwork', 'north', 'Guest Work II',          'Léo Tanaka',    'Digital print on archival paper', 'Tokyo-based Léo Tanaka''s contribution to the salon series.',                      '30 × 45 cm',   220,  50,  19,   true,  1),
  ('salon',    'sa-3', 'article', 'east',  'Guest Notes',            'Various',       null,                               'Short texts from invited artists about their process.',                             null,           null, null, null, false, 2),
  ('salon',    'sa-4', 'music',   'west',  'Salon Sessions',         'Éliane Morel',  'Vinyl 12"',                       'Ambient compositions recorded live in the gallery. 180g pressing, includes download code.', null, 32, 150, 44, true, 3)
) as l(room_slug, static_id, content_type, wall, title, artist_name, medium, description, size, price, edition_size, edition_number, for_sale, sort_order)
join room r on r.slug = l.room_slug;
