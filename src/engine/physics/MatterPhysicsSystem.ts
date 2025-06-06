import {
    Engine,
    World,
    Bodies,
    Body,
    Vector,
} from 'matter-js';
import type {
    IPhysicsSystem,
    IPhysicsBody,
    Vector2D,
    PhysicsBodyOptions
} from '../interfaces/IPhysicsSystem';

class MatterPhysicsBody implements IPhysicsBody {
    private body: Body;
    public id: string;

    constructor(body: Body, id: string) {
        this.body = body;
        this.id = id;
    }

    get position(): Vector2D {
        return { x: this.body.position.x, y: this.body.position.y };
    }

    get angle(): number {
        return this.body.angle;
    }

    get velocity(): Vector2D {
        return { x: this.body.velocity.x, y: this.body.velocity.y };
    }

    get angularVelocity(): number {
        return this.body.angularVelocity;
    }

    get matterBody(): Body {
        return this.body;
    }
}

export class MatterPhysicsSystem implements IPhysicsSystem {
    private engine: Engine | null = null;
    private world: World | null = null;
    private bodies: Map<string, MatterPhysicsBody> = new Map();
    private bodyIdCounter = 0;

    public initialize(width: number, height: number): void {
        // Create Matter.js engine
        this.engine = Engine.create();
        this.world = this.engine.world;

        // Set default gravity
        this.engine.world.gravity.y = 1;
        this.engine.world.gravity.x = 0;

        // Create world boundaries
        const groundOptions: PhysicsBodyOptions = { isStatic: true };

        // Ground
        this.createRectangle(width / 2, height - 10, width, 20, groundOptions);

        // Left wall
        this.createRectangle(10, height / 2, 20, height, groundOptions);

        // Right wall
        this.createRectangle(width - 10, height / 2, 20, height, groundOptions);

        // Ceiling
        this.createRectangle(width / 2, 10, width, 20, groundOptions);
    }

    public update(deltaTime: number): void {
        if (!this.engine) return;

        // Convert deltaTime from milliseconds to seconds and run engine
        Engine.update(this.engine, deltaTime);
    }

    public createRectangle(
        x: number,
        y: number,
        width: number,
        height: number,
        options: PhysicsBodyOptions = {}
    ): IPhysicsBody {
        if (!this.world) {
            throw new Error('Physics system not initialized');
        }

        const body = Bodies.rectangle(x, y, width, height, {
            isStatic: options.isStatic ?? false,
            restitution: options.restitution ?? 0.3,
            friction: options.friction ?? 0.1,
            frictionAir: options.frictionAir ?? 0.01,
            density: options.density ?? 0.001,
        });

        const id = `body_${this.bodyIdCounter++}`;
        const physicsBody = new MatterPhysicsBody(body, id);

        this.bodies.set(id, physicsBody);
        World.add(this.world, body);

        return physicsBody;
    }

    public createCircle(
        x: number,
        y: number,
        radius: number,
        options: PhysicsBodyOptions = {}
    ): IPhysicsBody {
        if (!this.world) {
            throw new Error('Physics system not initialized');
        }

        const body = Bodies.circle(x, y, radius, {
            isStatic: options.isStatic ?? false,
            restitution: options.restitution ?? 0.3,
            friction: options.friction ?? 0.1,
            frictionAir: options.frictionAir ?? 0.01,
            density: options.density ?? 0.001,
        });

        const id = `body_${this.bodyIdCounter++}`;
        const physicsBody = new MatterPhysicsBody(body, id);

        this.bodies.set(id, physicsBody);
        World.add(this.world, body);

        return physicsBody;
    }

    public removeBody(body: IPhysicsBody): void {
        if (!this.world) return;

        const matterBody = this.bodies.get(body.id);
        if (matterBody) {
            World.remove(this.world, matterBody.matterBody);
            this.bodies.delete(body.id);
        }
    }

    public getAllBodies(): IPhysicsBody[] {
        return Array.from(this.bodies.values());
    }

    public applyForce(body: IPhysicsBody, force: Vector2D): void {
        const matterBody = this.bodies.get(body.id);
        if (matterBody) {
            Body.applyForce(matterBody.matterBody, matterBody.position, Vector.create(force.x, force.y));
        }
    }

    public setGravity(x: number, y: number): void {
        if (this.engine) {
            this.engine.world.gravity.x = x;
            this.engine.world.gravity.y = y;
        }
    }

    public destroy(): void {
        if (this.engine) {
            Engine.clear(this.engine);
            this.engine = null;
        }
        this.world = null;
        this.bodies.clear();
        this.bodyIdCounter = 0;
    }
}
