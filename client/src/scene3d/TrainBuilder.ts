import * as THREE from 'three';
import type { LootType, Position, TrainCarView } from '@colt/shared';
import { CAR_BODY_COLORS, CAR_GAP, CAR_LENGTH, CAR_PITCH, CAR_WIDTH, INSIDE_FLOOR_Y, LOCO_CAB_OFFSET_X, LOOT_3D_STYLE, ROOF_FLOOR_Y, carCenterX, carInteriorCenterX } from './constants.js';
import type { SceneTexturePack } from './textures.js';

export interface ZoneVisual {
  car: number;
  floor: 'inside' | 'roof';
  hitbox: THREE.Mesh;
  glowMat: THREE.MeshBasicMaterial;
  glowMesh: THREE.Mesh;
  fillBoxMat: THREE.MeshBasicMaterial;
  fillBoxMesh: THREE.Mesh;
  frameMat: THREE.LineBasicMaterial;
  frameLines: THREE.LineSegments;
  centerLocalY: number;
  zoneWidth: number;
  zoneHeight: number;
}

export interface LootVisual {
  id: string;
  car: number;
  floor: 'inside' | 'roof';
  type: LootType;
  group: THREE.Group;
  hitbox: THREE.Mesh;
  ringMesh: THREE.Mesh;
  ringMat: THREE.MeshBasicMaterial;
  beamMat: THREE.MeshBasicMaterial;
  countTex?: THREE.CanvasTexture;
}

export interface CarRig {
  carIndex: number;
  group: THREE.Group;
  wheels: THREE.Object3D[];
  pistonRods: THREE.Object3D[];
  lanternLights: THREE.PointLight[];
  lanternBulbs: THREE.MeshStandardMaterial[];
  headlight?: THREE.SpotLight;
  headlightCone?: THREE.Mesh;
  headlightConeMat?: THREE.MeshBasicMaterial;
  smokestackAnchor?: THREE.Object3D;
  carLabelTex?: THREE.CanvasTexture;
}

export interface TrainAssembly {
  root: THREE.Group;
  cars: CarRig[];
  zones: Map<string, ZoneVisual>;
  loots: LootVisual[];
  smokestackWorldPos: (target: THREE.Vector3) => THREE.Vector3;
  updateMotion: (timeSec: number, wheelSpeed: number, tunnelFactor: number) => void;
  updateLoots: (
    carsData: TrainCarView[],
    lootHighlightKeys: Set<string>,
    timeSec: number,
  ) => void;
  dispose: () => void;
}

const COMIC_EDGE_MAT = new THREE.LineBasicMaterial({ color: 0x221208 });

function addComicEdges(mesh: THREE.Mesh, thresholdAngle = 28): void {
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, thresholdAngle), COMIC_EDGE_MAT);
  mesh.add(edges);
}

function makeLootCountTexture(count: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 96, 96);
    ctx.font = '900 66px Georgia, Impact, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 11;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#241206';
    ctx.strokeText(String(count), 48, 50);
    const grad = ctx.createLinearGradient(0, 18, 0, 80);
    grad.addColorStop(0, '#fffbf0');
    grad.addColorStop(0.55, '#ffe39a');
    grad.addColorStop(1, '#e89b3c');
    ctx.fillStyle = grad;
    ctx.fillText(String(count), 48, 50);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function makeZoneKey(pos: Position): string {
  return `${pos.car}:${pos.floor}`;
}

function makeCarNumberPlate(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#24140a';
    ctx.fillRect(4, 4, 248, 56);
    ctx.strokeStyle = '#d9a44e';
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, 244, 52);
    ctx.fillStyle = '#fce3a6';
    ctx.font = '800 24px "Segoe UI", Tahoma, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 34);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function buildSpokedWheel(
  radius: number,
  rimMat: THREE.Material,
  hubMat: THREE.Material,
): THREE.Group {
  const g = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.075, 8, 18), rimMat);
  g.add(rim);
  const flange = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.96, radius * 0.96, 0.06, 16),
    rimMat,
  );
  flange.rotation.x = Math.PI / 2;
  flange.position.z = -0.04;
  g.add(flange);

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.28, radius * 0.28, 0.14, 10), hubMat);
  hub.rotation.x = Math.PI / 2;
  g.add(hub);

  for (let i = 0; i < 6; i += 1) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.05, radius * 1.8, 0.05), hubMat);
    spoke.rotation.z = (i * Math.PI) / 6;
    g.add(spoke);
  }
  return g;
}

