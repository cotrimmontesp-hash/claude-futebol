// Motor do jogo: regras, física da bola, supers e inteligência dos bots. Sem gráficos aqui.
import { Personagem, porId, bonusNivel, GOLEIROS } from '../dados/personagens';
import { Mapa, DIM, CELULA, grade, TEMAS, Peca } from '../dados/mapas';

export type Anim = 'parado' | 'correr' | 'chutar' | 'comemorar' | 'defender';

export interface Jogador {
  idx: number;
  time: 0 | 1;
  p: Personagem;
  x: number; z: number; y: number;
  vx: number; vz: number; vy: number;
  dir: number;        // ângulo para onde olha (rad, 0 = +x)
  vel: number;
  chute: number;
  superCarga: number; // 0..1
  atordoado: number; congelado: number; escudo: number; turbo: number; fogo: number;
  carrinho: number;   // tempo restante do carrinho
  recargaChute: number;
  dash: { vx: number; vz: number; t: number } | null;
  pulo: { tx: number; tz: number; t: number; dur: number; ox: number; oz: number } | null;
  anim: Anim; animT: number;
  humano: boolean;
  escondido: boolean;
  homeX: number; homeZ: number;
  goleiro: boolean;
  defesa: { t: number; lado: number } | null;
  segura: number; // tempo segurando a bola (goleiro)
}

export interface Bola {
  x: number; y: number; z: number; vx: number; vy: number; vz: number;
  dono: number; // índice do jogador ou -1
  semDono: number; // tempo em que ninguém pode pegar
  ultimo: number; // último a tocar
  especial: '' | 'canhao' | 'ouro';
  especialT: number;
}

export interface Efeito { tipo: 'muro' | 'gelo' | 'ciclone' | 'fogo' | 'impacto' | 'teleporte' | 'gol'; x: number; z: number; t: number; dur: number; ang?: number; time?: number; }

export interface Muro { x: number; z: number; hx: number; hz: number; t: number; temp: boolean; }

export interface Entrada { mx: number; mz: number; chutar: boolean; mirar: { x: number; z: number } | null; usarSuper: boolean; }

export interface Estado {
  mapa: Mapa;
  comp: number; larg: number; golL: number;
  jogadores: Jogador[];
  bola: Bola;
  placar: [number, number];
  tempo: number;          // segundos restantes
  prorrogacao: boolean;
  fase: 'saida' | 'jogo' | 'gol' | 'fim';
  faseT: number;
  muros: Muro[];
  zonas: { tipo: Peca; x: number; z: number; h: number }[];
  efeitos: Efeito[];
  vencedor: -1 | 0 | 1 | 2; // 2 = empate
  eventos: string[]; // sons/mensagens para a tela
  gravidade: number; atrito: number;
  golsJogador: number;
  chuvaAtiva: boolean;
}

const RAIO_JOG = 0.45;
const RAIO_BOLA = 0.22;
const DURACAO = 150;
const GOLS_VITORIA = 3;

export function criarPartida(mapa: Mapa, meuTime: { id: string; nivel: number }[], adversarios: { id: string; nivel: number }[]): Estado {
  const { comp, larg } = DIM[mapa.tamanho];
  const tema = TEMAS[mapa.tema];
  const jogadores: Jogador[] = [];
  const add = (time: 0 | 1, id: string, nivel: number, humano: boolean, hx: number, hz: number, goleiro = false) => {
    const p = goleiro ? GOLEIROS[time] : porId(id); const b = bonusNivel(nivel);
    jogadores.push({
      idx: jogadores.length, time, p, x: hx, z: hz, y: 0, vx: 0, vz: 0, vy: 0, dir: time === 0 ? 0 : Math.PI,
      vel: p.velocidade * b, chute: p.chute * (1 + (b - 1) * 0.5), superCarga: 0,
      atordoado: 0, congelado: 0, escudo: 0, turbo: 0, fogo: 0, carrinho: 0, recargaChute: 0, dash: null, pulo: null,
      anim: 'parado', animT: 0, humano, escondido: false, homeX: hx, homeZ: hz, goleiro, defesa: null, segura: 0,
    });
  };
  const posicoes = (s: number) => [[-comp * 0.18 * s, 0], [-comp * 0.32 * s, -larg * 0.25], [-comp * 0.32 * s, larg * 0.25]];
  meuTime.forEach((m, i) => { const [x, z] = posicoes(1)[i]; add(0, m.id, m.nivel, i === 0, x, z); });
  adversarios.forEach((m, i) => { const [x, z] = posicoes(-1)[i]; add(1, m.id, m.nivel, false, x, z); });
  add(0, 'goleiro_a', meuTime[0]?.nivel ?? 1, false, -comp / 2 + 1.2, 0, true);
  add(1, 'goleiro_b', adversarios[0]?.nivel ?? 1, false, comp / 2 - 1.2, 0, true);

  const { cols, lins } = grade(mapa.tamanho);
  const muros: Muro[] = []; const zonas: Estado['zonas'] = [];
  for (const pc of mapa.pecas) {
    if (pc.c < 0 || pc.l < 0 || pc.c >= cols || pc.l >= lins) continue;
    const x = -comp / 2 + (pc.c + 0.5) * CELULA; const z = -larg / 2 + (pc.l + 0.5) * CELULA;
    if (pc.tipo === 'muro') muros.push({ x, z, hx: CELULA / 2, hz: CELULA / 2, t: 1e9, temp: false });
    else zonas.push({ tipo: pc.tipo, x, z, h: CELULA / 2 });
  }

  const e: Estado = {
    mapa, comp, larg, golL: mapa.golLargura, jogadores,
    bola: { x: 0, y: RAIO_BOLA, z: 0, vx: 0, vy: 0, vz: 0, dono: -1, semDono: 0, ultimo: -1, especial: '', especialT: 0 },
    placar: [0, 0], tempo: DURACAO, prorrogacao: false, fase: 'saida', faseT: 2.2,
    muros, zonas, efeitos: [], vencedor: -1, eventos: [], gravidade: tema.gravidade, atrito: tema.atrito, golsJogador: 0, chuvaAtiva: mapa.chuva,
  };
  return e;
}

