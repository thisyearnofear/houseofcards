export const LeaderboardABI = [
    {
        "inputs": [
            { "internalType": "string", "name": "difficulty", "type": "string" },
            { "internalType": "uint256", "name": "score", "type": "uint256" }
        ],
        "name": "submitScore",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "player", "type": "address" },
            { "internalType": "string", "name": "difficulty", "type": "string" }
        ],
        "name": "getHighScore",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "address", "name": "player", "type": "address" },
            { "indexed": false, "internalType": "string", "name": "difficulty", "type": "string" },
            { "indexed": false, "internalType": "uint256", "name": "score", "type": "uint256" },
            { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
        ],
        "name": "ScoreSubmitted",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "address", "name": "player", "type": "address" },
            { "indexed": false, "internalType": "string", "name": "difficulty", "type": "string" },
            { "indexed": false, "internalType": "uint256", "name": "score", "type": "uint256" }
        ],
        "name": "NewHighScore",
        "type": "event"
    }
] as const
