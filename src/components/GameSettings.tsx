'use client'

import React, { useState } from 'react'

export interface GameSettingsConfig {
  gameMode: 'SOLO_PRACTICE' | 'SOLO_COMPETITOR' | 'SINGLE_VS_AI' | 'MULTIPLAYER'
  playerCount: number
  aiOpponentCount?: number
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  stake: number
}

interface GameSettingsProps {
  onStart: (settings: GameSettingsConfig) => void
}

export default function GameSettings({ onStart }: GameSettingsProps) {
  const [gameMode, setGameMode] = useState<'SOLO_PRACTICE' | 'SOLO_COMPETITOR' | 'SINGLE_VS_AI' | 'MULTIPLAYER'>('SOLO_PRACTICE')
  const [playerCount, setPlayerCount] = useState(2)
  const [aiOpponentCount, setAiOpponentCount] = useState(1)
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM')
  const [stake, setStake] = useState(1)

  const handleStart = () => {
    const settings: GameSettingsConfig = {
      gameMode,
      playerCount: (gameMode === 'SOLO_PRACTICE' || gameMode === 'SOLO_COMPETITOR') ? 1 : playerCount,
      aiOpponentCount: gameMode === 'SINGLE_VS_AI' ? aiOpponentCount : undefined,
      difficulty,
      stake: (gameMode === 'SOLO_PRACTICE' || gameMode === 'SOLO_COMPETITOR') ? 0 : stake
    }
    onStart(settings)
  }

  const getGameModeDescription = () => {
    switch (gameMode) {
      case 'SOLO_PRACTICE':
        return 'Practice your skills with the physics engine. Reset tower anytime.'
      case 'SOLO_COMPETITOR':
        return 'Race against the clock! Remove blocks to score points. Top 2 levels are locked.'
      case 'SINGLE_VS_AI':
        return 'Play against computer opponents with configurable difficulty.'
      case 'MULTIPLAYER':
        return 'Play with real human players. Connect wallets to participate.'
    }
  }

  const getPlayerDisplay = () => {
    switch (gameMode) {
      case 'SOLO_PRACTICE':
        return '1 Player (Practice)'
      case 'SOLO_COMPETITOR':
        return '1 Player (Competitor)'
      case 'SINGLE_VS_AI':
        return `1 Human vs ${aiOpponentCount} AI`
      case 'MULTIPLAYER':
        return `${playerCount} Human Players`
    }
  }

  const isProduction = process.env.NODE_ENV === 'production';

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-1">Game Setup</h1>
          <p className="text-gray-400 text-sm">Choose how you want to play</p>
        </div>

        {/* Game Mode Selection */}
        <div className="mb-6">
          <label className="block text-white font-semibold mb-3 text-sm uppercase tracking-wider">Game Mode</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {([
              { key: 'SOLO_PRACTICE', title: 'Solo Practice', desc: 'Relaxed physics playground', icon: '🎯', disabled: false },
              { key: 'SOLO_COMPETITOR', title: 'Solo Competitor', desc: 'Ranked time-attack mode', icon: '🏆', disabled: false },
              { key: 'SINGLE_VS_AI', title: 'Single vs AI', desc: 'Challenge computer opponents', icon: '🤖', disabled: isProduction },
              { key: 'MULTIPLAYER', title: 'Multiplayer', desc: 'Play with other humans', icon: '👥', disabled: isProduction }
            ] as const).map((mode) => (
              <button
                key={mode.key}
                disabled={mode.disabled}
                onClick={() => !mode.disabled && setGameMode(mode.key as any)}
                className={`p-3 rounded-xl border text-center transition-all relative overflow-hidden group ${mode.disabled
                  ? 'bg-white/5 border-white/5 text-gray-600 cursor-not-allowed'
                  : gameMode === mode.key
                    ? 'bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-blue-500 text-white ring-1 ring-blue-500/50'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-white/20'
                  }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <span className={`text-2xl transition-transform duration-300 ${gameMode === mode.key ? 'scale-110' : 'grayscale group-hover:grayscale-0'}`}>{mode.icon}</span>
                  <div className="font-semibold text-sm leading-tight">
                    {mode.title}
                    {mode.disabled && (
                      <span className="block text-[10px] uppercase tracking-wider text-white/40 mt-1">
                        Coming Soon
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
          <p className="text-gray-400 text-sm mt-3 text-center min-h-[20px]">{getGameModeDescription()}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 border-t border-white/10 pt-6">
          {/* Configuration Options */}
          <div className="space-y-5">
            {/* AI Opponent Count */}
            {gameMode === 'SINGLE_VS_AI' && (
              <div>
                <label className="block text-white font-semibold mb-2 text-sm">
                  AI Opponents: <span className="text-blue-400">{aiOpponentCount}</span>
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5, 6].map((count) => (
                    <button
                      key={count}
                      onClick={() => setAiOpponentCount(count)}
                      className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${aiOpponentCount === count
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Player Count */}
            {gameMode === 'MULTIPLAYER' && (
              <div>
                <label className="block text-white font-semibold mb-2 text-sm">
                  Human Players: <span className="text-blue-400">{playerCount}</span>
                </label>
                <div className="flex gap-2">
                  {[2, 3, 4, 5, 6, 7].map((count) => (
                    <button
                      key={count}
                      onClick={() => setPlayerCount(count)}
                      className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${playerCount === count
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Stake Amount */}
            {gameMode !== 'SOLO_PRACTICE' && gameMode !== 'SOLO_COMPETITOR' && (
              <div>
                <label className="block text-white font-semibold mb-2 text-sm">
                  Stake per Player: <span className="text-green-400">{stake} USDC</span>
                </label>
                <div className="flex gap-2">
                  {[0.1, 0.5, 1, 5, 10].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setStake(amount)}
                      className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${stake === amount
                        ? 'bg-green-600 text-white shadow-lg shadow-green-900/20'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }`}
                    >
                      {amount}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Difficulty */}
            <div>
              <label className="block text-white font-semibold mb-2 text-sm">Difficulty</label>
              <div className="grid grid-cols-3 gap-2">
                {(['EASY', 'MEDIUM', 'HARD'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setDifficulty(level)}
                    className={`py-2 px-3 rounded-lg font-semibold text-sm transition-all ${difficulty === level
                      ? 'bg-yellow-600 text-white shadow-lg shadow-yellow-900/20'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <p className="text-gray-500 text-xs mt-2">
                {difficulty === 'EASY' && 'Slower gameplay, tower stability'}
                {difficulty === 'MEDIUM' && 'Balanced challenge'}
                {difficulty === 'HARD' && 'Fast paced, unstable tower'}
              </p>
            </div>
          </div>

          {/* Summary Panel */}
          <div className="flex flex-col justify-between bg-white/5 rounded-xl p-5 border border-white/5">
            <div>
              <h3 className="text-white font-bold mb-3 text-sm uppercase tracking-wider">Game Summary</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-gray-300">
                  <span className="text-xl">🎮</span>
                  <div>
                    <div className="font-semibold text-white">{getPlayerDisplay()}</div>
                    <div className="text-xs text-gray-500">
                      {gameMode === 'SOLO_PRACTICE' ? 'Free practice mode' :
                        gameMode === 'SOLO_COMPETITOR' ? 'Ranked time-attack' :
                          `${difficulty} Difficulty`}
                    </div>
                  </div>
                </div>

                {gameMode !== 'SOLO_PRACTICE' && gameMode !== 'SOLO_COMPETITOR' && (
                  <div className="flex items-center gap-3 text-gray-300">
                    <span className="text-xl">💰</span>
                    <div>
                      <div className="font-semibold text-green-400">
                        {gameMode === 'SINGLE_VS_AI'
                          ? (stake * (1 + aiOpponentCount)).toFixed(2)
                          : (stake * playerCount).toFixed(2)
                        } USDC Pot
                      </div>
                      <div className="text-xs text-gray-500">Winner takes all</div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 text-gray-300">
                  <span className="text-xl">ℹ️</span>
                  <div className="text-xs text-gray-400 leading-relaxed">
                    {gameMode === 'SOLO_PRACTICE' ? 'No stakes, no limits. Perfect for learning the physics.' :
                      gameMode === 'SOLO_COMPETITOR' ? 'Compete for the high score. Top 2 levels are locked.' :
                        'Strategic physics gameplay. Last one standing wins.'}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleStart}
              className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2"
            >
              <span>{gameMode === 'SOLO_PRACTICE' ? 'Start Practice' : 'Start Game'}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
