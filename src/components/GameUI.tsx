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
    maxPlayers?: number
    difficulty?: string
    stake?: number
    isPractice?: boolean
    score?: number
    highScore?: number
    gameMode?: string
    onJoin: () => void
    onReload: () => void
    onVote: (split: boolean) => void
    onExit?: () => void
    showRules?: boolean
    setShowRules?: (show: boolean) => void
}

export default function GameUI({
    gameState,
    potSize,
    timeLeft,
    players,
    currentPlayerId,
    fallenCount = 0,
    totalBlocks = 48,
    maxPlayers = 7,
    difficulty = 'MEDIUM',
    stake = 1,
    isPractice = false,
    score,
    highScore = 0,
    gameMode,
    onJoin,
    onReload,
    onVote,
    onExit,
    showRules = false,
    setShowRules
}: GameUIProps) {

    const [scoreJuice, setScoreJuice] = React.useState(false)
    // Local state fallback if not controlled
    const [localShowRules, setLocalShowRules] = React.useState(false)

    const isRulesVisible = setShowRules ? showRules : localShowRules
    const toggleRules = () => setShowRules ? setShowRules(!showRules) : setLocalShowRules(!localShowRules)
    const closeRules = () => setShowRules ? setShowRules(false) : setLocalShowRules(false)

    const prevScoreRef = React.useRef(score)

    React.useEffect(() => {
        if (score !== undefined && score > (prevScoreRef.current || 0)) {
            setScoreJuice(true)
            const timer = setTimeout(() => setScoreJuice(false), 500)
            return () => clearTimeout(timer)
        }
        prevScoreRef.current = score
    }, [score])

    const formatAddress = (addr: string) => {
        return addr.slice(0, 6) + '...' + addr.slice(-4)
    }

    const stability = Math.max(0, 100 - ((fallenCount / totalBlocks) / 0.4) * 100) // 0.4 is threshold

    return (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-6">

            {/* Top Bar: Pot & Status */}
            <div className="flex justify-between items-start pointer-events-auto">
                <div className="flex gap-4">
                    {onExit && (
                        <button
                            onClick={onExit}
                            className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-4 text-white hover:bg-red-500/20 hover:border-red-500/50 transition-all group"
                            title="Exit to Menu"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-hover:text-red-400">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                <polyline points="16 17 21 12 16 7" />
                                <line x1="21" x2="9" y1="12" y2="12" />
                            </svg>
                        </button>
                    )}
                    <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-4 text-white">
                        <div className="text-xs text-gray-400 uppercase tracking-wider font-bold">Pot Size</div>
                        <div className="text-2xl font-mono text-green-400">${potSize.toFixed(2)} USDC</div>
                    </div>

                    {/* Score Display for Competitor Mode */}
                    {score !== undefined && (
                        <div className="flex gap-4">
                            <div className={`bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-4 text-white relative transition-transform duration-200 ${scoreJuice ? 'scale-110 border-yellow-400/50' : ''}`}>
                                <div className="text-xs text-gray-400 uppercase tracking-wider font-bold">Score</div>
                                <div className="text-2xl font-mono text-yellow-400 flex items-center gap-2">
                                    {score}
                                    {scoreJuice && <span className="text-sm text-yellow-200 animate-bounce absolute -right-2 -top-2">+1</span>}
                                </div>
                            </div>
                            <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-4 text-white opacity-80">
                                <div className="text-xs text-gray-400 uppercase tracking-wider font-bold">Best</div>
                                <div className="text-2xl font-mono text-gray-300">{Math.max(score || 0, highScore)}</div>
                            </div>
                        </div>
                    )}
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
                <div className="absolute top-24 left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center gap-2">
                    <div className={`text-4xl font-black drop-shadow-lg transition-colors duration-300 ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-white'
                        }`}>
                        {timeLeft}s
                    </div>
                    {/* Timer Bar */}
                    <div className="w-64 h-2 bg-black/50 rounded-full overflow-hidden backdrop-blur-sm border border-white/10">
                        <div
                            className={`h-full transition-all duration-1000 ease-linear ${timeLeft <= 10 ? 'bg-red-500' : 'bg-white'}`}
                            style={{ width: `${(timeLeft / 30) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Bottom: Player Queue & Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-end pointer-events-auto">

                {/* Player List */}
                <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-4 text-white w-full md:w-64 max-h-48 overflow-y-auto">
                    <div className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-2">
                        Players ({players.length}/{maxPlayers})
                        {!isPractice && (
                            <span className="text-white ml-2">• {difficulty} • {stake} USDC</span>
                        )}
                        {isPractice && (
                            <span className="text-purple-400 ml-2">• Practice Mode</span>
                        )}
                    </div>
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
                                {isPractice ? (
                                    <>Creator Settings: <span className="text-purple-400">Practice Mode • No Stake</span></>
                                ) : (
                                    <>Creator Settings: <span className="text-white">{difficulty} • {stake} USDC</span></>
                                )}
                            </div>
                            <button
                                onClick={onJoin}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-blue-900/20 transition-all active:scale-95"
                            >
                                {isPractice ? 'Join Practice' : `Join Game (${stake} USDC)`}
                            </button>
                        </div>
                    )}

                    {gameState === 'ACTIVE' && (
                        <button
                            onClick={onReload}
                            className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-4 rounded-xl font-bold shadow-lg shadow-purple-900/20 transition-all active:scale-95"
                        >
                            {isPractice ? 'Reset Tower' : 'Reload Stack'}
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
            {/* Help Button & Overlay */}
            <div className="pointer-events-auto">
                <button
                    onClick={toggleRules}
                    className="absolute top-20 right-6 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full backdrop-blur-md border border-white/10 transition-all z-40"
                    title={gameMode === 'SOLO_PRACTICE' ? 'Practice Mode' : 'Tactical Briefing'}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                </button>

                {isRulesVisible && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={closeRules}>
                        <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-white/20 p-8 rounded-2xl max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-start mb-6">
                                <h2 className="text-2xl font-bold text-white tracking-wider">
                                    {gameMode === 'SOLO_PRACTICE' ? 'PRACTICE MODE' : 'TACTICAL BRIEFING'}
                                </h2>
                                <button onClick={closeRules} className="text-gray-400 hover:text-white">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            </div>

                            {gameMode === 'SOLO_PRACTICE' ? (
                                // Practice Mode Briefing - Friendly & Exploratory
                                <div className="space-y-6">
                                    <div className="flex gap-4 items-start">
                                        <div className="bg-green-500/20 p-3 rounded-lg text-green-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                        </div>
                                        <div>
                                            <h3 className="text-white font-bold mb-1">SANDBOX MODE</h3>
                                            <p className="text-gray-400 text-sm">Experiment freely! No time limits, no locked layers, no pressure. Perfect for learning the physics.</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 items-start">
                                        <div className="bg-blue-500/20 p-3 rounded-lg text-blue-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                        </div>
                                        <div>
                                            <h3 className="text-white font-bold mb-1">TAKE YOUR TIME</h3>
                                            <p className="text-gray-400 text-sm"><span className="text-blue-400 font-bold">No timer!</span> Experiment with different strategies and learn how blocks interact.</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 items-start">
                                        <div className="bg-purple-500/20 p-3 rounded-lg text-purple-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                                        </div>
                                        <div>
                                            <h3 className="text-white font-bold mb-1">ALL LAYERS UNLOCKED</h3>
                                            <p className="text-gray-400 text-sm"><span className="text-purple-400 font-bold">Full access!</span> Remove blocks from any layer, including the top. Explore freely.</p>
                                        </div>
                                    </div>

                                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mt-4">
                                        <p className="text-green-300 text-sm text-center">
                                            💡 <span className="font-bold">Tip:</span> When you're ready for a challenge, try <span className="font-bold">Solo Competitor</span> mode!
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                // Competitor Mode Briefing - Tactical & Competitive
                                <div className="space-y-6">
                                    <div className="flex gap-4 items-start">
                                        <div className="bg-blue-500/20 p-3 rounded-lg text-blue-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                                        </div>
                                        <div>
                                            <h3 className="text-white font-bold mb-1">THE MISSION</h3>
                                            <p className="text-gray-400 text-sm">Remove blocks from the tower to score points. Each removed block = 1 point.</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 items-start">
                                        <div className="bg-red-500/20 p-3 rounded-lg text-red-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                        </div>
                                        <div>
                                            <h3 className="text-white font-bold mb-1">RESTRICTED ZONES</h3>
                                            <p className="text-gray-400 text-sm">The top 2 layers are <span className="text-red-400 font-bold">LOCKED</span>. You cannot remove blocks from these layers.</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 items-start">
                                        <div className="bg-yellow-500/20 p-3 rounded-lg text-yellow-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                        </div>
                                        <div>
                                            <h3 className="text-white font-bold mb-1">TIME LIMIT</h3>
                                            <p className="text-gray-400 text-sm">You have <span className="text-yellow-400 font-bold">30 seconds</span> to make a move. The timer resets after each successful score.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={closeRules}
                                className="w-full mt-8 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-colors border border-white/10"
                            >
                                {gameMode === 'SOLO_PRACTICE' ? 'LET\'S EXPLORE!' : 'ACKNOWLEDGED'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
