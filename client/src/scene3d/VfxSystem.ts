import * as THREE from 'three';
import type { ActionClip, ClipPhase } from '../hooks/useGameAnimations.js';
import type { SceneTexturePack } from './textures.js';
import { createCalloutSpriteTexture } from './textures.js';

interface SmokeParticle {
  sprite: THREE.Sprite;
  active: boolean;
  age: number;
  maxAge: number;
  vx: number;
  vy: number;
  vz: number;
}

export interface VfxAnchors {
  shooter?: THREE.Vector3;
  target?: THREE.Vector3;
  puncher?: THREE.Vector3;
  victim?: THREE.Vector3;
  lootDrop?: THREE.Vector3;
  actor?: THREE.Vector3;
}

export interface VfxSystemRig {
  root: THREE.Group;
  update: (
    dtSec: number,
    timeSec: number,
    smokeOrigin: THREE.Vector3,
    highQuality: boolean,
    activeClip: ActionClip | null,
    clipPhase: ClipPhase | null,
    progress: number,
    anchors: VfxAnchors,
    lang: 'vi' | 'en',
  ) => void;
  dispose: () => void;
}

export function buildVfxSystem(textures: SceneTexturePack): VfxSystemRig {
  const root = new THREE.Group();

  // 1. Pooled Locomotive Steam & Smoke Plumes
  const smokeCount = 16;
  const smokePool: SmokeParticle[] = [];
  for (let i = 0; i < smokeCount; i += 1) {
    const mat = new THREE.SpriteMaterial({
      map: textures.smokePuff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.visible = false;
    root.add(sprite);
    smokePool.push({ sprite, active: false, age: 0, maxAge: 1.4, vx: 0, vy: 0, vz: 0 });
  }
  let smokeSpawnAcc = 0;

  // 2. Revolver Tracer + Spinning Slug
  const bulletGroup = new THREE.Group();
  const slugMesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.08, 0.24, 4, 8),
    new THREE.MeshBasicMaterial({ color: 0xffdf7a }),
  );
  slugMesh.rotation.z = Math.PI / 2;
  bulletGroup.add(slugMesh);
  const tracerLine = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.01, 1.4, 8),
    new THREE.MeshBasicMaterial({ color: 0xff7b29, transparent: true, opacity: 0.78 }),
  );
  tracerLine.rotation.z = Math.PI / 2;
  tracerLine.position.x = -0.65;
  bulletGroup.add(tracerLine);
  bulletGroup.visible = false;
  root.add(bulletGroup);

  // 3. Muzzle Starburst
  const muzzleFlash = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.32, 0),
    new THREE.MeshBasicMaterial({ color: 0xffcf48, transparent: true, opacity: 0.9 }),
  );
  muzzleFlash.visible = false;
  root.add(muzzleFlash);

  // 4. Mega 3D Cartoon Fist for Punch Strike
  const fistGroup = new THREE.Group();
  const fistMat = new THREE.MeshToonMaterial({ color: 0xf4a948, gradientMap: textures.toonRamp });
  const fistHead = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.56, 0.56), fistMat);
  fistHead.position.x = 0.26;
  fistGroup.add(fistHead);
  const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.68, 10), fistMat);
  forearm.rotation.z = Math.PI / 2;
  forearm.position.x = -0.32;
  fistGroup.add(forearm);
  fistGroup.visible = false;
  root.add(fistGroup);

  // 5. Flying Loot Bag Toss on Punch
  const tossLoot = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 10, 8),
    new THREE.MeshToonMaterial({ color: 0xf0be54, gradientMap: textures.toonRamp }),
  );
  tossLoot.visible = false;
  root.add(tossLoot);

  // 6. Expanding Aura Halo Ring (Marshal / Draw / Event)
  const auraRingMat = new THREE.MeshBasicMaterial({
    color: 0xffd24c,
    transparent: true,
    opacity: 0.75,
    side: THREE.DoubleSide,
  });
  const auraRing = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.72, 24), auraRingMat);
  auraRing.rotation.x = -Math.PI / 2;
  auraRing.visible = false;
  root.add(auraRing);

  // 7. Comic Callout Sprites (SHOT!, POW!, +$!, EVENT!)
  const texShotVi = createCalloutSpriteTexture('ĂN ĐẠN!', '#e63b1f');
  const texShotEn = createCalloutSpriteTexture('SHOT!', '#e63b1f');
  const texPowVi = createCalloutSpriteTexture('BỐP!', '#f29f1b');
  const texPowEn = createCalloutSpriteTexture('POW!', '#f29f1b');
  const texCash = createCalloutSpriteTexture('+$!', '#2b9c53');

  const calloutMat = new THREE.SpriteMaterial({
    map: texShotVi,
    transparent: true,
    depthTest: false,
  });
  const calloutSprite = new THREE.Sprite(calloutMat);
  calloutSprite.scale.set(2.1, 1.05, 1);
  calloutSprite.visible = false;
  root.add(calloutSprite);

  return {
    root,
    update(dtSec, timeSec, smokeOrigin, highQuality, activeClip, clipPhase, progress, anchors, lang) {
      // --- Steam Puffs ---
      smokeSpawnAcc += dtSec;
      const spawnInterval = highQuality ? 0.14 : 0.28;
      if (smokeSpawnAcc >= spawnInterval) {
        smokeSpawnAcc = 0;
        const slot = smokePool.find((s) => !s.active);
        if (slot) {
          slot.active = true;
          slot.age = 0;
          slot.maxAge = 1.1 + Math.random() * 0.55;
          slot.vx = 2.4 + Math.random() * 0.9;
          slot.vy = 1.35 + Math.random() * 0.4;
          slot.vz = (Math.random() - 0.5) * 0.45;
          slot.sprite.position.copy(smokeOrigin);
          slot.sprite.scale.setScalar(0.55);
          slot.sprite.visible = true;
        }
      }
      for (const s of smokePool) {
        if (!s.active) continue;
        s.age += dtSec;
        if (s.age >= s.maxAge) {
          s.active = false;
          s.sprite.visible = false;
          continue;
        }
        const k = s.age / s.maxAge;
        s.sprite.position.x += s.vx * dtSec;
        s.sprite.position.y += s.vy * dtSec;
        s.sprite.position.z += s.vz * dtSec;
        const scale = 0.5 + k * 1.45;
        s.sprite.scale.set(scale, scale, 1);
        s.sprite.material.opacity = (1 - k) * 0.62;
      }

      // Reset transient combat FX visibility before evaluating clip
      bulletGroup.visible = false;
      muzzleFlash.visible = false;
      fistGroup.visible = false;
      tossLoot.visible = false;
      auraRing.visible = false;
      calloutSprite.visible = false;

      if (!activeClip || !clipPhase) return;

      if (activeClip.type === 'shoot' && anchors.shooter) {
        const sPos = anchors.shooter;
        const tPos = anchors.target ?? sPos;
        if (clipPhase === 'windup') {
          auraRing.visible = true;
          auraRing.position.set(sPos.x, sPos.y + 0.08, sPos.z);
          auraRingMat.color.setHex(0xffd24c);
          const sc = 0.8 + Math.sin(timeSec * 14) * 0.22;
          auraRing.scale.setScalar(sc);
        } else if (clipPhase === 'travel') {
          const localT = Math.max(0, Math.min(1, (progress - 0.31) / 0.35));
          const dir = tPos.x >= sPos.x ? 1 : -1;
          muzzleFlash.visible = localT < 0.35;
          muzzleFlash.position.set(sPos.x + dir * 0.55, sPos.y + 0.86, sPos.z);
          muzzleFlash.rotation.z = timeSec * 15;

          bulletGroup.visible = true;
          bulletGroup.position.lerpVectors(
            new THREE.Vector3(sPos.x + dir * 0.4, sPos.y + 0.85, sPos.z),
            new THREE.Vector3(tPos.x, tPos.y + 0.78, tPos.z),
            localT,
          );
          const angle = Math.atan2(tPos.y - sPos.y, tPos.x - sPos.x);
          bulletGroup.rotation.z = angle;
        } else if (clipPhase === 'impact') {
          calloutSprite.visible = true;
          calloutMat.map = lang === 'vi' ? texShotVi : texShotEn;
          calloutMat.needsUpdate = true;
          calloutSprite.position.set(tPos.x, tPos.y + 1.85, tPos.z + 0.3);
          const pop = 1 + Math.sin(Math.min(1, (progress - 0.66) * 3) * Math.PI) * 0.32;
          calloutSprite.scale.set(2.1 * pop, 1.05 * pop, 1);
        }
      } else if (activeClip.type === 'punch' && anchors.puncher) {
        const pPos = anchors.puncher;
        const vPos = anchors.victim ?? pPos;
        const dir = vPos.x >= pPos.x ? 1 : -1;
        if (clipPhase === 'windup') {
          auraRing.visible = true;
          auraRing.position.set(pPos.x, pPos.y + 0.08, pPos.z);
          auraRingMat.color.setHex(0xff8a24);
          auraRing.scale.setScalar(0.9 + Math.sin(timeSec * 16) * 0.25);
        } else if (clipPhase === 'strike') {
          const localT = Math.max(0, Math.min(1, (progress - 0.31) / 0.37));
          fistGroup.visible = true;
          const start = new THREE.Vector3(pPos.x - dir * 1.1, pPos.y + 0.88, pPos.z + 0.25);
          const end = new THREE.Vector3(vPos.x - dir * 0.25, vPos.y + 0.84, vPos.z + 0.25);
          fistGroup.position.lerpVectors(start, end, localT);
          fistGroup.rotation.y = dir >= 0 ? 0 : Math.PI;
          const sc = 0.85 + localT * 0.55;
          fistGroup.scale.setScalar(sc);
        } else if (clipPhase === 'impact') {
          calloutSprite.visible = true;
          calloutMat.map = lang === 'vi' ? texPowVi : texPowEn;
          calloutMat.needsUpdate = true;
          calloutSprite.position.set(vPos.x, vPos.y + 1.88, vPos.z + 0.35);
          if (activeClip.lootType && anchors.lootDrop) {
            const localT = Math.max(0, Math.min(1, (progress - 0.68) / 0.32));
            tossLoot.visible = true;
            tossLoot.position.lerpVectors(vPos, anchors.lootDrop, localT);
            tossLoot.position.y += 0.7 + Math.sin(localT * Math.PI) * 1.25;
            tossLoot.rotation.x += dtSec * 8;
          }
        }
      } else if (activeClip.type === 'marshal' && anchors.actor) {
        auraRing.visible = true;
        auraRing.position.set(anchors.actor.x, anchors.actor.y + 0.1, anchors.actor.z);
        auraRingMat.color.setHex(0xffcc3d);
        auraRing.scale.setScalar(1.1 + Math.sin(timeSec * 11) * 0.35);
      } else if (activeClip.type === 'rob' && anchors.actor) {
        calloutSprite.visible = true;
        calloutMat.map = texCash;
        calloutMat.needsUpdate = true;
        calloutSprite.position.set(anchors.actor.x, anchors.actor.y + 1.7 + progress * 0.45, anchors.actor.z + 0.2);
        calloutSprite.scale.set(1.35, 0.7, 1);
      } else if (activeClip.type === 'event' && anchors.actor) {
        auraRing.visible = true;
        auraRing.position.set(anchors.actor.x, anchors.actor.y + 0.12, anchors.actor.z);
        auraRingMat.color.setHex(
          activeClip.eventId === 'passengersRebellion' || activeClip.eventId === 'angryMarshal'
            ? 0xff4530
            : 0xf7c948,
        );
        auraRing.scale.setScalar(1.4 + Math.sin(timeSec * 9) * 0.45);
      }
    },
    dispose() {
      texShotVi.dispose();
      texShotEn.dispose();
      texPowVi.dispose();
      texPowEn.dispose();
      texCash.dispose();
      root.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const m of mats) m.dispose();
        }
      });
    },
  };
}
