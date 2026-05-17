import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createAdmin() {
  const { data, error } = await supabase.auth.signUp({
    email: 'admin@pos.com',
    password: '123456',
    options: {
      data: {
        role: 'admin',
        username: 'admin'
      }
    }
  });

  if (error) {
    console.error("Error creating admin:", error);
  } else {
    console.log("Admin user created/logged in:", data.user?.id);
  }
}

createAdmin();
