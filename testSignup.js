import { supabase } from './src/Lib/supabase.js';

async function testSignUp() {
  try {
    const email = 'testuser12345@example.com';
    const password = 'TestPass123!';
    const { data, error } = await supabase.auth.signUp({ email, password });
    console.log('SignUp result:', { data, error });
    if (error) {
      console.error('Error:', error.message);
    } else {
      console.log('User ID:', data.user?.id);
    }
  } catch (e) {
    console.error('Exception:', e);
  }
}

testSignUp();
