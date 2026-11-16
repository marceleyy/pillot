import { supabase } from "./supabase";

// Colonnes lisibles par toute l'équipe. Les prix d'achat, le CA et les coûts
// sont réservés au gérant (migration 20261117_00_lancement) et lus à part.
export const COLS_PRODUIT = "id,restaurant_id,nom,categorie,unite,fournisseur,stock_min,cote,actif,created_at";
export const COLS_COMMERCE = "id,name,ville,objectif,plan,actif,created_at,ca_mode,adresse,telephone,horaires,modules,parametres";

// Prix d'achat par produit (gérant). Vide pour l'équipe ou si la base n'est pas à jour.
export async function lirePrix(restaurantId) {
  let { data, error } = await supabase.rpc("prix_produits");
  // Base pas encore à jour : les prix sont encore lisibles dans la table.
  if (error?.code === "PGRST202") ({ data, error } = await supabase.from("products").select("id,prix_achat").eq("restaurant_id", restaurantId));
  if (error) return {};
  return Object.fromEntries((data || []).map(r => [r.id, r.prix_achat]));
}

// CA, coûts et ratios du commerce ouvert (gérant), ou {} sinon.
export async function lireChiffres(restaurantId) {
  let { data, error } = await supabase.rpc("chiffres_commerce");
  if (error?.code === "PGRST202" && restaurantId)
    ({ data, error } = await supabase.from("restaurants").select("ca_sale,ca_sucre,cout_sale,cout_sucre,ratio_sale,ratio_sucre").eq("id", restaurantId).maybeSingle());
  return error || !data ? {} : data;
}