function addZoneHighlight(
  carGroup: THREE.Group,
  carIndex: number,
  floor: 'inside' | 'roof',
  zones: Map<string, ZoneVisual>,
  hitW = CAR_LENGTH - 0.35,
  centerLocalX = 0,
): void {
  const y = floor === 'roof' ? ROOF_FLOOR_Y + 0.05 : INSIDE_FLOOR_Y + 0.04;
  const zoneHeight = floor === 'roof' ? 1.45 : 1.92;
  const centerLocalY = floor === 'roof' ? ROOF_FLOOR_Y + zoneHeight * 0.5 + 0.04 : INSIDE_FLOOR_Y + zoneHeight * 0.5 + 0.04;

  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xf7c948,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const glowMesh = new THREE.Mesh(new THREE.PlaneGeometry(hitW, CAR_WIDTH * 0.78), glowMat);
  glowMesh.rotation.x = -Math.PI / 2;
  glowMesh.position.set(centerLocalX, y, 0.12);
  carGroup.add(glowMesh);

  const boxGeo = new THREE.BoxGeometry(hitW - 0.08, zoneHeight, CAR_WIDTH * 0.88);
  const fillBoxMat = new THREE.MeshBasicMaterial({
    color: 0xf7c948,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.FrontSide,
  });
  const fillBoxMesh = new THREE.Mesh(boxGeo, fillBoxMat);
  fillBoxMesh.position.set(centerLocalX, centerLocalY, 0.1);
  fillBoxMesh.visible = false;
  carGroup.add(fillBoxMesh);

  const frameMat = new THREE.LineBasicMaterial({
    color: 0xffe47a,
    transparent: true,
    opacity: 0,
  });
  const frameLines = new THREE.LineSegments(new THREE.EdgesGeometry(boxGeo, 15), frameMat);
  frameLines.position.copy(fillBoxMesh.position);
  frameLines.visible = false;
  carGroup.add(frameLines);

  const hitbox = new THREE.Mesh(
    new THREE.BoxGeometry(hitW, zoneHeight + 0.15, CAR_WIDTH * 0.94),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hitbox.position.set(centerLocalX, centerLocalY, 0.1);
  hitbox.userData = { targetKind: 'zone', car: carIndex, floor };
  carGroup.add(hitbox);

  zones.set(makeZoneKey({ car: carIndex, floor }), {
    car: carIndex,
    floor,
    hitbox,
    glowMat,
    glowMesh,
    fillBoxMat,
    fillBoxMesh,
    frameMat,
    frameLines,
    centerLocalY,
    zoneWidth: hitW - 0.08,
    zoneHeight,
  });
}

function buildLocomotive(
  carIndex: number,
  totalCars: number,
  textures: SceneTexturePack,
  zones: Map<string, ZoneVisual>,
  highQuality: boolean,
  lang: 'vi' | 'en',
): CarRig {
  const group = new THREE.Group();
  group.position.x = carCenterX(carIndex, totalCars);

  const ironMat = new THREE.MeshToonMaterial({
    color: 0x3b404a,
    map: textures.steelRiveted,
    gradientMap: textures.toonRamp,
  });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x2b2e36, roughness: 0.48, metalness: 0.65 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xe8b54f, roughness: 0.28, metalness: 0.8 });
  const redTrim = new THREE.MeshToonMaterial({ color: 0xb9352a, gradientMap: textures.toonRamp });
  const cabWood = new THREE.MeshToonMaterial({
    color: 0xb67b4b,
    map: textures.woodWalnut,
    gradientMap: textures.toonRamp,
  });

  // Heavy chassis frame extending forward for cowcatcher
  const frame = new THREE.Mesh(new THREE.BoxGeometry(CAR_LENGTH + 0.45, 0.44, CAR_WIDTH * 0.9), darkMetal);
  frame.position.set(-0.2, 0.78, 0);
  frame.castShadow = highQuality;
  frame.receiveShadow = true;
  group.add(frame);

  // Tapered cowcatcher pilot at front (-X)
  const pilotGroup = new THREE.Group();
  pilotGroup.position.set(-CAR_LENGTH / 2 - 0.52, 0.54, 0);
  const pilotBeam = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, CAR_WIDTH * 0.88), redTrim);
  pilotBeam.position.set(0.22, 0.22, 0);
  pilotGroup.add(pilotBeam);
  for (let i = -3; i <= 3; i += 1) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.06, 0.08), redTrim);
    bar.position.set(-0.08, -0.05, i * 0.25);
    bar.rotation.z = 0.42;
    pilotGroup.add(bar);
  }
  group.add(pilotGroup);

  // Horizontal cylindrical steam boiler ending clearly before the engineer cab
  const boilerLen = CAR_LENGTH * 0.49;
  const boilerCenterX = -1.14;
  const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.76, boilerLen, 20), ironMat);
  boiler.rotation.z = Math.PI / 2;
  boiler.position.set(boilerCenterX, 1.72, 0);
  boiler.castShadow = highQuality;
  group.add(boiler);

  // Boiler brass barrel straps
  for (const offset of [-0.92, -0.2, 0.52]) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.79, 0.79, 0.08, 20), brassMat);
    band.rotation.z = Math.PI / 2;
    band.position.set(boilerCenterX + offset, 1.72, 0);
    group.add(band);
  }

  // Front smokebox plate & golden star
  const frontDoor = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.66, 0.16, 16), darkMetal);
  frontDoor.rotation.z = Math.PI / 2;
  frontDoor.position.set(boilerCenterX - boilerLen / 2 - 0.05, 1.72, 0);
  group.add(frontDoor);

  // Brass steam dome & sand dome
  const steamDome = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.56, 14), brassMat);
  steamDome.position.set(-0.66, 2.58, 0);
  group.add(steamDome);
  const sandDome = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.42, 12), redTrim);
  sandDome.position.set(-1.38, 2.48, 0);
  group.add(sandDome);

  // Flared 1899 diamond smokestack
  const stackBase = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.65, 14), darkMetal);
  stackBase.position.set(-2.08, 2.66, 0);
  group.add(stackBase);
  const stackBell = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.2, 0.52, 14), darkMetal);
  stackBell.position.set(-2.08, 3.18, 0);
  group.add(stackBell);
  const stackRim = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.05, 8, 16), brassMat);
  stackRim.rotation.x = Math.PI / 2;
  stackRim.position.set(-2.08, 3.44, 0);
  group.add(stackRim);

  const smokestackAnchor = new THREE.Object3D();
  smokestackAnchor.position.set(-2.08, 3.55, 0);
  group.add(smokestackAnchor);

  // Brass headlamp & glowing tunnel spotlight
  const lampHousing = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.42, 0.36), brassMat);
  lampHousing.position.set(-2.48, 2.6, 0);
  group.add(lampHousing);
  const lampLens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 0.06, 14),
    new THREE.MeshBasicMaterial({ color: 0xfff5be }),
  );
  lampLens.rotation.z = Math.PI / 2;
  lampLens.position.set(-2.68, 2.6, 0);
  group.add(lampLens);

  const headlight = new THREE.SpotLight(0xffdfa0, 2.2, 26, Math.PI / 5, 0.55, 1.2);
  headlight.position.set(-2.7, 2.6, 0);
  const hlTarget = new THREE.Object3D();
  hlTarget.position.set(-13, 0.4, 0);
  group.add(hlTarget);
  headlight.target = hlTarget;
  group.add(headlight);

  const headlightConeMat = new THREE.MeshBasicMaterial({
    color: 0xffe49e,
    transparent: true,
    opacity: 0.06,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const headlightCone = new THREE.Mesh(new THREE.ConeGeometry(2.6, 9.2, 18, 1, true), headlightConeMat);
  headlightCone.rotation.z = -Math.PI / 2;
  headlightCone.position.set(-7.3, 2.2, 0);
  group.add(headlightCone);

  // Engineer Cab (cutaway front for completely unobstructed characters & $1000 Strongbox visibility)
  const cabX = LOCO_CAB_OFFSET_X;
  const cabW = 2.42;
  const cabBack = new THREE.Mesh(new THREE.BoxGeometry(cabW, 2.15, 0.16), cabWood);
  cabBack.position.set(cabX, 2.12, -CAR_WIDTH / 2 + 0.14);
  group.add(cabBack);

  const cabFloor = new THREE.Mesh(
    new THREE.BoxGeometry(cabW - 0.04, 0.14, CAR_WIDTH * 0.86),
    new THREE.MeshToonMaterial({ color: 0xffe4bc, map: textures.woodDeck, gradientMap: textures.toonRamp }),
  );
  cabFloor.position.set(cabX, INSIDE_FLOOR_Y - 0.04, 0);
  cabFloor.receiveShadow = true;
  group.add(cabFloor);

  // Cutaway cab roof & rear brass posts (front edge open so characters/strongbox are never blocked)
  const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(cabW + 0.3, 0.18, CAR_WIDTH * 0.94), redTrim);
  cabRoof.position.set(cabX, 3.16, 0);
  cabRoof.castShadow = highQuality;
  group.add(cabRoof);

  for (const sx of [-cabW / 2 + 0.1, cabW / 2 - 0.1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.1, 8), brassMat);
    post.position.set(cabX + sx, 2.12, -CAR_WIDTH / 2 + 0.24);
    group.add(post);
  }

  // Warm firebox glow tucked along far-left cab bulkhead
  const firebox = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.65, 0.82),
    new THREE.MeshBasicMaterial({ color: 0xff6e24 }),
  );
  firebox.position.set(cabX - cabW / 2 + 0.08, 1.48, -0.35);
  group.add(firebox);

  const cabLight = new THREE.PointLight(0xff9b4a, 1.3, 6);
  cabLight.position.set(cabX, 2.55, 0.15);
  group.add(cabLight);

  // Number plate
  const labelText = lang === 'vi' ? 'ĐẦU MÁY #99' : 'LOCO #1899';
  const carLabelTex = makeCarNumberPlate(labelText);
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(1.45, 0.34),
    new THREE.MeshBasicMaterial({ map: carLabelTex }),
  );
  plate.position.set(cabX, 0.8, CAR_WIDTH / 2 + 0.02);
  group.add(plate);

  // Wheels: 2 front lead wheels + 2 large 4-4-0 drive wheels + reciprocating connecting rods
  const wheels: THREE.Object3D[] = [];
  const pistonRods: THREE.Object3D[] = [];
  const wheelConfigs = [
    { x: -2.05, r: 0.34, drive: false },
    { x: -1.15, r: 0.34, drive: false },
    { x: 0.32, r: 0.56, drive: true },
    { x: 1.65, r: 0.56, drive: true },
  ];
  for (const cfg of wheelConfigs) {
    for (const side of [1, -1]) {
      const w = buildSpokedWheel(cfg.r, darkMetal, cfg.drive ? redTrim : brassMat);
      w.position.set(cfg.x, cfg.r + 0.08, side * (CAR_WIDTH * 0.45));
      group.add(w);
      wheels.push(w);
    }
  }
  // Connecting piston side rod between the two drive wheels
  const rod = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.09, 0.07), brassMat);
  rod.position.set(0.98, 0.55, CAR_WIDTH * 0.48);
  group.add(rod);
  pistonRods.push(rod);

  // Rear iron coupler
  const coupler = new THREE.Mesh(new THREE.BoxGeometry(CAR_GAP + 0.2, 0.12, 0.18), darkMetal);
  coupler.position.set(CAR_LENGTH / 2 + CAR_GAP / 2, 0.72, 0);
  group.add(coupler);

  addZoneHighlight(group, carIndex, 'inside', zones, 2.44, cabX);
  addZoneHighlight(group, carIndex, 'roof', zones, 2.52, cabX);

  return {
    carIndex,
    group,
    wheels,
    pistonRods,
    lanternLights: [cabLight],
    lanternBulbs: [],
    headlight,
    headlightCone,
    headlightConeMat,
    smokestackAnchor,
    carLabelTex,
  };
}

