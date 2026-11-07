import { LayoutDashboard, Calculator, GitCompareArrows, BookOpen, GraduationCap, Bookmark, Info } from 'lucide-react'

export const navigation = [
  { to: '/', title: 'Dashboard', icon: LayoutDashboard },
  { to: '/calculator', title: 'Calculator', icon: Calculator },
  { to: '/compare', title: 'Compare Algorithms', icon: GitCompareArrows },
  { to: '/learn', title: 'Learning Center', icon: BookOpen },
  { to: '/practice', title: 'Practice Mode', icon: GraduationCap },
  { to: '/saved', title: 'Saved Calculations', icon: Bookmark },
  { to: '/about', title: 'About', icon: Info },
]
