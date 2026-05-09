'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { getBreeds, getTrainingGaits, getCategoryLabels, type HorseProfile } from '@/lib/calculator'

interface Props {
  onSave: (horse: HorseProfile) => void
  initial?: HorseProfile
}

const defaultHorse: HorseProfile = {
  name: '',
  breed: 'Varmblod',
  weight: 600,
  category: 'vedligehold',
  bcs: 5,
  training_minutes: 0,
  training_gait: 'trav_middel',
  notes: '',
}

export function HorseForm({ onSave, initial }: Props) {
  const [horse, setHorse] = useState<HorseProfile>(initial ?? defaultHorse)
  const breeds = getBreeds()
  const gaits = getTrainingGaits()
  const catLabels = getCategoryLabels()

  const set = (k: keyof HorseProfile) => (val: string | number | null) =>
    setHorse(prev => ({ ...prev, [k]: val ?? '' }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hesteprofil</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Navn</Label>
          <Input
            value={horse.name}
            onChange={e => set('name')(e.target.value)}
            placeholder="Hestens navn"
          />
        </div>

        <div className="space-y-1">
          <Label>Race</Label>
          <Select value={horse.breed} onValueChange={set('breed')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {breeds.map(b => (
                <SelectItem key={b.name} value={b.name}>
                  {b.name} ({b.weight} kg)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Aktuel vægt (kg)</Label>
          <Input
            type="number"
            value={horse.weight}
            onChange={e => set('weight')(Number(e.target.value))}
            min={100}
            max={1200}
          />
        </div>

        <div className="space-y-1">
          <Label>Kategori</Label>
          <Select value={horse.category} onValueChange={val => set('category')(val)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(catLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Huldscore (BCS): {horse.bcs}/9</Label>
          <Slider
            value={[horse.bcs]}
            onValueChange={(vals) => set('bcs')(Array.isArray(vals) ? vals[0] : vals)}
            min={1} max={9} step={0.5}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1 — For tynd</span>
            <span>5 — Ideal</span>
            <span>9 — Fedladen</span>
          </div>
        </div>

        <div className="space-y-1">
          <Label>Træning (min/dag)</Label>
          <Input
            type="number"
            value={horse.training_minutes}
            onChange={e => set('training_minutes')(Number(e.target.value))}
            min={0}
            max={240}
          />
        </div>

        <div className="space-y-1">
          <Label>Primær gangart</Label>
          <Select value={horse.training_gait} onValueChange={set('training_gait')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {gaits.map(g => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name} ({g.fe_per_hour} FE/t)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1 md:col-span-2">
          <Label>Særlige hensyn (valgfrit)</Label>
          <Input
            value={horse.notes}
            onChange={e => set('notes')(e.target.value)}
            placeholder="fx EMS, mavesår, laminitis..."
          />
        </div>

        <div className="md:col-span-2">
          <Button
            onClick={() => onSave(horse)}
            disabled={!horse.name || !horse.breed}
            className="w-full"
          >
            Gem hesteprofil og beregn behov
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
