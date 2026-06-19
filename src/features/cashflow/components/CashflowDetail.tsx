import { Box, Typography, Grid, Divider } from '@mui/material'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import { currencyFormatter, formatDate } from '@/utils/formatters'
import type { CashflowEntryModel } from '@/types/dataverse'
import { DIRECTION_LABELS, TXN_TYPE_LABELS, CATEGORY_LABELS } from '../constants'

interface CashflowDetailProps {
  entry: CashflowEntryModel
}

export const CashflowDetail: React.FC<CashflowDetailProps> = ({ entry }) => {
  return (
    <Box sx={{ p: 1 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <ReceiptLongIcon sx={{ fontSize: 18, color: 'primary.main' }} />
        Entry Details
      </Typography>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 6 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Amount (EUR)</Typography>
          <Typography variant="body2" sx={{ 
            fontWeight: 700, 
            fontSize: '1.1rem',
            color: String(entry.pm_transactiondirection) === '1' ? 'success.main' : 'error.main'
          }}>
            {currencyFormatter.format(entry.pm_amounteur ?? 0)}
          </Typography>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Transaction Date</Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatDate(entry.pm_transactiondate)}</Typography>
        </Grid>

        <Grid size={{ xs: 12 }}><Divider /></Grid>

        <Grid size={{ xs: 6 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Direction</Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {DIRECTION_LABELS[String(entry.pm_transactiondirection ?? '')] || '—'}
          </Typography>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Transaction Type</Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {TXN_TYPE_LABELS[String(entry.pm_transactiontype ?? '')] || '—'}
          </Typography>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Category</Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {CATEGORY_LABELS[String(entry.pm_category ?? '')] || '—'}
          </Typography>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Invoice Number</Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{entry.pm_invoicenumber || '—'}</Typography>
        </Grid>

        <Grid size={{ xs: 12 }}><Divider /></Grid>

        <Grid size={{ xs: 12 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Description</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
            {entry.pm_description || 'No description provided.'}
          </Typography>
        </Grid>

        <Grid size={{ xs: 12 }}><Divider /></Grid>

        <Grid size={{ xs: 6 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Programme</Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{entry.pm_programmelookupname || '—'}</Typography>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Project</Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{entry.pm_projectname || '—'}</Typography>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Financial Period</Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{entry.pm_fiscalperiodname || '—'}</Typography>
        </Grid>
      </Grid>
    </Box>
  )
}
