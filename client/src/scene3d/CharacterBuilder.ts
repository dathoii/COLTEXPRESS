import * as THREE from 'three';
import type { CharacterPose, SpriteId } from '../components/art/CharacterSprite.js';
import { CHARACTER_3D_THEME } from './constants.js';
import type { SceneTexturePack } from './textures.js';

export interface CharacterRig3D {
  id: string;
  character: SpriteId;
  root: THREE.Group;
  bodyPivot: THREE.Group;
  headGroup: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  weaponMesh?: THREE.Mesh;
  ringMesh: THREE.Mesh;
  ringMat: THREE.MeshBasicMaterial;
  targetAuraMesh: THREE.Mesh;
  targetAuraMat: THREE.MeshBasicMaterial;
  targetReticle: THREE.Sprite;
  targetReticleTex: THREE.CanvasTexture;
  hitbox: THREE.Mesh;
  alertSprite?: THREE.Sprite;
  nameSprite: THREE.Sprite;
  nameTex: THREE.CanvasTexture;
  alertTex?: THREE.CanvasTexture;
  torsoMat: THREE.MeshToonMaterial;
  setBadgeLabel: (name: string, isSelf: boolean, isBot?: boolean) => void;
  dispose: () => void;
}

function makeTargetReticleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 96, 96);
    ctx.strokeStyle = '#ff4b38';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(48, 48, 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#fff5b8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(48, 48, 26, 0, Math.PI * 2);
    ctx.stroke();
    const bars: [number, number, number, number][] = [
      [48, 6, 48, 22],
      [48, 74, 48, 90],
      [6, 48, 22, 48],
      [74, 48, 90, 48],
    ];
    for (const [x1, y1, x2, y2] of bars) {
      ctx.strokeStyle = '#ff4b38';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffe26a';
    ctx.beginPath();
    ctx.arc(48, 48, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function makeNameBadgeTexture(label: string, isSelf: boolean, isBot: boolean, isMarshal: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 256, 64);
    const bg = isMarshal ? '#94281b' : isSelf ? '#1b6d3c' : '#23160d';
    const border = isMarshal ? '#ffd24c' : isSelf ? '#68f29e' : '#d3a558';
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(12, 10, 232, 44, 16);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = border;
    ctx.stroke();

    ctx.fillStyle = '#fff5d9';
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const display = (isBot ? `🤖 ${label}` : label).slice(0, 14);
    ctx.fillText(display, 128, 33);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function makeAlertTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#e02819';
    ctx.beginPath();
    ctx.arc(64, 64, 52, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#ffe588';
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 78px Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', 64, 68);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createCharacterRig3D(
  id: string,
  character: SpriteId,
  displayName: string,
  isSelf: boolean,
  isBot: boolean,
  textures: SceneTexturePack,
): CharacterRig3D {
  const theme = CHARACTER_3D_THEME[character];
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  bodyPivot.scale.set(1.04, 1.12, 1.04);
  root.add(bodyPivot);

  const toon = (color: number, emissive?: number) =>
    new THREE.MeshToonMaterial({
      color,
      gradientMap: textures.toonRamp,
      emissive: emissive ?? 0x1a140f,
      emissiveIntensity: emissive ? 0.35 : 0.08,
    });

  const suitMat = toon(theme.suit);
  const torsoMat = toon(theme.coat, theme.emissive);
  const accentMat = toon(theme.accent);
  const hatMat = toon(theme.hat);
  const skinMat = toon(theme.skin);
  const darkLeather = toon(0x2b190d);

  // Legs (hinged at hip y=0.42)
  const legL = new THREE.Group();
  legL.position.set(-0.11, 0.44, 0);
  const legMeshL = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.24, 4, 8), suitMat);
  legMeshL.position.y = -0.2;
  legL.add(legMeshL);
  const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.22), darkLeather);
  bootL.position.set(0, -0.38, 0.03);
  legL.add(bootL);
  bodyPivot.add(legL);

  const legR = new THREE.Group();
  legR.position.set(0.11, 0.44, 0);
  const legMeshR = legMeshL.clone();
  legR.add(legMeshR);
  const bootR = bootL.clone();
  legR.add(bootR);
  bodyPivot.add(legR);

  // Torso / Coat / Belle skirt / Tuco poncho silhouette
  const torso = new THREE.Mesh(
    character === 'belle'
      ? new THREE.CylinderGeometry(0.16, 0.34, 0.56, 12)
      : character === 'tuco'
        ? new THREE.ConeGeometry(0.32, 0.58, 12)
        : new THREE.CapsuleGeometry(0.21, 0.26, 6, 12),
    torsoMat,
  );
  torso.position.y = 0.68;
  bodyPivot.add(torso);

  // Character signature accessory
  if (character === 'marshal') {
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), accentMat);
    star.scale.z = 0.3;
    star.position.set(0.1, 0.8, 0.21);
    bodyPivot.add(star);
  } else if (character === 'django' || character === 'cheyenne' || character === 'belle') {
    const sash = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.045, 6, 14), accentMat);
    sash.rotation.x = Math.PI / 2;
    sash.position.y = 0.56;
    bodyPivot.add(sash);
  } else if (character === 'ghost') {
    // Spectral cape trailing behind
    const cape = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.65, 10, 1, true), torsoMat);
    cape.position.set(0, 0.64, -0.14);
    cape.rotation.x = 0.22;
    bodyPivot.add(cape);
  }

  // Head & signature 1899 Western Hat
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.07, 0);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 12), skinMat);
  headGroup.add(head);

  if (character === 'doc') {
    // Bowler derby
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.035, 16), hatMat);
    brim.position.y = 0.14;
    headGroup.add(brim);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), hatMat);
    dome.position.y = 0.17;
    headGroup.add(dome);
  } else if (character === 'cheyenne') {
    // Feather headband
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 14), accentMat);
    band.position.y = 0.1;
    headGroup.add(band);
    const feather = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.26, 0.08), toon(0xe64538));
    feather.position.set(-0.16, 0.22, -0.05);
    feather.rotation.z = 0.35;
    headGroup.add(feather);
  } else {
    // Classic wide Stetson / Cowboy / Sombrero / Sunhat
    const brimW = character === 'django' || character === 'tuco' ? 0.38 : 0.33;
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(brimW, brimW, 0.035, 18), hatMat);
    brim.position.y = 0.13;
    headGroup.add(brim);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.19, 0.22, 14), hatMat);
    crown.position.y = 0.24;
    headGroup.add(crown);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.195, 0.195, 0.04, 14), accentMat);
    band.position.y = 0.16;
    headGroup.add(band);
  }

  if (character === 'ghost') {
    // Long white beard
    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.24, 8), hatMat);
    beard.rotation.x = Math.PI;
    beard.position.set(0, -0.1, 0.15);
    headGroup.add(beard);
  }
  bodyPivot.add(headGroup);

  // Arms (hinged at shoulders)
  const armL = new THREE.Group();
  armL.position.set(-0.26, 0.86, 0);
  const armMeshL = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.24, 4, 8), torsoMat);
  armMeshL.position.y = -0.14;
  armL.add(armMeshL);
  bodyPivot.add(armL);

  const armR = new THREE.Group();
  armR.position.set(0.26, 0.86, 0);
  const armMeshR = armMeshL.clone();
  armR.add(armMeshR);

  // Revolver / Shotgun prop attached to right hand
  const gunSteel = new THREE.MeshStandardMaterial({ color: 0x2e343e, metalness: 0.8, roughness: 0.3 });
  const weaponMesh = new THREE.Mesh(
    character === 'marshal'
      ? new THREE.BoxGeometry(0.07, 0.09, 0.56)
      : new THREE.BoxGeometry(0.06, 0.08, 0.34),
    gunSteel,
  );
  weaponMesh.position.set(0, -0.26, 0.16);
  armR.add(weaponMesh);
  bodyPivot.add(armR);

  // Foot ring & raycast hitbox
  const ringMat = new THREE.MeshBasicMaterial({
    color: isSelf ? 0x3ef08a : 0xffc74d,
    transparent: true,
    opacity: isSelf ? 0.72 : 0,
    side: THREE.DoubleSide,
  });
  const ringMesh = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.48, 22), ringMat);
  ringMesh.rotation.x = -Math.PI / 2;
  ringMesh.position.y = 0.03;
  root.add(ringMesh);

  const targetAuraMat = new THREE.MeshBasicMaterial({
    color: 0xff3d2e,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const targetAuraMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.54, 1.65, 16, 1, true), targetAuraMat);
  targetAuraMesh.position.y = 0.84;
  targetAuraMesh.visible = false;
  root.add(targetAuraMesh);

  const targetReticleTex = makeTargetReticleTexture();
  const targetReticle = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: targetReticleTex, transparent: true, depthTest: false }),
  );
  targetReticle.scale.set(0.68, 0.68, 1);
  targetReticle.position.set(0, 2.02, 0);
  targetReticle.visible = false;
  root.add(targetReticle);

  const hitbox = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.45, 1.5, 10),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hitbox.position.y = 0.72;
  hitbox.userData = { targetKind: 'player', playerId: id };
  root.add(hitbox);

  // Floating nameplate sprite
  let badgeState = `${displayName}|${isSelf}|${isBot}`;
  let nameTex = makeNameBadgeTexture(displayName, isSelf, isBot, character === 'marshal');
  const nameMat = new THREE.SpriteMaterial({ map: nameTex, transparent: true, depthTest: false });
  const nameSprite = new THREE.Sprite(nameMat);
  nameSprite.scale.set(1.22, 0.3, 1);
  nameSprite.position.set(0, 1.62, 0);
  root.add(nameSprite);

  // Marshal '!' Alert halo badge
  let alertSprite: THREE.Sprite | undefined;
  let alertTex: THREE.CanvasTexture | undefined;
  if (character === 'marshal') {
    alertTex = makeAlertTexture();
    const aMat = new THREE.SpriteMaterial({ map: alertTex, transparent: true, depthTest: false });
    alertSprite = new THREE.Sprite(aMat);
    alertSprite.scale.set(0.42, 0.42, 1);
    alertSprite.position.set(0, 2.02, 0);
    alertSprite.visible = false;
    root.add(alertSprite);
  }

  return {
    id,
    character,
    root,
    bodyPivot,
    headGroup,
    armL,
    armR,
    legL,
    legR,
    weaponMesh,
    ringMesh,
    ringMat,
    targetAuraMesh,
    targetAuraMat,
    targetReticle,
    targetReticleTex,
    hitbox,
    alertSprite,
    nameSprite,
    nameTex,
    alertTex,
    torsoMat,
    setBadgeLabel(name: string, nextSelf: boolean, nextBot = false) {
      const nextSig = `${name}|${nextSelf}|${nextBot}`;
      if (nextSig === badgeState) return;
      badgeState = nextSig;
      const oldTex = nameTex;
      nameTex = makeNameBadgeTexture(name, nextSelf, nextBot, character === 'marshal');
      nameSprite.material.map = nameTex;
      nameSprite.material.needsUpdate = true;
      oldTex.dispose();
    },
    dispose() {
      nameTex.dispose();
      alertTex?.dispose();
      targetReticleTex.dispose();
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

export function applyRigPoseAnimation(
  rig: CharacterRig3D,
  pose: CharacterPose,
  timeSec: number,
  clipProgress: number,
  facingDir: 1 | -1,
  marshalAlert = false,
): void {
  // Orient character facing (+/- X) with slight 3/4 view toward camera (+Z)
  rig.bodyPivot.rotation.y = facingDir >= 0 ? Math.PI * 0.36 : -Math.PI * 0.36;
  rig.bodyPivot.position.set(0, 0, 0);
  rig.bodyPivot.rotation.z = 0;
  rig.armL.position.set(-0.26, 0.86, 0);
  rig.armR.position.set(0.26, 0.86, 0);
  rig.armL.rotation.set(0, 0, 0);
  rig.armR.rotation.set(0, 0, 0);
  rig.legL.rotation.set(0, 0, 0);
  rig.legR.rotation.set(0, 0, 0);
  rig.torsoMat.emissive.setHex(rig.character === 'ghost' ? 0x26374d : 0x000000);
  rig.torsoMat.emissiveIntensity = rig.character === 'ghost' ? 0.42 : 0;

  if (rig.weaponMesh) {
    rig.weaponMesh.visible = pose === 'shoot' || rig.character === 'marshal';
  }

  if (rig.alertSprite) {
    rig.alertSprite.visible = marshalAlert;
    if (marshalAlert) {
      const pulse = 0.42 + Math.sin(timeSec * 12) * 0.08;
      rig.alertSprite.scale.set(pulse, pulse, 1);
    }
  }

  switch (pose) {
    case 'move': {
      const s = Math.sin(timeSec * 18);
      rig.legL.rotation.x = s * 0.72;
      rig.legR.rotation.x = -s * 0.72;
      rig.armL.rotation.x = -s * 0.6;
      rig.armR.rotation.x = s * 0.6;
      rig.bodyPivot.position.y = Math.abs(Math.cos(timeSec * 18)) * 0.12;
      break;
    }
    case 'climb': {
      const s = Math.sin(timeSec * 16);
      rig.armL.rotation.x = -1.65 + s * 0.6;
      rig.armR.rotation.x = -1.65 - s * 0.6;
      rig.legL.rotation.x = s * 0.55;
      rig.legR.rotation.x = -s * 0.55;
      break;
    }
    case 'shoot': {
      // Action jump into draw + aim forward
      const jump = clipProgress < 0.65 ? Math.sin((clipProgress / 0.65) * Math.PI) * 0.42 : 0;
      const recoil = clipProgress > 0.35 && clipProgress < 0.6 ? -0.35 : 0;
      rig.bodyPivot.position.y = jump;
      rig.armR.rotation.x = -Math.PI * 0.52 + recoil;
      rig.armL.rotation.z = -0.4;
      break;
    }
    case 'punch': {
      const thrust = clipProgress < 0.35 ? -0.9 : Math.sin(Math.min(1, (clipProgress - 0.35) * 3) * Math.PI) * 1.45;
      rig.armR.rotation.x = -Math.PI * 0.48;
      rig.armR.position.z = Math.max(-0.05, thrust * 0.22);
      rig.bodyPivot.rotation.z = -facingDir * 0.18;
      break;
    }
    case 'hit': {
      const flinch = Math.sin(timeSec * 24) * 0.12;
      rig.bodyPivot.rotation.z = facingDir * 0.36 + flinch;
      rig.armL.rotation.z = -0.8;
      rig.armR.rotation.z = 0.8;
      rig.torsoMat.emissive.setHex(0xd91b14);
      rig.torsoMat.emissiveIntensity = 0.65;
      break;
    }
    case 'rob': {
      rig.bodyPivot.position.y = -0.14 + Math.sin(timeSec * 14) * 0.06;
      rig.armL.rotation.x = -0.9;
      rig.armR.rotation.x = -0.9;
      break;
    }
    case 'idle':
    default: {
      const sway = Math.sin(timeSec * 2.6 + rig.id.length) * 0.04;
      rig.bodyPivot.position.y = Math.max(0, sway);
      rig.armL.rotation.z = -0.08;
      rig.armR.rotation.z = 0.08;
      break;
    }
  }
}
