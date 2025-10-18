import { supabase } from '@/lib/supabase'
import type {
  RecurrentTransaction,
  PendingApprovalInsert,
  PendingApprovalWithDetails,
} from '@/types/database'
import {
  startOfDay,
  parseISO,
  isBefore,
  isAfter,
  isSameDay,
  getDay,
  getDate,
  endOfMonth,
  addDays,
  addMonths,
  setDate,
  format,
} from 'date-fns'

export class RecurrenceService {
  /**
   * Check all active recurrences and generate transactions if needed
   * Should be called:
   * - On app initialization
   * - On dashboard mount
   * - Periodically (e.g., every hour if app is open)
   */
  static async processRecurrences(): Promise<void> {
    try {
      // 1. Fetch active recurrences with category details
      const { data: recurrences, error } = await supabase
        .from('recurrent_transactions')
        .select('*, category:categories(*)')
        .eq('is_active', true)

      if (error) throw error
      if (!recurrences || recurrences.length === 0) return

      // 2. For each recurrence, check if transaction should be generated today
      for (const recurrence of recurrences) {
        if (this.shouldGenerateToday(recurrence)) {
          await this.generateTransaction(recurrence)
        }
      }
    } catch (err) {
      console.error('Error processing recurrences:', err)
      throw err
    }
  }

  /**
   * Calculate if a recurrence should generate a transaction today
   */
  static shouldGenerateToday(recurrence: RecurrentTransaction): boolean {
    const today = startOfDay(new Date())
    const startDate = startOfDay(parseISO(recurrence.start_date))
    const lastGenerated = recurrence.last_generated_date
      ? startOfDay(parseISO(recurrence.last_generated_date))
      : null

    // Check if today >= start_date
    if (isBefore(today, startDate)) return false

    // Check if already generated today
    if (lastGenerated && isSameDay(lastGenerated, today)) return false

    // Check if past end_date
    if (recurrence.end_date) {
      const endDate = startOfDay(parseISO(recurrence.end_date))
      if (isAfter(today, endDate)) return false
    }

    // Check frequency-specific rules
    return this.matchesFrequency(recurrence, today)
  }

  /**
   * Check if today matches the recurrence frequency
   */
  private static matchesFrequency(recurrence: RecurrentTransaction, date: Date): boolean {
    switch (recurrence.frequency) {
      case 'daily':
        return true

      case 'weekly':
        return getDay(date) === recurrence.day_of_week

      case 'monthly': {
        const dayOfMonth = getDate(date)
        const targetDay = recurrence.day_of_month!

        // If target day > days in month, use last day of month
        const lastDayOfMonth = getDate(endOfMonth(date))
        const effectiveDay = Math.min(targetDay, lastDayOfMonth)

        return dayOfMonth === effectiveDay
      }

      default:
        return false
    }
  }