function reposicionar(e: Estado, quemSai: 0 | 1) {
  for (const j of e.jogadores) {
    j.x = j.homeX; j.z = j.homeZ; j.vx = j.vz = 0; j.y = 0; j.vy = 0; j.dash = null; j.pulo = null;
    j.atordoado = j.congelado = 0; j.carrinho = 0; j.dir = j.time === 0 ? 0 : Math.PI; j.anim = 'parado'; j.defesa = null; j.segura = 0;
  }
  const b = e.bola; b.x = 0; b.z = 0; b.y = RAIO_BOLA; b.vx = b.vy = b.vz = 0; b.dono = -1; b.especial = '';
  // quem sofreu o gol sai com a bola: o atacante dele fica mais perto
  const saidor = e.jogadores.find(j => j.time === quemSai && !j.goleiro);
  if (saidor) { saidor.x = quemSai === 0 ? -1.2 : 1.2; saidor.z = 0; }
  e.muros = e.muros.filter(m => !m.temp);
  e.fase = 'saida'; e.faseT = 1.6;
}

const dist = (ax: number, az: number, bx: number, bz: number) => Math.hypot(ax - bx, az - bz);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const golDe = (e: Estado, time: 0 | 1) => (time === 0 ? e.comp / 2 : -e.comp / 2); // x do gol que esse time ataca

function zonaEm(e: Estado, x: number, z: number) {
  for (const zn of e.zonas) if (Math.abs(x - zn.x) < zn.h && Math.abs(z - zn.z) < zn.h) return zn.tipo;
  return null;
}

// ---------- ações ----------
function chutar(e: Estado, j: Jogador, ax: number, az: number, forca = 1) {
  const b = e.bola;
  const n = Math.hypot(ax, az) || 1;
  const vel = j.chute * forca;
  b.dono = -1; b.semDono = 0.25; b.ultimo = j.idx;
  b.vx = (ax / n) * vel; b.vz = (az / n) * vel;
  b.vy = forca > 1.2 ? 2.5 : 3.5 + Math.random() * 1.5;
  b.x = j.x + (ax / n) * 0.7; b.z = j.z + (az / n) * 0.7;
  j.dir = Math.atan2(az, ax); j.anim = 'chutar'; j.animT = 0; j.recargaChute = 0.35;
  carregar(j, 0.18);
  e.eventos.push('chute');
}

function carregar(j: Jogador, q: number) { j.superCarga = clamp(j.superCarga + q * j.p.superCarga, 0, 1); }

function carrinho(e: Estado, j: Jogador, ax: number, az: number) {
  const n = Math.hypot(ax, az) || 1;
  j.dash = { vx: (ax / n) * 13, vz: (az / n) * 13, t: 0.18 + j.p.desarme * 0.03 };
  j.carrinho = j.dash.t; j.recargaChute = 0.7; j.dir = Math.atan2(az, ax);
  j.anim = 'chutar'; j.animT = 0;
  e.eventos.push('carrinho');
}

