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

export interface IConstraint {
  id: string;
}

export interface ConstraintOptions {
  stiffness?: number;
  damping?: number;
  length?: number;
  pointA?: Vector2D;  // Anchor point on bodyA (local coordinates)
  pointB?: Vector2D;  // Anchor point on bodyB (local coordinates)
}

export interface CompoundBodyPart {
  type: 'circle' | 'rectangle' | 'polygon';
  x: number;  // Relative to compound body center
  y: number;  // Relative to compound body center
  // For circle
  radius?: number;
  // For rectangle
  width?: number;
  height?: number;
  // For polygon
  vertices?: Vector2D[];
  options?: PhysicsBodyOptions;
}

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
  ): IPhysicsBody;  createPolygon(
    x: number,
    y: number,
    vertices: Vector2D[],
    options?: PhysicsBodyOptions
  ): IPhysicsBody;
  createCompoundBody(
    x: number,
    y: number,
    parts: CompoundBodyPart[],
    options?: PhysicsBodyOptions
  ): IPhysicsBody;
  removeBody(body: IPhysicsBody): void;
  getAllBodies(): IPhysicsBody[];
  applyForce(body: IPhysicsBody, force: Vector2D): void;
  setPosition(body: IPhysicsBody, position: Vector2D): void;
  setRotation(body: IPhysicsBody, angle: number): void;
  setVelocity(body: IPhysicsBody, velocity: Vector2D): void;
  setAngularVelocity(body: IPhysicsBody, angularVelocity: number): void;
  setGravity(x: number, y: number): void;
  createConstraint(bodyA: IPhysicsBody, bodyB: IPhysicsBody, options?: ConstraintOptions): IConstraint;
  removeConstraint(constraint: IConstraint): void;
  onCollisionStart(callback: CollisionCallback): void;
  onCollisionEnd(callback: CollisionCallback): void;
  destroy(): void;
}
