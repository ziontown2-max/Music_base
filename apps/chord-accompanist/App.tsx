import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BAR_SECONDS, BPM } from './src/chordSounds';
import { PROGRESSIONS, QUALITIES, ROOTS, uniqueChords } from './src/music';
import { useChordPlayer } from './src/useChordPlayer';

type PadTab = 'song' | 'all';

export default function App() {
  const [progIndex, setProgIndex] = useState(0);
  const [step, setStep] = useState(0);
  const [bars, setBars] = useState(0);
  const [held, setHeld] = useState<string[]>([]);
  const [tab, setTab] = useState<PadTab>('song');
  const [quality, setQuality] = useState<string>('');

  const progression = PROGRESSIONS[progIndex];
  const target = progression.chords[step];
  const next = progression.chords[(step + 1) % progression.chords.length];
  const songChords = useMemo(() => uniqueChords(progression.chords), [progression]);
  const active = held.length ? held[held.length - 1] : null;
  const correct = active === target;

  const { play, stop } = useChordPlayer(songChords);

  // 가장 마지막에 누른 코드를 재생
  useEffect(() => {
    if (active) play(active);
    else stop();
  }, [active, play, stop]);

  // 맞는 코드를 한 마디 동안 짚고 있으면 다음 코드로
  useEffect(() => {
    if (!correct) return;
    const t = setTimeout(() => {
      setBars((b) => b + 1);
      setStep((s) => (s + 1) % progression.chords.length);
    }, BAR_SECONDS * 1000);
    return () => clearTimeout(t);
  }, [correct, step, progression]);

  const selectProgression = (i: number) => {
    setProgIndex(i);
    setStep(0);
    setBars(0);
  };

  const press = (chord: string) => setHeld((h) => [...h.filter((c) => c !== chord), chord]);
  const release = (chord: string) => setHeld((h) => h.filter((c) => c !== chord));

  const pads = tab === 'song' ? songChords : ROOTS.map((r) => r + quality);

  const status = !active
    ? '코드를 눌러서 짚고 있으세요'
    : correct
      ? '반주 중'
      : `지금 짚은 코드: ${active}`;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <Text style={styles.title}>코드 반주</Text>
      <Text style={styles.subtitle}>{BPM} BPM · 맞춘 마디 {bars}</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={styles.chipContent}>
        {PROGRESSIONS.map((p, i) => (
          <Pressable key={p.name} onPress={() => selectProgression(i)} style={[styles.chip, i === progIndex && styles.chipOn]}>
            <Text style={[styles.chipText, i === progIndex && styles.chipTextOn]}>{p.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={[styles.card, correct && styles.cardOk, active && !correct && styles.cardWrong]}>
        <Text style={styles.cardLabel}>지금 코드</Text>
        <Text style={styles.cardChord}>{target}</Text>
        <Text style={styles.cardNext}>다음: {next}</Text>
        <Text style={styles.cardStatus}>{status}</Text>
      </View>

      <View style={styles.steps}>
        {progression.chords.map((c, i) => (
          <Text key={i} style={[styles.stepText, i === step && styles.stepOn]}>
            {c}
          </Text>
        ))}
      </View>

      <View style={styles.tabs}>
        <TabButton label="진행 코드" on={tab === 'song'} onPress={() => setTab('song')} />
        <TabButton label="전체 코드" on={tab === 'all'} onPress={() => setTab('all')} />
      </View>
      {tab === 'all' && (
        <View style={styles.tabs}>
          {QUALITIES.map((q) => (
            <TabButton key={q.id} label={q.label} on={quality === q.id} onPress={() => setQuality(q.id)} small />
          ))}
        </View>
      )}

      <View style={styles.pads}>
        {pads.map((chord) => {
          const isHeld = held.includes(chord);
          return (
            <Pressable
              key={chord}
              onPressIn={() => press(chord)}
              onPressOut={() => release(chord)}
              style={[
                styles.pad,
                tab === 'song' ? styles.padBig : styles.padSmall,
                chord === target && styles.padTarget,
                isHeld && styles.padHeld,
              ]}
            >
              <Text style={[styles.padText, tab === 'all' && styles.padTextSmall]}>{chord}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function TabButton({ label, on, onPress, small }: { label: string; on: boolean; onPress: () => void; small?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, on && styles.tabOn]}>
      <Text style={[styles.tabText, small && { fontSize: 13 }, on && styles.tabTextOn]}>{label}</Text>
    </Pressable>
  );
}

const C = {
  bg: '#12141a',
  surface: '#1d2029',
  line: '#2c3040',
  text: '#f2f3f7',
  muted: '#9096a8',
  accent: '#6c8cff',
  ok: '#2fbf71',
  warn: '#e6a23c',
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg, paddingTop: 60, paddingHorizontal: 16 },
  title: { color: C.text, fontSize: 26, fontWeight: '700' },
  subtitle: { color: C.muted, marginTop: 4 },
  chipRow: { flexGrow: 0, marginTop: 16 },
  chipContent: { gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
  chipOn: { backgroundColor: C.accent, borderColor: C.accent },
  chipText: { color: C.muted, fontWeight: '600' },
  chipTextOn: { color: '#fff' },
  card: { marginTop: 16, padding: 20, borderRadius: 16, backgroundColor: C.surface, alignItems: 'center', borderWidth: 2, borderColor: C.line },
  cardOk: { borderColor: C.ok },
  cardWrong: { borderColor: C.warn },
  cardLabel: { color: C.muted, fontSize: 13 },
  cardChord: { color: C.text, fontSize: 64, fontWeight: '800' },
  cardNext: { color: C.muted, fontSize: 16 },
  cardStatus: { color: C.text, marginTop: 8, fontSize: 15 },
  steps: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12, justifyContent: 'center' },
  stepText: { color: C.muted, fontSize: 15 },
  stepOn: { color: C.accent, fontWeight: '800' },
  tabs: { flexDirection: 'row', gap: 8, marginTop: 16 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: C.surface, alignItems: 'center' },
  tabOn: { backgroundColor: C.line },
  tabText: { color: C.muted, fontWeight: '600' },
  tabTextOn: { color: C.text },
  pads: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12, justifyContent: 'space-between' },
  pad: { backgroundColor: C.surface, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.line },
  padBig: { width: '48%', height: 90 },
  padSmall: { width: '23%', height: 60 },
  padTarget: { borderColor: C.accent },
  padHeld: { backgroundColor: C.accent, borderColor: C.accent },
  padText: { color: C.text, fontSize: 28, fontWeight: '700' },
  padTextSmall: { fontSize: 18 },
});