function derrubar(e: Estado, alvo: Jogador, t: number) {
  if (alvo.escudo > 0) return false;
  if (alvo.goleiro && e.bola.dono === alvo.idx) return false;
  alvo.atordoado = Math.max(alvo.atordoado, t);
  if (e.bola.dono === alvo.idx) { e.bola.dono = -1; e.bola.semDono = 0.15; e.bola.vx = (Math.random() - 0.5) * 6; e.bola.vz = (Math.random() - 0.5) * 6; e.bola.vy = 3; }
  return true;
}

function usarSuper(e: Estado, j: Jogador, ax: number, az: number) {
  if (j.superCarga < 1 || j.goleiro) return;
  j.superCarga = 0;
  const b = e.bola; const n = Math.hypot(ax, az) || 1; const dx = ax / n, dz = az / n;
  const inimigos = e.jogadores.filter(o => o.time !== j.time);
  e.eventos.push('super:' + j.p.superTipo);
  switch (j.p.superTipo) {
    case 'canhao':
      if (b.dono === j.idx) { chutar(e, j, dx, dz, 1.9); b.especial = 'canhao'; b.especialT = 1.5; b.vy = 1; }
      else { j.dash = { vx: dx * 22, vz: dz * 22, t: 0.3 }; j.carrinho = 0.3; }
      break;
    case 'arrancada':
      j.dash = { vx: dx * 26, vz: dz * 26, t: 0.35 }; j.carrinho = 0.35; j.escudo = Math.max(j.escudo, 0.35);
      break;
    case 'muralha': {
      const mx = j.x + dx * 4, mz = j.z + dz * 4;
      const horiz = Math.abs(dx) > Math.abs(dz);
      e.muros.push({ x: mx, z: mz, hx: horiz ? 0.5 : 3.5, hz: horiz ? 3.5 : 0.5, t: 6, temp: true });
      e.efeitos.push({ tipo: 'muro', x: mx, z: mz, t: 0, dur: 0.4 });
      break;
    }
    case 'escudo': j.escudo = 4; j.turbo = 4; break;
    case 'pulo': {
      const tx = clamp(j.x + dx * 9, -e.comp / 2 + 1, e.comp / 2 - 1), tz = clamp(j.z + dz * 9, -e.larg / 2 + 1, e.larg / 2 - 1);
      j.pulo = { tx, tz, t: 0, dur: 0.8, ox: j.x, oz: j.z };
      break;
    }
    case 'congelar':
      for (const o of inimigos) if (dist(o.x, o.z, j.x, j.z) < 8 && o.escudo <= 0) { o.congelado = 2.2; if (b.dono === o.idx) { b.dono = -1; b.semDono = 0.1; } }
      e.efeitos.push({ tipo: 'gelo', x: j.x, z: j.z, t: 0, dur: 0.8 });
      break;
    case 'ciclone':
      for (const o of inimigos) {
        const d = dist(o.x, o.z, j.x, j.z);
        if (d < 8 && o.escudo <= 0) {
          const ux = (o.x - j.x) / (d || 1), uz = (o.z - j.z) / (d || 1);
          o.dash = { vx: ux * 24, vz: uz * 24, t: 0.35 }; derrubar(e, o, 0.9);
        }
      }
      e.efeitos.push({ tipo: 'ciclone', x: j.x, z: j.z, t: 0, dur: 1 });
      break;
    case 'ima':
      if (dist(b.x, b.z, j.x, j.z) < 20) {
        if (b.dono >= 0) { const d = e.jogadores[b.dono]; if (d.escudo <= 0) d.atordoado = Math.max(d.atordoado, 0.4); }
        b.dono = j.idx; b.vx = b.vz = 0; b.ultimo = j.idx;
      }
      e.efeitos.push({ tipo: 'impacto', x: j.x, z: j.z, t: 0, dur: 0.5 });
      break;
    case 'teleporte': {
      e.efeitos.push({ tipo: 'teleporte', x: j.x, z: j.z, t: 0, dur: 0.6 });
      j.x = clamp(j.x + dx * 11, -e.comp / 2 + 0.8, e.comp / 2 - 0.8); j.z = clamp(j.z + dz * 11, -e.larg / 2 + 0.8, e.larg / 2 - 0.8);
      e.efeitos.push({ tipo: 'teleporte', x: j.x, z: j.z, t: 0, dur: 0.6 });
      break;
    }
    case 'chute_ouro':
      if (b.dono !== j.idx && dist(b.x, b.z, j.x, j.z) < 7 && b.dono < 0) b.dono = j.idx;
      if (b.dono === j.idx) {
        const gx = golDe(e, j.time);
        chutar(e, j, gx - j.x, -j.z, 1.5); b.especial = 'ouro'; b.especialT = 3; b.vy = 1.5;
      } else { j.turbo = 3; }
      break;
    case 'fogo': j.fogo = 5; j.turbo = 5; break;
  }
}