function buildPassengerCar(
  carIndex: number,
  totalCars: number,
  textures: SceneTexturePack,
  zones: Map<string, ZoneVisual>,
  highQuality: boolean,
  lang: 'vi' | 'en',
): CarRig {
  const group = new THREE.Group();
  group.position.x = carCenterX(carIndex, totalCars);
  const isCaboose = carIndex === totalCars - 1;
  const comicEdgeMat = new THREE.LineBasicMaterial({ color: 0x231309 });
  const addEdges = (mesh: THREE.Mesh, threshold = 28) => {
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, threshold), comicEdgeMat));
  };

  const chassisMat = new THREE.MeshStandardMaterial({ color: 0x2f3136, roughness: 0.55, metalness: 0.6 });
  const shellMat = new THREE.MeshToonMaterial({
    color: 0x86847d,
    gradientMap: textures.toonRamp,
  });
  const interiorWallMat = new THREE.MeshToonMaterial({
    color: 0xffffff,
    map: textures.coachWallpaper,
    gradientMap: textures.toonRamp,
  });
  const roofMat = new THREE.MeshToonMaterial({
    color: 0x767772,
    gradientMap: textures.toonRamp,
  });
  const woodTrimMat = new THREE.MeshToonMaterial({
    color: 0xc28a4e,
    map: textures.woodWalnut,
    gradientMap: textures.toonRamp,
  });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xe8b54f, roughness: 0.28, metalness: 0.8 });
  const plushMat = new THREE.MeshToonMaterial({ color: 0xd45b58, gradientMap: textures.toonRamp });
  const drapeMat = new THREE.MeshToonMaterial({ color: 0x992b30, gradientMap: textures.toonRamp });

  // Underframe & sunlit interior hardwood floor
  const underframe = new THREE.Mesh(new THREE.BoxGeometry(CAR_LENGTH, 0.36, CAR_WIDTH * 0.92), chassisMat);
  underframe.position.set(0, 0.76, 0);
  underframe.receiveShadow = true;
  addEdges(underframe);
  group.add(underframe);

  const floorDeck = new THREE.Mesh(
    new THREE.BoxGeometry(CAR_LENGTH - 0.14, 0.1, CAR_WIDTH * 0.86),
    new THREE.MeshToonMaterial({ color: 0xfff0d4, map: textures.woodDeck, gradientMap: textures.toonRamp }),
  );
  floorDeck.position.set(0, INSIDE_FLOOR_Y - 0.05, 0);
  floorDeck.receiveShadow = true;
  addEdges(floorDeck);
  group.add(floorDeck);

  // Back wall with TRUE OPEN SKY WINDOWS (lower wainscot + upper frieze + vertical piers)
  const backZ = -CAR_WIDTH / 2 + 0.14;
  const wainscot = new THREE.Mesh(new THREE.BoxGeometry(CAR_LENGTH - 0.12, 0.72, 0.14), interiorWallMat);
  wainscot.position.set(0, INSIDE_FLOOR_Y + 0.35, backZ);
  addEdges(wainscot);
  group.add(wainscot);

  const frieze = new THREE.Mesh(new THREE.BoxGeometry(CAR_LENGTH - 0.12, 0.38, 0.14), interiorWallMat);
  frieze.position.set(0, INSIDE_FLOOR_Y + 1.84, backZ);
  addEdges(frieze);
  group.add(frieze);

  // Vertical piers separating 3 wide open windows so desert sky & mesas visibly show through
  for (const px of [-2.28, -0.76, 0.76, 2.28]) {
    const pierW = Math.abs(px) > 2 ? 0.52 : 0.38;
    const pier = new THREE.Mesh(new THREE.BoxGeometry(pierW, 0.96, 0.14), interiorWallMat);
    pier.position.set(px, INSIDE_FLOOR_Y + 1.19, backZ);
    addEdges(pier);
    group.add(pier);
  }

  for (const wx of [-1.52, 0, 1.52]) {
    const sill = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.08, 0.18), woodTrimMat);
    sill.position.set(wx, INSIDE_FLOOR_Y + 0.72, backZ + 0.02);
    addEdges(sill);
    group.add(sill);
    // Side window drapes
    for (const dx of [-0.47, 0.47]) {
      const drape = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.92, 0.06), drapeMat);
      drape.position.set(wx + dx, INSIDE_FLOOR_Y + 1.2, backZ + 0.07);
      group.add(drape);
    }
  }

  // Side end bulkheads framing cutaway viewing face + recessed mahogany interior doors
  for (const ex of [-CAR_LENGTH / 2 + 0.18, CAR_LENGTH / 2 - 0.18]) {
    const endWall = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.02, CAR_WIDTH * 0.86), shellMat);
    endWall.position.set(ex, INSIDE_FLOOR_Y + 0.98, 0);
    addEdges(endWall);
    group.add(endWall);

    const door = new THREE.Mesh(new THREE.BoxGeometry(0.27, 1.48, 0.76), woodTrimMat);
    door.position.set(ex, INSIDE_FLOOR_Y + 0.75, 0);
    addEdges(door);
    group.add(door);
  }

  // Western coach interior: plush coral armchairs + saloon bistro table / bar details
  for (const sx of [-1.55, -0.58, 0.58, 1.55]) {
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.28, 0.56), plushMat);
    cushion.position.set(sx, INSIDE_FLOOR_Y + 0.22, -CAR_WIDTH / 2 + 0.54);
    addEdges(cushion);
    group.add(cushion);
    const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.44, 0.14), plushMat);
    backrest.position.set(sx, INSIDE_FLOOR_Y + 0.5, -CAR_WIDTH / 2 + 0.3);
    addEdges(backrest);
    group.add(backrest);
  }
  const bistroTable = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.48, 10), woodTrimMat);
  bistroTable.position.set(carIndex === 1 ? -1.05 : 1.05, INSIDE_FLOOR_Y + 0.26, -CAR_WIDTH / 2 + 0.55);
  group.add(bistroTable);

  // Curved overhanging slate-metallic coach roof deck + warm boardwalk planks
  const roofDeck = new THREE.Mesh(new THREE.BoxGeometry(CAR_LENGTH + 0.36, 0.19, CAR_WIDTH * 1.04), roofMat);
  roofDeck.position.set(0, ROOF_FLOOR_Y - 0.06, 0);
  roofDeck.castShadow = highQuality;
  roofDeck.receiveShadow = true;
  addEdges(roofDeck);
  group.add(roofDeck);

  const roofCap = new THREE.Mesh(new THREE.BoxGeometry(CAR_LENGTH + 0.18, 0.08, CAR_WIDTH * 0.74), shellMat);
  roofCap.position.set(0, ROOF_FLOOR_Y + 0.03, 0);
  addEdges(roofCap);
  group.add(roofCap);

  const walkway = new THREE.Mesh(
    new THREE.BoxGeometry(CAR_LENGTH - 0.18, 0.05, 0.96),
    new THREE.MeshToonMaterial({ color: 0xdeb97b, gradientMap: textures.toonRamp }),
  );
  walkway.position.set(0, ROOF_FLOOR_Y + 0.07, 0);
  group.add(walkway);

  // Caboose elevated lookout cupola
  if (isCaboose) {
    const cupola = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.62, CAR_WIDTH * 0.52), shellMat);
    cupola.position.set(1.25, ROOF_FLOOR_Y + 0.36, -0.35);
    addEdges(cupola);
    group.add(cupola);
    const cupolaRoof = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.12, CAR_WIDTH * 0.6), roofMat);
    cupolaRoof.position.set(1.25, ROOF_FLOOR_Y + 0.7, -0.35);
    addEdges(cupolaRoof);
    group.add(cupolaRoof);
  }

  // Interior center ladder rungs connecting inside <-> roof visually
  for (const rY of [1.45, 1.85, 2.25, 2.65, 3.0]) {
    const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.42, 8), brassMat);
    rung.rotation.z = Math.PI / 2;
    rung.position.set(0, rY, -CAR_WIDTH / 2 + 0.28);
    group.add(rung);
  }

  // Warm swinging overhead brass oil lantern
  const lanternBulb = new THREE.MeshStandardMaterial({
    color: 0xffe49c,
    emissive: 0xffae42,
    emissiveIntensity: 0.9,
    roughness: 0.3,
  });
  const bulbMesh = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), lanternBulb);
  bulbMesh.position.set(0, ROOF_FLOOR_Y - 0.34, -0.15);
  group.add(bulbMesh);

  const lanternLight = new THREE.PointLight(0xffb55c, 0.85, 6.5);
  lanternLight.position.set(0, ROOF_FLOOR_Y - 0.45, 0.2);
  group.add(lanternLight);

  // Car number plate
  const label = isCaboose
    ? lang === 'vi'
      ? `TOA ${carIndex} (CUỐI)`
      : `CAR ${carIndex} (CAB)`
    : lang === 'vi'
      ? `TOA ${carIndex}`
      : `CAR ${carIndex}`;
  const carLabelTex = makeCarNumberPlate(label);
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 0.32),
    new THREE.MeshBasicMaterial({ map: carLabelTex }),
  );
  plate.position.set(0, 0.78, CAR_WIDTH / 2 - 0.02);
  group.add(plate);

  // Bogie wheelsets (front pair + rear pair)
  const wheels: THREE.Object3D[] = [];
  for (const wx of [-1.75, -1.05, 1.05, 1.75]) {
    for (const side of [1, -1]) {
      const w = buildSpokedWheel(0.38, chassisMat, brassMat);
      w.position.set(wx, 0.46, side * (CAR_WIDTH * 0.44));
      group.add(w);
      wheels.push(w);
    }
  }

  // Coupler bar linking to next car
  if (!isCaboose) {
    const coupler = new THREE.Mesh(new THREE.BoxGeometry(CAR_GAP + 0.2, 0.12, 0.18), chassisMat);
    coupler.position.set(CAR_LENGTH / 2 + CAR_GAP / 2, 0.72, 0);
    group.add(coupler);
  }

  addZoneHighlight(group, carIndex, 'inside', zones);
  addZoneHighlight(group, carIndex, 'roof', zones);

  return {
    carIndex,
    group,
    wheels,
    pistonRods: [],
    lanternLights: [lanternLight],
    lanternBulbs: [lanternBulb],
    carLabelTex,
  };
}

