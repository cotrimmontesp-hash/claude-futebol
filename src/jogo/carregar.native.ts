// Celular: lê o .glb do aparelho e transforma em modelo 3D
import { Asset } from 'expo-asset';
import * as FS from 'expo-file-system/legacy';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ARQUIVOS_MODELOS } from './modelos';

// o Hermes pode não ter TextDecoder, que o GLTFLoader usa
if (typeof (globalThis as any).TextDecoder === 'undefined') {
  (globalThis as any).TextDecoder = class {
    decode(arr: ArrayBuffer | Uint8Array) {
      const b = arr instanceof Uint8Array ? arr : new Uint8Array(arr);
      let s = ''; let i = 0;
      while (i < b.length) {
        const c = b[i++];
        if (c < 0x80) s += String.fromCharCode(c);
        else if (c < 0xe0) s += String.fromCharCode(((c & 0x1f) << 6) | (b[i++] & 0x3f));
        else if (c < 0xf0) s += String.fromCharCode(((c & 0x0f) << 12) | ((b[i++] & 0x3f) << 6) | (b[i++] & 0x3f));
        else { const cp = ((c & 0x07) << 18) | ((b[i++] & 0x3f) << 12) | ((b[i++] & 0x3f) << 6) | (b[i++] & 0x3f); const u = cp - 0x10000; s += String.fromCharCode(0xd800 + (u >> 10), 0xdc00 + (u & 0x3ff)); }
      }
      return s;
    }
  };
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function base64ParaBuffer(b64: string): ArrayBuffer {
  const limpo = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const tam = Math.floor((limpo.length * 3) / 4);
  const out = new Uint8Array(tam); let o = 0;
  for (let i = 0; i < limpo.length; i += 4) {
    const a = B64.indexOf(limpo[i]), b = B64.indexOf(limpo[i + 1]), c = B64.indexOf(limpo[i + 2]), d = B64.indexOf(limpo[i + 3]);
    const n = (a << 18) | (b << 12) | ((c & 63) << 6) | (d & 63);
    if (o < tam) out[o++] = (n >> 16) & 255;
    if (c >= 0 && o < tam) out[o++] = (n >> 8) & 255;
    if (d >= 0 && o < tam) out[o++] = n & 255;
  }
  return out.buffer;
}

const cache: Record<string, GLTF> = {};

export async function carregarModelos(ids: string[]): Promise<Record<string, GLTF>> {
  const loader = new GLTFLoader();
  const out: Record<string, GLTF> = {};
  for (const id of [...new Set(ids)]) {
    if (cache[id]) { out[id] = cache[id]; continue; }
    try {
      const a = Asset.fromModule(ARQUIVOS_MODELOS[id]);
      await a.downloadAsync();
      const b64 = await FS.readAsStringAsync(a.localUri ?? a.uri, { encoding: FS.EncodingType.Base64 });
      const g = await loader.parseAsync(base64ParaBuffer(b64), '');
      cache[id] = g; out[id] = g;
    } catch (err) { console.warn('modelo falhou', id, err); }
  }
  return out;
}
