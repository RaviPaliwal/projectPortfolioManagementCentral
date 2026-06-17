export const BUSINESS_UNITS = [
  'Finance',
  'Information Technology',
  'Human Resources',
  'Operations',
  'Sales & Marketing',
  'Research & Development',
  'Legal & Compliance',
  'Executive Office',
] as const

export type BusinessUnit = (typeof BUSINESS_UNITS)[number]
