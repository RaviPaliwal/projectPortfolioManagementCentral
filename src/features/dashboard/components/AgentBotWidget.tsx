import React, { useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Fab,
  Zoom,
  Tooltip
} from '@mui/material'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import CloseIcon from '@mui/icons-material/Close'
import ForumIcon from '@mui/icons-material/Forum'

export default function AgentBotWidget() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Floating Chat Container */}
      <Zoom in={isOpen}>
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            bottom: 96,
            right: 24,
            width: 400,
            height: 600,
            zIndex: 1300,
            borderRadius: '16px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.1)',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              p: 2,
              bgcolor: 'background.paper',
              borderBottom: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SmartToyIcon sx={{ color: 'secondary.main' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                AI Copilot
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setIsOpen(false)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Body */}
          <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative', bgcolor: 'background.default' }}>
            <iframe
              src="https://copilotstudio.microsoft.com/environments/b13877a6-5201-e4ef-8d74-878957333982/bots/cr0b5_commonagent_DUZ8WI/canvas?__version__=2&enableFileAttachment=false&cliAgent=true"
              frameBorder="0"
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="AI Agent Widget Canvas"
            />
          </Box>
        </Paper>
      </Zoom>

      {/* Floating Action Button (FAB) */}
      <Tooltip title={isOpen ? 'Close AI Copilot' : 'Open AI Copilot'} placement="left">
        <Fab
          color="secondary"
          aria-label="chat"
          onClick={() => setIsOpen(!isOpen)}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1301,
            boxShadow: '0 6px 16px rgba(139, 92, 246, 0.3)',
            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            '&:hover': {
              transform: 'scale(1.1) rotate(5deg)',
            }
          }}
        >
          {isOpen ? <CloseIcon /> : <ForumIcon />}
        </Fab>
      </Tooltip>
    </>
  )
}
