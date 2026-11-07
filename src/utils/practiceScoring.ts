import type { AnswerFeedback, CategoryScore } from '../types/learning'
export function scorePractice(groups: { name: string; weight: number; items: AnswerFeedback[] }[]) {
  const active = groups.filter(group => group.items.length > 0), totalWeight = active.reduce((sum, group) => sum + group.weight, 0)
  const categories: CategoryScore[] = active.map(group => {
    const correct = group.items.filter(item => item.status === 'correct').length, maximum = group.weight / totalWeight * 100
    return { name: group.name, weight: group.weight, maximum, earned: maximum * correct / group.items.length, correct, total: group.items.length }
  })
  const earned = Math.min(100, categories.reduce((sum, category) => sum + category.earned, 0))
  return { categories, earned, maximum: 100 as const, percentage: earned }
}