// ---------- IA ----------
function iaGoleiro(e: Estado, j: Jogador): Entrada {
  const b = e.bola;
  const ent: Entrada = { mx: 0, mz: 0, chutar: false, mirar: null, usarSuper: false };
  const meuGol = -golDe(e, j.time); const sx = meuGol > 0 ? -1 : 1; // para dentro do campo
  const ir = (tx: number, tz: number, devagar = 1) => { const dx = tx - j.x, dz = tz - j.z; const d = Math.hypot(dx, dz); if (d > 0.25) { const k = Math.min(1, d / 1.5) * devagar; ent.mx = (dx / d) * k; ent.mz = (dz / d) * k; } };
  if (b.dono === j.idx) {
    // segura um pouco e lança para o companheiro mais à frente
    j.segura += 1 / 60;
    ir(meuGol + sx * 4, 0, 0.5);
    if (j.segura > 0.9) {
      const comp = e.jogadores.filter(o => o.time === j.time && !o.goleiro && !o.humano || (o.time === j.time && o.humano));
      const alvo = comp.sort((a, c) => (c.x - a.x) * sx - 0)[0];
      ent.chutar = true; ent.mirar = alvo ? { x: alvo.x - j.x + sx * 3, z: alvo.z - j.z } : { x: sx * 20, z: 0 };
      j.segura = 0;
    }
    return ent;
  }
  j.segura = 0;
  const naArea = Math.abs(b.x - meuGol) < 9 && Math.abs(b.z) < e.golL / 2 + 6;
  if (b.dono < 0 && naArea && Math.hypot(b.vx, b.vz) < 9) { ir(b.x, b.z); return ent; }   // sai para pegar bola solta
  if (b.dono >= 0 && e.jogadores[b.dono].time !== j.time && naArea && Math.hypot(b.x - j.x, b.z - j.z) < 3.5) {
    ent.chutar = Math.random() < 0.08; ent.mirar = { x: b.x - j.x, z: b.z - j.z }; ir(b.x, b.z); return ent; // abafa
  }
  // posição: na linha entre a bola e o centro do gol
  const lim = e.golL / 2 - 0.4;
  const tz = Math.max(-lim, Math.min(lim, b.z * 0.55));
  ir(meuGol + sx * 1.3, tz, 0.9);
  return ent;
}

function ia(e: Estado, j: Jogador): Entrada {
  if (j.goleiro) return iaGoleiro(e, j);
  const b = e.bola;
  const ent: Entrada = { mx: 0, mz: 0, chutar: false, mirar: null, usarSuper: false };
  const gx = golDe(e, j.time); const meuGol = -gx;
  const temBola = b.dono === j.idx;
  const companheiros = e.jogadores.filter(o => o.time === j.time && !o.goleiro);
  const inimigos = e.jogadores.filter(o => o.time !== j.time);
  const nossoTimeTem = b.dono >= 0 && e.jogadores[b.dono].time === j.time;
  const delesTem = b.dono >= 0 && e.jogadores[b.dono].time !== j.time;
  const ir = (tx: number, tz: number) => { const dx = tx - j.x, dz = tz - j.z; const d = Math.hypot(dx, dz); if (d > 0.4) { ent.mx = dx / d; ent.mz = dz / d; } };

  if (temBola) {
    const dGol = Math.abs(gx - j.x);
    // desvia do inimigo mais perto
    let alvoZ = clamp(-j.z * 0.3, -e.golL / 2, e.golL / 2);
    const perto = inimigos.reduce((m, o) => (dist(o.x, o.z, j.x, j.z) < dist(m.x, m.z, j.x, j.z) ? o : m), inimigos[0]);
    if (perto && dist(perto.x, perto.z, j.x, j.z) < 4) alvoZ = j.z + (j.z > perto.z ? 5 : -5);
    ir(gx, clamp(alvoZ, -e.larg / 2 + 2, e.larg / 2 - 2));
    if (j.superCarga >= 1 && dGol < 22 && Math.random() < 0.05) { ent.usarSuper = true; ent.mirar = { x: gx - j.x, z: -j.z }; }
    else if (dGol < 15 || (perto && dist(perto.x, perto.z, j.x, j.z) < 2.2 && dGol < 26)) {
      if (Math.random() < 0.12) { ent.chutar = true; ent.mirar = { x: gx - j.x, z: (Math.random() - 0.5) * e.golL * 0.8 - j.z }; }
    }
    return ent;
  }

  // quem é o mais perto da bola no meu time?
  const maisPerto = companheiros.reduce((m, o) => (dist(o.x, o.z, b.x, b.z) < dist(m.x, m.z, b.x, b.z) ? o : m), companheiros[0]);
  if (!nossoTimeTem && maisPerto.idx === j.idx) {
    // prevê a bola um pouco à frente
    ir(b.x + b.vx * 0.25, b.z + b.vz * 0.25);
    if (delesTem) {
      const dono = e.jogadores[b.dono];
      const d = dist(dono.x, dono.z, j.x, j.z);
      if (d < j.p.desarme + 0.8 && j.recargaChute <= 0 && Math.random() < 0.25) { ent.chutar = true; ent.mirar = { x: dono.x - j.x, z: dono.z - j.z }; }
      if (j.superCarga >= 1 && d < 7 && Math.random() < 0.04) { ent.usarSuper = true; ent.mirar = { x: dono.x - j.x, z: dono.z - j.z }; }
    }
  } else if (nossoTimeTem) {
    // apoio: vai para frente, aberto
    const lado = j.homeZ >= 0 ? 1 : -1;
    ir(clamp(b.x + (gx > 0 ? 8 : -8), -e.comp / 2 + 3, e.comp / 2 - 3), lado * e.larg * 0.28);
  } else {
    // defesa: fica entre a bola e o meu gol
    const tx = meuGol + (b.x - meuGol) * 0.35; const tz = b.z * 0.4;
    ir(tx, tz);
  }
  return ent;
}

