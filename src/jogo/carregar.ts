// Web: baixa o .glb e transforma em modelo 3D
import { Asset } from 'expo-asset';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ARQUIVOS_MODELOS } from './modelos';

const cache: Record<string, GLTF> = {};

export async function carregarModelos(ids: string[]): Promise<Record<string, GLTF>> {
  const loader = new GLTFLoader();
  const out: Record<string, GLTF> = {};
  await Promise.all([...new Set(ids)].map(async id => {
    if (cache[id]) { out[id] = cache[id]; return; }
    try {
      const a = Asset.fromModule(ARQUIVOS_MODELOS[id]);
      const buf = await (await fetch(a.uri)).arrayBuffer();
      const g = await loader.parseAsync(buf, '');
      cache[id] = g; out[id] = g;
    } catch (err) { console.warn('modelo falhou', id, err); }
  }));
  return out;
}
