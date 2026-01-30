  node -e '
  import { createClient } from "@supabase/supabase-js";
  const supabase = createClient(process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: process.env.TEST_EMAIL,
    password: process.env.TEST_PASSWORD
  });
  if (error) { console.error(error.message); process.exit(1); }
  console.log(data.session.access_token);