// ---------- passo da simulação ----------
export function passo(e: Estado, dt: number, entradaHumano: Entrada) {
  e.eventos = [];
  for (const ef of e.efeitos) ef.t += dt;
  e.efeitos = e.efeitos.filter(f => f.t < f.dur);
  for (const m of e.muros) m.t -= dt;
  e.muros = e.muros.filter(m => m.t > 0);

  if (e.fase === 'fim') { for (const j of e.jogadores) animar(j, dt); return; }
  if (e.fase === 'gol' || e.fase === 'saida') {
    e.faseT -= dt;
    for (const j of e.jogadores) animar(j, dt);
    if (e.faseT <= 0) {
      if (e.fase === 'gol') {
        if (e.prorrogacao || e.placar[0] >= GOLS_VITORIA || e.placar[1] >= GOLS_VITORIA) { terminar(e); return; }
        reposicionar(e, (e.bola.ultimo >= 0 && e.jogadores[e.bola.ultimo]?.time === 0) ? 1 : 0);
      } else e.fase = 'jogo';
    }
    if (e.fase !== 'jogo') return;
  }

  e.tempo -= dt;
  if (e.tempo <= 0) {
    if (e.placar[0] === e.placar[1] && !e.prorrogacao) { e.prorrogacao = true; e.tempo = 60; e.eventos.push('prorrogacao'); }
    else { terminar(e); return; }
  }

  const b = e.bola;
  for (const j of e.jogadores) {
    j.atordoado = Math.max(0, j.atordoado - dt); j.congelado = Math.max(0, j.congelado - dt);
    j.escudo = Math.max(0, j.escudo - dt); j.turbo = Math.max(0, j.turbo - dt); j.fogo = Math.max(0, j.fogo - dt);
    j.recargaChute = Math.max(0, j.recargaChute - dt); j.carrinho = Math.max(0, j.carrinho - dt);
    j.superCarga = clamp(j.superCarga + dt * 0.012 * j.p.superCarga, 0, 1); // carrega devagar sozinho

    const ent = j.humano ? entradaHumano : ia(e, j);
    if (j.goleiro && !j.defesa && b.dono < 0 && j.atordoado <= 0 && j.congelado <= 0) {
      const meuGol = -golDe(e, j.time);
      const vemPraCa = (meuGol - b.x) * b.vx > 0 && Math.abs(b.vx) > 6;
      if (vemPraCa) {
        const t = (meuGol - b.x) / b.vx;
        const zc = b.z + b.vz * t;
        if (t < 0.9 && t > 0 && Math.abs(zc) < e.golL / 2 + 1.2 && Math.abs(zc - j.z) > 0.7) {
          const erro = Math.random() < 0.3 ? (Math.random() - 0.5) * 3 : 0;   // às vezes pula errado
          const dz = zc + erro - j.z; const dur = 0.45;
          j.dash = { vx: 0, vz: Math.sign(dz) * Math.min(11, Math.abs(dz) / dur), t: dur };
          const rz = Math.cos(j.dir); // vetor direita do goleiro (-sin d, cos d) -> componente z
          j.defesa = { t: 1.1, lado: Math.sign(dz * rz) || 1 };
          j.anim = 'defender'; j.animT = 0;
          e.eventos.push('defesa');
        }
      }
    }
    if (j.defesa) { j.defesa.t -= dt; if (j.defesa.t <= 0) j.defesa = null; }
    const livre = j.atordoado <= 0 && j.congelado <= 0 && !j.pulo;

    // pulo
    if (j.pulo) {
      j.pulo.t += dt; const k = Math.min(1, j.pulo.t / j.pulo.dur);
      j.x = j.pulo.ox + (j.pulo.tx - j.pulo.ox) * k; j.z = j.pulo.oz + (j.pulo.tz - j.pulo.oz) * k; j.y = Math.sin(k * Math.PI) * 3.5;
      if (k >= 1) {
        j.pulo = null; j.y = 0;
        for (const o of e.jogadores) if (o.time !== j.time && dist(o.x, o.z, j.x, j.z) < 3.5) derrubar(e, o, 1.3);
        e.efeitos.push({ tipo: 'impacto', x: j.x, z: j.z, t: 0, dur: 0.6 });
        e.eventos.push('impacto');
      }
    }

    if (livre) {
      if (ent.usarSuper && j.superCarga >= 1) {
        const a = ent.mirar ?? (b.dono === j.idx ? { x: golDe(e, j.time) - j.x, z: -j.z } : (Math.hypot(ent.mx, ent.mz) > 0.1 ? { x: ent.mx, z: ent.mz } : { x: Math.cos(j.dir), z: Math.sin(j.dir) }));
        usarSuper(e, j, a.x, a.z);
      } else if (ent.chutar && j.recargaChute <= 0) {
        if (b.dono === j.idx) {
          const a = ent.mirar ?? { x: golDe(e, j.time) - j.x, z: (Math.random() - 0.5) * e.golL * 0.7 - j.z };
          chutar(e, j, a.x, a.z);
        } else {
          let a = ent.mirar;
          if (!a) { // mira automática no adversário com a bola ou na bola
            const alvo = b.dono >= 0 && e.jogadores[b.dono].time !== j.time ? e.jogadores[b.dono] : null;
            a = alvo ? { x: alvo.x - j.x, z: alvo.z - j.z } : { x: b.x - j.x, z: b.z - j.z };
          }
          carrinho(e, j, a.x, a.z);
        }
      }
    }

    // movimento
    let mult = 1;
    if (j.turbo > 0) mult *= j.p.superTipo === 'fogo' ? 1.55 : 1.3;
    if (b.dono === j.idx) mult *= 0.9;
    const zona = zonaEm(e, j.x, j.z);
    if (zona === 'acelerador') mult *= 1.45; if (zona === 'lama') mult *= 0.55;
    if (e.mapa.tema === 'neve') mult *= 0.95;
    j.escondido = zona === 'arbusto';

    if (j.dash) {
      j.vx = j.dash.vx; j.vz = j.dash.vz; j.dash.t -= dt; if (j.dash.t <= 0) j.dash = null;
    } else if (livre) {
      const m = Math.min(1, Math.hypot(ent.mx, ent.mz));
      const alvoVx = ent.mx * j.vel * mult, alvoVz = ent.mz * j.vel * mult;
      const acel = e.mapa.tema === 'neve' ? 4 : 12;
      j.vx += (alvoVx - j.vx) * Math.min(1, acel * dt); j.vz += (alvoVz - j.vz) * Math.min(1, acel * dt);
      if (m > 0.1) j.dir = angAprox(j.dir, Math.atan2(ent.mz, ent.mx), dt * 12);
    } else if (!j.pulo) { j.vx *= 0.85; j.vz *= 0.85; }

    if (!j.pulo) { j.x += j.vx * dt; j.z += j.vz * dt; }
    // limites do campo (um pouco além das linhas)
    j.x = clamp(j.x, -e.comp / 2 - 1.5, e.comp / 2 + 1.5); j.z = clamp(j.z, -e.larg / 2 - 1.5, e.larg / 2 + 1.5);
    for (const mu of e.muros) colideCaixa(j, mu, RAIO_JOG);

    // rastro de fogo
    if (j.fogo > 0 && Math.random() < dt * 14) e.efeitos.push({ tipo: 'fogo', x: j.x, z: j.z, t: 0, dur: 1.6, time: j.time });

    // carrinho acerta adversário
    if (j.carrinho > 0) {
      for (const o of e.jogadores) {
        if (o.time === j.time || o.idx === j.idx) continue;
        if (dist(o.x, o.z, j.x, j.z) < j.p.desarme * 0.6 + 0.4) {
          const tinha = b.dono === o.idx;
          if (derrubar(e, o, j.p.superTipo === 'canhao' && j.carrinho > 0.2 ? 1.2 : 0.7)) {
            carregar(j, 0.3);
            if (tinha) { b.dono = j.idx; b.semDono = 0; }
            e.eventos.push('desarme');
          }
          j.carrinho = 0;
        }
      }
    }

    // anim
    const v = Math.hypot(j.vx, j.vz);
    if (j.anim === 'chutar') { j.animT += dt; if (j.animT > 0.5) j.anim = v > 0.6 ? 'correr' : 'parado'; }
    else j.anim = v > 0.6 ? 'correr' : 'parado';
    if (j.pulo) j.anim = 'chutar';
    if (j.defesa) j.anim = 'defender';
    if (j.goleiro) { // goleiro fica perto do gol
      const meuGol = -golDe(e, j.time);
      j.x = clamp(j.x, Math.min(meuGol, meuGol - Math.sign(meuGol) * 10), Math.max(meuGol, meuGol - Math.sign(meuGol) * 10));
      j.z = clamp(j.z, -e.golL / 2 - 6, e.golL / 2 + 6);
    }
  }

  // separa jogadores que se encostam
  for (let a = 0; a < e.jogadores.length; a++) for (let c = a + 1; c < e.jogadores.length; c++) {
    const A = e.jogadores[a], C = e.jogadores[c];
    if (A.pulo || C.pulo) continue;
    const d = dist(A.x, A.z, C.x, C.z);
    if (d < RAIO_JOG * 2 && d > 0.001) { const k = (RAIO_JOG * 2 - d) / 2; const ux = (A.x - C.x) / d, uz = (A.z - C.z) / d; A.x += ux * k; A.z += uz * k; C.x -= ux * k; C.z -= uz * k; }
  }

  // fogo atordoa
  for (const f of e.efeitos) if (f.tipo === 'fogo') for (const o of e.jogadores) if (o.time !== f.time && dist(o.x, o.z, f.x, f.z) < 1 && o.atordoado <= 0) derrubar(e, o, 0.8);

  bolaFisica(e, dt);
}

