import { 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  CardActionArea, 
  useTheme 
} from '@mui/material'
import SettingsIcon from '@mui/icons-material/Settings'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import PeopleIcon from '@mui/icons-material/People'
import PsychologyIcon from '@mui/icons-material/Psychology'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import { PageHeader } from '@/components/common'
import type { TabKey } from '@/components/layout/PrimaryShell'

interface ConfigTileProps {
  title: string
  description: string
  icon: React.ReactNode
  onClick: () => void
  color?: string
}

const ConfigTile = ({ title, description, icon, onClick, color }: ConfigTileProps) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  return (
    <Card 
      elevation={0}
      sx={{ 
        height: '100%',
        border: `1px solid ${theme.palette.divider}`,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: isDark 
            ? '0 12px 20px -10px rgba(0,0,0,0.5)' 
            : '0 12px 20px -10px rgba(0,0,0,0.1)',
          borderColor: color || theme.palette.primary.main,
          '& .icon-wrapper': {
            bgcolor: color || theme.palette.primary.main,
            color: '#fff',
          }
        }
      }}
    >
      <CardActionArea onClick={onClick} sx={{ height: '100%', p: 1 }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box 
            className="icon-wrapper"
            sx={{ 
              width: 48, 
              height: 48, 
              borderRadius: 1.15, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              color: color || theme.palette.primary.main,
              transition: 'all 0.2s ease-in-out',
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}

interface ConfigurationsPageProps {
  onNavigate: (tab: TabKey) => void
}

export default function ConfigurationsPage({ onNavigate }: ConfigurationsPageProps) {
  const configItems = [
    {
      key: 'workflows' as TabKey,
      title: 'Workflows',
      description: 'Design and manage automated approval paths and business processes.',
      icon: <AccountTreeIcon fontSize="large" />,
      color: '#3b82f6'
    },
    {
      key: 'teamadmin' as TabKey,
      title: 'Teams & Users',
      description: 'Manage administrative teams, memberships, and security assignments.',
      icon: <PeopleIcon fontSize="large" />,
      color: '#10b981'
    },
    {
      key: 'skills' as TabKey,
      title: 'Skills & Mapping',
      description: 'Define resource skills and manage proficiency levels across the organization.',
      icon: <PsychologyIcon fontSize="large" />,
      color: '#8b5cf6'
    },
    {
      key: 'holidays' as TabKey,
      title: 'Holiday Calendar',
      description: 'Configure official public holidays and non-working periods for scheduling.',
      icon: <CalendarMonthIcon fontSize="large" />,
      color: '#f59e0b'
    }
  ]

  return (
    <Box>
      <PageHeader 
        title="System Configurations" 
        subtitle="Manage global system settings, business rules, and administrative structures."
        caption="Configuration Dashboard"
      />

      <Grid container spacing={3} sx={{ mt: 1 }}>
        {configItems.map((item) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.key}>
            <ConfigTile 
              title={item.title}
              description={item.description}
              icon={item.icon}
              onClick={() => onNavigate(item.key)}
              color={item.color}
            />
          </Grid>
        ))}
        
        {/* Future Expansion Placeholder */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card 
            elevation={0}
            sx={{ 
              height: '100%',
              border: `1px dashed ${useTheme().palette.divider}`,
              bgcolor: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 4
            }}
          >
            <Typography variant="body2" color="text.disabled" align="center">
              Additional configuration modules will appear here as they are implemented.
            </Typography>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
