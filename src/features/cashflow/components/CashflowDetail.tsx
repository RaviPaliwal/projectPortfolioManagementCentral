import { Box, Typography, Grid, Divider, Paper } from '@mui/material'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import { formatDate } from '@/utils/formatters'
import type { CashflowEntryModel } from '@/types/dataverse'
import { DIRECTION_LABELS, TXN_TYPE_LABELS, CATEGORY_LABELS } from '../constants'

interface CashflowDetailProps {
  entry: CashflowEntryModel
}

const euroFormatter = new Intl.NumberFormat('en-IE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

export const CashflowDetail: React.FC<CashflowDetailProps> = ({ entry }) => {
  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 1.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 3, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5, fontSize: '0.75rem' }}>
        <ReceiptLongIcon sx={{ fontSize: 18, color: 'primary.main' }} />
        Entry Details
      </Typography>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 6 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>Amount (EUR)</Typography>
          <Typography variant="body2" sx={{
            fontWeight: 800,
            fontSize: '1.2rem',
            fontFamily: '"JetBrains Mono", monospace',
            color: String(entry.pm_transactiondirection) === '1' ? 'success.main' : 'error.main'
          }}>
            {euroFormatter.format(entry.pm_amounteur ?? 0)}
          </Typography>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>Transaction Date</Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatDate(entry.pm_transactiondate)}</Typography>
        </Grid>

        <Grid size={{ xs: 12 }}><Divider /></Grid>

        <Grid size={{ xs: 6 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>Direction</Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {DIRECTION_LABELS[String(entry.pm_transactiondirection ?? '')] || '—'}
          </Typography>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>Transaction Type</Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {TXN_TYPE_LABELS[String(entry.pm_transactiontype ?? '')] || '—'}
          </Typography>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>Category</Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {CATEGORY_LABELS[String(entry.pm_category ?? '')] || '—'}
          </Typography>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>Invoice Number</Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>{entry.pm_invoicenumber || '—'}</Typography>
        </Grid>

        <Grid size={{ xs: 12 }}><Divider /></Grid>

        <Grid size={{ xs: 12 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>Description</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
            {entry.pm_description || 'No description provided.'}
          </Typography>
        </Grid>

        <Grid size={{ xs: 12 }}><Divider /></Grid>

        <Grid size={{ xs: 6 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>Programme</Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{entry.pm_programmelookupname || '—'}</Typography>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>Project</Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{entry.pm_projectname || '—'}</Typography>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>Financial Period</Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{entry.pm_fiscalperiodname || '—'}</Typography>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>Budget Line</Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{entry.pm_budgetlinename || '—'}</Typography>
        </Grid>
      </Grid>
    </Paper>
  )
}
