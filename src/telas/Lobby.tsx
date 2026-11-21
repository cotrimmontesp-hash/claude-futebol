import React, { useState } from 'react';
import { View, Text, Image, Pressable, TextInput, ScrollView, } from 'react-native';
import { Progresso, hoje } from '../dados/progresso';
import { porId, RARIDADES, PERSONAGENS } from '../dados/personagens';
import { Mapa } from '../dados/mapas';
import { RETRATOS } from '../jogo/modelos';
import Botao, { Moeda } from '../ui/Botao';
import { COR } from '../ui/tema';
import { useTela, pontoNaTela } from '../ui/tela';

interface Props {
  prog: Progresso; mapa: Mapa;
  ir: (t: 'personagens' | 'caixa' | 'editor' | 'mapas') => void;
  jogar: () => void; mudarNome: (n: string) => void; premioDiario: () => void;
}

export default function Lobby({ prog, mapa, ir, jogar, mudarNome, premioDiario }: Props) {
  const { width, height } = useTela();
  const p = porId(prog.escolhido); const r = RARIDADES[p.raridade];
  const [editNome, setEditNome] = useState(false);
  const proximo = PERSONAGENS.filter(c => c.trofeusParaLiberar !== undefined && !prog.liberados[c.id]).sort((a, b) => a.trofeusParaLiberar! - b.trofeusParaLiberar!)[0];
  const diarioDisponivel = prog.ultimoPremioDiario !== hoje();
  const alto = Math.min(height * 0.62, 340);

  return (
    <View style={{ flex: 1, backgroundColor: COR.fundo }}>
      {/* barra de cima */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 10, justifyContent: 'space-between' }}>
        <Pressable onPress={() => setEditNome(true)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COR.painel, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 }}>
          {editNome ? (
            <TextInput autoFocus defaultValue={prog.nome} maxLength={16} onSubmitEditing={ev => { mudarNome(ev.nativeEvent.text || 'Craque'); setEditNome(false); }}
              onBlur={() => setEditNome(false)} style={{ color: '#fff', fontWeight: '900', fontSize: 16, minWidth: 110 }} />
          ) : <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>{prog.nome} ✎</Text>}
        </Pressable>
        <View style={{ flexDirection: 'row' }}>
          <Moeda tipo="trofeu" valor={prog.trofeus} /><Moeda tipo="moeda" valor={prog.moedas} /><Moeda tipo="gema" valor={prog.gemas} />
        </View>
      </View>

      <View style={{ flex: 1, flexDirection: 'row', paddingHorizontal: 12 }}>
        {/* menu da esquerda */}
        <ScrollView style={{ width: Math.max(170, width * 0.22), flexGrow: 0 }} contentContainerStyle={{ gap: 10, paddingBottom: 10 }}>
          <Botao titulo="Jogadores" cor={COR.azul} corTexto="#fff" onPress={() => ir('personagens')} sub={`${Object.keys(prog.liberados).length}/${PERSONAGENS.length}`} />
          <Botao titulo="Caixas" cor="#a855f7" corTexto="#fff" onPress={() => ir('caixa')} />
          <Botao titulo="Criar mapa" cor={COR.verde} corTexto="#fff" onPress={() => ir('editor')} />
          <Botao titulo="Mapas da galera" cor="#0ea5e9" corTexto="#fff" onPress={() => ir('mapas')} />
          {diarioDisponivel ? <Botao titulo="Prêmio do dia" cor="#f97316" corTexto="#fff" onPress={premioDiario} /> : null}
        </ScrollView>

        {/* jogador escolhido */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: alto * 0.75, height: alto, alignItems: 'center', justifyContent: 'flex-end' }}>
            <View style={{ position: 'absolute', bottom: 8, width: alto * 0.7, height: alto * 0.12, borderRadius: 999, backgroundColor: r.cor, opacity: 0.35 }} />
            <Image source={RETRATOS[p.id]} style={{ width: alto, height: alto }} resizeMode="contain" />
          </View>
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 24 }}>{p.nome}</Text>
          <Text style={{ color: r.cor, fontWeight: '900', fontSize: 14 }}>{r.nome.toUpperCase()} · NÍVEL {prog.liberados[p.id]}</Text>
        </View>

        {/* jogar */}
        <View style={{ width: Math.max(200, width * 0.26), justifyContent: 'flex-end', paddingBottom: 14, gap: 10 }}>
          <Pressable onPress={() => ir('mapas')} style={{ backgroundColor: COR.painel, borderRadius: 12, padding: 10, borderWidth: 2, borderColor: COR.borda }}>
            <Text style={{ color: COR.textoFraco, fontSize: 11, fontWeight: '800' }}>MAPA</Text>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }} numberOfLines={1}>{mapa.nome}</Text>
            <Text style={{ color: COR.textoFraco, fontSize: 11 }} numberOfLines={1}>por {mapa.autor} · toque para trocar</Text>
          </Pressable>
          {proximo ? (
            <View style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 8 }}>
              <Text style={{ color: COR.textoFraco, fontSize: 11, fontWeight: '800' }}>PRÓXIMO NA ESTRADA DE TROFÉUS</Text>
              <Text style={{ color: '#fff', fontWeight: '900' }}>{proximo.nome} · {proximo.trofeusParaLiberar} 🏆</Text>
              <View style={{ height: 8, backgroundColor: '#0006', borderRadius: 4, marginTop: 4 }}>
                <View style={{ height: 8, borderRadius: 4, backgroundColor: COR.trofeu, width: `${Math.min(100, (prog.trofeus / proximo.trofeusParaLiberar!) * 100)}%` }} />
              </View>
            </View>
          ) : null}
          <Botao titulo="Jogar" grande onPress={jogar} sub="3 contra 3" />
        </View>
      </View>
    </View>
  );
}
