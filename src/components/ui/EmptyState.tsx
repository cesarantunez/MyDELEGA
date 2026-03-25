import { motion } from 'framer-motion'
import { Card } from './card'

interface EmptyStateProps {
  title: string
  subtitle?: string
  icon?: 'tasks' | 'checklist' | 'reports' | 'team'
}

function EmptyIllustration({ icon }: { icon: EmptyStateProps['icon'] }) {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Clipboard base */}
      <rect x="30" y="20" width="60" height="80" rx="8" fill="#ffffff08" stroke="#ffffff15" strokeWidth="1.5" />
      <rect x="45" y="14" width="30" height="12" rx="6" fill="#ffffff10" stroke="#ffffff20" strokeWidth="1.5" />

      {icon === 'tasks' && (
        <>
          <rect x="42" y="42" width="36" height="4" rx="2" fill="#FFE00030" />
          <rect x="42" y="54" width="28" height="4" rx="2" fill="#ffffff10" />
          <rect x="42" y="66" width="32" height="4" rx="2" fill="#ffffff10" />
          <circle cx="60" cy="85" r="8" fill="#FFE00015" stroke="#FFE00040" strokeWidth="1.5" />
          <path d="M56 85L59 88L64 82" stroke="#FFE000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}

      {icon === 'checklist' && (
        <>
          <rect x="40" y="40" width="8" height="8" rx="2" fill="#FF1F8E20" stroke="#FF1F8E50" strokeWidth="1" />
          <rect x="52" y="42" width="24" height="4" rx="2" fill="#ffffff10" />
          <rect x="40" y="56" width="8" height="8" rx="2" fill="#FF1F8E20" stroke="#FF1F8E50" strokeWidth="1" />
          <rect x="52" y="58" width="20" height="4" rx="2" fill="#ffffff10" />
          <rect x="40" y="72" width="8" height="8" rx="2" fill="#1B4FD820" stroke="#1B4FD850" strokeWidth="1" />
          <path d="M42 76L44.5 78.5L47 74" stroke="#1B4FD8" strokeWidth="1.2" strokeLinecap="round" />
          <rect x="52" y="74" width="26" height="4" rx="2" fill="#ffffff10" />
        </>
      )}

      {icon === 'reports' && (
        <>
          <rect x="40" y="75" width="8" height="15" rx="2" fill="#FFE00030" />
          <rect x="52" y="65" width="8" height="25" rx="2" fill="#FF1F8E30" />
          <rect x="64" y="55" width="8" height="35" rx="2" fill="#1B4FD830" />
          <rect x="76" y="45" width="8" height="45" rx="2" fill="#E31E2430" />
        </>
      )}

      {icon === 'team' && (
        <>
          <circle cx="52" cy="52" r="8" fill="#1B4FD820" stroke="#1B4FD840" strokeWidth="1.5" />
          <circle cx="68" cy="52" r="8" fill="#FF1F8E20" stroke="#FF1F8E40" strokeWidth="1.5" />
          <path d="M40 80C40 72 46 66 52 66" stroke="#1B4FD830" strokeWidth="1.5" />
          <path d="M80 80C80 72 74 66 68 66" stroke="#FF1F8E30" strokeWidth="1.5" />
        </>
      )}

      {(!icon || !['tasks', 'checklist', 'reports', 'team'].includes(icon)) && (
        <>
          <rect x="42" y="42" width="36" height="4" rx="2" fill="#FFE00030" />
          <rect x="42" y="54" width="28" height="4" rx="2" fill="#ffffff10" />
          <rect x="42" y="66" width="32" height="4" rx="2" fill="#ffffff10" />
        </>
      )}
    </svg>
  )
}

export default function EmptyState({ title, subtitle, icon = 'tasks' }: EmptyStateProps) {
  return (
    <Card className="text-center py-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-3"
      >
        <EmptyIllustration icon={icon} />
        <div>
          <p className="text-blanco/40 text-sm font-medium">{title}</p>
          {subtitle && <p className="text-blanco/20 text-xs mt-1">{subtitle}</p>}
        </div>
      </motion.div>
    </Card>
  )
}
