# Claude Futebol - jogadores realistas: modela, faz o esqueleto, anima e exporta GLB + retrato PNG
import bpy, bmesh, math, os
from mathutils import Vector

OUT = os.path.join(os.path.expanduser('~'), 'Documents', 'claude-futebol-arte')
os.makedirs(OUT, exist_ok=True)
SO = globals().get('SO_ESTES', None)  # lista de ids para teste, ou None para todos

# id, camisa, calcao, meiao, pele, cabelo_cor, estilo, chuteira, extra
CHARS = [
 ('chico',  (0.95,0.80,0.10),(0.05,0.25,0.65),(0.95,0.95,0.95),(0.78,0.55,0.40),(0.08,0.05,0.03),'curto',  (0.1,0.1,0.1),   ''),
 ('bia',    (0.90,0.15,0.35),(1.0,1.0,1.0),   (0.90,0.15,0.35),(0.92,0.72,0.60),(0.55,0.25,0.08),'rabo',   (1.0,0.4,0.6),   'faixa'),
 ('tonhao', (0.10,0.45,0.15),(1.0,1.0,1.0),   (0.10,0.45,0.15),(0.35,0.22,0.14),(0.03,0.03,0.03),'careca', (0.9,0.9,0.9),   'barba'),
 ('lia',    (0.15,0.55,0.95),(0.05,0.10,0.30),(0.15,0.55,0.95),(0.85,0.65,0.50),(0.10,0.05,0.04),'longo',  (0.2,0.9,1.0),   ''),
 ('pipoca', (1.0,1.0,1.0),   (0.05,0.05,0.05),(1.0,1.0,1.0),   (0.60,0.40,0.28),(0.05,0.04,0.03),'black',  (1.0,0.85,0.1),  ''),
 ('gelo',   (0.70,0.90,1.0), (0.85,0.95,1.0), (0.70,0.90,1.0), (0.93,0.82,0.75),(0.92,0.92,0.95),'moicano',(0.6,0.9,1.0),   ''),
 ('tornado',(0.05,0.05,0.05),(0.05,0.05,0.05),(0.30,0.90,0.40),(0.70,0.50,0.35),(0.15,0.10,0.05),'curto',  (0.3,0.9,0.4),   'faixa'),
 ('ima',    (0.80,0.05,0.10),(0.80,0.05,0.10),(0.05,0.05,0.05),(0.50,0.33,0.22),(0.05,0.04,0.03),'moicano',(0.9,0.1,0.1),   'barba'),
 ('sombra', (0.12,0.08,0.20),(0.12,0.08,0.20),(0.12,0.08,0.20),(0.80,0.62,0.50),(0.02,0.02,0.02),'longo',  (0.5,0.2,0.9),   ''),
 ('rei',    (1.0,1.0,1.0),   (1.0,1.0,1.0),   (1.0,1.0,1.0),   (0.55,0.37,0.25),(0.05,0.04,0.03),'curto',  (1.0,0.8,0.1),   'coroa'),
 ('fenix',  (1.0,0.45,0.05), (0.70,0.05,0.05),(1.0,0.45,0.05), (0.88,0.68,0.55),(0.95,0.55,0.10),'moicano',(1.0,0.3,0.0),   'barba'),
 ('goleiro_a',(1.0,0.55,0.05),(0.1,0.1,0.1),(1.0,0.55,0.05),(0.8,0.58,0.42),(0.06,0.04,0.03),'curto',(0.1,0.1,0.1),'goleiro'),
 ('goleiro_b',(0.55,0.95,0.15),(0.1,0.1,0.1),(0.55,0.95,0.15),(0.6,0.42,0.3),(0.04,0.03,0.02),'careca',(0.9,0.9,0.9),'goleiro'),
]
GOLEIRO = False

NUMEROS = {'chico':10,'bia':7,'tonhao':4,'lia':2,'pipoca':11,'gelo':5,'tornado':8,'ima':9,'sombra':17,'rei':23,'fenix':99,'goleiro_a':1,'goleiro_b':12}

