'use client'

import React, { useEffect, useRef } from 'react'

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

export default function Game() {
  // Contract Hooks
  const {
    gameStateData,
    joinGame: contractJoin,
    reload: contractReload,
    isPending,
    isConfirming
  } = useGameContract()

  // Game State (Hybrid: Contract + Local Mock)
  const [gameState, setGameState] = React.useState<GameState>('WAITING')
  const [potSize, setPotSize] = React.useState(0)
  const [timeLeft, setTimeLeft] = React.useState(30)
  const [players, setPlayers] = React.useState<Player[]>([
    { id: '1', address: '0x1234...7890', isAlive: true, isCurrentTurn: false },
    { id: '2', address: '0xabcd...abcd', isAlive: true, isCurrentTurn: false },
  ])
  const [currentPlayerId, setCurrentPlayerId] = React.useState<string | undefined>()
  const [fallenCount, setFallenCount] = React.useState(0)
  const [isSpectator, setIsSpectator] = React.useState(false)

  // Game Settings (Default)
  const [settings, setSettings] = React.useState({
    collapseThreshold: 0.4, // 40%
    difficulty: 'MEDIUM'
  })

  // Sync Contract Data
  useEffect(() => {
    if (gameStateData) {
      // Map contract state to local state
      // Note: This is where you'd parse the BigInts from the contract
      // For now, we just log it to show it's working
      console.log('Contract State:', gameStateData)
    }
  }, [gameStateData])

  // Timer Logic
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (gameState === 'ACTIVE' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Turn over logic would go here
            return 30 // Reset for next turn (mock)
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [gameState, timeLeft])

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const init = async () => {
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
          window.Physijs.scripts.worker = '/js/physijs_worker.js'
          window.Physijs.scripts.ammo = '/js/ammo.js'

          // Check if worker file exists
          fetch(window.Physijs.scripts.worker)
            .catch(err => console.error('Worker file access error:', err))

          // Check if ammo.js file exists
          fetch(window.Physijs.scripts.ammo)
            .catch(err => console.error('Ammo.js file access error:', err))
        } else {
          console.error('Physijs is not available')
        }

        // Initialize the game
        initScene()

        // Handle window resize
        const handleResize = () => {
          if (renderer && camera) {
            camera.aspect = window.innerWidth / window.innerHeight
            camera.updateProjectionMatrix()
            renderer.setSize(window.innerWidth, window.innerHeight)
          }
        }

        window.addEventListener('resize', handleResize)

        return () => {
          window.removeEventListener('resize', handleResize)
          if (renderer) {
            renderer.dispose()
          }
        }
      } catch (error) {
        console.error('Failed to load scripts:', error)
      }
    }

    init()
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
    blocks: any[] = [],
    loader: any,
    table_material: any,
    block_material: any,
    intersect_plane: any,
    selected_block: any = null,
    mouse_position: any,
    block_offset: any

  const initScene = function () {
    mouse_position = new THREE.Vector3(0, 0, 0)
    block_offset = new THREE.Vector3(0, 0, 0)

    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x2c3e50)
    renderer.shadowMap.enabled = true
    renderer.shadowMapSoft = true
    // Ensure the canvas can receive mouse events
    renderer.domElement.style.pointerEvents = 'auto'
    containerRef.current?.appendChild(renderer.domElement)

    scene = new Physijs.Scene({ fixedTimeStep: 1 / 120 })
    scene.setGravity(new THREE.Vector3(0, -30, 0))

    scene.addEventListener('update', function () {
      // Collapse Detection
      let fallen = 0
      const totalBlocks = blocks.length

      for (let i = 0; i < totalBlocks; i++) {
        // If block falls below the table surface (y < 0.5)
        if (blocks[i].position.y < 0.5) {
          fallen++
        }
      }

      // Update React state (throttled)
      if (Math.random() < 0.1) { // Only update 10% of frames to save React renders
        setFallenCount(fallen)

        // Check Threshold
        if (fallen / totalBlocks >= settings.collapseThreshold && gameState === 'ACTIVE') {
          // Trigger Collapse
          setGameState('VOTING')
        }
      }

      if (selected_block !== null) {
        const _v3 = new THREE.Vector3()
        _v3.copy(mouse_position).add(block_offset).sub(selected_block.position).multiplyScalar(5)
        _v3.y = 0
        selected_block.setLinearVelocity(_v3)

        // Reactivate all blocks
        _v3.set(0, 0, 0)
        for (let _i = 0; _i < blocks.length; _i++) {
          blocks[_i].applyCentralImpulse(_v3)
        }
      }

      scene.simulate(undefined, 1)
    })

    camera = new THREE.PerspectiveCamera(
      35,
      window.innerWidth / window.innerHeight,
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

    // Materials
    const woodTexture = loader.load('/images/wood.jpg', undefined, undefined, (err: any) => {
      console.error('Error loading wood texture:', err)
    })

    table_material = Physijs.createMaterial(
      new THREE.MeshLambertMaterial({ map: woodTexture }),
      .9, // friction
      .2 // restitution
    )
    table_material.map.wrapS = table_material.map.wrapT = THREE.RepeatWrapping
    table_material.map.repeat.set(5, 5)

    const plywoodTexture = loader.load('/images/plywood.jpg', undefined, undefined, (err: any) => {
      console.error('Error loading plywood texture:', err)
    })
    block_material = Physijs.createMaterial(
      new THREE.MeshLambertMaterial({ map: plywoodTexture }),
      .4, // friction
      .4 // restitution
    )
    block_material.map.wrapS = block_material.map.wrapT = THREE.RepeatWrapping
    block_material.map.repeat.set(1, .5)

    // Table
    table = new Physijs.BoxMesh(
      new THREE.BoxGeometry(50, 1, 50),
      table_material,
      0, // mass
      { restitution: .2, friction: .8 }
    )
    table.position.y = -.5
    table.receiveShadow = true
    scene.add(table)

    createTower()

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

    requestAnimationFrame(render)
    scene.simulate()
  }

  const render = function () {
    requestAnimationFrame(render)
    renderer.render(scene, camera)
  }

  const createTower = function () {
    const block_length = 6, block_height = 1, block_width = 1.5, block_offset = 2
    const block_geometry = new THREE.BoxGeometry(block_length, block_height, block_width)

    for (let i = 0; i < 16; i++) {
      for (let j = 0; j < 3; j++) {
        const block = new Physijs.BoxMesh(block_geometry, block_material)
        block.position.y = (block_height / 2) + block_height * i
        if (i % 2 === 0) {
          block.rotation.y = Math.PI / 2.01
          block.position.x = block_offset * j - (block_offset * 3 / 2 - block_offset / 2)
        } else {
          block.position.z = block_offset * j - (block_offset * 3 / 2 - block_offset / 2)
        }
        block.receiveShadow = true
        block.castShadow = true
        scene.add(block)
        blocks.push(block)
      }
    }
  }

  const resetTower = function () {
    // Remove all existing blocks from the scene
    for (let i = 0; i < blocks.length; i++) {
      scene.remove(blocks[i])
    }
    // Clear the blocks array
    blocks.length = 0
    // Recreate the tower
    createTower()
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
      if (isSpectator || gameState !== 'ACTIVE') return

      // Prevent default to stop scrolling on touch devices
      if (evt.type === 'touchstart') {
        evt.preventDefault()
      }

      const { clientX, clientY } = getEventPos(evt)

      const vector = new THREE.Vector3(
        (clientX / window.innerWidth) * 2 - 1,
        -(clientY / window.innerHeight) * 2 + 1,
        1
      )

      vector.unproject(camera)

      const ray = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize())
      const intersections = ray.intersectObjects(blocks)

      if (intersections.length > 0) {
        selected_block = intersections[0].object

        const _vector_zero = new THREE.Vector3(0, 0, 0)
        selected_block.setAngularFactor(_vector_zero)
        selected_block.setAngularVelocity(_vector_zero)
        selected_block.setLinearFactor(_vector_zero)
        selected_block.setLinearVelocity(_vector_zero)

        mouse_position.copy(intersections[0].point)
        block_offset.subVectors(selected_block.position, mouse_position)

        intersect_plane.position.y = mouse_position.y
      }
    }

    const handleInputMove = function (evt: MouseEvent | TouchEvent) {
      // Prevent default to stop scrolling on touch devices
      if (evt.type === 'touchmove') {
        evt.preventDefault()
      }

      if (selected_block !== null) {
        const { clientX, clientY } = getEventPos(evt)

        const vector = new THREE.Vector3(
          (clientX / window.innerWidth) * 2 - 1,
          -(clientY / window.innerHeight) * 2 + 1,
          1
        )
        vector.unproject(camera)

        const ray = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize())
        const intersection = ray.intersectObject(intersect_plane)
        if (intersection.length > 0) {
          mouse_position.copy(intersection[0].point)
        }
      }
    }

    const handleInputEnd = function (evt: MouseEvent | TouchEvent) {
      if (selected_block !== null) {
        const _vector_one = new THREE.Vector3(1, 1, 1)
        selected_block.setAngularFactor(_vector_one)
        selected_block.setLinearFactor(_vector_one)

        selected_block = null
      }
    }

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
    <div className="relative w-full h-screen bg-zinc-900">
      {/* Game UI Overlay */}
      <GameUI
        gameState={gameState}
        potSize={potSize}
        timeLeft={timeLeft}
        players={players}
        currentPlayerId={currentPlayerId}
        fallenCount={fallenCount}
        totalBlocks={16 * 3} // 48 blocks
        onJoin={() => {
          // Try contract first, fallback to mock
          try {
            contractJoin()
          } catch (e) {
            console.error(e)
          }

          // Mock update for immediate feedback
          setGameState('ACTIVE')
          setPotSize(prev => prev + 1)
          setPlayers(prev => [
            ...prev,
            { id: 'me', address: '0xMe', isAlive: true, isCurrentTurn: true }
          ])
          setCurrentPlayerId('me')
          setIsSpectator(false)
        }}
        onReload={() => {
          contractReload()
          setPotSize(prev => prev + 1)
        }}
        onVote={(split) => {
          alert(`Voted to ${split ? 'Split' : 'Continue'}`)
          // Reset for next round
          setGameState('ACTIVE')
          setFallenCount(0)
          resetTower()
        }}
      />

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
      <div ref={containerRef} className="w-full h-full" style={{ pointerEvents: 'auto' }}>
        {/* Canvas will be appended here by initScene */}
      </div>
    </div>
  )
}
