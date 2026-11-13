import * as THREE from 'three';
import { CAR_PITCH } from './constants.js';

export interface CameraTargetState {
  focusX: number;
  focusY: number;
  focusZ: number;
  distance: number;
  yawOffset: number;
  pitchY: number;
  shake: number;
}

export class CameraRig {
  public readonly camera: THREE.PerspectiveCamera;
  private userPanX = 0;
  private userZoom = 1.0;

  private curPos = new THREE.Vector3(0, 6.2, 24);
  private curLook = new THREE.Vector3(0, 2.0, 0);
  private targetPos = new THREE.Vector3();
  private targetLook = new THREE.Vector3();

  constructor(aspect = 16 / 9) {
    this.camera = new THREE.PerspectiveCamera(38, Math.max(0.4, aspect), 0.5, 160);
    this.camera.position.copy(this.curPos);
    this.camera.lookAt(this.curLook);
  }

  public setAspect(width: number, height: number): void {
    const aspect = Math.max(0.4, width / Math.max(1, height));
    this.camera.aspect = aspect;
    // Slightly widen FOV on narrow phones/vertical windows so entire train remains legible
    this.camera.fov = aspect < 1.25 ? 46 : 36;
    this.camera.updateProjectionMatrix();
  }

  public panBy(dxPixels: number, totalCars: number): void {
    const maxPan = Math.max(4, (totalCars * CAR_PITCH) * 0.44);
    this.userPanX = Math.max(-maxPan, Math.min(maxPan, this.userPanX - dxPixels * 0.032));
  }

  public zoomBy(delta: number): void {
    this.userZoom = Math.max(0.68, Math.min(1.65, this.userZoom + delta));
  }

  public resetView(): void {
    this.userPanX = 0;
    this.userZoom = 1.0;
  }

  public update(
    dtSec: number,
    timeSec: number,
    totalCars: number,
    focus: { x: number; y: number } | null,
    isZoomedAction: boolean,
    shakeStrength: number,
    cameraEffectsEnabled: boolean,
  ): void {
    const totalSpan = Math.max(16, totalCars * CAR_PITCH + 2.8);
    const halfFovRad = THREE.MathUtils.degToRad(this.camera.fov * 0.5);
    const horizFactor = Math.max(0.42, Math.tan(halfFovRad) * this.camera.aspect);
    const wideDist = Math.max(22, (totalSpan * 0.52) / horizFactor) / this.userZoom;

    if (cameraEffectsEnabled && isZoomedAction && focus) {
      const zoomDist = Math.max(9.5, wideDist * 0.45);
      const yaw = (focus.x < 0 ? 1 : -1) * 2.8;
      this.targetPos.set(focus.x + yaw, focus.y + 2.4, zoomDist);
      this.targetLook.set(focus.x, focus.y + 0.5, 0.2);
    } else {
      this.targetPos.set(this.userPanX, 4.6, wideDist);
      this.targetLook.set(this.userPanX * 0.85, 1.65, 0);
    }

    const alpha = 1 - Math.exp(-Math.min(12, dtSec * 6.5));
    this.curPos.lerp(this.targetPos, alpha);
    this.curLook.lerp(this.targetLook, alpha);

    let sx = 0;
    let sy = 0;
    if (cameraEffectsEnabled && shakeStrength > 0.01) {
      sx = Math.sin(timeSec * 52) * shakeStrength * 0.22;
      sy = Math.cos(timeSec * 67) * shakeStrength * 0.16;
    }

    this.camera.position.set(this.curPos.x + sx, this.curPos.y + sy, this.curPos.z);
    this.camera.lookAt(this.curLook.x + sx * 0.4, this.curLook.y + sy * 0.4, this.curLook.z);
  }
}
