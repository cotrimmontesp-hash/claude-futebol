// Mapas: o jogador pode criar o seu e jogar o dos outros
export type Tema = 'grama' | 'areia' | 'neve' | 'rua' | 'lua';
export type Peca = 'muro' | 'arbusto' | 'acelerador' | 'lama' | 'pula';
export type Tamanho = 'pequeno' | 'medio' | 'grande';

export interface Mapa {
  id: string;
  nome: string;
  autor: string;
  tema: Tema;
  tamanho: Tamanho;
  noite: boolean;
  chuva: boolean;
  golLargura: number; // metros
  pecas: { tipo: Peca; c: number; l: number }[]; // coluna e linha na grade
  curtidas?: number;
  jogadas?: number;
  criadoEm?: number;
}

export const CELULA = 3; // metros por célula da grade
export const DIM: Record<Tamanho, { comp: number; larg: number }> = {
  pequeno: { comp: 48, larg: 30 },
  medio: { comp: 60, larg: 36 },
  grande: { comp: 72, larg: 42 },
};
export const grade = (t: Tamanho) => ({ cols: DIM[t].comp / CELULA, lins: DIM[t].larg / CELULA });

export const TEMAS: Record<Tema, { nome: string; grama1: number; grama2: number; linhas: number; fora: number; ceu: number; gravidade: number; atrito: number }> = {
  grama: { nome: 'Estádio', grama1: 0x2f8a3a, grama2: 0x3a9b45, linhas: 0xffffff, fora: 0x1f5e27, ceu: 0x87b9e8, gravidade: 18, atrito: 0.55 },
  areia: { nome: 'Praia', grama1: 0xd9c08a, grama2: 0xe3cc98, linhas: 0x1d4ed8, fora: 0x2b8fd6, ceu: 0x9fd7ff, gravidade: 18, atrito: 1.3 },
  neve: { nome: 'Neve', grama1: 0xe9f1f7, grama2: 0xf5f9fc, linhas: 0xd62828, fora: 0xcfdde8, ceu: 0xb9c7d6, gravidade: 18, atrito: 0.3 },
  rua: { nome: 'Quadra de Rua', grama1: 0x55585e, grama2: 0x5e6168, linhas: 0xffd60a, fora: 0x3a3c40, ceu: 0xf2a65a, gravidade: 18, atrito: 0.7 },
  lua: { nome: 'Lua', grama1: 0x8e8e93, grama2: 0x9a9aa0, linhas: 0x7df9ff, fora: 0x2b2b30, ceu: 0x05050d, gravidade: 6, atrito: 0.45 },
};

export const PECAS: Record<Peca, { nome: string; cor: string; desc: string }> = {
  muro: { nome: 'Muro', cor: '#8d6e63', desc: 'Bloqueia bola e jogadores' },
  arbusto: { nome: 'Arbusto', cor: '#2e7d32', desc: 'Esconde quem estiver dentro' },
  acelerador: { nome: 'Acelerador', cor: '#00e5ff', desc: 'Deixa quem passa mais rápido' },
  lama: { nome: 'Lama', cor: '#6d4c41', desc: 'Deixa quem passa mais lento' },
  pula: { nome: 'Trampolim', cor: '#ff4081', desc: 'Faz a bola pular alto' },
};

export const MAPA_PADRAO: Mapa = {
  id: 'oficial-estadio', nome: 'Estádio Claude', autor: 'Oficial', tema: 'grama', tamanho: 'medio',
  noite: false, chuva: false, golLargura: 8, pecas: [],
};

export const MAPAS_OFICIAIS: Mapa[] = [
  MAPA_PADRAO,
  { id: 'oficial-noite', nome: 'Clássico à Noite', autor: 'Oficial', tema: 'grama', tamanho: 'grande', noite: true, chuva: true, golLargura: 9,
    pecas: [{ tipo: 'arbusto', c: 6, l: 2 }, { tipo: 'arbusto', c: 6, l: 9 }, { tipo: 'arbusto', c: 17, l: 2 }, { tipo: 'arbusto', c: 17, l: 9 }] },
  { id: 'oficial-praia', nome: 'Praia do Gol', autor: 'Oficial', tema: 'areia', tamanho: 'pequeno', noite: false, chuva: false, golLargura: 7,
    pecas: [{ tipo: 'muro', c: 8, l: 4 }, { tipo: 'muro', c: 7, l: 5 }, { tipo: 'pula', c: 4, l: 2 }, { tipo: 'pula', c: 11, l: 7 }] },
  { id: 'oficial-lua', nome: 'Gol na Lua', autor: 'Oficial', tema: 'lua', tamanho: 'medio', noite: true, chuva: false, golLargura: 8,
    pecas: [{ tipo: 'acelerador', c: 5, l: 5 }, { tipo: 'acelerador', c: 14, l: 6 }, { tipo: 'muro', c: 10, l: 3 }, { tipo: 'muro', c: 9, l: 8 }] },
];

// código de compartilhar: texto curto que dá pra mandar no zap
export function mapaParaCodigo(m: Mapa): string {
  const t = ['grama', 'areia', 'neve', 'rua', 'lua'].indexOf(m.tema);
  const z = ['pequeno', 'medio', 'grande'].indexOf(m.tamanho);
  const p = ['muro', 'arbusto', 'acelerador', 'lama', 'pula'];
  const pecas = m.pecas.map(x => `${p.indexOf(x.tipo)}.${x.c}.${x.l}`).join('_');
  const nome = encodeURIComponent(m.nome).replace(/-/g, '%2D');
  return `CF1-${t}${z}${m.noite ? 1 : 0}${m.chuva ? 1 : 0}${m.golLargura}-${nome}-${pecas}`;
}

export function codigoParaMapa(cod: string, autor = 'Amigo'): Mapa | null {
  try {
    const partes = cod.trim().split('-');
    if (partes[0] !== 'CF1' || partes.length < 3) return null;
    const cfg = partes[1];
    const temas: Tema[] = ['grama', 'areia', 'neve', 'rua', 'lua'];
    const tams: Tamanho[] = ['pequeno', 'medio', 'grande'];
    const p: Peca[] = ['muro', 'arbusto', 'acelerador', 'lama', 'pula'];
    const pecasTxt = partes.slice(3).join('-');
    const pecas = pecasTxt ? pecasTxt.split('_').map(s => { const [a, b, c] = s.split('.').map(Number); return { tipo: p[a], c: b, l: c }; }).filter(x => x.tipo) : [];
    return {
      id: 'cod-' + Math.abs(hash(cod)), nome: decodeURIComponent(partes[2]) || 'Mapa', autor,
      tema: temas[+cfg[0]] ?? 'grama', tamanho: tams[+cfg[1]] ?? 'medio', noite: cfg[2] === '1', chuva: cfg[3] === '1',
      golLargura: Math.min(12, Math.max(5, parseInt(cfg.slice(4), 10) || 8)), pecas,
    };
  } catch { return null; }
}

function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }
