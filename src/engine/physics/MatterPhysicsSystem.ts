import {
  Engine,
  World,
  Bodies,
  Body,
  Vector,
  Events,
  Constraint,
  MouseConstraint,
  Mouse,
} from 'matter-js';
import type {
  IPhysicsSystem,
  IPhysicsBody,
  Vector2D,
  PhysicsBodyOptions,
  CollisionCallback,
  CollisionEvent,
  IConstraint,
  ConstraintOptions,
  IMouseConstraint,
  MouseConstraintOptions,
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

class MatterMouseConstraint implements IMouseConstraint {
  private mouseConstraint: any;

  public id: string;

  constructor(mouseConstraint: any, id: string) {
    this.mouseConstraint = mouseConstraint;
    this.id = id;
  }

  public get isActive(): boolean {
    return this.mouseConstraint.constraint.bodyB !== null;
  }

  public get position(): Vector2D | null {
    if (!this.mouseConstraint.mouse.position) return null;

    return {
      x: this.mouseConstraint.mouse.position.x,
      y: this.mouseConstraint.mouse.position.y,
    };
  }

  public get constrainedBody(): IPhysicsBody | null {
    if (!this.mouseConstraint.constraint.bodyB) return null;
    // We would need to find the corresponding IPhysicsBody from the constraint's bodyB
    // This would require a reverse lookup from Matter body to our wrapper
    return null; // Simplified for now
  }

  public get matterMouseConstraint(): any {
    return this.mouseConstraint;
  }
}

export class MatterPhysicsSystem implements IPhysicsSystem {
  private engine: Engine | null = null;

  private world: World | null = null;

  private bodies: Map<string, MatterPhysicsBody> = new Map();

  private constraints: Map<string, MatterConstraint> = new Map();

  private mouseConstraints: Map<string, MatterMouseConstraint> = new Map();

  private bodyIdCounter = 0;

  private constraintIdCounter = 0;

  private mouseConstraintIdCounter = 0;

  private collisionStartCallbacks: CollisionCallback[] = [];

  private collisionEndCallbacks: CollisionCallback[] = [];

  private defaultBodyProperties: any = {};

  public initialize(
    width: number,
    height: number,
    createBoundaries: boolean = true
  ): void {
    // Create Matter.js engine
    this.engine = Engine.create();
    this.world = this.engine.world; // Configure engine for stable but rigid constraints
    this.engine.constraintIterations = 8; // Moderate increase from default 2
    this.engine.positionIterations = 6; // Keep default for stability
    this.engine.velocityIterations = 4; // Keep default for stability

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
      isStatic:
        options.isStatic ?? this.defaultBodyProperties.isStatic ?? false,
      restitution:
        options.restitution ?? this.defaultBodyProperties.restitution ?? 0.3,
      friction: options.friction ?? this.defaultBodyProperties.friction ?? 0.1,
      frictionAir:
        options.frictionAir ?? this.defaultBodyProperties.frictionAir ?? 0.01,
      density: options.density ?? this.defaultBodyProperties.density ?? 0.001,
      isSensor:
        options.isSensor ?? this.defaultBodyProperties.isSensor ?? false,
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
      isStatic:
        options.isStatic ?? this.defaultBodyProperties.isStatic ?? false,
      restitution:
        options.restitution ?? this.defaultBodyProperties.restitution ?? 0.3,
      friction: options.friction ?? this.defaultBodyProperties.friction ?? 0.1,
      frictionAir:
        options.frictionAir ?? this.defaultBodyProperties.frictionAir ?? 0.01,
      density: options.density ?? this.defaultBodyProperties.density ?? 0.001,
      isSensor:
        options.isSensor ?? this.defaultBodyProperties.isSensor ?? false,
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
      isStatic:
        options.isStatic ?? this.defaultBodyProperties.isStatic ?? false,
      restitution:
        options.restitution ?? this.defaultBodyProperties.restitution ?? 0.3,
      friction: options.friction ?? this.defaultBodyProperties.friction ?? 0.1,
      frictionAir:
        options.frictionAir ?? this.defaultBodyProperties.frictionAir ?? 0.01,
      density: options.density ?? this.defaultBodyProperties.density ?? 0.001,
      isSensor:
        options.isSensor ?? this.defaultBodyProperties.isSensor ?? false,
    };
    const body = Bodies.fromVertices(x, y, [matterVertices], finalOptions);

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
        isStatic:
          part.options?.isStatic ??
          options.isStatic ??
          this.defaultBodyProperties.isStatic ??
          false,
        restitution:
          part.options?.restitution ??
          options.restitution ??
          this.defaultBodyProperties.restitution ??
          0.3,
        friction:
          part.options?.friction ??
          options.friction ??
          this.defaultBodyProperties.friction ??
          0.1,
        frictionAir:
          part.options?.frictionAir ??
          options.frictionAir ??
          this.defaultBodyProperties.frictionAir ??
          0.01,
        density:
          part.options?.density ??
          options.density ??
          this.defaultBodyProperties.density ??
          0.001,
        isSensor:
          part.options?.isSensor ??
          options.isSensor ??
          this.defaultBodyProperties.isSensor ??
          false,
      };

      switch (part.type) {
        case 'circle':
          if (part.radius === undefined) {
            throw new Error('Circle part must have radius defined');
          }
          body = Bodies.circle(
            x + part.x,
            y + part.y,
            part.radius,
            finalOptions
          );
          break;

        case 'rectangle':
          if (part.width === undefined || part.height === undefined) {
            throw new Error(
              'Rectangle part must have width and height defined'
            );
          }
          body = Bodies.rectangle(
            x + part.x,
            y + part.y,
            part.width,
            part.height,
            finalOptions
          );
          break;

        case 'polygon':
          if (!part.vertices || part.vertices.length === 0) {
            throw new Error('Polygon part must have vertices defined');
          }
          const matterVertices = part.vertices.map(v => ({ x: v.x, y: v.y }));
          body = Bodies.fromVertices(
            x + part.x,
            y + part.y,
            [matterVertices],
            finalOptions
          );
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
      isStatic:
        options.isStatic ?? this.defaultBodyProperties.isStatic ?? false,
      restitution:
        options.restitution ?? this.defaultBodyProperties.restitution ?? 0.3,
      friction: options.friction ?? this.defaultBodyProperties.friction ?? 0.1,
      frictionAir:
        options.frictionAir ?? this.defaultBodyProperties.frictionAir ?? 0.01,
      density: options.density ?? this.defaultBodyProperties.density ?? 0.001,
      isSensor:
        options.isSensor ?? this.defaultBodyProperties.isSensor ?? false,
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
      Body.setVelocity(
        matterBody.matterBody,
        Vector.create(velocity.x, velocity.y)
      );
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

  public createConstraint(
    bodyA: IPhysicsBody,
    bodyB: IPhysicsBody,
    options: ConstraintOptions = {}
  ): IConstraint {
    if (!this.world) {
      throw new Error('Physics system not initialized');
    }
    const matterBodyA = this.bodies.get(bodyA.id);
    const matterBodyB = this.bodies.get(bodyB.id);

    if (!matterBodyA || !matterBodyB) {
      throw new Error('One or both bodies not found in physics system');
    } // Create Matter.js constraint
    const constraint = Constraint.create({
      bodyA: matterBodyA.matterBody,
      bodyB: matterBodyB.matterBody,
      stiffness: options.stiffness ?? 1.0,
      damping: options.damping ?? 0.1,
      length: options.length ?? 0, // 0 means use current distance
      pointA: options.pointA
        ? { x: options.pointA.x, y: options.pointA.y }
        : undefined,
      pointB: options.pointB
        ? { x: options.pointB.x, y: options.pointB.y }
        : undefined,
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

  public createMouseConstraint(
    options: MouseConstraintOptions = {},
    element?: HTMLElement
  ): IMouseConstraint {
    if (!this.world || !this.engine) {
      throw new Error('Physics system not initialized');
    }
    // Create mouse constraint with automatic detection
    const mouseConstraintOptions: any = {
      constraint: {
        stiffness: options.stiffness ?? 1.0,
        damping: options.damping ?? 0.3,
        render: {
          visible: true, // Enable for debugging
          lineWidth: 3,
          strokeStyle: '#ff0000',
        },
      },
      // Explicitly allow interaction with all bodies
      collisionFilter: {
        mask: 0xffffffff, // Allow interaction with all collision groups
      },
    };

    // Add element if provided
    if (element) {
      mouseConstraintOptions.element = element;
    }
    const mouseConstraint = MouseConstraint.create(
      this.engine,
      mouseConstraintOptions
    );

    // Add event listeners to the mouse constraint for debugging
    Events.on(mouseConstraint, 'mousedown', (event: any) => {
      const screenPos = event.mouse.position;
      console.log(
        '🖱️ NATIVE MOUSE DOWN detected by Matter.js! Screen pos:',
        screenPos
      );

      // Debug: Check what bodies are at this position
      const bodies = this.engine?.world.bodies || [];
      let bodiesFound = 0;

      // Show some body positions for reference
      console.log('📍 Sample body positions (world coordinates):');

      for (let i = 0; i < Math.min(3, bodies.length); i++) {
        const body = bodies[i];

        if (!body.isStatic) {
          console.log(
            `   Body ${i}: ${body.label} at (${body.position.x.toFixed(0)}, ${body.position.y.toFixed(0)})`
          );
        }
      }
      for (const body of bodies) {
        if (
          !body.isStatic &&
          screenPos.x >= body.bounds.min.x &&
          screenPos.x <= body.bounds.max.x &&
          screenPos.y >= body.bounds.min.y &&
          screenPos.y <= body.bounds.max.y
        ) {
          bodiesFound++;
          console.log(
            '🎯 Body at mouse position:',
            body.label,
            'bounds:',
            body.bounds
          );
        }
      }
      console.log(
        `🔍 Checking mouse vs bodies - Mouse at (${screenPos.x.toFixed(0)}, ${screenPos.y.toFixed(0)}) - Found: ${bodiesFound}/${bodies.length}`
      );
    });

    Events.on(mouseConstraint, 'mouseup', (event: any) => {
      console.log(
        '🖱️ NATIVE MOUSE UP detected by Matter.js!',
        event.mouse.position
      );
    });

    Events.on(mouseConstraint, 'startdrag', (event: any) => {
      console.log(
        '🔗 NATIVE DRAG STARTED by Matter.js!',
        event.body ? 'Body found!' : 'No body',
        event.mouse.position
      );
    });

    Events.on(mouseConstraint, 'enddrag', (event: any) => {
      console.log('🔗 NATIVE DRAG ENDED by Matter.js!', event.mouse.position);
    });

    const id = `mouseConstraint_${this.mouseConstraintIdCounter++}`;
    const physicsMouseConstraint = new MatterMouseConstraint(
      mouseConstraint,
      id
    );

    this.mouseConstraints.set(id, physicsMouseConstraint);
    World.add(this.world, mouseConstraint);

    console.log(
      '🔧 Created mouse constraint:',
      id,
      'with element:',
      !!element,
      'stiffness:',
      mouseConstraint.constraint.stiffness
    );

    return physicsMouseConstraint;
  }

  public setMouseConstraintTransform(
    mouseConstraint: IMouseConstraint,
    cameraPosition: Vector2D,
    cameraZoom: number,
    viewportSize: Vector2D
  ): void {
    const matterMouseConstraint = this.mouseConstraints.get(mouseConstraint.id);

    if (matterMouseConstraint) {
      const mouse = matterMouseConstraint.matterMouseConstraint.mouse;

      // Calculate offset: camera position minus half viewport (to center the camera)
      const offset = {
        x: cameraPosition.x - viewportSize.x / 2,
        y: cameraPosition.y - viewportSize.y / 2,
      };

      // Scale factor is 1/zoom (if zoom is 2, mouse moves should be halved)
      const scale = {
        x: 1 / cameraZoom,
        y: 1 / cameraZoom,
      };

      // Apply transformations to the mouse
      Mouse.setOffset(mouse, offset);
      Mouse.setScale(mouse, scale);

      console.log(`🔧 Updated mouse constraint transform:`, {
        offset,
        scale,
        camera: cameraPosition,
        zoom: cameraZoom,
        viewport: viewportSize,
      });
    }
  }

  public updateMouseConstraint(
    mouseConstraint: IMouseConstraint,
    worldPosition: Vector2D
  ): void {
    const matterMouseConstraint = this.mouseConstraints.get(mouseConstraint.id);

    if (matterMouseConstraint) {
      const mouse = matterMouseConstraint.matterMouseConstraint.mouse;
      mouse.position.x = worldPosition.x;
      mouse.position.y = worldPosition.y;
    }
  }

  public getBodyAtPosition(worldPosition: Vector2D): IPhysicsBody | null {
    if (!this.engine) return null;

    // Use Matter.js Query to find bodies at the mouse position
    const bodies = this.engine.world.bodies;

    for (const body of bodies) {
      // Skip static bodies (boundaries)
      if (body.isStatic) continue;

      // Check if point is inside body bounds first (quick check)
      if (
        worldPosition.x >= body.bounds.min.x &&
        worldPosition.x <= body.bounds.max.x &&
        worldPosition.y >= body.bounds.min.y &&
        worldPosition.y <= body.bounds.max.y
      ) {
        // Find our wrapper for this Matter body
        const physicsBody = this.findPhysicsBodyByMatterBody(body);

        if (physicsBody) {
          console.log(
            '🎯 Found body under mouse:',
            physicsBody.id,
            'at',
            worldPosition
          );

          return physicsBody;
        }
      }
    }

return null;
  }

  public attachMouseConstraintToBody(
    mouseConstraint: IMouseConstraint,
    body: IPhysicsBody,
    worldPosition: Vector2D
  ): void {
    const matterMouseConstraint = this.mouseConstraints.get(mouseConstraint.id);
    const matterBody = this.bodies.get(body.id);

    if (matterMouseConstraint && matterBody) {
      const constraint = matterMouseConstraint.matterMouseConstraint.constraint;

      // Attach the constraint to the body
      constraint.bodyB = matterBody.matterBody;
      constraint.pointB = { x: 0, y: 0 }; // Attach to center of body

      // Update mouse position
      const mouse = matterMouseConstraint.matterMouseConstraint.mouse;
      mouse.position.x = worldPosition.x;
      mouse.position.y = worldPosition.y;

      console.log('🔗 Attached mouse constraint to body:', body.id);
    }
  }

  public detachMouseConstraint(mouseConstraint: IMouseConstraint): void {
    const matterMouseConstraint = this.mouseConstraints.get(mouseConstraint.id);

    if (matterMouseConstraint) {
      const constraint = matterMouseConstraint.matterMouseConstraint.constraint;
      constraint.bodyB = null;
      constraint.pointB = { x: 0, y: 0 };

      console.log('🔓 Detached mouse constraint');
    }
  }

  public removeMouseConstraint(mouseConstraint: IMouseConstraint): void {
    if (!this.world) return;

    const matterMouseConstraint = this.mouseConstraints.get(mouseConstraint.id);

    if (matterMouseConstraint) {
      World.remove(this.world, matterMouseConstraint.matterMouseConstraint);
      this.mouseConstraints.delete(mouseConstraint.id);
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
    this.bodies.forEach(physicsBody => {
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
    console.log(`🌟 Physics collision detected: ${event.pairs.length} pairs`);

    event.pairs.forEach((pair: any) => {
      console.log(
        `🌟 Pair: ${pair.bodyA.id || 'no-id'} vs ${pair.bodyB.id || 'no-id'}`
      );

      const bodyA = this.findPhysicsBodyByMatterBody(pair.bodyA);
      const bodyB = this.findPhysicsBodyByMatterBody(pair.bodyB);

      if (bodyA && bodyB) {
        console.log(`🌟 Found physics bodies: ${bodyA.id} vs ${bodyB.id}`);
        const collisionEvent: CollisionEvent = {
          bodyA,
          bodyB,
          contactPoint: { x: 0, y: 0 }, // We can improve this later
        };

        this.collisionStartCallbacks.forEach(callback =>
          callback(collisionEvent)
        );
      } else {
        console.log(`🌟 Missing physics bodies: A=${!!bodyA} B=${!!bodyB}`);
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
    // First, try direct match (for simple bodies)
    for (const physicsBody of this.bodies.values()) {
      if ((physicsBody as any).matterBody === matterBody) {
        return physicsBody;
      }
    }
    // If no direct match, check if this is a part of a compound body
    for (const physicsBody of this.bodies.values()) {
      const compoundBody = (physicsBody as any).matterBody;

      // Check if the matter body is one of the parts of this compound body
      if (compoundBody.parts && compoundBody.parts.includes(matterBody)) {
        return physicsBody; // Return the compound body for the part collision
      }
    }
return null;
  }
}
