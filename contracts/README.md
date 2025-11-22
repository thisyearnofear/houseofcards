# Agnej Contracts

## Leaderboard Contract

The `Leaderboard.sol` contract is used to track high scores for the Solo Competitor mode.

### Deployment

1.  **Using Remix:**
    *   Copy the content of `Leaderboard.sol` to Remix IDE.
    *   Compile the contract.
    *   Select "Injected Provider - MetaMask" (ensure you are on Linea Sepolia).
    *   Deploy the contract.
    *   Copy the deployed contract address.

2.  **Update Frontend:**
    *   Open `src/hooks/useLeaderboard.ts`.
    *   Replace `LEADERBOARD_ADDRESS` with your new contract address.

### Verification

To verify the contract on Etherscan/Lineascan, flatten the contract or use the standard verification tools provided by Remix or Hardhat.
