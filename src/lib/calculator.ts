// eslint-disable-next-line @typescript-eslint/no-explicit-any
import data from '@/data/sundhest.json' assert { type: 'json' }
const db = data as any

export type CategoryKey = typeof db.category_keys[number]

export interface HorseProfile {
  name: string
  breed: string
  weight: number
  category: CategoryKey
  bcs: number          // 1-9
  training_minutes: number
  training_gait: string
  notes: string
}

export interface Ration {
  product_name: string
  grams: number
}

export interface NutrientResult {
  key: string
  label: string
  unit: string
  need: number
  supplied: number
  pct: number          // supplied / need * 100
  status: 'green' | 'yellow' | 'red'
}

export interface PlanResult {
  horse: HorseProfile
  fe_need: number
  fe_supplied: number
  nutrients: NutrientResult[]
  rations: Ration[]
  cost_per_day: number
}

export interface Breed { name: string; weight: number }
export interface FeedProduct {
  name: string; fe_per_kg: number; protein_pct: number; is_roughage: boolean; price_per_kg: number | null
  ca_g_per_kg: number | null; p_g_per_kg: number | null; vit_a_ie_per_kg: number | null; vit_d3_ie_per_kg: number | null
  vit_e_mg_per_kg: number | null; lysin_g_per_kg: number | null; cu_mg_per_kg: number | null; zn_mg_per_kg: number | null
  mn_mg_per_kg: number | null; fe_mg_per_kg: number | null; co_mg_per_kg: number | null; se_mg_per_kg: number | null
  i_mg_per_kg: number | null; mg_g_per_kg: number | null; na_g_per_kg: number | null; k_g_per_kg: number | null
  sugar_pct: number | null; starch_pct: number | null; dry_matter_pct: number | null
}
export interface TrainingGait { id: string; name: string; fe_per_hour: number }

export function getBreeds(): Breed[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return db.breeds.map((b: any) => ({ name: b.name as string, weight: b.weight as number }))
}

export function getProducts(): FeedProduct[] {
  return db.products as FeedProduct[]
}

export function getTrainingGaits(): TrainingGait[] {
  return db.training_gaits as TrainingGait[]
}

export function getCategoryLabels(): Record<string, string> {
  return db.category_labels as Record<string, string>
}

// ── FE need for a horse ───────────────────────────────────────────────────────
export function calcFENeed(horse: HorseProfile): number {
  const breed = db.breeds.find((b: Breed & { fe_needs: Record<string, number | null> }) => b.name === horse.breed)
  if (!breed) return 0

  const baseKey = 'vedligehold' as const
  const baseFe = (breed.fe_needs as Record<string, number | null>)[baseKey] ?? 0

  // Scale by weight if user entered a different weight than breed default
  const weightRatio = horse.weight / (breed.weight ?? horse.weight)
  const scaledFe = baseFe * weightRatio

  // Category multiplier
  const mult = (db.category_multipliers as Record<string, number>)[horse.category] ?? 1.0
  let fe = scaledFe * mult

  // BCS correction: ±0.5 FE per BCS point away from 5
  const bcsDiff = horse.bcs - 5
  fe -= bcsDiff * 0.3

  // Training
  if (horse.training_minutes > 0 && horse.training_gait) {
    const gait = db.training_gaits.find((g: TrainingGait) => g.id === horse.training_gait)
    if (gait) {
      fe += (horse.training_minutes / 60) * gait.fe_per_hour
    }
  }

  return Math.max(0, Math.round(fe * 100) / 100)
}

// ── Nutrient needs based on FE ────────────────────────────────────────────────
function calcNeeds(feNeed: number): Record<string, number> {
  const n = db.nutrient_per_fe
  return {
    protein:    feNeed * n.protein_g,
    calcium:    feNeed * n.ca_g,
    phosphorus: feNeed * n.p_g,
    vit_a:      feNeed * n.vit_a_ie,
    vit_d3:     feNeed * n.vit_d3_ie,
    vit_e:      feNeed * n.vit_e_mg,
    copper:     feNeed * n.cu_mg,
    zinc:       feNeed * n.zn_mg,
    manganese:  feNeed * n.mn_mg,
    selenium:   feNeed * n.se_mg,
    sodium:     feNeed * n.na_g,
    magnesium:  feNeed * n.mg_g,
    lysine:     feNeed * n.lysin_g,
    iodine:     feNeed * n.i_mg,
  }
}

type ProductRow = FeedProduct

