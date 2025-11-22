# Setup & Development

## Prerequisites

- Node.js 18+
- npm or yarn
- Ethereum wallet (for testing on Linea Sepolia)

## Installation

```bash
# Clone and install
git clone https://github.com/thisyearnofear/agnej.git
cd agnej

# Frontend dependencies
npm install

# Backend dependencies
cd server
npm install
cd ..
```

## Development

### Terminal 1: Frontend (Next.js on :3000)
```bash
npm run dev
```

### Terminal 2: Backend (Express on :3001)
```bash
cd server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_WALLET_CONNECT_ID=your_wallet_connect_id
NEXT_PUBLIC_RPC_URL=https://rpc.sepolia.linea.build
NEXT_PUBLIC_CONTRACT_ADDRESS=0x1DFd9003590E4A67594748Ecec18451e6cBDDD90
```

### Backend (server/.env)
```
ORACLE_PRIVATE_KEY=your_private_key
RPC_URL=https://rpc.sepolia.linea.build
CONTRACT_ADDRESS=0x1DFd9003590E4A67594748Ecec18451e6cBDDD90
PORT=3001
```

## Production Build

### Frontend
```bash
npm run build
npm run start
```

### Backend
```bash
cd server
npm run build
npm run start
```

## Testing

- No automated tests yet (MVP)
- Manual testing on Linea Sepolia testnet
- Get testnet ETH from [Linea faucet](https://faucet.sepolia.linea.build)

## Contract Deployment

### Current Deployment
- **Network:** Linea Sepolia
- **Contract:** `0x1DFd9003590E4A67594748Ecec18451e6cBDDD90`
- **Block Explorer:** [Lineascan](https://sepolia.lineascan.build)

### Deploy New Contract
1. Update RPC in `hardhat.config.js` or use Remix
2. Deploy via Hardhat or Remix IDE
3. Verify on block explorer
4. Update `NEXT_PUBLIC_CONTRACT_ADDRESS` in frontend
5. Set contract owner to oracle service address

## Current Status & Gaps

### ✅ Implemented
- Core gameplay mechanics (turn-based, 7 players)
- Physics simulation (Cannon.js server, Physijs client)
- Socket.io real-time sync (60 FPS)
- Web3 wallet integration (RainbowKit)
- Smart contract deployed (Linea Sepolia)
- Oracle event listening

### ⚠️ Partial/TODO
- [ ] Uncomment and test oracle `completeTurn()` calls
- [ ] Implement timeout detection loop (currently skeleton)
- [ ] Tune collapse detection threshold
- [ ] Validate turn deadline logic on-chain
- [ ] Test full game flow end-to-end
- [ ] Implement player reload UI flow
- [ ] Add transaction confirmation feedback

## Future Enhancements

### Phase 1 (Next)
- Game history persistence (PostgreSQL/Firestore)
- Multiple concurrent games with matchmaking
- Improved collapse detection (center of mass)
- Client-side optimistic updates for UX

### Phase 2
- Leaderboards and player statistics
- Dynamic difficulty (creator sets rules)
- Block selection rules (marked/forbidden blocks)
- Advanced voting on collapse ties

### Phase 3
- Spectator betting
- Tournaments and seasonal rankings
- Game replays and replay viewer
- Cross-chain deployment (Base, Arbitrum)

### Phase 4
- Account abstraction (gas-free onboarding)
- Team modes (2v2, 3v3)
- Custom block configurations
- NFT block skins

## Troubleshooting

### "Cannot connect to server"
- Ensure backend is running on port 3001
- Check CORS settings in `server/src/index.ts`

### "Contract call failed"
- Verify contract address in env vars
- Check account has testnet ETH
- Ensure connected to Linea Sepolia

### "Physics desync"
- Restart both frontend and backend
- Clear browser cache
- Check network latency (should be <200ms)

### "Turn timer stuck"
- Server-side oracle may not be calling `completeTurn()`
- Check server logs for errors
- Manually call contract function via Etherscan

## Resources

- [Linea Docs](https://docs.linea.build)
- [Solidity Docs](https://docs.soliditylang.org)
- [Three.js Docs](https://threejs.org/docs)
- [Socket.io Docs](https://socket.io/docs)
- [wagmi Docs](https://wagmi.sh)

---

See [GAME_MECHANICS.md](GAME_MECHANICS.md) for game rules and [ARCHITECTURE.md](ARCHITECTURE.md) for system design.
