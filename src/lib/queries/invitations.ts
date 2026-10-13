import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { UserRole, Invitation } from "@/types/database";

export function useInvitations() {
  return useQuery({
    queryKey: ["invitations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Invitation[];
    },
  });
}

export function useCreateInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { email: string; role: UserRole }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from("profiles").select("firm_id").eq("id", userData.user?.id ?? "").single();
      if (!profile?.firm_id) throw new Error("No firm associated with this account.");

      const { data, error } = await supabase
        .from("invitations")
        .insert({ firm_id: profile.firm_id, email: input.email.toLowerCase().trim(), role: input.role, invited_by: userData.user?.id })
        .select()
        .single();
      if (error) throw error;
      return data as Invitation;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invitations"] }),
  });
}

// Separate from creation on purpose: invite creation should always succeed
// even if email sending fails or isn't configured (RESEND_API_KEY unset).
// The invite link is still valid and shown in the UI as a fallback either way.
export function useSendInvitationEmail() {
  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { data, error } = await supabase.functions.invoke<{ sent?: boolean; error?: string }>(
        "send-invitation-email",
        { body: { invitationId } },
      );
      if (error) throw error;
      if (!data?.sent) throw new Error(data?.error ?? "Email was not sent.");
      return true;
    },
  });
}

export function useRevokeInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invitations").update({ status: "revoked" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invitations"] }),
  });
}

// Public lookup — used on /invite/$token BEFORE the invitee is
// authenticated, backed by the get_invitation_by_token() RPC (see
// supabase/migrations/0009_invitations.sql), which is the only thing
// allowed to read invitation data pre-auth, and only the few safe fields.
export function useInvitationByToken(token: string | undefined) {
  return useQuery({
    queryKey: ["invitation", token],
    enabled: Boolean(token),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_invitation_by_token", { p_token: token as string });
      if (error) throw error;
      return data?.[0] as { firm_name: string; role: UserRole; email: string; status: string; expires_at: string } | undefined;
    },
  });
}
