import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSettings() {
  const queryClient = useQueryClient();

  const settings = useQuery({
    queryKey: ["app_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("*");
      if (error) throw error;
      const map: Record<string, string> = {};
      (data ?? []).forEach((s) => (map[s.key] = s.value));
      return map;
    },
  });

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from("app_settings")
        .update({ value })
        .eq("key", key);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["app_settings"] }),
  });

  const regenerateKey = useMutation({
    mutationFn: async (key: string) => {
      // Generate a new random key client-side
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      const newKey = Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
      const { error } = await supabase
        .from("app_settings")
        .update({ value: newKey })
        .eq("key", key);
      if (error) throw error;
      return newKey;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["app_settings"] }),
  });

  return { settings, updateSetting, regenerateKey };
}