def numero(txt, loc, tam, rotz, m):
    bpy.ops.object.text_add(location=loc, rotation=(math.pi/2, 0, rotz))
    t = bpy.context.object; t.data.body = txt; t.data.size = tam; t.data.extrude = 0.004
    t.data.align_x = 'CENTER'; t.data.align_y = 'CENTER'
    try: t.data.body_format[0].use_bold = True
    except Exception: pass
    t.data.materials.append(m)
    bpy.ops.object.convert(target='MESH')
    return bpy.context.object

def tubo(p1, p2, r1, r2, m, esc_y=1.0, seg=24):
    p1, p2 = Vector(p1), Vector(p2); d = p2 - p1
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=d.length, vertices=seg, end_fill_type='NOTHING', location=(p1 + p2) / 2)
    o = bpy.context.object; o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = d.to_track_quat('Z', 'Y')
    o.scale = (1, esc_y, 1)
    sl = o.modifiers.new('esp', 'SOLIDIFY'); sl.thickness = 0.006
    o.data.materials.append(m); aplicar_mods(o); bpy.ops.object.shade_smooth()
    o.rotation_mode = 'XYZ'; return o

def mao(s, mP):
    ps = []
    w = Vector((s*0.415, -0.02, 0.955))
    bpy.ops.mesh.primitive_cube_add(location=(s*0.43, -0.025, 0.905)); palma = bpy.context.object
    palma.scale = (0.016, 0.04, 0.045); palma.data.materials.append(mP)
    bv = palma.modifiers.new('bv', 'BEVEL'); bv.width = 0.012; bv.segments = 4; aplicar_mods(palma); bpy.ops.object.shade_smooth(); ps.append(palma)
    for k in range(4):  # dedos levemente dobrados
        y = -0.052 + k*0.022; comp = 0.062 - abs(k-1.3)*0.01
        a = (s*0.432, y, 0.86); b = (s*0.425, y - 0.006, 0.86 - comp)
        ps.append(tubo(a, b, 0.0095, 0.0078, mP, 1.0, 10))
        ps.append(esfera(b, (0.0078, 0.0078, 0.0078), mP, 10, 6))
    a = (s*0.425, -0.055, 0.915); b = (s*0.41, -0.085, 0.875)   # dedão
    ps.append(tubo(a, b, 0.011, 0.009, mP, 1.0, 10)); ps.append(esfera(b, (0.009, 0.009, 0.009), mP, 10, 6))
    return ps

