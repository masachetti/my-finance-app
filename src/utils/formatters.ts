import currency from 'currency.js'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/**
 * Format a number as Brazilian Real (R$) currency
 * @param amount - The amount to format
 * @returns Formatted currency string (e.g., "R$ 1.234,56")
 */
export function formatCurrency(amount: number): string {
  return currency(amount, {
    symbol: 'R$ ',
    decimal: ',',
    separator: '.',
    precision: 2
  }).format()
}

/**
 * Format a date string to PT-BR format
 * @param dateString - ISO date string (e.g., "2025-10-17")
 * @returns Formatted date string (e.g., "17/10/2025")
 */
export function formatDate(dateString: string): string {
  return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR })
}

/**
 * Format a month string (YYYY-MM) to PT-BR format
 * @param monthString - Month string in format "YYYY-MM" (e.g., "2025-10")
 * @returns Formatted month string (e.g., "10/2025")
 */
export function formatMonth(monthString: string): string {
  const [year, month] = monthString.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1, 1)
  return format(date, 'MM/yyyy', { locale: ptBR })
}
