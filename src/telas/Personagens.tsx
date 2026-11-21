import React, { useState } from 'react';
import { View, Text, Image, Pressable, ScrollView } from 'react-native';
import { PERSONAGENS, RARIDADES, porId, custoNivel, NIVEL_MAX, bonusNivel } from '../dados/personagens';
import { Progresso } from '../dados/progresso';
import { RETRATOS } from '../jogo/modelos';
import Botao, { Moeda } from '../ui/Botao';
import { COR } from '../ui/tema';

interface Props { prog: Progresso; voltar: () => void; escolher: (id: string) => void; evoluir: (id: string) => void; }

export default function Personagens({ prog, voltar, escolher, evoluir }: Props) {
  const [sel, setSel] = useState(prog.escolhido);
  const p = porId(sel); const r = RARIDADES[p.raridade]; const nivel = prog.liberados[p.id];
  const b = bonusNivel(nivel || 1);
  const barra = (rotulo: string, v: number, max: number) => (
    <View style={{ marginVertical: 3 }}>
      <Text style={{ color: COR.textoFraco, fontSize: 11, fontWeight: '800' }}>{rotulo}</Text>
      <View style={{ height: 8, backgroundColor: '#0006', borderRadius: 4 }}><View style={{ height: 8, width: `${Math.min(100, (v / max) * 100)}%`, backgroundColor: COR.amarelo, borderRadius: 4 }} /></View>
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: COR.fundo, flexDirection: 'row' }}>
      <View style={{ flex: 1.4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 10, gap: 10 }}>
          <Botao titulo="← Voltar" onPress={voltar} cor={COR.painel} corTexto="#fff" />
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 20, flex: 1 }}>Jogadores</Text>
          <Moeda tipo="moeda" valor={prog.moedas} />
        </View>
        <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', padding: 8, gap: 8 }}>
          {PERSONAGENS.map(c => {
            const tem = !!prog.liberados[c.id]; const rc = RARIDADES[c.raridade];
            return (
              <Pressable key={c.id} onPress={() => setSel(c.id)} style={{ width: 104, height: 142, borderRadius: 12, backgroundColor: tem ? COR.painel : '#1a2336', borderWidth: 3, borderColor: sel === c.id ? '#fff' : rc.cor, overflow: 'hidden', alignItems: 'center' }}>
                <Image source={RETRATOS[c.id]} style={{ width: 120, height: 110, marginTop: -4, opacity: tem ? 1 : 0.25 }} resizeMode="contain" />
                <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: rc.cor, paddingVertical: 3 }}>
                  <Text style={{ color: '#111', fontWeight: '900', fontSize: 12, textAlign: 'center' }} numberOfLines={1}>{tem ? `${c.nome} · ${prog.liberados[c.id]}` : c.nome}</Text>
                </View>
                {!tem ? <Text style={{ position: 'absolute', top: 40, fontSize: 30 }}>🔒</Text> : null}
                {prog.escolhido === c.id ? <Text style={{ position: 'absolute', top: 4, right: 6, color: COR.amarelo, fontWeight: '900' }}>★</Text> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* detalhes */}
      <ScrollView style={{ flex: 1, backgroundColor: COR.fundo2 }} contentContainerStyle={{ padding: 14 }}>
        <Text style={{ color: r.cor, fontWeight: '900' }}>{r.nome.toUpperCase()}</Text>
        <Text style={{ color: '#fff', fontWeight: '900', fontSize: 26 }}>{p.nome}</Text>
        <Text style={{ color: COR.textoFraco, marginBottom: 6 }}>{p.descricao}</Text>
        {barra('VELOCIDADE', p.velocidade * b, 9)}
        {barra('CHUTE', p.chute * b, 30)}
        {barra('DESARME', p.desarme, 3)}
        <View style={{ backgroundColor: 'rgba(255,214,10,0.12)', borderRadius: 10, padding: 10, marginTop: 8, borderWidth: 1, borderColor: COR.amarelo }}>
          <Text style={{ color: COR.amarelo, fontWeight: '900' }}>SUPER: {p.superNome}</Text>
          <Text style={{ color: '#fff', marginTop: 2 }}>{p.superDescricao}</Text>
        </View>
        <View style={{ marginTop: 12, gap: 8 }}>
          {nivel ? (
            <>
              <Botao titulo={prog.escolhido === p.id ? 'Escolhido' : 'Escolher'} desativado={prog.escolhido === p.id} onPress={() => escolher(p.id)} />
              {nivel < NIVEL_MAX
                ? <Botao titulo={`Evoluir p/ nível ${nivel + 1}`} sub={`${custoNivel(nivel)} moedas`} cor={COR.verde} corTexto="#fff" desativado={prog.moedas < custoNivel(nivel)} onPress={() => evoluir(p.id)} />
                : <Text style={{ color: COR.amarelo, fontWeight: '900', textAlign: 'center' }}>NÍVEL MÁXIMO</Text>}
            </>
          ) : (
            <Text style={{ color: COR.textoFraco, fontWeight: '800', textAlign: 'center' }}>
              {p.trofeusParaLiberar !== undefined ? `Libera com ${p.trofeusParaLiberar} troféus ou nas caixas` : 'Só sai nas caixas'}
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
