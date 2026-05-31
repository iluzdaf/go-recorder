create table public.shares (
    slug text primary key,
    source_kind text not null check (source_kind in ('game', 'draft')),
    board_size integer not null check (board_size in (9, 13, 19)),
    game_state jsonb not null,
    black_player_name text,
    white_player_name text,
    handicap integer not null default 0 check (handicap >= 0),
    created_at timestamptz not null default now()
);

alter table public.shares enable row level security;

create policy "Shares are publicly readable"
    on public.shares
    for select
    using (true);

create index shares_created_at_idx on public.shares (created_at desc);