function angAprox(a: number, b: number, k: number) {
  let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
  return a + d * Math.min(1, k);
}

function colideCaixa(o: { x: number; z: number; vx: number; vz: number }, m: Muro, r: number, quique = 0) {
  const px = clamp(o.x, m.x - m.hx, m.x + m.hx), pz = clamp(o.z, m.z - m.hz, m.z + m.hz);
  const dx = o.x - px, dz = o.z - pz; const d = Math.hypot(dx, dz);
  if (d < r) {
    if (d < 1e-4) { // dentro: empurra pelo lado mais perto
      const ex = m.hx - Math.abs(o.x - m.x), ez = m.hz - Math.abs(o.z - m.z);
      if (ex < ez) { o.x = m.x + Math.sign(o.x - m.x || 1) * (m.hx + r); if (quique) o.vx = -o.vx * quique; }
      else { o.z = m.z + Math.sign(o.z - m.z || 1) * (m.hz + r); if (quique) o.vz = -o.vz * quique; }
      return true;
    }
    const ux = dx / d, uz = dz / d; o.x = px + ux * r; o.z = pz + uz * r;
    if (quique) { const vn = o.vx * ux + o.vz * uz; if (vn < 0) { o.vx -= (1 + quique) * vn * ux; o.vz -= (1 + quique) * vn * uz; } }
    return true;
  }
  return false;
}

