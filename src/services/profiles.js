import supabase from './supabase'

/**
 * Service for the `profiles` table.
 * Each row is 1:1 with auth.users and auto-created by the handle_new_user trigger.
 *
 * RLS policies guarantee that users can only read/update their own row,
 * so no user_id filter is needed — Supabase infers it from the JWT.
 */
export const profilesService = {
  /**
   * Fetch the current user's profile.
   * Returns null if the row doesn't exist yet (e.g., trigger hasn't fired).
   * @returns {Promise<{ id: string, full_name: string|null, plan: 'free'|'premium', created_at: string, updated_at: string } | null>}
   */
  async get() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, plan, created_at, updated_at')
      .single()

    // PGRST116 = "no rows returned" — profile not yet created by trigger, not a real error
    if (error?.code === 'PGRST116') return null
    if (error) throw error
    return data
  },

  /**
   * Update the current user's profile fields.
   * @param {{ full_name?: string, plan?: 'free'|'premium' }} updates
   * @returns {Promise<object>}
   */
  async update(updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .select('id, full_name, plan, created_at, updated_at')
      .single()

    if (error) throw error
    return data
  },

  /**
   * Upgrade or downgrade the user's plan.
   * Call this after a successful Stripe payment or when reverting.
   * @param {'free'|'premium'} plan
   */
  async setPlan(plan) {
    return this.update({ plan })
  },
}
