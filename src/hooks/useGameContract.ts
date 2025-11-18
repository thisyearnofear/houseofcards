import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from 'wagmi'
import { HouseOfCardsABI } from '../abi/HouseOfCardsABI'
import { parseUnits } from 'viem'

// TODO: Replace with your deployed contract address
const CONTRACT_ADDRESS = '0x1DFd9003590E4A67594748Ecec18451e6cBDDD90'

export function useGameContract() {
    const { address } = useAccount()
    const { writeContract, data: hash, isPending, error } = useWriteContract()

    const { isLoading: isConfirming, isSuccess: isConfirmed } =
        useWaitForTransactionReceipt({ hash })

    // Read Game ID
    const { data: gameId } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: HouseOfCardsABI,
        functionName: 'currentGameId',
    })

    // Read Game State
    const { data: gameStateData, refetch: refetchGameState } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: HouseOfCardsABI,
        functionName: 'games',
        args: gameId ? [gameId] : undefined,
        query: {
            enabled: !!gameId,
            refetchInterval: 2000, // Poll every 2s
        }
    })

    // Actions
    const joinGame = async () => {
        // Note: In a real app, you'd need to Approve USDC first
        writeContract({
            address: CONTRACT_ADDRESS,
            abi: HouseOfCardsABI,
            functionName: 'joinGame',
            value: parseUnits('0.001', 18), // 0.001 ETH
        })
    }

    const reload = async () => {
        writeContract({
            address: CONTRACT_ADDRESS,
            abi: HouseOfCardsABI,
            functionName: 'reload',
            value: parseUnits('0.001', 18), // 0.001 ETH
        })
    }

    return {
        gameId,
        gameStateData,
        joinGame,
        reload,
        isPending,
        isConfirming,
        isConfirmed,
        hash,
        error
    }
}
