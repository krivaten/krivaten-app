import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { State, getSingleState } from "@/lib/state";
import type { Profile, ProfileUpdate } from "@/types/profile";

export function useProfile() {
  const { session, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [state, setState] = useState<State>(State.INITIAL);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      setState(State.PENDING);
      setError(null);
      const data = await api.get<Profile>("/api/v1/profiles/me");
      setProfile(data);
      setState(getSingleState(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
      setState(State.ERROR);
    }
  }, []);

  const updateProfile = useCallback(async (updates: ProfileUpdate) => {
    const data = await api.put<Profile>("/api/v1/profiles/me", updates);
    setProfile(data);
    return data;
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      setState(State.NONE);
      return;
    }
    fetchProfile();
  }, [authLoading, session, fetchProfile]);

  return { profile, state, error, updateProfile, refetch: fetchProfile };
}
