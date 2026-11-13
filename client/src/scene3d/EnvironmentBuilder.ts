import * as THREE from 'three';
import type { SceneTexturePack } from './textures.js';

export interface EnvironmentRig {
  root: THREE.Group;
  tunnelFactor: number;
  update: (
    dtSec: number,
    trainSpeed: number,
    inTunnel: boolean,
    isStation: boolean,
    scene: THREE.Scene,
    hemiLight: THREE.HemisphereLight,
    sunLight: THREE.DirectionalLight,
  ) => void;
  dispose: () => void;
}

const SUNSET_BG = new THREE.Color(0xc5dde6);
const SUNSET_FOG = new THREE.Color(0xf3e2bd);
const TUNNEL_BG = new THREE.Color(0x0b0910);
const TUNNEL_FOG = new THREE.Color(0x0f0c16);

const SUN_COLOR_DAY = new THREE.Color(0xfff6e0);
const SUN_COLOR_TUNNEL = new THREE.Color(0x3a4868);
const HEMI_SKY_DAY = new THREE.Color(0xfff2d8);
const HEMI_SKY_TUNNEL = new THREE.Color(0x1b2033);
const HEMI_GROUND_DAY = new THREE.Color(0xd9a768);
const HEMI_GROUND_TUNNEL = new THREE.Color(0x14101a);

