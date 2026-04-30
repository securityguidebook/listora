'use client'

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

const COLORS = ['#7c3aed', '#2563eb', '#16a34a', '#dc2626', '#d97706', '#db2777', '#0891b2', '#ea580c']

interface MonthlyDatum { month: string; count: number; spend: number }
interface CategoryDatum { name: string; value: number }

export interface AnalyticsChartsProps {
  monthlyData: MonthlyDatum[]
  categoryData: CategoryDatum[]
}

export default function AnalyticsCharts({ monthlyData, categoryData }: AnalyticsChartsProps) {
  return (
    <>
      <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Monthly purchases (6 months)</h3>
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
      </div>

      {categoryData.length > 0 && (
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">By category</h3>
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
        </div>
      )}
    </>
  )
}
