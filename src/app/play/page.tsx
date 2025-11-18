import Link from 'next/link'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import Game from '@/components/Game'

export default function PlayPage() {
  return (
    <div className="relative w-full h-screen">
      {/* Header overlay */}
      <header className="absolute top-0 left-0 right-0 z-10 p-4 bg-black/50">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-white text-xl font-bold">
            House of Cards
          </Link>
          <ConnectButton />
        </div>
      </header>

      {/* Game component */}
      <Game />
    </div>
  )
}
