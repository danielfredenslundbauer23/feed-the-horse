'use client'

import Image from 'next/image'
import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HorseForm } from '@/components/HorseForm'
import { FeedPlanBuilder } from '@/components/FeedPlanBuilder'
import { type HorseProfile } from '@/lib/calculator'

export default function Home() {
  const [horse, setHorse] = useState<HorseProfile | null>(null)
  const [tab, setTab] = useState('horse')

  const handleSave = (h: HorseProfile) => {
    setHorse(h)
    setTab('plan')
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-2 flex items-center gap-3">
        <Image
          src="/logo.png"
          alt="feed the horse logo"
          width={64}
          height={64}
          className="object-contain"
          style={{ width: 'auto', height: '64px' }}
          priority
        />
        {horse && (
          <div className="ml-auto text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{horse.name}</span>
            {' · '}{horse.breed} · {horse.weight} kg
          </div>
        )}
      </header>

      <div className="max-w-3xl mx-auto p-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="horse" className="flex-1">Hesteprofil</TabsTrigger>
            <TabsTrigger value="plan" className="flex-1" disabled={!horse}>
              Foderplan
            </TabsTrigger>
          </TabsList>

          <TabsContent value="horse">
            <HorseForm onSave={handleSave} initial={horse ?? undefined} />
          </TabsContent>

          <TabsContent value="plan">
            {horse && <FeedPlanBuilder horse={horse} />}
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
