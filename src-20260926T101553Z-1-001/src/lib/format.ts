export const dateTime = (value?: string | null) => value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'
export const shortDate = (value?: string | null) => value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(value)) : '—'
export const initials = (name?: string | null) => (name || 'User').split(' ').filter(Boolean).slice(0,2).map(p => p[0]).join('').toUpperCase()
