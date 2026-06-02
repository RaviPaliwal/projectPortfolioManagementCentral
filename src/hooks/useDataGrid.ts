import { useState, useMemo, useCallback } from 'react'

export interface SortState<T> {
  field: keyof T | string
  dir: 'asc' | 'desc'
}

export interface UseDataGridOptions<T> {
  initialSort?: SortState<T>
  initialRowsPerPage?: number
  searchFields?: Array<keyof T>
  filterFn?: (item: T) => boolean
}

export function useDataGrid<T>(data: T[], options: UseDataGridOptions<T> = {}) {
  const {
    initialSort = { field: '', dir: 'asc' },
    initialRowsPerPage = 25,
    searchFields = [],
    filterFn,
  } = options

  const [searchQuery, setSearchQuery] = useState('')
  const [sort, setSort] = useState<SortState<T>>(initialSort)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage)

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query)
    setPage(0)
  }, [])

  const handleSort = useCallback((field: keyof T | string) => {
    setSort((prev) => ({
      field,
      dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc',
    }))
  }, [])

  const handleChangePage = useCallback((_: unknown, newPage: number) => {
    setPage(newPage)
  }, [])

  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }, [])

  const filteredData = useMemo(() => {
    let result = [...data]

    // Search
    if (searchQuery.trim() && searchFields.length > 0) {
      const q = searchQuery.toLowerCase()
      result = result.filter((item) =>
        searchFields.some((field) => {
          const val = item[field]
          return val != null && String(val).toLowerCase().includes(q)
        })
      )
    }

    // Custom Filter
    if (filterFn) {
      result = result.filter(filterFn)
    }

    // Sort
    if (sort.field) {
      result.sort((a: any, b: any) => {
        const valA = a[sort.field]
        const valB = b[sort.field]

        if (valA == null) return sort.dir === 'asc' ? 1 : -1
        if (valB == null) return sort.dir === 'asc' ? -1 : 1

        let cmp = 0
        if (typeof valA === 'number' && typeof valB === 'number') {
          cmp = valA - valB
        } else {
          cmp = String(valA).localeCompare(String(valB))
        }

        return sort.dir === 'asc' ? cmp : -cmp
      })
    }

    return result
  }, [data, searchQuery, searchFields, filterFn, sort])

  const paginatedData = useMemo(() => {
    const start = page * rowsPerPage
    return filteredData.slice(start, start + rowsPerPage)
  }, [filteredData, page, rowsPerPage])

  const reset = useCallback(() => {
    setSearchQuery('')
    setPage(0)
    setSort(initialSort)
  }, [initialSort])

  return {
    searchQuery,
    setSearchQuery: handleSearchChange,
    sort,
    setSort: handleSort,
    page,
    setPage: handleChangePage,
    rowsPerPage,
    setRowsPerPage: handleChangeRowsPerPage,
    filteredData,
    paginatedData,
    totalCount: data.length,
    filteredCount: filteredData.length,
    reset,
  }
}

export default useDataGrid
