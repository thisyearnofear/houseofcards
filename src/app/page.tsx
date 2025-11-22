import Link from "next/link"
import { ConnectButton } from '@rainbow-me/rainbowkit'
import Image from 'next/image'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black text-white">
      <header className="flex justify-between items-center p-6 border-b border-white/10">
        <Link href="/" className="flex items-center space-x-2">
          <Image
            src="/images/agnej.png"
            alt="Agnej Logo"
            width={40}
            height={40}
          />
          <span className="text-xl font-bold ml-2">Agnej</span>
        </Link>
        <ConnectButton />
      </header>

      <main className="container mx-auto px-6 py-16 flex flex-col items-center justify-center min-h-[70vh]">
        <div className="text-center mb-12">
          <h1 className="text-7xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            AGNEJ
          </h1>
          <p className="text-xl md:text-2xl mb-2 text-gray-300 max-w-2xl mx-auto">
            A decentralized blockchain-based physics game
          </p>
          <p className="text-lg text-gray-400 max-w-xl mx-auto">
            Built on Linea • Connect your wallet to play and earn rewards
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <Link
            href="/play"
            className="relative group inline-flex items-center justify-center bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 px-10 py-5 rounded-xl font-semibold text-lg transition-all active:scale-95 shadow-lg shadow-blue-900/30 hover:shadow-xl hover:shadow-blue-900/40 transform hover:-translate-y-1"
          >
            <span className="relative z-10">🎯 Play Now</span>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity blur-md -z-10"></div>
          </Link>
          <Link
            href="/leaderboard"
            className="relative group inline-flex items-center justify-center bg-gray-800 hover:bg-gray-700 px-10 py-5 rounded-xl font-semibold text-lg transition-all active:scale-95 border border-gray-700 hover:border-gray-600"
          >
            <span className="relative z-10">🏆 Leaderboard</span>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-gray-700 to-gray-600 opacity-0 group-hover:opacity-20 transition-opacity blur-md -z-10"></div>
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl w-full">
          <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-xl border border-white/10 hover:border-white/20 transition-all">
            <h3 className="text-xl font-semibold mb-3 text-blue-400">Solo Mode</h3>
            <p className="text-gray-300">Race against time removing blocks in our challenging solo mode with leaderboard rankings</p>
          </div>
          <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-xl border border-white/10 hover:border-white/20 transition-all">
            <h3 className="text-xl font-semibold mb-3 text-purple-400">Multiplayer</h3>
            <p className="text-gray-300">Battle against up to 6 other players in turn-based tower destruction</p>
          </div>
          <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-xl border border-white/10 hover:border-white/20 transition-all">
            <h3 className="text-xl font-semibold mb-3 text-pink-400">Blockchain</h3>
            <p className="text-gray-300">Secure on-chain leaderboards and rewards powered by Linea</p>
          </div>
        </div>
      </main>

      <footer className="py-8 text-center text-gray-500 text-sm">
        <p>© {new Date().getFullYear()} Agnej. Built for the decentralized future.</p>
      </footer>
    </div>
  )
}
