// @ts-nocheck
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") ?? "";
const CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { code, redirect_uri } = await req.json();

    if (!code || !redirect_uri) {
      throw new Error("Faltan parámetros: code o redirect_uri");
    }

    // 1. Intercambiar code por tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      console.error("Error Google Token:", errorText);
      throw new Error(`Error al obtener tokens de Google: ${errorText}`);
    }

    const tokens = await tokenRes.json();
    console.log("Tokens recibidos de Google (sin mostrar sensibles)"); // Log de éxito parcial
    const refreshToken = tokens.refresh_token;

    if (!refreshToken) {
      console.warn("No se recibió refresh_token. Asegúrate de usar prompt=consent.");
    }

    // 2. Identificar al usuario que hace la petición
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No autorizado: Falta header Authorization");
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error("Error obteniendo usuario:", userError);
      throw new Error("Usuario no autenticado o error al obtener sesión");
    }

    console.log("Usuario autenticado:", user.id);

    // 3. Guardar el refresh_token en la tabla profiles
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (refreshToken) {
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ google_refresh_token: refreshToken })
        .eq("id", user.id);

      if (updateError) {
        console.error("Error actualizando profile:", updateError);
        throw new Error(`Error al guardar token en base de datos: ${updateError.message}`);
      }
      console.log("Token guardado exitosamente para:", user.id);
    } else {
        // Si no hay refresh token, intentamos ver si ya tiene uno, si no, es un problema
        console.log("No hay refresh token nuevo para guardar.");
    }

    return new Response(
      JSON.stringify({ success: true, message: "Google Calendar vinculado correctamente" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
