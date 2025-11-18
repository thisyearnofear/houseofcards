import Link from "next/link"
import { ConnectButton } from '@rainbow-me/rainbowkit'

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      <header className="flex justify-between items-center p-6">
        <h1 className="text-3xl font-bold">House of Cards</h1>
        <ConnectButton />
      </header>
      <main className="container mx-auto px-6 py-16 text-center">
        <h2 className="text-5xl font-bold mb-6">Web3 Jenga Game</h2>
        <p className="text-xl mb-8 max-w-2xl mx-auto">
          Experience physics-based Jenga gameplay with blockchain integration.
          Connect your wallet to play and earn rewards.
        </p>
        <div className="space-x-4">
          <Link href="/play" className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-lg font-semibold">
            Play Now
          </Link>
          <Link href="/leaderboard" className="bg-gray-700 hover:bg-gray-600 px-8 py-3 rounded-lg font-semibold">
            Leaderboard
          </Link>
        </div>
      </main>
    </div>
  )
}
