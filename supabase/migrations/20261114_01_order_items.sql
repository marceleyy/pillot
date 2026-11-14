-- order_items avait la RLS active sans aucune règle : personne ne pouvait
-- lire ni écrire les lignes de commande. On passe par la commande parente
-- pour savoir à quel restaurant appartient la ligne, comme pour orders :
-- toute l'équipe du restaurant peut préparer une commande.
-- Le produit lié, s'il y en a un, doit être du même restaurant.
alter table public.order_items enable row level security;

drop policy if exists tenant_all on public.order_items;
create policy tenant_all on public.order_items
  for all to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and (o.restaurant_id = public.my_restaurant_id() or public.is_admin())
  ))
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (o.restaurant_id = public.my_restaurant_id() or public.is_admin())
    )
    and (
      order_items.product_id is null
      or exists (
        select 1 from public.orders o
        join public.products p on p.restaurant_id = o.restaurant_id
        where o.id = order_items.order_id and p.id = order_items.product_id
      )
    )
  );
