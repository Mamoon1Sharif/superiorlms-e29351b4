import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const adminEmail = "Admin@gmail.com";
  const adminPassword = "123456";

  // Check if admin already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existing = existingUsers?.users?.find(u => u.email?.toLowerCase() === adminEmail.toLowerCase());

  if (existing) {
    // Ensure role exists
    await supabase.from("user_roles").upsert(
      { user_id: existing.id, role: "admin" },
      { onConflict: "user_id,role" }
    );
    return new Response(JSON.stringify({ message: "Admin already exists", user_id: existing.id }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Create admin user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
  });

  if (authError) {
    return new Response(JSON.stringify({ error: authError.message }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  // Assign admin role
  await supabase.from("user_roles").insert({ user_id: authData.user.id, role: "admin" });

  return new Response(JSON.stringify({ message: "Admin created", user_id: authData.user.id }), {
    headers: { "Content-Type": "application/json" },
  });
});
