export interface PhysicsConfig {
    friction: number
    restitution: number
    mass: number
    damping: number
}

/**
 * Load a script dynamically
 */
export const loadScript = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = src
        script.onload = () => resolve()
        script.onerror = reject
        document.head.appendChild(script)
    })
}

/**
 * Get physics configuration based on difficulty
 */
export const getPhysicsConfig = (difficulty: 'EASY' | 'MEDIUM' | 'HARD'): PhysicsConfig => {
    switch (difficulty) {
        case 'EASY': return { friction: 0.8, restitution: 0.3, mass: 0.5, damping: 0.05 }
        case 'MEDIUM': return { friction: 0.5, restitution: 0.4, mass: 1.0, damping: 0.02 }
        case 'HARD': return { friction: 0.2, restitution: 0.5, mass: 2.0, damping: 0.01 }
        default: return { friction: 0.5, restitution: 0.4, mass: 1.0, damping: 0.02 }
    }
}