function bolaFisica(e: Estado, dt: number) {
  const b = e.bola;
  b.semDono = Math.max(0, b.semDono - dt);
  b.especialT = Math.max(0, b.especialT - dt); if (b.especialT <= 0) b.especial = '';

  if (b.dono >= 0) {
    const j = e.jogadores[b.dono];
    const t = performanceNow() * 0.012;
    const adiante = 0.75 + Math.sin(t) * 0.08;
    b.x = j.x + Math.cos(j.dir) * adiante; b.z = j.z + Math.sin(j.dir) * adiante; b.y = RAIO_BOLA + j.y;
    b.vx = j.vx; b.vz = j.vz; b.vy = 0;
    if (j.atordoado > 0 || j.congelado > 0) { b.dono = -1; b.semDono = 0.2; }
  } else {
    // bola de ouro faz curva até o gol
    if (b.especial === 'ouro' && b.ultimo >= 0) {
      const time = e.jogadores[b.ultimo].time; const gx = golDe(e, time);
      const vel = Math.hypot(b.vx, b.vz); const ax = gx - b.x, az = -b.z; const n = Math.hypot(ax, az) || 1;
      b.vx += ((ax / n) * vel - b.vx) * Math.min(1, dt * 3); b.vz += ((az / n) * vel - b.vz) * Math.min(1, dt * 3);
    }
    b.vy -= e.gravidade * dt;
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    if (b.y < RAIO_BOLA) {
      b.y = RAIO_BOLA;
      if (b.vy < -1.5) { b.vy = -b.vy * 0.5; } else b.vy = 0;
      if (zonaEm(e, b.x, b.z) === 'pula') { b.vy = 11; e.eventos.push('pula'); }
      const atr = b.especial ? 0.1 : e.atrito;
      const f = Math.max(0, 1 - atr * dt); b.vx *= f; b.vz *= f;
      if (e.chuvaAtiva) { b.vx *= 1 - 0.1 * dt; b.vz *= 1 - 0.1 * dt; }
    }
    // paredes / gol
    const meioC = e.comp / 2, meioL = e.larg / 2, golMeio = e.golL / 2;
    if (Math.abs(b.x) > meioC - RAIO_BOLA) {
      if (Math.abs(b.z) < golMeio - RAIO_BOLA && b.y < 2.4) {
        if (Math.abs(b.x) > meioC + 0.4) { gol(e, b.x > 0 ? 0 : 1); return; }
      } else {
        b.x = Math.sign(b.x) * (meioC - RAIO_BOLA); b.vx = -b.vx * 0.6;
        if (Math.abs(b.z) < golMeio + 0.2 && Math.abs(b.z) > golMeio - 0.4) e.eventos.push('trave');
      }
    }
    if (Math.abs(b.z) > meioL - RAIO_BOLA) { b.z = Math.sign(b.z) * (meioL - RAIO_BOLA); b.vz = -b.vz * 0.6; }
    for (const m of e.muros) if (b.y < 2.5 && colideCaixa(b, m, RAIO_BOLA, 0.7)) b.especial = b.especial === 'ouro' ? 'ouro' : '';

    // pegar a bola / bola especial derruba
    if (b.semDono <= 0) {
      const velB = Math.hypot(b.vx, b.vz);
      for (const j of e.jogadores) {
        if (j.atordoado > 0 || j.congelado > 0 || j.pulo) continue;
        const alcance = j.goleiro ? (j.defesa ? 1.5 : 1.0) : RAIO_JOG + RAIO_BOLA + 0.25;
        if (dist(j.x, j.z, b.x, b.z) < alcance && b.y < (j.goleiro ? 2.6 : 1.6)) {
          if (j.goleiro && b.especial && Math.random() < 0.6) { derrubar(e, j, 0.8); b.vx *= 0.8; continue; }
          if (b.especial && b.ultimo >= 0 && e.jogadores[b.ultimo].time !== j.time) {
            if (derrubar(e, j, 1.1)) continue;
          }
          if (!j.goleiro && velB > 26 && j.idx !== b.ultimo && Math.random() < 0.5) continue; // bola muito forte passa
          if (j.goleiro && j.idx !== b.ultimo && velB > 8) { e.eventos.push('defendeu'); b.vx = b.vz = 0; }
          const antes = b.ultimo >= 0 ? e.jogadores[b.ultimo].time : j.time;
          b.dono = j.idx; b.ultimo = j.idx; b.especial = '';
          if (j.time !== antes) carregar(j, 0.1);
          break;
        }
      }
    }
  }
}

