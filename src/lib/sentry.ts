import * as Sentry from '@sentry/react'

export function initSentry() {
  if (!import.meta.env.VITE_SENTRY_DSN) return
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    // Don't track demo/test sessions
    beforeSend(event) {
      if (event.user?.email?.includes('test')) return null
      return event
    },
  })
}

export { Sentry }
