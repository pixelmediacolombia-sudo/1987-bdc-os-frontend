import type { ReactNode } from 'react'
import type { IconName } from '../app/navigation'

const paths: Record<IconName, ReactNode> = {
  home: <><path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-7h6v7" /></>,
  inbox: <><path d="M4 4h16v16H4zM4 14h4l2 2h4l2-2h4" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3 20c.5-3.4 2.4-5 6-5s5.5 1.6 6 5m1-14a3 3 0 0 1 0 6m1 3c2.2.5 3.4 2 3.8 5" /></>,
  pipeline: <><rect x="3" y="4" width="6" height="6" rx="1" /><rect x="15" y="14" width="6" height="6" rx="1" /><path d="M9 7h3a3 3 0 0 1 3 3v4m-2-2 2 2 2-2" /></>,
  target: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><path d="m12 12 8-8m-4 0h4v4" /></>,
  workflow: <><rect x="3" y="5" width="6" height="6" rx="1" /><rect x="15" y="13" width="6" height="6" rx="1" /><path d="M9 8h2a3 3 0 0 1 3 3v2h1m-2-2 2 2 2-2" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 10h18m-13 4h2m4 0h2m-8 3h2" /></>,
  chart: <><path d="M4 20V4m0 16h16M7 15l4-4 3 2 5-6" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="m19 13 2 1-2 4-2-1-2 1v2H9v-2l-2-1-2 1-2-4 2-1v-2l-2-1 2-4 2 1 2-1V4h6v2l2 1 2-1 2 4-2 1z" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  phone: <><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M10 6h4m-3 12h2" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
  dots: <><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></>,
  spark: <><path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6z" /><path d="m19 16 .6 2.4L22 19l-2.4.6L19 22l-.6-2.4L16 19l2.4-.6z" /></>,
  chevron: <path d="m8 10 4 4 4-4" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
}

export default function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}