function buildLootMesh(
  id: string,
  car: number,
  floor: 'inside' | 'roof',
  type: LootType,
  count: number,
  textures: SceneTexturePack,
): LootVisual {
  const group = new THREE.Group();
  const style = LOOT_3D_STYLE[type];
  const visibleCluster = Math.min(3, Math.max(1, count));
  const comicMat = new THREE.LineBasicMaterial({ color: 0x261206 });

  if (type === 'purse') {
    const sackMat = new THREE.MeshToonMaterial({ color: 0xecdcb6, gradientMap: textures.toonRamp });
    const tieMat = new THREE.MeshToonMaterial({ color: 0xa86f34, gradientMap: textures.toonRamp });
    for (let k = 0; k < visibleCluster; k += 1) {
      const sub = new THREE.Group();
      const ox = k === 0 ? 0 : k === 1 ? -0.22 : 0.22;
      const oz = k === 0 ? 0.06 : -0.1;
      const sack = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), sackMat);
      sack.scale.set(1.06, 1.18, 0.9);
      sack.position.y = 0.28;
      sub.add(sack);
      const tie = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.16, 10), tieMat);
      tie.position.y = 0.52;
      sub.add(tie);
      sub.position.set(ox, 0, oz);
      group.add(sub);
    }
  } else if (type === 'jewel') {
    const rubyMat = new THREE.MeshToonMaterial({
      color: 0xff3b6e,
      emissive: 0x7a0826,
      emissiveIntensity: 0.3,
      gradientMap: textures.toonRamp,
    });
    for (let k = 0; k < visibleCluster; k += 1) {
      const ruby = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), rubyMat);
      const ox = k === 0 ? 0 : k === 1 ? -0.24 : 0.24;
      const oz = k === 0 ? 0.06 : -0.08;
      ruby.scale.set(1.18, 0.9, 1.0);
      ruby.position.set(ox, 0.28, oz);
      ruby.add(new THREE.LineSegments(new THREE.EdgesGeometry(ruby.geometry, 20), comicMat));
      group.add(ruby);
    }
  } else {
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.48, 0.44),
      new THREE.MeshToonMaterial({ color: 0x358c5f, gradientMap: textures.toonRamp }),
    );
    box.position.y = 0.25;
    box.add(new THREE.LineSegments(new THREE.EdgesGeometry(box.geometry, 20), comicMat));
    group.add(box);
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.12, 0.46),
      new THREE.MeshStandardMaterial({ color: 0xf6c959, metalness: 0.78, roughness: 0.24 }),
    );
    band.position.y = 0.36;
    group.add(band);
    const lock = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.22, 0.48),
      new THREE.MeshStandardMaterial({ color: 0xffe27a, metalness: 0.8, roughness: 0.2 }),
    );
    lock.position.y = 0.28;
    group.add(lock);
  }

  let countTex: THREE.CanvasTexture | undefined;
  if (count > 1) {
    countTex = makeLootCountTexture(count);
    const countMat = new THREE.SpriteMaterial({ map: countTex, transparent: true, depthTest: false });
    const countSprite = new THREE.Sprite(countMat);
    countSprite.scale.set(0.58, 0.58, 1);
    countSprite.position.set(0.18, 0.42, 0.44);
    group.add(countSprite);
  }

  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xffd359,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  });
  const ringMesh = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.5, 20), ringMat);
  ringMesh.rotation.x = -Math.PI / 2;
  ringMesh.position.y = 0.04;
  group.add(ringMesh);

  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xffe47a,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const beamMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.52, 1.35, 14, 1, true), beamMat);
  beamMesh.position.y = 0.68;
  group.add(beamMesh);

  const hitbox = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.95, 0.95),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hitbox.position.y = 0.38;
  hitbox.userData = { targetKind: 'loot', car, floor, lootType: type };
  group.add(hitbox);

  return { id, car, floor, type, group, hitbox, ringMesh, ringMat, beamMat, countTex };
}