def detalhes(cid, camisa, calcao, mB):
    ps = []
    mPano = mat('camisa_pano', camisa, 0.85); mCal = mat('calcao_pano', calcao, 0.75)
    for s2 in (1, -1):
        ps.append(tubo((s2*0.222, 0.0, 1.425), (s2*0.274, 0.006, 1.30), 0.068, 0.059, mPano))          # manga
        ps.append(tubo((s2*0.098, 0.0, 0.88), (s2*0.106, -0.008, 0.70), 0.112, 0.106, mCal))          # perna do calção
    ps.append(tubo((0, 0, 0.93), (0, 0, 1.08), 0.17, 0.162, mPano, 0.74, 32))                          # barra da camisa
    mMeia = None
    for f in bpy.data.materials:
        if f.name.startswith('meiao'): mMeia = f
    if mMeia:
        for s2 in (1, -1):
            ps.append(tubo((s2*0.11, -0.012, 0.50), (s2*0.11, -0.008, 0.44), 0.066, 0.07, mMeia, 1.0, 20))  # dobra do meião
            ps.append(esfera((s2*0.11, -0.05, 0.31), (0.045, 0.02, 0.08), mMeia, 16, 10))                   # caneleira
    pele = None
    for f in bpy.data.materials:
        if f.name.startswith('pele'): pele = f
    if cid.startswith('goleiro'):
        luva = mat('luva', (0.95,0.95,0.95), 0.6)
        for s2 in (1, -1):
            ps.append(tubo((s2*0.272,0.006,1.30),(s2*0.405,-0.018,0.975),0.06,0.042,mPano))
            ps.append(tubo((s2*0.40,-0.018,0.99),(s2*0.415,-0.02,0.935),0.045,0.047,luva))
        pele = luva
    for s2 in (1, -1): ps += mao(s2, pele)
    claro = sum(camisa) / 3 > 0.6
    mN = mat('numero', (0.05,0.05,0.08) if claro else (1,1,1), 0.5)
    n = str(NUMEROS.get(cid, 10))
    ps.append(numero(n, (0, 0.142, 1.27), 0.2, math.pi, mN))      # costas
    ps.append(numero(n, (0.08, -0.142, 1.36), 0.07, 0, mN))       # peito
    # gola
    bpy.ops.mesh.primitive_torus_add(location=(0, 0, 1.485), major_radius=0.072, minor_radius=0.014, major_segments=24, minor_segments=6)
    g = bpy.context.object; g.scale = (1, 0.92, 1); g.data.materials.append(mat('gola', calcao, 0.6)); ps.append(g)
    # punho da manga
    for s2 in (1, -1):
        bpy.ops.mesh.primitive_torus_add(location=(s2*0.272, 0.005, 1.31), major_radius=0.056, minor_radius=0.01, major_segments=16, minor_segments=5, rotation=(0, s2*math.radians(-25), 0))
        p = bpy.context.object; p.data.materials.append(mat('punho', calcao, 0.6)); ps.append(p)
    # sola branca com travas
    sola = mat('sola', (0.95,0.95,0.95), 0.5)
    for s2 in (1, -1):
        bpy.ops.mesh.primitive_cube_add(location=(s2*0.11, -0.04, 0.008)); b = bpy.context.object
        b.scale = (0.05, 0.135, 0.008); b.data.materials.append(sola); ps.append(b)
        for k in range(3):
            bpy.ops.mesh.primitive_cylinder_add(radius=0.009, depth=0.012, location=(s2*0.11, -0.12 + k*0.07, -0.004), vertices=8)
            t = bpy.context.object; t.data.materials.append(sola); ps.append(t)
        # faixa da chuteira
        bpy.ops.mesh.primitive_cube_add(location=(s2*(0.11+0.049), -0.04, 0.05)); f = bpy.context.object
        f.scale = (0.003, 0.07, 0.012); f.rotation_euler = (math.radians(20), 0, 0); f.data.materials.append(sola); ps.append(f)
    return ps

def limpar():
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.armatures, bpy.data.actions, bpy.data.cameras, bpy.data.lights, bpy.data.curves):
        for x in list(coll):
            try: coll.remove(x)
            except Exception: pass

def mat(nome, cor, rough=0.6, emit=0.0, sss=0.0):
    m = bpy.data.materials.new(nome)
    try: m.use_nodes = True
    except Exception: pass
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*cor, 1)
    b.inputs['Roughness'].default_value = rough
    if sss:
        try:
            b.inputs['Subsurface Weight'].default_value = sss
            b.inputs['Subsurface Radius'].default_value = (0.4, 0.15, 0.08)
        except Exception: pass
    if emit:
        try:
            b.inputs['Emission Color'].default_value = (*cor, 1)
            b.inputs['Emission Strength'].default_value = emit
        except Exception: pass
    m.diffuse_color = (*cor, 1)
    return m

def ativar(o):
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True); bpy.context.view_layer.objects.active = o

def aplicar_mods(o):
    ativar(o)
    for md in list(o.modifiers):
        bpy.ops.object.modifier_apply(modifier=md.name)

# ---------- corpo (skin modifier) ----------
J = {
 'pelvis':(0,0,0.98,.165,.115), 'barriga':(0,0,1.12,.148,.102), 'cintura':(0,0,1.20,.152,.105),
 'peito':(0,0,1.33,.195,.128), 'ombros':(0,0,1.43,.17,.11),
 'pesc0':(0,0,1.50,.066,.064), 'pesc1':(0,0,1.58,.058,.06),
}
for s,l in ((1,'L'),(-1,'R')):
    J['quad'+l]=(s*0.095,0,0.93,.108,.108); J['coxa'+l]=(s*0.10,-0.008,0.74,.092,.098)
    J['joelho'+l]=(s*0.11,-0.012,0.52,.058,.062); J['pantu'+l]=(s*0.11,0.008,0.38,.066,.074)
    J['canela'+l]=(s*0.11,0.01,0.22,.046,.048); J['torn'+l]=(s*0.11,0.02,0.10,.038,.040)
    J['calc'+l]=(s*0.11,0.05,0.04,.035,.035); J['dedo'+l]=(s*0.11,-0.14,0.03,.035,.025)
    J['omb'+l]=(s*0.215,0,1.435,.078,.07); J['delt'+l]=(s*0.25,0.005,1.37,.062,.058)
    J['bic'+l]=(s*0.29,0.008,1.27,.056,.054); J['cot'+l]=(s*0.33,0.01,1.18,.042,.042)
    J['antb'+l]=(s*0.365,-0.002,1.09,.05,.045); J['pulso'+l]=(s*0.415,-0.02,0.955,.034,.028)
