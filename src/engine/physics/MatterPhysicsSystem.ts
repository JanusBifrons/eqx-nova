import { Engine, World, Bodies, Body, Vector, Events, Constraint } from 'matter-js';
import type {
  IPhysicsSystem,
  IPhysicsBody,
  Vector2D,
  PhysicsBodyOptions,
  CollisionCallback,
  CollisionEvent,
  IConstraint,
  ConstraintOptions,
  CompoundBodyPart,
} from '../interfaces/IPhysicsSystem';

class MatterPhysicsBody implements IPhysicsBody {
  private body: Body;
  public id: string;

  constructor(body: Body, id: string) {
    this.body = body;
    this.id = id;
  }

  public get position(): Vector2D {
    return { x: this.body.position.x, y: this.body.position.y };
  }

  public get angle(): number {
    return this.body.angle;
  }

  public get velocity(): Vector2D {
    return { x: this.body.velocity.x, y: this.body.velocity.y };
  }

  public get angularVelocity(): number {
    return this.body.angularVelocity;
  }

  public get matterBody(): Body {
    return this.body;
  }
}

class MatterConstraint implements IConstraint {
  private constraint: any;
  public id: string;

  constructor(constraint: any, id: string) {
    this.constraint = constraint;
    this.id = id;
  }

  public get matterConstraint(): any {
    return this.constraint;
  }
}

