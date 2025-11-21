import * as CANNON from 'cannon-es';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

interface PhysicsConfig {
    friction: number;
    restitution: number;
    linearDamping: number;
    angularDamping: number;
    mass: number;
}

const DIFFICULTY_CONFIGS: Record<Difficulty, PhysicsConfig> = {
    EASY: {
        friction: 0.8,
        restitution: 0.1,
        linearDamping: 0.1,
        angularDamping: 0.1,
        mass: 2.0
    },
    MEDIUM: {
        friction: 0.5,
        restitution: 0.3,
        linearDamping: 0.05,
        angularDamping: 0.05,
        mass: 1.0
    },
    HARD: {
        friction: 0.2,
        restitution: 0.5,
        linearDamping: 0.01,
        angularDamping: 0.01,
        mass: 0.5
    }
};

export class PhysicsWorld {
    private world: CANNON.World;
    private blocks: CANNON.Body[] = [];
    private table: CANNON.Body;
    private ground: CANNON.Body;
    private config: PhysicsConfig;

    constructor(difficulty: Difficulty = 'MEDIUM') {
        this.config = DIFFICULTY_CONFIGS[difficulty];
        this.world = new CANNON.World();
        this.world.gravity.set(0, -30, 0); // Match client gravity
        this.world.broadphase = new CANNON.NaiveBroadphase();
        (this.world.solver as CANNON.GSSolver).iterations = 10;

        // Create Materials
        const tableMaterial = new CANNON.Material('table');
        const blockMaterial = new CANNON.Material('block');

        const tableBlockContact = new CANNON.ContactMaterial(tableMaterial, blockMaterial, {
            friction: this.config.friction,
            restitution: this.config.restitution
        });
        this.world.addContactMaterial(tableBlockContact);

        const blockBlockContact = new CANNON.ContactMaterial(blockMaterial, blockMaterial, {
            friction: this.config.friction,
            restitution: this.config.restitution
        });
        this.world.addContactMaterial(blockBlockContact);

        // Ground/Table
        this.ground = new CANNON.Body({
            mass: 0, // Static
            material: tableMaterial
        });
        this.ground.addShape(new CANNON.Box(new CANNON.Vec3(25, 0.5, 25)));
        this.ground.position.set(0, -0.5, 0);
        this.world.addBody(this.ground);

        // Table (Visual representation match)
        this.table = new CANNON.Body({
            mass: 0,
            material: tableMaterial
        });
        this.table.addShape(new CANNON.Box(new CANNON.Vec3(25, 0.5, 25)));
        this.table.position.set(0, -0.5, 0);
        this.world.addBody(this.table);

        this.createTower(blockMaterial);
    }

    private createTower(material: CANNON.Material) {
        const blockLength = 6;
        const blockHeight = 1;
        const blockWidth = 1.5;
        const blockOffset = 2;

        // Cannon uses half-extents
        const shape = new CANNON.Box(new CANNON.Vec3(blockLength / 2, blockHeight / 2, blockWidth / 2));

        for (let i = 0; i < 16; i++) {
            for (let j = 0; j < 3; j++) {
                const body = new CANNON.Body({
                    mass: this.config.mass, // Dynamic
                    material: material
                });
                body.addShape(shape);

                const y = (blockHeight / 2) + blockHeight * i;
                let x = 0;
                let z = 0;

                if (i % 2 === 0) {
                    // Rotate 90 degrees around Y
                    const q = new CANNON.Quaternion();
                    q.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI / 2.01);
                    body.quaternion = q;
                    x = blockOffset * j - (blockOffset * 3 / 2 - blockOffset / 2);
                } else {
                    z = blockOffset * j - (blockOffset * 3 / 2 - blockOffset / 2);
                }

                body.position.set(x, y, z);

                // Damping to improve stability
                body.linearDamping = this.config.linearDamping;
                body.angularDamping = this.config.angularDamping;

                this.world.addBody(body);
                this.blocks.push(body);
            }
        }
    }

    public step(dt: number) {
        this.world.step(dt);
    }

    public getState() {
        return this.blocks.map(b => ({
            position: { x: b.position.x, y: b.position.y, z: b.position.z },
            quaternion: { x: b.quaternion.x, y: b.quaternion.y, z: b.quaternion.z, w: b.quaternion.w },
            velocity: { x: b.velocity.x, y: b.velocity.y, z: b.velocity.z }
        }));
    }

    public applyForce(blockIndex: number, force: { x: number, y: number, z: number }, point: { x: number, y: number, z: number }) {
        if (blockIndex >= 0 && blockIndex < this.blocks.length) {
            const body = this.blocks[blockIndex];
            body.applyImpulse(
                new CANNON.Vec3(force.x, force.y, force.z),
                new CANNON.Vec3(point.x, point.y, point.z)
            );

            // Wake up all blocks
            this.blocks.forEach(b => b.wakeUp());
        }
    }

    public checkCollapse(threshold: number = 0.4): boolean {
        let fallen = 0;
        const total = this.blocks.length;

        for (const block of this.blocks) {
            if (block.position.y < 0.5) {
                fallen++;
            }
        }

        return (fallen / total) >= threshold;
    }
}
