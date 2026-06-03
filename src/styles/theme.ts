import { createTheme, type PaletteMode, type ThemeOptions } from '@mui/material'
import { fontSizes } from './fontSizes'

const palette = {
  primary: { main: '#0ea5e9', light: '#38bdf8', dark: '#0284c7', contrastText: '#ffffff' },
  secondary: { main: '#8b5cf6', light: '#a78bfa', dark: '#7c3aed', contrastText: '#ffffff' },
  success: { main: '#22c55e', light: '#4ade80', dark: '#16a34a', contrastText: '#ffffff' },
  warning: { main: '#f59e0b', light: '#fbbf24', dark: '#d97706', contrastText: '#ffffff' },
  error: { main: '#ef4444', light: '#f87171', dark: '#dc2626', contrastText: '#ffffff' },
  info: { main: '#0ea5e9', light: '#38bdf8', dark: '#0284c7', contrastText: '#ffffff' },
}

export const getTheme = (mode: PaletteMode) =>
  createTheme({
    palette: {
      mode,
      ...palette,
      background: {
        default: mode === 'light' ? '#f8fafc' : '#0f172a',
        paper: mode === 'light' ? '#ffffff' : '#1e293b',
      },
      text: {
        primary: mode === 'light' ? '#0f172a' : '#f8fafc',
        secondary: mode === 'light' ? '#64748b' : '#94a3b8',
      },
      divider: mode === 'light' ? '#e2e8f0' : '#334155',
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      fontSize: 14, // base = 0.875rem
      h1: { fontFamily: "'Outfit', system-ui, sans-serif", fontWeight: 700, letterSpacing: '-0.02em', fontSize: fontSizes['4xl'] },
      h2: { fontFamily: "'Outfit', system-ui, sans-serif", fontWeight: 700, letterSpacing: '-0.01em', fontSize: fontSizes['3xl'] },
      h3: { fontFamily: "'Outfit', system-ui, sans-serif", fontWeight: 600, fontSize: fontSizes['2xl'] },
      h4: { fontFamily: "'Outfit', system-ui, sans-serif", fontWeight: 600, fontSize: fontSizes['xl'] },
      h5: { fontFamily: "'Outfit', system-ui, sans-serif", fontWeight: 600, fontSize: fontSizes['lg'] },
      h6: { fontFamily: "'Outfit', system-ui, sans-serif", fontWeight: 600 },
      subtitle1: { fontSize: fontSizes['base'] },
      subtitle2: { fontSize: fontSizes['sm'] },
      body1: { fontSize: fontSizes['base'] },
      body2: { fontSize: fontSizes['sm'] },
      caption: { fontSize: fontSizes['xs'] },
    } as ThemeOptions['typography'],
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 1.155 * 12,
            border: `1px solid ${mode === 'light' ? '#e2e8f0' : '#334155'}`,
            transition: 'all 0.2s ease-in-out',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 600, borderRadius: 1.155 * 12, padding: '8px 20px', fontSize: fontSizes.smMd },
        },
      },
      MuiChip: { styleOverrides: { root: { fontWeight: 600, fontSize: fontSizes.sm, borderRadius: 1.155 * 12 } } },
      MuiDialog: { styleOverrides: { paper: { borderRadius: 1.155 * 12 } } },
      MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600, fontSize: fontSizes.smMd } } },
      MuiTableCell: { styleOverrides: { root: { fontSize: fontSizes.sm } } },
      MuiInputBase: { styleOverrides: { root: { fontSize: fontSizes.base, borderRadius: 1.155 * 12 } } },
      MuiPaper: { styleOverrides: { rounded: { borderRadius: 1.155 * 12 } } },
    },
  })
