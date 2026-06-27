import { useState, useEffect, useCallback } from 'react';
import { 
  signInUser, 
  signUpUser, 
  signOutUser, 
  getCurrentUser, 
  getUserProfile,
  onAuthStateChange 
} from '@/lib/authService';
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
          await signOutUser();
          return { success: false, error: 'Your account has been deactivated. Please contact admin.' };
        }

        saveProfileCache(profile);
        setState({
          session: result.user as any,
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
            email: formData.email,
            role: 'Admin',
            is_active: true,
            created_at: new Date().toISOString(),
          }
        );

        if (!result.user) {
          return { success: false, error: 'Registration failed' };
        }

        // Auto sign in after registration
        return await signIn(formData.email, formData.password);
      }

      return { success: false, error: 'Registration failed. Please try again.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'An unexpected error occurred.' };
    }
  }, [checkAdminExists, signIn]);

  /**
   * Sign up a new customer account
   */
  const signUpCustomer = useCallback(
    async (formData: {
      name: string;
      email: string;
      phone: string;
      password: string;
      address: string;
      branch_id: string;
      branch_name: string;
      daily_amount: number;
    }): Promise<{ success: boolean; error?: string }> => {
      try {
        const result = await signUpUser(
          formData.email,
          formData.password,
          {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
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

  /**
   * Sign out the current user
   */
  const signOut = useCallback(async (): Promise<void> => {
    await signOutUser();
    saveProfileCache(null);
    setState({
      session: null,
      user: null,
      isLoading: false,
      isAuthenticated: false,
      isAdmin: false,
    });
  }, []);

  /**
   * Initialize auth state on mount and listen for changes
   */
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!mounted) return;

        if (currentUser) {
          const profile = await getUserProfile(currentUser.id);
          setState({
            session: currentUser as any,
            user: profile,
            isLoading: false,
            isAuthenticated: !!profile,
            isAdmin: profile?.role === 'Admin' || false,
          });
          if (profile) {
            saveProfileCache(profile);
          }
        } else {
          setState((prev) => ({ ...prev, isLoading: false, isAuthenticated: false }));
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      }
    };

    initializeAuth();

    // Subscribe to auth state changes
    const subscription = onAuthStateChange(async (user) => {
      if (!mounted) return;

      if (user) {
        const profile = await getUserProfile(user.id);
        setState({
          session: user as any,
          user: profile,
          isLoading: false,
          isAuthenticated: !!profile,
          isAdmin: profile?.role === 'Admin' || false,
        });
        if (profile) {
          saveProfileCache(profile);
        }
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
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  return {
    ...state,
    signIn,
    signUpAdmin,
    signUpCustomer,
    signOut,
  };
}
