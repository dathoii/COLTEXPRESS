import * as THREE from 'three';

export interface SceneTexturePack {
  toonRamp: THREE.DataTexture;
  woodWalnut: THREE.CanvasTexture;
  woodDeck: THREE.CanvasTexture;
  coachWallpaper: THREE.CanvasTexture;
  steelRiveted: THREE.CanvasTexture;
  desertGround: THREE.CanvasTexture;
  skyBackdrop: THREE.CanvasTexture;
  smokePuff: THREE.CanvasTexture;
  dispose: () => void;
}

function makeToonGradient(): THREE.DataTexture {
  // 4-band crisp cel-shading gradient matching animated Colt Express style
  const colors = new Uint8Array([
    88, 88, 96, 255,
    146, 146, 152, 255,
    208, 208, 212, 255,
    255, 255, 255, 255,
  ]);
  const tex = new THREE.DataTexture(colors, 4, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

function makeCanvasTexture(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    draw(ctx, w, h);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createSceneTexturePack(): SceneTexturePack {
  const toonRamp = makeToonGradient();

  const woodWalnut = makeCanvasTexture(
    128,
    128,
    (ctx, w, h) => {
      ctx.fillStyle = '#8b5c34';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 8; i += 1) {
        const x = i * 16;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255,228,185,0.14)' : 'rgba(54,28,8,0.12)';
        ctx.fillRect(x, 0, 15, h);
        ctx.fillStyle = '#472812';
        ctx.fillRect(x + 15, 0, 1, h);
      }
      ctx.strokeStyle = 'rgba(46,24,8,0.16)';
      ctx.lineWidth = 1;
      for (let y = 12; y < h; y += 22) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y + 3);
        ctx.stroke();
      }
    },
    2,
    1,
  );

  const woodDeck = makeCanvasTexture(
    128,
    128,
    (ctx, w, h) => {
      ctx.fillStyle = '#dfbe88';
      ctx.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 16) {
        ctx.fillStyle = (y / 16) % 2 === 0 ? 'rgba(255,244,218,0.22)' : 'rgba(130,86,42,0.14)';
        ctx.fillRect(0, y, w, 14);
        ctx.fillStyle = '#8c6134';
        ctx.fillRect(0, y + 14, w, 2);
      }
    },
    3,
    1,
  );

  const coachWallpaper = makeCanvasTexture(
    128,
    128,
    (ctx, w, h) => {
      ctx.fillStyle = '#f2e5c6';
      ctx.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 16) {
        ctx.fillStyle = (x / 16) % 2 === 0 ? '#f6ebd0' : '#dfd0aa';
        ctx.fillRect(x, 0, 15, h);
        ctx.fillStyle = 'rgba(130, 98, 56, 0.25)';
        ctx.fillRect(x + 15, 0, 1, h);
      }
      // Subtle lower dado rail accent
      ctx.fillStyle = '#c4985a';
      ctx.fillRect(0, h - 22, w, 4);
    },
    2,
    1,
  );

  const steelRiveted = makeCanvasTexture(
    128,
    128,
    (ctx, w, h) => {
      ctx.fillStyle = '#474c56';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#21252b';
      ctx.lineWidth = 2;
      ctx.strokeRect(2, 2, w - 4, h - 4);
      ctx.fillStyle = '#8a92a1';
      for (let x = 10; x < w; x += 22) {
        ctx.beginPath();
        ctx.arc(x, 10, 2.2, 0, Math.PI * 2);
        ctx.arc(x, h - 10, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    2,
    1,
  );

  const desertGround = makeCanvasTexture(
    256,
    256,
    (ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#f0d291');
      grad.addColorStop(1, '#e0b367');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 420; i += 1) {
        const px = (i * 73) % w;
        const py = (i * 137) % h;
        ctx.fillStyle = i % 3 === 0 ? 'rgba(255,244,205,0.28)' : 'rgba(154,102,42,0.16)';
        ctx.fillRect(px, py, 3, 2);
      }
    },
    18,
    8,
  );

  const skyBackdrop = makeCanvasTexture(
    256,
    256,
    (ctx, w, h) => {
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#8fbcd1');
      sky.addColorStop(0.45, '#c8dfe6');
      sky.addColorStop(0.75, '#f2e4c2');
      sky.addColorStop(1, '#f7e9c7');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);
      // Stylized cream desert cirrus clouds matching comic look
      ctx.fillStyle = 'rgba(255, 250, 236, 0.72)';
      for (const [cx, cy, rx, ry] of [
        [52, 96, 44, 10],
        [156, 86, 56, 12],
        [218, 118, 34, 8],
        [96, 128, 38, 9],
      ] as const) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    1,
    1,
  );

  const smokePuff = makeCanvasTexture(64, 64, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w * 0.45, h * 0.42, 4, w * 0.5, h * 0.5, w * 0.46);
    g.addColorStop(0, 'rgba(255,250,242,0.92)');
    g.addColorStop(0.55, 'rgba(218,205,196,0.52)');
    g.addColorStop(1, 'rgba(180,165,155,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

  return {
    toonRamp,
    woodWalnut,
    woodDeck,
    coachWallpaper,
    steelRiveted,
    desertGround,
    skyBackdrop,
    smokePuff,
    dispose: () => {
      toonRamp.dispose();
      woodWalnut.dispose();
      woodDeck.dispose();
      coachWallpaper.dispose();
      steelRiveted.dispose();
      desertGround.dispose();
      skyBackdrop.dispose();
      smokePuff.dispose();
    },
  };
}

export function createCalloutSpriteTexture(label: string, fillColor: string, borderColor = '#2a1205'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 256, 128);
    // Starburst backing polygon
    ctx.save();
    ctx.translate(128, 64);
    ctx.beginPath();
    const spikes = 12;
    for (let i = 0; i < spikes * 2; i += 1) {
      const r = i % 2 === 0 ? 114 : 74;
      const a = (i / (spikes * 2)) * Math.PI * 2;
      const sx = Math.cos(a) * r;
      const sy = Math.sin(a) * (r * 0.48);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = borderColor;
    ctx.stroke();
    ctx.restore();

    ctx.font = '900 44px Impact, "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#1f0d04';
    ctx.strokeText(label, 128, 66);
    ctx.fillStyle = '#fff9de';
    ctx.fillText(label, 128, 66);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
