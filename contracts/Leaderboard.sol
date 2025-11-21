// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Leaderboard {
    // Events
    event ScoreSubmitted(address indexed player, string difficulty, uint256 score, uint256 timestamp);
    event NewHighScore(address indexed player, string difficulty, uint256 score);

    // State
    // Difficulty -> Player -> Score
    mapping(string => mapping(address => uint256)) public highScores;

    // Submit a score
    function submitScore(string memory difficulty, uint256 score) external {
        require(bytes(difficulty).length > 0, "Invalid difficulty");
        
        uint256 currentHighScore = highScores[difficulty][msg.sender];
        
        // Always emit the submission event for the global log
        emit ScoreSubmitted(msg.sender, difficulty, score, block.timestamp);

        // If this is a personal best, update state and emit high score event
        if (score > currentHighScore) {
            highScores[difficulty][msg.sender] = score;
            emit NewHighScore(msg.sender, difficulty, score);
        }
    }

    // Get a player's high score for a specific difficulty
    function getHighScore(address player, string memory difficulty) external view returns (uint256) {
        return highScores[difficulty][player];
    }
}
