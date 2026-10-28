import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useCallback, useEffect, useRef } from 'react';
import { CHORD_SOUNDS } from './chordSounds';

// 코드별 플레이어를 만들어 두고, 누르고 있는 동안 반복 재생한다.
export function useChordPlayer(preload: string[]) {
  const players = useRef(new Map<string, AudioPlayer>());
  const current = useRef<string | null>(null);

  const getPlayer = useCallback((chord: string) => {
    let p = players.current.get(chord);
    if (!p && CHORD_SOUNDS[chord] != null) {
      p = createAudioPlayer(CHORD_SOUNDS[chord]);
      p.loop = true;
      players.current.set(chord, p);
    }
    return p;
  }, []);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }).catch(() => {});
  }, []);

  useEffect(() => {
    preload.forEach(getPlayer);
  }, [preload, getPlayer]);

  useEffect(() => {
    const map = players.current;
    return () => {
      map.forEach((p) => p.remove());
      map.clear();
    };
  }, []);

  const stop = useCallback(() => {
    if (current.current) players.current.get(current.current)?.pause();
    current.current = null;
  }, []);

  const play = useCallback(
    (chord: string) => {
      stop();
      const p = getPlayer(chord);
      if (!p) return;
      current.current = chord;
      p.seekTo(0).catch(() => {});
      p.play();
    },
    [getPlayer, stop],
  );

  return { play, stop };
}
