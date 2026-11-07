export type Theme = 'light' | 'dark'
export const THEME_KEY = 'cpu-scheduling-lab-theme'

export function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'dark' || stored === 'light') return stored
  } catch { /* The interface remains usable when browser storage is unavailable. */ }
  return 'dark'
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  try { localStorage.setItem(THEME_KEY, theme) } catch { /* Storage is optional. */ }
}
