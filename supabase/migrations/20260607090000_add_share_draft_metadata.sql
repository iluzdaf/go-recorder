alter table public.shares
    add column draft_kind text check (draft_kind in ('board', 'variation')),
    add column parent_share_slug text,
    add column base_move_count integer check (base_move_count is null or base_move_count >= 0);
