/**
 * Centralized font size tokens for consistent typography across all pages.
 *
 * Use these constants instead of hardcoded fontSize values in sx props.
 * To globally adjust font sizes, change the values here.
 */

export const fontSizes = {
  /** Tiny labels, chip text, micro-captions */
  xs: '0.65rem',
  /** Small metadata, secondary captions, context hints */
  sm: '0.75rem',
  /** Tab labels, small detail text */
  smMd: '0.8125rem',
  /** Default body text */
  base: '0.875rem',
  /** Slightly elevated body text, small headings */
  md: '1rem',
  /** Section sub-headings */
  lg: '1.125rem',
  /** Card titles, h5 */
  xl: '1.25rem',
  /** h4 equivalent */
  '2xl': '1.5rem',
  /** h3 equivalent */
  '3xl': '2rem',
  /** h2 equivalent */
  '4xl': '2.5rem',
} as const

export type FontSizeKey = keyof typeof fontSizes

/**
 * Convenience function for getting a font size from the scale.
 * Falls back to 'base' if the key is invalid.
 */
export function fs(key: FontSizeKey): string {
  return fontSizes[key] ?? fontSizes.base
}
