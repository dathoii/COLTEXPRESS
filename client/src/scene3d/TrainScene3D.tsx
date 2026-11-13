import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type {
  GameView,
  LootType,
  PendingDecision,
  Position,
  ResolutionChoice,
} from '@colt/shared';
import type { CharacterPose } from '../components/art/CharacterSprite.js';
import type { GameAnimationState } from '../hooks/useGameAnimations.js';
import { UI_STRINGS, type Lang } from '../i18n.js';
import { TrainScene } from '../components/art/TrainScene.js';
import { CameraRig } from './CameraRig.js';
import { applyRigPoseAnimation, createCharacterRig3D, type CharacterRig3D } from './CharacterBuilder.js';
import { CAR_WIDTH, carCenterX, carInteriorCenterX, marshalHomeX, positionToWorld3D, INSIDE_FLOOR_Y, ROOF_FLOOR_Y } from './constants.js';
import { buildEnvironmentRig } from './EnvironmentBuilder.js';
import { createSceneTexturePack } from './textures.js';
import { buildTrainAssembly } from './TrainBuilder.js';
import { buildVfxSystem, type VfxAnchors } from './VfxSystem.js';

export interface TrainScene3DProps {
  game: GameView;
  viewerId: string | null;
  anim: GameAnimationState;
  animationsEnabled: boolean;
  lang?: Lang;
  graphicsQuality?: 'high' | 'low';
  cameraEffects?: boolean;
  pendingDecision?: PendingDecision | null;
  isMyDecision?: boolean;
  selectedPunchTargetId?: string | null;
  selectedPunchLoot?: LootType | null | 'unset';
  onSelectChoice?: (choice: ResolutionChoice) => void;
  onSelectPunchTarget?: (targetId: string) => void;
}

function makePosKey(pos: Position): string {
  return `${pos.car}:${pos.floor}`;
}

interface ProjectedHotspot {
  key: string;
  hoverKey: string;
  kind: 'zone' | 'loot' | 'attack';
  variant: 'zone' | 'gold' | 'danger';
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
  ariaLabel: string;
  badgeText: string;
  choice?: ResolutionChoice;
  punchTargetId?: string;
}

const _projBoxVec = new THREE.Vector3();

function projectWorldBoxToPct(
  cx: number,
  cy: number,
  cz: number,
  hx: number,
  hy: number,
  hz: number,
  camera: THREE.Camera,
): { leftPct: number; topPct: number; widthPct: number; heightPct: number } | null {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let allBehind = true;

  for (let dx = -1; dx <= 1; dx += 2) {
    for (let dy = -1; dy <= 1; dy += 2) {
      for (let dz = -1; dz <= 1; dz += 2) {
        _projBoxVec.set(cx + dx * hx, cy + dy * hy, cz + dz * hz).project(camera);
        if (_projBoxVec.z <= 1) allBehind = false;
        const sx = (_projBoxVec.x * 0.5 + 0.5) * 100;
        const sy = (-_projBoxVec.y * 0.5 + 0.5) * 100;
        if (sx < minX) minX = sx;
        if (sx > maxX) maxX = sx;
        if (sy < minY) minY = sy;
        if (sy > maxY) maxY = sy;
      }
    }
  }

  if (allBehind || maxX < 0 || minX > 100 || maxY < 0 || minY > 100) {
    return null;
  }

  const clampedMinX = Math.max(0.5, Math.min(99.5, minX));
  const clampedMaxX = Math.max(0.5, Math.min(99.5, maxX));
  const clampedMinY = Math.max(0.5, Math.min(99.5, minY));
  const clampedMaxY = Math.max(0.5, Math.min(99.5, maxY));

  const widthPct = Math.max(4.5, clampedMaxX - clampedMinX);
  const heightPct = Math.max(7.5, clampedMaxY - clampedMinY);
  const centerX = (clampedMinX + clampedMaxX) * 0.5;
  const centerY = (clampedMinY + clampedMaxY) * 0.5;

  return {
    leftPct: Math.max(0.5, Math.min(99.5 - widthPct, centerX - widthPct * 0.5)),
    topPct: Math.max(0.5, Math.min(99.5 - heightPct, centerY - heightPct * 0.5)),
    widthPct,
    heightPct,
  };
}

