const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

function parseDate(value: string | Date) {
  if (value instanceof Date) return value
  return new Date(DATE_ONLY.test(value) ? `${value}T00:00:00` : value)
}

export function formatDate(value?: string | Date | null) {
  if (!value) return ''
  const date = parseDate(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

export function formatDateTime(value?: string | Date | null) {
  if (!value) return ''
  const date = parseDate(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${formatDate(date)} at ${new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(date)}`
}

export function todayInputValue() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
