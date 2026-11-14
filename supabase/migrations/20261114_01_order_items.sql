-- order_items avait la RLS active sans aucune règle : personne ne pouvait
-- lire ni écrire les lignes de commande. Même règle que recipe_items :
-- on passe par la commande parente pour savoir à quel restaurant elle appartient.
alter table public.order_items enable row level security;

drop policy if exists tenant_all on public.order_items;
create policy tenant_all on public.order_items
  for all to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and (o.restaurant_id = public.my_restaurant_id() or public.is_admin())
  ))
  with check (exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and o.restaurant_id = public.my_restaurant_id()
  ));
