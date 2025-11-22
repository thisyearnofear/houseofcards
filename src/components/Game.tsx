'use client'

import React, { useEffect, useRef } from 'react'
import { GameSettingsConfig } from './GameSettings'
import { loadScript, getPhysicsConfig } from './Game/physicsHelpers'

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

  // Leaderboard Hook - Pass difficulty for correct high score fetching
  const {
    submitScore,
    highScore,
    rank,
    totalPlayers,
    topScores,
    isPending: isSubmitting,
    isConfirming: isConfirmingScore,
    isConfirmed: isScoreConfirmed,
    hash: scoreHash,
    refetchAll: refetchLeaderboard
  } = useLeaderboard(settings.difficulty)



  // Derived State from Server and Game Mode
  const gameState = (settings.gameMode === 'SOLO_PRACTICE' || settings.gameMode === 'SOLO_COMPETITOR')
    ? 'ACTIVE'
    : (serverState?.status || 'WAITING')

  // Handle different game modes
  const players = React.useMemo(() => {
    if (settings.gameMode === 'SOLO_PRACTICE' || settings.gameMode === 'SOLO_COMPETITOR') {
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

  const currentPlayerId = (settings.gameMode === 'SOLO_PRACTICE' || settings.gameMode === 'SOLO_COMPETITOR')
    ? 'solo-player'
    : settings.gameMode === 'SINGLE_VS_AI'
      ? 'human-player'
      : serverState?.currentPlayer || undefined

  // Local Visual State
  const [potSize, setPotSize] = React.useState(0)
  const [timeLeft, setTimeLeft] = React.useState(30)
  const [fallenCount, setFallenCount] = React.useState(0)
  const [isSpectator, setIsSpectator] = React.useState(false)
  const [score, setScore] = React.useState(0)
  const [gameOver, setGameOver] = React.useState(false)
  const [gameWon, setGameWon] = React.useState(false)
  // Auto-show rules for solo modes
  const [showRules, setShowRules] = React.useState(
    settings.gameMode === 'SOLO_COMPETITOR' || settings.gameMode === 'SOLO_PRACTICE'
  )

  // Sync Contract Data
  useEffect(() => {
    if (gameStateData) {
      console.log('Contract State:', gameStateData)
    }
  }, [gameStateData])

  // Timer Logic
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (gameState === 'ACTIVE' && !gameOver && !gameWon && !showRules) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (settings.gameMode === 'SOLO_COMPETITOR') {
              setGameOver(true)
              gameOverRef.current = true
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
  const gameOverRef = useRef(false)
  const showRulesRef = useRef(showRules)

  useEffect(() => {
    showRulesRef.current = showRules
  }, [showRules])

  const blocksRef = useRef<any[]>([])
  const dragStartRef = useRef<any>(null)
  const sceneRef = useRef<any>(null)
  const initializedRef = useRef<boolean>(false)
  const scoredBlocksRef = useRef<Set<number>>(new Set())
  const requestRef = useRef<number | undefined>(undefined)
  const workerCheckTimeouts = useRef<Set<NodeJS.Timeout>>(new Set())
  const sceneUpdateListenerRef = useRef<any>(null)

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
      // Remove the initializedRef guard - let React's useEffect handle this
      // console.log('[INIT] Initializing game...') // Removed debug log

      // Load required scripts (only if not already loaded)
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
          window.Physijs.scripts.worker = '/js/physijs_worker.js'
          window.Physijs.scripts.ammo = '/js/ammo.js'
        } else {
          console.error('Physijs is not available')
        }

        // Initialize the scene
        initScene()

        // Handle window resize
        const handleResize = () => {
          const engine = engineRef.current
          if (engine.renderer && engine.camera && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect()
            const width = rect.width
            const height = rect.height

            engine.camera.aspect = width / height
            engine.camera.updateProjectionMatrix()
            engine.renderer.setSize(width, height)
          }
        }

        window.addEventListener('resize', handleResize)
      } catch (error) {
        console.error('Error initializing game:', error)
      }
    }

    init()

    // Main cleanup function - runs when component unmounts or dependencies change
    return () => {
      // Clear all pending worker check timeouts
      workerCheckTimeouts.current.forEach(timeoutId => clearTimeout(timeoutId))
      workerCheckTimeouts.current.clear()

      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current)
      }

      // Cleanup Scene
      if (sceneRef.current) {
        // console.log('[CLEANUP] Cleaning up Physijs scene') // Removed debug log
        const scene = sceneRef.current as any

        try {
          // CRITICAL: Remove the update event listener FIRST
          if (sceneUpdateListenerRef.current) {
            // console.log('[CLEANUP] Removing scene update listener') // Removed debug log
            scene.removeEventListener('update', sceneUpdateListenerRef.current)
            sceneUpdateListenerRef.current = null
          }

          // Remove all objects from scene
          // console.log('[CLEANUP] Removing scene objects...') // Removed debug log
          while (sceneRef.current.children.length > 0) {
            sceneRef.current.remove(sceneRef.current.children[0]);
          }

          // Stop simulation
          scene.onSimulationResume = function () { }

          // DON'T terminate the worker - let Physijs manage it
          // Terminating it corrupts Physijs's global state
          // console.log('[CLEANUP] Leaving worker alive for Physijs to manage') // Removed debug log
        } catch (err) {
          console.warn('[CLEANUP] Error during scene cleanup:', err)
        }

        sceneRef.current = null
      }

      if (engineRef.current.renderer) {
        engineRef.current.renderer.dispose()
        if (engineRef.current.renderer.domElement && engineRef.current.renderer.domElement.parentNode) {
          engineRef.current.renderer.domElement.parentNode.removeChild(engineRef.current.renderer.domElement)
        }
        engineRef.current.renderer = null
      }

      // Reset refs
      blocksRef.current = []
      scoredBlocksRef.current.clear()
    }
  }, [settings.gameMode, settings.difficulty]) // Re-init when gameMode or difficulty changes

  // Engine Refs to persist Three.js objects across renders
  const engineRef = useRef<{
    renderer: any
    camera: any
    materials: {
      table: any
      block: any
      lockedBlock: any
    }
    interaction: {
      plane: any
      selectedBlock: any
      mousePos: any
      offset: any
    }
    lastPhysicsUpdate: number
  }>({
    renderer: null,
    camera: null,
    materials: { table: null, block: null, lockedBlock: null },
    interaction: {
      plane: null,
      selectedBlock: null,
      mousePos: null, // Will init in initScene
      offset: null
    },
    lastPhysicsUpdate: 0
  })

  const initScene = function () {
    // console.log('[INIT] Starting initScene...') // Removed debug log
    const engine = engineRef.current
    engine.interaction.mousePos = new THREE.Vector3(0, 0, 0)
    engine.interaction.offset = new THREE.Vector3(0, 0, 0)
    engine.lastPhysicsUpdate = Date.now()

    // Reset blocks
    blocksRef.current = []

    // Get the actual container dimensions
    const container = containerRef.current
    if (!container) {
      console.error('[INIT] Container ref not available')
      return
    }

    const containerRect = container.getBoundingClientRect()
    const width = containerRect.width
    const height = containerRect.height

    // console.log('[INIT] Container dimensions:', width, 'x', height) // Removed debug log

    engine.renderer = new THREE.WebGLRenderer({ antialias: true })
    engine.renderer.setSize(width, height)
    engine.renderer.setClearColor(0x2c3e50)
    engine.renderer.shadowMap.enabled = true
    engine.renderer.shadowMapSoft = true
    // Ensure the canvas can receive mouse events
    engine.renderer.domElement.style.pointerEvents = 'auto'

    // Ensure only one canvas
    while (container.firstChild) {
      container.removeChild(container.firstChild)
    }
    container.appendChild(engine.renderer.domElement)

    const scene = new Physijs.Scene({ fixedTimeStep: 1 / 120 })
    sceneRef.current = scene
    scene.setGravity(new THREE.Vector3(0, -30, 0))

    // Store the listener so we can remove it later
    const sceneUpdateListener = function () {
      engine.lastPhysicsUpdate = Date.now()

      // For solo practice mode, we handle local physics
      // For server modes, we rely on server updates
      if (settings.gameMode === 'SOLO_PRACTICE' || settings.gameMode === 'SOLO_COMPETITOR') {
        // Continue local physics simulation
        scene.simulate()

        // Competitor Mode Logic: Scoring and Collapse
        if (settings.gameMode === 'SOLO_COMPETITOR' && !gameOverRef.current) {
          blocksRef.current.forEach((block) => {
            // Check Scoring: Block moved far from center (removed from tower)
            const dist = Math.sqrt(block.position.x * block.position.x + block.position.z * block.position.z)

            // Only update score if game is NOT over
            if (!gameOverRef.current && dist > 10 && !scoredBlocksRef.current.has(block.id)) {
              scoredBlocksRef.current.add(block.id)
              setScore(prev => prev + 1)
              setTimeLeft(30) // Reset timer
            }

            // Check Collapse:
            // Only trigger if a locked (top) block has fallen significantly (e.g., near the table)
            if (block.userData?.isLocked && block.position.y < 2) {
              setGameOver(true)
              gameOverRef.current = true
            }
          })
        }
      }
    }

    sceneUpdateListenerRef.current = sceneUpdateListener
    scene.addEventListener('update', sceneUpdateListener)
    // console.log('[INIT] Scene update event listener registered') // Removed debug log

    // Start Render Loop
    requestAnimationFrame(render)

    // Enable physics simulation based on game mode - ONLY after worker is ready
    if (settings.gameMode === 'SOLO_PRACTICE' || settings.gameMode === 'SOLO_COMPETITOR') {
      // console.log('[INIT] Waiting for Physijs worker to be ready...') // Removed debug log

      // Wait for worker to be ready before starting simulation
      const startPhysics = () => {
        if (sceneRef.current) {
          // Clear all pending checks since we're now starting
          workerCheckTimeouts.current.forEach(timeoutId => clearTimeout(timeoutId))
          workerCheckTimeouts.current.clear()
          sceneRef.current.simulate()
        }
      }

      // Check if worker is ready, if not, wait for it
      const checkWorkerReady = () => {
        const s = sceneRef.current as any
        if (s && s._worker) {
          startPhysics()
        } else {
          const timeoutId = setTimeout(checkWorkerReady, 50)
          workerCheckTimeouts.current.add(timeoutId)
        }
      }

      // Give the scene a moment to create its worker
      const initialTimeoutId = setTimeout(checkWorkerReady, 100)
      workerCheckTimeouts.current.add(initialTimeoutId)
    }

    engine.camera = new THREE.PerspectiveCamera(
      35,
      width / height,
      1,
      1000
    )
    engine.camera.position.set(25, 20, 25)
    engine.camera.lookAt(new THREE.Vector3(0, 7, 0))
    scene.add(engine.camera)

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
    const loader = new THREE.TextureLoader()

    const physicsConfig = getPhysicsConfig(settings.difficulty)

    // Materials
    const woodTexture = loader.load('/images/wood.jpg', undefined, undefined, (err: any) => {
      console.error('Error loading wood texture:', err)
    })

    engine.materials.table = Physijs.createMaterial(
      new THREE.MeshLambertMaterial({ map: woodTexture }),
      physicsConfig.friction, // friction
      physicsConfig.restitution // restitution
    )
    engine.materials.table.map.wrapS = engine.materials.table.map.wrapT = THREE.RepeatWrapping
    engine.materials.table.map.repeat.set(5, 5)

    const plywoodTexture = loader.load('/images/plywood.jpg', undefined, undefined, (err: any) => {
      console.error('Error loading plywood texture:', err)
    })

    // Standard Block Material
    engine.materials.block = Physijs.createMaterial(
      new THREE.MeshLambertMaterial({ map: plywoodTexture }),
      physicsConfig.friction,
      physicsConfig.restitution
    )
    engine.materials.block.map.wrapS = engine.materials.block.map.wrapT = THREE.RepeatWrapping
    engine.materials.block.map.repeat.set(1, .5)

    // Locked Block Material (Darker/Reddish) for top layers
    engine.materials.lockedBlock = Physijs.createMaterial(
      new THREE.MeshLambertMaterial({ map: plywoodTexture, color: 0xffaaaa }), // Red tint
      physicsConfig.friction,
      physicsConfig.restitution
    )
    engine.materials.lockedBlock.map.wrapS = engine.materials.lockedBlock.map.wrapT = THREE.RepeatWrapping
    engine.materials.lockedBlock.map.repeat.set(1, .5)

    // Table
    const table = new Physijs.BoxMesh(
      new THREE.BoxGeometry(50, 1, 50),
      engine.materials.table,
      0, // mass
      { restitution: physicsConfig.restitution, friction: physicsConfig.friction }
    )
    table.position.y = -.5
    table.receiveShadow = true
    scene.add(table)

    createTower()

    engine.interaction.plane = new THREE.Mesh(
      new THREE.PlaneGeometry(150, 150),
      new THREE.MeshBasicMaterial({ opacity: 0, transparent: true })
    )
    engine.interaction.plane.rotation.x = Math.PI / -2
    scene.add(engine.interaction.plane)

    // Wait a tick to ensure the renderer DOM element is available
    setTimeout(() => {
      initEventHandling()
    }, 0)

    // Physics simulation is handled by the update event listener
  }

  const render = function () {
    requestRef.current = requestAnimationFrame(render)
    if (engineRef.current.renderer && sceneRef.current && engineRef.current.camera) {
      engineRef.current.renderer.render(sceneRef.current, engineRef.current.camera)

      // Physics Watchdog
      // If physics hasn't updated in 4 seconds, restart it
      if (settings.gameMode === 'SOLO_PRACTICE' || settings.gameMode === 'SOLO_COMPETITOR') {
        const now = Date.now()
        if (now - engineRef.current.lastPhysicsUpdate > 4000) {
          console.warn('Physics stalled (>4s), restarting simulation...')
          engineRef.current.lastPhysicsUpdate = now
          sceneRef.current.simulate()
        }
      }
    }
  }

  const createTower = function () {
    const block_length = 6, block_height = 1, block_width = 1.5, block_offset = 2
    const block_geometry = new THREE.BoxGeometry(block_length, block_height, block_width)
    const sc = sceneRef.current
    const engine = engineRef.current

    if (!sc || !engine.materials.block) {
      console.error('Scene or materials not ready, cannot create tower')
      return
    }

    // Use cached materials if not provided (for reset)
    const mat = engine.materials.block
    const lMat = engine.materials.lockedBlock || mat

    const physicsConfig = getPhysicsConfig(settings.difficulty)
    // console.log('Creating tower with physics config:', physicsConfig) // Removed debug log

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
    const engine = engineRef.current
    if (!sc) return

    for (let i = 0; i < blocksRef.current.length; i++) {
      sc.remove(blocksRef.current[i])
    }
    blocksRef.current.length = 0
    engine.interaction.selectedBlock = null
    createTower()
    setFallenCount(0)
    setScore(0)
    setGameOver(false)
    gameOverRef.current = false
    setGameWon(false)
    setTimeLeft(30)
    scoredBlocksRef.current.clear()

    if (settings.gameMode === 'SOLO_PRACTICE' || settings.gameMode === 'SOLO_COMPETITOR') {
      sc.simulate()
    }
  }

  const initEventHandling = function () {
    const engine = engineRef.current
    // Check if renderer and its DOM element exist
    if (!engine.renderer || !engine.renderer.domElement) {
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
      if (isSpectator || gameState !== 'ACTIVE' || gameOver || showRulesRef.current) return

      // Prevent default to stop scrolling on touch devices
      if (evt.type === 'touchstart') {
        evt.preventDefault()
      }

      const { clientX, clientY } = getEventPos(evt)
      const rect = engine.renderer.domElement.getBoundingClientRect()
      const nx = ((clientX - rect.left) / rect.width) * 2 - 1
      const ny = -((clientY - rect.top) / rect.height) * 2 + 1

      // Revert to z=1 (far plane) for consistent raycasting
      const vector = new THREE.Vector3(nx, ny, 1)
      vector.unproject(engine.camera)

      const ray = new THREE.Raycaster(engine.camera.position, vector.sub(engine.camera.position).normalize())

      // console.log('Raycasting against', blocksRef.current.length, 'blocks') // Removed debug log
      const intersections = ray.intersectObjects(blocksRef.current)

      if (intersections.length > 0) {
        const block = intersections[0].object
        // console.log('Intersection found:', block.id) // Removed debug log

        // Competitor Mode: Prevent selecting top 2 levels (Layers 14 and 15)
        if (settings.gameMode === 'SOLO_COMPETITOR' && block.userData?.layer >= 14) {
          console.warn('Cannot move blocks from top 2 levels!')
          return
        }

        engine.interaction.selectedBlock = block

        // Update intersection plane to match block height
        engine.interaction.plane.position.y = engine.interaction.selectedBlock.position.y

        const planeHit = ray.intersectObject(engine.interaction.plane)
        if (planeHit.length > 0) {
          // console.log('Plane hit at', planeHit[0].point) // Removed debug log
          engine.interaction.mousePos.copy(planeHit[0].point)
          dragStartRef.current = planeHit[0].point.clone()
        } else {
          // console.log('Plane hit failed') // Removed debug log
          dragStartRef.current = null
        }
      } else {
        // console.log('No intersection found') // Removed debug log
      }
    }

    const handleInputEnd = function (evt: MouseEvent | TouchEvent) {
      if (engine.interaction.selectedBlock !== null) {
        // console.log('Input End. Selected block:', engine.interaction.selectedBlock.id) // Removed debug log
        const start = dragStartRef.current
        let end = engine.interaction.mousePos.clone()
        if (start) {
          end.y = start.y
        }
        const delta = new THREE.Vector3().copy(end).sub(start || engine.interaction.selectedBlock.position)
        delta.y = 0
        const length = delta.length()
        // console.log('Drag length:', length) // Removed debug log
        const dir = length > 0 ? delta.normalize() : new THREE.Vector3(1, 0, 0)
        const impulse = dir.multiplyScalar(Math.max(5, Math.min(50, length * 10)))

        const blockIndex = blocksRef.current.indexOf(engine.interaction.selectedBlock)

        if (settings.gameMode === 'SOLO_PRACTICE' || settings.gameMode === 'SOLO_COMPETITOR') {
          const block = engine.interaction.selectedBlock
          // console.log('Applying impulse:', impulse, 'to block mass:', block.mass) // Removed debug log

          // Attempt to wake up the block
          if (block.setAngularVelocity) block.setAngularVelocity(new THREE.Vector3(0, 0, 0))
          if (block.setLinearVelocity) block.setLinearVelocity(new THREE.Vector3(0, 0, 0))

          if (typeof block.applyCentralImpulse === 'function') {
            block.applyCentralImpulse(impulse)
          } else {
            block.applyCentralForce(impulse)
          }
        } else if (socketRef.current && blockIndex !== -1) {
          socketRef.current.emit('submitMove', {
            blockIndex: blockIndex,
            force: { x: impulse.x, y: impulse.y, z: impulse.z },
            point: { x: engine.interaction.selectedBlock.position.x, y: engine.interaction.selectedBlock.position.y, z: engine.interaction.selectedBlock.position.z }
          })
        }

        engine.interaction.selectedBlock = null
        dragStartRef.current = null
      }
    }

    const handleInputMove = function (evt: MouseEvent | TouchEvent) {
      // Prevent default to stop scrolling on touch devices
      if (evt.type === 'touchmove') {
        evt.preventDefault()
      }

      if (engine.interaction.selectedBlock !== null) {
        // console.log('Input Move. Selected block:', engine.interaction.selectedBlock.id) // Removed debug log
        const { clientX, clientY } = getEventPos(evt)
        const rect = engine.renderer.domElement.getBoundingClientRect()
        const nx = ((clientX - rect.left) / rect.width) * 2 - 1
        const ny = -((clientY - rect.top) / rect.height) * 2 + 1

        const vector = new THREE.Vector3(nx, ny, 1)
        vector.unproject(engine.camera)

        const ray = new THREE.Raycaster(engine.camera.position, vector.sub(engine.camera.position).normalize())

        // Ensure plane is at correct height
        engine.interaction.plane.position.y = engine.interaction.selectedBlock.position.y

        const intersection = ray.intersectObject(engine.interaction.plane)
        if (intersection.length > 0) {
          engine.interaction.mousePos.copy(intersection[0].point)
        }
      }
    }

    // Old handleInputEnd removed


    // Mouse events
    engine.renderer.domElement.addEventListener('mousedown', handleInputStart)
    engine.renderer.domElement.addEventListener('mousemove', handleInputMove)
    engine.renderer.domElement.addEventListener('mouseup', handleInputEnd)

    // Touch events
    engine.renderer.domElement.addEventListener('touchstart', handleInputStart, { passive: false })
    engine.renderer.domElement.addEventListener('touchmove', handleInputMove, { passive: false })
    engine.renderer.domElement.addEventListener('touchend', handleInputEnd)
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
        gameMode={settings.gameMode}
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
        showRules={showRules}
        setShowRules={setShowRules}
      />

      {/* Game Over Overlay for Competitor Mode */}
      {gameOver && settings.gameMode === 'SOLO_COMPETITOR' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-white/20 p-8 rounded-2xl text-center max-w-lg w-full shadow-2xl">

            {/* New High Score Celebration */}
            {score > highScore && score > 0 && (
              <div className="mb-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-400 rounded-xl p-4 animate-pulse">
                <div className="text-2xl font-bold text-yellow-400 flex items-center justify-center gap-2">
                  🔥 NEW HIGH SCORE! 🔥
                </div>
                <div className="text-sm text-yellow-200 mt-1">Previous Best: {highScore}</div>
              </div>
            )}

            <h2 className="text-4xl font-bold text-white mb-2">Game Over</h2>
            <p className="text-gray-400 mb-6">The tower collapsed or time ran out!</p>

            {/* Score Display */}
            <div className="bg-white/5 rounded-xl p-6 mb-6">
              <div className="text-sm text-gray-400 uppercase tracking-wider mb-1">Final Score</div>
              <div className="text-6xl font-bold text-yellow-400">{score}</div>
              <div className="text-sm text-gray-500 mt-2">Difficulty: <span className="text-white font-semibold">{settings.difficulty}</span></div>
            </div>

            {/* Rank & Stats */}
            {rank > 0 && totalPlayers > 0 && (
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-xs text-gray-400 uppercase mb-1">Your Rank</div>
                  <div className="text-2xl font-bold text-blue-400">
                    #{rank}
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-xs text-gray-400 uppercase mb-1">Total Players</div>
                  <div className="text-2xl font-bold text-purple-400">
                    {totalPlayers}
                  </div>
                </div>
              </div>
            )}

            {/* Top 3 Preview */}
            {topScores && topScores.length > 0 && (
              <div className="bg-white/5 rounded-xl p-4 mb-6">
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-3">Top Players ({settings.difficulty})</div>
                <div className="space-y-2">
                  {topScores.slice(0, 3).map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                        <span className="text-gray-300 font-mono">
                          {entry.player.slice(0, 6)}...{entry.player.slice(-4)}
                        </span>
                      </div>
                      <span className="text-yellow-400 font-bold">{entry.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transaction Hash Link */}
            {isScoreConfirmed && scoreHash && (
              <a
                href={`https://sepolia.lineascan.build/tx/${scoreHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block mb-4 text-sm text-blue-400 hover:text-blue-300 underline"
              >
                View Transaction on Lineascan ↗
              </a>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={() => submitScore(settings.difficulty, score)}
                disabled={isSubmitting || isConfirmingScore || isScoreConfirmed}
                className={`w-full font-bold py-3 rounded-lg transition-all transform ${isScoreConfirmed
                  ? 'bg-green-600 text-white cursor-default'
                  : 'bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white hover:scale-105'
                  } disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
              >
                {isSubmitting ? '⏳ Check Wallet...' :
                  isConfirmingScore ? '⛓️ Confirming on Blockchain...' :
                    isScoreConfirmed ? '✅ Score Submitted!' : '💎 Submit Score (On-Chain)'}
              </button>

              <button
                onClick={resetTower}
                className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                🔄 Try Again
              </button>

              {onExit && (
                <button
                  onClick={onExit}
                  className="w-full bg-white/5 hover:bg-white/10 text-gray-300 font-semibold py-3 rounded-lg transition-colors"
                >
                  🚪 Exit to Menu
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
