import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://rqqnndsfguglijyalslv.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxcW5uZHNmZ3VnbGlqeWFsc2x2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5NTk5OTgsImV4cCI6MjEwNTUzNTk5OH0.A8WRjswnQZ6rN4zlK0GY_qF5giGe8bIeqALBEcU_CcQ";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log("Checking current users / auth...");
  // Let's check what profiles currently exist in Supabase
  const profilesRes = await supabase.from("profiles").select("*");
  console.log("Profiles in DB:", profilesRes.data);

  // Let's check members in DB
  const membersRes = await supabase.from("members").select("*");
  console.log("Members in DB count:", membersRes.data?.length);

  // Let's check payments in DB
  const paymentsRes = await supabase.from("payments").select("*");
  console.log("Payments in DB count:", paymentsRes.data?.length);

  // Let's check chit_schemes in DB
  const schemesRes = await supabase.from("chit_schemes").select("*");
  console.log("Chit schemes in DB:", schemesRes.data?.map(s => ({ id: s.id, name: s.name, total_pool_value: s.total_pool_value })));
}

check().catch(console.error);
