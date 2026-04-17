export type Priority = 'low' | 'medium' | 'high'
export type ItemSource = 'shopping' | 'wishlist'

export interface ShoppingItem {
  id: string
  user_id: string
  name: string
  quantity: string | null
  category: string
  notes: string | null
  checked: boolean
  created_at: string
  updated_at: string
}

export interface WishlistItem {
  id: string
  user_id: string
  name: string
  priority: Priority
  url: string | null
  price: number | null
  notes: string | null
  purchased: boolean
  created_at: string
  updated_at: string
}

export interface Template {
  id: string
  user_id: string
  name: string
  description: string | null
  color: string
  emoji: string
  created_at: string
  updated_at: string
  template_items?: TemplateItem[]
}

export interface TemplateItem {
  id: string
  template_id: string
  name: string
  quantity: string | null
  order_index: number
}

export interface PurchaseHistory {
  id: string
  user_id: string
  item_name: string
  category: string
  quantity: string | null
  price: number | null
  source: ItemSource
  purchased_at: string
}

export interface AnalyticsSummary {
  totalPurchases: number
  totalSpend: number
  topItems: { name: string; count: number; lastBought: string }[]
  categoryBreakdown: { category: string; count: number }[]
  monthlyTrend: { month: string; count: number; spend: number }[]
}

export const CATEGORIES = [
  'Produce',
  'Dairy',
  'Meat & Seafood',
  'Bakery',
  'Pantry',
  'Frozen',
  'Snacks',
  'Beverages',
  'Health & Beauty',
  'Household',
  'Electronics',
  'Clothing',
  'Other',
] as const

export const TEMPLATE_COLORS = [
  '#7c3aed', // violet
  '#2563eb', // blue
  '#16a34a', // green
  '#dc2626', // red
  '#d97706', // amber
  '#db2777', // pink
  '#0891b2', // cyan
  '#7c3aed', // purple
] as const

export const TEMPLATE_EMOJIS = [
  '📋', '🛒', '🏕️', '✈️', '🍳', '🧹', '💊', '🎁', '📚', '🎮', '🏠', '💪',
] as const
