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
    <div className="w-full max-w-2xl">
      <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Game Setup</h1>
          <p className="text-gray-400">Choose how you want to play</p>
        </div>

        {/* Game Mode Selection */}
        <div className="mb-8">
          <label className="block text-white font-semibold mb-4">Game Mode</label>
          <div className="grid gap-3">
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
                className={`p-4 rounded-lg border text-left transition-all relative overflow-hidden ${mode.disabled
                  ? 'bg-white/5 border-white/5 text-gray-500 cursor-not-allowed opacity-60'
                  : gameMode === mode.key
                    ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-blue-500 text-white'
                    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl grayscale">{mode.icon}</span>
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      {mode.title}
                      {mode.disabled && (
                        <span className="text-[10px] uppercase tracking-wider bg-white/10 text-white/60 px-2 py-0.5 rounded-full">
                          Coming Soon
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">{mode.desc}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <p className="text-gray-400 text-sm mt-3">{getGameModeDescription()}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Configuration Options */}
          <div className="space-y-6">
            {/* AI Opponent Count (for Single vs AI mode) */}
            {gameMode === 'SINGLE_VS_AI' && (
              <div>
                <label className="block text-white font-semibold mb-3">
                  AI Opponents: <span className="text-blue-400">{aiOpponentCount}</span>
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((count) => (
                    <button
                      key={count}
                      onClick={() => setAiOpponentCount(count)}
                      className={`py-2 px-1 rounded-lg font-semibold transition-all ${aiOpponentCount === count
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10'
                        }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Player Count (for Multiplayer mode) */}
            {gameMode === 'MULTIPLAYER' && (
              <div>
                <label className="block text-white font-semibold mb-3">
                  Human Players: <span className="text-blue-400">{playerCount}</span>
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {[2, 3, 4, 5, 6, 7].map((count) => (
                    <button
                      key={count}
                      onClick={() => setPlayerCount(count)}
                      className={`py-2 px-1 rounded-lg font-semibold transition-all ${playerCount === count
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10'
                        }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
                <p className="text-gray-400 text-sm mt-2">All players need to connect their wallets</p>
              </div>
            )}

            {/* Stake Amount (not for Solo modes) */}
            {gameMode !== 'SOLO_PRACTICE' && gameMode !== 'SOLO_COMPETITOR' && (
              <div>
                <label className="block text-white font-semibold mb-3">
                  Stake per Player: <span className="text-green-400">{stake} USDC</span>
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[0.1, 0.5, 1, 5, 10].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setStake(amount)}
                      className={`py-2 px-1 rounded-lg font-semibold text-sm transition-all ${stake === amount
                        ? 'bg-green-600 text-white'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10'
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
              <label className="block text-white font-semibold mb-3">Difficulty</label>
              <div className="grid grid-cols-3 gap-3">
                {(['EASY', 'MEDIUM', 'HARD'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setDifficulty(level)}
                    className={`py-3 px-4 rounded-lg font-semibold transition-all ${difficulty === level
                      ? 'bg-yellow-600 text-white'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10'
                      }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <p className="text-gray-400 text-sm mt-2">
                {difficulty === 'EASY' && 'Slower gameplay, tower stability'}
                {difficulty === 'MEDIUM' && 'Balanced challenge'}
                {difficulty === 'HARD' && 'Fast paced, unstable tower'}
              </p>
            </div>
          </div>

          {/* Summary Panel */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/20 rounded-xl p-6">
              <h3 className="text-white font-bold mb-4">Game Summary</h3>
              <div className="text-gray-300 space-y-2">
                <p>🎮 <strong>{getPlayerDisplay()}</strong></p>
                {gameMode === 'SOLO_PRACTICE' || gameMode === 'SOLO_COMPETITOR' ? (
                  <>
                    <p>{gameMode === 'SOLO_PRACTICE' ? 'Free practice mode' : 'Ranked time-attack'}</p>
                    <p className="text-purple-400">
                      {gameMode === 'SOLO_PRACTICE' ? 'No stakes, no limits' : 'Compete for high score'}
                    </p>
                  </>
                ) : (
                  <>
                    <p>{difficulty} difficulty</p>
                    <p className="text-green-400 font-semibold">
                      Total Pot: {gameMode === 'SINGLE_VS_AI'
                        ? (stake * (1 + aiOpponentCount)).toFixed(2)
                        : (stake * playerCount).toFixed(2)
                      } USDC
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={handleStart}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-4 rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-900/30"
            >
              {gameMode === 'SOLO_PRACTICE' ? 'Start Practice' : 'Start Game'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
