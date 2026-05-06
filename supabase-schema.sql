-- Run this in the Supabase SQL editor: https://supabase.com → project → SQL Editor

-- Addresses table (replaces data/addresses.json)
create table if not exists addresses (
  id          text primary key default gen_random_uuid()::text,
  user_id     text not null,
  name        text not null,
  company     text,
  phone       text,
  email       text,
  street      text not null,
  street2     text,
  city        text not null,
  state       text,
  zip         text,
  country     text default 'US',
  residential boolean default false,
  is_default  boolean default false,
  tags        text[],
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists addresses_user_id on addresses(user_id);
create index if not exists addresses_name on addresses(user_id, name);

-- Shipments table (replaces data/shipments.json)
create table if not exists shipments (
  id           text primary key,
  user_id      text not null,
  tracking     text,
  recipient    text,
  to_city      text,
  service      text,
  service_name text,
  cost         numeric,
  env          text default 'sandbox',
  label_b64    text,
  created_at   timestamptz default now()
);
create index if not exists shipments_user_id on shipments(user_id);
create index if not exists shipments_created on shipments(user_id, created_at desc);

-- User profiles table (extends Clerk user data)
create table if not exists user_profiles (
  user_id    text primary key,
  initials   text,
  company    text,
  updated_at timestamptz default now()
);
