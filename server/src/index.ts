import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { BlockchainService } from './services/blockchain';
import { PhysicsWorld } from './physics';

dotenv.config();

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all for dev
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3001;

// Game State (In-Memory for MVP)
interface GameState {
    id: number;
    players: string[];
    currentPlayer: string | null;
    status: 'WAITING' | 'ACTIVE' | 'ENDED';
    maxPlayers: number;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    stake: number;
    isPractice: boolean;
    // Physics state would go here
}

let currentGameState: GameState = {
    id: 0,
    players: [],
    currentPlayer: null,
    status: 'WAITING',
    maxPlayers: 7,
    difficulty: 'MEDIUM',
    stake: 1,
    isPractice: false
};

// Initialize Blockchain Service
const blockchain = new BlockchainService();

// Setup Event Listeners
blockchain.listenToEvents({
    onPlayerJoined: (gameId, player) => {
        if (currentGameState.id !== gameId) {
            // New game detected? Or just sync issue. 
            // For MVP assume single game instance
            currentGameState.id = gameId;
        }
        if (!currentGameState.players.includes(player)) {
            currentGameState.players.push(player);
        }
        io.emit('gameState', currentGameState);
    },
    onGameStarted: (gameId) => {
        currentGameState.status = 'ACTIVE';
        io.emit('gameState', currentGameState);
    },
    onTurnChanged: (gameId, player, deadline) => {
        currentGameState.currentPlayer = player;
        io.emit('gameState', currentGameState);
        io.emit('turnChanged', { player, deadline });
    }
});

// Initialize Physics
let physics = new PhysicsWorld('MEDIUM');

// Physics Loop (60 FPS)
setInterval(() => {
    if (currentGameState.status === 'ACTIVE') {
        physics.step(1 / 60);

        // Broadcast State (Optimization: Only send if changed or at lower rate)
        const physicsState = physics.getState();
        io.emit('physicsUpdate', physicsState);

        // Check Collapse
        if (physics.checkCollapse()) {
            // Trigger Collapse Logic
            console.log('Collapse Detected!');
            // blockchain.reportCollapse(currentGameState.id);
            currentGameState.status = 'ENDED'; // Temporary
            io.emit('gameState', currentGameState);
        }
    }
}, 1000 / 60);

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Send initial state
    socket.emit('gameState', currentGameState);

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });

    // Handle Game Creation with Settings
    socket.on('createGame', (config: { maxPlayers: number; difficulty: string; stake: number; isPractice: boolean }) => {
        console.log('Creating game with config:', config);

        currentGameState = {
            id: Date.now(),
            players: [],
            currentPlayer: null,
            status: 'ACTIVE',
            maxPlayers: config.maxPlayers,
            difficulty: config.difficulty as 'EASY' | 'MEDIUM' | 'HARD',
            stake: config.stake,
            isPractice: config.isPractice
        };

        // Re-initialize physics with new difficulty
        physics = new PhysicsWorld(currentGameState.difficulty);

        // Broadcast new game state
        io.emit('gameState', currentGameState);
    });

    // Handle Physics Moves
    socket.on('submitMove', async (data: { blockIndex: number, force: any, point: any }) => {
        console.log('Move received:', data);

        if (currentGameState.status === 'ACTIVE') {
            // Apply force to physics world
            physics.applyForce(data.blockIndex, data.force, data.point);

            // Complete turn on chain (debounced in real app)
            // await blockchain.completeTurn(currentGameState.id);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Game Server running on port ${PORT}`);
});
