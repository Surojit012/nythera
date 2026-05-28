create table if not exists public.early_access_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text not null default 'landing',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.early_believers (
  id uuid primary key default gen_random_uuid(),
  quote text not null,
  display_name text not null unique,
  role text not null,
  avatar text not null,
  display_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.early_believers (quote, display_name, role, avatar, display_order, published)
values
  (
    'I lost 3 ETH because I spilled coffee on my seed phrase notebook. Nythera is exactly what the space needed — decentralized recovery that actually makes sense.',
    'Alex M.',
    'DeFi Power User · Berlin',
    'AM',
    1,
    true
  ),
  (
    'I''ve been setting up estate planning for my crypto holdings for years with no good solution. This is the first protocol that handles it at the cryptographic layer, not just trust.',
    'Sarah K.',
    'Web3 Lawyer · Singapore',
    'SK',
    2,
    true
  ),
  (
    'Set this up for our DAO treasury in 20 minutes. Six guardians, 4-of-6 threshold. Feels like the kind of security that should have been standard from day one.',
    '@0xcoordinator',
    'DAO Treasurer · Protocol Labs',
    '0X',
    3,
    true
  )
on conflict (display_name) do update set
  quote = excluded.quote,
  role = excluded.role,
  avatar = excluded.avatar,
  display_order = excluded.display_order,
  published = excluded.published,
  updated_at = now();
