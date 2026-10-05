-- =====================================================================
-- Pillot — jeu de données de démonstration
-- Restaurant FICTIF « Le Comptoir des Halles » (bistrot ~45 couverts, Lyon)
-- Ouvert le 5 janvier 2026, données jusqu'à aujourd'hui (current_date).
--
-- AVANT DE LANCER :
--   1. Appliquer les migrations 20261005_00 à 03 (et 04 si utilisée).
--   2. Créer les 2 comptes dans Supabase Auth (Dashboard > Authentication >
--      Add user, e-mail confirmé) :
--        demo@pillot-restaurant.fr          -> gérant (owner)
--        demo-employe@pillot-restaurant.fr  -> employé
--      Le SQL ne peut pas créer proprement un utilisateur Auth (mot de passe,
--      identités) ; la fin de ce script rattache ces comptes s'ils existent.
--   3. Lancer ce fichier dans le SQL Editor (rôle postgres).
--
-- Rejouable : tout ce qui appartient au restaurant de démo est d'abord
-- supprimé puis recréé (les ids principaux sont fixes). Aucune autre donnée
-- n'est touchée.
-- =====================================================================

begin;

-- Pseudo-aléatoire déterministe (0 <= x < 1) : mêmes données à chaque passage
create or replace function pg_temp.rnd(t text) returns numeric
language sql immutable as
$$ select ((('x' || substr(md5(t), 1, 8))::bit(32)::bigint) % 1000000) / 1000000.0 $$;

-- Horodatage local Lyon -> timestamptz
create or replace function pg_temp.lyon(d date, h text) returns timestamptz
language sql immutable as
$$ select (d + h::time) at time zone 'Europe/Paris' $$;

