'use client'

import React, { useEffect, useRef } from 'react'
import { GameSettingsConfig } from './GameSettings'

declare global {
  var Physijs: any
  var THREE: any
  var Stats: any
  interface Window {
    Stats: any
    Physijs: any
    THREE: any
  }
}

import GameUI, { GameState, Player } from './GameUI'

import { useGameContract } from '../hooks/useGameContract'
import { useGameSocket } from '../hooks/useGameSocket'
import { useLeaderboard } from '../hooks/useLeaderboard'

interface GameProps {
  settings: GameSettingsConfig
  onReset?: () => void
  onExit?: () => void
}

export default function Game({ settings, onReset, onExit }: GameProps) {
  // Contract Hooks
  const {
    gameStateData,
    joinGame: contractJoin,
    reload: contractReload,
    isPending,
    isConfirming
  } = useGameContract()

  // WebSocket Hook
  const { socket, gameState: serverState, isConnected, physicsState, submitMove } = useGameSocket(settings)

  // Leaderboard Hook
  const {
    submitScore,
    highScore,
    isPending: isSubmitting,
    isConfirming: isConfirmingScore,
    isConfirmed: isScoreConfirmed
  } = useLeaderboard()



  // Derived State from Server and Game Mode
  const gameState = settings.gameMode === 'SOLO_PRACTICE' ? 'ACTIVE' : (serverState?.status || 'WAITING')

  // Handle different game modes
  const players = React.useMemo(() => {
    if (settings.gameMode === 'SOLO_PRACTICE') {
      return [{
        id: 'solo-player',
        address: 'You',
        isAlive: true,
        isCurrentTurn: true
      }]
    } else if (settings.gameMode === 'SINGLE_VS_AI') {
      const aiPlayers = Array.from({ length: settings.aiOpponentCount || 1 }, (_, i) => ({
        id: `ai-${i}`,
        address: `AI ${i + 1}`,
        isAlive: true,
        isCurrentTurn: false // Will be handled by server
      }))
      return [{
        id: 'human-player',
        address: 'You',
        isAlive: true,
        isCurrentTurn: true
      }, ...aiPlayers]
    } else {
      // MULTIPLAYER
      return serverState?.players.map((addr: string) => ({
        id: addr,
        address: addr,
        isAlive: true, // TODO: Add to server state
        isCurrentTurn: addr === serverState.currentPlayer
      })) || []
    }
  }, [settings, serverState])

  const currentPlayerId = settings.gameMode === 'SOLO_PRACTICE' ? 'solo-player' :
    settings.gameMode === 'SINGLE_VS_AI' ? 'human-player' :
      serverState?.currentPlayer || undefined

  // Local Visual State
  const [potSize, setPotSize] = React.useState(0)
  const [timeLeft, setTimeLeft] = React.useState(30)
  const [fallenCount, setFallenCount] = React.useState(0)
  const [isSpectator, setIsSpectator] = React.useState(false)
  const [score, setScore] = React.useState(0)
  const [gameOver, setGameOver] = React.useState(false)
  const [gameWon, setGameWon] = React.useState(false)

  // Sync Contract Data
  useEffect(() => {
    if (gameStateData) {
      console.log('Contract State:', gameStateData)
    }
  }, [gameStateData])

  // Timer Logic
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (gameState === 'ACTIVE' && !gameOver && !gameWon) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (settings.gameMode === 'SOLO_COMPETITOR') {
              setGameOver(true)
              return 0
            }
            return 30 // Reset for next turn (mock for other modes)
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [gameState, gameOver, gameWon, settings.gameMode, timeLeft])

  const containerRef = useRef<HTMLDivElement>(null)
  const socketRef = useRef<any>(null)
  const blocksRef = useRef<any[]>([])
  const dragStartRef = useRef<any>(null)
  const sceneRef = useRef<any>(null)
  const initializedRef = useRef<boolean>(false)
  const scoredBlocksRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    socketRef.current = socket
  }, [socket])

  useEffect(() => {
    if (settings.gameMode === 'SOLO_PRACTICE' || settings.gameMode === 'SOLO_COMPETITOR') return
    if (!physicsState || blocksRef.current.length === 0) return
    const count = Math.min(blocksRef.current.length, physicsState.length)
    for (let i = 0; i < count; i++) {
      const b = blocksRef.current[i]
      const s = physicsState[i]
      b.position.set(s.position.x, s.position.y, s.position.z)
      if (b.quaternion && s.quaternion) {
        b.quaternion.set(s.quaternion.x, s.quaternion.y, s.quaternion.z, s.quaternion.w)
      }
      b.__dirtyPosition = true
      b.__dirtyRotation = true
    }
  }, [physicsState, settings.gameMode])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const init = async () => {
      if (initializedRef.current) return
      // Load required scripts
      try {
        // Load Three.js first
        if (!window.THREE) {
          await loadScript('/js/three.min.js')
        }

        // Load Stats.js
        if (!window.Stats) {
          await loadScript('/js/stats.js')
        }

        // Load Physijs
        if (!window.Physijs) {
          await loadScript('/physi.js')
        }

        // Set physijs configurations
        if (window.Physijs) {
          console.log('Physijs loaded successfully, configuring...')
          window.Physijs.scripts.worker = '/js/physijs_worker.js'
          window.Physijs.scripts.ammo = '/js/ammo.js'

          // Check if worker file exists
          fetch(window.Physijs.scripts.worker)
            .then(() => console.log('Worker file loaded'))
            .catch(err => console.error('Worker file access error:', err))

          // Check if ammo.js file exists
          fetch(window.Physijs.scripts.ammo)
            .then(() => console.log('Ammo.js loaded'))
            .catch(err => console.error('Ammo.js file access error:', err))
        } else {
          console.error('Physijs is not available')
        }

        // Initialize the game
        initScene()

        // Handle window resize
        const handleResize = () => {
          if (renderer && camera && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect()
            const width = rect.width
            const height = rect.height

            camera.aspect = width / height
            camera.updateProjectionMatrix()
            renderer.setSize(width, height)
          }
        }

        window.addEventListener('resize', handleResize)

        return () => {
          window.removeEventListener('resize', handleResize)
          if (renderer) {
            renderer.dispose()
            if (renderer.domElement && renderer.domElement.parentNode) {
              renderer.domElement.parentNode.removeChild(renderer.domElement)
            }
          }
        }
      } catch (error) {
        console.error('Failed to load scripts:', error)
      }
    }

    init()
    initializedRef.current = true
  }, [])

  const loadScript = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = src
      script.onload = () => resolve()
      script.onerror = reject
      document.head.appendChild(script)
    })
  }

  let renderer: any,
    render_stats: any,
    physics_stats: any,
    scene: any,
    camera: any,
    table: any,
    // blocks: any[] = [], // Use ref instead
    loader: any,
    table_material: any,
    block_material: any,
    locked_block_material: any,
    intersect_plane: any,
    selected_block: any = null,
    mouse_position: any,
    block_offset: any

  const getPhysicsConfig = (difficulty: 'EASY' | 'MEDIUM' | 'HARD') => {
    switch (difficulty) {
      case 'EASY': return { friction: 0.8, restitution: 0.1, mass: 2.0, damping: 0.1 }
      case 'MEDIUM': return { friction: 0.5, restitution: 0.3, mass: 1.0, damping: 0.05 }
      case 'HARD': return { friction: 0.2, restitution: 0.5, mass: 0.5, damping: 0.01 }
      default: return { friction: 0.5, restitution: 0.3, mass: 1.0, damping: 0.05 }
    }
  }

  const initScene = function () {
    mouse_position = new THREE.Vector3(0, 0, 0)
    block_offset = new THREE.Vector3(0, 0, 0)

    // Reset blocks
    blocksRef.current = []
    const blocks = blocksRef.current

    // Get the actual container dimensions
    const container = containerRef.current
    if (!container) {
      console.error('Container ref not available')
      return
    }

    const containerRect = container.getBoundingClientRect()
    const width = containerRect.width
    const height = containerRect.height

    console.log('Container dimensions:', width, 'x', height)

    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setClearColor(0x2c3e50)
    renderer.shadowMap.enabled = true
    renderer.shadowMapSoft = true
    // Ensure the canvas can receive mouse events
    renderer.domElement.style.pointerEvents = 'auto'
    // Ensure only one canvas
    while (container.firstChild) {
      container.removeChild(container.firstChild)
    }
    container.appendChild(renderer.domElement)

    scene = new Physijs.Scene({ fixedTimeStep: 1 / 120 })
    sceneRef.current = scene
    scene.setGravity(new THREE.Vector3(0, -30, 0))
    console.log('Physijs scene created, game mode:', settings.gameMode)

    // Physics Sync moved to top level component


    scene.addEventListener('update', function () {
      // For solo practice mode, we handle local physics
      // For server modes, we rely on server updates
      if (settings.gameMode === 'SOLO_PRACTICE' || settings.gameMode === 'SOLO_COMPETITOR') {
        // Continue local physics simulation
        // console.log('Physics update tick')
        scene.simulate()

        // Competitor Mode Logic: Scoring and Collapse
        if (settings.gameMode === 'SOLO_COMPETITOR' && !gameOver) {
          let groundBlocks = 0

          blocksRef.current.forEach((block, index) => {
            // Check Scoring: Block moved far from center
            const dist = Math.sqrt(block.position.x * block.position.x + block.position.z * block.position.z)

            if (dist > 8 && !scoredBlocksRef.current.has(block.id)) {
              scoredBlocksRef.current.add(block.id)
              setScore(prev => prev + 1)
              setTimeLeft(30) // Reset timer

              // Optional: Make scored block disappear or ghost
              // block.visible = false // Or just leave it as debris
            }

            // Check Collapse: Block near ground but inside tower area
            if (block.position.y < 2 && dist < 6) {
              groundBlocks++
            }
          })

          // Base has 3 blocks. If > 5 blocks are near ground inside tower area, it's a collapse
          // (Allowing a couple of loose blocks to fall without ending game immediately, but 5 is safe threshold)
          if (groundBlocks > 5) {
            console.log('Collapse detected! Ground blocks:', groundBlocks)
            setGameOver(true)
          }
        }
      }
    })

    // Start Render Loop
    requestAnimationFrame(render)

    // Enable physics simulation based on game mode
    if (settings.gameMode === 'SOLO_PRACTICE' || settings.gameMode === 'SOLO_COMPETITOR') {
      console.log('Starting local physics simulation for solo practice')
      scene.simulate()
    }

    camera = new THREE.PerspectiveCamera(
      35,
      width / height,
      1,
      1000
    )
    camera.position.set(25, 20, 25)
    camera.lookAt(new THREE.Vector3(0, 7, 0))
    scene.add(camera)

    // Lights
    const am_light = new THREE.AmbientLight(0x444444)
    scene.add(am_light)

    const dir_light = new THREE.DirectionalLight(0xFFFFFF)
    dir_light.position.set(20, 30, -5)
    dir_light.target.position.copy(scene.position)
    dir_light.castShadow = true
    dir_light.shadowCameraLeft = -30
    dir_light.shadowCameraTop = -30
    dir_light.shadowCameraRight = 30
    dir_light.shadowCameraBottom = 30
    dir_light.shadowCameraNear = 20
    dir_light.shadowCameraFar = 200
    dir_light.shadowBias = -.001
    dir_light.shadowMapWidth = dir_light.shadowMapHeight = 2048
    dir_light.shadowDarkness = .5
    scene.add(dir_light)

    // Loader
    loader = new THREE.TextureLoader()

    const physicsConfig = getPhysicsConfig(settings.difficulty)

    // Materials
    const woodTexture = loader.load('/images/wood.jpg', undefined, undefined, (err: any) => {
      console.error('Error loading wood texture:', err)
    })

    table_material = Physijs.createMaterial(
      new THREE.MeshLambertMaterial({ map: woodTexture }),
      physicsConfig.friction, // friction
      physicsConfig.restitution // restitution
    )
    table_material.map.wrapS = table_material.map.wrapT = THREE.RepeatWrapping
    table_material.map.repeat.set(5, 5)

    const plywoodTexture = loader.load('/images/plywood.jpg', undefined, undefined, (err: any) => {
      console.error('Error loading plywood texture:', err)
    })

    // Standard Block Material
    block_material = Physijs.createMaterial(
      new THREE.MeshLambertMaterial({ map: plywoodTexture }),
      physicsConfig.friction,
      physicsConfig.restitution
    )
    block_material.map.wrapS = block_material.map.wrapT = THREE.RepeatWrapping
    block_material.map.repeat.set(1, .5)

    // Locked Block Material (Darker/Reddish) for top layers
    locked_block_material = Physijs.createMaterial(
      new THREE.MeshLambertMaterial({ map: plywoodTexture, color: 0xffaaaa }), // Red tint
      physicsConfig.friction,
      physicsConfig.restitution
    )
    locked_block_material.map.wrapS = locked_block_material.map.wrapT = THREE.RepeatWrapping
    locked_block_material.map.repeat.set(1, .5)

    // Table
    table = new Physijs.BoxMesh(
      new THREE.BoxGeometry(50, 1, 50),
      table_material,
      0, // mass
      { restitution: physicsConfig.restitution, friction: physicsConfig.friction }
    )
    table.position.y = -.5
    table.receiveShadow = true
    scene.add(table)

    createTower(block_material, locked_block_material)

    intersect_plane = new THREE.Mesh(
      new THREE.PlaneGeometry(150, 150),
      new THREE.MeshBasicMaterial({ opacity: 0, transparent: true })
    )
    intersect_plane.rotation.x = Math.PI / -2
    scene.add(intersect_plane)

    // Wait a tick to ensure the renderer DOM element is available
    setTimeout(() => {
      initEventHandling()
    }, 0)

    // Physics simulation is handled by the update event listener
  }

  const render = function () {
    requestAnimationFrame(render)
    renderer.render(scene, camera)
  }

  const createTower = function (normalMat?: any, lockedMat?: any) {
    const block_length = 6, block_height = 1, block_width = 1.5, block_offset = 2
    const block_geometry = new THREE.BoxGeometry(block_length, block_height, block_width)
    const sc = sceneRef.current
    if (!sc) {
      console.error('Scene not ready, cannot create tower')
      return
    }

    // Use cached materials if not provided (for reset)
    const mat = normalMat || block_material
    const lMat = lockedMat || locked_block_material || mat

    const physicsConfig = getPhysicsConfig(settings.difficulty)

    for (let i = 0; i < 16; i++) {
      // Determine if this layer is locked (top 2 layers: 14 and 15)
      const isLocked = settings.gameMode === 'SOLO_COMPETITOR' && i >= 14
      const currentMat = isLocked ? lMat : mat

      for (let j = 0; j < 3; j++) {
        const block = new Physijs.BoxMesh(block_geometry, currentMat, physicsConfig.mass)
        block.position.y = (block_height / 2) + block_height * i
        if (i % 2 === 0) {
          block.rotation.y = Math.PI / 2.01
          block.position.x = block_offset * j - (block_offset * 3 / 2 - block_offset / 2)
        } else {
          block.position.z = block_offset * j - (block_offset * 3 / 2 - block_offset / 2)
        }
        block.receiveShadow = true
        block.castShadow = true

        // Apply damping
        block.setDamping(physicsConfig.damping, physicsConfig.damping)

        // Store layer info for Competitor Mode
        block.userData = { layer: i, isLocked }

        sc.add(block)
        blocksRef.current.push(block)
      }
    }
  }

  const resetTower = function () {
    const sc = sceneRef.current
    if (!sc) return
    for (let i = 0; i < blocksRef.current.length; i++) {
      sc.remove(blocksRef.current[i])
    }
    blocksRef.current.length = 0
    selected_block = null
    createTower()
    setFallenCount(0)
    setScore(0)
    setGameOver(false)
    setGameWon(false)
    setTimeLeft(30)
    scoredBlocksRef.current.clear()

    if (settings.gameMode === 'SOLO_PRACTICE' || settings.gameMode === 'SOLO_COMPETITOR') {
      sc.simulate()
    }
  }

  const initEventHandling = function () {
    // Check if renderer and its DOM element exist
    if (!renderer || !renderer.domElement) {
      console.error('Renderer or renderer DOM element not available')
      return
    }


    const getEventPos = (evt: MouseEvent | TouchEvent) => {
      let clientX, clientY
      if ((evt as TouchEvent).changedTouches && (evt as TouchEvent).changedTouches.length > 0) {
        clientX = (evt as TouchEvent).changedTouches[0].clientX
        clientY = (evt as TouchEvent).changedTouches[0].clientY
      } else {
        clientX = (evt as MouseEvent).clientX
        clientY = (evt as MouseEvent).clientY
      }
      return { clientX, clientY }
    }

    const handleInputStart = function (evt: MouseEvent | TouchEvent) {
      // Spectator Check
      if (isSpectator || gameState !== 'ACTIVE' || gameOver) return

      // Prevent default to stop scrolling on touch devices
      if (evt.type === 'touchstart') {
        evt.preventDefault()
      }

      const { clientX, clientY } = getEventPos(evt)
      const rect = renderer.domElement.getBoundingClientRect()
      const nx = ((clientX - rect.left) / rect.width) * 2 - 1
      const ny = -((clientY - rect.top) / rect.height) * 2 + 1
      const vector = new THREE.Vector3(nx, ny, 1)

      vector.unproject(camera)

      const ray = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize())
      const intersections = ray.intersectObjects(blocksRef.current)

      if (intersections.length > 0) {
        const block = intersections[0].object

        // Competitor Mode: Prevent selecting top 2 levels (Layers 14 and 15)
        if (settings.gameMode === 'SOLO_COMPETITOR' && block.userData?.layer >= 14) {
          console.log('Cannot move blocks from top 2 levels!')
          return
        }

        selected_block = block
        intersect_plane.position.y = selected_block.position.y
        const planeHit = ray.intersectObject(intersect_plane)
        if (planeHit.length > 0) {
          mouse_position.copy(planeHit[0].point)
          dragStartRef.current = planeHit[0].point.clone()
        } else {
          dragStartRef.current = null
        }
      }
    }

    const handleInputEnd = function (evt: MouseEvent | TouchEvent) {
      if (selected_block !== null) {
        const start = dragStartRef.current
        let end = mouse_position.clone()
        if (start) {
          end.y = start.y
        }
        const delta = new THREE.Vector3().copy(end).sub(start || selected_block.position)
        delta.y = 0
        const length = delta.length()
        const dir = length > 0 ? delta.normalize() : new THREE.Vector3(1, 0, 0)
        const impulse = dir.multiplyScalar(Math.max(5, Math.min(50, length * 10)))

        const blockIndex = blocksRef.current.indexOf(selected_block)

        if (settings.gameMode === 'SOLO_PRACTICE' || settings.gameMode === 'SOLO_COMPETITOR') {
          if (typeof selected_block.applyCentralImpulse === 'function') {
            selected_block.applyCentralImpulse(impulse)
          } else {
            selected_block.applyCentralForce(impulse)
          }
        } else if (socketRef.current && blockIndex !== -1) {
          socketRef.current.emit('submitMove', {
            blockIndex: blockIndex,
            force: { x: impulse.x, y: impulse.y, z: impulse.z },
            point: { x: selected_block.position.x, y: selected_block.position.y, z: selected_block.position.z }
          })
        }

        selected_block = null
        dragStartRef.current = null
      }
    }

    const handleInputMove = function (evt: MouseEvent | TouchEvent) {
      // Prevent default to stop scrolling on touch devices
      if (evt.type === 'touchmove') {
        evt.preventDefault()
      }

      if (selected_block !== null) {
        const { clientX, clientY } = getEventPos(evt)
        const rect = renderer.domElement.getBoundingClientRect()
        const nx = ((clientX - rect.left) / rect.width) * 2 - 1
        const ny = -((clientY - rect.top) / rect.height) * 2 + 1
        const vector = new THREE.Vector3(nx, ny, 1)
        vector.unproject(camera)
        const ray = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize())
        intersect_plane.position.y = selected_block.position.y
        const intersection = ray.intersectObject(intersect_plane)
        if (intersection.length > 0) {
          mouse_position.copy(intersection[0].point)
        }
      }
    }

    // Old handleInputEnd removed


    // Mouse events
    renderer.domElement.addEventListener('mousedown', handleInputStart)
    renderer.domElement.addEventListener('mousemove', handleInputMove)
    renderer.domElement.addEventListener('mouseup', handleInputEnd)

    // Touch events
    renderer.domElement.addEventListener('touchstart', handleInputStart, { passive: false })
    renderer.domElement.addEventListener('touchmove', handleInputMove, { passive: false })
    renderer.domElement.addEventListener('touchend', handleInputEnd)
  }

  return (
    <div className="relative w-full h-full">
      {/* Game UI Overlay */}
      <GameUI
        gameState={gameOver ? 'ENDED' : gameState}
        potSize={potSize}
        timeLeft={timeLeft}
        players={players}
        currentPlayerId={currentPlayerId}
        fallenCount={fallenCount}
        totalBlocks={16 * 3}
        maxPlayers={settings.gameMode === 'MULTIPLAYER' ? settings.playerCount :
          settings.gameMode === 'SINGLE_VS_AI' ? (settings.aiOpponentCount || 1) + 1 : 1}
        difficulty={settings.difficulty}
        stake={settings.stake}
        isPractice={settings.gameMode === 'SOLO_PRACTICE' || settings.gameMode === 'SOLO_COMPETITOR'}
        score={score}
        highScore={highScore}
        onJoin={() => {
          // Try contract first, fallback to mock
          try {
            contractJoin()
          } catch (e) {
            console.error(e)
          }
          // Server will update state via WebSocket
        }}
        onReload={() => {
          if (settings.gameMode === 'SOLO_PRACTICE' || settings.gameMode === 'SOLO_COMPETITOR') {
            resetTower()
          } else {
            contractReload()
            setPotSize(prev => prev + 1)
          }
        }}
        onVote={(split) => {
          alert(`Voted to ${split ? 'Split' : 'Continue'}`)
          // TODO: Emit vote to server
        }}
        onExit={onExit}
      />

      {/* Game Over Overlay for Competitor Mode */}
      {gameOver && settings.gameMode === 'SOLO_COMPETITOR' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-900 border border-white/20 p-8 rounded-2xl text-center max-w-md w-full">
            <h2 className="text-4xl font-bold text-white mb-2">Game Over</h2>
            <p className="text-gray-400 mb-6">The tower collapsed or time ran out!</p>

            <div className="bg-white/5 rounded-xl p-6 mb-8">
              <div className="text-sm text-gray-400 uppercase tracking-wider mb-1">Final Score</div>
              <div className="text-6xl font-bold text-yellow-400">{score}</div>
              <div className="text-sm text-gray-500 mt-2">Difficulty: {settings.difficulty}</div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => submitScore(settings.difficulty, score)}
                disabled={isSubmitting || isConfirmingScore || isScoreConfirmed}
                className={`w-full font-bold py-3 rounded-lg transition-colors ${isScoreConfirmed
                  ? 'bg-green-600 text-white cursor-default'
                  : 'bg-yellow-600 hover:bg-yellow-500 text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSubmitting ? 'Check Wallet...' :
                  isConfirmingScore ? 'Confirming...' :
                    isScoreConfirmed ? 'Score Submitted!' : 'Submit Score (On-Chain)'}
              </button>
              <button
                onClick={resetTower}
                className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                Try Again
              </button>
              {onExit && (
                <button
                  onClick={onExit}
                  className="w-full bg-white/5 hover:bg-white/10 text-gray-300 font-semibold py-3 rounded-lg transition-colors"
                >
                  Exit to Menu
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Spectator Label */}
      {isSpectator && (
        <div className="absolute top-20 right-6 bg-yellow-500/20 text-yellow-200 px-3 py-1 rounded-full text-xs font-bold border border-yellow-500/50 backdrop-blur-sm">
          SPECTATOR MODE
        </div>
      )}

      {/* Transaction Status Indicator */}
      {(isPending || isConfirming) && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg animate-pulse">
          {isPending ? 'Check Wallet...' : 'Confirming Transaction...'}
        </div>
      )}

      {/* Game Canvas Container */}
      <div ref={containerRef} className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-black" style={{ pointerEvents: 'auto' }}>
        {/* Canvas will be appended here by initScene */}
      </div>
    </div>
  )
}