export function TrainScene3D(props: TrainScene3DProps) {
  const {
    game,
    viewerId,
    anim,
    animationsEnabled,
    lang = 'vi',
    graphicsQuality = 'high',
    cameraEffects = true,
    pendingDecision = null,
    isMyDecision = false,
    selectedPunchTargetId = null,
    selectedPunchLoot = 'unset',
    onSelectChoice,
    onSelectPunchTarget,
  } = props;

  const t = UI_STRINGS[lang];
  const highQuality = graphicsQuality !== 'low';

  const stageRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [webglError, setWebglError] = useState(false);
  const [hoverHint, setHoverHint] = useState<string | null>(null);
  const [isPointerHoveringTarget, setIsPointerHoveringTarget] = useState(false);
  const [projectedHotspots, setProjectedHotspots] = useState<ProjectedHotspot[]>([]);
  const hoveredTargetKeyRef = useRef<string | null>(null);
  const panDraggedRef = useRef(false);
  const lastHotspotSigRef = useRef('');

  // Latest props ref read cleanly inside 60fps RAF loop & pointer events without tearing down WebGL context
  const stateRef = useRef({
    game,
    viewerId,
    anim,
    animationsEnabled,
    lang,
    highQuality,
    cameraEffects,
    pendingDecision,
    isMyDecision,
    selectedPunchTargetId,
    selectedPunchLoot,
    onSelectChoice,
    onSelectPunchTarget,
  });
  stateRef.current = {
    game,
    viewerId,
    anim,
    animationsEnabled,
    lang,
    highQuality,
    cameraEffects,
    pendingDecision,
    isMyDecision,
    selectedPunchTargetId,
    selectedPunchLoot,
    onSelectChoice,
    onSelectPunchTarget,
  };

  // Interactive target lookups derived from current pendingDecision
  const interactionMaps = useMemo(() => {
    const moveChoices = new Map<string, Extract<ResolutionChoice, { type: 'move' }>>();
    const changeFloorChoices = new Map<string, Extract<ResolutionChoice, { type: 'changeFloor' }>>();
    const marshalChoices = new Map<number, Extract<ResolutionChoice, { type: 'marshal' }>>();
    const robChoices = new Map<string, Extract<ResolutionChoice, { type: 'rob' }>>();
    const shootChoices = new Map<string, Extract<ResolutionChoice, { type: 'shoot' }>>();
    const punchTargets = new Set<string>();
    const punchOptionsByCar = new Map<number, Extract<ResolutionChoice, { type: 'punch' }>[]>();
    const robHighlightKeys = new Set<string>();

    if (isMyDecision && pendingDecision) {
      const actor = game.players.find((p) => p.id === pendingDecision.playerId);
      for (const opt of pendingDecision.options) {
        switch (opt.type) {
          case 'move':
            moveChoices.set(makePosKey(opt.to), opt);
            break;
          case 'changeFloor':
            changeFloorChoices.set(makePosKey(opt.to), opt);
            break;
          case 'marshal':
            marshalChoices.set(opt.toCar, opt);
            break;
          case 'rob':
            if (actor) {
              const key = `${actor.position.car}:${actor.position.floor}:${opt.lootType}`;
              robChoices.set(key, opt);
              robHighlightKeys.add(key);
            }
            break;
          case 'shoot':
            shootChoices.set(opt.targetId, opt);
            break;
          case 'punch': {
            punchTargets.add(opt.targetId);
            if (selectedPunchTargetId && opt.targetId === selectedPunchTargetId && opt.to) {
              const arr = punchOptionsByCar.get(opt.to.car) ?? [];
              arr.push(opt);
              punchOptionsByCar.set(opt.to.car, arr);
            }
            break;
          }
        }
      }
    }

    return {
      moveChoices,
      changeFloorChoices,
      marshalChoices,
      robChoices,
      shootChoices,
      punchTargets,
      punchOptionsByCar,
      robHighlightKeys,
    };
  }, [game.players, isMyDecision, pendingDecision, selectedPunchTargetId]);

  const mapsRef = useRef(interactionMaps);
  mapsRef.current = interactionMaps;

  const cameraRigRef = useRef<CameraRig | null>(null);

  const carCount = game.train.length;
  const execTurnIdx = Math.floor((game.execution?.index ?? 0) / Math.max(1, game.players.length));
  const activeTurnIndex =
    game.phase === 'planning'
      ? game.planning?.turnIndex ?? 0
      : game.phase === 'execution'
        ? Math.min(execTurnIdx, Math.max(0, (game.currentRound?.turns.length ?? 1) - 1))
        : 0;
  const currentTurnType = game.currentRound?.turns[activeTurnIndex] ?? 'normal';
  const inTunnel = currentTurnType === 'tunnel';
  const isStation = game.currentRound?.kind === 'station';

  useEffect(() => {
    const host = containerRef.current;
    if (!host || webglError) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: highQuality,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true,
      });
    } catch {
      setWebglError(true);
      return;
    }

    const hostRect = host.getBoundingClientRect();
    const w = Math.max(320, Math.round(host.clientWidth || hostRect.width || window.innerWidth || 800));
    const h = Math.max(220, Math.round(host.clientHeight || hostRect.height || window.innerHeight || 420));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, highQuality ? 2 : 1.25));
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = highQuality;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    host.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglError(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xc5dde6);
    scene.fog = new THREE.Fog(0xf3e2bd, 48, 128);

    const hemiLight = new THREE.HemisphereLight(0xfff2d8, 0xd9a768, 1.25);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff6e0, 1.85);
    sunLight.position.set(14, 22, 18);
    if (highQuality) {
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.set(1024, 1024);
      sunLight.shadow.camera.near = 2;
      sunLight.shadow.camera.far = 75;
      sunLight.shadow.camera.left = -26;
      sunLight.shadow.camera.right = 26;
      sunLight.shadow.camera.top = 16;
      sunLight.shadow.camera.bottom = -10;
    }
    scene.add(sunLight);

    const stageGroup = new THREE.Group();
    stageGroup.position.y = -0.35;
    scene.add(stageGroup);

    const textures = createSceneTexturePack();
    const env = buildEnvironmentRig(textures, highQuality);
    stageGroup.add(env.root);

    const train = buildTrainAssembly(carCount, textures, highQuality, lang);
    stageGroup.add(train.root);

    const vfx = buildVfxSystem(textures);
    stageGroup.add(vfx.root);

    const cameraRig = new CameraRig(w / h);
    cameraRigRef.current = cameraRig;

    // Character & Marshal rigs
    const banditRigs = new Map<string, CharacterRig3D>();
    const marshalRig = createCharacterRig3D('marshal', 'marshal', t.marshalLabel, false, false, textures);
    stageGroup.add(marshalRig.root);

    const smokeOrigin = new THREE.Vector3();
    const tmpWorldCenter = new THREE.Vector3();
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();

    // Pointer interaction (pan vs click raycast)
    let isDragging = false;
    let pointerDownX = 0;
    let pointerDownY = 0;
    let lastDragX = 0;
    let dragDistance = 0;

    const collectTargetForRay = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, cameraRig.camera);

      const st = stateRef.current;
      const maps = mapsRef.current;
      if (!st.isMyDecision || !st.pendingDecision) return null;

      const action = st.pendingDecision.card.action;

      if (action === 'rob') {
        const hits = raycaster.intersectObjects(
          train.loots.map((l) => l.hitbox),
          false,
        );
        for (const hHit of hits) {
          const d = hHit.object.userData as { car: number; floor: 'inside' | 'roof'; lootType: LootType };
          const key = `${d.car}:${d.floor}:${d.lootType}`;
          const choice = maps.robChoices.get(key);
          if (choice) return { kind: 'choice' as const, choice, label: `${t.robThis}: ${d.lootType}`, hoverKey: `loot:${key}` };
        }
      }

      if (action === 'shoot' || (action === 'punch' && !st.selectedPunchTargetId)) {
        const hitboxes = Array.from(banditRigs.values()).map((r) => r.hitbox);
        const hits = raycaster.intersectObjects(hitboxes, false);
        for (const hHit of hits) {
          const pid = String(hHit.object.userData.playerId ?? '');
          if (action === 'shoot') {
            const sc = maps.shootChoices.get(pid);
            if (sc) return { kind: 'choice' as const, choice: sc, label: t.shootTarget, hoverKey: `attack:${pid}` };
          } else if (action === 'punch' && maps.punchTargets.has(pid)) {
            return { kind: 'punchTarget' as const, targetId: pid, label: t.punchTarget, hoverKey: `punch-target:${pid}` };
          }
        }
      }

      if (
        action === 'move' ||
        action === 'changeFloor' ||
        action === 'marshal' ||
        (action === 'punch' && st.selectedPunchTargetId)
      ) {
        const zoneBoxes = Array.from(train.zones.values()).map((z) => z.hitbox);
        const hits = raycaster.intersectObjects(zoneBoxes, false);
        for (const hHit of hits) {
          const zCar = Number(hHit.object.userData.car);
          const zFloor = hHit.object.userData.floor as 'inside' | 'roof';
          const key = `${zCar}:${zFloor}`;
          if (action === 'move') {
            const mc = maps.moveChoices.get(key);
            if (mc) return { kind: 'choice' as const, choice: mc, label: t.moveHere, hoverKey: `zone:${key}` };
          } else if (action === 'changeFloor') {
            const fc = maps.changeFloorChoices.get(key);
            if (fc) return { kind: 'choice' as const, choice: fc, label: t.climbHere, hoverKey: `zone:${key}` };
          } else if (action === 'marshal' && zFloor === 'inside') {
            const mar = maps.marshalChoices.get(zCar);
            if (mar) return { kind: 'choice' as const, choice: mar, label: t.marshalHere, hoverKey: `marshal:${zCar}` };
          } else if (action === 'punch' && st.selectedPunchTargetId) {
            const opts = maps.punchOptionsByCar.get(zCar);
            if (opts && opts.length > 0) {
              const matched =
                st.selectedPunchLoot !== 'unset'
                  ? opts.find((o) => o.lootType === st.selectedPunchLoot) ?? opts[0]!
                  : opts[0]!;
              return { kind: 'choice' as const, choice: matched, label: t.knockHere, hoverKey: `punch-car:${zCar}` };
            }
          }
        }
      }
      return null;
    };

    const onPointerDown = (e: PointerEvent) => {
      const targetEl = e.target as HTMLElement | null;
      if (targetEl?.closest('.scene3d-hud-top')) return;
      isDragging = true;
      panDraggedRef.current = false;
      pointerDownX = e.clientX;
      pointerDownY = e.clientY;
      lastDragX = e.clientX;
      dragDistance = 0;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (isDragging) {
        const dx = e.clientX - lastDragX;
        lastDragX = e.clientX;
        dragDistance += Math.hypot(dx, e.clientY - pointerDownY);
        if (dragDistance > 6) {
          cameraRig.panBy(dx, stateRef.current.game.train.length);
        }
        return;
      }
      const targetEl = e.target as HTMLElement | null;
      if (targetEl?.closest('.train-hotspot')) {
        return;
      }
      const res = collectTargetForRay(e.clientX, e.clientY);
      hoveredTargetKeyRef.current = res?.hoverKey ?? null;
      setIsPointerHoveringTarget(Boolean(res));
      setHoverHint(res?.label ?? null);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;
      const dist = Math.hypot(e.clientX - pointerDownX, e.clientY - pointerDownY);
      const dragged = dist >= 8 || dragDistance >= 8;
      panDraggedRef.current = dragged;
      window.setTimeout(() => {
        panDraggedRef.current = false;
      }, 60);
      const targetEl = e.target as HTMLElement | null;
      if (!dragged && !targetEl?.closest('.train-hotspot')) {
        const hit = collectTargetForRay(e.clientX, e.clientY);
        const st = stateRef.current;
        if (hit?.kind === 'choice') {
          st.onSelectChoice?.(hit.choice);
        } else if (hit?.kind === 'punchTarget') {
          st.onSelectPunchTarget?.(hit.targetId);
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraRig.zoomBy(e.deltaY > 0 ? -0.1 : 0.1);
    };

    const onDblClick = () => cameraRig.resetView();

    const canvasEl = renderer.domElement;
    const panEl: HTMLElement = stageRef.current ?? canvasEl;
    panEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    canvasEl.addEventListener('wheel', onWheel, { passive: false });
    canvasEl.addEventListener('dblclick', onDblClick);

    const resizeObs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cw = Math.max(200, Math.round(entry.contentRect.width));
        const ch = Math.max(180, Math.round(entry.contentRect.height));
        renderer.setSize(cw, ch);
        cameraRig.setAspect(cw, ch);
        renderer.render(scene, cameraRig.camera);
      }
    });
    resizeObs.observe(host);

    let rafId = 0;
    let prevMs = performance.now();

    const renderTick = (nowMs: number) => {
      const dtSec = Math.min(0.05, Math.max(0.001, (nowMs - prevMs) / 1000));
      prevMs = nowMs;
      const timeSec = nowMs * 0.001;

      const st = stateRef.current;
      const maps = mapsRef.current;
      const g = st.game;
      const numCars = g.train.length;
      const clip = st.animationsEnabled ? st.anim.activeClip : null;
      const phase = st.animationsEnabled ? st.anim.clipPhase : null;
      const prog = st.animationsEnabled ? st.anim.progress : 0;

      const exTurn = Math.floor((g.execution?.index ?? 0) / Math.max(1, g.players.length));
      const turnIdx =
        g.phase === 'planning'
          ? g.planning?.turnIndex ?? 0
          : g.phase === 'execution'
            ? Math.min(exTurn, Math.max(0, (g.currentRound?.turns.length ?? 1) - 1))
            : 0;
      const tType = g.currentRound?.turns[turnIdx] ?? 'normal';
      const inTun = tType === 'tunnel';
      const isSta = g.currentRound?.kind === 'station';
      const baseSpeed = g.phase === 'gameEnd' ? 1.5 : tType === 'speedingUp' ? 15.5 : isSta ? 5.5 : 10.5;

      env.update(dtSec, baseSpeed, inTun, isSta, scene, hemiLight, sunLight);
      train.updateMotion(timeSec, baseSpeed, env.tunnelFactor);
      train.updateLoots(g.train, maps.robHighlightKeys, timeSec);

      // Update zone highlight glows based on legal actions
      const act = st.isMyDecision && !clip ? st.pendingDecision?.card.action ?? null : null;
      const hoveredKey = hoveredTargetKeyRef.current;
      const pulse = 0.5 + 0.5 * Math.sin(timeSec * 6.5);
      for (const [key, zone] of train.zones.entries()) {
        let highlighted = false;
        let pulseColor = 0xffe46b;
        let isHovered = false;
        if (act === 'move') {
          highlighted = maps.moveChoices.has(key);
          isHovered = hoveredKey === `zone:${key}`;
        } else if (act === 'changeFloor') {
          highlighted = maps.changeFloorChoices.has(key);
          isHovered = hoveredKey === `zone:${key}`;
        } else if (act === 'marshal' && zone.floor === 'inside') {
          highlighted = maps.marshalChoices.has(zone.car);
          isHovered = hoveredKey === `marshal:${zone.car}`;
        } else if (act === 'punch' && st.selectedPunchTargetId) {
          const punchOpts = maps.punchOptionsByCar.get(zone.car);
          const pushFloor = punchOpts?.[0]?.to?.floor ?? 'inside';
          highlighted = Boolean(punchOpts && punchOpts.length > 0 && zone.floor === pushFloor);
          pulseColor = 0xff7b36;
          isHovered = hoveredKey === `punch-car:${zone.car}`;
        }
        zone.glowMat.color.setHex(isHovered ? 0xfff5a8 : pulseColor);
        zone.glowMat.opacity = highlighted ? (isHovered ? 0.82 : 0.44 + pulse * 0.24) : 0;

        zone.fillBoxMesh.visible = highlighted;
        zone.fillBoxMat.color.setHex(isHovered ? 0xfff6b0 : pulseColor);
        zone.fillBoxMat.opacity = highlighted ? (isHovered ? 0.4 : 0.18 + pulse * 0.14) : 0;

        zone.frameLines.visible = highlighted;
        zone.frameMat.color.setHex(isHovered ? 0xffffff : 0xfff08a);
        zone.frameMat.opacity = highlighted ? (isHovered ? 1 : 0.72 + pulse * 0.28) : 0;
      }

      // Sync bandit rigs (create if newly joined, dispose stale)
      const activeIds = new Set(g.players.map((p) => p.id));
      for (const [id, rig] of banditRigs.entries()) {
        if (!activeIds.has(id)) {
          stageGroup.remove(rig.root);
          rig.dispose();
          banditRigs.delete(id);
        }
      }
      for (const p of g.players) {
        if (!banditRigs.has(p.id)) {
          const rig = createCharacterRig3D(
            p.id,
            p.character,
            p.name,
            p.id === st.viewerId,
            Boolean(p.isBot),
            textures,
          );
          stageGroup.add(rig.root);
          banditRigs.set(p.id, rig);
        } else {
          banditRigs.get(p.id)!.setBadgeLabel(p.name, p.id === st.viewerId, Boolean(p.isBot));
        }
      }

      // Compute slot distribution per cell using pre-impact positions when animating
      const visualPosMap = new Map<string, Position>();
      const cellMembers = new Map<string, string[]>();
      for (const p of g.players) {
        let vPos = p.position;
        if (clip && phase) {
          if (clip.type === 'shoot' && p.id === clip.targetId && (phase === 'windup' || phase === 'travel')) {
            vPos = clip.targetStartPos;
          } else if (clip.type === 'punch' && p.id === clip.targetId && (phase === 'windup' || phase === 'strike')) {
            vPos = clip.victimFrom;
          } else if ((clip.type === 'move' || clip.type === 'changeFloor') && p.id === clip.playerId && phase === 'focus') {
            vPos = clip.from;
          } else if (clip.type === 'marshal' && (phase === 'aura' || phase === 'zoom') && clip.caughtIds.includes(p.id)) {
            vPos = { car: clip.toCar, floor: 'inside' };
          }
        }
        visualPosMap.set(p.id, vPos);
        const ck = makePosKey(vPos);
        const list = cellMembers.get(ck) ?? [];
        list.push(p.id);
        cellMembers.set(ck, list);
      }

      // Place Marshal smoothly inside Engineer Cab (car 0) or left side of passenger cars
      const mFromCar = clip?.type === 'marshal' ? clip.fromCar : g.marshalCar;
      const mToCar = clip?.type === 'marshal' ? clip.toCar : g.marshalCar;
      let marshalWorldX = marshalHomeX(g.marshalCar, numCars);
      let marshalWorldZ = g.marshalCar === 0 ? -0.34 : -0.2;
      if (clip?.type === 'marshal') {
        const fromZ = mFromCar === 0 ? -0.34 : -0.2;
        const toZ = mToCar === 0 ? -0.34 : -0.2;
        if (phase === 'aura' || phase === 'zoom') {
          marshalWorldX = marshalHomeX(mFromCar, numCars);
          marshalWorldZ = fromZ;
        } else {
          const stepT = Math.max(0, Math.min(1, (prog - 0.62) / 0.38));
          const xA = marshalHomeX(mFromCar, numCars);
          const xB = marshalHomeX(mToCar, numCars);
          marshalWorldX = xA + (xB - xA) * stepT;
          marshalWorldZ = fromZ + (toZ - fromZ) * stepT;
        }
      }
      marshalRig.root.position.set(marshalWorldX, INSIDE_FLOOR_Y + 0.02, marshalWorldZ);
      marshalRig.setBadgeLabel(t.marshalLabel, false, false);
      const mMoving = clip?.type === 'marshal' && phase === 'advance' && mFromCar !== mToCar;
      applyRigPoseAnimation(
        marshalRig,
        mMoving ? 'move' : 'idle',
        timeSec,
        prog,
        mToCar >= mFromCar ? 1 : -1,
        st.anim.marshalPulse || Boolean(clip?.type === 'marshal'),
      );

      // Update Bandits positions, target rings & pose animations
      const vfxAnchors: VfxAnchors = {};
      let camFocus: { x: number; y: number } | null = null;
      let isZoomedAction = false;
      let shakeStrength = 0;

      for (const p of g.players) {
        const rig = banditRigs.get(p.id);
        if (!rig) continue;
        const vPos = visualPosMap.get(p.id) ?? p.position;
        const ck = makePosKey(vPos);
        const mates = cellMembers.get(ck) ?? [p.id];
        const slotIdx = Math.max(0, mates.indexOf(p.id));
        const worldPos = positionToWorld3D(vPos, numCars, slotIdx, mates.length);

        let rx = worldPos.x;
        let ry = worldPos.y;
        let rz = worldPos.z;
        let facing: 1 | -1 = p.position.car === 0 ? 1 : -1;

        if (clip && phase) {
          if (clip.type === 'move' && p.id === clip.playerId && phase === 'action') {
            const pA = positionToWorld3D(clip.from, numCars, 0, 1);
            const pB = positionToWorld3D(clip.to, numCars, slotIdx, mates.length);
            const localT = Math.max(0, Math.min(1, (prog - 0.34) / 0.66));
            rx = pA.x + (pB.x - pA.x) * localT;
            ry = pA.y + (pB.y - pA.y) * localT + Math.sin(localT * Math.PI) * 1.15;
            rz = pA.z + (pB.z - pA.z) * localT;
            facing = pB.x >= pA.x ? 1 : -1;
          } else if (clip.type === 'changeFloor' && p.id === clip.playerId && phase === 'action') {
            const pA = positionToWorld3D(clip.from, numCars, 0, 1);
            const pB = positionToWorld3D(clip.to, numCars, slotIdx, mates.length);
            const localT = Math.max(0, Math.min(1, (prog - 0.34) / 0.66));
            rx = pA.x + (pB.x - pA.x) * localT;
            ry = pA.y + (pB.y - pA.y) * localT;
            rz = pA.z + (pB.z - pA.z) * localT;
          } else if (clip.type === 'shoot') {
            const sW = positionToWorld3D(clip.from, numCars, 0, 1);
            const tW = positionToWorld3D(clip.targetStartPos, numCars, 0, 1);
            if (p.id === clip.shooterId) facing = tW.x >= sW.x ? 1 : -1;
            if (p.id === clip.targetId && phase === 'impact') {
              const tEnd = positionToWorld3D(clip.targetEndPos, numCars, slotIdx, mates.length);
              const k = Math.max(0, Math.min(1, (prog - 0.66) / 0.34));
              rx = tW.x + (tEnd.x - tW.x) * k;
              ry = tW.y + (tEnd.y - tW.y) * k + (clip.targetStartPos.car !== clip.targetEndPos.car ? Math.sin(k * Math.PI) * 0.7 : 0);
            }
          } else if (clip.type === 'punch' && p.id === clip.targetId && phase === 'impact') {
            const vA = positionToWorld3D(clip.victimFrom, numCars, 0, 1);
            const vB = positionToWorld3D(clip.victimTo, numCars, slotIdx, mates.length);
            const k = Math.max(0, Math.min(1, (prog - 0.68) / 0.32));
            rx = vA.x + (vB.x - vA.x) * k;
            ry = vA.y + (vB.y - vA.y) * k + Math.sin(k * Math.PI) * 0.85;
          } else if (clip.type === 'event') {
            const mv = clip.moves.find((m) => m.playerId === p.id);
            if (mv && phase === 'eventImpact') {
              const eA = positionToWorld3D(mv.from, numCars, 0, 1);
              const eB = positionToWorld3D(mv.to, numCars, slotIdx, mates.length);
              const k = Math.max(0, Math.min(1, (prog - 0.42) / 0.58));
              rx = eA.x + (eB.x - eA.x) * k;
              ry = eA.y + (eB.y - eA.y) * k + Math.sin(k * Math.PI) * 0.75;
              facing = eB.x >= eA.x ? 1 : -1;
            }
          }
        }

        rig.root.position.set(rx, ry, rz);

        // Target glow ring color
        const isSelf = p.id === st.viewerId;
        const isAttackTarget =
          (act === 'shoot' && maps.shootChoices.has(p.id)) ||
          (act === 'punch' && !st.selectedPunchTargetId && maps.punchTargets.has(p.id));
        const isSelectedTarget = act === 'punch' && st.selectedPunchTargetId === p.id;
        const isTargetHovered =
          hoveredKey === `attack:${p.id}` || hoveredKey === `punch-target:${p.id}`;
        if (isSelectedTarget) {
          rig.ringMat.color.setHex(0xffe159);
          rig.ringMat.opacity = 0.96;
        } else if (isAttackTarget) {
          rig.ringMat.color.setHex(isTargetHovered ? 0xff9a44 : 0xff3d2e);
          rig.ringMat.opacity = isTargetHovered ? 0.98 : 0.72 + Math.sin(timeSec * 8) * 0.25;
        } else if (isSelf) {
          rig.ringMat.color.setHex(0x3ef08a);
          rig.ringMat.opacity = 0.72;
        } else {
          rig.ringMat.opacity = 0;
        }

        const pose: CharacterPose = st.anim.poses[p.id] ?? 'idle';
        applyRigPoseAnimation(rig, pose, timeSec, prog, facing);

        const showTargetGlow = isAttackTarget || isSelectedTarget;
        rig.targetAuraMesh.visible = showTargetGlow;
        rig.targetReticle.visible = showTargetGlow;
        if (showTargetGlow) {
          const attackPulse = 0.5 + 0.5 * Math.sin(timeSec * 7.5);
          rig.targetAuraMat.color.setHex(
            isSelectedTarget ? 0xffe159 : isTargetHovered ? 0xff9642 : 0xff3d2e,
          );
          rig.targetAuraMat.opacity = isTargetHovered ? 0.62 : 0.34 + attackPulse * 0.22;
          rig.targetReticle.position.y = 2.02 + Math.sin(timeSec * 6) * 0.08;
          const rScale = isTargetHovered ? 0.86 : 0.7 + attackPulse * 0.1;
          rig.targetReticle.scale.set(rScale, rScale, 1);
          if (pose !== 'hit') {
            rig.torsoMat.emissive.setHex(
              isSelectedTarget ? 0x7a5b10 : isTargetHovered ? 0x992e10 : 0x5c180c,
            );
          }
        }

        // Record VFX world anchors
        if (clip) {
          if (clip.type === 'shoot') {
            if (p.id === clip.shooterId) vfxAnchors.shooter = new THREE.Vector3(rx, ry, rz);
            if (p.id === clip.targetId) vfxAnchors.target = new THREE.Vector3(rx, ry, rz);
          } else if (clip.type === 'punch') {
            if (p.id === clip.puncherId) vfxAnchors.puncher = new THREE.Vector3(rx, ry, rz);
            if (p.id === clip.targetId) {
              vfxAnchors.victim = new THREE.Vector3(rx, ry, rz);
              const lWorld = positionToWorld3D(clip.victimFrom, numCars, 0, 1);
              vfxAnchors.lootDrop = new THREE.Vector3(lWorld.x, lWorld.y + 0.1, lWorld.z + 0.4);
            }
          } else if ((clip.type === 'move' || clip.type === 'changeFloor' || clip.type === 'rob') && p.id === clip.playerId) {
            vfxAnchors.actor = new THREE.Vector3(rx, ry, rz);
          }
        }
      }

      if (clip) {
        if (clip.type === 'marshal') {
          vfxAnchors.actor = marshalRig.root.position.clone();
          camFocus = { x: marshalRig.root.position.x, y: INSIDE_FLOOR_Y + 0.6 };
          isZoomedAction = true;
          if (phase === 'advance' && clip.caughtIds.length > 0) shakeStrength = 0.35;
        } else if (clip.type === 'shoot') {
          camFocus = vfxAnchors.shooter ?? null;
          isZoomedAction = true;
          if (phase === 'impact') shakeStrength = 0.65;
        } else if (clip.type === 'punch') {
          camFocus = vfxAnchors.puncher ?? null;
          isZoomedAction = true;
          if (phase === 'impact') shakeStrength = 0.75;
        } else if (clip.type === 'move' || clip.type === 'changeFloor' || clip.type === 'rob') {
          camFocus = vfxAnchors.actor ?? null;
          isZoomedAction = true;
        } else if (clip.type === 'event') {
          const evtX =
            typeof clip.car === 'number'
              ? carInteriorCenterX(clip.car, numCars)
              : clip.eventId === 'braking' || clip.eventId === 'swivelArm'
                ? 0
                : marshalRig.root.position.x;
          vfxAnchors.actor = new THREE.Vector3(
            evtX,
            clip.eventId === 'swivelArm' || clip.eventId === 'braking' ? ROOF_FLOOR_Y : INSIDE_FLOOR_Y,
            0.3,
          );
          camFocus = { x: vfxAnchors.actor.x, y: vfxAnchors.actor.y };
          isZoomedAction = typeof clip.car === 'number';
          if (phase === 'eventImpact') shakeStrength = 0.45;
        }
      }

      train.smokestackWorldPos(smokeOrigin);
      stageGroup.worldToLocal(smokeOrigin);
      vfx.update(dtSec, timeSec, smokeOrigin, st.highQuality, clip, phase, prog, vfxAnchors, st.lang);
      const worldCamFocus = camFocus ? { x: camFocus.x, y: camFocus.y + stageGroup.position.y } : null;
      cameraRig.update(dtSec, timeSec, numCars, worldCamFocus, isZoomedAction, shakeStrength, st.cameraEffects);

      renderer.render(scene, cameraRig.camera);

      // Project currently active 3D target bounds onto viewport coordinates for direct on-train selection
      const nextHotspots: ProjectedHotspot[] = [];
      if (act && st.pendingDecision) {
        stageGroup.updateMatrixWorld(true);
        cameraRig.camera.updateMatrixWorld();

        if (act === 'move') {
          for (const [key, c] of maps.moveChoices.entries()) {
            const zone = train.zones.get(key);
            if (!zone) continue;
            zone.fillBoxMesh.getWorldPosition(tmpWorldCenter);
            const box = projectWorldBoxToPct(
              tmpWorldCenter.x,
              tmpWorldCenter.y,
              tmpWorldCenter.z,
              zone.zoneWidth * 0.45,
              zone.zoneHeight * 0.45,
              0.72,
              cameraRig.camera,
            );
            if (!box) continue;
            const zoneLabel = `${c.to.car === 0 ? t.locomotive : `${t.car} ${c.to.car}`} · ${c.to.floor === 'roof' ? t.floorRoof : t.floorInside}`;
            nextHotspots.push({
              key: `mv-${key}`,
              hoverKey: `zone:${key}`,
              kind: 'zone',
              variant: 'zone',
              ...box,
              ariaLabel: `${t.moveHere}: ${zoneLabel}`,
              badgeText: zoneLabel,
              choice: c,
            });
          }
        } else if (act === 'changeFloor') {
          for (const [key, c] of maps.changeFloorChoices.entries()) {
            const zone = train.zones.get(key);
            if (!zone) continue;
            zone.fillBoxMesh.getWorldPosition(tmpWorldCenter);
            const box = projectWorldBoxToPct(
              tmpWorldCenter.x,
              tmpWorldCenter.y,
              tmpWorldCenter.z,
              zone.zoneWidth * 0.45,
              zone.zoneHeight * 0.45,
              0.72,
              cameraRig.camera,
            );
            if (!box) continue;
            const floorName = c.to.floor === 'roof' ? t.floorRoof : t.floorInside;
            nextHotspots.push({
              key: `cf-${key}`,
              hoverKey: `zone:${key}`,
              kind: 'zone',
              variant: 'zone',
              ...box,
              ariaLabel: `${t.climbHere} → ${floorName}`,
              badgeText: `${c.to.floor === 'roof' ? '⬆' : '⬇'} ${floorName}`,
              choice: c,
            });
          }
        } else if (act === 'marshal') {
          for (const [toCar, c] of maps.marshalChoices.entries()) {
            const zone = train.zones.get(`${toCar}:inside`);
            if (!zone) continue;
            zone.fillBoxMesh.getWorldPosition(tmpWorldCenter);
            const box = projectWorldBoxToPct(
              tmpWorldCenter.x,
              tmpWorldCenter.y,
              tmpWorldCenter.z,
              zone.zoneWidth * 0.45,
              zone.zoneHeight * 0.45,
              0.72,
              cameraRig.camera,
            );
            if (!box) continue;
            const carText = toCar === 0 ? t.locomotive : `${t.car} ${toCar}`;
            nextHotspots.push({
              key: `mar-${toCar}`,
              hoverKey: `marshal:${toCar}`,
              kind: 'zone',
              variant: 'zone',
              ...box,
              ariaLabel: `${t.marshalLabel} → ${carText}`,
              badgeText: `⭐ ${carText}`,
              choice: c,
            });
          }
        } else if (act === 'rob') {
          const seenLootKeys = new Set<string>();
          for (const lv of train.loots) {
            const lKey = `${lv.car}:${lv.floor}:${lv.type}`;
            if (seenLootKeys.has(lKey)) continue;
            const choice = maps.robChoices.get(lKey);
            if (!choice) continue;
            seenLootKeys.add(lKey);
            lv.group.getWorldPosition(tmpWorldCenter);
            const box = projectWorldBoxToPct(
              tmpWorldCenter.x,
              tmpWorldCenter.y + 0.45,
              tmpWorldCenter.z,
              0.58,
              0.56,
              0.42,
              cameraRig.camera,
            );
            if (!box) continue;
            const lootText = lv.type === 'purse' ? t.purse : lv.type === 'jewel' ? t.jewel : t.strongbox;
            nextHotspots.push({
              key: `rob-${lKey}`,
              hoverKey: `loot:${lKey}`,
              kind: 'loot',
              variant: 'gold',
              ...box,
              ariaLabel: `${t.robThis}: ${lootText}`,
              badgeText: `💰 ${lootText}`,
              choice,
            });
          }
        } else if (act === 'shoot') {
          for (const [tid, c] of maps.shootChoices.entries()) {
            const rig = banditRigs.get(tid);
            if (!rig) continue;
            rig.root.getWorldPosition(tmpWorldCenter);
            const box = projectWorldBoxToPct(
              tmpWorldCenter.x,
              tmpWorldCenter.y + 0.88,
              tmpWorldCenter.z,
              0.48,
              0.9,
              0.36,
              cameraRig.camera,
            );
            if (!box) continue;
            const target = g.players.find((pl) => pl.id === tid);
            const targetName = target?.name ?? tid;
            nextHotspots.push({
              key: `sh-${tid}`,
              hoverKey: `attack:${tid}`,
              kind: 'attack',
              variant: 'danger',
              ...box,
              ariaLabel: `${t.shootTarget}: ${targetName}`,
              badgeText: `🎯 ${targetName}`,
              choice: c,
            });
          }
        } else if (act === 'punch' && !st.selectedPunchTargetId) {
          for (const tid of maps.punchTargets) {
            const rig = banditRigs.get(tid);
            if (!rig) continue;
            rig.root.getWorldPosition(tmpWorldCenter);
            const box = projectWorldBoxToPct(
              tmpWorldCenter.x,
              tmpWorldCenter.y + 0.88,
              tmpWorldCenter.z,
              0.48,
              0.9,
              0.36,
              cameraRig.camera,
            );
            if (!box) continue;
            const target = g.players.find((pl) => pl.id === tid);
            const targetName = target?.name ?? tid;
            nextHotspots.push({
              key: `pt-${tid}`,
              hoverKey: `punch-target:${tid}`,
              kind: 'attack',
              variant: 'danger',
              ...box,
              ariaLabel: `${t.punchTarget}: ${targetName}`,
              badgeText: `👊 ${targetName}`,
              punchTargetId: tid,
            });
          }
        } else if (act === 'punch' && st.selectedPunchTargetId) {
          for (const [zCar, opts] of maps.punchOptionsByCar.entries()) {
            const chosen =
              st.selectedPunchLoot !== 'unset'
                ? opts.find((o) => o.lootType === st.selectedPunchLoot) ?? opts[0]!
                : opts[0]!;
            const pushFloor = chosen.to?.floor ?? 'inside';
            const zone = train.zones.get(`${zCar}:${pushFloor}`) ?? train.zones.get(`${zCar}:inside`);
            if (!zone) continue;
            zone.fillBoxMesh.getWorldPosition(tmpWorldCenter);
            const box = projectWorldBoxToPct(
              tmpWorldCenter.x,
              tmpWorldCenter.y,
              tmpWorldCenter.z,
              zone.zoneWidth * 0.45,
              zone.zoneHeight * 0.45,
              0.72,
              cameraRig.camera,
            );
            if (!box) continue;
            const carText = zCar === 0 ? t.locomotive : `${t.car} ${zCar}`;
            nextHotspots.push({
              key: `pk-${zCar}`,
              hoverKey: `punch-car:${zCar}`,
              kind: 'zone',
              variant: 'danger',
              ...box,
              ariaLabel: `${t.knockHere}: ${carText}`,
              badgeText: `💨 ${carText}`,
              choice: chosen,
            });
          }
        }
      }

      const nextSig = nextHotspots
        .map(
          (hs) =>
            `${hs.key}:${Math.round(hs.leftPct * 2)},${Math.round(hs.topPct * 2)},${Math.round(
              hs.widthPct * 2,
            )},${Math.round(hs.heightPct * 2)}:${hs.badgeText}`,
        )
        .join('|');
      if (nextSig !== lastHotspotSigRef.current) {
        lastHotspotSigRef.current = nextSig;
        setProjectedHotspots(nextHotspots);
      }
    };

    // Synchronous initial paint before first RAF so WebGL canvas is immediately populated
    renderTick(performance.now());
    const loop = (nowMs: number) => {
      rafId = requestAnimationFrame(loop);
      renderTick(nowMs);
    };
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObs.disconnect();
      panEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      canvasEl.removeEventListener('wheel', onWheel);
      canvasEl.removeEventListener('dblclick', onDblClick);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);

      for (const rig of banditRigs.values()) rig.dispose();
      banditRigs.clear();
      marshalRig.dispose();
      train.dispose();
      env.dispose();
      vfx.dispose();
      textures.dispose();
      renderer.dispose();
      if (canvasEl.parentNode === host) {
        host.removeChild(canvasEl);
      }
    };
  }, [carCount, highQuality, lang, t.climbHere, t.jewel, t.knockHere, t.locomotive, t.car, t.floorRoof, t.floorInside, t.marshalHere, t.marshalLabel, t.moveHere, t.punchTarget, t.purse, t.robThis, t.shootTarget, t.strongbox, webglError]);

  if (webglError) {
    return <TrainScene {...props} />;
  }

  const hasInteractiveTargets =
    isMyDecision &&
    pendingDecision &&
    !(animationsEnabled && anim.activeClip) &&
    projectedHotspots.length > 0;

  return (
    <div
      ref={stageRef}
      className={`train-stage train-stage-3d ${inTunnel ? 'is-tunnel' : 'is-sun'} ${
        anim.activeClip ? 'is-action-zoomed' : ''
      } ${isPointerHoveringTarget ? 'is-target-hover' : ''}`}
      data-testid="train-scene-3d"
    >
      <div
        ref={containerRef}
        className="train-webgl-host"
        style={{ cursor: isPointerHoveringTarget ? 'pointer' : 'grab' }}
      />

      {/* Subtle Top-Right Environment + Camera Reset controls leaving Top-Left & Top-Center sky open */}
      <div className="scene3d-hud-top">
        {(inTunnel || isStation) && (
          <span className={`scene3d-env-pill ${inTunnel ? 'is-tunnel' : 'is-station'}`}>
            {inTunnel
              ? `∩ ${lang === 'vi' ? 'ĐƯỜNG HẦM' : 'TUNNEL'}`
              : `🚉 ${lang === 'vi' ? 'GA CUỐI' : 'STATION'}`}
          </span>
        )}

        <button
          type="button"
          className="scene3d-cam-reset-btn"
          title={lang === 'vi' ? 'Đặt lại góc máy' : 'Reset Camera'}
          onClick={() => cameraRigRef.current?.resetView()}
        >
          🎥 {lang === 'vi' ? 'Toàn tàu' : 'Reset Cam'}
        </button>
      </div>

      {anim.banner && (
        <div className="action-fx-banner" role="status">
          {anim.banner}
        </div>
      )}

      {hoverHint && <div className="scene3d-hover-tooltip">{hoverHint}</div>}

      {/* Direct on-train illuminated interactive hotspots projected directly onto valid 3D zones, loot & targets */}
      {hasInteractiveTargets && (
        <div className="train-hotspot-layer" role="group" aria-label="On-train interactive targets">
          {projectedHotspots.map((hs) => {
            const roleClass =
              hs.kind === 'loot'
                ? 'loot-target-btn is-gold'
                : hs.kind === 'attack'
                  ? 'is-attack-target is-danger'
                  : hs.variant === 'danger'
                    ? 'is-target-zone is-danger'
                    : 'is-target-zone';
            return (
              <button
                key={hs.key}
                type="button"
                aria-label={hs.ariaLabel}
                className={`train-hotspot ${roleClass}`}
                style={{
                  left: `${hs.leftPct.toFixed(2)}%`,
                  top: `${hs.topPct.toFixed(2)}%`,
                  width: `${hs.widthPct.toFixed(2)}%`,
                  height: `${hs.heightPct.toFixed(2)}%`,
                }}
                onMouseEnter={() => {
                  hoveredTargetKeyRef.current = hs.hoverKey;
                  setIsPointerHoveringTarget(true);
                  setHoverHint(hs.ariaLabel);
                }}
                onMouseLeave={() => {
                  if (hoveredTargetKeyRef.current === hs.hoverKey) {
                    hoveredTargetKeyRef.current = null;
                    setIsPointerHoveringTarget(false);
                    setHoverHint(null);
                  }
                }}
                onFocus={() => {
                  hoveredTargetKeyRef.current = hs.hoverKey;
                  setHoverHint(hs.ariaLabel);
                }}
                onBlur={() => {
                  if (hoveredTargetKeyRef.current === hs.hoverKey) {
                    hoveredTargetKeyRef.current = null;
                    setHoverHint(null);
                  }
                }}
                onClick={() => {
                  if (panDraggedRef.current) return;
                  if (hs.punchTargetId) {
                    onSelectPunchTarget?.(hs.punchTargetId);
                  } else if (hs.choice) {
                    onSelectChoice?.(hs.choice);
                  }
                }}
              >
                <span className="train-hotspot-tag">{hs.badgeText}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TrainScene3D;
