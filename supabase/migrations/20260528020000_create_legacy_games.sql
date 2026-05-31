create table if not exists public.games (
    slug text primary key,
    board_size integer not null check (board_size in (9, 13, 19)),
    game_state jsonb not null,
    black_player_name text,
    white_player_name text,
    handicap integer not null default 0 check (handicap >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table if exists public.games enable row level security;

create index if not exists games_updated_at_idx on public.games (updated_at desc);
