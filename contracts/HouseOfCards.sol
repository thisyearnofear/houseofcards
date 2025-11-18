// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract HouseOfCards is ReentrancyGuard, Ownable {
    // --- State Variables ---
    
    enum GameState { WAITING, ACTIVE, VOTING, ENDED }
    
    struct Game {
        uint256 id;
        GameState state;
        uint256 pot;
        uint256 turnDuration;
        uint256 startTime;
        uint256 lastMoveTime;
        address currentPlayer;
        uint256 currentTurnIndex;
        address[] players;
        mapping(address => bool) isActive; // Is player still in the game?
        mapping(address => uint256) reloadCount;
        uint256 collapseThreshold; // e.g., 40
    }

    uint256 public currentGameId;
    mapping(uint256 => Game) public games;
    
    // Config
    uint256 public constant MAX_PLAYERS = 7;
    uint256 public constant ENTRY_STAKE = 0.001 ether; // 0.001 ETH
    uint256 public constant RELOAD_COST = 0.001 ether; // 0.001 ETH
    uint256 public constant MAX_RELOADS = 2;
    uint256 public constant TURN_DURATION = 30 seconds;

    // Events
    event GameCreated(uint256 indexed gameId);
    event PlayerJoined(uint256 indexed gameId, address player);
    event GameStarted(uint256 indexed gameId);
    event TurnChanged(uint256 indexed gameId, address player, uint256 deadline);
    event PlayerEliminated(uint256 indexed gameId, address player, string reason);
    event PlayerReloaded(uint256 indexed gameId, address player);
    event GameCollapsed(uint256 indexed gameId);
    event GameEnded(uint256 indexed gameId, address winner, uint256 amount);
    event PotSplit(uint256 indexed gameId, uint256 amountPerPlayer);

    constructor() Ownable(msg.sender) {
        _createGame();
    }

    // --- Core Gameplay ---

    function joinGame() external payable nonReentrant {
        Game storage game = games[currentGameId];
        require(game.state == GameState.WAITING, "Game already started");
        require(game.players.length < MAX_PLAYERS, "Game full");
        require(msg.value == ENTRY_STAKE, "Incorrect stake amount");

        game.players.push(msg.sender);
        game.isActive[msg.sender] = true;
        game.pot += msg.value;

        emit PlayerJoined(currentGameId, msg.sender);

        if (game.players.length == MAX_PLAYERS) {
            _startGame();
        }
    }

    function _startGame() internal {
        Game storage game = games[currentGameId];
        game.state = GameState.ACTIVE;
        game.startTime = block.timestamp;
        game.lastMoveTime = block.timestamp;
        game.currentTurnIndex = 0;
        game.currentPlayer = game.players[0];

        emit GameStarted(currentGameId);
        emit TurnChanged(currentGameId, game.currentPlayer, block.timestamp + TURN_DURATION);
    }

    // Called by server oracle when a move is completed
    function completeTurn(uint256 gameId) external onlyOwner {
        Game storage game = games[gameId];
        require(game.state == GameState.ACTIVE, "Game not active");
        
        // Move to next active player
        _nextTurn(game);
    }

    // Called by server oracle if player runs out of time
    function timeoutTurn(uint256 gameId) external onlyOwner {
        Game storage game = games[gameId];
        require(game.state == GameState.ACTIVE, "Game not active");
        
        // Eliminate current player
        _eliminatePlayer(game, game.currentPlayer, "Timeout");
        
        // Move to next
        _nextTurn(game);
    }

    function reload() external payable nonReentrant {
        Game storage game = games[currentGameId];
        require(game.state == GameState.ACTIVE, "Game not active");
        require(!game.isActive[msg.sender], "Player still active");
        require(game.reloadCount[msg.sender] < MAX_RELOADS, "Max reloads reached");
        require(msg.value == RELOAD_COST, "Incorrect reload cost");
        
        game.isActive[msg.sender] = true;
        game.reloadCount[msg.sender]++;
        game.pot += msg.value;
        
        emit PlayerReloaded(currentGameId, msg.sender);
    }

    // --- Game End & Voting ---

    // Called by server oracle when stack collapses
    function reportCollapse(uint256 gameId) external onlyOwner {
        Game storage game = games[gameId];
        require(game.state == GameState.ACTIVE, "Game not active");
        
        game.state = GameState.VOTING;
        emit GameCollapsed(gameId);
        
        // Logic for voting would go here
        // For MVP, let's just split the pot among survivors for simplicity?
        // Or trigger the vote phase.
        
        _distributePot(game);
    }

    // --- Internal Helpers ---

    function _nextTurn(Game storage game) internal {
        uint256 initialIndex = game.currentTurnIndex;
        uint256 nextIndex = (initialIndex + 1) % game.players.length;
        
        // Find next active player
        while (!game.isActive[game.players[nextIndex]] && nextIndex != initialIndex) {
            nextIndex = (nextIndex + 1) % game.players.length;
        }
        
        // If we looped back to start and they aren't active, everyone is dead (shouldn't happen)
        // If we found the same player, they are the winner
        if (nextIndex == initialIndex && !game.isActive[game.players[nextIndex]]) {
             // Everyone eliminated?
             game.state = GameState.ENDED;
             return;
        }
        
        // Check for winner (only 1 active player left)
        uint256 activeCount = 0;
        address lastSurvivor;
        for(uint i=0; i<game.players.length; i++) {
            if(game.isActive[game.players[i]]) {
                activeCount++;
                lastSurvivor = game.players[i];
            }
        }
        
        if (activeCount == 1) {
            _endGameWinner(game, lastSurvivor);
            return;
        }

        game.currentTurnIndex = nextIndex;
        game.currentPlayer = game.players[nextIndex];
        game.lastMoveTime = block.timestamp;
        
        emit TurnChanged(game.id, game.currentPlayer, block.timestamp + TURN_DURATION);
    }

    function _eliminatePlayer(Game storage game, address player, string memory reason) internal {
        game.isActive[player] = false;
        emit PlayerEliminated(game.id, player, reason);
    }

    function _endGameWinner(Game storage game, address winner) internal {
        game.state = GameState.ENDED;
        uint256 amount = game.pot;
        game.pot = 0;
        
        (bool sent, ) = winner.call{value: amount}("");
        require(sent, "Failed to send Ether");
        
        emit GameEnded(game.id, winner, amount);
        
        // Start new game
        _createGame();
    }
    
    function _distributePot(Game storage game) internal {
        // MVP: Split equally among survivors
        uint256 activeCount = 0;
        for(uint i=0; i<game.players.length; i++) {
            if(game.isActive[game.players[i]]) activeCount++;
        }
        
        if (activeCount > 0) {
            uint256 share = game.pot / activeCount;
            for(uint i=0; i<game.players.length; i++) {
                if(game.isActive[game.players[i]]) {
                    (bool sent, ) = game.players[i].call{value: share}("");
                    require(sent, "Failed to send Ether");
                }
            }
            emit PotSplit(game.id, share);
        }
        
        game.state = GameState.ENDED;
        game.pot = 0;
        _createGame();
    }

    function _createGame() internal {
        currentGameId++;
        Game storage newGame = games[currentGameId];
        newGame.id = currentGameId;
        newGame.state = GameState.WAITING;
        newGame.turnDuration = TURN_DURATION;
        emit GameCreated(currentGameId);
    }
}
