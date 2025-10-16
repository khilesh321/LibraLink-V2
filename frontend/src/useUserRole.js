import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function useUserRole() {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserRole();
  }, []);

  const getUserRole = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      // Get user role from profiles table
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user role:", error);
        setRole("student"); // Default fallback
      } else if (data) {
        setRole(data.role);
      } else {
        // User doesn't have a profile yet, assume student
        setRole("student");
      }
    } catch (error) {
      console.error("Error getting user role:", error);
      setRole("student"); // Safe fallback
    } finally {
      setLoading(false);
    }
  };

  return { role, loading, refetch: getUserRole };
}
