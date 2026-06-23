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

  /**
   * Sign in with email and password
   */
  const signIn = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const result = await signInUser(email, password);
        if (!result.user) {
          return { success: false, error: 'Login failed - no user returned' };
        }

        const profile = await getUserProfile(result.user.id);
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
      } catch (err: any) {
        return { success: false, error: err?.message || 'An unexpected error occurred.' };
      }
    },
    []
  );

  /**
   * Sign up a new admin account
   */
  const signUpAdmin = useCallback(
    async (formData: {
      name: string;
      email: string;
      phone: string;
      password: string;
    }): Promise<{ success: boolean; error?: string }> => {
      try {
        const result = await signUpUser(
          formData.email,
          formData.password,
          {
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
      } catch (err: any) {
        return { success: false, error: err?.message || 'An unexpected error occurred.' };
      }
    },
    [signIn]
  );

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
            branch_id: formData.branch_id,
            branch_name: formData.branch_name,
            is_active: true,
            created_at: new Date().toISOString(),
          }
        );

        if (!result.user) {
          return { success: false, error: 'Registration failed' };
        }

        // Auto sign in after registration
        return await signIn(formData.email, formData.password);
      } catch (err: any) {
        return { success: false, error: err?.message || 'An unexpected error occurred.' };
      }
    },
    [signIn]
  );

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
