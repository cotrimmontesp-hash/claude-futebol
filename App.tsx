import React, { useEffect, useState } from 'react';
import { View, Text, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import Lobby from './src/telas/Lobby';
import Personagens from './src/telas/Personagens';
import Caixa from './src/telas/Caixa';
import Partida from './src/telas/Partida';
import Editor from './src/telas/Editor';
import Mapas from './src/telas/Mapas';
import { Progresso, carregar, salvar, abrirCaixa, evoluir, resultadoPartida, hoje, PRECO_CAIXA } from './src/dados/progresso';
import { Mapa, MAPA_PADRAO } from './src/dados/mapas';
import { porId, RARIDADES } from './src/dados/personagens';
import Botao from './src/ui/Botao';
import { COR } from './src/ui/tema';

type Tela = 'lobby' | 'personagens' | 'caixa' | 'partida' | 'editor' | 'mapas' | 'resultado';

export default function App() {
  const [prog, setProg] = useState<Progresso | null>(null);
  const [tela, setTela] = useState<Tela>('lobby');
  const [mapa, setMapa] = useState<Mapa>(MAPA_PADRAO);
  const [editando, setEditando] = useState<Mapa | undefined>();
  const [voltarEditor, setVoltarEditor] = useState(false);
  const [res, setRes] = useState<{ v: 0 | 1 | 2; trofeus: number; moedas: number; novos: string[] } | null>(null);
  const [chavePartida, setChavePartida] = useState(0);

  useEffect(() => {
    carregar().then(setProg);
    if (Platform.OS !== 'web') ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
  }, []);

  const atualizar = (f: (p: Progresso) => void) => setProg(v => { if (!v) return v; const n: Progresso = JSON.parse(JSON.stringify(v)); f(n); salvar(n); return n; });

  if (!prog) return <View style={{ flex: 1, backgroundColor: COR.fundo }} />;

  let conteudo: React.ReactNode = null;
  switch (tela) {
    case 'lobby':
      conteudo = <Lobby prog={prog} mapa={mapa} ir={t => { if (t === 'editor') setEditando(undefined); setTela(t); }}
        jogar={() => { setVoltarEditor(false); setChavePartida(k => k + 1); setTela('partida'); }}
        mudarNome={n => atualizar(p => { p.nome = n.slice(0, 16); })}
        premioDiario={() => atualizar(p => { p.ultimoPremioDiario = hoje(); p.moedas += 60; p.gemas += 3; })} />;
      break;
    case 'personagens':
      conteudo = <Personagens prog={prog} voltar={() => setTela('lobby')} escolher={id => atualizar(p => { p.escolhido = id; })} evoluir={id => atualizar(p => { evoluir(p, id); })} />;
      break;
    case 'caixa':
      conteudo = <Caixa prog={prog} voltar={() => setTela('lobby')} abrir={mega => {
        const preco = mega ? PRECO_CAIXA.mega : PRECO_CAIXA.normal;
        if (mega ? prog.gemas < preco : prog.moedas < preco) return null;
        const copia: Progresso = JSON.parse(JSON.stringify(prog));
        if (mega) copia.gemas -= preco; else copia.moedas -= preco;
        const premios = abrirCaixa(copia, mega);
        setProg(copia); salvar(copia);
        return premios;
      }} />;
      break;
    case 'partida':
      conteudo = <Partida key={chavePartida} mapa={mapa} meuId={prog.escolhido} meuNivel={prog.liberados[prog.escolhido] ?? 1} trofeus={prog.trofeus}
        sair={() => setTela(voltarEditor ? 'editor' : 'lobby')}
        aoTerminar={(v, gols) => {
          if (voltarEditor) { setTela('editor'); return; }
          const venc = v === 0 ? 0 : v === 1 ? 1 : 2;
          const copia: Progresso = JSON.parse(JSON.stringify(prog));
          const r = resultadoPartida(copia, venc as 0 | 1 | 2, gols);
          setProg(copia); salvar(copia);
          setRes({ v: venc as 0 | 1 | 2, ...r }); setTela('resultado');
        }} />;
      break;
    case 'editor':
      conteudo = <Editor inicial={editando} autor={prog.nome} voltar={() => setTela('lobby')}
        salvar={m => { setEditando(m); atualizar(p => { p.meusMapas = [m, ...p.meusMapas.filter(x => x.id !== m.id)].slice(0, 30); }); }}
        testar={m => { setEditando(m); setMapa(m); setVoltarEditor(true); setChavePartida(k => k + 1); setTela('partida'); }} />;
      break;
    case 'mapas':
      conteudo = <Mapas meus={prog.meusMapas} atual={mapa} voltar={() => setTela('lobby')}
        escolher={m => { setMapa(m); setTela('lobby'); }}
        editar={m => { setEditando(m); setTela('editor'); }}
        apagar={id => atualizar(p => { p.meusMapas = p.meusMapas.filter(x => x.id !== id); })}
        guardar={() => {}} />;
      break;
    case 'resultado':
      conteudo = (
        <View style={{ flex: 1, backgroundColor: COR.fundo, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <Text style={{ color: res?.v === 0 ? COR.amarelo : res?.v === 1 ? COR.vermelho : '#fff', fontWeight: '900', fontSize: 44 }}>{res?.v === 0 ? 'VITÓRIA!' : res?.v === 1 ? 'DERROTA' : 'EMPATE'}</Text>
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 20 }}>{(res?.trofeus ?? 0) >= 0 ? '+' : ''}{res?.trofeus} 🏆    +{res?.moedas} ●</Text>
          {res?.novos.map(id => (
            <Text key={id} style={{ color: RARIDADES[porId(id).raridade].cor, fontWeight: '900', fontSize: 22 }}>Liberou {porId(id).nome} na estrada de troféus!</Text>
          ))}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
            <Botao titulo="Jogar de novo" onPress={() => { setChavePartida(k => k + 1); setTela('partida'); }} />
            <Botao titulo="Menu" cor={COR.painel} corTexto="#fff" onPress={() => setTela('lobby')} />
          </View>
        </View>
      );
      break;
  }

  return (
    <View style={{ flex: 1, backgroundColor: COR.fundo }}>
      <StatusBar hidden />
      {conteudo}
    </View>
  );
}
