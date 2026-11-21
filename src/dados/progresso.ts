import AsyncStorage from '@react-native-async-storage/async-storage';
import { PERSONAGENS, RARIDADES, Raridade, custoNivel, NIVEL_MAX } from './personagens';
import { Mapa } from './mapas';

export interface Progresso {
  nome: string;
  trofeus: number;
  moedas: number;
  gemas: number;
  liberados: Record<string, number>; // id -> nível
  escolhido: string;
  meusMapas: Mapa[];
  vitorias: number;
  partidas: number;
  gols: number;
  ultimoPremioDiario: string;
}

export const PROGRESSO_INICIAL: Progresso = {
  nome: 'Craque', trofeus: 0, moedas: 150, gemas: 10, liberados: { chico: 1 }, escolhido: 'chico',
  meusMapas: [], vitorias: 0, partidas: 0, gols: 0, ultimoPremioDiario: '',
};

const CHAVE = 'claude-futebol-progresso-v1';

export async function carregar(): Promise<Progresso> {
  try {
    const t = await AsyncStorage.getItem(CHAVE);
    if (!t) return { ...PROGRESSO_INICIAL };
    return { ...PROGRESSO_INICIAL, ...JSON.parse(t) };
  } catch { return { ...PROGRESSO_INICIAL }; }
}

export async function salvar(p: Progresso) {
  try { await AsyncStorage.setItem(CHAVE, JSON.stringify(p)); } catch {}
}

// estrada de troféus: libera personagens quando alcança os troféus
export function liberarPorTrofeus(p: Progresso): string[] {
  const novos: string[] = [];
  for (const c of PERSONAGENS) {
    if (c.trofeusParaLiberar !== undefined && p.trofeus >= c.trofeusParaLiberar && !p.liberados[c.id]) {
      p.liberados[c.id] = 1; novos.push(c.id);
    }
  }
  return novos;
}

export const PRECO_CAIXA = { normal: 100, mega: 30 }; // moedas / gemas

export type PremioCaixa = { tipo: 'moedas'; qtd: number } | { tipo: 'gemas'; qtd: number } | { tipo: 'personagem'; id: string };

// abre uma caixa: chance de vir personagem novo, se não vem moedas/gemas
export function abrirCaixa(p: Progresso, mega: boolean): PremioCaixa[] {
  const premios: PremioCaixa[] = [];
  const rodadas = mega ? 3 : 1;
  for (let i = 0; i < rodadas; i++) {
    const faltando = PERSONAGENS.filter(c => !p.liberados[c.id] && c.raridade !== 'inicial');
    const chanceNovo = mega ? 0.45 : 0.22;
    if (faltando.length && Math.random() < chanceNovo) {
      // sorteia raridade pelos pesos, só entre as que ainda faltam
      const pesos = faltando.map(c => RARIDADES[c.raridade as Raridade].chanceCaixa);
      const soma = pesos.reduce((a, b) => a + b, 0);
      let r = Math.random() * soma;
      let escolhido = faltando[0];
      for (let k = 0; k < faltando.length; k++) { r -= pesos[k]; if (r <= 0) { escolhido = faltando[k]; break; } }
      p.liberados[escolhido.id] = 1;
      premios.push({ tipo: 'personagem', id: escolhido.id });
    } else if (Math.random() < 0.15) {
      const g = 2 + Math.floor(Math.random() * 5); p.gemas += g; premios.push({ tipo: 'gemas', qtd: g });
    } else {
      const m = 30 + Math.floor(Math.random() * 90); p.moedas += m; premios.push({ tipo: 'moedas', qtd: m });
    }
  }
  return premios;
}

export function podeEvoluir(p: Progresso, id: string) {
  const n = p.liberados[id];
  return n && n < NIVEL_MAX && p.moedas >= custoNivel(n);
}

export function evoluir(p: Progresso, id: string) {
  const n = p.liberados[id];
  if (!podeEvoluir(p, id)) return false;
  p.moedas -= custoNivel(n); p.liberados[id] = n + 1; return true;
}

export function hoje() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }

export function resultadoPartida(p: Progresso, venceu: 0 | 1 | 2, golsMeus: number) {
  // venceu: 0 = vitória, 1 = derrota, 2 = empate
  const t = venceu === 0 ? 8 : venceu === 1 ? -4 : 2;
  const m = venceu === 0 ? 40 : venceu === 1 ? 15 : 25;
  p.trofeus = Math.max(0, p.trofeus + t); p.moedas += m + golsMeus * 5;
  p.partidas++; if (venceu === 0) p.vitorias++; p.gols += golsMeus;
  const novos = liberarPorTrofeus(p);
  return { trofeus: t, moedas: m + golsMeus * 5, novos };
}
