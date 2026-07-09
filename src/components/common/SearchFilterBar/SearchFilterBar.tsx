import { Box, TextField, InputAdornment, Button, FormControl, InputLabel, Select, MenuItem } from '@mui/material'
import type { SxProps, Theme } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import type { ReactNode } from 'react'
import { fontSizes } from '../../../styles'

export interface FilterOption {
  value: string
  label: string
}

export interface SearchFilterBarProps {
  searchQuery?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  /** Optional filter dropdown */
  filterValue?: string
  onFilterChange?: (value: string) => void
  filterLabel?: string
  filterOptions?: FilterOption[]
  /** Secondary filter dropdown */
  secondaryFilterValue?: string
  onSecondaryFilterChange?: (value: string) => void
  secondaryFilterLabel?: string
  secondaryFilterOptions?: FilterOption[]
  /** Extra filter elements to render after the main filter */
  extraFilters?: ReactNode
  /** If search or filter is active, show clear button */
  onClear?: () => void
  /** If true, show clear button even when no filters active */
  showClear?: boolean
  /** MUI SxProps */
  sx?: SxProps<Theme>
}

export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  searchQuery = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  filterValue,
  onFilterChange,
  filterLabel,
  filterOptions,
  secondaryFilterValue,
  onSecondaryFilterChange,
  secondaryFilterLabel,
  secondaryFilterOptions,
  extraFilters,
  onClear,
  showClear,
  sx,
}) => {
  const hasFilters = searchQuery || (filterValue && filterValue !== 'all' && filterValue !== '') || (secondaryFilterValue && secondaryFilterValue !== 'all' && secondaryFilterValue !== '') || showClear

  return (
    <Box
      sx={{
        px: 2.5,
        py: 2,
        borderBottom: 1,
        borderColor: 'divider',
        display: 'flex',
        gap: 2,
        flexWrap: 'wrap',
        alignItems: 'center',
        ...sx,
      }}
    >
      {onSearchChange && (
        <TextField
          size="small"
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                </InputAdornment>
              ),
              sx: { borderRadius: 1.15, fontSize: fontSizes.base },
            },
          }}
          sx={{ flex: '1 1 260px', maxWidth: 420 }}
        />
      )}

      {filterOptions && onFilterChange && filterLabel && (
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>{filterLabel}</InputLabel>
          <Select
            value={filterValue ?? ''}
            label={filterLabel}
            onChange={(e) => onFilterChange(e.target.value)}
            sx={{ borderRadius: 1.15, fontSize: fontSizes.base }}
          >
            {filterOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {secondaryFilterOptions && onSecondaryFilterChange && secondaryFilterLabel && (
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>{secondaryFilterLabel}</InputLabel>
          <Select
            value={secondaryFilterValue ?? ''}
            label={secondaryFilterLabel}
            onChange={(e) => onSecondaryFilterChange(e.target.value)}
            sx={{ borderRadius: 1.15, fontSize: fontSizes.base }}
          >
            {secondaryFilterOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {extraFilters}

      {hasFilters && onClear && (
        <Button size="small" variant="text" onClick={onClear} sx={{ whiteSpace: 'nowrap' }}>
          Clear filters
        </Button>
      )}
    </Box>
  )
}

export default SearchFilterBar