E = [('pelvis','barriga'),('barriga','cintura'),('cintura','peito'),('peito','ombros'),('ombros','pesc0'),('pesc0','pesc1')]
for l in 'LR':
    E += [('pelvis','quad'+l),('quad'+l,'coxa'+l),('coxa'+l,'joelho'+l),('joelho'+l,'pantu'+l),('pantu'+l,'canela'+l),('canela'+l,'torn'+l),
          ('torn'+l,'calc'+l),('torn'+l,'dedo'+l),('ombros','omb'+l),('omb'+l,'delt'+l),('delt'+l,'bic'+l),('bic'+l,'cot'+l),('cot'+l,'antb'+l),('antb'+l,'pulso'+l)]

def corpo(mC, mS, mM, mP, mB):
    nomes = list(J.keys()); idx = {n:i for i,n in enumerate(nomes)}
    me = bpy.data.meshes.new('corpo')
    me.from_pydata([J[n][:3] for n in nomes], [(idx[a],idx[b]) for a,b in E], [])
    o = bpy.data.objects.new('corpo', me); bpy.context.collection.objects.link(o)
    sk = o.modifiers.new('skin','SKIN'); sk.use_smooth_shade = True
    for i,n in enumerate(nomes):
        d = me.skin_vertices[0].data[i]; d.radius = (J[n][3], J[n][4])
        d.use_root = (n == 'pelvis')
    ss = o.modifiers.new('sub','SUBSURF'); ss.levels = 3; ss.render_levels = 3
    aplicar_mods(o)
    for m in (mC, mS, mM, mP, mB): o.data.materials.append(m)
    for f in o.data.polygons:
        c = f.center; x = abs(c.x); z = c.z
        if z > 1.0:
            if x > 0.215: k = 0 if z > 1.30 else 3          # manga / antebraco
            else:         k = 3 if z > 1.49 else 0          # pescoco / tronco
        else:
            if x > 0.30: k = 3                               # pulso
            elif z > 0.70: k = 1                             # calcao
            elif z > 0.50: k = 3                             # joelho
            elif z > 0.13: k = 2                             # meiao
            else: k = 4                                      # chuteira
        f.material_index = k
    bpy.ops.object.shade_smooth()
    return o

def esfera(loc, esc, m, seg=32, ring=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=ring, location=loc)
    o = bpy.context.object; o.scale = esc; o.data.materials.append(m)
    bpy.ops.object.transform_apply(scale=True); bpy.ops.object.shade_smooth(); return o

def cortar(o, zmin=None, ymax=None):
    bm = bmesh.new(); bm.from_mesh(o.data)
    mw = o.matrix_world
    tirar = [v for v in bm.verts if (zmin is not None and (mw @ v.co).z < zmin) or (ymax is not None and (mw @ v.co).y > ymax)]
    bmesh.ops.delete(bm, geom=tirar, context='VERTS'); bm.to_mesh(o.data); bm.free()

