import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // Check for POST method and authorization header
  if (req.method !== "POST" || req.headers.get("authorization")?.split(" ")[1] !== Deno.env.get("SUPABASE_ANON_KEY")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { userId } = await req.json();

  if (!userId) {
    return new Response("User ID is required", { status: 400 });
  }

  try {
    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Delete the user from the auth schema
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ message: "User deleted successfully" }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
