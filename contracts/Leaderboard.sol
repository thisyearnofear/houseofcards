// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title Leaderboard
 * @notice On-chain leaderboard for Agnej game
 * @dev Stores high scores with ranking support
 */
contract Leaderboard {
    // ============ Events ============
    
    event ScoreSubmitted(
        address indexed player, 
        string difficulty, 
        uint256 score, 
        uint256 timestamp
    );
    
    event NewHighScore(
        address indexed player, 
        string difficulty, 
        uint256 score
    );

    // ============ Structs ============
    
    struct ScoreEntry {
        address player;
        uint256 score;
        uint256 timestamp;
    }

    // ============ State Variables ============
    
    // Difficulty -> Player -> High Score
    mapping(string => mapping(address => uint256)) public highScores;
    
    // Difficulty -> List of all players who have scores
    mapping(string => address[]) private players;
    
    // Difficulty -> Player -> Index in players array (for existence check)
    mapping(string => mapping(address => uint256)) private playerIndex;
    
    // Difficulty -> Player -> Has submitted at least once
    mapping(string => mapping(address => bool)) private hasSubmitted;

    // ============ Public Functions ============

    /**
     * @notice Submit a score for the specified difficulty
     * @param difficulty The difficulty level (EASY, MEDIUM, HARD)
     * @param score The score achieved
     */
    function submitScore(string memory difficulty, uint256 score) external {
        require(bytes(difficulty).length > 0, "Invalid difficulty");
        require(score > 0, "Score must be greater than 0");
        
        uint256 currentHighScore = highScores[difficulty][msg.sender];
        
        // Track player if first submission for this difficulty
        if (!hasSubmitted[difficulty][msg.sender]) {
            playerIndex[difficulty][msg.sender] = players[difficulty].length;
            players[difficulty].push(msg.sender);
            hasSubmitted[difficulty][msg.sender] = true;
        }
        
        // Always emit the submission event for the global log
        emit ScoreSubmitted(msg.sender, difficulty, score, block.timestamp);

        // If this is a personal best, update state and emit high score event
        if (score > currentHighScore) {
            highScores[difficulty][msg.sender] = score;
            emit NewHighScore(msg.sender, difficulty, score);
        }
    }

    /**
     * @notice Get a player's high score for a specific difficulty
     * @param player The player's address
     * @param difficulty The difficulty level
     * @return The player's high score (0 if never played)
     */
    function getHighScore(address player, string memory difficulty) 
        external 
        view 
        returns (uint256) 
    {
        return highScores[difficulty][player];
    }

    /**
     * @notice Get top N scores for a difficulty level
     * @param difficulty The difficulty level
     * @param count Maximum number of scores to return
     * @return Array of ScoreEntry structs, sorted highest to lowest
     */
    function getTopScores(string memory difficulty, uint256 count) 
        external 
        view 
        returns (ScoreEntry[] memory) 
    {
        address[] memory allPlayers = players[difficulty];
        uint256 totalPlayers = allPlayers.length;
        
        if (totalPlayers == 0) {
            return new ScoreEntry[](0);
        }
        
        // Create array of all scores
        ScoreEntry[] memory allScores = new ScoreEntry[](totalPlayers);
        for (uint256 i = 0; i < totalPlayers; i++) {
            address player = allPlayers[i];
            allScores[i] = ScoreEntry({
                player: player,
                score: highScores[difficulty][player],
                timestamp: 0 // We don't store individual timestamps for high scores
            });
        }
        
        // Sort descending (bubble sort - inefficient but simple for small datasets)
        for (uint256 i = 0; i < totalPlayers; i++) {
            for (uint256 j = i + 1; j < totalPlayers; j++) {
                if (allScores[j].score > allScores[i].score) {
                    ScoreEntry memory temp = allScores[i];
                    allScores[i] = allScores[j];
                    allScores[j] = temp;
                }
            }
        }
        
        // Return top N scores
        uint256 returnCount = count < totalPlayers ? count : totalPlayers;
        ScoreEntry[] memory topScores = new ScoreEntry[](returnCount);
        for (uint256 i = 0; i < returnCount; i++) {
            topScores[i] = allScores[i];
        }
        
        return topScores;
    }

    /**
     * @notice Get a player's rank for a specific difficulty
     * @param player The player's address
     * @param difficulty The difficulty level
     * @return rank The player's rank (1 = best, 0 = unranked/never played)
     */
    function getPlayerRank(address player, string memory difficulty) 
        external 
        view 
        returns (uint256 rank) 
    {
        if (!hasSubmitted[difficulty][player]) {
            return 0; // Never played
        }
        
        uint256 playerScore = highScores[difficulty][player];
        if (playerScore == 0) {
            return 0; // Score of 0
        }
        
        address[] memory allPlayers = players[difficulty];
        uint256 totalPlayers = allPlayers.length;
        
        rank = 1; // Start at rank 1
        for (uint256 i = 0; i < totalPlayers; i++) {
            address otherPlayer = allPlayers[i];
            if (otherPlayer != player && highScores[difficulty][otherPlayer] > playerScore) {
                rank++;
            }
        }
        
        return rank;
    }

    /**
     * @notice Get total number of players for a difficulty
     * @param difficulty The difficulty level
     * @return Total number of unique players who have submitted scores
     */
    function getTotalPlayers(string memory difficulty) 
        external 
        view 
        returns (uint256) 
    {
        return players[difficulty].length;
    }

    /**
     * @notice Get all players for a difficulty (for external queries)
     * @param difficulty The difficulty level
     * @return Array of player addresses
     */
    function getAllPlayers(string memory difficulty) 
        external 
        view 
        returns (address[] memory) 
    {
        return players[difficulty];
    }
}
