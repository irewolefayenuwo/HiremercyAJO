import { supabase } from './supabaseClient';
import type { User } from '../types';

/**
 * Sign up a new user with Supabase Authentication
 * Creates a user in auth.users and stores profile in public.users
 */
export const signUpUser = async (
  email: string,
  password: string,
  userData: Partial<User>
) => {
  try {
    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      throw new Error(`Auth signup failed: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('User creation failed - no user returned');
    }

    // 2. Store user profile in public.users table
    const { error: profileError } = await supabase
      .from('users')
      .insert([
        {
          id: authData.user.id,
          email,
          name: userData.name || '',
          phone: userData.phone || '',
          role: userData.role || 'Customer',
          branch_id: userData.branch_id || '',
          branch_name: userData.branch_name || '',
          member_id: userData.member_id || '',
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ]);

    if (profileError) {
      // Clean up: delete the auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw new Error(`Profile creation failed: ${profileError.message}`);
    }

    return {
      user: authData.user,
      profile: userData,
    };
  } catch (error) {
    console.error('SignUp error:', error);
    throw error;
  }
};

/**
 * Sign in a user with email and password
 */
export const signInUser = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(`Login failed: ${error.message}`);
    }

    if (!data.user) {
      throw new Error('Login failed - no user returned');
    }

    // Fetch user profile from public.users table
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      throw new Error(`Failed to fetch user profile: ${profileError.message}`);
    }

    return {
      user: data.user,
      profile: profileData,
    };
  } catch (error) {
    console.error('SignIn error:', error);
    throw error;
  }
};

/**
 * Sign in with phone number (alternative - requires SMS setup in Supabase)
 * For now, we recommend email-based auth
 */
export const signInWithPhone = async (phone: string, password: string) => {
  try {
    // Query users by phone number
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('phone', phone)
      .single();

    if (error || !data) {
      throw new Error('User not found');
    }

    // Sign in using their email
    return signInUser(data.email, password);
  } catch (error) {
    console.error('Phone SignIn error:', error);
    throw error;
  }
};

/**
 * Sign out the current user
 */
export const signOutUser = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(`Logout failed: ${error.message}`);
    }
  } catch (error) {
    console.error('SignOut error:', error);
    throw error;
  }
};

/**
 * Get the current authenticated user
 */
export const getCurrentUser = async () => {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Get current user error:', error);
      return null;
    }
    return data.user;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
};

/**
 * Get user profile from public.users table
 */
export const getUserProfile = async (userId: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Get profile error:', error);
      return null;
    }
    return data as User;
  } catch (error) {
    console.error('Get profile error:', error);
    return null;
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (userId: string, updates: Partial<User>) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Profile update failed: ${error.message}`);
    }
    return data;
  } catch (error) {
    console.error('Update profile error:', error);
    throw error;
  }
};

/**
 * Change user password
 */
export const changePassword = async (newPassword: string) => {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw new Error(`Password change failed: ${error.message}`);
    }
  } catch (error) {
    console.error('Change password error:', error);
    throw error;
  }
};

/**
 * Set up auth state listener
 */
export const onAuthStateChange = (callback: (user: any | null) => void) => {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null);
  });

  return data.subscription;
};