export class MatterPhysicsSystem implements IPhysicsSystem {
  private engine: Engine | null = null;
  private world: World | null = null;
  private bodies: Map<string, MatterPhysicsBody> = new Map(); private constraints: Map<string, MatterConstraint> = new Map();
  private bodyIdCounter = 0;
  private constraintIdCounter = 0;
  private collisionStartCallbacks: CollisionCallback[] = [];
  private collisionEndCallbacks: CollisionCallback[] = [];
  private defaultBodyProperties: any = {};  public initialize(
    width: number,
    height: number,
    createBoundaries: boolean = true
  ): void {
    // Create Matter.js engine
    this.engine = Engine.create();
    this.world = this.engine.world;    // Configure engine for stable but rigid constraints
    this.engine.constraintIterations = 8;   // Moderate increase from default 2
    this.engine.positionIterations = 6;     // Keep default for stability
    this.engine.velocityIterations = 4;     // Keep default for stability

    // Set default gravity
    this.engine.world.gravity.y = 1;
    this.engine.world.gravity.x = 0;

    // Create world boundaries only if requested
    if (createBoundaries) {
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
    // Set up collision event handling
    if (this.engine) {
      Events.on(this.engine, 'collisionStart', this.handleCollisionStart);
      Events.on(this.engine, 'collisionEnd', this.handleCollisionEnd);
    }
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
    // Merge options with defaults
    const finalOptions = {
      isStatic: options.isStatic ?? this.defaultBodyProperties.isStatic ?? false,
      restitution: options.restitution ?? this.defaultBodyProperties.restitution ?? 0.3,
      friction: options.friction ?? this.defaultBodyProperties.friction ?? 0.1,
      frictionAir: options.frictionAir ?? this.defaultBodyProperties.frictionAir ?? 0.01,
      density: options.density ?? this.defaultBodyProperties.density ?? 0.001,
      isSensor: options.isSensor ?? this.defaultBodyProperties.isSensor ?? false,
    };

    const body = Bodies.rectangle(x, y, width, height, finalOptions);

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
    // Merge options with defaults
    const finalOptions = {
      isStatic: options.isStatic ?? this.defaultBodyProperties.isStatic ?? false,
      restitution: options.restitution ?? this.defaultBodyProperties.restitution ?? 0.3,
      friction: options.friction ?? this.defaultBodyProperties.friction ?? 0.1,
      frictionAir: options.frictionAir ?? this.defaultBodyProperties.frictionAir ?? 0.01,
      density: options.density ?? this.defaultBodyProperties.density ?? 0.001,
      isSensor: options.isSensor ?? this.defaultBodyProperties.isSensor ?? false,
    };

    const body = Bodies.circle(x, y, radius, finalOptions);

    const id = `body_${this.bodyIdCounter++}`;
    const physicsBody = new MatterPhysicsBody(body, id);

    this.bodies.set(id, physicsBody);
    World.add(this.world, body);

    return physicsBody;
  }
  public createPolygon(
    x: number,
    y: number,
    vertices: Vector2D[],
    options: PhysicsBodyOptions = {}
  ): IPhysicsBody {
    if (!this.world) {
      throw new Error('Physics system not initialized');
    }
    // Convert Vector2D vertices to Matter.js format
    const matterVertices = vertices.map(v => ({ x: v.x, y: v.y }));

    // Merge options with defaults
    const finalOptions = {
      isStatic: options.isStatic ?? this.defaultBodyProperties.isStatic ?? false,
      restitution: options.restitution ?? this.defaultBodyProperties.restitution ?? 0.3,
      friction: options.friction ?? this.defaultBodyProperties.friction ?? 0.1,
      frictionAir: options.frictionAir ?? this.defaultBodyProperties.frictionAir ?? 0.01,
      density: options.density ?? this.defaultBodyProperties.density ?? 0.001,
      isSensor: options.isSensor ?? this.defaultBodyProperties.isSensor ?? false,
    };    const body = Bodies.fromVertices(x, y, [matterVertices], finalOptions);

    const id = `body_${this.bodyIdCounter++}`;
    const physicsBody = new MatterPhysicsBody(body, id);

    this.bodies.set(id, physicsBody);
    World.add(this.world, body);

    return physicsBody;
  }

  public createCompoundBody(
    x: number,
    y: number,
    parts: CompoundBodyPart[],
    options: PhysicsBodyOptions = {}
  ): IPhysicsBody {
    if (!this.world) {
      throw new Error('Physics system not initialized');
    }

    // Create individual body parts
    const bodyParts: Body[] = [];

    for (const part of parts) {
      let body: Body;

      // Merge part-specific options with defaults and global options
      const finalOptions = {
        isStatic: part.options?.isStatic ?? options.isStatic ?? this.defaultBodyProperties.isStatic ?? false,
        restitution: part.options?.restitution ?? options.restitution ?? this.defaultBodyProperties.restitution ?? 0.3,
        friction: part.options?.friction ?? options.friction ?? this.defaultBodyProperties.friction ?? 0.1,
        frictionAir: part.options?.frictionAir ?? options.frictionAir ?? this.defaultBodyProperties.frictionAir ?? 0.01,
        density: part.options?.density ?? options.density ?? this.defaultBodyProperties.density ?? 0.001,
        isSensor: part.options?.isSensor ?? options.isSensor ?? this.defaultBodyProperties.isSensor ?? false,
      };

      switch (part.type) {
        case 'circle':
          if (part.radius === undefined) {
            throw new Error('Circle part must have radius defined');
          }
          body = Bodies.circle(x + part.x, y + part.y, part.radius, finalOptions);
          break;

        case 'rectangle':
          if (part.width === undefined || part.height === undefined) {
            throw new Error('Rectangle part must have width and height defined');
          }
          body = Bodies.rectangle(x + part.x, y + part.y, part.width, part.height, finalOptions);
          break;

        case 'polygon':
          if (!part.vertices || part.vertices.length === 0) {
            throw new Error('Polygon part must have vertices defined');
          }
          const matterVertices = part.vertices.map(v => ({ x: v.x, y: v.y }));
          body = Bodies.fromVertices(x + part.x, y + part.y, [matterVertices], finalOptions);
          break;

        default:
          throw new Error(`Unknown part type: ${(part as any).type}`);
      }

      bodyParts.push(body);
    }

    // Create compound body from parts
    const compoundBody = Body.create({
      parts: bodyParts,
      // Apply final options to compound body
      isStatic: options.isStatic ?? this.defaultBodyProperties.isStatic ?? false,
      restitution: options.restitution ?? this.defaultBodyProperties.restitution ?? 0.3,
      friction: options.friction ?? this.defaultBodyProperties.friction ?? 0.1,
      frictionAir: options.frictionAir ?? this.defaultBodyProperties.frictionAir ?? 0.01,
      density: options.density ?? this.defaultBodyProperties.density ?? 0.001,
      isSensor: options.isSensor ?? this.defaultBodyProperties.isSensor ?? false,
    });

    // Set the position of the compound body
    Body.setPosition(compoundBody, Vector.create(x, y));

    const id = `body_${this.bodyIdCounter++}`;
    const physicsBody = new MatterPhysicsBody(compoundBody, id);

    this.bodies.set(id, physicsBody);
    World.add(this.world, compoundBody);

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
      Body.applyForce(
        matterBody.matterBody,
        matterBody.position,
        Vector.create(force.x, force.y)
      );
    }
  }

