// Sons no site: Web Audio (toca vários sons ao mesmo tempo, sem atraso)
import { Asset } from 'expo-asset';
import { SONS, NomeSom } from './sonsLista';

let ctx: AudioContext | null = null;
let mestre: GainNode | null = null;
const buffers: Partial<Record<NomeSom, AudioBuffer>> = {};
let fundo: { src: AudioBufferSourceNode; ganho: GainNode } | null = null;
let mudo = false;

function contexto() {
  if (!ctx) {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC(); mestre = ctx!.createGain(); mestre.gain.value = 1; mestre.connect(ctx!.destination);
    const destravar = () => { ctx?.resume(); };
    window.addEventListener('pointerdown', destravar); window.addEventListener('keydown', destravar);
  }
  return ctx;
}

export async function carregarSons() {
  const c = contexto(); if (!c) return;
  await Promise.all((Object.keys(SONS) as NomeSom[]).map(async n => {
    if (buffers[n]) return;
    try {
      const a = Asset.fromModule(SONS[n]);
      const buf = await (await fetch(a.uri)).arrayBuffer();
      buffers[n] = await c.decodeAudioData(buf);
    } catch {}
  }));
}

export function tocar(n: NomeSom, volume = 1, velocidade = 1) {
  const c = contexto(); const b = buffers[n]; if (!c || !b || !mestre || mudo) return;
  if (c.state === 'suspended') c.resume();
  const src = c.createBufferSource(); src.buffer = b; src.playbackRate.value = velocidade;
  const g = c.createGain(); g.gain.value = volume; src.connect(g); g.connect(mestre); src.start();
}

export function torcida(ligar: boolean, volume = 0.5) {
  const c = contexto(); if (!c || !mestre) return;
  if (ligar) {
    if (!fundo && buffers.torcida) {
      const src = c.createBufferSource(); src.buffer = buffers.torcida; src.loop = true;
      const g = c.createGain(); g.gain.value = mudo ? 0 : volume; src.connect(g); g.connect(mestre); src.start();
      fundo = { src, ganho: g };
    } else if (fundo) fundo.ganho.gain.setTargetAtTime(mudo ? 0 : volume, c.currentTime, 0.3);
  } else if (fundo) { try { fundo.src.stop(); } catch {} fundo = null; }
}

export function setMudo(m: boolean) { mudo = m; if (fundo && ctx) fundo.ganho.gain.value = m ? 0 : 0.5; }
export function estaMudo() { return mudo; }
