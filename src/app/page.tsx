import Link from "next/link"
import { ConnectButton } from '@rainbow-me/rainbowkit'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black text-white">
      <header className="flex justify-between items-center p-6 border-b border-white/10">
        <h1 className="text-3xl font-bold">House of Cards</h1>
        <ConnectButton />
      </header>
      <main className="container mx-auto px-6 py-16 text-center">
        <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          Inverse Jenga
        </h2>
        <p className="text-xl mb-8 max-w-2xl mx-auto text-gray-300">
          Built on Linea <br />
          Connect your wallet to play and earn rewards.
        </p>
        <div className="space-x-4">
          <Link 
            href="/play" 
            className="inline-flex items-center bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 px-8 py-4 rounded-xl font-semibold transition-all active:scale-95 shadow-lg shadow-blue-900/30"
          >
            🎯 Play Now
          </Link>
          <Link 
            href="/leaderboard" 
            className="inline-flex items-center bg-gray-700 hover:bg-gray-600 px-8 py-4 rounded-xl font-semibold transition-all active:scale-95"
          >
            🏆 Leaderboard
          </Link>
        </div>
      </main>
    </div>
  )
}
