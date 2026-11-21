import React, { useRef, useState } from 'react';
import { View, Text, Image, Animated, Easing, Pressable } from 'react-native';
import { Progresso, PremioCaixa, PRECO_CAIXA } from '../dados/progresso';
import { porId, RARIDADES } from '../dados/personagens';
import { RETRATOS } from '../jogo/modelos';
import Botao, { Moeda } from '../ui/Botao';
import { COR } from '../ui/tema';

interface Props { prog: Progresso; voltar: () => void; abrir: (mega: boolean) => PremioCaixa[] | null; }

export default function Caixa({ prog, voltar, abrir }: Props) {
  const [premios, setPremios] = useState<PremioCaixa[] | null>(null);
  const [mostrando, setMostrando] = useState(0);
  const [abrindo, setAbrindo] = useState<null | boolean>(null);
  const balanco = useRef(new Animated.Value(0)).current;
  const escala = useRef(new Animated.Value(1)).current;

  const comecar = (mega: boolean) => {
    const r = abrir(mega); if (!r) return;
    setAbrindo(mega);
    balanco.setValue(0); escala.setValue(1);
    Animated.sequence([
      Animated.loop(Animated.sequence([
        Animated.timing(balanco, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(balanco, { toValue: -1, duration: 80, useNativeDriver: true }),
      ]), { iterations: 6 }),
      Animated.timing(escala, { toValue: 1.6, duration: 250, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
    ]).start(() => { setPremios(r); setMostrando(0); setAbrindo(null); });
  };

  if (premios) {
    const pr = premios[mostrando];
    const proximo = () => (mostrando + 1 < premios.length ? setMostrando(mostrando + 1) : setPremios(null));
    let conteudo: React.ReactNode;
    if (pr.tipo === 'personagem') {
      const c = porId(pr.id); const r = RARIDADES[c.raridade];
      conteudo = (
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: r.cor, fontWeight: '900', fontSize: 22 }}>NOVO JOGADOR {r.nome.toUpperCase()}!</Text>
          <Image source={RETRATOS[c.id]} style={{ width: 240, height: 240 }} resizeMode="contain" />
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 30 }}>{c.nome}</Text>
          <Text style={{ color: COR.amarelo, fontWeight: '800' }}>Super: {c.superNome}</Text>
        </View>
      );
    } else {
      conteudo = (
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 80, color: pr.tipo === 'moedas' ? COR.moeda : COR.gema }}>{pr.tipo === 'moedas' ? '●' : '◆'}</Text>
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 34 }}>+{pr.qtd} {pr.tipo === 'moedas' ? 'moedas' : 'gemas'}</Text>
        </View>
      );
    }
    return (
      <Pressable onPress={proximo} style={{ flex: 1, backgroundColor: pr.tipo === 'personagem' ? '#1a0f33' : COR.fundo, alignItems: 'center', justifyContent: 'center' }}>
        {conteudo}
        <Text style={{ color: COR.textoFraco, marginTop: 16 }}>Toque para continuar ({mostrando + 1}/{premios.length})</Text>
      </Pressable>
    );
  }

  const gira = balanco.interpolate({ inputRange: [-1, 1], outputRange: ['-8deg', '8deg'] });
  const caixa = (mega: boolean) => (
    <View style={{ alignItems: 'center', backgroundColor: COR.painel, borderRadius: 16, padding: 16, width: 230, borderWidth: 3, borderColor: mega ? '#a855f7' : COR.amarelo }}>
      <Animated.View style={{ transform: [{ rotate: abrindo === mega ? gira : '0deg' }, { scale: abrindo === mega ? escala : 1 }] }}>
        <View style={{ width: 110, height: 90, backgroundColor: mega ? '#a855f7' : COR.amarelo, borderRadius: 14, borderWidth: 4, borderColor: '#0005', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 42 }}>{mega ? '💎' : '⚽'}</Text>
        </View>
      </Animated.View>
      <Text style={{ color: '#fff', fontWeight: '900', fontSize: 20, marginTop: 10 }}>{mega ? 'Mega Caixa' : 'Caixa'}</Text>
      <Text style={{ color: COR.textoFraco, fontSize: 12, textAlign: 'center', marginBottom: 10 }}>{mega ? '3 prêmios e muito mais chance de jogador novo' : '1 prêmio: moedas, gemas ou um jogador novo'}</Text>
      {mega
        ? <Botao titulo={`${PRECO_CAIXA.mega} ◆`} cor={COR.gema} desativado={prog.gemas < PRECO_CAIXA.mega || abrindo !== null} onPress={() => comecar(true)} />
        : <Botao titulo={`${PRECO_CAIXA.normal} ●`} desativado={prog.moedas < PRECO_CAIXA.normal || abrindo !== null} onPress={() => comecar(false)} />}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: COR.fundo }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 10, gap: 10 }}>
        <Botao titulo="← Voltar" onPress={voltar} cor={COR.painel} corTexto="#fff" />
        <Text style={{ color: '#fff', fontWeight: '900', fontSize: 20, flex: 1 }}>Caixas</Text>
        <Moeda tipo="moeda" valor={prog.moedas} /><Moeda tipo="gema" valor={prog.gemas} />
      </View>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
        {caixa(false)}{caixa(true)}
        <View style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 12 }}>
          <Text style={{ color: '#fff', fontWeight: '900', marginBottom: 6 }}>Chances de jogador</Text>
          {(['raro', 'super_raro', 'epico', 'mitico', 'lendario'] as const).map(k => (
            <Text key={k} style={{ color: RARIDADES[k].cor, fontWeight: '800' }}>{RARIDADES[k].nome}: {Math.round(RARIDADES[k].chanceCaixa * 100)}%</Text>
          ))}
        </View>
      </View>
    </View>
  );
}
