// Code commun aux Edge Functions Pillot : CORS, réponses JSON, vérification de l'appelant.
import { createClient } from "npm:@supabase/supabase-js@2";

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export const fail = (status: number, error: string) => json({ ok: false, error }, status);

export function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Variable d'environnement manquante : ${name}`);
  return v;
}

export const MANAGER_ROLES = new Set(["owner", "manager", "admin"]);

export type Caller = { id: string; email: string | null; role: string; restaurant_id: string | null };

// Vérifie le JWT reçu et charge le profil de l'appelant.
// Renvoie soit l'appelant, soit une Response d'erreur (401/403) à renvoyer telle quelle.
export async function getCaller(req: Request): Promise<Caller | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return fail(401, "Non authentifié");

  const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: { user }, error } = await supabase.auth.getUser(authHeader.slice(7));
  if (error || !user) return fail(401, "Session invalide ou expirée");

  const { data: profile, error: pErr } = await supabase
    .from("profiles").select("role, restaurant_id").eq("id", user.id).single();
  if (pErr || !profile) return fail(403, "Profil introuvable");
  if (!MANAGER_ROLES.has(profile.role)) return fail(403, "Accès réservé au gérant ou au manager");

  return { id: user.id, email: user.email ?? null, role: profile.role, restaurant_id: profile.restaurant_id ?? null };
}
