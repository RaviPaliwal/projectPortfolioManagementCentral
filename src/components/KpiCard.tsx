import React from 'react'

interface KpiCardProps {
  title: string
  value: React.ReactNode
  subtitle?: string
  accent?: 'teal' | 'red' | 'blue' | 'amber'
}

export default function KpiCard({ title, value, subtitle, accent = 'blue' }: KpiCardProps) {
  return (
    <div className={`kpi-card accent-${accent}`}>
      <div className="kpi-label">{title}</div>
      <div className="kpi-value">{value}</div>
      {subtitle ? <div className="kpi-sub">{subtitle}</div> : null}
    </div>
  )
}
