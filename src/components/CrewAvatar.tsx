import { getCrewColor } from '../data/crew'

export function CrewAvatar({ processId = 1, size = 36, className = '' }: {
  processId?: number; size?: number; className?: string
}) {
  const color = getCrewColor(processId)
  return <svg className={`crew-avatar ${className}`} width={size} height={size * 1.18} viewBox="0 0 64 76" fill="none" aria-hidden="true" focusable="false">
    <rect x="4" y="28" width="15" height="30" rx="6" fill={color.shade} stroke="#090F1A" strokeWidth="3.5" />
    <path d="M16 30C16 13 24 7 37 7s21 8 21 25v34c0 3-2 5-5 5H43c-3 0-4-2-4-5v-8h-8v8c0 3-2 5-5 5h-7c-3 0-5-2-5-5l2-36Z" fill={color.value} stroke="#090F1A" strokeWidth="4" strokeLinejoin="round" />
    <path d="M19 45c8 7 24 9 37 2v19c0 2-1 3-3 3h-9c-2 0-3-1-3-3V56H29v10c0 2-1 3-3 3h-7c-2 0-3-1-3-3l3-21Z" fill={color.shade} />
    <path d="M31 20c8-3 21-3 27 3 4 4 4 12 0 16-5 5-23 4-28 0-5-4-5-15 1-19Z" fill="#A9D8E8" stroke="#090F1A" strokeWidth="4" />
    <path d="M34 23c6-2 15-2 19 0" stroke="#F0FCFF" strokeWidth="4" strokeLinecap="round" />
  </svg>
}