export function buildEnvironmentRig(textures: SceneTexturePack, highQuality: boolean): EnvironmentRig {
  const root = new THREE.Group();
  const comicEdgeMat = new THREE.LineBasicMaterial({ color: 0x2a160b });

  // Warm sunlit Western desert sand stretching to horizon
  const groundMat = new THREE.MeshToonMaterial({
    color: 0xffffff,
    map: textures.desertGround,
    gradientMap: textures.toonRamp,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(180, 120), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.02, -25);
  ground.receiveShadow = true;
  root.add(ground);

  // Graveled pale sand ballast bed directly underneath track
  const ballastMat = new THREE.MeshToonMaterial({ color: 0xbcb09b, gradientMap: textures.toonRamp });
  const ballast = new THREE.Mesh(new THREE.BoxGeometry(120, 0.14, 3.1), ballastMat);
  ballast.position.set(0, 0.03, 0);
  ballast.receiveShadow = true;
  root.add(ballast);

  // Gleaming steel rails
  const railMat = new THREE.MeshStandardMaterial({ color: 0xd0d7e0, metalness: 0.72, roughness: 0.28 });
  for (const rz of [-1.05, 1.05]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(120, 0.11, 0.12), railMat);
    rail.position.set(0, 0.14, rz);
    root.add(rail);
  }

  // Pooled wooden sleepers scrolling along the track (+X as train speeds left toward -X)
  const tieCount = 68;
  const tieSpacing = 1.65;
  const ties = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.28, 0.09, 2.75),
    new THREE.MeshToonMaterial({ color: 0x5c422c, gradientMap: textures.toonRamp }),
    tieCount,
  );
  ties.receiveShadow = true;
  root.add(ties);

  // Painted comic desert sky backdrop plane far behind mesas
  const skyPlaneMat = new THREE.MeshBasicMaterial({ map: textures.skyBackdrop, color: 0xffffff, fog: false });
  const skyPlane = new THREE.Mesh(new THREE.PlaneGeometry(210, 74), skyPlaneMat);
  skyPlane.position.set(0, 24, -64);
  root.add(skyPlane);

  // Background Monument Valley sandstone stepped buttes (modest horizon height behind open coach windows)
  const mesaGroup = new THREE.Group();
  const mesaMat = new THREE.MeshToonMaterial({ color: 0xdd8d52, gradientMap: textures.toonRamp });
  const mesaRidgeMat = new THREE.MeshToonMaterial({ color: 0xc56e39, gradientMap: textures.toonRamp });
  const mesaSpecs = [
    { x: -38, z: -28, w: 14, h: 5.6 },
    { x: -15, z: -34, w: 20, h: 7.4 },
    { x: 10, z: -30, w: 15, h: 5.8 },
    { x: 34, z: -35, w: 22, h: 8.2 },
    { x: 54, z: -30, w: 14, h: 6.0 },
  ];
  const mesas: THREE.Object3D[] = [];
  for (let idx = 0; idx < mesaSpecs.length; idx += 1) {
    const m = mesaSpecs[idx]!;
    const butte = new THREE.Group();
    const baseGeo = new THREE.CylinderGeometry(m.w * 0.42, m.w * 0.62, m.h * 0.55, 7);
    const baseMesh = new THREE.Mesh(baseGeo, idx % 2 === 0 ? mesaMat : mesaRidgeMat);
    baseMesh.position.y = m.h * 0.275 - 0.3;
    baseMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(baseGeo, 22), comicEdgeMat));
    butte.add(baseMesh);

    const capGeo = new THREE.CylinderGeometry(m.w * 0.22, m.w * 0.36, m.h * 0.52, 6);
    const capMesh = new THREE.Mesh(capGeo, idx % 2 === 0 ? mesaRidgeMat : mesaMat);
    capMesh.position.set(m.w * 0.06, m.h * 0.72, 0.3);
    capMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(capGeo, 22), comicEdgeMat));
    butte.add(capMesh);

    butte.position.set(m.x, 0, m.z);
    mesaGroup.add(butte);
    mesas.push(butte);
  }
  root.add(mesaGroup);

  // Parallax comic green saguaro cacti + distant sage brush / low desert posts
  const poleMat = new THREE.MeshToonMaterial({ color: 0x7b5232, gradientMap: textures.toonRamp });
  const cactusMat = new THREE.MeshToonMaterial({ color: 0x5c9640, gradientMap: textures.toonRamp });
  const parallaxProps: { obj: THREE.Object3D; span: number; factor: number }[] = [];

  for (let i = 0; i < 8; i += 1) {
    const px = -44 + i * 13;
    const post = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.25, 6), poleMat);
    trunk.position.y = 0.62;
    trunk.add(new THREE.LineSegments(new THREE.EdgesGeometry(trunk.geometry, 26), comicEdgeMat));
    post.add(trunk);
    post.position.set(px, 0, -14);
    root.add(post);
    parallaxProps.push({ obj: post, span: 104, factor: 0.92 });

    if (highQuality || i % 2 === 0) {
      const cactus = new THREE.Group();
      const stemGeo = new THREE.CapsuleGeometry(0.18, 1.65, 4, 7);
      const stem = new THREE.Mesh(stemGeo, cactusMat);
      stem.position.y = 0.95;
      stem.add(new THREE.LineSegments(new THREE.EdgesGeometry(stemGeo, 28), comicEdgeMat));
      cactus.add(stem);
      const armGeo = new THREE.CapsuleGeometry(0.12, 0.65, 4, 6);
      const armR = new THREE.Mesh(armGeo, cactusMat);
      armR.position.set(0.3, 1.25, 0);
      armR.rotation.z = -0.45;
      cactus.add(armR);
      if (i % 2 === 0) {
        const armL = new THREE.Mesh(armGeo, cactusMat);
        armL.position.set(-0.28, 1.05, 0);
        armL.rotation.z = 0.42;
        cactus.add(armL);
      }
      cactus.position.set(px + 6.5, 0, -7.8 - (i % 3) * 2.4);
      root.add(cactus);
      parallaxProps.push({ obj: cactus, span: 104, factor: 0.85 });
    }
  }

  // Stylized setting desert sun disc
  const sunDiscMat = new THREE.MeshBasicMaterial({ color: 0xffe49e });
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(7.2, 24), sunDiscMat);
  sunDisc.position.set(16, 17, -56);
  root.add(sunDisc);

  // Tunnel enclosure (back rocky wall + arched timber beams that fade/lower smoothly in Tunnel turns)
  const tunnelGroup = new THREE.Group();
  const tunnelWallMat = new THREE.MeshToonMaterial({
    color: 0x1e1924,
    gradientMap: textures.toonRamp,
    transparent: true,
    opacity: 0,
  });
  const tunnelBack = new THREE.Mesh(new THREE.BoxGeometry(92, 9.5, 0.8), tunnelWallMat);
  tunnelBack.position.set(0, 4.5, -4.4);
  tunnelGroup.add(tunnelBack);
  const tunnelCeiling = new THREE.Mesh(new THREE.BoxGeometry(92, 0.7, 7.6), tunnelWallMat);
  tunnelCeiling.position.set(0, 8.9, -0.8);
  tunnelGroup.add(tunnelCeiling);
  for (let i = -5; i <= 5; i += 1) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.42, 8.8, 0.45), tunnelWallMat);
    rib.position.set(i * 7.8, 4.4, -3.7);
    tunnelGroup.add(rib);
  }
  tunnelGroup.visible = false;
  root.add(tunnelGroup);

  // Union Pacific Round 5 Station Landmark
  const stationGroup = new THREE.Group();
  const depotMat = new THREE.MeshToonMaterial({ color: 0x6b3f23, gradientMap: textures.toonRamp });
  const depotRoofMat = new THREE.MeshToonMaterial({ color: 0x382419, gradientMap: textures.toonRamp });
  const platform = new THREE.Mesh(new THREE.BoxGeometry(22, 0.55, 3.6), depotRoofMat);
  platform.position.set(-2, 0.25, -4.6);
  stationGroup.add(platform);
  const house = new THREE.Mesh(new THREE.BoxGeometry(7.5, 3.8, 2.8), depotMat);
  house.position.set(-5.5, 2.3, -5.6);
  stationGroup.add(house);
  const houseRoof = new THREE.Mesh(new THREE.ConeGeometry(5.6, 1.9, 4), depotRoofMat);
  houseRoof.rotation.y = Math.PI / 4;
  houseRoof.position.set(-5.5, 5.1, -5.6);
  stationGroup.add(houseRoof);
  // Iconic frontier water tower
  const towerLegs = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.35, 3.4, 6), depotRoofMat);
  towerLegs.position.set(5.2, 1.8, -5.4);
  stationGroup.add(towerLegs);
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 2.1, 12), depotMat);
  tank.position.set(5.2, 4.3, -5.4);
  stationGroup.add(tank);
  stationGroup.visible = false;
  root.add(stationGroup);

  const dummy = new THREE.Object3D();
  const scratchBg = new THREE.Color();
  const scratchFog = new THREE.Color();
  const scratchSun = new THREE.Color();
  const scratchHemi = new THREE.Color();
  let trackScroll = 0;
  let tunnelFactor = 0;

  return {
    root,
    get tunnelFactor() {
      return tunnelFactor;
    },
    update(dtSec, trainSpeed, inTunnel, isStation, scene, hemiLight, sunLight) {
      trackScroll = (trackScroll + dtSec * trainSpeed) % tieSpacing;
      const halfSpan = (tieCount * tieSpacing) / 2;
      for (let i = 0; i < tieCount; i += 1) {
        const x = i * tieSpacing - halfSpan + trackScroll;
        dummy.position.set(x, 0.09, 0);
        dummy.updateMatrix();
        ties.setMatrixAt(i, dummy.matrix);
      }
      ties.instanceMatrix.needsUpdate = true;

      textures.desertGround.offset.x -= dtSec * trainSpeed * 0.14;

      for (const p of parallaxProps) {
        p.obj.position.x += dtSec * trainSpeed * p.factor;
        if (p.obj.position.x > p.span / 2) {
          p.obj.position.x -= p.span;
        }
      }
      for (const m of mesas) {
        m.position.x += dtSec * trainSpeed * 0.18;
        if (m.position.x > 52) m.position.x -= 104;
      }

      // Smooth Tunnel lighting interpolation
      const targetTunnel = inTunnel ? 1 : 0;
      tunnelFactor += (targetTunnel - tunnelFactor) * Math.min(1, dtSec * 4.5);

      scratchBg.copy(SUNSET_BG).lerp(TUNNEL_BG, tunnelFactor);
      scratchFog.copy(SUNSET_FOG).lerp(TUNNEL_FOG, tunnelFactor);
      scene.background = scratchBg.clone();
      if (scene.fog instanceof THREE.Fog) {
        scene.fog.color.copy(scratchFog);
      }

      scratchSun.copy(SUN_COLOR_DAY).lerp(SUN_COLOR_TUNNEL, tunnelFactor);
      scratchHemi.copy(HEMI_SKY_DAY).lerp(HEMI_SKY_TUNNEL, tunnelFactor);
      sunLight.color.copy(scratchSun);
      sunLight.intensity = 1.85 - tunnelFactor * 1.55;
      hemiLight.color.copy(scratchHemi);
      hemiLight.groundColor.copy(HEMI_GROUND_DAY).lerp(HEMI_GROUND_TUNNEL, tunnelFactor);
      hemiLight.intensity = 1.25 - tunnelFactor * 0.92;
      sunDisc.visible = false;
      skyPlane.visible = tunnelFactor < 0.92;
      skyPlaneMat.color.setRGB(1 - tunnelFactor * 0.9, 1 - tunnelFactor * 0.9, 1 - tunnelFactor * 0.85);

      tunnelGroup.visible = tunnelFactor > 0.03;
      tunnelWallMat.opacity = tunnelFactor * 0.94;
      stationGroup.visible = isStation && tunnelFactor < 0.5;
    },
    dispose() {
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
