// Centralized Color Configuration for the Project

export const colors = {
  // Theme Palette Colors
  primary: {
    main: '#217C35', // Primary Forest Green
    light: '#2A9943',
    dark: '#135E23',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#E4621A', // Secondary Orange
    light: '#F07C3A',
    dark: '#B9490C',
    contrastText: '#ffffff',
  },
  success: {
    main: '#217C35', // Standard Forest Green (used for success, low risk, on track)
    light: '#2A9943',
    dark: '#135E23',
    contrastText: '#ffffff',
  },
  warning: {
    main: '#d97706', // Amber (medium risk)
    light: '#fbbf24',
    dark: '#b45309',
    contrastText: '#ffffff',
  },
  error: {
    main: '#ef4444', // Red (high risk, over-budget)
    light: '#f87171',
    dark: '#dc2626',
    contrastText: '#ffffff',
  },
  info: {
    main: '#3b82f6', // Blue (used for projects, info metrics, approved budget in financials)
    light: '#60a5fa',
    dark: '#2563eb',
    contrastText: '#ffffff',
  },

  // RAG Mappings
  rag: {
    green: '#217C35', // Standard Forest Green
    amber: '#f59e0b',
    red: '#ef4444',
  },
  
  // Custom Financial Colors to avoid green clashing
  financials: {
    approved: '#217C35', // Standard Forest Green for Approved Budget
    actual: '#E4621A',   // Secondary Orange for Actual Spend
    variance: '#3b82f6', // Info Blue for remaining balance/positive variance
  }
}
