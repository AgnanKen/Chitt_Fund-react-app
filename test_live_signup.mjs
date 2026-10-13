import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://rqqnndsfguglijyalslv.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxcW5uZHNmZ3VnbGlqeWFsc2x2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5NTk5OTgsImV4cCI6MjEwNTUzNTk5OH0.A8WRjswnQZ6rN4zlK0GY_qF5giGe8bIeqALBEcU_CcQ";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const email = "agnan.user@gmail.com";
  const password = "TestPassword@123";
  console.log("Trying signUp with:", email);
  const signUpRes = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: "Agnan User",
        phone: "+91 98450 12345",
        role: "member",
      },
    },
  });

  console.log("SignUp response:", {
    user: signUpRes.data?.user?.id,
    identities: signUpRes.data?.user?.identities,
    confirmed_at: signUpRes.data?.user?.email_confirmed_at,
    session: Boolean(signUpRes.data?.session),
    error: signUpRes.error?.message,
    status: signUpRes.error?.status,
  });

  if (signUpRes.data?.user) {
    console.log("Trying signIn immediately...");
    const signInRes = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    console.log("SignIn response:", {
      user: signInRes.data?.user?.id,
      session: Boolean(signInRes.data?.session),
      error: signInRes.error?.message,
      status: signInRes.error?.status,
    });
  }
}

test().catch(console.error);
