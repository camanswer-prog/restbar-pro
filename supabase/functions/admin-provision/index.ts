// RESTBAR PRO — Supabase Edge Function: admin-provision
// Création sécurisée et gestion des membres côté serveur (service_role)
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: callerUser }, error: callerError } = await supabaseAdmin.auth.getUser(token);

    if (callerError || !callerUser) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, establishment_id, email, password, full_name, phone, role_ids, member_id, is_active } = body;

    // Vérifier les droits de l'appelant (Super Admin ou Gérant de l'établissement)
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("is_super_admin")
      .eq("id", callerUser.id)
      .single();

    const isSuperAdmin = callerProfile?.is_super_admin === true;

    if (!isSuperAdmin) {
      // Vérifier si Gérant dans cet établissement
      const { data: membership } = await supabaseAdmin
        .from("establishment_members")
        .select("id, is_active, user_roles(roles(code))")
        .eq("establishment_id", establishment_id)
        .eq("profile_id", callerUser.id)
        .eq("is_active", true)
        .single();

      const isGerant = membership?.user_roles?.some((ur: any) => ur.roles?.code === "gerant");
      if (!isGerant) {
        return new Response(JSON.stringify({ error: "Forbidden: Seul le gérant peut gérer le personnel." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "create_member") {
      // 1. Vérifier limite de licence (max_users)
      const { data: activeLicense } = await supabaseAdmin
        .from("licenses")
        .select("max_users, status, expires_at")
        .eq("establishment_id", establishment_id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { count: currentMemberCount } = await supabaseAdmin
        .from("establishment_members")
        .select("id", { count: "exact", head: true })
        .eq("establishment_id", establishment_id)
        .eq("is_active", true);

      const maxAllowed = activeLicense?.max_users || 5;
      if (currentMemberCount && currentMemberCount >= maxAllowed) {
        return new Response(JSON.stringify({
          error: `Limite de licence atteinte (${maxAllowed} utilisateurs maximum). Veuillez mettre à niveau la licence.`
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 2. Créer ou récupérer l'utilisateur auth
      let targetUserId: string;
      const { data: existingUser } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (existingUser) {
        targetUserId = existingUser.id;
      } else {
        const { data: newUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: password || "RestBar2026!",
          email_confirm: true,
          user_metadata: { full_name, phone },
        });

        if (createAuthError) throw createAuthError;
        targetUserId = newUser.user.id;

        // Créer le profil
        await supabaseAdmin.from("profiles").upsert({
          id: targetUserId,
          email,
          full_name,
          phone,
          is_super_admin: false,
          is_active: true,
        });
      }

      // 3. Créer l'adhésion
      const { data: member, error: memberError } = await supabaseAdmin
        .from("establishment_members")
        .insert({
          establishment_id,
          profile_id: targetUserId,
          is_active: true,
          invited_by: callerUser.id,
        })
        .select()
        .single();

      if (memberError) throw memberError;

      // 4. Assigner les rôles
      if (Array.isArray(role_ids) && role_ids.length > 0) {
        const roleInserts = role_ids.map((roleId: string) => ({
          establishment_member_id: member.id,
          role_id: roleId,
          assigned_by: callerUser.id,
        }));
        await supabaseAdmin.from("user_roles").insert(roleInserts);
      }

      // 5. Audit Log
      await supabaseAdmin.from("audit_logs").insert({
        establishment_id,
        actor_id: callerUser.id,
        action: "MEMBER_CREATED",
        entity_type: "establishment_member",
        entity_id: member.id,
        details: { email, full_name, role_ids },
      });

      return new Response(JSON.stringify({ success: true, member }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "toggle_status") {
      const { data: member, error: updateError } = await supabaseAdmin
        .from("establishment_members")
        .update({ is_active })
        .eq("id", member_id)
        .eq("establishment_id", establishment_id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Audit Log
      await supabaseAdmin.from("audit_logs").insert({
        establishment_id,
        actor_id: callerUser.id,
        action: is_active ? "MEMBER_ACTIVATED" : "MEMBER_DEACTIVATED",
        entity_type: "establishment_member",
        entity_id: member_id,
        details: { is_active },
      });

      return new Response(JSON.stringify({ success: true, member }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Action inconnue" }), {
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
