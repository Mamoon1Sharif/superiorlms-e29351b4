import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { name, email, password, campus_id, class_assignments } = await req.json();
    // class_assignments may be: string[] (class ids) OR { class_id, section_id|null }[]

    if (!name || !email || !password) {
      return new Response(JSON.stringify({ error: "Name, email, and password are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Create the user with email + password (auto-confirmed)
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, role: "teacher" },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = createData.user.id;

    // 2. Assign the teacher role
    await supabaseAdmin.from("user_roles").upsert(
      { user_id: userId, role: "teacher" },
      { onConflict: "user_id,role" }
    );

    // 2b. Remove any auto-created student row (handle_new_student trigger fires before role exists)
    await supabaseAdmin.from("students").delete().eq("user_id", userId);

    // 3. Create teacher record linked to auth user
    const { data: teacher, error: teacherError } = await supabaseAdmin
      .from("teachers")
      .insert({ name, email, campus_id: campus_id || null, user_id: userId })
      .select()
      .single();

    if (teacherError) {
      return new Response(JSON.stringify({ error: teacherError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Create class assignments if provided
    if (class_assignments && class_assignments.length > 0) {
      const rows = class_assignments.map((a: any) =>
        typeof a === "string"
          ? { teacher_id: teacher.id, class_id: a, section_id: null }
          : { teacher_id: teacher.id, class_id: a.class_id, section_id: a.section_id || null }
      );
      const { error: assignError } = await supabaseAdmin
        .from("teacher_class_assignments")
        .insert(rows);

      if (assignError) {
        console.error("Class assignment error:", assignError);
      }
    }

    return new Response(JSON.stringify({ success: true, teacher }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
