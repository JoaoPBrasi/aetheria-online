let context: AudioContext | undefined;

export function unlockCombatAudio() {
  if (typeof AudioContext === 'undefined') return;
  context ??= new AudioContext();
  if (context.state === 'suspended')
    void context.resume().catch(() => undefined);
}

export function playCombatSound(kind: 'strike' | 'hurt' | 'heal') {
  if (context?.state !== 'running') return;
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const frequencies = { strike: [230, 83], hurt: [120, 51], heal: [390, 590] };
  const [start, end] = frequencies[kind];
  oscillator.type = kind === 'strike' ? 'triangle' : 'sine';
  oscillator.frequency.setValueAtTime(start!, now);
  oscillator.frequency.exponentialRampToValueAtTime(end!, now + 0.12);
  gain.gain.setValueAtTime(0.075, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.17);
}