  public setPosition(body: IPhysicsBody, position: Vector2D): void {
    const matterBody = this.bodies.get(body.id);
    if (matterBody) {
      Body.setPosition(
        matterBody.matterBody,
        Vector.create(position.x, position.y)
      );
    }
  }

  public setRotation(body: IPhysicsBody, angle: number): void {
    const matterBody = this.bodies.get(body.id);
    if (matterBody) {
      Body.setAngle(matterBody.matterBody, angle);
    }
  }

  public setVelocity(body: IPhysicsBody, velocity: Vector2D): void {
    const matterBody = this.bodies.get(body.id);
    if (matterBody) {
      Body.setVelocity(matterBody.matterBody, Vector.create(velocity.x, velocity.y));
    }
  }

  public setAngularVelocity(body: IPhysicsBody, angularVelocity: number): void {
    const matterBody = this.bodies.get(body.id);
    if (matterBody) {
      Body.setAngularVelocity(matterBody.matterBody, angularVelocity);
    }
  }

  public setGravity(x: number, y: number): void {
    if (this.engine) {
      this.engine.world.gravity.x = x;
      this.engine.world.gravity.y = y;
    }
  }

  public createConstraint(bodyA: IPhysicsBody, bodyB: IPhysicsBody, options: ConstraintOptions = {}): IConstraint {
    if (!this.world) {
      throw new Error('Physics system not initialized');
    }

    const matterBodyA = this.bodies.get(bodyA.id);
    const matterBodyB = this.bodies.get(bodyB.id);

    if (!matterBodyA || !matterBodyB) {
      throw new Error('One or both bodies not found in physics system');
    }    // Create Matter.js constraint
    const constraint = Constraint.create({
      bodyA: matterBodyA.matterBody,
      bodyB: matterBodyB.matterBody,
      stiffness: options.stiffness ?? 1.0,
      damping: options.damping ?? 0.1,
      length: options.length ?? 0,  // 0 means use current distance
      pointA: options.pointA ? { x: options.pointA.x, y: options.pointA.y } : undefined,
      pointB: options.pointB ? { x: options.pointB.x, y: options.pointB.y } : undefined
    });

    const id = `constraint_${this.constraintIdCounter++}`;
    const physicsConstraint = new MatterConstraint(constraint, id);

    this.constraints.set(id, physicsConstraint);
    World.add(this.world, constraint);

    return physicsConstraint;
  }

  public removeConstraint(constraint: IConstraint): void {
    if (!this.world) return;

    const matterConstraint = this.constraints.get(constraint.id);
    if (matterConstraint) {
      World.remove(this.world, matterConstraint.matterConstraint);
      this.constraints.delete(constraint.id);
    }
  }

  public configureWorld(config: any): void {
    if (!this.engine || !this.world) return;

    if (config.gravity) {
      this.engine.world.gravity.x = config.gravity.x;
      this.engine.world.gravity.y = config.gravity.y;
    }
    if (typeof config.gravityScale === 'number') {
      this.engine.world.gravity.scale = config.gravityScale;
    }
    if (typeof config.constraintIterations === 'number') {
      this.engine.constraintIterations = config.constraintIterations;
    }
    if (typeof config.positionIterations === 'number') {
      this.engine.positionIterations = config.positionIterations;
    }
    if (typeof config.velocityIterations === 'number') {
      this.engine.velocityIterations = config.velocityIterations;
    }
    if (typeof config.enableSleeping === 'boolean') {
      this.engine.enableSleeping = config.enableSleeping;
    }
    if (config.timing) {
      if (typeof config.timing.timeScale === 'number') {
        this.engine.timing.timeScale = config.timing.timeScale;
      }
      if (typeof config.timing.timestamp === 'number') {
        this.engine.timing.timestamp = config.timing.timestamp;
      }
    }
  }

