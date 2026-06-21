import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@/types';
import type { Session } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const STORAGE_KEY_PROFILE = 'hiremercy_profile';

function saveProfileCache(profile: User | null) {
  if (typeof window === 'undefined') return;
  if (profile) {
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
  } else {
    localStorage.removeItem(STORAGE_KEY_PROFILE);
  }
}

function loadProfileCache(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PROFILE);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: loadProfileCache(),
    isLoading: true,
    isAuthenticated: false,
    isAdmin: false,
  });

  const fetchProfile = useCallback(async (userId: string): Promise<User | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        console.error('Error fetching profile:', error);
        return null;
      }

      const profile: User = {
        id: data.id,
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || undefined,
        role: (data.role as 'Admin' | 'Staff' | 'Customer') || 'Customer',
        branch_id: data.branch_id || undefined,
        branch_name: data.branch_name || undefined,
        member_id: data.member_id || undefined,
        is_active: data.is_active ?? true,
        created_at: data.created_at,
        updated_at: data.updated_at || undefined,
        profile_image: data.profile_image || undefined,
      };

      saveProfileCache(profile);
      return profile;
    } catch (err) {
      console.error('fetchProfile error:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;

      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setState({
          session,
          user: profile,
          isLoading: false,
          isAuthenticated: !!profile,
          isAdmin: profile?.role === 'Admin',
        });
      } else {
        setState(prev => ({ ...prev, isLoading: false, isAuthenticated: false }));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;

        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          setState({
            session,
            user: profile,
            isLoading: false,
            isAuthenticated: !!profile,
            isAdmin: profile?.role === 'Admin',
          });
        } else {
          saveProfileCache(null);
          setState({
            session: null,
            user: null,
            isLoading: false,
            isAuthenticated: false,
            isAdmin: false,
          });
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const checkAdminExists = useCallback(async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('check_admin_exists');
      if (error) {
        console.error('checkAdminExists error:', error);
        return false;
      }
      return !!data;
    } catch {
      return false;
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        const profile = await fetchProfile(data.user.id);
        if (!profile) {
          return { success: false, error: 'Profile not found. Please contact support.' };
        }
        if (!profile.is_active) {
          await supabase.auth.signOut();
          return { success: false, error: 'Your account has been deactivated. Please contact admin.' };
        }
        setState({
          session: data.session,
          user: profile,
          isLoading: false,
          isAuthenticated: true,
          isAdmin: profile.role === 'Admin',
        });
        return { success: true };
      }

      return { success: false, error: 'Login failed. Please try again.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'An unexpected error occurred.' };
    }
  }, [fetchProfile]);

  const signUpAdmin = useCallback(async (formData: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const adminExists = await checkAdminExists();
      if (adminExists) {
        return { success: false, error: 'An admin account already exists.' };
      }

      const { data, error } = await supabase.auth.signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            role: 'Admin',
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            name: formData.name,
            phone: formData.phone,
            role: 'Admin',
          })
          .eq('id', data.user.id);

        if (updateError) {
          console.error('Error updating admin profile:', updateError);
        }

        return await signIn(formData.email, formData.password);
      }

      return { success: false, error: 'Registration failed. Please try again.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'An unexpected error occurred.' };
    }
  }, [checkAdminExists, signIn]);

  const signUpCustomer = useCallback(async (formData: {
    name: string;
    email: string;
    phone: string;
    password: string;
    address: string;
    branch_id: string;
    daily_amount: number;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data: existingUsers } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', formData.email.trim().toLowerCase())
        .maybeSingle();

      if (existingUsers) {
        return { success: false, error: 'An account with this email already exists.' };
      }

      const { data: branch } = await supabase
        .from('branches')
        .select('name')
        .eq('id', formData.branch_id)
        .single();

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            role: 'Customer',
          },
        },
      });

      if (authError || !authData.user) {
        return { success: false, error: authError?.message || 'Failed to create account.' };
      }

      const userId = authData.user.id;

      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .insert({
          user_id: userId,
          name: formData.name,
          phone: formData.phone,
          email: formData.email.trim().toLowerCase(),
          address: formData.address,
          daily_amount: formData.daily_amount,
          start_date: new Date().toISOString().split('T')[0],
          status: 'Active',
          cycle_position: 1,
          branch_id: formData.branch_id,
          branch_name: branch?.name || '',
        })
        .select()
        .single();

      if (memberError) {
        console.error('Error creating member:', memberError);
        return { success: false, error: 'Account created but failed to create member profile.' };
      }

      await supabase
        .from('profiles')
        .update({
          name: formData.name,
          phone: formData.phone,
          role: 'Customer',
          branch_id: formData.branch_id,
          branch_name: branch?.name || '',
          member_id: memberData.id,
        })
        .eq('id', userId);

      const dayTrackingData = Array.from({ length: 32 }, (_, i) => ({
        member_id: memberData.id,
        day: i + 1,
        date: null,
        paid: false,
        amount: 0,
      }));

      await supabase.from('day_tracking').insert(dayTrackingData);

      return await signIn(formData.email, formData.password);
    } catch (err: any) {
      return { success: false, error: err?.message || 'An unexpected error occurred.' };
    }
  }, [signIn]);

  const signOut = useCallback(async (): Promise<void> => {
    await supabase.auth.signOut();
    saveProfileCache(null);
    setState({
      session: null,
      user: null,
      isLoading: false,
      isAuthenticated: false,
      isAdmin: false,
    });
  }, []);

  return {
    ...state,
    checkAdminExists,
    signIn,
    signUpAdmin,
    signUpCustomer,
    signOut,
  };
}
