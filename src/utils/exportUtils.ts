export interface ExportColumn {
  key: string
  label: string
  format?: (value: any, row: any) => string
}

export function exportToCsv(filename: string, columns: ExportColumn[], data: any[]): void {
  if (!data.length) return

  const header = columns.map((col) => '"' + col.label + '"').join(',')
  const rows = data.map((row) =>
    columns
      .map((col) => {
        let value: any
        if (col.format) {
          value = col.format(row[col.key], row)
        } else {
          value = row[col.key]
        }
        if (value == null || value === '') return '""'
        const str = String(value)
        return '"' + str.replace(/"/g, '""') + '"'
      })
      .join(',')
  )
  const csv = [header, ...rows].join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename.replace(/[^a-zA-Z0-9_-]/g, '_') + '.csv'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
}
