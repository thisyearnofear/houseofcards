# House of Cards - Product Roadmap

## Vision
An infinite, multiplayer, blockchain-based physics game where players compete to remove blocks from a stack without causing it to collapse. Inspired by Jenga meets Chess.com meets DeFi.

---

## Core Game Mechanics

### Turn-Based Gameplay
- Players join a queue by staking USDC (Linea Sepolia)
- Each player gets **X seconds** to remove one block
- Game starts when **N players** join the queue
- Miss your turn → forfeit stake to pot
- **Reload:** Players can manually sign a transaction to reload their stake if they lose (max N times)
- Stack collapses (≥40% blocks hit floor) → game ends, all active players forfeit stakes

### Voting & Progression
After each collapse:
- Surviving players vote: **Split Pot** or **Continue Playing**
- If continue: next round is only among survivors (pot grows)
- Process repeats until:
  - All players vote to split (equal distribution)
  - One winner remains (takes entire pot)

### Block Removal Rules
- **MVP:** Any block except bottom row
- Prevents instant collapse from foundation removal
- Future: Could add more complex rules (marked blocks, power-ups, etc.)

---

## Technical Architecture

### Blockchain Layer (Linea Sepolia)
- **Token:** USDC on Linea Sepolia
- **Smart Contract Functions:**
  - Stake escrow (lock player stakes)
  - Turn validation (timestamp + player address)
  - Collapse detection (oracle-based for MVP)
  - Vote tallying (split vs continue)
  - Pot distribution (equal split or winner-takes-all)
  - Reload logic (accept additional stake)

### Game Server
- **Physics Engine:** Rapier3D (deterministic)
- **Real-time Sync:** WebSocket for turn notifications
- **Collapse Detection:** Server-authoritative for MVP
- **State Management:** Redis for queue + game state

### Frontend
- **3D Rendering:** Three.js + React Three Fiber
- **Wallet Integration:** Standard Wallet Connect (RainbowKit / Wagmi)
- **Mobile Optimization:** Critical priority - touch controls, responsive UI, performance
- **Real-time Updates:** WebSocket client
- **Spectator Mode:** Read-only view of active games

---

## MVP Scope (Phase 1)

### Core Features ✅
- [x] Basic physics-based block stacking
- [x] **Mobile-First Design:** Touch controls, portrait/landscape support
- [ ] Turn-based queue system (7 max players)
- [ ] Timer per turn (30 seconds recommended)
- [x] Standard Wallet Connection (RainbowKit)
- [ ] USDC staking on Linea Sepolia
- [ ] Manual Reloads (Standard Transaction)
- [ ] Collapse detection (40% threshold)
- [ ] Post-game voting (split vs continue)
- [ ] Spectator mode (watch only, no betting)

### Game Parameters (MVP)
| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Max Players | 7 | Manageable for MVP, creates good pot size |
| Turn Timer | 30s | Enough time to strategize, not too slow |
| Stake Amount | 1 USDC | Low barrier to entry |
| Reloads | Max 2 | Manual transaction to re-enter |
| Collapse Threshold | 40% | Balance between difficulty and playability |
| Block Restrictions | No bottom row | Prevents instant game-over |
| Physics Difficulty | Medium | Fixed for MVP, tunable later |

### Technical Decisions (MVP)
- **Collapse Detection:** Trusted server oracle (not fully decentralized)
- **Physics Sync:** Server-authoritative (prevents cheating)
- **Voting:** Simple majority (>50% to continue)
- **Reloads:** Enabled via standard wallet transaction
- **No Dynamic Difficulty:** Fixed physics parameters

---

## Phase 2: Enhanced Gameplay

### Features
- [ ] **Dynamic Difficulty (Creator Sets Rules)**
  - First player (Creator) configures:
    - Stake Amount
    - Collapse Threshold
    - Physics Difficulty (Friction/Gravity)
  - Subsequent players join the lobby if they agree to these rules
  
- [ ] **Block Selection Rules**
  - Marked blocks (bonus points if removed)
  - Forbidden blocks (instant forfeit if touched)
  - Power-up blocks (extra time, freeze opponent, etc.)

- [ ] **Leaderboard & Stats**
  - Win rate tracking
  - Total earnings
  - Blocks removed (lifetime)
  - Longest win streak

### Technical Improvements
- [ ] Deterministic physics replay (move toward trustless)
- [ ] Player reputation system (prevent griefing)
- [ ] Gas optimization (batch transactions)
- [ ] **Embedded Wallet Integration** (for smoother UX)

---

## Phase 3: Social & Economic Layer

### Features
- [ ] **Spectator Betting**
  - Bet on which player will win
  - Bet on collapse timing
  - Separate betting pool from main pot
  
- [ ] **Multi-Game Lobbies**
  - Multiple games running simultaneously
  - Game creators set parameters (stake, max players, difficulty)
  - Browse active games + spectate any
  
- [ ] **Tournaments**
  - Scheduled high-stakes games
  - Elimination brackets
  - Prize pools
  
- [ ] **Social Features**
  - Player profiles
  - Friend system
  - Replay sharing
  - Chat (per-game and global)

