alter table public.vault_records
  add column if not exists access_condition_version text,
  add column if not exists access_condition_address text,
  add column if not exists read_condition_data text,
  add column if not exists write_condition_data text,
  add column if not exists access_aux_data text;
