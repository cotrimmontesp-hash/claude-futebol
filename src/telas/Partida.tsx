import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Platform, Pressable, ActivityIndicator, } from 'react-native';
import * as THREE from 'three';
import Palco3D from '../jogo/Palco3D';
import { Cena, ModoCamera } from '../jogo/cena';
import { criarPartida, passo, Estado, Entrada } from '../jogo/motor';
import { carregarModelos } from '../jogo/carregar';
import * as Som from '../jogo/som';
import { Mapa } from '../dados/mapas';
import { porId, PERSONAGENS } from '../dados/personagens';
import Botao from '../ui/Botao';
import { COR } from '../ui/tema';
import { useTela, pontoNaTela } from '../ui/tela';

interface Props {
  mapa: Mapa; meuId: string; meuNivel: number; trofeus: number;
  aoTerminar: (vencedor: 0 | 1 | 2, gols: number) => void;
  sair: () => void;
}

interface Hud { placar: [number, number]; tempo: number; superCarga: number; fase: Estado['fase']; prorrog: boolean; msg: string; vencedor: number; }

const sorteio = <T,>(a: T[]) => a[(Math.random() * a.length) | 0];

export default function Partida({ mapa, meuId, meuNivel, trofeus, aoTerminar, sair }: Props) {
  const tela = useTela(); const { width: W, height: H } = tela;
  const telaRef = useRef(tela); telaRef.current = tela;
  const [pronto, setPronto] = useState(false);
  const [hud, setHud] = useState<Hud>({ placar: [0, 0], tempo: 150, superCarga: 0, fase: 'saida', prorrog: false, msg: '', vencedor: -1 });
  const [camera, setCamera] = useState<ModoCamera>('tv');
  const estado = useRef<Estado | null>(null);
  const modelos = useRef<Record<string, any>>({});
  const cena = useRef<Cena | null>(null);
  const entrada = useRef<Entrada>({ mx: 0, mz: 0, chutar: false, mirar: null, usarSuper: false });
  const msgT = useRef(0); const msgTxt = useRef('');
  const terminou = useRef(false);
  const ctl = useRef(new Controles());

  // monta os times e carrega os modelos do Blender
  useEffect(() => {
    let vivo = true;
    const todos = PERSONAGENS.map(p => p.id);
    const nivelBot = Math.max(1, Math.min(11, Math.round(meuNivel + (trofeus > 300 ? 1 : 0) + (Math.random() - 0.5) * 2)));
    const companheiros = [sorteio(todos.filter(i => i !== meuId)), sorteio(todos.filter(i => i !== meuId))];
    const adv = [sorteio(todos), sorteio(todos), sorteio(todos)];
    const e = criarPartida(mapa, [{ id: meuId, nivel: meuNivel }, ...companheiros.map(id => ({ id, nivel: nivelBot }))], adv.map(id => ({ id, nivel: nivelBot })));
    estado.current = e;
    Promise.all([carregarModelos([meuId, ...companheiros, ...adv, 'goleiro_a', 'goleiro_b', 'estadio', 'bola']), Som.carregarSons().catch(() => {})])
      .then(([m]) => { if (vivo) { modelos.current = m; setPronto(true); } });
    return () => { vivo = false; Som.torcida(false); };
  }, []);

  useEffect(() => { if (cena.current) cena.current.modoCamera = camera; }, [camera]);

  // teclado no computador
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const teclas = new Set<string>();
    const atualiza = () => {
      const k = (a: string[]) => a.some(x => teclas.has(x));
      ctl.current.teclado.mx = (k(['d', 'arrowright']) ? 1 : 0) - (k(['a', 'arrowleft']) ? 1 : 0);
      ctl.current.teclado.mz = (k(['s', 'arrowdown']) ? 1 : 0) - (k(['w', 'arrowup']) ? 1 : 0);
    };
    const baixo = (ev: KeyboardEvent) => {
      const k = ev.key.toLowerCase(); if (teclas.has(k)) return; teclas.add(k); atualiza();
      if (k === ' ' || k === 'j') ctl.current.pedirChute = true;
      if (k === 'e' || k === 'k') ctl.current.pedirSuper = true;
    };
    const cima = (ev: KeyboardEvent) => { teclas.delete(ev.key.toLowerCase()); atualiza(); };
    window.addEventListener('keydown', baixo); window.addEventListener('keyup', cima);
    return () => { window.removeEventListener('keydown', baixo); window.removeEventListener('keyup', cima); };
  }, []);

  const iniciar = (renderer: THREE.WebGLRenderer, w: number, h: number, sombras: boolean) => {
    const e = estado.current!;
    const c = new Cena(renderer, w, h, e, modelos.current, sombras);
    c.modoCamera = camera; cena.current = c;
    let acumulado = 0, hudT = 0;
    return {
      quadro: (dt: number) => {
        const en = ctl.current.ler(entrada.current);
        c.mira = ctl.current.mira();
        acumulado += dt;
        while (acumulado >= 1 / 60) {
          passo(e, 1 / 60, en); acumulado -= 1 / 60;
          en.chutar = false; en.usarSuper = false; en.mirar = null;
          for (const ev of e.eventos) somDoEvento(ev, e);
          for (const ev of e.eventos) {
            if (ev.startsWith('gol:')) { msgTxt.current = ev === 'gol:0' ? 'GOOOOL!' : 'Gol deles...'; msgT.current = 2.6; }
            else if (ev === 'prorrogacao') { msgTxt.current = 'PRORROGAÇÃO! Gol de ouro'; msgT.current = 2.5; }
            else if (ev === 'trave') { msgTxt.current = 'NA TRAVE!'; msgT.current = 1.2; }
            else if (ev.startsWith('super:') && e.jogadores.find(j => j.humano)?.superCarga === 0 && ctl.current.usouSuper) { msgTxt.current = porId(meuId).superNome + '!'; msgT.current = 1.2; ctl.current.usouSuper = false; }
          }
        }
        msgT.current = Math.max(0, msgT.current - dt);
        const perto = Math.min(1, Math.abs(e.bola.x) / (e.comp / 2));
        Som.torcida(e.fase !== 'fim', e.fase === 'gol' ? 0.9 : 0.3 + 0.35 * perto * perto);
        c.atualizar(e, dt);
        hudT -= dt;
        if (hudT <= 0) {
          hudT = 0.05;
          const eu = e.jogadores.find(j => j.humano)!;
          setHud({ placar: [e.placar[0], e.placar[1]], tempo: e.tempo, superCarga: eu.superCarga, fase: e.fase, prorrog: e.prorrogacao, msg: msgT.current > 0 ? msgTxt.current : '', vencedor: e.vencedor });
        }
        if (faseAnt.current === 'saida' && e.fase === 'jogo') Som.tocar('apito', 0.6);
        faseAnt.current = e.fase;
        if (e.fase === 'fim' && !terminou.current) { terminou.current = true; }
      },
      redimensionar: (nw: number, nh: number) => c.redimensionar(nw, nh),
      destruir: () => c.destruir(),
    };
  };

  const faseAnt = useRef<string>('');
  const somDoEvento = (ev: string, e: Estado) => {
    if (ev === 'chute') Som.tocar('chute', 0.9, 0.9 + Math.random() * 0.2);
    else if (ev === 'carrinho') Som.tocar('carrinho', 0.7);
    else if (ev === 'desarme') Som.tocar('chute', 0.6, 0.7);
    else if (ev === 'impacto') Som.tocar('chute_forte', 0.9);
    else if (ev === 'super:congelar') Som.tocar('congelar', 0.9);
    else if (ev.startsWith('super:')) { Som.tocar('super', 0.9); if (ev === 'super:canhao' || ev === 'super:chute_ouro') Som.tocar('chute_forte', 1); }
    else if (ev.startsWith('gol:')) { Som.tocar('gol', 1); Som.tocar('apito', 0.6); }
    else if (ev === 'trave') { Som.tocar('trave', 0.9); Som.tocar('uuh', 0.7); }
    else if (ev === 'defendeu') Som.tocar('uuh', 0.8);
    else if (ev === 'fim') Som.tocar('apito_final', 0.8);
    else if (ev === 'prorrogacao') Som.tocar('apito', 0.8);
    void e;
  };
  const [mudo, setMudoUI] = useState(Som.estaMudo());

  // layout dos botões (em pixels da tela)
  const tamChute = Math.min(H * 0.24, 110), tamSuper = tamChute * 0.78;
  const chute = { x: W - tamChute / 2 - 28, y: H - tamChute / 2 - 26, r: tamChute / 2 };
  const sup = { x: chute.x - tamChute * 1.05, y: H - tamSuper / 2 - 18, r: tamSuper / 2 };
  ctl.current.layout(W, H, chute, sup);

  const toques = Platform.OS === 'web' ? {} : {
    onTouchStart: (ev: any) => { for (const t of ev.nativeEvent.changedTouches) ctl.current.inicio(t.identifier, t.pageX, t.pageY); },
    onTouchMove: (ev: any) => { for (const t of ev.nativeEvent.changedTouches) ctl.current.mover(t.identifier, t.pageX, t.pageY); },
    onTouchEnd: (ev: any) => { for (const t of ev.nativeEvent.changedTouches) ctl.current.fim(t.identifier); },
    onTouchCancel: (ev: any) => { for (const t of ev.nativeEvent.changedTouches) ctl.current.fim(t.identifier); },
  };
  const camada = useRef<View>(null);
  useEffect(() => {
    if (Platform.OS !== 'web' || !pronto) return;
    const el = camada.current as unknown as HTMLElement; if (!el) return;
    // sem isso o navegador do celular "rouba" o arraste para rolar/zoom e o joystick para
    el.style.touchAction = 'none'; (el.style as any).userSelect = 'none'; (el.style as any).webkitUserSelect = 'none';
    document.body.style.touchAction = 'none'; document.body.style.overscrollBehavior = 'none';
    const semRolar = (ev: TouchEvent) => ev.preventDefault();
    el.addEventListener('touchstart', semRolar, { passive: false }); el.addEventListener('touchmove', semRolar, { passive: false });
    const pt = (ev: PointerEvent) => pontoNaTela(telaRef.current, ev.clientX, ev.clientY);
    const d = (ev: PointerEvent) => { ev.preventDefault(); try { el.setPointerCapture?.(ev.pointerId); } catch {} const p = pt(ev); ctl.current.inicio(ev.pointerId, p.x, p.y); };
    const m = (ev: PointerEvent) => { const p = pt(ev); ctl.current.mover(ev.pointerId, p.x, p.y); };
    const u = (ev: PointerEvent) => ctl.current.fim(ev.pointerId);
    el.addEventListener('pointerdown', d); el.addEventListener('pointermove', m); el.addEventListener('pointerup', u); el.addEventListener('pointercancel', u);
    return () => { el.removeEventListener('pointerdown', d); el.removeEventListener('pointermove', m); el.removeEventListener('pointerup', u); el.removeEventListener('pointercancel', u); el.removeEventListener('touchstart', semRolar); el.removeEventListener('touchmove', semRolar); };
  }, [pronto]);

  if (!pronto) return (
    <View style={{ flex: 1, backgroundColor: COR.fundo, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={COR.amarelo} size="large" />
      <Text style={{ color: '#fff', fontWeight: '900', marginTop: 12 }}>Entrando em campo...</Text>
      <Text style={{ color: COR.textoFraco, marginTop: 4 }}>{mapa.nome}</Text>
    </View>
  );

  const j = ctl.current.joy;
  const min = Math.floor(Math.max(0, hud.tempo) / 60), seg = Math.floor(Math.max(0, hud.tempo) % 60);
  const superCheio = hud.superCarga >= 1;

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <Palco3D iniciar={iniciar} />
      {/* camada de toque */}
      <View ref={camada} collapsable={false} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.01)' }} {...toques}>
        {/* joystick */}
        {j.ativo ? (
          <>
            <View pointerEvents="none" style={{ position: 'absolute', left: j.ox - 60, top: j.oy - 60, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)' }} />
            <View pointerEvents="none" style={{ position: 'absolute', left: j.ox + j.dx * 45 - 28, top: j.oy + j.dy * 45 - 28, width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.55)' }} />
          </>
        ) : (
          <Text pointerEvents="none" style={{ position: 'absolute', left: 30, bottom: 30, color: 'rgba(255,255,255,0.45)', fontWeight: '800' }}>{Platform.OS === 'web' ? 'Arraste aqui ou use WASD' : 'Arraste aqui para correr'}</Text>
        )}
        {/* botões */}
        <View pointerEvents="none" style={{ position: 'absolute', left: chute.x - chute.r, top: chute.y - chute.r, width: chute.r * 2, height: chute.r * 2, borderRadius: chute.r, backgroundColor: ctl.current.chuteAtivo ? '#ffe066' : 'rgba(255,214,10,0.85)', borderWidth: 4, borderColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: chute.r * 0.6 }}>⚽</Text>
          <Text style={{ color: '#222', fontWeight: '900', fontSize: 11 }}>CHUTAR</Text>
        </View>
        <View pointerEvents="none" style={{ position: 'absolute', left: sup.x - sup.r, top: sup.y - sup.r, width: sup.r * 2, height: sup.r * 2, borderRadius: sup.r, backgroundColor: superCheio ? '#ffb300' : 'rgba(60,60,80,0.75)', borderWidth: 4, borderColor: superCheio ? '#fff' : 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${hud.superCarga * 100}%`, backgroundColor: superCheio ? 'transparent' : 'rgba(255,179,0,0.55)' }} />
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13 }}>SUPER</Text>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 10 }}>{superCheio ? 'PRONTO!' : `${Math.floor(hud.superCarga * 100)}%`}</Text>
        </View>
      </View>

      {/* placar */}
      <View pointerEvents="none" style={{ position: 'absolute', top: 8, alignSelf: 'center', flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ backgroundColor: COR.azul, paddingHorizontal: 14, paddingVertical: 6, borderTopLeftRadius: 10, borderBottomLeftRadius: 10 }}><Text style={{ color: '#fff', fontWeight: '900', fontSize: 22 }}>{hud.placar[0]}</Text></View>
        <View style={{ backgroundColor: '#111c', paddingHorizontal: 12, paddingVertical: 8 }}>
          <Text style={{ color: hud.prorrog ? COR.amarelo : '#fff', fontWeight: '900', fontSize: 16 }}>{hud.prorrog ? 'PRORROG ' : ''}{min}:{seg.toString().padStart(2, '0')}</Text>
        </View>
        <View style={{ backgroundColor: COR.vermelho, paddingHorizontal: 14, paddingVertical: 6, borderTopRightRadius: 10, borderBottomRightRadius: 10 }}><Text style={{ color: '#fff', fontWeight: '900', fontSize: 22 }}>{hud.placar[1]}</Text></View>
      </View>
      <View style={{ position: 'absolute', top: 8, right: 10, flexDirection: 'row', gap: 6 }}>
        <Pressable onPress={() => { const m = !mudo; Som.setMudo(m); setMudoUI(m); }} style={{ backgroundColor: '#0008', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text style={{ color: '#fff', fontWeight: '800' }}>{mudo ? '🔇' : '🔊'}</Text>
        </Pressable>
        <Pressable onPress={() => setCamera(camera === 'tv' ? 'perto' : 'tv')} style={{ backgroundColor: '#0008', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text style={{ color: '#fff', fontWeight: '800' }}>🎥 {camera === 'tv' ? 'TV' : 'Perto'}</Text>
        </Pressable>
        <Pressable onPress={sair} style={{ backgroundColor: '#0008', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}><Text style={{ color: '#fff', fontWeight: '800' }}>✕</Text></Pressable>
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', top: 54, alignSelf: 'center' }}>
        <Text style={{ color: COR.textoFraco, fontWeight: '800', fontSize: 11 }}>Primeiro a fazer 3 gols vence</Text>
      </View>

      {hud.msg ? (
        <View pointerEvents="none" style={{ position: 'absolute', top: H * 0.3, alignSelf: 'center' }}>
          <Text style={{ color: hud.msg.startsWith('GOO') ? COR.amarelo : '#fff', fontWeight: '900', fontSize: hud.msg.startsWith('GOO') ? 64 : 34, textShadowColor: '#000', textShadowRadius: 8, textShadowOffset: { width: 2, height: 3 } }}>{hud.msg}</Text>
        </View>
      ) : null}
      {hud.fase === 'saida' && !hud.msg ? (
        <View pointerEvents="none" style={{ position: 'absolute', top: H * 0.32, alignSelf: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 30, textShadowColor: '#000', textShadowRadius: 6 }}>Prepara...</Text>
        </View>
      ) : null}

      {hud.fase === 'fim' ? (
        <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5,10,25,0.72)', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: hud.vencedor === 0 ? COR.amarelo : hud.vencedor === 1 ? COR.vermelho : '#fff', fontWeight: '900', fontSize: 54 }}>
            {hud.vencedor === 0 ? 'VITÓRIA!' : hud.vencedor === 1 ? 'DERROTA' : 'EMPATE'}
          </Text>
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 28, marginVertical: 8 }}>{hud.placar[0]} x {hud.placar[1]}</Text>
          <Botao titulo="Continuar" grande onPress={() => aoTerminar(hud.vencedor as 0 | 1 | 2, estado.current?.golsJogador ?? 0)} />
        </View>
      ) : null}
    </View>
  );
}

// ---------- controles por toque: joystick + chutar + super ----------
class Controles {
  W = 0; H = 0; bChute = { x: 0, y: 0, r: 0 }; bSuper = { x: 0, y: 0, r: 0 };
  joy = { id: -1 as number, ativo: false, ox: 0, oy: 0, dx: 0, dy: 0 };
  botoes = new Map<number, { tipo: 'chute' | 'super'; sx: number; sy: number; ax: number; ay: number; mirando: boolean }>();
  teclado = { mx: 0, mz: 0 };
  pedirChute = false; pedirSuper = false; mirarChute: { x: number; z: number } | null = null; mirarSuper: { x: number; z: number } | null = null;
  chuteAtivo = false; usouSuper = false;

  layout(W: number, H: number, c: { x: number; y: number; r: number }, s: { x: number; y: number; r: number }) { this.W = W; this.H = H; this.bChute = c; this.bSuper = s; }

  inicio(id: number, x: number, y: number) {
    const perto = (b: { x: number; y: number; r: number }) => Math.hypot(x - b.x, y - b.y) < b.r * 1.35;
    if (perto(this.bChute)) { this.botoes.set(id, { tipo: 'chute', sx: x, sy: y, ax: 0, ay: 0, mirando: false }); this.chuteAtivo = true; return; }
    if (perto(this.bSuper)) { this.botoes.set(id, { tipo: 'super', sx: x, sy: y, ax: 0, ay: 0, mirando: false }); return; }
    if (x < this.W * 0.55 && this.joy.id === -1) { this.joy = { id, ativo: true, ox: x, oy: y, dx: 0, dy: 0 }; }
  }
  mover(id: number, x: number, y: number) {
    if (id === this.joy.id) {
      let dx = (x - this.joy.ox) / 50, dy = (y - this.joy.oy) / 50; const n = Math.hypot(dx, dy);
      if (n > 1) { dx /= n; dy /= n; } this.joy.dx = dx; this.joy.dy = dy; return;
    }
    const b = this.botoes.get(id);
    if (b) { b.ax = x - b.sx; b.ay = y - b.sy; if (Math.hypot(b.ax, b.ay) > 18) b.mirando = true; }
  }
  fim(id: number) {
    if (id === this.joy.id) { this.joy = { id: -1, ativo: false, ox: 0, oy: 0, dx: 0, dy: 0 }; return; }
    const b = this.botoes.get(id); if (!b) return;
    this.botoes.delete(id);
    const mira = b.mirando ? { x: b.ax, z: b.ay } : null;
    if (b.tipo === 'chute') { this.pedirChute = true; this.mirarChute = mira; this.chuteAtivo = false; }
    else { this.pedirSuper = true; this.mirarSuper = mira; }
  }
  mira() {
    for (const b of this.botoes.values()) if (b.mirando) return { x: b.ax, z: b.ay, super: b.tipo === 'super' };
    return null;
  }
  ler(en: Entrada): Entrada {
    // tela: direita = +x, baixo = +z (câmera olha do lado de cá do campo)
    let mx = this.joy.dx + this.teclado.mx, mz = this.joy.dy + this.teclado.mz;
    const n = Math.hypot(mx, mz); if (n > 1) { mx /= n; mz /= n; }
    en.mx = mx; en.mz = mz;
    if (this.pedirChute) { en.chutar = true; en.mirar = this.mirarChute; this.pedirChute = false; this.mirarChute = null; }
    if (this.pedirSuper) { en.usarSuper = true; en.mirar = this.mirarSuper; this.pedirSuper = false; this.mirarSuper = null; this.usouSuper = true; }
    return en;
  }
}
