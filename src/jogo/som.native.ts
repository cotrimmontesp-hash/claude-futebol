// Sons no celular: expo-audio
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import { SONS, NomeSom } from './sonsLista';

const players: Partial<Record<NomeSom, AudioPlayer[]>> = {};
const proximo: Partial<Record<NomeSom, number>> = {};
let mudo = false;
let pronto = false;

export async function carregarSons() {
  if (pronto) return; pronto = true;
  try { await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false } as any); } catch {}
  for (const n of Object.keys(SONS) as NomeSom[]) {
    try {
      const qtd = n === 'chute' || n === 'carrinho' ? 3 : 1; // alguns sons tocam várias vezes seguidas
      players[n] = Array.from({ length: qtd }, () => createAudioPlayer(SONS[n]));
    } catch {}
  }
  const f = players.torcida?.[0]; if (f) f.loop = true;
}

export function tocar(n: NomeSom, volume = 1, velocidade = 1) {
  if (mudo) return;
  const lista = players[n]; if (!lista || !lista.length) return;
  const i = (proximo[n] ?? 0) % lista.length; proximo[n] = i + 1;
  const p = lista[i];
  try { p.volume = Math.min(1, volume); p.setPlaybackRate?.(velocidade); p.seekTo(0); p.play(); } catch {}
}

export function torcida(ligar: boolean, volume = 0.5) {
  const p = players.torcida?.[0]; if (!p) return;
  try {
    if (ligar) { p.volume = mudo ? 0 : volume; if (!p.playing) p.play(); }
    else { p.pause(); p.seekTo(0); }
  } catch {}
}

export function setMudo(m: boolean) { mudo = m; const p = players.torcida?.[0]; if (p) p.volume = m ? 0 : 0.5; }
export function estaMudo() { return mudo; }