def cabeca(mP, mH, estilo, extra):
    partes = []
    hz = 1.71
    h = esfera((0,0,hz), (0.1,0.115,0.13), mP); partes.append(h)
    partes.append(esfera((0,-0.035,1.635), (0.07,0.07,0.06), mP))           # queixo/mandibula
    # nariz: ponte, ponta e asas
    partes.append(esfera((0,-0.106,1.712), (0.011,0.012,0.028), mP, 16, 10))
    partes.append(esfera((0,-0.118,1.692), (0.015,0.013,0.012), mP, 16, 10))
    for s in (1,-1): partes.append(esfera((s*0.012,-0.11,1.688), (0.008,0.009,0.007), mP, 12, 8))
    labio = mat('labio', tuple(c*0.78 for c in mP.diffuse_color[:3]), 0.4)
    partes.append(esfera((0,-0.103,1.659), (0.022,0.008,0.0055), labio, 20, 10))   # lábio de cima
    partes.append(esfera((0,-0.101,1.650), (0.02,0.009,0.0065), labio, 20, 10))    # lábio de baixo
    for s in (1,-1):
        partes.append(esfera((s*0.098,0.004,1.70), (0.012,0.028,0.036), mP, 16, 10))   # orelha
        branco = mat('olho', (0.95,0.95,0.95), 0.15); iris = mat('iris', (0.25,0.15,0.07), 0.1); pupila = mat('pupila', (0.01,0.01,0.01), 0.05)
        partes.append(esfera((s*0.038,-0.088,1.725), (0.0175,0.0135,0.0145), branco, 20, 12))
        partes.append(esfera((s*0.038,-0.1005,1.725), (0.0095,0.003,0.0095), iris, 16, 8))
        partes.append(esfera((s*0.038,-0.1028,1.725), (0.004,0.0012,0.004), pupila, 12, 6))
        pal = esfera((s*0.038,-0.089,1.729), (0.0185,0.0145,0.0145), mP, 20, 12); cortar(pal, zmin=1.737); partes.append(pal)  # pálpebra
        for k in range(3):  # sobrancelha arqueada
            bpy.ops.mesh.primitive_cube_add(location=(s*(0.022+k*0.014), -0.1 + k*0.002, 1.752 + (0.003 if k == 1 else 0)))
            sob = bpy.context.object; sob.scale = (0.0085,0.005,0.0035); sob.rotation_euler = (0, s*(0.25 - k*0.25), 0)
            sob.data.materials.append(mH); bpy.ops.object.transform_apply(scale=True, rotation=True); partes.append(sob)
    import random
    random.seed(hash(estilo) % 1000)
    def tufos(n, raio, zmin, esc=1.0):
        for _ in range(n):
            th = random.uniform(0, 2*math.pi); ph = random.uniform(0.0, 1.15)
            p = (math.sin(ph)*math.cos(th)*0.102*esc, 0.008 + math.sin(ph)*math.sin(th)*0.118*esc, hz + 0.012 + math.cos(ph)*0.127*esc)
            if p[2] < zmin or p[1] < -0.085: continue
            partes.append(esfera(p, (raio, raio, raio*0.8), mH, 10, 6))
    if estilo == 'curto':
        c = esfera((0,0.008,hz+0.012), (0.1,0.115,0.125), mH); cortar(c, zmin=1.735); partes.append(c)
        tufos(45, 0.022, 1.75)
    elif estilo == 'black':
        c = esfera((0,0.01,hz+0.05), (0.13,0.14,0.13), mH); cortar(c, zmin=1.72); partes.append(c)
        tufos(70, 0.035, 1.74, 1.3)
    elif estilo == 'moicano':
        c = esfera((0,0.01,hz+0.03), (0.03,0.12,0.13), mH); cortar(c, zmin=1.75); partes.append(c)
        c2 = esfera((0,0.008,hz+0.006), (0.098,0.113,0.124), mH); cortar(c2, zmin=1.76); partes.append(c2)
        for k in range(9):
            a = -0.9 + k*0.25
            partes.append(esfera((0, 0.008 + math.sin(a)*0.13, hz + 0.02 + math.cos(a)*0.13), (0.018, 0.022, 0.03), mH, 10, 6))
    elif estilo in ('longo','rabo'):
        c = esfera((0,0.01,hz+0.012), (0.102,0.117,0.127), mH); cortar(c, zmin=1.70); partes.append(c)
        tufos(40, 0.024, 1.74)
        if estilo == 'longo':
            t = esfera((0,0.06,1.6), (0.1,0.05,0.14), mH); partes.append(t)
        else:
            t = esfera((0,0.13,1.66), (0.035,0.05,0.09), mH); partes.append(t)
    if extra == 'barba':
        b = esfera((0,-0.035,1.64), (0.074,0.074,0.065), mH); cortar(b, ymax=-0.01); partes.append(b)
    if extra == 'faixa':
        bpy.ops.mesh.primitive_cylinder_add(radius=0.104, depth=0.025, location=(0,0.005,1.77), vertices=32)
        f = bpy.context.object; f.data.materials.append(mat('faixa', (1,1,1))); bpy.ops.object.shade_smooth(); partes.append(f)
    if extra == 'coroa':
        ouro = mat('ouro', (1.0,0.78,0.15), 0.25, emit=0.3)
        try: ouro.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value = 1.0
        except Exception: pass
        bpy.ops.mesh.primitive_cylinder_add(radius=0.08, depth=0.04, location=(0,0.01,1.85), vertices=32)
        f = bpy.context.object; f.data.materials.append(ouro); partes.append(f)
        for i in range(8):
            a = i*math.pi/4
            bpy.ops.mesh.primitive_cone_add(radius1=0.015, depth=0.05, location=(math.cos(a)*0.075, 0.01+math.sin(a)*0.075, 1.89), vertices=8)
            p = bpy.context.object; p.data.materials.append(ouro); partes.append(p)
    return partes

