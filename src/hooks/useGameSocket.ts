import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';

export interface GameState {
    id: number;
    players: string[];
    currentPlayer: string | null;
    status: 'WAITING' | 'ACTIVE' | 'ENDED';
}

export interface GameSettingsConfig {
    gameMode: 'SOLO_PRACTICE' | 'SINGLE_VS_AI' | 'MULTIPLAYER'
    playerCount: number
    aiOpponentCount?: number
    difficulty: 'EASY' | 'MEDIUM' | 'HARD'
    stake: number
}

export function useGameSocket(settings?: GameSettingsConfig) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [gameState, setGameState] = useState<GameState | null>(null);

    // Ref to prevent multiple connections in React Strict Mode
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        // Don't connect to server for solo practice mode
        if (settings?.gameMode === 'SOLO_PRACTICE') {
            console.log('Solo Practice Mode: Skipping server connection');
            setSocket(null);
            setIsConnected(false);
            setGameState(null);
            return;
        }

        if (socketRef.current) return;

        console.log('Connecting to Game Server:', SERVER_URL);

        const newSocket = io(SERVER_URL, {
            transports: ['websocket'],
            reconnectionAttempts: 5,
        });

        socketRef.current = newSocket;

        newSocket.on('connect', () => {
            console.log('Socket Connected:', newSocket.id);
            setIsConnected(true);

            if (settings) {
                // Only create game on server for non-practice modes
                newSocket.emit('createGame', {
                    gameMode: settings.gameMode,
                    maxPlayers: settings.gameMode === 'MULTIPLAYER' ? settings.playerCount : (settings.aiOpponentCount || 1) + 1,
                    difficulty: settings.difficulty,
                    stake: settings.stake,
                    aiOpponentCount: settings.aiOpponentCount
                });
            }
        });

        newSocket.on('disconnect', () => {
            console.log('Socket Disconnected');
            setIsConnected(false);
        });

        newSocket.on('gameState', (state: GameState) => {
            console.log('Game State Update:', state);
            setGameState(state);
        });

        setSocket(newSocket);

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [settings]);

    const submitMove = (moveData: any) => {
        if (socket) {
            socket.emit('submitMove', moveData);
        }
    };

    return {
        socket,
        isConnected,
        gameState,
        submitMove
    };
}
