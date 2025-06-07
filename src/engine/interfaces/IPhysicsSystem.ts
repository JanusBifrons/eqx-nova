export interface Vector2D {
  x: number;
  y: number;
}

export interface PhysicsBodyOptions {
  isStatic?: boolean;
  restitution?: number;
  friction?: number;
  frictionAir?: number;
  density?: number;
  isSensor?: boolean;
}

export interface IPhysicsBody {
  id: string;
  position: Vector2D;
  angle: number;
  velocity: Vector2D;
  angularVelocity: number;
}

export interface CollisionEvent {
  bodyA: IPhysicsBody;
  bodyB: IPhysicsBody;
  contactPoint: Vector2D;
}

export type CollisionCallback = (event: CollisionEvent) => void;

export interface IPhysicsSystem {
  initialize(width: number, height: number, createBoundaries?: boolean): void;
  update(deltaTime: number): void;
  createRectangle(
    x: number,
    y: number,
    width: number,
    height: number,
    options?: PhysicsBodyOptions
  ): IPhysicsBody;
  createCircle(
    x: number,
    y: number,
    radius: number,
    options?: PhysicsBodyOptions
  ): IPhysicsBody;
  createPolygon(
    x: number,
    y: number,
    vertices: Vector2D[],
    options?: PhysicsBodyOptions
  ): IPhysicsBody;
  removeBody(body: IPhysicsBody): void;
  getAllBodies(): IPhysicsBody[];
  applyForce(body: IPhysicsBody, force: Vector2D): void;
  setPosition(body: IPhysicsBody, position: Vector2D): void;
  setRotation(body: IPhysicsBody, angle: number): void;
  setGravity(x: number, y: number): void;
  onCollisionStart(callback: CollisionCallback): void;
  onCollisionEnd(callback: CollisionCallback): void;
  destroy(): void;
}
