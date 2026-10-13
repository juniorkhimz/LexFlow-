import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// Staff-only (non-client) profiles, for "assign advocate" dropdowns across
// Leads, Matters, Deadlines, Appointments etc.
export function useStaffOptions() {
  return useQuery({
    queryKey: ["profiles", "staff-options"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, role").neq("role", "client").order("full_name");
      if (error) throw error;
      return data;
    },
  });
}
