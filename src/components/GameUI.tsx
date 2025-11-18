import React from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'

export type GameState = 'WAITING' | 'ACTIVE' | 'VOTING' | 'ENDED'

export interface Player {
    id: string
    address: string // Shortened address
    isAlive: boolean
    isCurrentTurn: boolean
}

interface GameUIProps {
    gameState: GameState
    potSize: number
    timeLeft: number
    players: Player[]
    currentPlayerId?: string
    fallenCount?: number
    totalBlocks?: number
    onJoin: () => void
    onReload: () => void
    onVote: (split: boolean) => void
}

export default function GameUI({
    gameState,
    potSize,
    timeLeft,
    players,
    currentPlayerId,
    fallenCount = 0,
    totalBlocks = 48,
    onJoin,
    onReload,
    onVote
}: GameUIProps) {

    const formatAddress = (addr: string) => {
        return addr.slice(0, 6) + '...' + addr.slice(-4)
    }

    const stability = Math.max(0, 100 - ((fallenCount / totalBlocks) / 0.4) * 100) // 0.4 is threshold

    return (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-6">

            {/* Top Bar: Pot & Status */}
            <div className="flex justify-between items-start pointer-events-auto">
                <div className="flex gap-4">
                    <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-4 text-white">
                        <div className="text-xs text-gray-400 uppercase tracking-wider font-bold">Pot Size</div>
                        <div className="text-2xl font-mono text-green-400">${potSize.toFixed(2)} USDC</div>
                    </div>
                    <div className="hidden md:block">
                        <ConnectButton />
                    </div>
                </div>

                <div className="flex flex-col gap-2 items-end">
                    <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-4 text-white text-right">
                        <div className="text-xs text-gray-400 uppercase tracking-wider font-bold">Status</div>
                        <div className={`text-xl font-bold ${gameState === 'ACTIVE' ? 'text-blue-400' :
                                gameState === 'VOTING' ? 'text-yellow-400' :
                                    gameState === 'ENDED' ? 'text-red-400' : 'text-white'
                            }`}>
                            {gameState === 'WAITING' && 'Waiting for Players'}
                            {gameState === 'ACTIVE' && 'Game Active'}
                            {gameState === 'VOTING' && 'Voting Phase'}
                            {gameState === 'ENDED' && 'Game Over'}
                        </div>
                    </div>

                    {/* Stability Meter */}
                    {gameState === 'ACTIVE' && (
                        <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-2 text-white w-48">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-400 font-bold">STABILITY</span>
                                <span className={`${stability < 30 ? 'text-red-500' : 'text-green-500'}`}>{Math.round(stability)}%</span>
                            </div>
                            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-500 ${stability < 30 ? 'bg-red-500' : stability < 60 ? 'bg-yellow-500' : 'bg-green-500'
                                        }`}
                                    style={{ width: `${stability}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Center: Timer (only when active) */}
            {gameState === 'ACTIVE' && (
                <div className="absolute top-24 left-1/2 -translate-x-1/2 pointer-events-none">
                    <div className={`text-4xl font-black drop-shadow-lg ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-white'
                        }`}>
                        {timeLeft}s
                    </div>
                </div>
            )}

            {/* Bottom: Player Queue & Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-end pointer-events-auto">

                {/* Player List */}
                <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-4 text-white w-full md:w-64 max-h-48 overflow-y-auto">
                    <div className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-2">Players ({players.length}/7)</div>
                    <div className="space-y-2">
                        {players.map((player) => (
                            <div
                                key={player.id}
                                className={`flex justify-between items-center p-2 rounded-lg text-sm ${player.isCurrentTurn ? 'bg-blue-500/20 border border-blue-500/50' :
                                    !player.isAlive ? 'bg-red-500/10 opacity-50' : 'bg-white/5'
                                    }`}
                            >
                                <span className="font-mono">{formatAddress(player.address)}</span>
                                {player.isCurrentTurn && <span className="text-blue-400 text-xs font-bold">TURN</span>}
                                {!player.isAlive && <span className="text-red-400 text-xs">OUT</span>}
                            </div>
                        ))}
                        {players.length === 0 && <div className="text-gray-500 italic text-sm">No players yet</div>}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex-1 flex justify-end gap-3">
                    {gameState === 'WAITING' && (
                        <div className="flex flex-col gap-2 items-end">
                            <div className="text-xs text-gray-400 bg-black/40 p-2 rounded mb-2">
                                Creator Settings: <span className="text-white">Medium Difficulty • 1 USDC Stake</span>
                            </div>
                            <button
                                onClick={onJoin}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-blue-900/20 transition-all active:scale-95"
                            >
                                Join Game (1 USDC)
                            </button>
                        </div>
                    )}

                    {gameState === 'ACTIVE' && (
                        <button
                            onClick={onReload}
                            className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-4 rounded-xl font-bold shadow-lg shadow-purple-900/20 transition-all active:scale-95"
                        >
                            Reload Stack
                        </button>
                    )}

                    {gameState === 'VOTING' && (
                        <div className="flex flex-col gap-2 bg-black/60 p-4 rounded-xl border border-yellow-500/30">
                            <div className="text-center text-yellow-400 font-bold mb-2">STACK COLLAPSED! VOTE:</div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onVote(true)}
                                    className="bg-green-600 hover:bg-green-500 text-white px-6 py-4 rounded-xl font-bold shadow-lg transition-all active:scale-95 flex-1"
                                >
                                    Split Pot
                                </button>
                                <button
                                    onClick={() => onVote(false)}
                                    className="bg-red-600 hover:bg-red-500 text-white px-6 py-4 rounded-xl font-bold shadow-lg transition-all active:scale-95 flex-1"
                                >
                                    Continue
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
