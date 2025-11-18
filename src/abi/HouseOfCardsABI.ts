export const HouseOfCardsABI = [
    // Read Functions
    {
        "inputs": [],
        "name": "currentGameId",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "name": "games",
        "outputs": [
            { "internalType": "uint256", "name": "id", "type": "uint256" },
            { "internalType": "enum HouseOfCards.GameState", "name": "state", "type": "uint8" },
            { "internalType": "uint256", "name": "pot", "type": "uint256" },
            { "internalType": "uint256", "name": "turnDuration", "type": "uint256" },
            { "internalType": "uint256", "name": "startTime", "type": "uint256" },
            { "internalType": "uint256", "name": "lastMoveTime", "type": "uint256" },
            { "internalType": "address", "name": "currentPlayer", "type": "address" },
            { "internalType": "uint256", "name": "currentTurnIndex", "type": "uint256" },
            { "internalType": "uint256", "name": "collapseThreshold", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "ENTRY_STAKE",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },

    // Write Functions
    {
        "inputs": [],
        "name": "joinGame",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "reload",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    }
] as const
