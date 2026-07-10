import React from 'react'
import { Box, Paper, Typography } from '@mui/material'

export default function AIAgentPage() {
  return (
    <Box sx={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          AI Agent
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{ flex: 1, overflow: 'hidden', borderRadius: 2, bgcolor: 'background.paper', position: 'relative' }}>
        <iframe
          src="https://copilotstudio.microsoft.com/environments/b13877a6-5201-e4ef-8d74-878957333982/bots/cr0b5_commonagent_DUZ8WI/canvas?__version__=2&enableFileAttachment=false&cliAgent=true"
          frameBorder="0"
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="AI Agent Canvas"
        />
      </Paper>
    </Box>
  )
}
