'use client'

import '@rainbow-me/rainbowkit/styles.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { sepolia, mainnet, lineaSepolia } from 'wagmi/chains'

const queryClient = new QueryClient()

const config = getDefaultConfig({
  appName: 'Agnej',
  projectId: 'demo-project-id', // Replace with your WalletConnect project ID
  chains: [lineaSepolia, sepolia, mainnet],
  ssr: true,
})

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