def chuteiras(mB):
    ps = []
    for s in (1,-1):
        bpy.ops.mesh.primitive_cube_add(location=(s*0.11,-0.04,0.045)); b = bpy.context.object
        b.scale = (0.048,0.13,0.045); b.data.materials.append(mB)
        md = b.modifiers.new('bv','BEVEL'); md.width = 0.03; md.segments = 4
        aplicar_mods(b); bpy.ops.object.shade_smooth(); ps.append(b)
    return ps

# ---------- esqueleto ----------
OSSOS = [
 ('quadril',(0,0,0.95),(0,0,1.12),None), ('coluna',(0,0,1.12),(0,0,1.40),'quadril'),
 ('pescoco',(0,0,1.40),(0,0,1.60),'coluna'), ('cabeca',(0,0,1.60),(0,0,1.85),'pescoco'),
]
for s,l in ((1,'L'),(-1,'R')):
    OSSOS += [
     ('braco.'+l,(s*0.19,0,1.44),(s*0.32,0.01,1.18),'coluna'), ('antebraco.'+l,(s*0.32,0.01,1.18),(s*0.41,-0.02,0.95),'braco.'+l),
     ('mao.'+l,(s*0.41,-0.02,0.95),(s*0.46,-0.03,0.82),'antebraco.'+l),
     ('coxa.'+l,(s*0.10,0,0.93),(s*0.11,-0.01,0.52),'quadril'), ('canela.'+l,(s*0.11,-0.01,0.52),(s*0.11,0.02,0.10),'coxa.'+l),
     ('pe.'+l,(s*0.11,0.02,0.10),(s*0.11,-0.15,0.03),'canela.'+l),
    ]

def esqueleto():
    ad = bpy.data.armatures.new('esq'); arm = bpy.data.objects.new('jogador', ad)
    bpy.context.collection.objects.link(arm); ativar(arm)
    bpy.ops.object.mode_set(mode='EDIT')
    for n,h,t,p in OSSOS:
        b = ad.edit_bones.new(n); b.head = h; b.tail = t; b.roll = 0
        if p: b.parent = ad.edit_bones[p]; b.use_connect = False
    bpy.ops.object.mode_set(mode='OBJECT')
    return arm

def dist_seg(p, a, b):
    ab = b - a; t = max(0.0, min(1.0, (p - a).dot(ab) / ab.length_squared))
    return (p - (a + ab * t)).length

def pesos(o, arm):
    segs = [(n, Vector(h), Vector(t)) for n,h,t,p in OSSOS]
    grupos = {n: o.vertex_groups.new(name=n) for n,_,_ in segs}
    for v in o.data.vertices:
        p = v.co
        if p.z > 1.56 and abs(p.x) < 0.2:
            grupos['cabeca'].add([v.index], 1.0, 'REPLACE'); continue
        ds = sorted(((dist_seg(p,a,b), n) for n,a,b in segs))
        (d1,n1),(d2,n2) = ds[0], ds[1]
        w1 = 1/(d1+1e-4)**4; w2 = 1/(d2+1e-4)**4
        if d2 > d1*1.8: w2 = 0
        s = w1 + w2
        grupos[n1].add([v.index], w1/s, 'REPLACE')
        if w2: grupos[n2].add([v.index], w2/s, 'REPLACE')
    md = o.modifiers.new('arm','ARMATURE'); md.object = arm
    o.parent = arm

