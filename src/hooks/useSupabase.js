import { useState, useEffect, useCallback } from 'react'
import supabase from '@/services/supabase'
import { profilesService } from '@/services/profiles'

/** Generic hook for Supabase queries */
export function useQuery(queryFn, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const execute = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await queryFn()
      setData(result)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => { execute() }, [execute])

  return { data, loading, error, refetch: execute }
}

/** Subscribe to Supabase Realtime on a table */
export function useRealtimeSubscription(table, filter, onEvent) {
  useEffect(() => {
    const channel = supabase
      .channel(`realtime:${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table, filter }, onEvent)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, filter])
}

/**
 * Auth state + profile + all auth mutations.
 *
 * `plan` is read from the `profiles` table (source of truth), with a fallback
 * to user_metadata for the brief window between sign-up and trigger execution.
 * This ensures that upgrading a user's plan in the DB is reflected immediately
 * in the UI — without waiting for the JWT to refresh.
 */
export function useAuth() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch the profile row for a given session (or clear it on sign-out)
  const syncProfile = useCallback(async (sess) => {
    if (!sess) {
      setProfile(null)
      return
    }
    try {
      const profilePromise = profilesService.get()
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 4000)
      )
      const data = await Promise.race([profilePromise, timeout])
      setProfile(data)
    } catch (err) {
      // Non-fatal: fall back to null, plan derived from user_metadata
      console.warn('[useAuth] profile fetch failed:', err.message)
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    // Initial session check + profile load (5 s timeout guard)
    const sessionTimeout = setTimeout(() => {
      if (!mounted) return
      console.warn('[useAuth] getSession timeout — proceeding with no session')
      setLoading(false)
    }, 5000)

    supabase.auth.getSession().then(async ({ data }) => {
      clearTimeout(sessionTimeout)
      if (!mounted) return
      setSession(data.session)
      await syncProfile(data.session)
      setLoading(false)
    })

    // Keep session + profile in sync on sign-in / sign-out / token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      if (!mounted) return
      setSession(sess)
      await syncProfile(sess)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [syncProfile])

  // ── Auth mutations ────────────────────────────────────────────────────────

  /**
   * Sign in with email + password.
   * @returns {{ error: string|null }}
   */
  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: translateAuthError(error.message) }
    return { error: null }
  }

  /**
   * Create a new account.
   * @param {string} email
   * @param {string} password
   * @param {{ fullName?: string, plan?: 'free'|'premium' }} [meta]
   * @returns {{ error: string|null }}
   */
  const signUp = async (email, password, { fullName, plan = 'free' } = {}) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, plan },
      },
    })
    if (error) return { error: translateAuthError(error.message) }
    return { error: null }
  }

  /**
   * Send a password reset email.
   * @returns {{ error: string|null }}
   */
  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) return { error: translateAuthError(error.message) }
    return { error: null }
  }

  const signOut = () => {
    // Clear React state immediately — ProtectedRoute redirects to /login on next render.
    // The Supabase SDK call runs in the background; we never wait for it.
    setSession(null)
    setProfile(null)
    supabase.auth.signOut({ scope: 'local' }).catch(console.error)
  }

  /**
   * Change the user's plan in the `profiles` table and update local state.
   * Call this after a successful Stripe payment confirmation.
   * @param {'free'|'premium'} newPlan
   */
  const upgradePlan = async (newPlan) => {
    const updated = await profilesService.setPlan(newPlan)
    setProfile(updated)
    return updated
  }

  // plan: profiles table > user_metadata fallback > 'free' default
  const plan = profile?.plan
    ?? session?.user?.user_metadata?.plan
    ?? 'free'

  return {
    session,
    user:    session?.user ?? null,
    profile,
    plan,
    loading,
    signIn,
    signUp,
    resetPassword,
    signOut,
    upgradePlan,
  }
}

/** Map Supabase English error messages to Spanish */
function translateAuthError(message) {
  const map = {
    'Invalid login credentials':                   'Email o contraseña incorrectos.',
    'Email not confirmed':                          'Confirmá tu email antes de iniciar sesión.',
    'User already registered':                     'Ya existe una cuenta con ese email.',
    'Password should be at least 6 characters':    'La contraseña debe tener al menos 6 caracteres.',
    'Unable to validate email address':            'El email ingresado no es válido.',
    'Email rate limit exceeded':                   'Demasiados intentos. Esperá unos minutos.',
    'over_email_send_rate_limit':                  'Demasiados intentos. Esperá unos minutos.',
    'signup_disabled':                             'El registro está deshabilitado temporalmente.',
    'email_exists':                                'Ya existe una cuenta con ese email.',
  }
  return map[message] ?? 'Ocurrió un error. Intentá de nuevo.'
}
