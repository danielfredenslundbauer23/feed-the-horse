'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { calculatePlan, getProducts, type HorseProfile, type Ration, type PlanResult } from '@/lib/calculator'

interface Props {
  horse: HorseProfile
}

const STATUS_COLOR = {
  green:  'bg-green-100 text-green-800 border-green-200',
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  red:    'bg-red-100 text-red-800 border-red-200',
}

const STATUS_BAR = {
  green:  'bg-green-500',
  yellow: 'bg-yellow-400',
  red:    'bg-red-500',
}

export function FeedPlanBuilder({ horse }: Props) {
  const allProducts = useMemo(() => getProducts(), [])
  const [rations, setRations] = useState<Ration[]>([])
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  const plan: PlanResult = useMemo(
    () => calculatePlan(horse, rations),
    [horse, rations]
  )

  const filtered = useMemo(() => {
    if (!search.trim()) return []
    const q = search.toLowerCase()
    return allProducts
      .filter((p: { name: string }) => p.name.toLowerCase().includes(q))
      .slice(0, 12)
  }, [search, allProducts])

  const addProduct = (name: string) => {
    if (rations.find(r => r.product_name === name)) return
    setRations(prev => [...prev, { product_name: name, grams: 1000 }])
    setSearch('')
    setShowSearch(false)
  }

  const updateGrams = (name: string, grams: number) => {
    setRations(prev => prev.map(r => r.product_name === name ? { ...r, grams } : r))
  }

  const removeRation = (name: string) => {
    setRations(prev => prev.filter(r => r.product_name !== name))
  }

  const barWidth = (pct: number) => Math.min(100, Math.max(0, pct))

  return (
    <div className="space-y-4">
      {/* FE summary */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold">Foderenheder (FE)</span>
            <span className={`text-sm font-bold ${plan.nutrients[0]?.status === 'green' ? 'text-green-700' : plan.nutrients[0]?.status === 'yellow' ? 'text-yellow-700' : 'text-red-700'}`}>
              {plan.fe_supplied} / {plan.fe_need} FE
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${STATUS_BAR[plan.nutrients[0]?.status ?? 'red']}`}
              style={{ width: `${barWidth(plan.nutrients[0]?.pct ?? 0)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{plan.nutrients[0]?.pct ?? 0}% dækket</span>
            <span className="font-medium">Dagspris: {plan.cost_per_day} kr.</span>
          </div>
        </CardContent>
      </Card>

      {/* Rations */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Fodermidler</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rations.length === 0 && (
            <p className="text-sm text-muted-foreground">Tilføj fodermidler nedenfor.</p>
          )}
          {rations.map(r => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const p = allProducts.find((p: any) => p.name === r.product_name) as any
            return (
              <div key={r.product_name} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.product_name}</p>
                  {p && (
                    <p className="text-xs text-muted-foreground">
                      {p.fe_per_kg} FE/100g · {p.protein_pct}% protein
                      {p.is_roughage ? ' · grovfoder' : ''}
                    </p>
                  )}
                </div>
                <Input
                  type="number"
                  value={r.grams}
                  onChange={e => updateGrams(r.product_name, Number(e.target.value))}
                  className="w-24 text-right"
                  min={0}
                  step={50}
                />
                <span className="text-xs text-muted-foreground">g/dag</span>
                <Button variant="ghost" size="sm" onClick={() => removeRation(r.product_name)} className="text-red-500 hover:text-red-700 px-1">✕</Button>
              </div>
            )
          })}

          <Separator />

          {/* Product search */}
          <div className="relative">
            <Input
              placeholder="Søg fodermiddel..."
              value={search}
              onChange={e => { setSearch(e.target.value); setShowSearch(true) }}
              onFocus={() => setShowSearch(true)}
            />
            {showSearch && filtered.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-64 overflow-y-auto">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {filtered.map((p: any) => (
                  <button
                    key={p.name}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b last:border-0"
                    onClick={() => addProduct(p.name)}
                  >
                    <span className="font-medium">{p.name}</span>
                    <span className="text-muted-foreground ml-2 text-xs">
                      {p.fe_per_kg} FE/100g · {p.protein_pct}% prot.
                      {p.is_roughage ? ' · grov' : ''}
                      {p.price_per_kg ? ` · ${p.price_per_kg} kr/kg` : ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Nutrient indicators */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Næringsindikatorer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {plan.nutrients.slice(1).map(n => (
            <div key={n.key}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm">{n.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {n.supplied} / {n.need} {n.unit}
                  </span>
                  <Badge className={`text-xs border ${STATUS_COLOR[n.status]}`} variant="outline">
                    {n.pct}%
                  </Badge>
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${STATUS_BAR[n.status]}`}
                  style={{ width: `${barWidth(n.pct)}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