export function buildTrainAssembly(
  carCount: number,
  textures: SceneTexturePack,
  highQuality: boolean,
  lang: 'vi' | 'en',
): TrainAssembly {
  const root = new THREE.Group();
  const lootRoot = new THREE.Group();
  root.add(lootRoot);

  const cars: CarRig[] = [];
  const zones = new Map<string, ZoneVisual>();
  let loots: LootVisual[] = [];
  let lastLootSignature = '';

  for (let i = 0; i < carCount; i += 1) {
    const rig =
      i === 0
        ? buildLocomotive(i, carCount, textures, zones, highQuality, lang)
        : buildPassengerCar(i, carCount, textures, zones, highQuality, lang);
    root.add(rig.group);
    cars.push(rig);
  }

  const clearLoots = () => {
    for (const lv of loots) {
      lv.ringMat.dispose();
      lv.countTex?.dispose();
      lootRoot.remove(lv.group);
    }
    loots = [];
  };

  return {
    root,
    cars,
    zones,
    get loots() {
      return loots;
    },
    smokestackWorldPos(target: THREE.Vector3) {
      const anchor = cars[0]?.smokestackAnchor;
      if (anchor) {
        anchor.getWorldPosition(target);
      } else {
        target.set(carCenterX(0, carCount) - 2, 3.6, 0);
      }
      return target;
    },
    updateMotion(timeSec: number, wheelSpeed: number, tunnelFactor: number) {
      for (const car of cars) {
        // Gentle suspension chug bounce along rails
        car.group.position.y = Math.sin(timeSec * 8 + car.carIndex * 1.1) * 0.025;
        for (const w of car.wheels) {
          w.rotation.z += wheelSpeed * 0.055;
        }
        for (const rod of car.pistonRods) {
          rod.position.x = 0.98 + Math.cos(timeSec * 9.5) * 0.14;
          rod.position.y = 0.55 + Math.sin(timeSec * 9.5) * 0.09;
        }
        const lanternGain = 0.85 + tunnelFactor * 1.7;
        for (const light of car.lanternLights) {
          light.intensity = lanternGain;
        }
        for (const mat of car.lanternBulbs) {
          mat.emissiveIntensity = 0.8 + tunnelFactor * 1.1;
        }
        if (car.headlight && car.headlightConeMat) {
          car.headlight.intensity = 1.8 + tunnelFactor * 5.2;
          car.headlightConeMat.opacity = 0.04 + tunnelFactor * 0.24;
        }
      }
    },
    updateLoots(carsData: TrainCarView[], lootHighlightKeys: Set<string>, timeSec: number) {
      const sigParts: string[] = [];
      for (const c of carsData) {
        for (const fl of ['inside', 'roof'] as const) {
          sigParts.push(`${c.index}:${fl}:${c[fl].map((l) => l.id).join(',')}`);
        }
      }
      const nextSig = sigParts.join('|');
      if (nextSig !== lastLootSignature) {
        lastLootSignature = nextSig;
        clearLoots();
        for (const car of carsData) {
          const cx = carInteriorCenterX(car.index, carsData.length);
          const spreadStep = car.index === 0 ? 0.68 : 1.15;
          for (const floor of ['inside', 'roof'] as const) {
            const list = car[floor];
            if (list.length === 0) continue;
            const y = floor === 'roof' ? ROOF_FLOOR_Y + 0.04 : INSIDE_FLOOR_Y + 0.03;
            const byType = new Map<LootType, typeof list>();
            for (const item of list) {
              const bucket = byType.get(item.type) ?? [];
              bucket.push(item);
              byType.set(item.type, bucket);
            }
            const entries = Array.from(byType.entries());
            entries.forEach(([lootType, items], idx) => {
              const lv = buildLootMesh(
                items[0]!.id,
                car.index,
                floor,
                lootType,
                items.length,
                textures,
              );
              const spread =
                car.index === 0 && floor === 'inside' && entries.length === 1
                  ? 0.36
                  : (idx - (entries.length - 1) / 2) * spreadStep;
              lv.group.position.set(
                cx + spread,
                y,
                floor === 'inside' ? (car.index === 0 ? 0.78 : 0.62) : 0.48,
              );
              lootRoot.add(lv.group);
              loots.push(lv);
            });
          }
        }
      }

      for (let i = 0; i < loots.length; i += 1) {
        const lv = loots[i]!;
        const key = `${lv.car}:${lv.floor}:${lv.type}`;
        const active = lootHighlightKeys.has(key);
        const baseY = lv.floor === 'roof' ? ROOF_FLOOR_Y + 0.04 : INSIDE_FLOOR_Y + 0.03;
        lv.group.position.y = active ? baseY + 0.14 + Math.sin(timeSec * 5 + i) * 0.08 : baseY;
        lv.group.rotation.y = lv.type === 'jewel' ? timeSec * 1.4 : active ? Math.sin(timeSec * 4) * 0.2 : 0;
        lv.ringMat.opacity = active ? 0.82 + Math.sin(timeSec * 6) * 0.16 : 0;
        lv.beamMat.opacity = active ? 0.32 + Math.sin(timeSec * 6) * 0.14 : 0;
      }
    },
    dispose() {
      clearLoots();
      for (const c of cars) {
        c.carLabelTex?.dispose();
      }
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
