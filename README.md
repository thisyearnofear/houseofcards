# House of Cards

A decentralized multiplayer physics-based block tower game where players take turns removing and repositioning blocks from a 16-layer wooden tower. The player who causes the tower to collapse is eliminated. The last surviving player wins the pot. Built with Web3 smart contracts and real-time physics simulation.

## Project Structure

```
houseofcards/
├── contracts/          # Solidity smart contracts
│   └── HouseOfCards.sol
├── server/            # Express + Socket.io game server
│   ├── src/
│   │   ├── services/  # Blockchain service
│   │   ├── index.ts   # Main server & Socket.io setup
│   │   ├── physics.ts # Physics simulation (Cannon.js)
│   │   └── abi.ts     # Contract ABI
│   └── package.json
├── src/               # Next.js frontend (React)
│   ├── app/           # App router & pages
│   ├── components/    # React components (Game, GameUI)
│   ├── hooks/         # useGameContract, useGameSocket
│   ├── lib/           # Utilities
│   └── abi/           # Contract ABIs
└── package.json       # Frontend dependencies
```

## Tech Stack

**Frontend:**
- Next.js 16 (React framework)
- React 19
- Three.js (3D rendering)
- Physijs (Physics simulation on client)
- TailwindCSS
- wagmi (Ethereum React hooks)
- RainbowKit (wallet connection)
- Viem (Ethereum utilities)
- TanStack Query (data fetching)

**Backend:**
- Express.js
- Socket.io (real-time communication)
- Cannon.js (server-side physics engine)
- Ethers.js (blockchain interaction)

**Smart Contracts:**
- Solidity ^0.8.19
- OpenZeppelin contracts (ReentrancyGuard, Ownable)

## Game Mechanics

### Tower Structure
- 16 layers, 3 blocks per layer (48 blocks total)
- Layers alternate between X-axis and Z-axis orientation (Jenga-style)
- Blocks: 6 units long × 1 unit tall × 1.5 units wide
- Realistic physics: gravity (-30 m/s²), friction, collision detection

### Gameplay Loop
1. **Waiting Phase**: Players join the game and pay entry stake (0.001 ETH)
2. **Game Starts**: Once MAX_PLAYERS (7) join, `GameStarted` event emitted
3. **Active Phase**: Players take turns applying forces to blocks
   - Each turn lasts 30 seconds
   - Turn deadline tracked on-chain via `TurnChanged` event
   - Player clicks/drags a block to push it away from the tower
   - Force is calculated based on drag distance and direction
   - Physics simulation runs at 60 FPS on server
   - All clients receive server state updates for synchronization
4. **Collapse Detection**: Server detects when >40% of blocks fall below table level
5. **Elimination**: Player who caused collapse is eliminated, `PlayerEliminated` event logged
6. **Winner**: Last surviving player wins the entire pot, `GameEnded` event triggers payout

### Reload System
- Eliminated players can pay to rejoin (0.001 ETH per reload)
- Maximum 2 reloads per player per game
- `PlayerReloaded` event tracked on-chain
- Reloaded player returns to active player pool

### Key Constants
- `MAX_PLAYERS`: 7
- `ENTRY_STAKE`: 0.001 ETH
- `RELOAD_COST`: 0.001 ETH
- `MAX_RELOADS`: 2
- `TURN_DURATION`: 30 seconds
- `COLLAPSE_THRESHOLD`: 40% (0.4) of blocks fallen

## Smart Contract Details

### Deployment
- **Network**: Linea Sepolia (Layer 2 testnet)
- **Contract Address**: `0x1DFd9003590E4A67594748Ecec18451e6cBDDD90`
- **RPC**: `https://rpc.sepolia.linea.build`
- **Standard**: ERC20 (using native ETH for MVP)

### State Management

#### Game Structure
```solidity
struct Game {
    uint256 id;                      // Unique game ID
    GameState state;                 // WAITING, ACTIVE, VOTING, ENDED
    uint256 pot;                     // Total ETH in pot
    uint256 turnDuration;            // 30 seconds
    uint256 startTime;               // Block timestamp game started
    uint256 lastMoveTime;            // Block timestamp of last move
    address currentPlayer;           // Player whose turn it is
    uint256 currentTurnIndex;        // Index in players array
    address[] players;               // All players who joined
    mapping(address => bool) isActive;        // Still in game?
    mapping(address => uint256) reloadCount;  // How many times reloaded
    uint256 collapseThreshold;       // 40% (0.4)
}
```

