import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { HeatmapEntry } from '../../types'

interface Props {
  channelId?: string
}

function getColor(count: number, max: number): string {
  if (count === 0) return 'bg-surface-container'
  const ratio = count / max
  if (ratio < 0.25) return 'bg-green-200'
  if (ratio < 0.5) return 'bg-green-400'
  if (ratio < 0.75) return 'bg-green-600'
  return 'bg-green-800'
}

const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

export function ActivityHeatmap({ channelId }: Props) {
  const [entries, setEntries] = useState<HeatmapEntry[]>([])
  const [tooltip, setTooltip] = useState<{ date: string; count: number; x: number; y: number } | null>(null)

  useEffect(() => {
    api.heatmap.get(channelId).then(setEntries)
  }, [channelId])

  if (entries.length === 0) return null

  const max = Math.max(...entries.map((e) => e.count), 1)

  // 過去12週分（84日）のセルを生成
  const today = new Date()
  const cells: { date: string; count: number }[] = []
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const entry = entries.find((e) => e.date === dateStr)
    cells.push({ date: dateStr, count: entry?.count ?? 0 })
  }

  // 7日ごとに週に分割
  const weeks: typeof cells[] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }

  // 月ラベルの位置を計算（週インデックス → 月名）
  const monthLabels: { weekIdx: number; label: string }[] = []
  weeks.forEach((week, wi) => {
    const firstDay = week[0]?.date
    if (!firstDay) return
    const d = new Date(firstDay)
    if (d.getDate() <= 7) {
      monthLabels.push({ weekIdx: wi, label: MONTH_LABELS[d.getMonth()] })
    }
  })

  return (
    <div className="bg-white rounded-xl border border-outline-variant p-4 mb-6 relative">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-label-lg text-on-surface font-medium">活動ヒートマップ</h3>
        <span className="text-[11px] text-on-surface-variant">過去12週間</span>
      </div>

      <div className="overflow-x-auto pb-1">
        {/* 月ラベル */}
        <div className="flex gap-1 mb-1">
          {weeks.map((_, wi) => {
            const label = monthLabels.find((m) => m.weekIdx === wi)
            return (
              <div key={wi} className="w-3 flex-shrink-0">
                {label && (
                  <span className="text-[9px] text-on-surface-variant whitespace-nowrap">{label.label}</span>
                )}
              </div>
            )
          })}
        </div>

        {/* グリッド */}
        <div className="flex gap-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((cell) => (
                <div
                  key={cell.date}
                  className={`w-3 h-3 rounded-sm ${getColor(cell.count, max)} cursor-default relative`}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    setTooltip({ date: cell.date, count: cell.count, x: rect.left, y: rect.top })
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ツールチップ */}
      {tooltip && (
        <div
          className="fixed z-50 px-2 py-1 bg-slate-800 text-white text-[11px] rounded shadow-lg pointer-events-none whitespace-nowrap"
          style={{ left: tooltip.x + 8, top: tooltip.y - 32 }}
        >
          {tooltip.date}：{tooltip.count}件
        </div>
      )}
    </div>
  )
}
