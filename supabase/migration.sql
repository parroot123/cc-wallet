-- Portefeuille — Cartes: cloud sync schema
--
-- Zero-knowledge design: this table NEVER stores a plaintext card number,
-- CVV, or expiry date. It only stores:
--   - salt / verifier: needed to re-derive the AES-256 key from the vault
--     passphrase on another device (harmless without the passphrase)
--   - blob: the AES-GCM ciphertext of the whole card list
-- The encryption key is derived client-side (PBKDF2 → AES-GCM) from a vault
-- passphrase that is NEVER sent to Supabase. Anyone with full database
-- access (including a compromised anon/service key or a Supabase outage)
-- sees only ciphertext, never card data.
--
-- Run this once in the Supabase SQL editor for your project
-- (Project → SQL Editor → New query → paste → Run).

create table if not exists public.vaults (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  salt        jsonb not null,
  verifier    jsonb not null,
  blob        jsonb not null,
  updated_at  timestamptz not null default now()
);

alter table public.vaults enable row level security;

drop policy if exists "select own vault" on public.vaults;
create policy "select own vault"
  on public.vaults for select
  using (auth.uid() = user_id);

drop policy if exists "insert own vault" on public.vaults;
create policy "insert own vault"
  on public.vaults for insert
  with check (auth.uid() = user_id);

drop policy if exists "update own vault" on public.vaults;
create policy "update own vault"
  on public.vaults for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "delete own vault" on public.vaults;
create policy "delete own vault"
  on public.vaults for delete
  using (auth.uid() = user_id);

-- Keep updated_at fresh on every write.
create or replace function public.set_vaults_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists vaults_set_updated_at on public.vaults;
create trigger vaults_set_updated_at
  before update on public.vaults
  for each row
  execute function public.set_vaults_updated_at();