# ---------- animacoes ----------
def chave(arm, f, poses):
    for n,(x,y,z) in poses.items():
        pb = arm.pose.bones[n]; pb.rotation_mode = 'XYZ'
        pb.rotation_euler = (math.radians(x), math.radians(y), math.radians(z))
        pb.keyframe_insert('rotation_euler', frame=f)

def zerar(arm):
    for pb in arm.pose.bones:
        pb.rotation_mode = 'XYZ'; pb.rotation_euler = (0,0,0); pb.location = (0,0,0)

TODOS = [n for n,_,_,_ in OSSOS]
def base(extra=None):
    d = {n:(0,0,0) for n in TODOS}
    d['braco.L'] = (0,0,0); d['braco.R'] = (0,0,0)
    if extra: d.update(extra)
    return d

def anim(arm, nome, quadros):
    act = bpy.data.actions.new(nome)
    arm.animation_data.action = act
    zerar(arm)
    for f, poses in quadros: chave(arm, f, base(poses))
    tr = arm.animation_data.nla_tracks.new(); tr.name = nome
    st = tr.strips.new(nome, 1, act); st.name = nome
    arm.animation_data.action = None
    return act

def animacoes(arm):
    arm.animation_data_create()
    R = 'L'; Lr = 'R'
    def corrida(fase):
        s = 1 if fase == 0 else -1
        return {'coxa.L':(-38*s,0,0), 'coxa.R':(38*s,0,0),
                'canela.L':(25 if s>0 else 70,0,0), 'canela.R':(70 if s>0 else 25,0,0),
                'braco.L':(35*s,0,0), 'braco.R':(-35*s,0,0),
                'antebraco.L':(-55,0,0), 'antebraco.R':(-55,0,0), 'coluna':(8,0,0)}
    anim(arm, 'correr', [(1,corrida(0)),(9,corrida(1)),(17,corrida(0))])
    anim(arm, 'parado', [(1,{'coluna':(2,0,0),'antebraco.L':(-10,0,0),'antebraco.R':(-10,0,0)}),
                         (25,{'coluna':(5,0,0),'antebraco.L':(-14,0,0),'antebraco.R':(-14,0,0)}),
                         (49,{'coluna':(2,0,0),'antebraco.L':(-10,0,0),'antebraco.R':(-10,0,0)})])
    anim(arm, 'chutar', [(1,{}),
                         (6,{'coxa.R':(45,0,0),'canela.R':(95,0,0),'braco.L':(-50,0,-30),'braco.R':(30,0,0),'coluna':(-8,0,0)}),
                         (11,{'coxa.R':(-75,0,0),'canela.R':(5,0,0),'braco.L':(30,0,-20),'braco.R':(-40,0,0),'coluna':(12,0,0)}),
                         (18,{})])
    anim(arm, 'comemorar', [(1,{}),
                         (8,{'braco.L':(0,0,-150),'braco.R':(0,0,150),'coluna':(-10,0,0)}),
                         (16,{'braco.L':(0,0,-160),'braco.R':(0,0,160),'coluna':(-14,0,0)}),
                         (24,{'braco.L':(0,0,-150),'braco.R':(0,0,150),'coluna':(-10,0,0)})])
    if GOLEIRO:
        anim(arm, 'defender', [(1,{}),
                         (5,{'quadril':(0,0,55),'braco.L':(0,0,-150),'braco.R':(0,0,150),'coxa.L':(0,0,-25),'coxa.R':(0,0,20)}),
                         (11,{'quadril':(0,0,80),'braco.L':(0,0,-170),'braco.R':(0,0,170),'coxa.L':(0,0,-30),'coxa.R':(0,0,25)}),
                         (24,{'quadril':(0,0,85),'braco.L':(0,0,-165),'braco.R':(0,0,165),'coxa.L':(0,0,-20),'coxa.R':(0,0,15)})])

