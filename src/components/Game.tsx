'use client'

import { useEffect, useRef } from 'react'

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

export default function Game() {
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


    const handleMouseDown = function (evt: MouseEvent) {
      const vector = new THREE.Vector3(
        (evt.clientX / window.innerWidth) * 2 - 1,
        -(evt.clientY / window.innerHeight) * 2 + 1,
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

    const handleMouseMove = function (evt: MouseEvent) {
      if (selected_block !== null) {
        const vector = new THREE.Vector3(
          (evt.clientX / window.innerWidth) * 2 - 1,
          -(evt.clientY / window.innerHeight) * 2 + 1,
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

    const handleMouseUp = function () {
      if (selected_block !== null) {
        const _vector_one = new THREE.Vector3(1, 1, 1)
        selected_block.setAngularFactor(_vector_one)
        selected_block.setLinearFactor(_vector_one)

        selected_block = null
      }
    }

    renderer.domElement.addEventListener('mousedown', handleMouseDown)
    renderer.domElement.addEventListener('mousemove', handleMouseMove)
    renderer.domElement.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <div className="relative w-full h-screen bg-zinc-900">
      {/* Reset Button */}
      <button
        onClick={() => resetTower()}
        className="absolute bottom-6 right-6 z-50 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg backdrop-blur-sm transition-colors duration-200 border border-white/20"
        style={{ pointerEvents: 'auto' }}
      >
        Reset Tower
      </button>

      {/* Game Canvas Container */}
      <div ref={containerRef} className="w-full h-full" style={{ pointerEvents: 'auto' }}>
        {/* Canvas will be appended here by initScene */}
      </div>
    </div>
  )
}
