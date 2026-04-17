'use client'

import { createClient } from '@/lib/supabase/client'
import { PurchaseHistory } from '@/lib/types'
import { formatRelative } from '@/lib/utils'
import { useCallback, useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface ItemFrequency {
  name: string
  count: number
  lastBought: string
  avgDaysBetween: number | null
}

const COLORS = ['#7c3aed', '#2563eb', '#16a34a', '#dc2626', '#d97706', '#db2777', '#0891b2', '#ea580c']

export function AnalyticsView() {
  const [history, setHistory] = useState<PurchaseHistory[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchHistory = useCallback(async () => {
    const { data } = await supabase
      .from('purchase_history')
      .select('*')
      .order('purchased_at', { ascending: false })
      .limit(500)
    setHistory(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  if (loading) {
    return (
      <div className="flex flex-col gap-4 px-4 pt-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-40 rounded-2xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="mt-20 flex flex-col items-center gap-3 text-center px-4">
        <div className="text-5xl">📊</div>
        <p className="text-lg font-semibold text-gray-800">No data yet</p>
        <p className="text-sm text-gray-500">
          Check off items on your shopping list or mark wishlist items as purchased to start seeing trends here.
        </p>
      </div>
    )
  }

  // --- Derived stats ---
  const totalPurchases = history.length
  const totalSpend = history.reduce((sum, h) => sum + (h.price ?? 0), 0)

  // Monthly trend (last 6 months)
  const now = new Date()
  const monthlyMap = new Map<string, { count: number; spend: number }>()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = d.toLocaleString('default', { month: 'short', year: '2-digit' })
    monthlyMap.set(key, { count: 0, spend: 0 })
  }
  history.forEach((h) => {
    const d = new Date(h.purchased_at)
    const key = d.toLocaleString('default', { month: 'short', year: '2-digit' })
    if (monthlyMap.has(key)) {
      const entry = monthlyMap.get(key)!
      monthlyMap.set(key, { count: entry.count + 1, spend: entry.spend + (h.price ?? 0) })
    }
  })
  const monthlyData = Array.from(monthlyMap.entries()).map(([month, v]) => ({ month, ...v }))

  // Top items by frequency
  const itemMap = new Map<string, { count: number; dates: string[] }>()
  history.forEach((h) => {
    const key = h.item_name.toLowerCase()
    const existing = itemMap.get(key) ?? { count: 0, dates: [] }
    itemMap.set(key, { count: existing.count + 1, dates: [...existing.dates, h.purchased_at] })
  })
  const topItems: ItemFrequency[] = Array.from(itemMap.entries())
    .map(([name, { count, dates }]) => {
      const sorted = dates.sort()
      let avgDaysBetween: number | null = null
      if (sorted.length > 1) {
        const gaps: number[] = []
        for (let i = 1; i < sorted.length; i++) {
          gaps.push(
            (new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) / (1000 * 60 * 60 * 24)
          )
        }
        avgDaysBetween = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length)
      }
      return {
        name: name.charAt(0).toUpperCase() + name.slice(1),
        count,
        lastBought: sorted[sorted.length - 1],
        avgDaysBetween,
      }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Category breakdown
  const catMap = new Map<string, number>()
  history.forEach((h) => {
    catMap.set(h.category, (catMap.get(h.category) ?? 0) + 1)
  })
  const categoryData = Array.from(catMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)

  return (
    <div className="flex flex-col gap-5 px-4 pb-32 pt-2">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total purchases" value={totalPurchases.toString()} />
        <StatCard
          label="Total tracked spend"
          value={totalSpend > 0 ? `$${totalSpend.toFixed(0)}` : '—'}
        />
      </div>

      {/* Monthly trend */}
      <Section title="Monthly purchases (6 months)">
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e5e7eb' }}
              formatter={(v) => [v as number, 'purchases']}
            />
            <Bar dataKey="count" fill="#7c3aed" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Section>

      {/* Category breakdown */}
      {categoryData.length > 0 && (
        <Section title="By category">
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={120} height={120}>
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={55}
                >
                  {categoryData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-1.5 flex-1">
              {categoryData.map((cat, idx) => (
                <div key={cat.name} className="flex items-center gap-2 text-xs">
                  <span
                    className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  />
                  <span className="text-gray-700 flex-1 truncate">{cat.name}</span>
                  <span className="font-medium text-gray-500">{cat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* Top items */}
      {topItems.length > 0 && (
        <Section title="Most purchased items">
          <div className="flex flex-col gap-2">
            {topItems.map((item, idx) => (
              <div
                key={item.name}
                className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5"
              >
                <span className="text-xs font-bold text-gray-400 w-4 text-right">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500">
                      Last: {formatRelative(item.lastBought)}
                    </span>
                    {item.avgDaysBetween && (
                      <span className="text-xs text-violet-600 font-medium">
                        ~every {item.avgDaysBetween}d
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-sm font-bold text-violet-700">{item.count}×</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">{title}</h3>
      {children}
    </div>
  )
}
