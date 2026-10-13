import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { PracticeArea } from "@/types/database";

export function usePracticeAreas() {
  return useQuery({
    queryKey: ["practice-areas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("practice_areas").select("*").order("name");
      if (error) throw error;
      return data as PracticeArea[];
    },
  });
}
