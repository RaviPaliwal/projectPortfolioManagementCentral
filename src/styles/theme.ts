import { createTheme, type PaletteMode, type ThemeOptions } from '@mui/material'
import { fontSizes } from './fontSizes'
import { colors } from './colors'

const palette = {
  primary: colors.primary,
  secondary: colors.secondary,
  success: colors.success,
  warning: colors.warning,
  error: colors.error,
  info: colors.info,
}

export const getTheme = (mode: PaletteMode) =>
  createTheme({
    palette: {
      mode,
      ...palette,
      background: {
        default: mode === 'light' ? '#f8f9fa' : '#0b0f19',
        paper: mode === 'light' ? '#ffffff' : '#111827',
      },
      text: {
        primary: mode === 'light' ? '#0f172a' : '#e2e8f0',
        secondary: mode === 'light' ? '#64748b' : '#94a3b8',
      },
      divider: mode === 'light' ? '#e5e7eb' : '#1f2937',
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      fontSize: 14, // base = 0.875rem
      h1: { fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontWeight: 900, letterSpacing: '-0.03em', fontSize: fontSizes['4xl'] },
      h2: { fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontWeight: 800, letterSpacing: '-0.02em', fontSize: fontSizes['3xl'] },
      h3: { fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontWeight: 700, letterSpacing: '-0.02em', fontSize: fontSizes['2xl'] },
      h4: { fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontWeight: 700, letterSpacing: '-0.01em', fontSize: fontSizes['xl'] },
      h5: { fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontWeight: 600, letterSpacing: '-0.01em', fontSize: fontSizes['lg'] },
      h6: { fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontWeight: 600, letterSpacing: '-0.01em' },
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
            borderRadius: '12px',
            border: `1px solid ${mode === 'light' ? '#e5e7eb' : '#1f2937'}`,
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            backgroundColor: mode === 'light' ? '#ffffff' : '#111827',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: '12px',
            padding: '8px 20px',
            fontSize: fontSizes.smMd,
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 700,
            fontSize: fontSizes.xs,
            borderRadius: '9999px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }
        }
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: '12px',
            backdropFilter: 'blur(16px)',
            backgroundColor: mode === 'dark' ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.97)',
            boxShadow: mode === 'dark' ? '0 25px 50px -12px rgba(0, 0, 0, 0.7)' : '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
            border: `1px solid ${mode === 'dark' ? '#1f2937' : '#e5e7eb'}`,
          }
        }
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backdropFilter: 'blur(16px)',
            backgroundColor: mode === 'dark' ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.97)',
            borderLeft: `1px solid ${mode === 'dark' ? '#1f2937' : '#e5e7eb'}`,
          }
        }
      },
      MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600, fontSize: fontSizes.smMd } } },
      MuiTableCell: { styleOverrides: { root: { fontSize: fontSizes.sm } } },
      MuiInputBase: { styleOverrides: { root: { fontSize: fontSizes.base } } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: '12px',
            backgroundColor: mode === 'light' ? '#f3f4f6' : '#1f2937',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            '& .MuiOutlinedInput-notchedOutline': {
              borderWidth: '1px',
              borderColor: 'transparent',
            },
            '&:hover': {
              backgroundColor: mode === 'light' ? '#e5e7eb' : '#2d3748',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'transparent',
              },
            },
            '&.Mui-focused': {
              backgroundColor: mode === 'light' ? '#ffffff' : '#111827',
              boxShadow: mode === 'light' ? '0 0 0 3px rgba(33, 124, 53, 0.1)' : '0 0 0 3px rgba(33, 124, 53, 0.25)',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#217C35',
                borderWidth: '1.5px',
              },
            },
          },
          input: {
            padding: '8px 16px',
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            fontSize: fontSizes.base,
            '&.Mui-focused': {
              color: '#217C35',
            },
          },
          outlined: {
            transform: 'translate(14px, 8px) scale(1)',
            '&.MuiInputLabel-shrink': {
              transform: 'translate(14px, -9px) scale(0.75)',
              backgroundColor: mode === 'light' ? '#ffffff' : '#111827',
              padding: '0 6px',
            },
          },
          sizeSmall: {
            transform: 'translate(14px, 8px) scale(1)',
            '&.MuiInputLabel-shrink': {
              transform: 'translate(14px, -9px) scale(0.75)',
              backgroundColor: mode === 'light' ? '#ffffff' : '#111827',
              padding: '0 6px',
            },
          },
        },
      },
      MuiFormLabel: {
        styleOverrides: {
          root: {
            '&.Mui-focused': {
              color: '#217C35',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: '12px',
          },
          rounded: {
            borderRadius: '12px',
          },
        },
      },
      MuiCssBaseline: {
        styleOverrides: {
          '.recharts-wrapper, .recharts-surface, .recharts-responsive-container, .recharts-default-tooltip': {
            outline: 'none !important',
          },
        },
      },
    },
  })
