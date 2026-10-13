import * as React from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/database";

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (input: {
    email: string;
    password: string;
    fullName: string;
    firmName: string;
  }) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) {
    console.error("Failed to load profile", error);
    return null;
  }
  return data as Profile | null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>({ session: null, profile: null, loading: true });

  const loadForSession = React.useCallback(async (session: Session | null) => {
    if (!session) {
      setState({ session: null, profile: null, loading: false });
      return;
    }
    const profile = await fetchProfile(session.user.id);
    setState({ session, profile, loading: false });
  }, []);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      void loadForSession(data.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void loadForSession(session);
    });

    return () => sub.subscription.unsubscribe();
  }, [loadForSession]);

  const value: AuthContextValue = {
    ...state,
    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    },
    async signUp({ email, password, fullName, firmName }) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return { error: error.message };
      if (!data.session) {
        // Email confirmation is required before we have a session, so the
        // firm/profile bootstrap RPC (which needs auth.uid()) runs on first
        // sign-in instead — see AuthCallback handling below.
        return { error: null };
      }
      const { error: rpcError } = await supabase.rpc("create_firm_and_owner", {
        p_firm_name: firmName,
        p_full_name: fullName,
        p_email: email,
      });
      if (rpcError) return { error: rpcError.message };
      await loadForSession(data.session);
      return { error: null };
    },
    async signOut() {
      await supabase.auth.signOut();
    },
    async requestPasswordReset(email) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { error: error?.message ?? null };
    },
    async updatePassword(newPassword) {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      return { error: error?.message ?? null };
    },
    async refreshProfile() {
      if (!state.session) return;
      const profile = await fetchProfile(state.session.user.id);
      setState((s) => ({ ...s, profile }));
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
