import type { RecurrentTransaction } from '@/types/database'

/**
 * Format recurrence frequency as human-readable string
 */
export function formatRecurrenceFrequency(
  recurrence: RecurrentTransaction,
  locale: string = 'pt-BR'
): string {
  const { frequency, day_of_week, day_of_month } = recurrence

  switch (frequency) {
    case 'daily':
      return locale === 'pt-BR' ? 'Diariamente' : 'Daily'

    case 'weekly': {
      const dayNames =
        locale === 'pt-BR'
          ? ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
          : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const dayName = dayNames[day_of_week!]
      return locale === 'pt-BR' ? `Toda ${dayName}` : `Every ${dayName}`
    }

    case 'monthly': {
      const daySuffix = locale === 'pt-BR' ? '' : getOrdinalSuffix(day_of_month!)
      return locale === 'pt-BR'
        ? `Todo dia ${day_of_month}`
        : `Every ${day_of_month}${daySuffix} of the month`
    }

    default:
      return frequency
  }
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 */
function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th'
  switch (day % 10) {
    case 1:
      return 'st'
    case 2:
      return 'nd'
    case 3:
      return 'rd'
    default:
      return 'th'
  }
}

/**
 * Get day of week names for locale
 */
export function getDayOfWeekNames(locale: string = 'pt-BR'): string[] {
  return locale === 'pt-BR'
    ? ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
    : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
}

/**
 * Get frequency options for dropdown
 */
export function getFrequencyOptions(locale: string = 'pt-BR') {
  return locale === 'pt-BR'
    ? [
        { value: 'daily', label: 'Diariamente' },
        { value: 'weekly', label: 'Semanalmente' },
        { value: 'monthly', label: 'Mensalmente' }
      ]
    : [
        { value: 'daily', label: 'Daily' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'monthly', label: 'Monthly' }
      ]
}

/**
 * Validate recurrent transaction data
 */
export function validateRecurrentTransaction(data: {
  amount?: number
  frequency?: string
  day_of_week?: number | null
  day_of_month?: number | null
  start_date?: string
  end_date?: string | null
  category_id?: string | null
}): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!data.amount || data.amount <= 0) {
    errors.push('O valor deve ser maior que zero')
  }

  if (!data.category_id) {
    errors.push('Selecione uma categoria')
  }

  if (!data.frequency) {
    errors.push('Selecione a frequência')
  }

  if (data.frequency === 'weekly' && data.day_of_week == null) {
    errors.push('Selecione o dia da semana')
  }

  if (data.frequency === 'monthly' && data.day_of_month == null) {
    errors.push('Selecione o dia do mês')
  }

  if (data.frequency === 'monthly' && data.day_of_month) {
    if (data.day_of_month < 1 || data.day_of_month > 31) {
      errors.push('Dia do mês deve estar entre 1 e 31')
    }
  }

  if (!data.start_date) {
    errors.push('Selecione a data de início')
  }

  if (data.start_date && data.end_date) {
    const startDate = new Date(data.start_date)
    const endDate = new Date(data.end_date)
    if (endDate < startDate) {
      errors.push('A data final deve ser posterior à data inicial')
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
