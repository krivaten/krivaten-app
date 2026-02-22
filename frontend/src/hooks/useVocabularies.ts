import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { State, getCollectionState } from "@/lib/state";
import type { Vocabulary, VocabularyType } from "@/types/vocabulary";

interface VocabularyFilters {
  type?: VocabularyType;
}

export function useVocabularies(filters?: VocabularyFilters) {
  const { session, loading: authLoading } = useAuth();
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [state, setState] = useState<State>(State.INITIAL);
  const [error, setError] = useState<string | null>(null);

  const fetchVocabularies = useCallback(async () => {
    try {
      setState(State.PENDING);
      setError(null);
      const params = new URLSearchParams();
      if (filters?.type) params.set("type", filters.type);
      const qs = params.toString();
      const data = await api.get<Vocabulary[]>(`/api/v1/vocabularies${qs ? `?${qs}` : ""}`);
      setVocabularies(data);
      setState(getCollectionState(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load vocabularies");
      setState(State.ERROR);
    }
  }, [filters?.type]);

  const createVocabulary = useCallback(async (vocab: Omit<Vocabulary, "id" | "tenant_id" | "is_system" | "created_at" | "updated_at">) => {
    const data = await api.post<Vocabulary>("/api/v1/vocabularies", vocab);
    setVocabularies((prev) => {
      const next = [...prev, data];
      setState(getCollectionState(next));
      return next;
    });
    return data;
  }, []);

  const updateVocabulary = useCallback(async (id: string, updates: { name?: string; description?: string; path?: string }) => {
    const data = await api.put<Vocabulary>(`/api/v1/vocabularies/${id}`, updates);
    setVocabularies((prev) => prev.map((v) => (v.id === id ? data : v)));
    return data;
  }, []);

  const deleteVocabulary = useCallback(async (id: string) => {
    await api.delete(`/api/v1/vocabularies/${id}`);
    setVocabularies((prev) => {
      const next = prev.filter((v) => v.id !== id);
      setState(getCollectionState(next));
      return next;
    });
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      setState(State.NONE);
      return;
    }
    fetchVocabularies();
  }, [authLoading, session, fetchVocabularies]);

  return { vocabularies, state, error, createVocabulary, updateVocabulary, deleteVocabulary, refetch: fetchVocabularies };
}
