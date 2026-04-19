-- ============================================================
-- LISTING — unified marketplace table for all content types
-- ============================================================

create type content_type as enum ('artwork', 'book', 'article', 'music');

create table listing (
  id             uuid primary key default gen_random_uuid(),
  -- links to the static room slug (e.g. 'entrance', 'garden')
  room_slug      text not null,
  -- links to the static item id in rooms.ts (e.g. 'en-1') for migration period
  static_id      text unique,
  content_type   content_type not null,
  wall           room_direction not null,
  title          text not null,
  artist_name    text not null,
  -- optional link to a profile if the artist has an account
  artist_id      uuid references profile (id) on delete set null,
  medium         text,
  description    text,
  size           text,               -- artworks only, e.g. "40 × 60 cm"
  price          numeric(10, 2),     -- USD, null = not priced
  edition_size   integer,
  edition_number integer,
  for_sale       boolean not null default false,
  image_url      text,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger listing_updated_at
  before update on listing
  for each row execute function set_updated_at();

-- ============================================================
-- RLS
-- ============================================================

alter table listing enable row level security;

-- Public read
create policy "listings are publicly readable"
  on listing for select using (true);

-- Only service role can write (admin via Supabase dashboard or API route)
create policy "service role can manage listings"
  on listing for all using (auth.role() = 'service_role');

-- ============================================================
-- SEED — mirrors src/data/rooms.ts
-- ============================================================

insert into listing (static_id, room_slug, content_type, wall, title, artist_name, medium, description, size, price, edition_size, edition_number, for_sale, sort_order) values

-- Entrance
('en-1', 'entrance', 'artwork', 'north', 'Threshold',   'Hortense Veil', 'Oil on linen',   'A liminal space between worlds — the first painting visitors encounter.', '120 × 90 cm', 4200, null, null, true,  1),
('en-2', 'entrance', 'article', 'east',  'Manifesto',   'Hortense Veil', null,              'The founding text of the gallery. On labyrinths, perception, and the gaze.',  null,         null, null, null, false, 2),

-- Garden
('ga-1', 'garden',   'artwork', 'north', 'Garden I',        'Hortense Veil', 'Risograph print', 'First in a series of botanical fever-dreams. 2-color risograph on munken paper.', '50 × 70 cm', 380,  40, 7,  true,  1),
('ga-2', 'garden',   'artwork', 'west',  'Garden II',       'Hortense Veil', 'Risograph print', 'Companion piece to Garden I. Dense foliage, impossible geometry.',                '50 × 70 cm', 380,  40, 12, true,  2),
('ga-3', 'garden',   'book',    'east',  'Garden Journal',  'Hortense Veil', 'Artist book, softcover', '88 pages of field notes, drawings, and pressed specimens. Offset printed.', null, 28, null, null, true, 3),

-- Library
('li-1', 'library',  'book',    'north', 'Collected Works Vol. I', 'Hortense Veil', 'Hardcover monograph', 'A survey of the first decade. 240 pages, sewn binding, full-color plates.', null, 65, null, null, true,  1),
('li-2', 'library',  'book',    'north', 'References',            'Hortense Veil', 'Zine, A5',            'A curated reading list with annotations. 32 pages, risograph.',              null, 12, 200, 88,  true,  2),
('li-3', 'library',  'article', 'east',  'Reading List',          'Hortense Veil', null,                  'An annotated bibliography — free to read online.',                           null, null, null, null, false, 3),

-- Studio
('st-1', 'studio',   'artwork', 'north', 'Work in Progress', 'Hortense Veil', 'Acrylic on canvas',    'Not yet for sale. Shown here as a gesture of transparency.',   '80 × 100 cm', null, null, null, false, 1),
('st-2', 'studio',   'artwork', 'north', 'Sketch Series #4', 'Hortense Veil', 'Ink on paper',         'One of nine studies made in a single session. Framed.',         '21 × 29.7 cm', 950, null, null, true,  2),
('st-3', 'studio',   'artwork', 'west',  'Study',            'Hortense Veil', 'Gouache on cardboard', 'A preparatory painting that became its own thing.',             '30 × 40 cm',  620, null, null, true,  3),
('st-4', 'studio',   'article', 'east',  'Process Notes',    'Hortense Veil', null,                   'Raw notes on methodology — what works, what fails, what stays.', null,          null, null, null, false, 4),
('st-5', 'studio',   'music',   'south', 'Studio Tape Vol. 2','Hortense Veil','CD',                   'Field recordings and improvised piano from the studio sessions. Digipak.', null, 16, null, null, true, 5),

-- Archive
('ar-1', 'archive',  'artwork', 'north', 'Early Work #2',    'Hortense Veil', 'Oil pastel on newsprint', 'From the first year of the practice. Fragile and honest.',              '42 × 59.4 cm', 1800, null, null, true,  1),
('ar-2', 'archive',  'book',    'west',  'Archive Vol. I',   'Hortense Veil', 'Catalog, staple-bound',   'Documentation of 2018–2020. 60 pages, black and white.',               null,            18,   100, 34,  true,  2),
('ar-3', 'archive',  'article', 'east',  'Historical Notes', 'Hortense Veil', null,                      'Context for the archive — the years, the places, the influences.',      null,            null, null, null, false, 3),

-- Salon
('sa-1', 'salon',    'artwork', 'north', 'Guest Work I',   'Mara Özdemir',  'Screen print',                  'A guest contribution by Berlin-based Mara Özdemir. 3-color screenprint.', '40 × 50 cm', 290, 30,  5,  true,  1),
('sa-2', 'salon',    'artwork', 'north', 'Guest Work II',  'Léo Tanaka',    'Digital print on archival paper','Tokyo-based Léo Tanaka''s contribution to the salon series.',            '30 × 45 cm', 220, 50,  19, true,  2),
('sa-3', 'salon',    'article', 'east',  'Guest Notes',    'Various',       null,                             'Short texts from invited artists about their process.',                    null,         null, null, null, false, 3),
('sa-4', 'salon',    'music',   'west',  'Salon Sessions', 'Éliane Morel',  'Vinyl 12"',                      'Ambient compositions recorded live in the gallery. 180g pressing, includes download code.', null, 32, 150, 44, true, 4);
