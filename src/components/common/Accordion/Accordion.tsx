import { useState } from 'react'
import Typography from '@mui/material/Typography'
import MuiAccordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import type { AccordionProps as MuiAccordionProps } from '@mui/material/Accordion'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

export interface AccordionItem {
  id: string | number
  title: string
  content: React.ReactNode
  disabled?: boolean
}

export interface AccordionProps extends Omit<MuiAccordionProps, 'children' | 'defaultExpanded'> {
  items: AccordionItem[]
  defaultExpanded?: string | number
  allowMultiple?: boolean
}

export const Accordion: React.FC<AccordionProps> = ({
  items,
  defaultExpanded,
  allowMultiple = false,
  ...props
}) => {
  const [expanded, setExpanded] = useState<string | number | false>(
    defaultExpanded || false
  )

  const handleChange = (itemId: string | number) => (
    _event: React.SyntheticEvent,
    isExpanded: boolean
  ) => {
    if (allowMultiple) {
      setExpanded(isExpanded ? itemId : false)
    } else {
      setExpanded(isExpanded ? itemId : false)
    }
  }

  return (
    <div>
      {items.map((item) => (
        <MuiAccordion
          key={item.id}
          expanded={expanded === item.id}
          onChange={handleChange(item.id)}
          disabled={item.disabled}
          disableGutters
          elevation={0}
          sx={{
            borderRadius: '14px', // Standard for the project (approx 1.155 * 12)
            mb: 1.5,
            border: (theme) => `1px solid ${theme.palette.divider}`,
            '&:before': { display: 'none' },
            '&.Mui-expanded': { borderRadius: '14px' },
            overflow: 'hidden',
            '&:first-of-type': { borderTopLeftRadius: '14px', borderTopRightRadius: '14px' },
            '&:last-of-type': { borderBottomLeftRadius: '14px', borderBottomRightRadius: '14px' },
          }}
          {...props}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {item.title}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            {typeof item.content === 'string' ? (
              <Typography variant="body2">{item.content}</Typography>
            ) : (
              item.content
            )}
          </AccordionDetails>
        </MuiAccordion>
      ))}
    </div>
  )
}

export default Accordion
