import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Clock3 } from 'lucide-react'

export function PageIntro({ eyebrow, title, description, children }: {
  eyebrow: string; title: string; description: string; children?: ReactNode
}) {
  return <header className="page-intro">
    <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="page-description">{description}</p></div>
    {children}
  </header>
}

export function Panel({ title, caption, action, children, className = '' }: {
  title: string; caption?: string; action?: ReactNode; children: ReactNode; className?: string
}) {
  return <section className={`panel ${className}`} aria-label={title}>
    <div className="panel-heading"><div><h2>{title}</h2>{caption && <p>{caption}</p>}</div>{action}</div>
    {children}
  </section>
}

export function UpcomingBadge() {
  return <span className="badge upcoming"><Clock3 size={12} aria-hidden="true" /> Upcoming</span>
}

export function EmptyState({ icon: Icon, title, description, children }: {
  icon: LucideIcon; title: string; description: string; children?: ReactNode
}) {
  return <div className="empty-state"><div className="empty-icon"><Icon size={26} strokeWidth={1.5} aria-hidden="true" /></div>
    <h3>{title}</h3><p>{description}</p>{children}
  </div>
}
