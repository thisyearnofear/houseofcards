'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import Game from '@/components/Game'
import GameSettings, { GameSettingsConfig } from '@/components/GameSettings'

export default function PlayPage() {
  const [gameSettings, setGameSettings] = useState<GameSettingsConfig | null>(null)
  const [gameKey, setGameKey] = useState(0) // Force re-render for reset

  const handleStartGame = (settings: GameSettingsConfig) => {
    setGameSettings(settings)
    setGameKey(0) // Reset game key
  }

  const handleResetGame = () => {
    setGameKey(prev => prev + 1) // Force re-render to reset the game
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black text-white">
      <header className="flex justify-between items-center p-6 border-b border-white/10">
        <Link href="/" className="text-3xl font-bold hover:text-blue-400 transition-colors">
          House of Cards
        </Link>
        <ConnectButton />
      </header>

      <main className="h-[calc(100vh-80px)] relative">
        {/* Show settings first, then game */}
        {!gameSettings ? (
          <div className="h-full flex items-center justify-center p-6">
            <GameSettings onStart={handleStartGame} />
          </div>
        ) : (
          <Game 
            key={gameKey} 
            settings={gameSettings} 
            onReset={handleResetGame} 
            onExit={() => setGameSettings(null)}
          />
        )}
      </main>
    </div>
  )
}
