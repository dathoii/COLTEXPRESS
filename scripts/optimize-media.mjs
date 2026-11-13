import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { basename, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
const AUDIO_DIR = join(ROOT, 'client/public/audio');
const ART_DIR = join(ROOT, 'client/public/art');
const THUMB_DIR = join(ART_DIR, 'thumbs');

function findFfmpeg() {
  if (process.env.FFMPEG_BIN && existsSync(process.env.FFMPEG_BIN)) {
    return process.env.FFMPEG_BIN;
  }
  try {
    const out = execFileSync('where.exe', ['ffmpeg'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .split(/\r?\n/)[0]
      ?.trim();
    if (out && existsSync(out)) return out;
  } catch {
    // Fallback to WinGet package directory on Windows
  }
  const localAppData = process.env.LOCALAPPDATA ?? '';
  const fallback = join(
    localAppData,
    'Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg.exe',
  );
  if (existsSync(fallback)) return fallback;
  throw new Error('ffmpeg executable not found; install ffmpeg or set FFMPEG_BIN');
}

function convertAudioToMp3() {
  const ffmpeg = findFfmpeg();
  const files = readdirSync(AUDIO_DIR).filter((f) => f.endsWith('.ogg') || f.endsWith('.wav'));
  let created = 0;
  for (const file of files) {
    const src = join(AUDIO_DIR, file);
    const stem = basename(file, extname(file));
    const dst = join(AUDIO_DIR, `${stem}.mp3`);
    execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', src, '-codec:a', 'libmp3lame', '-q:a', '5', '-ar', '44100', dst]);
    created += 1;
  }
  console.log(`[media] Converted ${created} audio files to MP3 for Safari/iOS WebKit compatibility.`);
}

function optimizeArtWithPillow() {
  mkdirSync(THUMB_DIR, { recursive: true });
  const pyScript = `
import os
from PIL import Image

root = ${JSON.stringify(ROOT)}
art_dir = ${JSON.stringify(ART_DIR)}
thumb_dir = ${JSON.stringify(THUMB_DIR)}

for fname in sorted(os.listdir(art_dir)):
    fpath = os.path.join(art_dir, fname)
    if not os.path.isfile(fpath) or not fname.lower().endswith(('.jpg', '.jpeg', '.png')):
        continue
    stem = os.path.splitext(fname)[0]
    with Image.open(fpath) as im:
        im = im.convert('RGB')
        if fname.startswith('portrait-'):
            size = min(im.size)
            left = (im.width - size) // 2
            top = (im.height - size) // 8
            crop = im.crop((left, top, left + size, top + size)).resize((256, 256), Image.Resampling.LANCZOS)
            out = os.path.join(thumb_dir, f'{stem}.webp')
            crop.save(out, 'WEBP', quality=84, method=5)
        elif fname.startswith(('bg-', 'hero-')):
            max_w = 1600
            if im.width > max_w:
                h = round(im.height * max_w / im.width)
                resized = im.resize((max_w, h), Image.Resampling.LANCZOS)
            else:
                resized = im
            out = os.path.join(art_dir, f'{stem}.webp')
            resized.save(out, 'WEBP', quality=82, method=5)

ico_src = os.path.join(root, 'assets/icons/colt-express.png')
if os.path.isfile(ico_src):
    with Image.open(ico_src) as ico:
        ico.convert('RGBA').resize((64, 64), Image.Resampling.LANCZOS).save(os.path.join(root, 'client/public/favicon.png'), 'PNG', optimize=True)
print('[media] Generated compressed WebP portraits, backdrops, and favicon.png')
`;
  execFileSync('python', ['-c', pyScript], { stdio: 'inherit' });
}

convertAudioToMp3();
optimizeArtWithPillow();