#### Game States
- **WAITING**: Game not started, accepting joins
- **ACTIVE**: Game in progress, physics simulation running
- **VOTING**: Collapse detected, waiting for vote/distribution
- **ENDED**: Game finished, pot distributed, new game created

### Core Functions

#### `joinGame() external payable nonReentrant`
- **Purpose**: Player joins current game and pays entry stake
- **Requirements**:
  - Game state must be `WAITING`
  - Exactly 0.001 ETH must be sent (`msg.value == ENTRY_STAKE`)
  - Game must not be full (`players.length < MAX_PLAYERS`)
- **Effects**:
  - Adds player address to `players[]`
  - Sets `isActive[player] = true`
  - Adds ETH to pot
  - Emits `PlayerJoined(gameId, player)`
  - If 7th player joins, automatically calls `_startGame()`

#### `_startGame() internal`
- **Purpose**: Begins game when MAX_PLAYERS reached
- **Effects**:
  - Sets state to `ACTIVE`
  - Records `startTime` and `lastMoveTime` as current block timestamp
  - Sets `currentPlayer` to first player (`players[0]`)
  - Sets `currentTurnIndex` to 0
  - Emits `GameStarted(gameId)`
  - Emits `TurnChanged` with deadline = `block.timestamp + TURN_DURATION` (30s)

#### `completeTurn(gameId) external onlyOwner`
- **Purpose**: Oracle calls after turn ends normally (no collapse)
- **Access**: Only contract owner (oracle service)
- **Effects**:
  - Advances to next active player via `_nextTurn()`
  - Emits `TurnChanged` with new deadline

#### `timeoutTurn(gameId) external onlyOwner`
- **Purpose**: Oracle calls if player doesn't move within 30 seconds
- **Access**: Only contract owner (oracle service)
- **Effects**:
  - Eliminates inactive player via `_eliminatePlayer()`
  - Advances to next active player via `_nextTurn()`

#### `reload() external payable nonReentrant`
- **Purpose**: Eliminated player pays to rejoin game
- **Requirements**:
  - Game state must be `ACTIVE`
  - Player must be inactive (`!isActive[msg.sender]`)
  - Player hasn't exceeded `MAX_RELOADS` (2 times)
  - Exactly 0.001 ETH must be sent
- **Effects**:
  - Sets `isActive[player] = true`
  - Increments `reloadCount[player]`
  - Adds ETH to pot
  - Emits `PlayerReloaded(gameId, player)`

#### `reportCollapse(gameId) external onlyOwner`
- **Purpose**: Oracle calls when physics simulation detects collapse (>40% blocks fallen)
- **Access**: Only contract owner (oracle service)
- **Effects**:
  - Sets state to `VOTING`
  - Emits `GameCollapsed(gameId)`
  - Calls `_distributePot()` to split remaining pot

#### `_nextTurn(Game storage game) internal`
- **Purpose**: Advances game to next active player
- **Logic**:
  1. Finds next active player in circular order
  2. Counts total active players
  3. If only 1 survivor remains: game ends, winner takes pot via `_endGameWinner()`
  4. Otherwise: updates `currentPlayer`, `currentTurnIndex`, `lastMoveTime`
  5. Emits `TurnChanged` with new deadline
  
#### `_eliminatePlayer(Game storage game, address player, string memory reason) internal`
- **Purpose**: Remove player from active play
- **Effects**:
  - Sets `isActive[player] = false`
  - Emits `PlayerEliminated(gameId, player, reason)` with reason ("Timeout", "Collapse", etc.)

#### `_endGameWinner(Game storage game, address winner) internal`
- **Purpose**: Single player survives, award pot
- **Effects**:
  - Sets state to `ENDED`
  - Sends entire pot to winner via low-level call: `winner.call{value: amount}("")`
  - Emits `GameEnded(gameId, winner, amount)`
  - Calls `_createGame()` to start next game

#### `_distributePot(Game storage game) internal`
- **Purpose**: Split pot equally among survivors (used on collapse)
- **Logic**:
  1. Counts active players
  2. Calculates share = `pot / activeCount`
  3. Sends share to each survivor
  4. Emits `PotSplit(gameId, amountPerPlayer)`
  5. Sets state to `ENDED`
  6. Calls `_createGame()` for next game

### Events

