// Edge Function scan-facture : lit une facture / un bon de livraison (image ou PDF) avec Claude
// et renvoie un JSON structuré. La clé ANTHROPIC_API_KEY reste côté serveur (secret Supabase).
//
// POST { image_base64, media_type }  ->  { ok: true, facture } | { ok: false, error }
import Anthropic from "npm:@anthropic-ai/sdk@^0.131.0";
import { corsHeaders, env, fail, getCaller, json } from "../_shared/common.ts";

const MAX_BASE64 = 8 * 1024 * 1024; // ~8 Mo de base64 (≈ 6 Mo de fichier)
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const PDF_TYPE = "application/pdf";

const nullable = (type: string) => ({ anyOf: [{ type }, { type: "null" }] });

const FACTURE_SCHEMA = {
  type: "object",
  properties: {
    fournisseur: nullable("string"),
    date: { ...nullable("string"), description: "Date de la facture au format YYYY-MM-DD" },
    numero: { ...nullable("string"), description: "Numéro de facture ou de bon de livraison" },
    total_ht: nullable("number"),
    lignes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          designation: { type: "string" },
          quantite: nullable("number"),
          unite: { ...nullable("string"), description: "kg, l, pièce, carton, colis..." },
          prix_unitaire_ht: nullable("number"),
          total_ht: nullable("number"),
        },
        required: ["designation", "quantite", "unite", "prix_unitaire_ht", "total_ht"],
        additionalProperties: false,
      },
    },
  },
  required: ["fournisseur", "date", "numero", "total_ht", "lignes"],
  additionalProperties: false,
};

const PROMPT = `Tu assistes un restaurant. Extrais les informations de cette facture ou de ce bon de livraison fournisseur.
- fournisseur : nom de l'entreprise qui vend (pas le restaurant client).
- date : date de la facture au format YYYY-MM-DD.
- numero : numéro de facture ou de BL tel qu'imprimé.
- total_ht : total hors taxes du document.
- lignes : une entrée par article facturé (ignore les lignes de frais de port, consigne, remise globale ou sous-total) ; designation recopiée telle qu'imprimée, quantite livrée, unite, prix_unitaire_ht et total_ht de la ligne.
Montants en nombres décimaux (point décimal, sans symbole €). Si une information est absente ou illisible, mets null : n'invente rien.`;

type Ligne = { designation: string; quantite: number | null; unite: string | null; prix_unitaire_ht: number | null; total_ht: number | null };
type Facture = { fournisseur: string | null; date: string | null; numero: string | null; total_ht: number | null; lignes: Ligne[] };

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

// Nettoyage défensif de la sortie (le schéma est garanti, pas la vraisemblance des valeurs)
function sanitize(raw: Facture): Facture {
  const date = str(raw.date);
  return {
    fournisseur: str(raw.fournisseur),
    date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) ? date : null,
    numero: str(raw.numero),
    total_ht: num(raw.total_ht),
    lignes: (Array.isArray(raw.lignes) ? raw.lignes : [])
      .filter((l) => l && str(l.designation))
      .map((l) => ({
        designation: str(l.designation)!,
        quantite: num(l.quantite),
        unite: str(l.unite),
        prix_unitaire_ht: num(l.prix_unitaire_ht),
        total_ht: num(l.total_ht),
      })),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail(405, "Méthode non autorisée");

  try {
    const caller = await getCaller(req);
    if (caller instanceof Response) return caller;

    let body: { image_base64?: unknown; media_type?: unknown };
    try { body = await req.json(); } catch { return fail(400, "Corps JSON invalide"); }

    const mediaType = typeof body.media_type === "string" ? body.media_type.toLowerCase() : "";
    let data = typeof body.image_base64 === "string" ? body.image_base64 : "";
    data = data.replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
    if (!data) return fail(400, "Fichier manquant");
    if (data.length > MAX_BASE64) return fail(413, "Fichier trop volumineux (6 Mo maximum)");
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(data)) return fail(400, "Fichier mal encodé");
    if (!IMAGE_TYPES.has(mediaType) && mediaType !== PDF_TYPE) {
      return fail(415, "Format non pris en charge (JPEG, PNG, WebP ou PDF)");
    }

    const fileBlock: Anthropic.Beta.BetaContentBlockParam = mediaType === PDF_TYPE
      ? { type: "document", source: { type: "base64", media_type: PDF_TYPE, data } }
      : { type: "image", source: { type: "base64", media_type: mediaType as "image/jpeg" | "image/png" | "image/webp", data } };

    const client = new Anthropic({ apiKey: env("ANTHROPIC_API_KEY") });
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: FACTURE_SCHEMA } },
      messages: [{ role: "user", content: [fileBlock, { type: "text", text: PROMPT }] }],
    });

    // stop_reason avant de lire le contenu (un refus peut renvoyer un contenu vide ou partiel)
    if (response.stop_reason === "refusal") {
      return fail(422, "Le document n'a pas pu être analysé. Réessayez avec une autre photo.");
    }
    if (response.stop_reason === "max_tokens") {
      return fail(422, "Facture trop longue pour être lue en une fois. Scannez-la page par page.");
    }

    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text).join("");
    let parsed: Facture;
    try { parsed = JSON.parse(text); } catch { return fail(502, "Réponse de l'analyse illisible, réessayez"); }

    return json({ ok: true, facture: sanitize(parsed) });
  } catch (e) {
    if (e instanceof Anthropic.APIError) {
      console.error("Anthropic API error", e.status, e.message);
      if (e.status === 429 || e.status === 529) return fail(503, "Service d'analyse surchargé, réessayez dans une minute");
      if (e.status === 400 || e.status === 413) return fail(422, "Document refusé par le service d'analyse (fichier trop lourd ou illisible)");
      return fail(502, "Service d'analyse indisponible");
    }
    console.error(e);
    return fail(500, "Erreur interne");
  }
});
