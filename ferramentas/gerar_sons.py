# Gera os sons do jogo (sem precisar de arquivos de fora)
import numpy as np, wave, os
from scipy.signal import butter, lfilter
SR = 22050
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sons')
rng = np.random.default_rng(7)

def salvar(nome, x, vol=0.9):
    x = np.asarray(x, dtype=np.float64)
    x = x / (np.max(np.abs(x)) + 1e-9) * vol
    d = (x * 32767).astype(np.int16)
    with wave.open(os.path.join(OUT, nome + '.wav'), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(d.tobytes())

def t(dur): return np.arange(int(SR * dur)) / SR
def ruido(dur): return rng.standard_normal(int(SR * dur))
def banda(x, lo, hi, o=2):
    b, a = butter(o, [lo / (SR / 2), hi / (SR / 2)], btype='band'); return lfilter(b, a, x)
def passa_baixa(x, f, o=2):
    b, a = butter(o, f / (SR / 2)); return lfilter(b, a, x)
def env(n, ataque, queda):
    tt = np.arange(n) / SR
    return np.minimum(1, tt / max(ataque, 1e-4)) * np.exp(-tt / queda)

# chute: pancada grave + estalo do couro
tt = t(0.25)
chute = np.sin(2 * np.pi * (95 - 50 * tt) * tt) * env(len(tt), 0.002, 0.06) + 0.5 * banda(ruido(0.25), 800, 4000) * env(len(tt), 0.0005, 0.015)
salvar('chute', chute)
# chute forte
tt = t(0.6)
forte = 1.3 * np.sin(2 * np.pi * (70 - 30 * tt) * tt) * env(len(tt), 0.002, 0.09) + 0.6 * banda(ruido(0.6), 300, 3000) * env(len(tt), 0.01, 0.25) * np.linspace(1, 0, len(tt))
salvar('chute_forte', forte)
# apito (trinado)
tt = t(0.7)
tr = 1 + 0.5 * np.sign(np.sin(2 * np.pi * 28 * tt))
apito = np.sin(2 * np.pi * 2900 * tt + 3 * np.sin(2 * np.pi * 28 * tt)) * tr * np.minimum(1, tt / 0.02) * np.minimum(1, (0.7 - tt) / 0.05)
apito += 0.15 * banda(ruido(0.7), 2000, 5000)
salvar('apito', apito, 0.7)
# apito final: três apitos
a1 = apito[: int(SR * 0.35)]; sil = np.zeros(int(SR * 0.12))
salvar('apito_final', np.concatenate([a1, sil, a1, sil, apito, apito[: int(SR * 0.5)]]), 0.7)
# torcida (loop de 8s): murmúrio + vozes
dur = 8.0; tt = t(dur)
base = banda(ruido(dur), 250, 2200, 3)
mod = 0.75 + 0.25 * np.sin(2 * np.pi * 0.23 * tt) + 0.1 * np.sin(2 * np.pi * 0.71 * tt)
vozes = np.zeros_like(tt)
for _ in range(60):
    f0 = rng.uniform(140, 420); ini = rng.uniform(0, dur); d = rng.uniform(0.3, 1.2)
    m = (tt > ini) & (tt < ini + d)
    fase = 2 * np.pi * f0 * (tt - ini) + 2 * np.sin(2 * np.pi * 5 * (tt - ini))
    vozes += m * np.sin(fase) * np.sin(np.pi * np.clip((tt - ini) / d, 0, 1)) * rng.uniform(0.02, 0.06)
torcida = base * mod + banda(vozes, 150, 3000)
# deixa o loop sem emenda
n = int(SR * 0.5); f = np.linspace(0, 1, n)
torcida[:n] = torcida[:n] * f + torcida[-n:] * (1 - f); torcida = torcida[:-n]
salvar('torcida', torcida, 0.55)
# gol: torcida explodindo + corneta
dur = 3.5; tt = t(dur)
rugido = banda(ruido(dur), 300, 4500, 2) * np.minimum(1, tt / 0.25) * np.exp(-np.maximum(0, tt - 1.2) / 1.4)
gritos = np.zeros_like(tt)
for _ in range(90):
    f0 = rng.uniform(220, 700); ini = rng.uniform(0, 1.2); d = rng.uniform(0.6, 2.0)
    m = (tt > ini) & (tt < ini + d)
    gritos += m * np.sin(2 * np.pi * f0 * (tt - ini) * (1 + 0.05 * np.sin(2 * np.pi * 4 * (tt - ini)))) * np.sin(np.pi * np.clip((tt - ini) / d, 0, 1)) * 0.05
corneta = (np.sign(np.sin(2 * np.pi * 233 * tt)) * 0.5 + np.sin(2 * np.pi * 466 * tt) * 0.3) * ((tt > 0.3) & (tt < 1.5)) * 0.18
salvar('gol', rugido + banda(gritos, 200, 3500) + passa_baixa(corneta, 2500))
# defesa: "uuuh" da torcida
dur = 1.4; tt = t(dur)
uh = passa_baixa(ruido(dur), 900, 3) * np.sin(np.pi * tt / dur) ** 1.5
for f0 in (180, 230, 290):
    uh += 0.4 * np.sin(2 * np.pi * f0 * tt * (1 - 0.08 * tt)) * np.sin(np.pi * tt / dur)
salvar('uuh', uh, 0.7)
# trave: clangue metálico
tt = t(1.2)
trave = sum(np.sin(2 * np.pi * f * tt) * np.exp(-tt / d) * a for f, d, a in ((523, 0.5, 1), (1187, 0.3, 0.6), (2093, 0.2, 0.4), (3311, 0.12, 0.3)))
trave += 0.3 * banda(ruido(1.2), 2000, 6000) * env(len(tt), 0.0005, 0.01)
salvar('trave', trave, 0.8)
# super: zunido subindo + brilho
dur = 0.9; tt = t(dur)
freq = 300 + 1800 * (tt / dur) ** 2
sup = np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.sin(np.pi * tt / dur) * 0.6
whoosh = ruido(dur); sup += banda(whoosh, 600, 5000) * np.sin(np.pi * tt / dur) * 0.4
salvar('super', sup, 0.8)
# carrinho: deslizada na grama
dur = 0.45; tt = t(dur)
salvar('carrinho', banda(ruido(dur), 900, 6000) * np.sin(np.pi * tt / dur) ** 0.6, 0.6)
# congelar: cristal
dur = 1.0; tt = t(dur)
gelo = sum(np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.4) for f in (1568, 2093, 2637, 3136)) + 0.4 * banda(ruido(dur), 4000, 9000) * np.exp(-tt / 0.3)
salvar('congelar', gelo, 0.6)
# clique de botão
tt = t(0.06)
salvar('clique', np.sin(2 * np.pi * 1200 * tt) * np.exp(-tt / 0.012), 0.5)
print('ok', sorted(os.listdir(OUT)))
