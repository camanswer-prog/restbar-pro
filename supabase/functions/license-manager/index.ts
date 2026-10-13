// RESTBAR PRO — Supabase Edge Function: license-manager
// Opérations privilégiées de génération et vérification de licence PRO
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Auth verification
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, establishment_id, plan_type, duration_months, license_key } = await req.json();

    // Vérifier si l'utilisateur est Super Admin pour la création de licence
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("is_super_admin")
      .eq("id", user.id)
      .single();

    if (action === "generate") {
      if (!profile?.is_super_admin) {
        return new Response(JSON.stringify({ error: "Forbidden: Super Admin only" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const randomPart = crypto.randomUUID().replace(/-/g, "").substring(0, 16).toUpperCase();
      const generatedKey = `RBP-${plan_type.toUpperCase()}-${randomPart.substring(0, 4)}-${randomPart.substring(4, 8)}-${randomPart.substring(8, 12)}-${randomPart.substring(12, 16)}`;
      const months = duration_months || 12;
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + months);

      const maxUsers = plan_type === "enterprise" ? 50 : plan_type === "pro" ? 15 : 5;
      const maxRegisters = plan_type === "enterprise" ? 10 : plan_type === "pro" ? 4 : 1;

      // Calcul signature cryptographique HMAC
      const secret = Deno.env.get("LICENSE_SIGNING_SECRET") || "restbar_pro_secret_key_2026";
      const payloadToSign = `${establishment_id}:${generatedKey}:${expiresAt.toISOString()}:${maxUsers}`;
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadToSign));
      const signatureHex = Array.from(new Uint8Array(signatureBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const { data: license, error: insertError } = await supabaseClient
        .from("licenses")
        .insert({
          establishment_id,
          license_key: generatedKey,
          plan_type,
          status: "active",
          max_users: maxUsers,
          max_registers: maxRegisters,
          expires_at: expiresAt.toISOString(),
          signature: signatureHex,
          created_by: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Audit log
      await supabaseClient.from("audit_logs").insert({
        establishment_id,
        actor_id: user.id,
        action: "LICENSE_GENERATED",
        entity_type: "license",
        entity_id: license.id,
        details: { plan_type, expires_at: expiresAt, license_key: generatedKey },
      });

      return new Response(JSON.stringify({ success: true, license }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify") {
      const { data: license, error: licError } = await supabaseClient
        .from("licenses")
        .select("*, establishments(name)")
        .eq("license_key", license_key)
        .single();

      if (licError || !license) {
        return new Response(JSON.stringify({ valid: false, message: "Licence introuvable" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const isExpired = new Date(license.expires_at) < new Date();
      const isValid = license.status === "active" && !isExpired;

      return new Response(JSON.stringify({
        valid: isValid,
        license,
        reason: isExpired ? "Licence expirée" : license.status !== "active" ? "Licence révoquée" : "Valide"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
