-- ============================================================
-- ENUMS
-- ============================================================

create type access_level as enum ('visitor', 'explorer', 'initiate', 'guardian');
create type subscription_tier as enum ('visitor', 'explorer', 'initiate', 'guardian');
create type artwork_medium as enum ('drawing', 'painting', 'ceramics');
create type room_direction as enum ('north', 'south', 'east', 'west');
create type order_status as enum ('pending', 'completed', 'refunded');
create type suggestion_status as enum ('pending', 'approved', 'rejected');

-- ============================================================
-- PROFILES
-- ============================================================

create table profile (
  id                uuid primary key references auth.users (id) on delete cascade,
  username          text unique not null,
  first_name        text not null,
  last_name         text not null,
  subscription_tier subscription_tier not null default 'visitor',
  stripe_customer_id text,
  gdpr_consent_at   timestamptz,
  marketing_consent boolean not null default false,
  deleted_at        timestamptz,
  created_at        timestamptz not null default now()
);

-- ============================================================
-- USER ADDRESSES
-- ============================================================

create table user_address (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profile (id) on delete cascade,
  line1       text not null,
  line2       text,
  city        text not null,
  postal_code text not null,
  country     text not null,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- ROOMS
-- ============================================================

create table room (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  name         text not null,
  description  text,
  access_level access_level not null default 'visitor',
  position_x   integer not null default 0,
  position_y   integer not null default 0,
  is_public    boolean not null default false,
  created_at   timestamptz not null default now()
);

create table room_connection (
  room_id          uuid not null references room (id) on delete cascade,
  adjacent_room_id uuid not null references room (id) on delete cascade,
  direction        room_direction not null,
  primary key (room_id, adjacent_room_id)
);

-- ============================================================
-- ARTWORKS
-- ============================================================

create table artwork (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references room (id) on delete set null,
  artist_id   uuid not null references profile (id) on delete restrict,
  title       text not null,
  medium      artwork_medium not null,
  image_url   text not null,
  is_for_sale boolean not null default false,
  price       numeric(10, 2),
  is_unique   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- ENIGMAS
-- ============================================================

create table enigma (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid not null references room (id) on delete cascade,
  question     text not null,
  answer       text not null,
  hint         text,
  access_level access_level not null default 'visitor',
  created_at   timestamptz not null default now()
);

-- ============================================================
-- CHARITABLE ORGANIZATIONS
-- ============================================================

create table charitable_organization (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  url         text,
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- ORDERS & DONATIONS
-- ============================================================

create table "order" (
  id                       uuid primary key default gen_random_uuid(),
  buyer_id                 uuid references profile (id) on delete set null,
  artwork_id               uuid references artwork (id) on delete set null,
  organization_id          uuid references charitable_organization (id) on delete set null,
  amount                   numeric(10, 2) not null,
  stripe_payment_intent_id text not null,
  status                   order_status not null default 'pending',
  anonymized_at            timestamptz,
  created_at               timestamptz not null default now()
);

create table donation (
  id                       uuid primary key default gen_random_uuid(),
  donor_id                 uuid references profile (id) on delete set null,
  organization_id          uuid references charitable_organization (id) on delete set null,
  amount                   numeric(10, 2) not null,
  stripe_payment_intent_id text not null,
  anonymized_at            timestamptz,
  created_at               timestamptz not null default now()
);

-- ============================================================
-- SUGGESTIONS
-- ============================================================

create table organization_suggestion (
  id           uuid primary key default gen_random_uuid(),
  suggested_by uuid references profile (id) on delete set null,
  name         text not null,
  url          text,
  description  text,
  status       suggestion_status not null default 'pending',
  created_at   timestamptz not null default now()
);

create table artwork_suggestion (
  id               uuid primary key default gen_random_uuid(),
  artist_id        uuid not null references profile (id) on delete cascade,
  title            text not null,
  medium           artwork_medium not null,
  description      text,
  image_url        text not null,
  proof_url        text not null,
  artist_statement text not null,
  status           suggestion_status not null default 'pending',
  reviewed_by      uuid references profile (id) on delete set null,
  created_at       timestamptz not null default now()
);

-- ============================================================
-- USER PROGRESSION
-- ============================================================

create table room_visit (
  user_id    uuid not null references profile (id) on delete cascade,
  room_id    uuid not null references room (id) on delete cascade,
  visited_at timestamptz not null default now(),
  primary key (user_id, room_id)
);

create table enigma_completion (
  user_id      uuid not null references profile (id) on delete cascade,
  enigma_id    uuid not null references enigma (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, enigma_id)
);

-- ============================================================
-- GUEST SESSIONS
-- ============================================================

create table guest_session (
  id         uuid primary key default gen_random_uuid(),
  progress   jsonb not null default '{}',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);
