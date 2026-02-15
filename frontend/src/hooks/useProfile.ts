import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import type { Profile, ProfileUpdate } from '@/types/profile'

export function useProfile() {
  const { session, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.get<Profile>('/api/profiles/me')
      setProfile(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }, [])

  const updateProfile = useCallback(async (updates: ProfileUpdate) => {
    const data = await api.put<Profile>('/api/profiles/me', updates)
    setProfile(data)
    return data
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!session) {
      setLoading(false)
      return
    }
    fetchProfile()
  }, [authLoading, session, fetchProfile])

  return { profile, loading, error, updateProfile, refetch: fetchProfile }
}
