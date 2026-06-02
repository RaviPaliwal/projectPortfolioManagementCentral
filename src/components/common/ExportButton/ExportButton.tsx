import { Button } from '@mui/material'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import type { ExportColumn } from '@/utils/exportUtils'
import { exportToCsv } from '@/utils/exportUtils'

export interface ExportButtonProps {
  filename: string
  columns: ExportColumn[]
  data: any[]
  disabled?: boolean
  label?: string
}

export function ExportButton({ filename, columns, data, disabled, label = 'Export CSV' }: ExportButtonProps) {
  return (
    <Button
      variant="outlined"
      startIcon={<FileDownloadIcon />}
      onClick={() => exportToCsv(filename, columns, data)}
      disabled={disabled || !data.length}
      size="small"
      sx={{ borderRadius: 1.15, fontWeight: 600, whiteSpace: 'nowrap' }}
    >
      {label}
    </Button>
  )
}

export default ExportButton
