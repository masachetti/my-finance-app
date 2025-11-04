import { supabase } from '@/lib/supabase'
import type {
  Event,
  EventInsert,
  EventUpdate,
  EventStats,
  TransactionWithEvent,
} from '@/types/database'
import currency from 'currency.js'
import { useAuthStore } from './auth'

export const useEventsStore = defineStore('events', () => {
  const events = ref<Event[]>([])
  const currentEvent = ref<Event | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const authStore = useAuthStore()

  // Computed: Filter events by status
  const activeEvents = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    return events.value.filter((event) => {
      const isStarted = event.start_date <= today
      const isNotEnded = !event.end_date || event.end_date >= today
      return isStarted && isNotEnded
    })
  })

  const upcomingEvents = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    return events.value.filter((event) => event.start_date > today)
  })

  const completedEvents = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    return events.value.filter((event) => event.end_date && event.end_date < today)
  })

  // CRUD Operations
  async function fetchEvents() {
    try {
      isLoading.value = true
      error.value = null

      const { data, error: fetchError } = await supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: false })

      if (fetchError) throw fetchError

      events.value = data || []
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch events'
      console.error('Error fetching events:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function fetchEventById(id: string) {
    try {
      isLoading.value = true
      error.value = null

      const { data, error: fetchError } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      currentEvent.value = data
      return data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch event'
      console.error('Error fetching event:', err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function createEvent(eventData: EventInsert): Promise<Event | null> {
    try {
      isLoading.value = true
      error.value = null

      if (!authStore.user) {
        throw new Error('User not authenticated')
      }

      const { data, error: createError } = await supabase
        .from('events')
        .insert({
          ...eventData,
          user_id: authStore.user.id,
        })
        .select()
        .single()

      if (createError) throw createError

      events.value.unshift(data)
      return data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create event'
      console.error('Error creating event:', err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function updateEvent(id: string, updates: EventUpdate) {
    try {
      isLoading.value = true
      error.value = null

      const { data, error: updateError } = await supabase
        .from('events')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      // Update in events array
      const index = events.value.findIndex((e) => e.id === id)
      if (index !== -1) {
        events.value[index] = data
      }

      // Update current event if it's the one being updated
      if (currentEvent.value?.id === id) {
        currentEvent.value = data
      }

      return data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update event'
      console.error('Error updating event:', err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function deleteEvent(id: string) {
    try {
      isLoading.value = true
      error.value = null

      const { error: deleteError } = await supabase.from('events').delete().eq('id', id)

      if (deleteError) throw deleteError

      // Remove from events array
      events.value = events.value.filter((e) => e.id !== id)

      // Clear current event if it's the one being deleted
      if (currentEvent.value?.id === id) {
        currentEvent.value = null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete event'
      console.error('Error deleting event:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Transaction Linking
  async function linkTransactionToEvent(transactionId: string, eventId: string) {
    try {
      error.value = null

      const { error: updateError } = await supabase
        .from('transactions')
        .update({ event_id: eventId })
        .eq('id', transactionId)

      if (updateError) throw updateError
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to link transaction'
      console.error('Error linking transaction:', err)
      throw err
    }
  }

  async function unlinkTransactionFromEvent(transactionId: string) {
    try {
      error.value = null

      const { error: updateError } = await supabase
        .from('transactions')
        .update({ event_id: null })
        .eq('id', transactionId)

      if (updateError) throw updateError
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to unlink transaction'
      console.error('Error unlinking transaction:', err)
      throw err
    }
  }

  async function bulkLinkTransactions(transactionIds: string[], eventId: string) {
    try {
      error.value = null

      const { error: updateError } = await supabase
        .from('transactions')
        .update({ event_id: eventId })
        .in('id', transactionIds)

      if (updateError) throw updateError
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to link transactions'
      console.error('Error linking transactions:', err)
      throw err
    }
  }

  // Analytics
  async function getEventTransactions(eventId: string): Promise<TransactionWithEvent[]> {
    try {
      error.value = null

      const { data, error: fetchError } = await supabase
        .from('transactions')
        .select(
          `
          *,
          categories (*),
          sub_categories (*),
          events (*)
        `
        )
        .eq('event_id', eventId)
        .order('date', { ascending: false })

      if (fetchError) throw fetchError

      return (data || []) as TransactionWithEvent[]
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch event transactions'
      console.error('Error fetching event transactions:', err)
      return []
    }
  }

  async function getEventStats(eventId: string): Promise<EventStats> {
    try {
      error.value = null

      const transactions = await getEventTransactions(eventId)

      // Calculate totals using currency.js for precision
      const totalIncome = transactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => currency(sum).add(t.amount).value, 0)

      const totalExpenses = transactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => currency(sum).add(t.amount).value, 0)

      const balance = currency(totalIncome).subtract(totalExpenses).value

      // Category breakdown
      const categoryMap = new Map<
        string,
        {
          category: NonNullable<TransactionWithEvent['categories']>
          total: number
        }
      >()

      transactions
        .filter((t) => t.type === 'expense' && t.categories)
        .forEach((t) => {
          if (!t.categories) return

          const existing = categoryMap.get(t.category_id)
          if (existing) {
            existing.total = currency(existing.total).add(t.amount).value
          } else {
            categoryMap.set(t.category_id, {
              category: t.categories,
              total: t.amount,
            })
          }
        })

      const categoryBreakdown = Array.from(categoryMap.values()).sort((a, b) => b.total - a.total)

      return {
        totalIncome,
        totalExpenses,
        balance,
        transactionCount: transactions.length,
        categoryBreakdown,
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to calculate event stats'
      console.error('Error calculating event stats:', err)
      return {
        totalIncome: 0,
        totalExpenses: 0,
        balance: 0,
        transactionCount: 0,
        categoryBreakdown: [],
      }
    }
  }

  // Helper: Get event status
  function getEventStatus(event: Event): 'active' | 'upcoming' | 'completed' {
    const today = new Date().toISOString().split('T')[0]

    if (event.start_date > today) {
      return 'upcoming'
    }

    if (event.end_date && event.end_date < today) {
      return 'completed'
    }

    return 'active'
  }

  return {
    // State
    events,
    currentEvent,
    isLoading,
    error,

    // Computed
    activeEvents,
    upcomingEvents,
    completedEvents,

    // Actions
    fetchEvents,
    fetchEventById,
    createEvent,
    updateEvent,
    deleteEvent,
    linkTransactionToEvent,
    unlinkTransactionFromEvent,
    bulkLinkTransactions,
    getEventTransactions,
    getEventStats,
    getEventStatus,
  }
})
