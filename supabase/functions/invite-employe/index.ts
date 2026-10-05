// Edge Function invite-employe : invite un membre d'équipe par e-mail et le rattache
// au restaurant de l'appelant (gérant, manager ou admin).
//
// POST { email, role, redirect_to? }  ->  { ok: true, user_id } | { ok: false, error }
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, env, fail, getCaller, json } from "../_shared/common.ts";

const INVITABLE = new Set(["employee", "manager"]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail(405, "Méthode non autorisée");

  try {
    const caller = await getCaller(req);
    if (caller instanceof Response) return caller;
    if (!caller.restaurant_id) return fail(400, "Votre compte n'est rattaché à aucun restaurant");

    let body: { email?: unknown; role?: unknown; redirect_to?: unknown };
    try { body = await req.json(); } catch { return fail(400, "Corps JSON invalide"); }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const role = typeof body.role === "string" ? body.role : "employee";
    if (!EMAIL_RE.test(email) || email.length > 254) return fail(400, "Adresse e-mail invalide");
    if (!INVITABLE.has(role)) return fail(400, "Rôle invalide (employee ou manager)");
    if (caller.role === "manager" && role !== "employee") return fail(403, "Un manager ne peut inviter que des employés");
    if (caller.email && email === caller.email.toLowerCase()) return fail(400, "Vous ne pouvez pas vous inviter vous-même");

    let redirectTo: string | undefined;
    if (typeof body.redirect_to === "string" && body.redirect_to) {
      try {
        const u = new URL(body.redirect_to);
        if (u.protocol === "https:" || u.hostname === "localhost") redirectTo = u.toString();
      } catch { /* URL ignorée : Supabase utilisera la Site URL */ }
    }

    const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Profil déjà existant pour cet e-mail ? (on ne rattache jamais un compte existant en silence)
    const { data: existing, error: exErr } = await admin
      .from("profiles").select("id, restaurant_id").ilike("email", email.replace(/[\\%_]/g, "\\$&")).limit(1).maybeSingle();
    if (exErr) { console.error(exErr); return fail(500, "Erreur de lecture des profils"); }
    if (existing?.restaurant_id && existing.restaurant_id !== caller.restaurant_id) {
      return fail(409, "Cette adresse est déjà utilisée par un autre restaurant");
    }
    if (existing?.restaurant_id === caller.restaurant_id) {
      return fail(409, "Cette personne fait déjà partie de l'équipe");
    }
    if (existing) return fail(409, "Un compte existe déjà avec cette adresse : contactez le support pour le rattacher");

    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, redirectTo ? { redirectTo } : undefined);
    if (error || !data?.user) {
      console.error("inviteUserByEmail", error);
      if (error?.status === 422 || error?.code === "email_exists") {
        return fail(409, "Un compte existe déjà avec cette adresse : contactez le support pour le rattacher");
      }
      if (error?.status === 429) return fail(429, "Trop d'invitations envoyées, réessayez plus tard");
      return fail(502, "L'invitation n'a pas pu être envoyée");
    }
    const userId = data.user.id;

    const { error: upErr } = await admin.from("profiles").upsert(
      { id: userId, email, role, restaurant_id: caller.restaurant_id },
      { onConflict: "id" },
    );
    if (upErr) {
      console.error("profiles upsert", upErr);
      // Annule l'invitation fraîchement créée pour ne pas laisser un compte sans profil
      await admin.auth.admin.deleteUser(userId).catch(() => {});
      return fail(500, "Le profil n'a pas pu être créé");
    }

    return json({ ok: true, user_id: userId });
  } catch (e) {
    console.error(e);
    return fail(500, "Erreur interne");
  }
});
