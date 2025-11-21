import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from 'wagmi'
import { LeaderboardABI } from '../abi/LeaderboardABI'

// Placeholder Address - Needs to be replaced with actual deployed contract address on Linea Sepolia
const LEADERBOARD_ADDRESS = '0x802C3a9953C4fcEC807eF1B464F7b15310C2396b'

export function useLeaderboard() {
    const { address } = useAccount()
    const { writeContract, data: hash, isPending, error } = useWriteContract()

    const { isLoading: isConfirming, isSuccess: isConfirmed } =
        useWaitForTransactionReceipt({ hash })

    // Read Personal High Score
    const { data: highScoreData, refetch: refetchHighScore } = useReadContract({
        address: LEADERBOARD_ADDRESS,
        abi: LeaderboardABI,
        functionName: 'getHighScore',
        args: address ? [address, 'MEDIUM'] : undefined, // Default to MEDIUM for now, or pass as arg if possible
        query: {
            enabled: !!address,
        }
    })

    // Helper to get score for specific difficulty (if we want to support dynamic checking)
    // For now, the hook is bound to the current user.

    // Actions
    const submitScore = async (difficulty: string, score: number) => {
        if (!address) {
            console.error('Wallet not connected')
            return
        }

        console.log(`Submitting score: ${score} for difficulty: ${difficulty} to ${LEADERBOARD_ADDRESS}`)

        writeContract({
            address: LEADERBOARD_ADDRESS,
            abi: LeaderboardABI,
            functionName: 'submitScore',
            args: [difficulty, BigInt(score)],
        })
    }

    return {
        submitScore,
        highScore: highScoreData ? Number(highScoreData) : 0,
        refetchHighScore,
        isPending,
        isConfirming,
        isConfirmed,
        hash,
        error
    }
}