| Event | Parameters | Emitted When |
|-------|-----------|-------------|
| `GameCreated` | `gameId` | New game instance created |
| `PlayerJoined` | `gameId, player` | Player calls `joinGame()` |
| `GameStarted` | `gameId` | 7th player joins |
| `TurnChanged` | `gameId, player, deadline` | Turn advances, deadline = `block.timestamp + 30s` |
| `PlayerEliminated` | `gameId, player, reason` | Player knocked out (Timeout, Collapse) |
| `PlayerReloaded` | `gameId, player` | Eliminated player calls `reload()` |
| `GameCollapsed` | `gameId` | >40% blocks fallen |
| `GameEnded` | `gameId, winner, amount` | Winner determined, pot awarded |
| `PotSplit` | `gameId, amountPerPlayer` | Pot distributed to survivors on collapse |

### Security Features
- **ReentrancyGuard**: Protects all payable functions against reentrancy attacks
- **Ownable**: Only owner (oracle) can call state-changing oracle functions
- **Immutable Config**: All game constants are hardcoded (can't be changed mid-game)

### Oracle Integration
The backend game server acts as a trusted oracle and calls:
- `completeTurn()` - After turn timer expires
- `timeoutTurn()` - If player doesn't move within 30 seconds
- `reportCollapse()` - When physics detects >40% blocks fallen

**Note**: Oracle calls must be authorized (signed by owner private key)

## Timing & Turn Dynamics

### Turn Flow
1. **Turn Start** (`TurnChanged` event):
   - `currentPlayer` is set
   - `deadline` = `block.timestamp + 30 seconds`
   - Broadcast to all clients
   - Client UI shows 30 second countdown timer

2. **During Turn** (0-30 seconds):
   - Player can click/drag blocks to apply forces
   - Server receives moves via Socket.io `submitMove` event
   - Physics simulation runs at 60 FPS
   - Block states broadcast to all clients every frame
   - Server checks if collapse occurs

3. **Turn End** (After 30 seconds):
   - Oracle service checks: did player move? did tower collapse?
   - **If Normal End**: Oracle calls `completeTurn(gameId)`
     - Next player's turn begins
     - `TurnChanged` emitted with new deadline
   - **If Timeout**: Oracle calls `timeoutTurn(gameId)`
     - Current player eliminated with reason "Timeout"
     - Next player's turn begins
   - **If Collapse**: Oracle calls `reportCollapse(gameId)`
     - Tower collapse detected (>40% blocks fallen)
     - Player who moved is implicitly eliminated
     - Game state → `VOTING`
     - Pot distributed to survivors

### Block Timing Details
- **Block Time**: ~1 second (Linea Sepolia avg)
- **Turn Duration**: 30 seconds (hardcoded constant)
- **Turn Deadline**: `block.timestamp + 30` recorded on-chain
- **Oracle Heartbeat**: Every ~5-10 seconds, checks for timeouts/collapses
- **Physics Update Rate**: 60 FPS (16.67ms per frame)
- **Network Broadcast**: Full state every frame (60/sec)

### Event Timeline Example
```
Block 1000: Player A joins (PlayerJoined event)
Block 1001-1006: Players B-F join (6 PlayerJoined events)
Block 1007: 7th player joins
         → GameStarted event
         → TurnChanged event (deadline = block 1037)
         
Frames 1000-1037: Player A takes turn
  - Clients render at 60 FPS
  - Physics updates, broadcast every frame
  
Block 1037: Oracle checks if timeout/collapse
         → If normal: completeTurn(gameId)
         → TurnChanged event (deadline = block 1067)
         → Now Player B's turn

... game continues ...

Block 2500: Player C moves, tower collapses
         → reportCollapse(gameId)
         → GameCollapsed event
         → PotSplit event (survivors split pot)
         → GameEnded event (for game 1)
         → GameCreated event (for game 2)
```

## Physics System

**Server-Side (Cannon.js)**
- Authoritative physics simulation
- Gravity: -30 m/s²
- Blocks have mass (1 unit), friction (0.4), restitution (0.4)
- Table/ground is static (immovable), friction 0.9
- Collision detection between all blocks
- Detects collapse when blocks fall below table surface (y < 0.5)
- Damping: 0.05 linear, 0.05 angular (stabilizes tower)

**Client-Side (Physijs/Three.js)**
- Mirrors server physics for visual representation
- User input: click/drag to select and apply force to blocks
- Force calculated from drag vector relative to block position
- Force magnitude: drag distance × 10 (normalized)
- Sends move via Socket.io `submitMove` event with:
  - `blockIndex`: Which block in the tower
  - `force`: 3D force vector {x, y, z}
  - `point`: Contact point on block where force applied

**Synchronization**
- Server is authoritative (all physics truth lives on server)
- Server broadcasts full block state 60 times per second
- Each block state includes: position, quaternion (rotation), velocity
- Clients render server state (no local prediction in MVP)
- Latency: ~50-200ms depending on network

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- An Ethereum wallet (for testing)

### Installation

```bash
# Clone repository
git clone https://github.com/thisyearnofear/houseofcards.git
cd houseofcards

# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### Running Development

**Terminal 1 - Frontend (Next.js on port 3000):**
```bash
npm run dev
```

**Terminal 2 - Backend (Game Server on port 3001):**
```bash
cd server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
# Frontend
npm run build
npm run start

# Backend
cd server
npm run build
npm run start
```

## Architecture

### Frontend-Server Communication
- Socket.io connection established on load
- Real-time game state sync (players, turns, status)
- Player moves (`submitMove` event): block index, force vector, contact point
- Physics state broadcast (block positions, rotations, velocities)
- Fallback to mock data when server unavailable (MVP)

### Server-Blockchain Communication
- Listens to contract events (PlayerJoined, GameStarted, TurnChanged)
- Calls contract functions to report game milestones
- Maintains in-memory game state (MVP)
- Acts as oracle: detects collapse, timeouts, and triggers on-chain updates

### Oracle Service (Game Server)
The backend acts as a trusted oracle that monitors the game and calls smart contract functions:

**Responsibilities:**
1. **Listen to Events**: Watch for `PlayerJoined`, `GameStarted`, `TurnChanged` events
2. **Track Game State**: Maintain local copy of game state from events
3. **Monitor Physics**: Check physics simulation every frame for collapse
4. **Enforce Timeouts**: Track turn duration, eliminate players if they don't move
5. **Report Events**: Call contract functions to advance game state

**Key Oracle Functions Called:**
- `completeTurn(gameId)` - After timer expires and no collapse
- `timeoutTurn(gameId)` - If player inactive for 30 seconds
- `reportCollapse(gameId)` - When physics detects >40% blocks fallen

**Oracle Authentication:**
- Uses private key (`ORACLE_PRIVATE_KEY` env var)
- Only contract owner can call oracle functions
- All transactions signed with owner's wallet on Linea Sepolia
- RPC endpoint: `https://rpc.sepolia.linea.build`

### Physics Synchronization
- Server runs authoritative Cannon.js simulation
- Clients render block state from server via Three.js
- User input (mouse/touch) converted to forces and sent to server
- Server applies forces, updates physics, broadcasts new state
- Target: 60 FPS client rendering, synchronized with 60 FPS server simulation

## Development Notes

### Current Status (MVP)
- ✅ Core gameplay mechanics working
- ✅ Physics simulation and tower structure complete
- ✅ Client-server synchronization via Socket.io
- ✅ Web3 wallet integration (RainbowKit + wagmi)
- ✅ Smart contract deployed on Linea Sepolia (`0x1DFd9003590E4A67594748Ecec18451e6cBDDD90`)
- ✅ Oracle service scaffolded (blockchain event listening)
- ⚠️ Oracle functions partially implemented (some calls commented out in server)

### Known Limitations
- In-memory game state (not persisted to database)
- Single game instance at a time (sequential games only)
- No client-side prediction (all rendering is server-authoritative)
- Collapse detection purely based on fallen block count, not structural stability
- Oracle private key management (currently uses hardcoded default)
- No battle-tested stress testing with concurrent players

### MVP Gaps & TODOs
- [ ] Uncomment and test oracle `completeTurn()` calls
- [ ] Implement timeout detection loop in server (currently skeleton)
- [ ] Add collapse detection threshold tuning
- [ ] Validate turn deadline logic on-chain
- [ ] Add database for game history (events → queries)
- [ ] Test full game flow (join → play → collapse → payout)
- [ ] Implement player reload UI flow
- [ ] Add transaction confirmation feedback

### Future Enhancements
- Persistent game history and database (PostgreSQL/Firestore)
- Multiple concurrent games with matchmaking queue
- Advanced voting/tie-breaking on collapse decisions
- Player leaderboards and statistics
- Game replays and replay viewer
- Improved collapse detection (center of mass, structural integrity)
- Client-side optimistic updates for better UX
- Spectator mode with real-time commentary
- Tournaments and seasonal rankings
- Cross-chain deployment (Base, Arbitrum, Polygon)
- Account abstraction for gas-free onboarding

## License

MIT