-- ---------------------------------------------------------------------
-- 0. Nettoyage du restaurant de démo (enfants d'abord)
-- ---------------------------------------------------------------------
-- La purge de pointages ne doit pas être recopiée dans le journal (script 04)
select set_config('pillot.purge', 'on', true);

delete from public.scanned_invoice_items where invoice_id in
  (select id from public.scanned_invoices where restaurant_id = 'de300000-0000-4000-8000-000000000001');
delete from public.scanned_invoices   where restaurant_id = 'de300000-0000-4000-8000-000000000001';
delete from public.recipe_items where recipe_id in
  (select id from public.recipes where restaurant_id = 'de300000-0000-4000-8000-000000000001');
delete from public.recipe_items where product_id in
  (select id from public.products where restaurant_id = 'de300000-0000-4000-8000-000000000001');
delete from public.recipes            where restaurant_id = 'de300000-0000-4000-8000-000000000001';
delete from public.order_items where order_id in
  (select id from public.orders where restaurant_id = 'de300000-0000-4000-8000-000000000001');
delete from public.order_items where product_id in
  (select id from public.products where restaurant_id = 'de300000-0000-4000-8000-000000000001');
delete from public.orders             where restaurant_id = 'de300000-0000-4000-8000-000000000001';
delete from public.task_completions   where restaurant_id = 'de300000-0000-4000-8000-000000000001';
delete from public.tasks              where restaurant_id = 'de300000-0000-4000-8000-000000000001';
delete from public.shifts             where restaurant_id = 'de300000-0000-4000-8000-000000000001';
delete from public.shift_types        where restaurant_id = 'de300000-0000-4000-8000-000000000001';
delete from public.pointages          where restaurant_id = 'de300000-0000-4000-8000-000000000001';
delete from public.time_entries       where restaurant_id = 'de300000-0000-4000-8000-000000000001';
delete from public.leave_requests     where restaurant_id = 'de300000-0000-4000-8000-000000000001';
do $$ begin
  if to_regclass('public.pointages_historique') is not null then
    delete from public.pointages_historique where restaurant_id = 'de300000-0000-4000-8000-000000000001';
  end if;
  if to_regclass('public.employees_paie') is not null then
    delete from public.employees_paie where restaurant_id = 'de300000-0000-4000-8000-000000000001';
  end if;
end $$;
delete from public.employees          where restaurant_id = 'de300000-0000-4000-8000-000000000001';
delete from public.stock_entries      where restaurant_id = 'de300000-0000-4000-8000-000000000001';
delete from public.products           where restaurant_id = 'de300000-0000-4000-8000-000000000001';
delete from public.temperature_logs   where restaurant_id = 'de300000-0000-4000-8000-000000000001';
delete from public.cleaning_logs      where restaurant_id = 'de300000-0000-4000-8000-000000000001';
delete from public.nettoyage_plans    where restaurant_id = 'de300000-0000-4000-8000-000000000001';
delete from public.dlc_entries        where restaurant_id = 'de300000-0000-4000-8000-000000000001';
delete from public.reception_controls where restaurant_id = 'de300000-0000-4000-8000-000000000001';
delete from public.oil_changes        where restaurant_id = 'de300000-0000-4000-8000-000000000001';
delete from public.equipements        where restaurant_id = 'de300000-0000-4000-8000-000000000001';
delete from public.ca_history         where restaurant_id = 'de300000-0000-4000-8000-000000000001';
delete from public.ca_imports         where restaurant_id = 'de300000-0000-4000-8000-000000000001';
delete from public.glaces_daily       where restaurant_id = 'de300000-0000-4000-8000-000000000001';
delete from public.glaces_flavors     where restaurant_id = 'de300000-0000-4000-8000-000000000001';
delete from public.pos_sales          where restaurant_id = 'de300000-0000-4000-8000-000000000001';
delete from public.pos_imports        where restaurant_id = 'de300000-0000-4000-8000-000000000001';

select set_config('pillot.purge', 'off', true);

-- ---------------------------------------------------------------------
-- 1. Restaurant (mis à jour s'il existe : des profils peuvent y être liés)
-- ---------------------------------------------------------------------
insert into public.restaurants (id, name, ville, objectif, plan, actif, created_at, ca_mode,
                                adresse, telephone, horaires, modules)
values ('de300000-0000-4000-8000-000000000001', 'Le Comptoir des Halles', 'Lyon', 0.28, 'Pro', true,
        pg_temp.lyon('2026-01-05', '08:00'), 'manual',
        '18 rue des Halles, 69003 Lyon', '04 78 00 12 34',
        '{"lun":{"ouvert":true,"heures":"11:45-14:30"},
          "mar":{"ouvert":true,"heures":"11:45-14:30, 19:00-22:30"},
          "mer":{"ouvert":true,"heures":"11:45-14:30, 19:00-22:30"},
          "jeu":{"ouvert":true,"heures":"11:45-14:30, 19:00-22:30"},
          "ven":{"ouvert":true,"heures":"11:45-14:30, 19:00-23:00"},
          "sam":{"ouvert":true,"heures":"11:45-14:30, 19:00-23:00"},
          "dim":{"ouvert":false,"heures":""}}'::jsonb,
        '{"glaces": false}'::jsonb)
on conflict (id) do update set
  name = excluded.name, ville = excluded.ville, objectif = excluded.objectif, plan = excluded.plan,
  actif = true, created_at = excluded.created_at, ca_mode = excluded.ca_mode,
  adresse = excluded.adresse, telephone = excluded.telephone,
  horaires = excluded.horaires, modules = excluded.modules, last_pos_import_id = null;

-- ---------------------------------------------------------------------
-- 2. Produits (45) — prix d'achat HT par unité de stock
-- ---------------------------------------------------------------------
insert into public.products (id, restaurant_id, nom, categorie, unite, fournisseur, stock_min, prix_achat, cote, actif, created_at)
select ('de300000-0000-4000-8001-' || lpad(n::text, 12, '0'))::uuid,
       'de300000-0000-4000-8000-000000000001', nom, cat, unite, fournisseur, mini, prix, 'SALE', true,
       pg_temp.lyon('2026-01-05', '08:30')
from (values
  ( 1,'Bavette d''aloyau','Viandes','kg','Boucherie Laurent',4,18.50),
  ( 2,'Paleron de bœuf','Viandes','kg','Boucherie Laurent',3,13.90),
  ( 3,'Suprême de volaille','Viandes','kg','Boucherie Laurent',3,11.80),
  ( 4,'Andouillette 5A','Viandes','kg','Boucherie Laurent',2,12.40),
  ( 5,'Poitrine de porc fumée','Viandes','kg','Boucherie Laurent',2,8.90),
  ( 6,'Haché de bœuf 15 %','Viandes','kg','Boucherie Laurent',3,10.50),
  ( 7,'Filet de cabillaud','Poissons','kg','Marée Lyonnaise',2,19.80),
  ( 8,'Pavé de saumon','Poissons','kg','Marée Lyonnaise',2,21.50),
  ( 9,'Filet de truite','Poissons','kg','Marée Lyonnaise',1.5,16.20),
  (10,'Quenelles de brochet','Poissons','pièce','Marée Lyonnaise',20,0.95),
  (11,'Moules de bouchot','Poissons','kg','Marée Lyonnaise',3,4.90),
  (12,'Beurre doux AOP','Crèmerie','kg','METRO',2,9.80),
  (13,'Crème liquide 35 %','Crèmerie','L','METRO',4,4.60),
  (14,'Lait entier','Crèmerie','L','METRO',6,1.05),
  (15,'Œufs plein air','Crèmerie','pièce','METRO',60,0.28),
  (16,'Saint-Marcellin','Crèmerie','pièce','METRO',12,1.85),
  (17,'Comté 18 mois','Crèmerie','kg','METRO',1,21.00),
  (18,'Pommes de terre','Légumes','kg','Primeur du Marché',15,1.10),
  (19,'Oignons jaunes','Légumes','kg','Primeur du Marché',5,1.20),
  (20,'Échalotes','Légumes','kg','Primeur du Marché',2,3.80),
  (21,'Carottes','Légumes','kg','Primeur du Marché',5,1.15),
  (22,'Salade frisée','Légumes','pièce','Primeur du Marché',10,0.95),
  (23,'Tomates','Légumes','kg','Primeur du Marché',4,2.90),
  (24,'Champignons de Paris','Légumes','kg','Primeur du Marché',2,4.20),
  (25,'Ail','Légumes','kg','Primeur du Marché',0.5,6.50),
  (26,'Persil plat','Légumes','botte','Primeur du Marché',5,0.80),
  (27,'Poireaux','Légumes','kg','Primeur du Marché',3,2.10),
  (28,'Farine T55','Épicerie','kg','Transgourmet',5,0.85),
  (29,'Huile de friture','Épicerie','L','Transgourmet',10,2.30),
  (30,'Huile d''olive','Épicerie','L','Transgourmet',2,7.90),
  (31,'Sucre semoule','Épicerie','kg','Transgourmet',3,1.10),
  (32,'Lentilles vertes','Épicerie','kg','Transgourmet',3,3.20),
  (33,'Moutarde de Dijon','Épicerie','kg','Transgourmet',1,4.80),
  (34,'Pain de campagne','Épicerie','pièce','METRO',25,0.55),
  (35,'Côtes-du-Rhône rouge 75 cl','Boissons','bouteille','Transgourmet',24,4.20),
  (36,'Beaujolais-Villages 75 cl','Boissons','bouteille','Transgourmet',24,4.60),
  (37,'Mâcon blanc 75 cl','Boissons','bouteille','Transgourmet',12,5.10),
  (38,'Bière pression fût 30 L','Boissons','fût','Transgourmet',1,95.00),
  (39,'Eau minérale 1 L','Boissons','bouteille','METRO',24,0.42),
  (40,'Café en grains','Boissons','kg','METRO',2,14.50),
  (41,'Chocolat noir 70 %','Desserts','kg','METRO',1,11.20),
  (42,'Pralines roses','Desserts','kg','Transgourmet',0.5,14.00),
  (43,'Pâte feuilletée','Desserts','kg','METRO',2,4.30),
  (44,'Crème glacée vanille 2,5 L','Desserts','pièce','METRO',2,8.90),
  (45,'Fruits rouges surgelés','Desserts','kg','Transgourmet',1,7.80)
) as p(n, nom, cat, unite, fournisseur, mini, prix);

-- ---------------------------------------------------------------------
-- 3. Inventaires hebdomadaires (lundi 8 h) depuis le 5 janvier
--    Dernier inventaire : quelques produits sous le minimum ou en rupture.
-- ---------------------------------------------------------------------
with semaines as (
  select w::date as d from generate_series('2026-01-05'::date, current_date, interval '7 days') w
  where pg_temp.lyon(w::date, '08:00') <= now()
), derniere as (select max(d) as d from semaines)
insert into public.stock_entries (product_id, restaurant_id, stock_reel, created_at)
select p.id, p.restaurant_id,
       case
         when s.d = (select d from derniere) and p.nom in ('Saint-Marcellin', 'Pralines roses') then 0
         when s.d = (select d from derniere) and p.nom in ('Crème liquide 35 %', 'Échalotes', 'Beaujolais-Villages 75 cl', 'Œufs plein air', 'Pavé de saumon')
           then case when p.unite in ('pièce','bouteille','botte','fût') then floor(p.stock_min * 0.6)
                     else round(p.stock_min * 0.6, 1) end
         when p.unite in ('pièce','bouteille','botte','fût')
           then ceil(p.stock_min * (1.15 + 1.6 * pg_temp.rnd(p.id::text || s.d)))
         else round(p.stock_min * (1.15 + 1.6 * pg_temp.rnd(p.id::text || s.d)), 1)
       end,
       pg_temp.lyon(s.d, '08:00') + (p.nom ~ '^[A-L]')::int * interval '6 minutes'
from public.products p cross join semaines s
where p.restaurant_id = 'de300000-0000-4000-8000-000000000001';

-- ---------------------------------------------------------------------
-- 4. Clôtures hebdomadaires (lundi -> dimanche), CA HT avec saisonnalité
--    Tout dans *_sale (total du restaurant), 0 dans *_sucre.
-- ---------------------------------------------------------------------
insert into public.ca_history (restaurant_id, type, periode, semaine, mois, annee,
                               ca_sale, ca_sucre, cout_sale, cout_sucre, ratio_sale, ratio_sucre,
                               date_debut, date_fin, created_at)
select 'de300000-0000-4000-8000-000000000001', 'hebdo',
       'Fin ' || to_char(fin, 'DD/MM'),
       extract(week from fin)::int, extract(month from fin)::int, extract(isoyear from fin)::int,
       ca, 0, round(ca * ratio, 2), 0, round(ratio, 4), 0,
       debut, fin, pg_temp.lyon(fin, '23:00')
from (
  select debut, fin, ratio,
         round(least(16000, greatest(9000,
           12300
           + 2300 * sin(2 * pi() * (extract(doy from debut) - 80) / 365.0)   -- printemps/été plus forts
           - case when extract(month from debut) = 8 then 1800 else 0 end     -- août : Lyon se vide
           + (pg_temp.rnd('ca' || debut) - 0.5) * 1800)), 2) as ca
  from (
    select w::date as debut, (w + interval '6 days')::date as fin,
           0.25 + 0.08 * pg_temp.rnd('ratio' || w::date) as ratio
    from generate_series('2026-01-05'::date, current_date - 7, interval '7 days') w
  ) s
  where fin < current_date
) t;

-- Indicateurs du restaurant = dernière semaine clôturée
update public.restaurants r set
  ca_sale = h.ca_sale, ca_sucre = 0, cout_sale = h.cout_sale, cout_sucre = 0,
  ratio_sale = h.ratio_sale, ratio_sucre = 0
from (select * from public.ca_history where restaurant_id = 'de300000-0000-4000-8000-000000000001'
      order by date_fin desc limit 1) h
where r.id = 'de300000-0000-4000-8000-000000000001';

-- ---------------------------------------------------------------------
-- 5. Fiches techniques (12) — quantités dans l'unité du produit
-- ---------------------------------------------------------------------
insert into public.recipes (id, restaurant_id, nom, prix_vente, actif, created_at)
select ('de300000-0000-4000-8003-' || lpad(n::text, 12, '0'))::uuid,
       'de300000-0000-4000-8000-000000000001', nom, prix, true,
       pg_temp.lyon('2026-01-05', '10:00') + n * interval '1 minute'
from (values
  ( 1,'Salade lyonnaise',14.50), ( 2,'Quenelle de brochet sauce Nantua',18.50),
  ( 3,'Andouillette sauce moutarde, frites',19.00), ( 4,'Bavette à l''échalote, frites',22.00),
  ( 5,'Suprême de volaille, crème de champignons',19.50), ( 6,'Cabillaud au beurre blanc, poireaux',23.00),
  ( 7,'Pavé de saumon, lentilles vertes',22.50), ( 8,'Moules marinières, frites',17.00),
  ( 9,'Burger du Comptoir',18.00), (10,'Saint-Marcellin rôti, salade',9.50),
  (11,'Tarte aux pralines',8.50), (12,'Mousse au chocolat',7.50)
) as r(n, nom, prix);

insert into public.recipe_items (recipe_id, product_id, product_nom, quantite, unite)
select ('de300000-0000-4000-8003-' || lpad(i.r::text, 12, '0'))::uuid,
       p.id, p.nom, i.q, p.unite
from (values
  (1,22,0.5),(1,15,1),(1,5,0.06),(1,34,0.15),(1,33,0.01),
  (2,10,2),(2,13,0.08),(2,12,0.02),(2,18,0.15),
  (3,4,0.25),(3,33,0.02),(3,13,0.05),(3,18,0.3),(3,29,0.05),
  (4,1,0.2),(4,20,0.04),(4,12,0.02),(4,18,0.3),(4,29,0.05),
  (5,3,0.22),(5,24,0.08),(5,13,0.08),(5,18,0.2),
  (6,7,0.18),(6,12,0.04),(6,20,0.02),(6,27,0.15),
  (7,8,0.17),(7,32,0.08),(7,21,0.05),(7,19,0.03),
  (8,11,0.45),(8,20,0.02),(8,13,0.05),(8,26,0.1),(8,18,0.3),(8,29,0.05),
  (9,6,0.18),(9,17,0.03),(9,23,0.05),(9,22,0.1),(9,19,0.03),(9,18,0.3),(9,29,0.05),
  (10,16,1),(10,22,0.25),(10,34,0.1),
  (11,42,0.05),(11,13,0.05),(11,43,0.08),(11,12,0.01),
  (12,41,0.05),(12,15,1.5),(12,31,0.01),(12,13,0.03)
) as i(r, prod, q)
join public.products p on p.id = ('de300000-0000-4000-8001-' || lpad(i.prod::text, 12, '0'))::uuid;

-- ---------------------------------------------------------------------
-- 6. Équipe : 8 employés, types de service, planning, pointages
--    (salaire_horaire : si la migration 04 est passée, son trigger le
--     déplace dans employees_paie, comme pour une saisie dans l'appli)
-- ---------------------------------------------------------------------
insert into public.employees (id, restaurant_id, nom, prenom, heures_contrat, salaire_horaire, couleur, actif, created_at)
select ('de300000-0000-4000-8002-' || lpad(n::text, 12, '0'))::uuid,
       'de300000-0000-4000-8000-000000000001', nom, prenom, h, taux, couleur, true,
       pg_temp.lyon('2026-01-05', '09:00')
from (values
  (1,'Roux','Camille',39,16.50,'#DC2626'),   -- cheffe de cuisine
  (2,'Martin','Hugo',35,14.20,'#EA580C'),    -- second
  (3,'Garcia','Inès',35,12.40,'#D97706'),    -- commis
  (4,'Petit','Tom',24,12.10,'#65A30D'),      -- plonge
  (5,'Durand','Léa',35,13.10,'#2563EB'),     -- cheffe de rang (compte employé démo)
  (6,'Moreau','Julien',35,12.30,'#7C3AED'),  -- serveur
  (7,'Benali','Sarah',20,12.10,'#DB2777'),   -- serveuse (étudiante)
  (8,'Bernard','Yanis',30,12.60,'#0891B2')   -- barman
) as e(n, nom, prenom, h, taux, couleur);

insert into public.shift_types (id, restaurant_id, nom, abrev, heure_debut, heure_fin, couleur, duree_minutes)
values
  ('de300000-0000-4000-8006-000000000001','de300000-0000-4000-8000-000000000001','Midi','M','09:30','14:45','#F59E0B',315),
  ('de300000-0000-4000-8006-000000000002','de300000-0000-4000-8000-000000000001','Soir','S','18:00','23:00','#6366F1',300),
  ('de300000-0000-4000-8006-000000000003','de300000-0000-4000-8000-000000000001','Bar','B','17:00','23:30','#0891B2',390),
  ('de300000-0000-4000-8006-000000000004','de300000-0000-4000-8000-000000000001','Plonge','P','19:00','23:30','#65A30D',270);

-- Semaine type : code par jour (lun..dim) ; M = midi, S = soir, B = bar, P = plonge, - = repos
-- 3 semaines passées + semaine en cours (publiées) + semaine suivante (brouillon)
with modele(emp, j) as (values
  (1, array['M','MS','MS','M','MS','MS','']),
  (2, array['M','M','S','MS','MS','S','']),
  (3, array['-','MS','M','S','M','MS','']),
  (4, array['-','P','-','P','P','MP','']),
  (5, array['M','MS','MS','-','MS','S','']),
  (6, array['M','-','S','MS','MS','MS','']),
  (7, array['-','-','-','S','S','MS','']),
  (8, array['-','B','B','B','B','B',''])
), jours as (
  select d::date as d, extract(isodow from d)::int as dow
  from generate_series(date_trunc('week', current_date) - interval '21 days',
                       date_trunc('week', current_date) + interval '13 days', interval '1 day') d
), cases as (
  select m.emp, j.d, m.j[j.dow] as code from modele m cross join jours j
)
insert into public.shifts (restaurant_id, employee_id, date, heure_debut, heure_fin, type_nom, couleur, repos, published)
select 'de300000-0000-4000-8000-000000000001',
       ('de300000-0000-4000-8002-' || lpad(c.emp::text, 12, '0'))::uuid, c.d,
       coalesce(t.heure_debut, '00:00'), coalesce(t.heure_fin, '00:00'),
       coalesce(t.nom, 'Repos'), coalesce(t.couleur, '#E2E8F0'), t.id is null,
       c.d < date_trunc('week', current_date)::date + 7
from cases c
cross join lateral (select unnest(case when c.code = '-' then array['-'] else regexp_split_to_array(c.code, '') end) as l) x
left join public.shift_types t on t.restaurant_id = 'de300000-0000-4000-8000-000000000001' and t.abrev = x.l
where c.code <> '';

-- Pointages correspondant aux services passés (et en cours aujourd'hui)
insert into public.pointages (restaurant_id, employee_id, debut, fin, note)
select s.restaurant_id, s.employee_id, debut,
       case when fin_prevue <= now() then fin_prevue else null end,
       case when pg_temp.rnd('oubli' || s.id) < 0.02 and fin_prevue <= now() then 'Oubli de départ corrigé' end
from (
  select s.*,
         pg_temp.lyon(s.date, s.heure_debut) + ((pg_temp.rnd('a' || s.employee_id || s.date || s.heure_debut) * 12 - 6)::int) * interval '1 minute' as debut,
         pg_temp.lyon(s.date, s.heure_fin) + ((pg_temp.rnd('d' || s.employee_id || s.date || s.heure_debut) * 25)::int) * interval '1 minute' as fin_prevue
  from public.shifts s
  where s.restaurant_id = 'de300000-0000-4000-8000-000000000001' and not s.repos
) s
where s.debut <= now();

-- ---------------------------------------------------------------------
-- 7. Tâches et réalisations
-- ---------------------------------------------------------------------
insert into public.tasks (id, restaurant_id, nom, description, categorie, frequence, jours_semaine, heure_limite, priorite, actif, created_at)
select ('de300000-0000-4000-8005-' || lpad(n::text, 12, '0'))::uuid,
       'de300000-0000-4000-8000-000000000001', nom, descr, cat, freq, jours, h, prio, true,
       pg_temp.lyon('2026-01-05', '09:00')
from (values
  ( 1,'Mise en place froide','Légumes taillés, sauces, garnitures','ouverture','daily','{1,2,3,4,5,6}'::int[],'11:30','haute'),
  ( 2,'Relevé des températures du matin','Frigos, chambre froide, congélateur, vitrine','haccp','daily','{1,2,3,4,5,6}'::int[],'10:00','haute'),
  ( 3,'Contrôle des DLC','Retirer les produits périmés, étiqueter les entamés','haccp','daily','{1,2,3,4,5,6}'::int[],'11:00','normale'),
  ( 4,'Mise en place de la salle','Couverts, ardoise du jour, carafes','ouverture','daily','{1,2,3,4,5,6}'::int[],'11:40','normale'),
  ( 5,'Fermeture cuisine','Filmer, étiqueter, couper les feux','fermeture','daily','{1,2,3,4,5,6}'::int[],'23:15','haute'),
  ( 6,'Caisse et fermeture salle','Clôture caisse, chaises, alarme','fermeture','daily','{1,2,3,4,5,6}'::int[],'23:30','normale'),
  ( 7,'Nettoyage des sols','Cuisine et plonge','nettoyage','daily','{1,2,3,4,5,6}'::int[],'23:30','normale'),
  ( 8,'Inventaire hebdomadaire','Compter le stock dans Pillot','stock','weekly','{1}'::int[],'10:00','haute'),
  ( 9,'Dégivrage du congélateur','Une fois par mois, le premier lundi','nettoyage','weekly','{1}'::int[],'15:00','basse'),
  (10,'Commande vins et boissons','Préparer la commande Transgourmet','stock','weekly','{3}'::int[],'15:00','normale'),
  (11,'Point équipe du vendredi','Plats du jour et réservations du week-end','general','weekly','{5}'::int[],'11:00','basse')
) as t(n, nom, descr, cat, freq, jours, h, prio);

insert into public.task_completions (task_id, restaurant_id, date, completed_at)
select t.id, t.restaurant_id, d.d::date, pg_temp.lyon(d.d::date, t.heure_limite) - interval '20 minutes'
from public.tasks t
cross join generate_series('2026-01-05'::date, current_date, interval '1 day') d
where t.restaurant_id = 'de300000-0000-4000-8000-000000000001'
  and extract(isodow from d.d)::int = any (t.jours_semaine)
  and pg_temp.lyon(d.d::date, t.heure_limite) - interval '20 minutes' <= now()
  and pg_temp.rnd(t.id::text || d.d::date) < case when d.d::date = current_date then 1 else 0.93 end;

-- ---------------------------------------------------------------------
-- 8. HACCP : équipements, températures, nettoyage, DLC, réceptions, huile
-- ---------------------------------------------------------------------
insert into public.equipements (id, restaurant_id, nom, type, marque, modele, localisation, temp_min, temp_max, actif, ordre, created_at)
select ('de300000-0000-4000-8004-' || lpad(n::text, 12, '0'))::uuid,
       'de300000-0000-4000-8000-000000000001', nom, type, marque, modele, loc, tmin, tmax, true, n - 1,
       pg_temp.lyon('2026-01-05', '08:15')
from (values
  (1,'Frigo cuisine','frigo','Liebherr','GKPv 6570','Cuisine',0,4),
  (2,'Frigo bar','frigo','Liebherr','FKUv 1610','Bar',0,4),
  (3,'Chambre froide','frigo','Dagard','CF 6 m³','Réserve',0,3),
  (4,'Congélateur','congelateur','Liebherr','GGv 5060','Réserve',-22,-18),
  (5,'Vitrine desserts','vitrine','Bartscher','Deli Cool','Salle',0,6),
  (6,'Friteuse','friteuse','Valentine','EVO 2200','Cuisine',160,190)
) as e(n, nom, type, marque, modele, loc, tmin, tmax);

-- Relevés matin et soir depuis l'ouverture (hors dimanche), rares écarts avec action corrective
insert into public.temperature_logs (restaurant_id, equipement, temperature, temperature_min, temperature_max, created_at, action_corrective)
select e.restaurant_id, e.nom,
       case when hors then e.temp_max + 1.5 + round(2.5 * r2, 1)
            else round(e.temp_min + (e.temp_max - e.temp_min) * (0.2 + 0.6 * r2), 1) end,
       e.temp_min, e.temp_max, ts,
       case when hors then case e.type
         when 'congelateur' then 'Porte restée entrouverte : refermée, produits contrôlés (cœur < -18 °C), nouveau relevé conforme 1 h après'
         when 'friteuse'    then 'Thermostat baissé, huile laissée refroidir avant reprise du service'
         else 'Produits transférés en chambre froide, joint de porte nettoyé, nouveau relevé conforme 30 min après' end end
from public.equipements e
cross join generate_series('2026-01-05'::date, current_date, interval '1 day') d
cross join (values ('08:50'), ('18:20')) h(heure)
cross join lateral (select pg_temp.rnd(e.id::text || d.d::date || h.heure) < 0.012 as hors,
                           pg_temp.rnd('t' || e.id::text || d.d::date || h.heure) as r2,
                           pg_temp.lyon(d.d::date, h.heure) + ((pg_temp.rnd('m' || e.id::text || d.d::date || h.heure) * 20)::int) * interval '1 minute' as ts) x
where e.restaurant_id = 'de300000-0000-4000-8000-000000000001'
  and extract(isodow from d.d) <> 7
  and x.ts <= now();

insert into public.nettoyage_plans (restaurant_id, taches, updated_at)
values ('de300000-0000-4000-8000-000000000001',
        '{"quotidien":["Plans de travail","Sol cuisine","Frigos (extérieur)","Plonge & robinetterie","Poubelles","Lave-mains","Hotte (filtres extérieurs)"],
          "hebdo":["Hottes et filtres","Intérieur frigos","Chambre froide","Congélateur","Four & appareils cuisson","Derrière les appareils"]}'::jsonb,
        pg_temp.lyon('2026-01-05', '09:00'))
on conflict (restaurant_id) do update set taches = excluded.taches, updated_at = excluded.updated_at;

insert into public.cleaning_logs (restaurant_id, tache, fait, created_at)
select 'de300000-0000-4000-8000-000000000001', t.tache, true, ts
from public.nettoyage_plans np
cross join lateral (
  select jsonb_array_elements_text(np.taches -> 'quotidien') as tache, false as hebdo
  union all select jsonb_array_elements_text(np.taches -> 'hebdo'), true
) t
cross join generate_series('2026-01-05'::date, current_date, interval '1 day') d
cross join lateral (select pg_temp.lyon(d.d::date, case when t.hebdo then '15:30' else '23:10' end)
                           + ((pg_temp.rnd('c' || t.tache || d.d::date) * 25)::int) * interval '1 minute' as ts) x
where np.restaurant_id = 'de300000-0000-4000-8000-000000000001'
  and extract(isodow from d.d) <> 7
  and (not t.hebdo or extract(isodow from d.d) = 1)
  and pg_temp.rnd(t.tache || d.d::date) < 0.96
  and x.ts <= now();

-- DLC : historique consommé/jeté + entrées actives dont quelques-unes proches de l'échéance
insert into public.dlc_entries (restaurant_id, product_nom, dlc_date, lot, fournisseur, quantite, unite, statut, created_at)
select 'de300000-0000-4000-8000-000000000001', p.nom, d.d::date + 4,
       'L' || to_char(d.d, 'YYDDD') || (k % 10), p.fournisseur, 1 + (k % 3), p.unite,
       case when pg_temp.rnd('dlc' || p.id || d.d) < 0.08 then 'jete' else 'consomme' end,
       pg_temp.lyon(d.d::date, '10:15')
from generate_series('2026-01-06'::date, current_date - 10, interval '2 days') with ordinality d(d, k)
join public.products p on p.restaurant_id = 'de300000-0000-4000-8000-000000000001'
 and p.id = ('de300000-0000-4000-8001-' || lpad((array[7,8,9,10,11,13,16,5,4,6])[1 + (k % 10)]::text, 12, '0'))::uuid;

insert into public.dlc_entries (restaurant_id, product_nom, dlc_date, lot, fournisseur, quantite, unite, statut, created_at)
select 'de300000-0000-4000-8000-000000000001', nom, current_date + j, lot, f, q, u, 'actif', now() - interval '2 days'
from (values
  ('Crème liquide 35 % (entamée)', 1, 'L26-2741', 'METRO', 2, 'L'),
  ('Saumon gravlax maison', 1, 'MAISON-41', null, 1.2, 'kg'),
  ('Quenelles de brochet', 2, 'ML-77812', 'Marée Lyonnaise', 18, 'pièce'),
  ('Haché de bœuf 15 %', 2, 'BL-3307', 'Boucherie Laurent', 2.5, 'kg'),
  ('Sauce Nantua maison', 3, 'MAISON-42', null, 1.5, 'L'),
  ('Lait entier', 5, 'L26-2690', 'METRO', 6, 'L'),
  ('Saint-Marcellin', 7, 'SM-0925', 'METRO', 6, 'pièce'),
  ('Fromage râpé (comté)', 10, 'L26-2617', 'METRO', 1, 'kg')
) as v(nom, j, lot, f, q, u);

-- Contrôles à réception : chaque fournisseur principal, une fois par semaine
insert into public.reception_controls (restaurant_id, fournisseur, date_reception, numero_bl, temperature_ok, emballage_ok, quantites_ok, statut, note, created_at)
select 'de300000-0000-4000-8000-000000000001', f.nom, dr,
       f.prefixe || '-' || to_char(dr, 'YYMMDD'),
       not (ko and f.typ = 't'), not (ko and f.typ = 'e'), not (ko and f.typ = 'q'),
       case when ko then 'non_conforme' else 'conforme' end,
       case when ko then case f.typ
         when 't' then 'Température à cœur 6,8 °C à réception : lot refusé, avoir demandé'
         when 'e' then 'Carton écrasé, sachet percé : produit refusé'
         else 'Livraison incomplète : 2 colis manquants, relance faite' end end,
       pg_temp.lyon(dr, '08:40')
from (values
  ('Boucherie Laurent', 'BL', 1, 't'), ('Marée Lyonnaise', 'ML', 4, 't'),
  ('Primeur du Marché', 'PM', 2, 'q'), ('METRO', 'MET', 0, 'e'), ('Transgourmet', 'TG', 2, 'q')
) as f(nom, prefixe, decal, typ)
cross join generate_series('2026-01-06'::date, current_date, interval '7 days') w
cross join lateral (select (w::date + f.decal) as dr,
                           pg_temp.rnd('rec' || f.nom || w::date) < 0.04 as ko) x
where pg_temp.lyon(x.dr, '08:40') <= now();

-- Huile de friture : changement toutes les ~2 semaines
insert into public.oil_changes (restaurant_id, equipement, date_changement, prochain_changement, tpo, statut, note, created_at)
select 'de300000-0000-4000-8000-000000000001', 'Friteuse', dc, dc + 14, tpo,
       case when tpo > 25 then 'critique' when tpo > 20 then 'alerte' else 'ok' end,
       case when tpo > 20 then 'TPO élevé au changement : filtrer l''huile chaque soir' end,
       pg_temp.lyon(dc, '15:00')
from generate_series('2026-01-10'::date, current_date, interval '14 days') w
cross join lateral (select (w::date + (pg_temp.rnd('oil' || w::date) * 3)::int) as dc,
                           round(17 + 6 * pg_temp.rnd('tpo' || w::date), 1) as tpo) x
where x.dc <= current_date;

-- ---------------------------------------------------------------------
-- 9. Factures scannées des 6 dernières semaines (+ lignes)
-- ---------------------------------------------------------------------
insert into public.scanned_invoices (id, restaurant_id, fournisseur, numero_bl, date_facture, total_ht, statut, source, created_at)
select md5('demo-facture' || f.nom || df)::uuid, 'de300000-0000-4000-8000-000000000001',
       f.nom, f.prefixe || '-' || to_char(df, 'YYMMDD'), df, 0, 'validated', 'scan', pg_temp.lyon(df, '14:30')
from (values ('Boucherie Laurent','BL',1), ('Marée Lyonnaise','ML',4), ('Primeur du Marché','PM',2),
             ('METRO','MET',0), ('Transgourmet','TG',2)) as f(nom, prefixe, decal)
cross join generate_series(date_trunc('week', current_date)::date - 42, current_date, interval '7 days') w
cross join lateral (select w::date + f.decal as df) x
where x.df <= current_date;

insert into public.scanned_invoice_items (invoice_id, product_nom, quantite, unite, prix_unitaire, total_ht, matched_product_id, prix_precedent, variation_pct)
select i.id, upper(p.nom), q, p.unite, pu, round(q * pu, 2), p.id, p.prix_achat,
       round((pu - p.prix_achat) / p.prix_achat * 100, 1)
from public.scanned_invoices i
join public.products p on p.restaurant_id = i.restaurant_id and p.fournisseur = i.fournisseur
cross join lateral (
  select case when p.unite in ('pièce','bouteille','botte','fût') then ceil(p.stock_min * (0.5 + pg_temp.rnd('q' || i.id || p.id)))
              else round(p.stock_min * (0.5 + pg_temp.rnd('q' || i.id || p.id)), 1) end as q,
         round(p.prix_achat * (0.97 + 0.08 * pg_temp.rnd('pu' || i.id || p.id)), 2) as pu
) x
where i.restaurant_id = 'de300000-0000-4000-8000-000000000001'
  and pg_temp.rnd('ligne' || i.id || p.id) < 0.6;

update public.scanned_invoices i
set total_ht = coalesce((select round(sum(total_ht), 2) from public.scanned_invoice_items it where it.invoice_id = i.id), 0)
where i.restaurant_id = 'de300000-0000-4000-8000-000000000001';

-- ---------------------------------------------------------------------
-- 10. Comptes de démonstration (s'ils existent déjà dans Supabase Auth)
-- ---------------------------------------------------------------------
insert into public.profiles (id, restaurant_id, role, name, email)
select u.id, 'de300000-0000-4000-8000-000000000001', 'owner', 'Gérant démo', u.email
from auth.users u where lower(u.email) = 'demo@pillot-restaurant.fr'
on conflict (id) do update set restaurant_id = excluded.restaurant_id, role = excluded.role, name = excluded.name;

insert into public.profiles (id, restaurant_id, role, name, email)
select u.id, 'de300000-0000-4000-8000-000000000001', 'employee', 'Léa Durand', u.email
from auth.users u where lower(u.email) = 'demo-employe@pillot-restaurant.fr'
on conflict (id) do update set restaurant_id = excluded.restaurant_id, role = excluded.role, name = excluded.name;

update public.employees e set profile_id = p.id
from public.profiles p
where e.id = 'de300000-0000-4000-8002-000000000005'
  and lower(p.email) = 'demo-employe@pillot-restaurant.fr';

-- Saisies attribuées aux comptes démo quand ils existent
update public.task_completions tc set completed_by = (
  select id from public.profiles where lower(email) = case when t.categorie in ('fermeture','stock') then 'demo@pillot-restaurant.fr' else 'demo-employe@pillot-restaurant.fr' end)
from public.tasks t
where t.id = tc.task_id and tc.restaurant_id = 'de300000-0000-4000-8000-000000000001';

update public.temperature_logs set saisi_par = (select id from public.profiles where lower(email) = 'demo-employe@pillot-restaurant.fr')
where restaurant_id = 'de300000-0000-4000-8000-000000000001';

commit;