  public configureEngine(config: any): void {
    if (!this.engine) return;

    if (typeof config.enableSleeping === 'boolean') {
      this.engine.enableSleeping = config.enableSleeping;
    }
    if (typeof config.positionIterations === 'number') {
      this.engine.positionIterations = config.positionIterations;
    }
    if (typeof config.velocityIterations === 'number') {
      this.engine.velocityIterations = config.velocityIterations;
    }
    if (typeof config.constraintIterations === 'number') {
      this.engine.constraintIterations = config.constraintIterations;
    }
    if (config.timing) {
      if (typeof config.timing.timeScale === 'number') {
        this.engine.timing.timeScale = config.timing.timeScale;
      }
      if (typeof config.timing.timestamp === 'number') {
        this.engine.timing.timestamp = config.timing.timestamp;
      }
    }
  }

  public setDefaultBodyProperties(defaults: any): void {
    // Store defaults for future body creation
    this.defaultBodyProperties = { ...defaults };
  }
  public updateExistingBodies(properties: any): void {
    // Apply properties to all existing bodies
    this.bodies.forEach((physicsBody) => {
      const body = physicsBody.matterBody;

      if (typeof properties.restitution === 'number') {
        body.restitution = properties.restitution;
      }
      if (typeof properties.friction === 'number') {
        body.friction = properties.friction;
      }
      if (typeof properties.frictionStatic === 'number') {
        body.frictionStatic = properties.frictionStatic;
      }
      if (typeof properties.frictionAir === 'number') {
        body.frictionAir = properties.frictionAir;
      }
      if (typeof properties.density === 'number') {
        Body.setDensity(body, properties.density);
      }
      if (typeof properties.mass === 'number') {
        Body.setMass(body, properties.mass);
      }
      if (typeof properties.inertia === 'number') {
        Body.setInertia(body, properties.inertia);
      }
      if (typeof properties.sleepThreshold === 'number') {
        body.sleepThreshold = properties.sleepThreshold;
      }
      if (typeof properties.slop === 'number') {
        body.slop = properties.slop;
      }
    });
  }
  public destroy(): void {
    if (this.engine) {
      Engine.clear(this.engine);
      this.engine = null;
    }
    this.world = null;
    this.bodies.clear();
    this.constraints.clear();
    this.bodyIdCounter = 0;
    this.constraintIdCounter = 0;
  }

  public onCollisionStart(callback: CollisionCallback): void {
    this.collisionStartCallbacks.push(callback);
  }

  public onCollisionEnd(callback: CollisionCallback): void {
    this.collisionEndCallbacks.push(callback);
  }

  private handleCollisionStart = (event: any): void => {
    event.pairs.forEach((pair: any) => {
      const bodyA = this.findPhysicsBodyByMatterBody(pair.bodyA);
      const bodyB = this.findPhysicsBodyByMatterBody(pair.bodyB);

      if (bodyA && bodyB) {
        const collisionEvent: CollisionEvent = {
          bodyA,
          bodyB,
          contactPoint: { x: 0, y: 0 }, // We can improve this later
        };

        this.collisionStartCallbacks.forEach(callback =>
          callback(collisionEvent)
        );
      }
    });
  };

  private handleCollisionEnd = (event: any): void => {
    event.pairs.forEach((pair: any) => {
      const bodyA = this.findPhysicsBodyByMatterBody(pair.bodyA);
      const bodyB = this.findPhysicsBodyByMatterBody(pair.bodyB);

      if (bodyA && bodyB) {
        const collisionEvent: CollisionEvent = {
          bodyA,
          bodyB,
          contactPoint: { x: 0, y: 0 },
        };

        this.collisionEndCallbacks.forEach(callback =>
          callback(collisionEvent)
        );
      }
    });
  };

  private findPhysicsBodyByMatterBody(matterBody: any): IPhysicsBody | null {
    for (const physicsBody of this.bodies.values()) {
      if ((physicsBody as any).matterBody === matterBody) {
        return physicsBody;
      }
    }
    return null;
  }
}
