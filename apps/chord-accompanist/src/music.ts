// scripts/generate-chords.mjs 의 ROOTS / QUALITIES 와 맞춰야 한다.
export const ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;
export const QUALITIES = [
  { id: '', label: '메이저' },
  { id: 'm', label: '마이너' },
  { id: '7', label: '7' },
] as const;

export type Progression = { name: string; chords: string[] };

export const PROGRESSIONS: Progression[] = [
  { name: '팝 기본', chords: ['C', 'G', 'Am', 'F'] },
  { name: '캐논', chords: ['C', 'G', 'Am', 'Em', 'F', 'C', 'F', 'G'] },
  { name: '50년대', chords: ['G', 'Em', 'C', 'D'] },
  { name: '마이너 발라드', chords: ['Am', 'F', 'C', 'G'] },
  { name: '12마디 블루스', chords: ['A7', 'A7', 'A7', 'A7', 'D7', 'D7', 'A7', 'A7', 'E7', 'D7', 'A7', 'E7'] },
];

export const uniqueChords = (chords: string[]) => [...new Set(chords)];