// ── Calculate supplied nutrients from rations ────────────────────────────────
function calcSupplied(rations: Ration[]): { nutrients: Record<string, number>; fe: number; cost: number } {
  const nutrients: Record<string, number> = {
    protein: 0, calcium: 0, phosphorus: 0,
    vit_a: 0, vit_d3: 0, vit_e: 0,
    copper: 0, zinc: 0, manganese: 0, selenium: 0,
    sodium: 0, magnesium: 0, lysine: 0, iodine: 0,
  }
  let fe = 0
  let cost = 0

  for (const r of rations) {
    const p = db.products.find((p: ProductRow) => p.name === r.product_name) as ProductRow | undefined
    if (!p || r.grams <= 0) continue

    const kg = r.grams / 1000

    // FE: fe_per_kg is FE per 100g in raw form — convert to per kg
    const fePerKg = (p.fe_per_kg ?? 0) / 100
    fe += fePerKg * kg

    // Nutrients per kg of fresh weight
    // Values in JSON are per kg dry matter or per kg fresh — Sundhest uses per kg as-fed
    nutrients.protein    += (p.protein_pct ?? 0) / 100 * 1000 * kg          // % → g/kg
    nutrients.calcium    += (p.ca_g_per_kg ?? 0) * kg
    nutrients.phosphorus += (p.p_g_per_kg ?? 0) * kg
    nutrients.vit_a      += (p.vit_a_ie_per_kg ?? 0) * kg
    nutrients.vit_d3     += (p.vit_d3_ie_per_kg ?? 0) * kg
    nutrients.vit_e      += (p.vit_e_mg_per_kg ?? 0) * kg
    nutrients.copper     += (p.cu_mg_per_kg ?? 0) * kg
    nutrients.zinc       += (p.zn_mg_per_kg ?? 0) * kg
    nutrients.manganese  += (p.mn_mg_per_kg ?? 0) * kg
    nutrients.selenium   += (p.se_mg_per_kg ?? 0) * kg
    nutrients.sodium     += (p.na_g_per_kg ?? 0) * kg
    nutrients.magnesium  += (p.mg_g_per_kg ?? 0) * kg
    nutrients.lysine     += (p.lysin_g_per_kg ?? 0) * kg
    nutrients.iodine     += (p.i_mg_per_kg ?? 0) * kg

    if (p.price_per_kg) cost += p.price_per_kg * kg
  }

  return { nutrients, fe, cost }
}

type StatusFn = (pct: number, key: string) => 'green' | 'yellow' | 'red'

const getStatus: StatusFn = (pct, key) => {
  const lim = (db.nutrient_limits as Record<string, { min_pct?: number; max_pct?: number | null }>)[key]
  if (!lim) return 'green'
  const min = lim.min_pct ?? 0
  const max = lim.max_pct ?? Infinity
  if (pct >= min && pct <= max) return 'green'
  if (pct >= min * 0.85 && pct <= max * 1.2) return 'yellow'
  return 'red'
}

// ── Main calculation ──────────────────────────────────────────────────────────
export function calculatePlan(horse: HorseProfile, rations: Ration[]): PlanResult {
  const feNeed = calcFENeed(horse)
  const needs = calcNeeds(feNeed)
  const { nutrients: supplied, fe: feSupplied, cost } = calcSupplied(rations)

  const nutrientOrder = [
    ['protein',    'Råprotein',    'g'],
    ['calcium',    'Calcium',      'g'],
    ['phosphorus', 'Fosfor',       'g'],
    ['vit_a',      'Vitamin A',    'IE'],
    ['vit_d3',     'Vitamin D3',   'IE'],
    ['vit_e',      'Vitamin E',    'mg'],
    ['copper',     'Kobber',       'mg'],
    ['zinc',       'Zink',         'mg'],
    ['manganese',  'Mangan',       'mg'],
    ['selenium',   'Selen',        'mg'],
    ['sodium',     'Natrium',      'g'],
    ['magnesium',  'Magnesium',    'g'],
    ['lysine',     'Lysin',        'g'],
    ['iodine',     'Jod',          'mg'],
  ] as [string, string, string][]

  const fePct = feNeed > 0 ? (feSupplied / feNeed) * 100 : 0
  const feStatus = fePct >= 95 && fePct <= 105 ? 'green' : fePct >= 85 && fePct <= 115 ? 'yellow' : 'red'

  const nutrients: NutrientResult[] = [
    {
      key: 'fe', label: 'Foderenheder (FE)', unit: 'FE',
      need: feNeed, supplied: Math.round(feSupplied * 100) / 100,
      pct: Math.round(fePct), status: feStatus,
    },
    ...nutrientOrder.map(([key, label, unit]) => {
      const need = needs[key] ?? 0
      const sup = supplied[key] ?? 0
      const pct = need > 0 ? Math.round((sup / need) * 100) : 0
      return {
        key, label, unit,
        need: Math.round(need * 10) / 10,
        supplied: Math.round(sup * 10) / 10,
        pct,
        status: getStatus(pct, key),
      }
    }),
  ]

  return {
    horse,
    fe_need: feNeed,
    fe_supplied: Math.round(feSupplied * 100) / 100,
    nutrients,
    rations,
    cost_per_day: Math.round(cost * 100) / 100,
  }
}
