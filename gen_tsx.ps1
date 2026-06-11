Set-Content -Path src/features/timesheets/components/TimesheetApprovalTaskModal.tsx -Value @"
import React, { useState, useEffect, useCallback, type ComponentType } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Box, Typography,
  IconButton, CircularProgress, Divider, Chip, Paper, Table, TableBody,
  TableCell, TableHead, TableRow,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import EventNoteIcon from '@mui/icons-material/EventNote'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import PersonIcon from '@mui/icons-material/Person'
import DateRangeIcon from '@mui/icons-material/DateRange'
import ChecklistRtlIcon from '@mui/icons-material/ChecklistRtl'
import { fetchTimesheetDetails, fetchTimesheetEntries } from '@/services/timesheet.service'
import type { TimesheetModel, TimesheetEntryModel } from '@/types/dataverse'
import { StatusTag } from '@/components/common'
import type { DecisionBoxProps } from '@/components/common/DecisionBox/DecisionBox'
import { TIMESHEET_STATUS_LABELS, TIMESHEET_STATUS_COLORS } from '@/constants/mappings'
"@