# ---------- cena / render ----------
def motor():
    sc = bpy.context.scene
    for eng in ('BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT', 'CYCLES'):
        try: sc.render.engine = eng; break
        except Exception: pass
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    try: sc.view_settings.view_transform = 'Standard'
    except Exception: pass
    w = sc.world or bpy.data.worlds.new('W'); sc.world = w
    try:
        w.use_nodes = True
        bg = w.node_tree.nodes.get('Background'); bg.inputs[0].default_value = (0.6,0.7,0.85,1); bg.inputs[1].default_value = 0.35
    except Exception: pass
    for nome, loc, en, cor in (('chave',(-2,-3,3),260,(1,0.95,0.9)), ('prench',(3,-2,2),90,(0.8,0.9,1)), ('recorte',(0,3,3),220,(1,1,1))):
        ld = bpy.data.lights.new(nome, 'AREA'); ld.energy = en; ld.size = 2; ld.color = cor
        lo = bpy.data.objects.new(nome, ld); bpy.context.collection.objects.link(lo); lo.location = loc
        d = Vector((0,0,1.2)) - Vector(loc); lo.rotation_euler = d.to_track_quat('-Z','Y').to_euler()

def camera_retrato(res=640):
    cd = bpy.data.cameras.new('cam'); cd.lens = 55
    c = bpy.data.objects.new('cam', cd); bpy.context.collection.objects.link(c)
    c.location = (1.2,-3.6,1.35)
    d = Vector((0,0,1.0)) - c.location; c.rotation_euler = d.to_track_quat('-Z','Y').to_euler()
    sc = bpy.context.scene; sc.camera = c
    sc.render.resolution_x = res; sc.render.resolution_y = res

def fazer(cid, camisa, calcao, meiao, pele, cab, estilo, chut, extra):
    global GOLEIRO
    GOLEIRO = (extra == 'goleiro')
    limpar()
    mC = mat('camisa', camisa, 0.8); mS = mat('calcao', calcao, 0.7); mM = mat('meiao', meiao, 0.9)
    mP = mat('pele', pele, 0.5, sss=0.15); mB = mat('chuteira', chut, 0.35); mH = mat('cabelo', cab, 0.85)
    c = corpo(mC, mS, mM, mP, mB)
    partes = cabeca(mP, mH, estilo, extra) + chuteiras(mB) + detalhes(cid, camisa, calcao, mB)
    bpy.ops.object.select_all(action='DESELECT')
    for p in partes: p.select_set(True)
    c.select_set(True); bpy.context.view_layer.objects.active = c
    bpy.ops.object.join()
    arm = esqueleto(); pesos(c, arm); animacoes(arm)
    # exporta GLB
    bpy.ops.object.select_all(action='DESELECT'); c.select_set(True); arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    kw = dict(filepath=os.path.join(OUT, cid + '.glb'), export_format='GLB', use_selection=True, export_apply=True)
    try: bpy.ops.export_scene.gltf(export_animation_mode='ACTIONS', **kw)
    except TypeError: bpy.ops.export_scene.gltf(**kw)
    # retrato: pose parado
    for t in arm.animation_data.nla_tracks: t.mute = True
    arm.animation_data.action = bpy.data.actions.get('parado'); bpy.context.scene.frame_set(1)
    motor(); camera_retrato()
    bpy.context.scene.render.filepath = os.path.join(OUT, cid + '_retrato.png')
    bpy.ops.render.render(write_still=True)
    if SO:
        arm.animation_data.action = bpy.data.actions.get('correr'); bpy.context.scene.frame_set(1)
        bpy.context.scene.render.filepath = os.path.join(OUT, cid + '_teste_correr.png')
        bpy.ops.render.render(write_still=True)
    return c, arm

for ch in CHARS:
    if SO and ch[0] not in SO: continue
    fazer(*ch)

with open(os.path.join(OUT, 'pronto.txt'), 'w') as f: f.write('ok')
print('PRONTO ->', OUT)
