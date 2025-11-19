export class Vector4 {
  constructor(x = 0, y = 0, z = 0, w = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }

  clone() {
    return new Vector4(this.x, this.y, this.z, this.w);
  }

  // Matrix multiplication for 4D rotations would go here,
  // but for simplicity we can implement specific plane rotations.

  // Rotate around the XY plane (Z and W change) - Wait, XY rotation usually means rotating IN the XY plane, so X and Y change?
  // In 3D, rotating around Z axis means X and Y change.
  // In 4D, we rotate around a plane.
  // Rotation in ZW plane: Z and W change, X and Y stay same.
  // Rotation in XY plane: X and Y change, Z and W stay same.
  // Let's implement all 6 planar rotations.

  // 1. XY Plane Rotation (X and Y change)
  rotateXY(angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const x = this.x * cos - this.y * sin;
    const y = this.x * sin + this.y * cos;
    this.x = x;
    this.y = y;
    return this;
  }

  // 2. XZ Plane Rotation (X and Z change)
  rotateXZ(angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const x = this.x * cos - this.z * sin;
    const z = this.x * sin + this.z * cos;
    this.x = x;
    this.z = z;
    return this;
  }

  // 3. XW Plane Rotation (X and W change)
  rotateXW(angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const x = this.x * cos - this.w * sin;
    const w = this.x * sin + this.w * cos;
    this.x = x;
    this.w = w;
    return this;
  }

  // 4. YZ Plane Rotation (Y and Z change)
  rotateYZ(angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const y = this.y * cos - this.z * sin;
    const z = this.y * sin + this.z * cos;
    this.y = y;
    this.z = z;
    return this;
  }

  // 5. YW Plane Rotation (Y and W change)
  rotateYW(angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const y = this.y * cos - this.w * sin;
    const w = this.y * sin + this.w * cos;
    this.y = y;
    this.w = w;
    return this;
  }

  // 6. ZW Plane Rotation (Z and W change)
  rotateZW(angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const z = this.z * cos - this.w * sin;
    const w = this.z * sin + this.w * cos;
    this.z = z;
    this.w = w;
    return this;
  }

  // Projection from 4D to 3D
  // Using stereographic projection
  projectTo3D(cameraDistance = 2) {
    // w is the 4th dimension.
    // If we project from a point on the w-axis (e.g., w = cameraDistance)
    // to the 3D hyperplane w = 0.
    
    // Formula: x' = x / (1 - w/cameraDistance)
    // This assumes the camera is at (0,0,0,cameraDistance) looking at w=0.
    
    const wFactor = 1 / (cameraDistance - this.w);
    
    // Avoid division by zero or extreme values
    if (Math.abs(cameraDistance - this.w) < 0.001) {
        return { x: this.x, y: this.y, z: this.z }; // Fallback
    }

    return {
      x: this.x * wFactor,
      y: this.y * wFactor,
      z: this.z * wFactor
    };
  }
}
