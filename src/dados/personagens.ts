export type Raridade = 'inicial' | 'raro' | 'super_raro' | 'epico' | 'mitico' | 'lendario';

export type TipoSuper =
  | 'canhao' | 'arrancada' | 'muralha' | 'escudo' | 'pulo'
  | 'congelar' | 'ciclone' | 'ima' | 'teleporte' | 'chute_ouro' | 'fogo';

export interface Personagem {
  id: string;
  nome: string;
  raridade: Raridade;
  descricao: string;
  velocidade: number; // m/s
  chute: number;      // velocidade da bola no chute
  desarme: number;    // alcance do carrinho
  superTipo: TipoSuper;
  superNome: string;
  superDescricao: string;
  superCarga: number; // multiplicador de quanto carrega o super
  trofeusParaLiberar?: number; // estrada de troféus
}

export const RARIDADES: Record<Raridade, { nome: string; cor: string; chanceCaixa: number }> = {
  inicial:    { nome: 'Inicial',    cor: '#9aa4b1', chanceCaixa: 0 },
  raro:       { nome: 'Raro',       cor: '#2ecc71', chanceCaixa: 0.40 },
  super_raro: { nome: 'Super Raro', cor: '#3498db', chanceCaixa: 0.26 },
  epico:      { nome: 'Épico',      cor: '#9b59b6', chanceCaixa: 0.17 },
  mitico:     { nome: 'Mítico',     cor: '#e74c3c', chanceCaixa: 0.11 },
  lendario:   { nome: 'Lendário',   cor: '#f1c40f', chanceCaixa: 0.06 },
};

export const PERSONAGENS: Personagem[] = [
  { id: 'chico', nome: 'Chico', raridade: 'inicial', descricao: 'Camisa 10 da várzea. Equilibrado em tudo.',
    velocidade: 6.2, chute: 21, desarme: 2.2, superTipo: 'canhao', superNome: 'Chute Canhão',
    superDescricao: 'Um chute fortíssimo em linha reta que derruba quem estiver no caminho.', superCarga: 1 },
  { id: 'bia', nome: 'Bia Foguete', raridade: 'raro', descricao: 'A ponta mais rápida do bairro.',
    velocidade: 7.0, chute: 19, desarme: 2.0, superTipo: 'arrancada', superNome: 'Arrancada',
    superDescricao: 'Dispara para frente em altíssima velocidade e rouba a bola no caminho.', superCarga: 1.1,
    trofeusParaLiberar: 40 },
  { id: 'tonhao', nome: 'Tonhão', raridade: 'raro', descricao: 'Zagueiro paredão. Ninguém passa.',
    velocidade: 5.5, chute: 20, desarme: 2.8, superTipo: 'muralha', superNome: 'Muralha',
    superDescricao: 'Levanta um muro no campo por 6 segundos que bloqueia bola e jogadores.', superCarga: 1,
    trofeusParaLiberar: 100 },
  { id: 'lia', nome: 'Lia', raridade: 'super_raro', descricao: 'Lateral que não cai por nada.',
    velocidade: 6.5, chute: 20, desarme: 2.3, superTipo: 'escudo', superNome: 'Escudo de Luz',
    superDescricao: 'Fica imune a carrinhos e mais rápida por 4 segundos.', superCarga: 1 },
  { id: 'pipoca', nome: 'Pipoca', raridade: 'super_raro', descricao: 'Pula mais alto que todo mundo.',
    velocidade: 6.3, chute: 21, desarme: 2.2, superTipo: 'pulo', superNome: 'Pulo Bomba',
    superDescricao: 'Salta longe e, ao cair, atordoa quem estiver perto.', superCarga: 1,
    trofeusParaLiberar: 200 },
  { id: 'gelo', nome: 'Gelo', raridade: 'epico', descricao: 'Frio na hora do pênalti. E no resto também.',
    velocidade: 6.1, chute: 22, desarme: 2.3, superTipo: 'congelar', superNome: 'Congelar',
    superDescricao: 'Congela todos os adversários por perto durante 2 segundos.', superCarga: 0.95 },
  { id: 'tornado', nome: 'Tornado', raridade: 'epico', descricao: 'Gira, gira e leva todo mundo junto.',
    velocidade: 6.4, chute: 21, desarme: 2.4, superTipo: 'ciclone', superNome: 'Ciclone',
    superDescricao: 'Um redemoinho empurra os adversários para longe e faz eles soltarem a bola.', superCarga: 0.95,
    trofeusParaLiberar: 350 },
  { id: 'ima', nome: 'Ímã', raridade: 'mitico', descricao: 'A bola simplesmente gosta dele.',
    velocidade: 6.2, chute: 22, desarme: 2.3, superTipo: 'ima', superNome: 'Puxão Magnético',
    superDescricao: 'Puxa a bola para o pé de onde ela estiver, até de um adversário.', superCarga: 0.9 },
  { id: 'sombra', nome: 'Sombra', raridade: 'mitico', descricao: 'Some e aparece na cara do gol.',
    velocidade: 6.6, chute: 22, desarme: 2.2, superTipo: 'teleporte', superNome: 'Passo Sombrio',
    superDescricao: 'Teleporta para frente levando a bola junto.', superCarga: 0.9,
    trofeusParaLiberar: 550 },
  { id: 'rei', nome: 'Rei', raridade: 'lendario', descricao: 'O craque dos craques. Tem coroa e tudo.',
    velocidade: 6.6, chute: 24, desarme: 2.4, superTipo: 'chute_ouro', superNome: 'Chute de Ouro',
    superDescricao: 'Um chute de ouro que faz curva sozinho em direção ao gol e atordoa quem tocar.', superCarga: 0.85 },
  { id: 'fenix', nome: 'Fênix', raridade: 'lendario', descricao: 'Pega fogo quando o jogo esquenta.',
    velocidade: 6.8, chute: 23, desarme: 2.5, superTipo: 'fogo', superNome: 'Rastro de Fogo',
    superDescricao: 'Corre muito mais rápido por 5 segundos deixando fogo que atordoa os adversários.', superCarga: 0.85,
    trofeusParaLiberar: 800 },
];

export const porId = (id: string) => PERSONAGENS.find(p => p.id === id) ?? PERSONAGENS[0];

// cada nível aumenta 4% velocidade/chute
export const bonusNivel = (nivel: number) => 1 + (nivel - 1) * 0.04;
export const custoNivel = (nivel: number) => [0, 20, 35, 75, 140, 290, 480, 800, 1250, 1875, 2800][nivel] ?? 9999;
export const NIVEL_MAX = 11;

// goleiros (controlados pelo computador nos dois times)
export const GOLEIROS: Personagem[] = [
  { id: 'goleiro_a', nome: 'Goleiro', raridade: 'inicial', descricao: 'Goleiro do seu time.', velocidade: 5.6, chute: 24, desarme: 2.0,
    superTipo: 'canhao', superNome: '', superDescricao: '', superCarga: 0 },
  { id: 'goleiro_b', nome: 'Goleiro', raridade: 'inicial', descricao: 'Goleiro adversário.', velocidade: 5.6, chute: 24, desarme: 2.0,
    superTipo: 'canhao', superNome: '', superDescricao: '', superCarga: 0 },
];
