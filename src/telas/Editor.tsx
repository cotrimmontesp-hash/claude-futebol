import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Platform, Share } from 'react-native';
import { Mapa, Peca, Tema, Tamanho, PECAS, TEMAS, grade, mapaParaCodigo } from '../dados/mapas';
import Botao from '../ui/Botao';
import { COR } from '../ui/tema';
import { useTela, pontoNaTela } from '../ui/tela';
import { API_MAPAS } from '../config';

interface Props {
  inicial?: Mapa; autor: string;
  voltar: () => void; salvar: (m: Mapa) => void; testar: (m: Mapa) => void;
}

const corTema: Record<Tema, string> = { grama: '#3a9b45', areia: '#e3cc98', neve: '#eef4f8', rua: '#5e6168', lua: '#9a9aa0' };

export default function Editor({ inicial, autor, voltar, salvar, testar }: Props) {
  const { width, height } = useTela();
  const [m, setM] = useState<Mapa>(inicial ?? {
    id: 'meu-' + Date.now().toString(36), nome: 'Meu campo', autor, tema: 'grama', tamanho: 'medio', noite: false, chuva: false, golLargura: 8, pecas: [],
  });
  const [ferramenta, setFerramenta] = useState<Peca | 'apagar'>('muro');
  const [aviso, setAviso] = useState('');
  const [publicando, setPublicando] = useState(false);
  const { cols, lins } = grade(m.tamanho);
  const larguraGrade = width * 0.58, alturaGrade = height - 90;
  const cel = Math.floor(Math.min(larguraGrade / cols, alturaGrade / lins));

  const mudar = (p: Partial<Mapa>) => setM(v => ({ ...v, ...p }));
  const tocar = (c: number, l: number) => {
    setM(v => {
      const resto = v.pecas.filter(p => !(p.c === c && p.l === l));
      // não deixa bloquear o meio de campo nem a frente do gol
      const meio = Math.abs(c - (cols - 1) / 2) < 1.2 && Math.abs(l - (lins - 1) / 2) < 1.2;
      const gol = (c === 0 || c === cols - 1) && Math.abs(l - (lins - 1) / 2) < v.golLargura / 6;
      if (ferramenta === 'apagar' || meio || gol) return { ...v, pecas: resto };
      if (resto.length >= 120) return v;
      return { ...v, pecas: [...resto, { tipo: ferramenta, c, l }] };
    });
  };
  const trocarTamanho = (t: Tamanho) => { const g = grade(t); setM(v => ({ ...v, tamanho: t, pecas: v.pecas.filter(p => p.c < g.cols && p.l < g.lins) })); };

  const publicar = async () => {
    setPublicando(true); setAviso('');
    try {
      const r = await fetch(API_MAPAS, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mapa: { ...m, autor } }) });
      if (!r.ok) throw new Error(String(r.status));
      setAviso('Publicado! Agora a galera pode jogar no seu mapa.');
    } catch { setAviso('Não deu para publicar agora. Tente de novo ou mande o código.'); }
    setPublicando(false);
  };
  const compartilhar = async () => {
    const cod = mapaParaCodigo(m);
    try {
      if (Platform.OS === 'web') { await (navigator as any).clipboard?.writeText(cod); setAviso('Código copiado! Mande para os amigos colarem em "Mapas da galera".'); }
      else await Share.share({ message: `Joga no meu mapa do Claude Futebol! Código: ${cod}` });
    } catch { setAviso('Código: ' + cod); }
  };

  const opc = (ativo: boolean, txt: string, f: () => void, cor = COR.azul) => (
    <Pressable key={txt} onPress={f} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: ativo ? cor : COR.painel, marginRight: 6, marginBottom: 6 }}>
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>{txt}</Text>
    </Pressable>
  );

  const golCel = m.golLargura / 3;
  return (
    <View style={{ flex: 1, backgroundColor: COR.fundo, flexDirection: 'row' }}>
      <View style={{ flex: 1, padding: 8, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', marginBottom: 6, gap: 8 }}>
          <Botao titulo="← Voltar" onPress={voltar} cor={COR.painel} corTexto="#fff" />
          <TextInput value={m.nome} onChangeText={t => mudar({ nome: t.slice(0, 30) })} placeholder="Nome do mapa" placeholderTextColor="#789"
            style={{ flex: 1, color: '#fff', fontWeight: '900', fontSize: 18, backgroundColor: COR.painel, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }} />
        </View>
        {/* campo visto de cima */}
        <View style={{ width: cel * cols + 16, height: cel * lins + 8, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 8, height: golCel * cel, backgroundColor: '#fff' }} />
          <View style={{ width: cel * cols, height: cel * lins, backgroundColor: m.noite ? '#1d3b22' : corTema[m.tema], borderWidth: 2, borderColor: '#fff' }}>
            <View pointerEvents="none" style={{ position: 'absolute', left: (cel * cols) / 2 - 1, top: 0, bottom: 0, width: 2, backgroundColor: '#fff8' }} />
            <View pointerEvents="none" style={{ position: 'absolute', left: (cel * cols) / 2 - cel * 1.7, top: (cel * lins) / 2 - cel * 1.7, width: cel * 3.4, height: cel * 3.4, borderRadius: 999, borderWidth: 2, borderColor: '#fff8' }} />
            {Array.from({ length: lins }).map((_, l) => (
              <View key={l} style={{ flexDirection: 'row' }}>
                {Array.from({ length: cols }).map((__, c) => {
                  const p = m.pecas.find(x => x.c === c && x.l === l);
                  return (
                    <Pressable key={c} onPress={() => tocar(c, l)} style={{ width: cel, height: cel, borderWidth: 0.5, borderColor: '#0002', backgroundColor: p ? PECAS[p.tipo].cor : 'transparent', borderRadius: p?.tipo === 'pula' || p?.tipo === 'arbusto' ? cel / 2 : 2 }}>
                      {p?.tipo === 'acelerador' ? <Text style={{ color: '#fff', fontSize: cel * 0.5, textAlign: 'center' }}>»</Text> : null}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
          <View style={{ width: 8, height: golCel * cel, backgroundColor: '#fff' }} />
        </View>
        <Text style={{ color: COR.textoFraco, fontSize: 11, marginTop: 4 }}>Toque nos quadradinhos para colocar a peça escolhida</Text>
      </View>

      {/* opções */}
      <ScrollView style={{ width: Math.max(260, width * 0.36), flexGrow: 0, backgroundColor: COR.fundo2 }} contentContainerStyle={{ padding: 10 }}>
        <Text style={{ color: '#fff', fontWeight: '900', marginBottom: 4 }}>Peças</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {(Object.keys(PECAS) as Peca[]).map(k => opc(ferramenta === k, PECAS[k].nome, () => setFerramenta(k), PECAS[k].cor))}
          {opc(ferramenta === 'apagar', 'Borracha', () => setFerramenta('apagar'), '#e11d48')}
        </View>
        <Text style={{ color: COR.textoFraco, fontSize: 11, marginBottom: 8 }}>{ferramenta === 'apagar' ? 'Apaga a peça do quadradinho' : PECAS[ferramenta].desc}</Text>

        <Text style={{ color: '#fff', fontWeight: '900', marginBottom: 4 }}>Cenário</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{(Object.keys(TEMAS) as Tema[]).map(t => opc(m.tema === t, TEMAS[t].nome, () => mudar({ tema: t })))}</View>
        <Text style={{ color: '#fff', fontWeight: '900', marginBottom: 4 }}>Tamanho</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{(['pequeno', 'medio', 'grande'] as Tamanho[]).map(t => opc(m.tamanho === t, t === 'medio' ? 'Médio' : t[0].toUpperCase() + t.slice(1), () => trocarTamanho(t)))}</View>
        <Text style={{ color: '#fff', fontWeight: '900', marginBottom: 4 }}>Gol: {m.golLargura} m</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{[6, 8, 10, 12].map(g => opc(m.golLargura === g, g === 6 ? 'Pequeno' : g === 8 ? 'Normal' : g === 10 ? 'Grande' : 'Gigante', () => mudar({ golLargura: g })))}</View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {opc(m.noite, m.noite ? '🌙 Noite' : '☀️ Dia', () => mudar({ noite: !m.noite }))}
          {opc(m.chuva, m.chuva ? '🌧 Chuva' : 'Sem chuva', () => mudar({ chuva: !m.chuva }))}
        </View>

        <View style={{ gap: 8, marginTop: 8 }}>
          <Botao titulo="Testar" onPress={() => testar(m)} />
          <Botao titulo="Salvar" cor={COR.verde} corTexto="#fff" onPress={() => { salvar(m); setAviso('Salvo em "Meus mapas".'); }} />
          <Botao titulo={publicando ? 'Publicando...' : 'Publicar para a galera'} cor="#0ea5e9" corTexto="#fff" desativado={publicando} onPress={() => { salvar(m); publicar(); }} />
          <Botao titulo="Mandar código" cor={COR.painel} corTexto="#fff" onPress={compartilhar} />
        </View>
        {aviso ? <Text style={{ color: COR.amarelo, fontWeight: '800', marginTop: 8 }}>{aviso}</Text> : null}
      </ScrollView>
    </View>
  );
}
