-- Drop the trigger first (triggers depend on functions)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Then drop the function
DROP FUNCTION IF EXISTS public.handle_new_user();
