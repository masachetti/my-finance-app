import type { RecurrentTransaction } from '@/types/database'

/**
 * Translation function type
 */
type TranslateFn = (key: string, params?: Record<string, any>) => string

/**
 * Format recurrence frequency as human-readable string
 */
export function formatRecurrenceFrequency(
  recurrence: RecurrentTransaction,
  t: TranslateFn
): string {
  const { frequency, day_of_week, day_of_month } = recurrence

  switch (frequency) {
    case 'daily':
      return t('recurrent.frequencyFormat.daily')

    case 'weekly': {
      const dayKeys = [
        'recurrent.days.sunday',
        'recurrent.days.monday',
        'recurrent.days.tuesday',
        'recurrent.days.wednesday',
        'recurrent.days.thursday',
        'recurrent.days.friday',
        'recurrent.days.saturday',
      ]
      const dayName = t(dayKeys[day_of_week!])
      return t('recurrent.frequencyFormat.weekly', { day: dayName })
    }

    case 'monthly': {
      return t('recurrent.frequencyFormat.monthly', { day: day_of_month })
    }

    default:
      return frequency
  }
}

/**
 * Get day of week names for locale
 */
export function getDayOfWeekNames(t: TranslateFn): string[] {
  return [
    t('recurrent.days.sunday'),
    t('recurrent.days.monday'),
    t('recurrent.days.tuesday'),
    t('recurrent.days.wednesday'),
    t('recurrent.days.thursday'),
    t('recurrent.days.friday'),
    t('recurrent.days.saturday'),
  ]
}

/**
 * Get frequency options for dropdown
 */
export function getFrequencyOptions(t: TranslateFn) {
  return [
    { value: 'daily', label: t('recurrent.frequency.daily') },
    { value: 'weekly', label: t('recurrent.frequency.weekly') },
    { value: 'monthly', label: t('recurrent.frequency.monthly') },
  ]
}

/**
 * Validate recurrent transaction data
 */
export function validateRecurrentTransaction(
  data: {
    amount?: number
    frequency?: string
    day_of_week?: number | null
    day_of_month?: number | null
    start_date?: string
    end_date?: string | null
    category_id?: string | null
  },
  t: TranslateFn
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!data.amount || data.amount <= 0) {
    errors.push(t('forms.recurrent.validation.amountRequired'))
  }

  if (!data.category_id) {
    errors.push(t('forms.recurrent.validation.categoryRequired'))
  }

  if (!data.frequency) {
    errors.push(t('forms.recurrent.validation.frequencyRequired'))
  }

  if (data.frequency === 'weekly' && data.day_of_week == null) {
    errors.push(t('forms.recurrent.validation.dayOfWeekRequired'))
  }

  if (data.frequency === 'monthly' && data.day_of_month == null) {
    errors.push(t('forms.recurrent.validation.dayOfMonthRequired'))
  }

  if (data.frequency === 'monthly' && data.day_of_month) {
    if (data.day_of_month < 1 || data.day_of_month > 31) {
      errors.push(t('forms.recurrent.validation.dayOfMonthRange'))
    }
  }

  if (!data.start_date) {
    errors.push(t('forms.recurrent.validation.startDateRequired'))
  }

  if (data.start_date && data.end_date) {
    const startDate = new Date(data.start_date)
    const endDate = new Date(data.end_date)
    if (endDate < startDate) {
      errors.push(t('forms.recurrent.validation.endDateInvalid'))
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
