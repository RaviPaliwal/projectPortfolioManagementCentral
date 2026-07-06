import React from 'react';
import { Table, TableBody, TableCell, TableRow, Paper, Box, TablePagination } from '@mui/material';
import { TableShell, SearchFilterBar, ExportButton, TableHeader } from '@/components/common';
import { useDataGrid, type SortState } from '@/hooks/useDataGrid';
import type { ReactNode } from 'react';

export interface Column<T> {
  key: keyof T | string;
  label: string;
  align?: 'left' | 'right' | 'center';
  format?: (value: any, item: T) => ReactNode;
  width?: string | number;
}

export interface DataverseTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  searchPlaceholder?: string;
  searchFields?: Array<keyof T>;
  emptyIcon?: ReactNode;
  emptyTitle?: string;
  onRowClick?: (item: T) => void;
  actions?: (item: T) => ReactNode;
  exportFileName?: string;
  extraHeaderActions?: ReactNode;
  extraFilters?: ReactNode;
  onClearFilters?: () => void;
  showExport?: boolean;
  minHeight?: number | string;
  maxHeight?: string;
  variant?: 'elevation' | 'outlined' | 'flat';
}

export function DataverseTable<T extends Record<string, any>>({
  data,
  columns,
  loading,
  searchPlaceholder = 'Search...',
  searchFields = [],
  emptyIcon,
  emptyTitle,
  onRowClick,
  actions,
  exportFileName = 'export',
  extraHeaderActions,
  extraFilters,
  onClearFilters,
  showExport = true,
  minHeight,
  maxHeight,
  variant = 'elevation',
}: DataverseTableProps<T>) {
  const {
    searchQuery,
    setSearchQuery,
    sort,
    setSort,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    paginatedData,
    filteredCount,
    reset,
  } = useDataGrid(data, {
    searchFields,
    initialRowsPerPage: 10,
  });

  const handleClear = () => {
    reset();
    onClearFilters?.();
  };

  return (
    <Paper 
      elevation={variant === 'elevation' ? 1 : 0} 
      variant={variant === 'outlined' ? 'outlined' : 'elevation'}
      sx={{ 
        overflow: 'hidden', 
        mb: 3, 
        borderRadius: variant === 'flat' ? 0 : 2,
        bgcolor: variant === 'flat' ? 'transparent' : 'background.paper',
        border: variant === 'flat' ? 'none' : undefined,
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
      }}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderBottom: 1, borderColor: 'divider' }}>
        <SearchFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={searchPlaceholder}
          extraFilters={extraFilters}
          onClear={handleClear}
          sx={{ flex: 1, p: 0, border: 'none' }}
        />
        <Box sx={{ display: 'flex', gap: 1 }}>
          {extraHeaderActions}
          {showExport && (
            <ExportButton
              data={data}
              columns={columns.map(c => ({ key: c.key as string, label: c.label }))}
              filename={exportFileName}
            />
          )}
        </Box>
      </Box>

      <TableShell
        loading={loading}
        empty={data.length === 0}
        emptyIcon={emptyIcon}
        emptyTitle={emptyTitle}
        minHeight={minHeight}
        maxHeight={maxHeight}
        sx={{ flexGrow: 1 }}
      >
        <Table size="small">
          <TableHeader
            cells={[
              ...columns.map((col) => ({ label: col.label, align: col.align as 'left'|'right'|'center'|undefined, width: col.width })),
              ...(actions ? [{ label: 'Actions', align: 'right' as const }] : []),
            ]}
          />
          <TableBody>
            {paginatedData.map((item, idx) => {
              const idKey = Object.keys(item).find(k => k.endsWith('id')) || 'id';
              const id = item[idKey] || idx;

              return (
                <TableRow
                  key={id}
                  hover
                  onClick={() => onRowClick?.(item)}
                  sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key as string} align={col.align}>
                      {col.format ? col.format(item[col.key], item) : item[col.key]}
                    </TableCell>
                  ))}
                  {actions && (
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      {actions(item)}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableShell>

      <TablePagination
        component="div"
        count={filteredCount}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={(_, newPage) => setPage(_, newPage)}
        onRowsPerPageChange={(event) => setRowsPerPage(event as React.ChangeEvent<HTMLInputElement>)}
        rowsPerPageOptions={[10, 25, 50, 100]}
        sx={{
          '.MuiTablePagination-toolbar': { minHeight: 48 },
          '.MuiTablePagination-select': { py: 0 },
        }}
      />
    </Paper>
  );
}
