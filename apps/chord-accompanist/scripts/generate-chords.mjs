// 코드별 한 마디 반주 루프(WAV)를 합성한다.
// 실행: npm run generate:chords
// 결과: assets/chords/*.wav, src/chordSounds.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'assets', 'chords');
const INDEX_FILE = join(ROOT, 'src', 'chordSounds.ts');

const SAMPLE_RATE = 22050;
const BPM = 90;
const BEAT = 60 / BPM;
const BAR_SAMPLES = Math.round(BEAT * 4 * SAMPLE_RATE);

// src/music.ts 의 ROOTS / QUALITIES 와 맞춰야 한다.
const ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const QUALITIES = {
  '': [0, 7, 12, 16, 19], // 메이저
  m: [0, 7, 12, 15, 19], // 마이너
  '7': [0, 7, 10, 16, 19], // 도미넌트 7
};

// 8분음표 위치별 스트럼: D D U U D U
const STRUMS = [
  { eighth: 0, dir: 'down', gain: 1.0 },
  { eighth: 2, dir: 'down', gain: 0.8 },
  { eighth: 3, dir: 'up', gain: 0.55 },
  { eighth: 5, dir: 'up', gain: 0.55 },
  { eighth: 6, dir: 'down', gain: 0.8 },
  { eighth: 7, dir: 'up', gain: 0.55 },
];

const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

// 시드 고정 난수 → 매번 같은 파일이 나온다.
let seed = 12345;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 0xffffffff;
};

// 루프 버퍼에 원형으로 더해서, 마디 끝을 넘는 잔향이 앞으로 이어지게 한다.
function addCircular(buf, start, samples) {
  for (let i = 0; i < samples.length; i++) {
    buf[(start + i) % buf.length] += samples[i];
  }
}

// Karplus-Strong 기타 줄
function pluck(freq, seconds, gain) {
  const n = Math.round(seconds * SAMPLE_RATE);
  const period = Math.max(2, Math.round(SAMPLE_RATE / freq));
  const line = new Float32Array(period);
  let prev = 0;
  for (let i = 0; i < period; i++) {
    const noise = rand() * 2 - 1;
    prev = prev * 0.5 + noise * 0.5; // 살짝 부드럽게
    line[i] = prev;
  }
  const out = new Float32Array(n);
  const fade = Math.round(0.03 * SAMPLE_RATE);
  let idx = 0;
  for (let i = 0; i < n; i++) {
    const next = (idx + 1) % period;
    const v = line[idx];
    line[idx] = 0.996 * 0.5 * (v + line[next]);
    idx = next;
    const release = i > n - fade ? (n - i) / fade : 1;
    out[i] = v * gain * release;
  }
  return out;
}

// 부드러운 베이스 음
function bass(freq, seconds, gain) {
  const n = Math.round(seconds * SAMPLE_RATE);
  const out = new Float32Array(n);
  const attack = Math.round(0.005 * SAMPLE_RATE);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.min(1, i / attack) * Math.exp(-t * 2.5) * Math.min(1, (n - i) / (0.03 * SAMPLE_RATE));
    const w = 2 * Math.PI * freq * t;
    out[i] = gain * env * (Math.sin(w) + 0.35 * Math.sin(2 * w) + 0.1 * Math.sin(3 * w));
  }
  return out;
}

function renderChord(rootIndex, intervals) {
  const buf = new Float32Array(BAR_SAMPLES);
  // G 이상은 한 옥타브 내려서 음역을 고르게
  const base = 48 + rootIndex - (rootIndex >= 7 ? 12 : 0);
  const eighth = BEAT / 2;

  STRUMS.forEach((s, i) => {
    const next = STRUMS[(i + 1) % STRUMS.length];
    let gapEighths = next.eighth - s.eighth;
    if (gapEighths <= 0) gapEighths += 8;
    const ring = gapEighths * eighth + 0.05; // 다음 스트럼에서 뮤트
    const strings = s.dir === 'down' ? intervals : intervals.slice(2).reverse();
    strings.forEach((iv, k) => {
      const start = Math.round((s.eighth * eighth + k * 0.012) * SAMPLE_RATE);
      addCircular(buf, start, pluck(midiToFreq(base + iv), ring, s.gain * 0.3));
    });
  });

  // 베이스: 1박 근음, 3박 5도
  addCircular(buf, 0, bass(midiToFreq(base - 12), BEAT * 2, 0.5));
  addCircular(buf, Math.round(BEAT * 2 * SAMPLE_RATE), bass(midiToFreq(base - 12 + 7), BEAT * 2, 0.4));

  let peak = 0;
  for (const v of buf) peak = Math.max(peak, Math.abs(v));
  const scale = peak > 0 ? 0.85 / peak : 1;
  return buf.map((v) => v * scale);
}

function toWav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((v, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), i * 2));
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(1, 22); // 모노
  h.writeUInt32LE(SAMPLE_RATE, 24);
  h.writeUInt32LE(SAMPLE_RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

const fileKey = (name) => name.replace('#', 's');

mkdirSync(OUT_DIR, { recursive: true });
const entries = [];
ROOTS.forEach((root, ri) => {
  for (const [quality, intervals] of Object.entries(QUALITIES)) {
    const name = root + quality;
    writeFileSync(join(OUT_DIR, `${fileKey(name)}.wav`), toWav(renderChord(ri, intervals)));
    entries.push(`  '${name}': require('../assets/chords/${fileKey(name)}.wav'),`);
  }
});

writeFileSync(
  INDEX_FILE,
  `// 자동 생성 파일: scripts/generate-chords.mjs 로 다시 만든다.
export const BPM = ${BPM};
export const BAR_SECONDS = ${BAR_SAMPLES / SAMPLE_RATE};

export const CHORD_SOUNDS: Record<string, number> = {
${entries.join('\n')}
};
`,
);
console.log(`${entries.length}개 코드 생성 완료 → assets/chords/`);