  /**
   * Generate a transaction from a recurrence (or pending approval)
   */
  private static async generateTransaction(recurrence: RecurrentTransaction): Promise<void> {
    const today = format(new Date(), 'yyyy-MM-dd')

    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      if (recurrence.requires_approval) {
        // Create pending approval if one doesn't exist
        const { error: checkError, count } = await supabase
          .from('pending_recurrent_approvals')
          .select('*', { count: 'exact', head: true })
          .eq('recurrent_transaction_id', recurrence.id)
          .eq('scheduled_date', today)

        // Only create if doesn't exist
        if (!checkError && count === 0) {
          const pendingApproval: PendingApprovalInsert = {
            user_id: user.id,
            recurrent_transaction_id: recurrence.id,
            scheduled_date: today,
            is_approved: null,
          }

          const { error: insertError } = await supabase
            .from('pending_recurrent_approvals')
            .insert(pendingApproval as never)

          if (insertError) throw insertError
        }
      } else {
        // Auto-approve: create transaction immediately
        const { error: insertError } = await supabase.from('transactions').insert({
          user_id: user.id,
          category_id: recurrence.category_id!,
          amount: recurrence.amount,
          description: recurrence.description,
          date: today,
          type: recurrence.type,
          recurrent_transaction_id: recurrence.id,
        } as never)

        if (insertError) throw insertError

        // Update last_generated_date
        const { error: updateError } = await supabase
          .from('recurrent_transactions')
          .update({ last_generated_date: today } as never)
          .eq('id', recurrence.id)

        if (updateError) throw updateError
      }
    } catch (err) {
      console.error('Error generating transaction:', err)
      throw err
    }
  }

  /**
   * Calculate next N occurrences for a recurrence
   */
  static calculateNextOccurrences(recurrence: RecurrentTransaction, count: number = 10): Date[] {
    const results: Date[] = []
    let currentDate = startOfDay(new Date())
    const startDate = startOfDay(parseISO(recurrence.start_date))
    const endDate = recurrence.end_date ? startOfDay(parseISO(recurrence.end_date)) : null

    // Start from start_date if it's in the future
    if (isBefore(currentDate, startDate)) {
      currentDate = startDate
    }

    // Check if current date should be included
    if (this.matchesFrequency(recurrence, currentDate)) {
      results.push(currentDate)
    }

    while (results.length < count) {
      currentDate = this.getNextOccurrence(recurrence, currentDate)

      if (endDate && isAfter(currentDate, endDate)) break

      results.push(currentDate)
    }

    return results
  }

  /**
   * Get next occurrence date after a given date
   */
  private static getNextOccurrence(recurrence: RecurrentTransaction, afterDate: Date): Date {
    let nextDate = addDays(afterDate, 1)

    switch (recurrence.frequency) {
      case 'daily':
        return nextDate

      case 'weekly':
        while (getDay(nextDate) !== recurrence.day_of_week) {
          nextDate = addDays(nextDate, 1)
        }
        return nextDate

      case 'monthly': {
        // Move to next month
        nextDate = addMonths(startOfDay(afterDate), 1)
        // Set to target day (or last day of month if target > days in month)
        const targetDay = recurrence.day_of_month!
        const lastDay = getDate(endOfMonth(nextDate))
        const effectiveDay = Math.min(targetDay, lastDay)
        return setDate(nextDate, effectiveDay)
      }

      default:
        return nextDate
    }
  }

  /**
   * Approve a pending recurrent transaction
   */
  static async approvePendingTransaction(approvalId: string): Promise<void> {
    try {
      // Get the pending approval with recurrence details
      const { data: approval, error: fetchError } = await supabase
        .from('pending_recurrent_approvals')
        .select('*, recurrent_transaction:recurrent_transactions(*)')
        .eq('id', approvalId)
        .single<PendingApprovalWithDetails>()

      if (fetchError) throw fetchError
      if (!approval || !approval.recurrent_transaction) {
        throw new Error('Pending approval not found')
      }

      const recurrence = approval.recurrent_transaction

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Create the transaction
      const { error: insertError } = await supabase.from('transactions').insert({
        user_id: user.id,
        category_id: recurrence.category_id,
        amount: recurrence.amount,
        description: recurrence.description,
        date: approval.scheduled_date,
        type: recurrence.type,
        recurrent_transaction_id: recurrence.id,
      } as never)

      if (insertError) throw insertError

      // Update approval status
      const { error: updateApprovalError } = await supabase
        .from('pending_recurrent_approvals')
        .update({
          is_approved: true,
          approved_at: new Date().toISOString(),
        } as never)
        .eq('id', approvalId)

      if (updateApprovalError) throw updateApprovalError

      // Update last_generated_date on recurrence
      const { error: updateRecurrenceError } = await supabase
        .from('recurrent_transactions')
        .update({ last_generated_date: approval.scheduled_date } as never)
        .eq('id', recurrence.id)

      if (updateRecurrenceError) throw updateRecurrenceError
    } catch (err) {
      console.error('Error approving transaction:', err)
      throw err
    }
  }

  /**
   * Reject a pending recurrent transaction
   */
  static async rejectPendingTransaction(approvalId: string): Promise<void> {
    try {
      // Update approval status to rejected
      const { error } = await supabase
        .from('pending_recurrent_approvals')
        .update({
          is_approved: false,
          approved_at: new Date().toISOString(),
        } as never)
        .eq('id', approvalId)

      if (error) throw error

      // Note: We don't update last_generated_date when rejecting
      // This allows the system to potentially create another approval
      // on the next occurrence
    } catch (err) {
      console.error('Error rejecting transaction:', err)
      throw err
    }
  }
}
