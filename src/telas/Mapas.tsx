import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { Mapa, MAPAS_OFICIAIS, TEMAS, codigoParaMapa } from '../dados/mapas';
import Botao from '../ui/Botao';
import { COR } from '../ui/tema';
import { API_MAPAS } from '../config';

interface Props {
  meus: Mapa[]; atual: Mapa;
  voltar: () => void; escolher: (m: Mapa) => void; editar: (m: Mapa) => void; apagar: (id: string) => void; guardar: (m: Mapa) => void;
}

type Aba = 'oficiais' | 'galera' | 'meus' | 'codigo';

export default function Mapas({ meus, atual, voltar, escolher, editar, apagar, guardar }: Props) {
  const [aba, setAba] = useState<Aba>('galera');
  const [galera, setGalera] = useState<Mapa[] | null>(null);
  const [erro, setErro] = useState('');
  const [codigo, setCodigo] = useState('');
  const [msg, setMsg] = useState('');

  const buscar = async () => {
    setErro(''); setGalera(null);
    try {
      const r = await fetch(API_MAPAS); const j = await r.json();
      setGalera((j.mapas ?? []).filter((m: Mapa) => m && Array.isArray(m.pecas) && TEMAS[m.tema]));
    } catch { setErro('Sem conexão com os mapas da galera agora.'); setGalera([]); }
  };
  useEffect(() => { buscar(); }, []);

  const cartao = (m: Mapa, meu = false) => (
    <View key={m.id} style={{ backgroundColor: COR.painel, borderRadius: 12, padding: 10, width: 230, borderWidth: 3, borderColor: atual.id === m.id ? COR.amarelo : 'transparent' }}>
      <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }} numberOfLines={1}>{m.nome}</Text>
      <Text style={{ color: COR.textoFraco, fontSize: 12 }} numberOfLines={1}>por {m.autor}</Text>
      <Text style={{ color: COR.textoFraco, fontSize: 12, marginBottom: 8 }}>{TEMAS[m.tema].nome} · {m.tamanho} · {m.pecas.length} peças{m.noite ? ' · noite' : ''}{m.chuva ? ' · chuva' : ''}</Text>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <Botao titulo={atual.id === m.id ? 'Escolhido' : 'Jogar aqui'} onPress={() => escolher(m)} style={{ flex: 1 }} textoStyle={{ fontSize: 13 }} />
        {meu ? <Botao titulo="✎" cor={COR.azul} corTexto="#fff" onPress={() => editar(m)} /> : null}
        {meu ? <Botao titulo="🗑" cor="#e11d48" corTexto="#fff" onPress={() => apagar(m.id)} /> : null}
      </View>
    </View>
  );

  const aba_ = (a: Aba, t: string) => (
    <Pressable key={a} onPress={() => setAba(a)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: aba === a ? COR.amarelo : COR.painel }}>
      <Text style={{ color: aba === a ? '#111' : '#fff', fontWeight: '900' }}>{t}</Text>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: COR.fundo }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 10, gap: 8, flexWrap: 'wrap' }}>
        <Botao titulo="← Voltar" onPress={voltar} cor={COR.painel} corTexto="#fff" />
        {aba_('galera', 'Da galera')}{aba_('oficiais', 'Oficiais')}{aba_('meus', `Meus (${meus.length})`)}{aba_('codigo', 'Colar código')}
      </View>
      <ScrollView contentContainerStyle={{ padding: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {aba === 'oficiais' && MAPAS_OFICIAIS.map(m => cartao(m))}
        {aba === 'meus' && (meus.length ? meus.map(m => cartao(m, true)) : <Text style={{ color: COR.textoFraco }}>Você ainda não criou nenhum mapa. Vá em "Criar mapa" no menu.</Text>)}
        {aba === 'galera' && (galera === null ? <ActivityIndicator color={COR.amarelo} /> : (
          <>
            {erro ? <Text style={{ color: COR.vermelho, fontWeight: '800', width: '100%' }}>{erro}</Text> : null}
            {galera.length ? galera.map(m => cartao(m)) : !erro ? <Text style={{ color: COR.textoFraco }}>Ninguém publicou ainda. Crie o seu e seja o primeiro!</Text> : null}
            <View style={{ width: '100%' }}><Botao titulo="Atualizar" cor={COR.painel} corTexto="#fff" onPress={buscar} style={{ alignSelf: 'flex-start' }} /></View>
          </>
        ))}
        {aba === 'codigo' && (
          <View style={{ width: '100%', maxWidth: 520, gap: 8 }}>
            <Text style={{ color: '#fff', fontWeight: '800' }}>Cole aqui o código do mapa que seu amigo mandou:</Text>
            <TextInput value={codigo} onChangeText={setCodigo} placeholder="CF1-..." placeholderTextColor="#789" autoCapitalize="none"
              style={{ color: '#fff', backgroundColor: COR.painel, borderRadius: 10, padding: 10, fontWeight: '700' }} />
            <Botao titulo="Abrir mapa" onPress={() => {
              const m = codigoParaMapa(codigo); if (!m) { setMsg('Código inválido.'); return; }
              guardar(m); escolher(m); setMsg('');
            }} />
            {msg ? <Text style={{ color: COR.vermelho, fontWeight: '800' }}>{msg}</Text> : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