### Tokenomics
- [ ] **Platform Fee:** 2-5% of pot (sustainable revenue)
- [ ] **Referral System:** Earn % of referred players' stakes
- [ ] **Season Passes:** Cosmetic upgrades, stat tracking
- [ ] **NFT Blocks:** Collectible block skins

---

## Phase 4: Advanced Features

### Gameplay Evolution
- [ ] **Team Mode:** 2v2 or 3v3 collaborative play
- [ ] **Custom Stacks:** Upload your own block configurations
- [ ] **Time-Limited Events:** Special rules, higher stakes
- [ ] **Cross-Chain:** Expand beyond Linea (Base, Arbitrum, etc.)

### Technical Maturity
- [ ] **Fully Decentralized Physics Verification**
  - Zero-knowledge proofs for physics state
  - Consensus mechanism for collapse detection
  
- [ ] **Advanced Anti-Cheat**
  - ML-based anomaly detection
  - Client-side verification
  
- [ ] **Scalability**
  - Layer 2 optimizations
  - Sharding for multiple simultaneous games

---

## Open Questions & Design Decisions

### Collapse Threshold (40% recommended)
- **Too Low (20-30%):** Games end too quickly, frustrating
- **Too High (60-70%):** Games drag on, reduces tension
- **Sweet Spot (40-50%):** Requires real mistakes but achievable
- **MVP Decision:** Start at 40%, collect data, adjust

### Block Selection Rules
- **MVP:** Any block except bottom row
- **Future Options:**
  - Restrict to top 50% of stack
  - Mark certain blocks as "safe" or "dangerous"
  - Allow bottom row but with warnings

### Voting Mechanics
- **MVP:** Simple majority (>50% vote to continue = continue)
- **Alternative:** Unanimous consent required to split
- **Consideration:** What if someone doesn't vote? (Auto-split after timeout)

### Turn Timer
- **Recommended:** 30 seconds
- **Too Short (<15s):** Stressful, favors fast clickers over strategy
- **Too Long (>60s):** Games drag, players lose interest
- **Future:** Adaptive timer (decreases each round)

### Griefing Prevention
- **Minimum Stake:** Prevents spam accounts
- **Reputation Score:** Track completion rate, ban serial quitters
- **Cooldown:** 5-minute lockout after forfeit
- **Deposit Lock:** Stake locked until game completes

---

## Success Metrics

### MVP Goals
- [ ] 100+ unique players in first month
- [ ] Average game completion rate >70%
- [ ] <5% dispute rate on collapse detection
- [ ] Average game duration: 5-10 minutes

### Long-Term Goals
- [ ] 10,000+ monthly active players
- [ ] $100,000+ monthly pot volume
- [ ] 5+ simultaneous games at peak hours
- [ ] <1% churn rate (players who quit after first game)

---

## Risk Mitigation

### Technical Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| Physics desync | High | Server-authoritative for MVP |
| Smart contract exploit | Critical | Audit before mainnet launch |
| Scalability bottleneck | Medium | Start with single game, scale gradually |
| Wallet onboarding friction | High | Use embedded wallet with social login |

### Game Design Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| Too easy to collapse | High | Tune physics, collect data |
| Games too long | Medium | Implement turn timer, adaptive difficulty |
| Griefing/trolling | Medium | Reputation system, stake requirements |
| Low player retention | High | Engaging UX, social features, leaderboards |

---

## Development Timeline (Estimated)

### Month 1-2: MVP Foundation
- Smart contract development (stake, vote, distribute, reload)
- Physics tuning (collapse threshold testing)
- Mobile-first UI design (touch controls, responsive layout)
- Standard wallet integration (RainbowKit)

### Month 3: MVP Launch
- Testnet deployment (Linea Sepolia)
- Closed beta (50 players)
- Bug fixes + balance adjustments
- Mainnet launch (limited to 1 game at a time)

### Month 4-6: Phase 2
- Dynamic difficulty
- Leaderboards
- Multi-game support
- Embedded wallet integration (optional)

### Month 7-12: Phase 3+
- Spectator betting
- Tournaments
- Social features
- Cross-chain expansion

---

## Community & Marketing

### Launch Strategy
- **Beta Access:** Invite-only for first 100 players
- **Influencer Partnerships:** Crypto gaming YouTubers/streamers
- **Tournaments:** Weekly high-stakes games with promoted prize pools
- **Content:** Highlight reels of epic collapses/saves

### Growth Loops
1. **Viral Sharing:** Players share replays of close calls
2. **Referral Rewards:** Earn % of referred stakes
3. **Leaderboards:** Competitive players recruit friends
4. **Spectator → Player:** Watching converts to playing

---

## Next Steps

1. **Finalize MVP Spec** ✅ (this document)
2. **Smart Contract Design** ✅ (Drafted `HouseOfCards.sol`)
3. **Mobile UI Prototyping** ✅ (Implemented touch controls & GameUI)
4. **Wallet Integration** ✅ (RainbowKit configured for Linea Sepolia)
5. **Frontend-Contract Connection** ✅ (Hooks & ABI implemented)
6. **Testnet Deployment:** Deploy contract to Linea Sepolia (User Action)
7. **Update Config:** Update `CONTRACT_ADDRESS` in `useGameContract.ts`
8. **Backend Architecture:** Implement WebSocket server for real-time game state

---

*Last Updated: 2025-11-19*