function gol(e: Estado, time: 0 | 1) {
  e.placar[time]++;
  e.fase = 'gol'; e.faseT = 3;
  const autor = e.bola.ultimo >= 0 ? e.jogadores[e.bola.ultimo] : null;
  if (autor && autor.humano && autor.time === time) e.golsJogador++;
  e.bola.ultimo = autor && autor.time === time ? autor.idx : (e.jogadores.find(j => j.time === time)?.idx ?? -1);
  for (const j of e.jogadores) { j.anim = j.time === time ? 'comemorar' : 'parado'; j.vx = j.vz = 0; j.dash = null; }
  e.efeitos.push({ tipo: 'gol', x: e.bola.x, z: e.bola.z, t: 0, dur: 3, time });
  e.eventos.push('gol:' + time);
  e.bola.vx *= 0.2; e.bola.vz *= 0.2;
}

function terminar(e: Estado) {
  e.fase = 'fim';
  e.vencedor = e.placar[0] > e.placar[1] ? 0 : e.placar[1] > e.placar[0] ? 1 : 2;
  for (const j of e.jogadores) { j.anim = e.vencedor !== 2 && j.time === e.vencedor ? 'comemorar' : 'parado'; j.vx = j.vz = 0; }
  e.eventos.push('fim');
}

function animar(j: Jogador, dt: number) { j.animT += dt; j.vx *= 0.9; j.vz *= 0.9; }

function performanceNow() { return typeof performance !== 'undefined' ? performance.now() : Date.now(); }

