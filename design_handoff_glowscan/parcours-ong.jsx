const { CompositionStage, useComposition, Easing, clamp } = window;
const C = { bg: '#f5ead8', surf: '#ebddc5', text: '#201e1d', acc: '#c67139', a1: '#fff2eb', a2: '#ffe1d0', a3: '#ffc6a5', a7: '#8c491a', a8: '#643312', a9: '#402310', g1: '#f0fae1', g2: '#e1eecc', g6: '#728157', g7: '#56633f', g8: '#3d472b', n1: '#f9f4ed', n2: '#eee7db', n3: '#dcd3c4', n4: '#c0b6a5', n7: '#645c50', n8: '#474238', n9: '#2e2b25', div: 'rgba(32,30,29,.16)', wa: '#0b5f55' };
const HF = '"Caprasimo", system-ui, sans-serif', BF = '"Figtree", system-ui, sans-serif';
const IMG = { h: 'img/herpes.jpeg' };
const DATA = {};
const IMG_READY = Promise.all(Object.values(IMG).map(u => fetch(u).then(r => r.blob()).then(b => new Promise(res => { const fr = new FileReader(); fr.onload = () => { DATA[u] = fr.result; res(); }; fr.onerror = () => res(); fr.readAsDataURL(b); })).catch(() => {})));
const Img = ({ pos = 'center', style }) => <img src={DATA[IMG.h] || IMG.h} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: pos, ...style }} />;
const M = { enter: (T, s, d = 0.45) => Easing.easeOutCubic(clamp((T - s) / d, 0, 1)), move: (T, s, d = 0.7) => Easing.easeInOutCubic(clamp((T - s) / d, 0, 1)), pop: (T, s, d = 0.4) => Easing.easeOutBack(clamp((T - s) / d, 0, 1)) };
const win = (T, a, b = Infinity, f = 0.3) => Math.max(0, Math.min(M.enter(T, a, f), 1 - M.enter(T, b - f, f)));
const press = (T, t) => (T >= t && T < t + 0.22) ? Math.sin((T - t) / 0.22 * Math.PI) : 0;
const typed = (T, s, txt, cps) => txt.slice(0, clamp(Math.floor((T - s) * cps), 0, txt.length));
const A = (x, y, w, h, s) => ({ position: 'absolute', left: x, top: y, width: w, height: h, boxSizing: 'border-box', ...s });
const lerp = (a, b, p) => a + (b - a) * p;
const vis = o => ({ opacity: o, visibility: o <= 0.001 ? 'hidden' : 'visible' });
const useC = () => { const { T, CUES } = useComposition(); return { T, Q: CUES }; };
const caret = (T, on) => on && Math.floor(T * 2.5) % 2 === 0 ? '|' : '';
const Tag = ({ bg, fg, children, style }) => <span style={{ display: 'inline-flex', alignSelf: 'center', alignItems: 'center', padding: '4px 12px', borderRadius: 999, background: bg, color: fg, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', ...style }}>{children}</span>;
const Btn = ({ x, y, w, h = 52, bg = C.acc, fg = C.n1, pr = 0, fs = 15, children, style }) => <div style={A(x, y, w, h, { borderRadius: 999, background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: fs, fontWeight: 700, transform: `scale(${1 - pr * 0.05})`, filter: pr ? `brightness(${1 - pr * 0.15})` : 'none', ...style })}>{children}</div>;
const Chip = ({ on, w, children, h = 40 }) => <span style={{ width: w, height: h, flex: 'none', borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, border: `1px solid ${on ? C.acc : C.div}`, background: on ? C.acc : 'transparent', color: on ? C.n1 : C.text }}>{children}</span>;
const Check = ({ ok, children, fs = 14 }) => <span style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: fs, fontWeight: 600, opacity: ok ? 1 : 0.45 }}><span style={{ flex: 'none', width: 22, height: 22, borderRadius: 999, background: ok ? C.g6 : C.n3, color: C.n1, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{ok ? '✓' : ''}</span>{children}</span>;
const Lbl = ({ x, y, w = 600, children }) => <div style={A(x, y, w, 24, { fontSize: 13, fontWeight: 700 })}>{children}</div>;

/* ───────── TÉLÉPHONE DU RELAIS ───────── */
function StatusBar() {
  const { T, Q } = useC();
  const t = T < Q.Cas ? '7:52' : T < Q.Retour ? '6:12' : T < Q.Orientation ? '9:05' : '9:20';
  const low = T >= Q.Cas && T < Q.Cas + 6.6;
  return <div style={A(0, 0, 400, 44, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 30px', fontSize: 14, fontWeight: 700, zIndex: 30, background: C.bg })}><span>{t}</span><span style={{ width: 100, height: 28, borderRadius: 999, background: C.n9 }}></span><span style={{ color: low ? C.a7 : C.text }}>{low ? 'E · 1 barre' : '3G · 64 %'}</span></div>;
}
const PHead = ({ k, title, sub }) => <><div style={A(22, 54, 356, 28, { display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}><Tag bg={C.g1} fg={C.g8}>{k}</Tag></div><div style={A(22, 90, 356, 60, { display: 'flex', flexDirection: 'column' })}><span style={{ fontFamily: HF, fontSize: 24, lineHeight: 1.1 }}>{title}</span><span style={{ fontSize: 12, color: C.n7, marginTop: 4 }}>{sub}</span></div></>;
function Formation() {
  const { T, Q } = useC(); const f = Q.Formation;
  const L = ['Lumière du jour, sans flash', 'À 20 cm, image nette', '3 angles : de loin, de près, de côté', 'Une pièce à côté pour l\'échelle'];
  const ans = T >= f + 3.8, ok = T >= f + 4.6;
  return <div style={{ position: 'absolute', inset: 0, background: C.bg, ...vis(win(T, f + 0.1, Q.Cas + 0.2)) }}>
    <PHead k="Formation · module 1" title="Bien photographier la peau" sub="Programme Peau saine Extrême-Nord · 6 min" />
    {L.map((l, i) => { const d = T >= f + 0.6 + i * 0.5; return <div key={l} style={A(22, 164 + i * 58, 356, 48, { borderRadius: 999, background: d ? C.g1 : C.surf, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', fontSize: 14, fontWeight: 600 })}><span style={{ width: 26, height: 26, flex: 'none', borderRadius: 999, background: d ? C.g6 : C.n3, color: C.n1, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{d ? '✓' : i + 1}</span>{l}</div>; })}
    <Lbl x={22} y={410} w={356}>Quiz : quelle photo est exploitable ?</Lbl>
    {[0, 1].map(i => <div key={i} style={A(22 + i * 186, 440, 170, 170, { borderRadius: 24, overflow: 'hidden', outline: ans && i === 1 ? `4px solid ${C.g6}` : ans && i === 0 ? `4px solid ${C.acc}` : 'none' })}><Img pos="center 40%" style={{ filter: i === 0 ? 'blur(7px) brightness(.55)' : 'none' }} />{ans && <span style={A(10, 126, 150, 34, { borderRadius: 999, background: i ? C.g6 : C.acc, color: C.n1, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' })}>{i ? 'Nette et éclairée' : 'Floue et sombre'}</span>}</div>)}
    <div style={A(22, 626, 356, 72, { borderRadius: 24, background: C.g1, color: C.g8, padding: '12px 18px', ...vis(M.enter(T, f + 4.6)) })}><b style={{ fontSize: 15 }}>Module validé ✓</b><div style={{ fontSize: 13, marginTop: 2 }}>Vous pouvez envoyer vos cas au réseau.</div></div>
    <Btn x={22} y={716} w={356} h={56} bg={ok ? C.acc : C.n4} pr={press(T, f + 6.0)}>Envoyer mon premier cas</Btn>
  </div>;
}
function Cas() {
  const { T, Q } = useC(); const c = Q.Cas;
  const n = [c + 1.0, c + 1.6, c + 2.2].filter(t => T >= t).length;
  const flash = [c + 1.0, c + 1.6, c + 2.2].reduce((m, s) => Math.max(m, T >= s && T < s + 0.3 ? 1 - (T - s) / 0.3 : 0), 0);
  const pick = T >= c + 3.4, sent = T >= c + 4.6, up = T >= c + 6.6;
  return <div style={{ position: 'absolute', inset: 0, background: C.bg, ...vis(win(T, c + 0.1, Q.Avis + 0.2)) }}>
    <PHead k="Nouveau cas · payé par le programme" title="Femme, 28 ans · lèvre" sub="Depuis 3 jours · brûlures avant les boutons" />
    <div style={A(22, 158, 356, 240, { borderRadius: 28, overflow: 'hidden' })}><Img pos={['center 40%', 'center 30%', 'left 40%'][Math.min(n, 2)]} /><span style={A(12, 12, 90, 28, { borderRadius: 999, background: C.n9, color: C.n1, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' })}>Photo {Math.min(n + 1, 3)} / 3</span><span style={{ position: 'absolute', inset: 0, background: '#fff', opacity: flash }}></span></div>
    {[0, 1, 2].map(i => <div key={i} style={A(22 + i * 66, 410, 56, 56, { borderRadius: 16, overflow: 'hidden', border: n > i ? 'none' : `2px dashed ${C.n4}` })}>{n > i && <Img pos={['center 40%', 'center 30%', 'left 40%'][i]} />}</div>)}
    <Lbl x={22} y={480} w={356}>Votre diagnostic, avant de voir l'IA</Lbl>
    <div style={A(22, 508, 356, 40, { display: 'flex', gap: 8 })}><Chip on={pick} w={104}>Impétigo</Chip><Chip w={90}>Herpès</Chip><Chip w={90}>Eczéma</Chip></div>
    <div style={A(22, 562, 356, 44, { borderRadius: 999, background: C.surf, display: 'flex', alignItems: 'center', padding: '0 16px', fontSize: 13, fontWeight: 600, ...vis(M.enter(T, c + 5.2)) })}>Suggestion IA, visible après votre choix : herpès 84 %</div>
    <div style={A(22, 620, 356, 80, { borderRadius: 24, background: up ? C.g1 : C.a1, color: up ? C.g8 : C.a9, padding: '12px 18px', ...vis(M.enter(T, c + 4.8)) })}><b style={{ fontSize: 14 }}>{up ? 'Envoyé ✓ au réseau' : 'Réseau faible · cas enregistré'}</b><div style={{ fontSize: 12.5, marginTop: 2 }}>{up ? '3 photos compressées · 240 Ko' : 'Envoi automatique dès que le signal revient'}</div></div>
    <Btn x={22} y={716} w={356} h={56} bg={sent ? C.n9 : pick ? C.acc : C.n4} pr={Math.max(press(T, c + 1.0), press(T, c + 1.6), press(T, c + 2.2), press(T, c + 4.6))}>{n < 3 ? 'Prendre la photo' : sent ? 'Cas enregistré' : 'Envoyer à un dermatologue'}</Btn>
  </div>;
}
function Retour() {
  const { T, Q } = useC(); const r = Q.Retour, nt = win(T, r + 0.2, r + 1.9, 0.3);
  const pct = lerp(73, 75, M.move(T, r + 2.6, 0.8)), cases = T >= r + 2.6 ? 12 : 11;
  return <div style={{ position: 'absolute', inset: 0, background: C.bg, ...vis(win(T, r + 0.1, Q.Orientation + 0.2)) }}>
    <PHead k="Retour du dermatologue" title="Cas #M-231 · lèvre" sub="Dr Aïcha Nkemdirim · réponse en 2 h 28" />
    <div style={A(22, 158, 356, 110, { borderRadius: 24, background: C.surf, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8 })}><span style={{ fontSize: 12, color: C.n7, fontWeight: 700 }}>VOTRE DIAGNOSTIC</span><span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 16 }}><s style={{ color: C.n7 }}>Impétigo</s><span>→</span><b>Herpès labial</b></span></div>
    <div style={A(22, 280, 356, 170, { borderRadius: 24, background: C.g1, color: C.g8, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 6 })}><span style={{ fontSize: 12, fontWeight: 700 }}>LA LEÇON DE DR AÏCHA</span><span style={{ fontSize: 14, lineHeight: 1.5, color: C.g8 }}>Vésicules groupées sur fond rouge, brûlures avant l'éruption : c'est un herpès. L'impétigo donne des croûtes jaunes.</span></div>
    <div style={A(22, 462, 356, 50, { borderRadius: 999, background: C.surf, display: 'flex', alignItems: 'center', padding: '0 18px', fontSize: 13, fontWeight: 600 })}>Conduite : traiter au CSI · fiche jointe</div>
    <div style={A(22, 526, 356, 170, { borderRadius: 24, background: C.surf, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 })}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}><b style={{ fontSize: 14 }}>Herpès · {cases} / 20 cas</b><b style={{ fontSize: 14 }}>{Math.round(pct)} % d'accord</b></div>
      <div style={{ position: 'relative', height: 10, borderRadius: 999, background: C.n3 }}><div style={{ height: '100%', width: `${pct}%`, borderRadius: 999, background: C.acc }}></div><span style={{ position: 'absolute', left: '85%', top: -5, width: 3, height: 20, background: C.n9 }}></span></div>
      <span style={{ fontSize: 12, color: C.n7 }}>Autonome à 85 % sur 20 cas</span>
      <div style={{ display: 'flex', gap: 6 }}><Tag bg={C.g6} fg={C.n1}>Autonome : gale</Tag><Tag bg={C.n2} fg={C.n8}>Teigne 81 %</Tag></div>
    </div>
    <Btn x={22} y={716} w={356} h={56} pr={press(T, r + 4.6)}>J'ai compris</Btn>
    <div style={A(10, lerp(-90, 8, nt), 380, 70, { borderRadius: 24, background: C.n1, boxShadow: '0 10px 30px rgba(46,43,37,.25)', display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', zIndex: 25, ...vis(nt) })}><span style={{ width: 38, height: 38, borderRadius: 12, background: C.acc, color: C.n1, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>SMS</span><span style={{ display: 'flex', flexDirection: 'column' }}><b style={{ fontSize: 13 }}>GlowScan · réseau</b><span style={{ fontSize: 13 }}>Dr Aïcha a répondu au cas #M-231</span></span></div>
  </div>;
}
function Orientation() {
  const { T, Q } = useC(); const o = Q.Orientation, sent = T >= o + 2.6;
  const S = [['Orientée par le CSI', '13 oct.', o], ['Arrivée à l\'hôpital', '16 oct.', o + 4.0], ['Compte rendu de l\'hôpital reçu', '18 oct.', o + 5.0]];
  return <div style={{ position: 'absolute', inset: 0, background: C.bg, ...vis(win(T, o + 0.1, Q.Pilotage + 0.2)) }}>
    <PHead k="Orientation vers l'hôpital" title="Cas #M-236 · Fatimé, 34 ans" sub="Avis de Dr Owona : lésion pigmentée qui saigne" />
    <div style={A(22, 158, 356, 76, { borderRadius: 24, background: C.a8, color: C.n1, padding: '12px 18px' })}><b style={{ fontSize: 15 }}>À orienter sous 7 jours</b><div style={{ fontSize: 13, marginTop: 2 }}>Examen et biopsie à l'hôpital</div></div>
    <div style={A(22, 246, 356, 250, { borderRadius: 24, background: C.surf, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 })}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 12, fontWeight: 700, color: C.n7 }}>FICHE DE RÉFÉRENCE</span><b style={{ fontSize: 12 }}>REF-M236</b></div>
      <b style={{ fontSize: 16 }}>Hôpital régional de Maroua</b><span style={{ fontSize: 13, color: C.n8 }}>Service de dermatologie</span>
      <span style={{ padding: '10px 14px', borderRadius: 999, background: C.bg, fontSize: 13, fontWeight: 600 }}>Rendez-vous : jeudi 16 oct. · 9 h</span>
      <Check ok>Dossier et photos transmis à l'hôpital</Check>
    </div>
    <div style={A(22, 510, 356, 190, { display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 4px' })}><Lbl x={4} y={0} w={340}>Suivi du patient</Lbl><div style={{ height: 22 }}></div>{S.map(([l, d, t]) => <Check key={l} ok={T >= t}>{l} · {d}</Check>)}</div>
    <Btn x={22} y={716} w={356} h={56} bg={sent ? C.g6 : C.acc} pr={press(T, o + 2.6)}>{sent ? 'Fiche envoyée par SMS ✓' : 'Envoyer la fiche à la patiente'}</Btn>
  </div>;
}
function Touches() {
  const { T, Q } = useC(); const f = Q.Formation, c = Q.Cas, r = Q.Retour, o = Q.Orientation;
  const taps = [[f + 3.8, 293, 525], [f + 6.0, 200, 744], [c + 1.0, 200, 744], [c + 1.6, 200, 744], [c + 2.2, 200, 744], [c + 3.4, 74, 528], [c + 4.6, 200, 744], [r + 4.6, 200, 744], [o + 2.6, 200, 744]];
  return taps.map(([t, x, y]) => { const op = win(T, t - 0.28, t + 0.32, 0.12); if (op <= 0) return null; return <span key={t} style={A(x - 22, y - 22, 44, 44, { borderRadius: 999, background: 'rgba(32,30,29,.28)', border: '2px solid rgba(249,244,237,.85)', opacity: op, transform: `scale(${1 - press(T, t) * 0.22})`, zIndex: 40 })}></span>; });
}
function Phone({ o }) {
  return <div style={A(746, 96, 428, 888, { borderRadius: 60, background: C.n9, padding: 14, boxShadow: '0 30px 80px rgba(46,43,37,.35)', ...vis(o), transform: `scale(${0.96 + 0.04 * o})` })}>
    <div style={{ position: 'relative', width: 400, height: 860, borderRadius: 46, overflow: 'hidden', background: C.bg }}><Formation /><Cas /><Retour /><Orientation /><StatusBar /><Touches /></div>
  </div>;
}

/* ───────── ORDINATEUR ───────── */
const isDoc = (T, Q) => T >= Q.Avis && T < Q.Pilotage;
function Sidebar() {
  const { T, Q } = useC(); const doc = isDoc(T, Q);
  const nav = doc ? ['Tableau de bord', 'Télé-expertise', 'Patients', 'Confrères', 'Portefeuille'] : ['Programmes', 'Agents', 'Cas et avis', 'Budget', 'Rapports', 'Connecteurs'];
  const active = doc ? 1 : T < Q.Pilotage ? 0 : T < Q.Rapport ? 3 : 4;
  return <div style={A(0, 0, 240, 892, { background: C.surf, padding: '24px 20px' })}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><img src="client/public/glowscan-mark.png" style={{ width: 34, height: 34, borderRadius: 999 }} /><span style={{ fontFamily: HF, fontSize: 18 }}>GlowScan <span style={{ color: C.g7 }}>{doc ? 'Derm' : 'Programmes'}</span></span></div>
    {nav.map((l, i) => <div key={l} style={A(20, 90 + i * 48, 200, 40, { borderRadius: 999, padding: '0 16px', display: 'flex', alignItems: 'center', fontSize: 14, fontWeight: i === active ? 700 : 600, background: i === active ? C.bg : 'transparent', color: i === active ? C.a8 : C.text })}>{l}</div>)}
    <div style={A(20, 800, 200, 56, { display: 'flex', alignItems: 'center', gap: 10 })}><span style={{ width: 40, height: 40, borderRadius: 999, background: doc ? C.g6 : C.a7, color: C.n1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>{doc ? 'AN' : 'HB'}</span><span style={{ display: 'flex', flexDirection: 'column' }}><b style={{ fontSize: 13 }}>{doc ? 'Dr Aïcha N.' : 'Hadja Bello'}</b><span style={{ fontSize: 11, color: C.n7 }}>{doc ? 'Dermatologue du réseau' : 'Coordinatrice ONG'}</span></span></div>
  </div>;
}
function Programme() {
  const { T, Q } = useC(); const p = Q.Programme, o = win(T, p, Q.Formation, 0.25);
  const name = typed(T, p + 0.5, 'Peau saine Extrême-Nord', 20), nf = T >= p + 0.4 && T < p + 1.8;
  const agents = T >= p + 3.0, derms = T >= p + 3.6, bud = T >= p + 4.4, go = T >= p + 5.6;
  return <div style={{ position: 'absolute', inset: 0, ...vis(o) }}>
    <div style={A(272, 32, 900, 50, { fontFamily: HF, fontSize: 40 })}>Nouveau programme</div>
    <div style={A(272, 110, 900, 740, { borderRadius: 32, background: C.surf })}>
      <Lbl x={32} y={30}>Nom du programme</Lbl>
      <div style={A(32, 60, 836, 52, { borderRadius: 999, background: C.bg, border: `2px solid ${nf ? C.acc : C.div}`, display: 'flex', alignItems: 'center', padding: '0 20px', fontSize: 17, fontWeight: 700 })}>{name}{caret(T, nf)}</div>
      <Lbl x={32} y={136}>Districts de santé</Lbl>
      <div style={A(32, 164, 836, 40, { display: 'flex', gap: 10 })}><Chip on={T >= p + 1.9} w={120}>Mokolo</Chip><Chip on={T >= p + 2.3} w={100}>Mora</Chip><Chip w={120}>Maroua</Chip><Chip w={120}>Kousseri</Chip></div>
      <Lbl x={32} y={240}>Agents relais</Lbl>
      <Btn x={32} y={268} w={400} h={52} bg={agents ? C.n9 : C.acc} pr={press(T, p + 3.0)}>{agents ? '12 agents invités par SMS ✓' : 'Importer la liste des agents'}</Btn>
      <div style={A(452, 268, 416, 52, { display: 'flex', alignItems: 'center', fontSize: 13, color: C.n8, ...vis(M.enter(T, p + 3.1)) })}>CSI de Mokolo, Mora, Koza, Tokombéré…</div>
      <Lbl x={32} y={350}>Dermatologues du réseau</Lbl>
      <div style={A(32, 378, 836, 44, { display: 'flex', gap: 10, ...vis(M.enter(T, p + 3.6)) })}>{['Dr Aïcha Nkemdirim', 'Dr Sandrine Owona', 'Pr Mathieu Essomba'].map(n => <span key={n} style={{ height: 44, padding: '0 18px', borderRadius: 999, background: C.bg, display: 'flex', alignItems: 'center', fontSize: 14, fontWeight: 600 }}>{n}</span>)}</div>
      <Lbl x={32} y={450}>Avis prépayés</Lbl>
      <div style={A(32, 478, 836, 40, { display: 'flex', gap: 10 })}><Chip w={130}>100 avis</Chip><Chip on={bud} w={130}>200 avis</Chip><Chip w={130}>500 avis</Chip></div>
      <div style={A(32, 534, 836, 60, { fontSize: 15, lineHeight: 1.5, ...vis(M.enter(T, p + 4.5)) })}><b>600 000 F</b> · 3 000 F l'avis simple, 5 000 F l'avis urgent · solde suivi en temps réel</div>
      <Btn x={32} y={660} w={836} h={56} bg={go ? C.g6 : C.acc} pr={press(T, p + 5.6)}>{go ? 'Programme lancé ✓' : 'Lancer le programme'}</Btn>
    </div>
    <div style={A(1196, 110, 540, 740, { borderRadius: 32, background: C.n1, padding: 32, display: 'flex', flexDirection: 'column', gap: 18 })}>
      <b style={{ fontSize: 17 }}>Chaque avis de 3 000 F</b>
      <div style={{ display: 'flex', height: 48, borderRadius: 999, overflow: 'hidden', fontSize: 14, fontWeight: 700, color: C.n1 }}><span style={{ flex: 60, background: C.g6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Dermatologue 60 %</span><span style={{ flex: 20, background: '#0b5f55', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Relais</span><span style={{ flex: 20, background: C.acc, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>GlowScan</span></div>
      <span style={{ fontSize: 14, color: C.n8, lineHeight: 1.5 }}>Le relais est payé aussi : il est motivé à envoyer ses cas et à se former.</span>
      <b style={{ fontSize: 17, marginTop: 14 }}>Connecteurs</b>
      {[['Bogou (RAFT)', 'Partage des cas avec les réseaux existants'], ['DHIS2', 'Export mensuel vers le district et le ministère'], ['SMS', 'Pour les zones sans internet']].map(([n, s]) => <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 24, background: C.surf }}><span style={{ width: 28, height: 28, flex: 'none', borderRadius: 999, background: C.g6, color: C.n1, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</span><span style={{ display: 'flex', flexDirection: 'column' }}><b style={{ fontSize: 15 }}>{n}</b><span style={{ fontSize: 13, color: C.n7 }}>{s}</span></span></div>)}
    </div>
  </div>;
}
const LESSON = 'Vésicules groupées sur fond rouge, brûlures avant l\'éruption : herpès. L\'impétigo donne des croûtes jaunes.';
function Avis() {
  const { T, Q } = useC(); const a = Q.Avis, o = win(T, a, Q.Retour, 0.25);
  const corr = T >= a + 1.6, les = typed(T, a + 2.4, LESSON, 38), lf = T >= a + 2.2 && T < a + 5.2, csi = T >= a + 5.4, sent = T >= a + 6.4;
  return <div style={{ position: 'absolute', inset: 0, ...vis(o) }}>
    <div style={A(272, 24, 1464, 40, { display: 'flex', alignItems: 'center', gap: 16 })}><span style={{ fontSize: 15, fontWeight: 700, color: C.a7 }}>← Télé-expertise</span><span style={{ fontFamily: HF, fontSize: 26 }}>Cas #M-231 · CSI de Mokolo</span><span style={{ flex: 1 }}></span><Tag bg={sent ? C.g1 : C.a1} fg={sent ? C.g8 : C.a8} style={{ fontSize: 13, padding: '6px 14px' }}>{sent ? 'Avis envoyé · 1 800 F crédités' : 'Payé par le programme · avis simple 3 000 F'}</Tag></div>
    <div style={A(272, 80, 520, 380, { borderRadius: 28, overflow: 'hidden' })}><Img pos="center 40%" /></div>
    {['center 40%', 'center 30%', 'left 40%'].map((p, i) => <div key={p} style={A(272 + i * 178, 472, 164, 90, { borderRadius: 18, overflow: 'hidden', outline: i === 0 ? `3px solid ${C.acc}` : 'none' })}><Img pos={p} /></div>)}
    <div style={A(272, 580, 520, 280, { borderRadius: 28, background: C.surf, padding: 24, display: 'flex', flexDirection: 'column', gap: 10 })}><b style={{ fontSize: 16 }}>Femme, 28 ans · lèvre supérieure</b><span style={{ fontSize: 14, color: C.n8 }}>Depuis 3 jours · brûlures avant les boutons · pas de fièvre</span><span style={{ fontSize: 14, color: C.n8 }}>Envoyé par Moussa K., infirmier</span><span style={{ marginTop: 'auto', padding: '10px 16px', borderRadius: 999, background: C.bg, fontSize: 13 }}>Photos prises hors ligne à 06:12 · reçues à 06:40</span></div>
    <div style={A(816, 80, 460, 108, { borderRadius: 24, background: C.a1, padding: '16px 22px' })}><span style={{ fontSize: 12, fontWeight: 700, color: C.a8, letterSpacing: '.08em' }}>PROPOSITION DU RELAIS</span><div style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>Impétigo</div></div>
    <div style={A(816, 200, 460, 108, { borderRadius: 24, background: C.surf, padding: '16px 22px' })}><span style={{ fontSize: 12, fontWeight: 700, color: C.n7, letterSpacing: '.08em' }}>SUGGESTION IA · INDICATIVE</span><div style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>Herpès labial · 84 %</div></div>
    <Btn x={816} y={330} w={220} h={56} bg={C.bg} fg={C.text} style={{ border: `1px solid ${C.div}` }}>Confirmer le relais</Btn>
    <Btn x={1056} y={330} w={220} h={56} bg={corr ? C.n9 : C.acc} pr={press(T, a + 1.6)}>{corr ? 'Correction ✓' : 'Corriger'}</Btn>
    <div style={A(816, 410, 460, 52, { borderRadius: 999, background: C.g1, display: 'flex', alignItems: 'center', gap: 10, padding: '0 20px', fontSize: 16, fontWeight: 700, color: C.g8, ...vis(M.enter(T, a + 1.7)) })}>Votre diagnostic : herpès labial</div>
    <div style={A(816, 474, 460, 136, { borderRadius: 24, background: C.bg, border: `2px solid ${lf ? C.acc : C.div}`, padding: '14px 18px', fontSize: 14, lineHeight: 1.5, color: les ? C.text : C.n7 })}><span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.n7, marginBottom: 4 }}>LA LEÇON POUR LE RELAIS</span>{les || 'Le signe qui aurait dû l\'orienter…'}{caret(T, lf)}</div>
    <div style={A(816, 626, 460, 40, { display: 'flex', gap: 10 })}><Chip on={csi} w={180}>Traiter au CSI</Chip><Chip w={220}>Orienter vers l'hôpital</Chip></div>
    <Btn x={816} y={700} w={460} h={56} bg={sent ? C.g6 : C.acc} pr={press(T, a + 6.4)}>{sent ? 'Avis envoyé ✓' : 'Envoyer l\'avis'}</Btn>
    <div style={A(1300, 80, 436, 520, { borderRadius: 28, background: C.surf, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 })}><b style={{ fontSize: 16 }}>Parcours de Moussa K.</b>{[['Gale', 20, 90, true], ['Teigne', 16, 81], ['Herpès', 11, 73], ['Eczéma', 7, 71]].map(([d, n, p, ok]) => <div key={d} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}><b>{d} · {n}/20</b><span style={{ fontWeight: 700, color: ok ? C.g7 : C.text }}>{ok ? 'Autonome' : `${p} %`}</span></div><div style={{ position: 'relative', height: 8, borderRadius: 999, background: C.n3 }}><div style={{ height: '100%', width: `${p}%`, borderRadius: 999, background: ok ? C.g6 : C.acc }}></div><span style={{ position: 'absolute', left: '85%', top: -4, width: 2, height: 16, background: C.n9 }}></span></div></div>)}<span style={{ fontSize: 12, color: C.n7 }}>Autonome à 85 % d'accord sur 20 cas</span></div>
  </div>;
}
const CURVE = [['Juin', 58], ['Juil.', 66], ['Août', 72], ['Sept.', 79], ['Oct.', 83], ['Nov.', 86]];
function Pilotage() {
  const { T, Q } = useC(); const g = Q.Pilotage, o = win(T, g, Q.Rapport, 0.25);
  const rel = T >= g + 4.0, draw = M.move(T, g + 0.6, 2.2);
  const W = 836, H = 230, px = i => 20 + i * (W - 40) / 5, py = v => H - (v - 50) / 40 * H;
  const pts = CURVE.map(([, v], i) => `${px(i)},${py(v)}`).join(' ');
  return <div style={{ position: 'absolute', inset: 0, ...vis(o) }}>
    <div style={A(272, 32, 1000, 50, { fontFamily: HF, fontSize: 40 })}>Peau saine Extrême-Nord</div>
    <div style={A(272, 86, 1000, 24, { fontSize: 15, color: C.n7 })}>Lancé le 1er juin · Mokolo et Mora · 12 agents · 3 dermatologues</div>
    {[['Cas traités', '412'], ['Agents formés', '12'], ['Agents autonomes', '5'], ['Accord avec le dermatologue', '86 %']].map(([l, v], i) => <div key={l} style={A(272 + i * 372, 124, 348, 130, { borderRadius: 28, background: i === 3 ? C.g1 : C.surf, padding: 24, display: 'flex', flexDirection: 'column', gap: 6 })}><span style={{ fontSize: 14, color: C.n8 }}>{l}</span><span style={{ fontFamily: HF, fontSize: 40 }}>{v}</span></div>)}
    <div style={A(272, 276, 900, 370, { borderRadius: 28, background: C.surf, padding: 32 })}>
      <b style={{ fontSize: 16 }}>Accord moyen des agents avec le dermatologue</b>
      <svg width={W} height={H + 40} style={{ position: 'absolute', left: 32, top: 80, overflow: 'visible' }}>
        <line x1="0" x2={W} y1={py(85)} y2={py(85)} stroke={C.n9} strokeWidth="2" strokeDasharray="8 8" />
        <text x="0" y={py(85) + 24} textAnchor="start" fontSize="14" fontWeight="700" fill={C.n8}>Seuil d'autonomie 85 %</text>
        <polyline points={pts} fill="none" stroke={C.acc} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - draw} />
        {CURVE.map(([m, v], i) => <g key={m} opacity={draw >= i / 5 ? 1 : 0}><circle cx={px(i)} cy={py(v)} r="8" fill={C.acc} /><text x={px(i)} y={py(v) - 16} textAnchor="middle" fontSize="15" fontWeight="700" fill={C.text}>{v} %</text><text x={px(i)} y={H + 34} textAnchor="middle" fontSize="14" fill={C.n7}>{m}</text></g>)}
      </svg>
    </div>
    <div style={A(1196, 276, 540, 370, { borderRadius: 28, background: C.n1, padding: 32 })}>
      <b style={{ fontSize: 16 }}>Budget d'avis</b>
      <div style={{ fontFamily: HF, fontSize: 40, marginTop: 10 }}>{rel ? '262' : '62'} <span style={{ fontFamily: BF, fontSize: 16, fontWeight: 600, color: C.n7 }}>avis restants</span></div>
      <div style={{ height: 12, borderRadius: 999, background: C.n3, marginTop: 14 }}><div style={{ height: '100%', width: rel ? '66%' : '31%', borderRadius: 999, background: rel ? C.g6 : C.acc, transition: 'none' }}></div></div>
      <div style={{ marginTop: 16 }}><Tag bg={rel ? C.g1 : C.a1} fg={rel ? C.g8 : C.a8} style={{ fontSize: 13, padding: '6px 14px' }}>{rel ? 'Rechargé · environ 3 mois' : 'Solde bas · environ 3 semaines'}</Tag></div>
      <Btn x={32} y={270} w={476} h={52} bg={rel ? C.n9 : C.acc} pr={press(T, g + 4.0)}>{rel ? '200 avis ajoutés ✓' : 'Recharger 200 avis'}</Btn>
    </div>
    <div style={A(272, 666, 900, 190, { borderRadius: 28, background: C.surf, padding: '22px 32px', display: 'flex', flexDirection: 'column', gap: 12 })}><b style={{ fontSize: 16 }}>Maladies les plus vues · district de Mokolo</b>{[['Teigne', 31], ['Gale', 22], ['Eczéma', 14], ['Herpès', 9]].map(([d, p]) => <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 14 }}><b style={{ width: 80 }}>{d}</b><div style={{ flex: 1, height: 10, borderRadius: 999, background: C.n3 }}><div style={{ height: '100%', width: `${p * 2.6 * M.move(T, g + 1.0, 1.2)}%`, borderRadius: 999, background: C.g6 }}></div></div><span style={{ width: 44, textAlign: 'right', fontWeight: 700 }}>{p} %</span></div>)}</div>
    <div style={A(1196, 666, 540, 190, { borderRadius: 28, background: C.surf, padding: '22px 32px', display: 'flex', flexDirection: 'column', gap: 10 })}><b style={{ fontSize: 16 }}>Orientations vers l'hôpital</b><span style={{ fontFamily: HF, fontSize: 40 }}>9</span><span style={{ fontSize: 14, color: C.n8 }}>8 arrivées confirmées · 7 comptes rendus reçus</span></div>
  </div>;
}
function Rapport() {
  const { T, Q } = useC(); const r = Q.Rapport, o = win(T, r, Infinity, 0.25);
  const gen = M.enter(T, r + 1.2, 0.5), sent = T >= r + 3.2;
  const acts = [['Rapport envoyé au bailleur', r + 3.5], ['Export DHIS2 · districts de Mokolo et Mora', r + 3.9], ['36 cas partagés avec Bogou (RAFT)', r + 4.3]];
  return <div style={{ position: 'absolute', inset: 0, ...vis(o) }}>
    <div style={A(272, 32, 1000, 50, { fontFamily: HF, fontSize: 40 })}>Rapport de novembre</div>
    <Btn x={272} y={110} w={400} h={56} bg={gen > 0 ? C.n9 : C.acc} pr={press(T, r + 0.8)}>{gen > 0 ? 'Rapport généré ✓' : 'Générer le rapport mensuel'}</Btn>
    <div style={A(272, 196, 820, 670, { borderRadius: 20, background: C.n1, boxShadow: '0 12px 32px rgba(46,43,37,.18)', padding: 40, ...vis(gen), transform: `translateY(${(1 - gen) * 20}px)`, display: 'flex', flexDirection: 'column', gap: 18 })}>
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 14, borderBottom: `1px solid ${C.div}` }}><span style={{ display: 'flex', flexDirection: 'column' }}><b style={{ fontSize: 20 }}>Peau saine Extrême-Nord</b><span style={{ fontSize: 14, color: C.n7 }}>Rapport mensuel · novembre 2026</span></span><img src="client/public/glowscan-mark.png" style={{ width: 44, height: 44, borderRadius: 999 }} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>{[['78', 'cas ce mois'], ['86 %', 'accord moyen'], ['2 h 40', 'délai moyen de réponse']].map(([v, l]) => <div key={l} style={{ padding: 18, borderRadius: 18, background: C.surf }}><div style={{ fontFamily: HF, fontSize: 30 }}>{v}</div><div style={{ fontSize: 13, color: C.n8 }}>{l}</div></div>)}</div>
      <b style={{ fontSize: 15 }}>Formation</b><span style={{ fontSize: 14, lineHeight: 1.6, color: C.n8 }}>5 agents autonomes sur au moins une maladie. Moussa K. autonome sur la gale ; herpès en cours (75 %).</span>
      <b style={{ fontSize: 15 }}>Santé publique</b><span style={{ fontSize: 14, lineHeight: 1.6, color: C.n8 }}>Teigne en hausse à Mokolo (31 % des cas) : campagne scolaire recommandée. 9 orientations vers l'hôpital, 8 arrivées confirmées.</span>
      <b style={{ fontSize: 15 }}>Budget</b><span style={{ fontSize: 14, lineHeight: 1.6, color: C.n8 }}>138 avis utilisés sur 200. Recharge de 200 avis le 28 novembre.</span>
    </div>
    <div style={A(1120, 196, 616, 400, { borderRadius: 28, background: C.surf, padding: 32, display: 'flex', flexDirection: 'column', gap: 18, ...vis(gen) })}>
      <b style={{ fontSize: 17 }}>Partager</b>
      {acts.map(([l, t]) => <Check key={l} ok={T >= t} fs={16}>{l}</Check>)}
    </div>
    <Btn x={1152} y={520} w={552} h={52} bg={sent ? C.g6 : C.acc} pr={press(T, r + 3.2)} style={vis(gen)}>{sent ? 'Envoyé ✓' : 'Envoyer et exporter'}</Btn>
  </div>;
}
function Toasts() {
  const { T, Q } = useC(); const p = Q.Programme, a = Q.Avis;
  const t = [[p + 5.8, p + 7.4, 'Programme lancé', '12 invitations envoyées · module photo débloqué'], [a + 6.6, a + 8.4, 'Avis envoyé à Moussa ✓', 'Aussi par SMS · 1 800 F dans votre portefeuille']];
  return t.map(([s, e, h, sub]) => { const o = win(T, s, e, 0.3); return <div key={s} style={A(1300, 20, 436, 96, { borderRadius: 28, background: C.g6, color: C.n1, boxShadow: '0 12px 32px rgba(46,43,37,.22)', padding: '18px 24px', ...vis(o), transform: `translateY(${(1 - o) * -20}px)`, zIndex: 12 })}><b style={{ fontSize: 16 }}>{h}</b><div style={{ fontSize: 14, marginTop: 6 }}>{sub}</div></div>; });
}
function Desktop({ o }) {
  const { T, Q } = useC();
  const path = T < Q.Formation ? 'programmes/nouveau' : T < Q.Pilotage ? 'derm/tele-expertise/M-231' : T < Q.Rapport ? 'programmes/peau-saine' : 'programmes/peau-saine/rapports';
  return <div style={A(80, 84, 1760, 940, { borderRadius: 24, overflow: 'hidden', background: C.bg, boxShadow: '0 30px 80px rgba(46,43,37,.3)', ...vis(o), transform: `scale(${0.97 + 0.03 * o})` })}>
    <div style={A(0, 0, 1760, 48, { background: C.n3, display: 'flex', alignItems: 'center', gap: 8, padding: '0 20px' })}>{[0, 1, 2].map(i => <span key={i} style={{ width: 12, height: 12, borderRadius: 999, background: C.n4 }}></span>)}<span style={{ marginLeft: 420, width: 640, height: 30, borderRadius: 999, background: C.n1, display: 'flex', alignItems: 'center', padding: '0 16px', fontSize: 13, color: C.n8 }}>glow-scan.com/{path}</span></div>
    <div style={A(0, 48, 1760, 892)}><Sidebar /><Programme /><Avis /><Pilotage /><Rapport /><Toasts /></div>
  </div>;
}
function Cursor({ o }) {
  const { T, Q } = useC(); const p = Q.Programme, a = Q.Avis, g = Q.Pilotage, r = Q.Rapport;
  const K = [[p, 802, 328], [p + 1.5, 802, 328], [p + 1.8, 444, 426], [p + 2.2, 564, 426], [p + 2.8, 584, 536], [p + 4.2, 589, 740], [p + 5.4, 802, 930], [p + 6.8, 900, 800], [a, 1200, 700], [a + 1.4, 1246, 490], [a + 2.1, 1126, 682], [a + 5.0, 1126, 682], [a + 5.2, 986, 782], [a + 6.2, 1126, 860], [a + 7.6, 1300, 800], [g, 1100, 700], [g + 3.7, 1546, 708], [g + 6.0, 1400, 800], [r, 1000, 600], [r + 0.6, 552, 270], [r + 3.0, 1508, 678], [r + 5.6, 1400, 800]];
  let x = K[0][1], y = K[0][2];
  for (let i = 0; i < K.length - 1; i++) { const [t0, x0, y0] = K[i], [t1, x1, y1] = K[i + 1]; if (T >= t0) { const s = Math.max(t0, t1 - 0.75), pp = M.move(T, s, t1 - s); x = lerp(x0, x1, pp); y = lerp(y0, y1, pp); } }
  const clicks = [p + 0.4, p + 1.9, p + 2.3, p + 3.0, p + 4.4, p + 5.6, a + 1.6, a + 2.2, a + 5.4, a + 6.4, g + 4.0, r + 0.8, r + 3.2];
  const ring = clicks.reduce((m, c) => (T >= c && T < c + 0.45) ? (T - c) / 0.45 : m, -1);
  return <div style={{ position: 'absolute', left: x, top: y, ...vis(o), zIndex: 60, pointerEvents: 'none' }}>
    {ring >= 0 && <span style={{ position: 'absolute', left: -24, top: -24, width: 48, height: 48, borderRadius: 999, border: `3px solid ${C.acc}`, opacity: 1 - ring, transform: `scale(${0.4 + ring})` }}></span>}
    <svg width="30" height="36" viewBox="0 0 30 36" style={{ position: 'absolute', left: -3, top: -2 }}><path d="M3 2 L3 28 L10 22 L15 33 L20 31 L15 20 L25 20 Z" fill={C.n9} stroke={C.n1} strokeWidth="2" strokeLinejoin="round" /></svg>
  </div>;
}
function Label() {
  const { T, Q } = useC();
  const L = [[Q.Programme, 'Hadja Bello · coordinatrice ONG · Maroua'], [Q.Formation, 'Moussa K. · infirmier · CSI de Mokolo'], [Q.Cas, 'Moussa K. · CSI de Mokolo · 06:12'], [Q.Avis, 'Dr Aïcha · Douala · 08:40'], [Q.Retour, 'Moussa K. · 09:05'], [Q.Orientation, 'Moussa K. · un autre cas'], [Q.Pilotage, 'Hadja Bello · fin novembre'], [Q.Fin, '']];
  let cur = L[0]; for (const l of L) if (T >= l[0]) cur = l;
  if (T < Q.Programme) return null;
  const o = cur[1] ? M.enter(T, cur[0], 0.4) : 0;
  return <div style={A(0, 16, 1920, 40, { display: 'flex', justifyContent: 'center', ...vis(o) })}><span style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 18px', borderRadius: 999, background: C.n1, fontSize: 16, fontWeight: 700 }}><span style={{ width: 10, height: 10, borderRadius: 999, background: C.acc }}></span>{cur[1]}</span></div>;
}
const ROLE = { ong: ['ONG', C.a7], rel: ['Relais', '#0b5f55'], doc: ['Dermatologue', C.g7] };
function Caption() {
  const { T, Q } = useC();
  const L = [[Q.Programme, 'ong', 'L\'ONG crée son programme : districts, agents relais, dermatologues et avis prépayés.'], [Q.Formation, 'rel', 'L\'infirmier suit d\'abord le module photo. Une fois validé, il peut envoyer ses cas.'], [Q.Cas, 'rel', 'Il photographie le cas et propose son diagnostic avant de voir l\'IA. Même sans réseau, le cas part.'], [Q.Avis, 'doc', 'Dr Aïcha corrige et écrit la leçon. L\'avis est payé par le programme.'], [Q.Retour, 'rel', 'L\'infirmier reçoit la correction, même par SMS. Chaque cas le rapproche de l\'autonomie.'], [Q.Orientation, 'rel', 'Si le cas est grave, une fiche de référence part vers l\'hôpital, et le suivi remonte.'], [Q.Pilotage, 'ong', 'L\'ONG suit la formation des agents, les maladies par district et son budget d\'avis.'], [Q.Rapport, 'ong', 'En un clic : rapport au bailleur, export DHIS2 vers le ministère, cas partagés avec Bogou.'], [Q.Fin, null, '']];
  if (T < Q.Programme) return null;
  let i = 0; L.forEach((l, k) => { if (T >= l[0]) i = k; });
  const [t0, r, txt] = L[i]; if (!r) return null;
  const o = M.enter(T, t0, 0.35), [rl, rc] = ROLE[r];
  return <div style={A(120, 924, 1680, 120, { display: 'flex', justifyContent: 'center', alignItems: 'center', ...vis(o), transform: `translateY(${(1 - o) * 12}px)` })}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 22, padding: '18px 32px 18px 18px', borderRadius: 999, background: C.n1, boxShadow: '0 12px 32px rgba(46,43,37,.18)' }}>
      <span style={{ flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 150, height: 64, borderRadius: 999, background: rc, color: C.n1 }}><span style={{ fontSize: 12, fontWeight: 700, opacity: .85 }}>Étape {i + 1} / 8</span><b style={{ fontSize: 17 }}>{rl}</b></span>
      <span style={{ fontSize: 30, fontWeight: 600, lineHeight: 1.25 }}>{txt}</span>
    </div>
  </div>;
}
function Intro() {
  const { T, Q } = useC(); const o = win(T, 0, Q.Programme, 0.45);
  const P = [['HB', 'Hadja Bello', 'Coordinatrice ONG', 'Crée le programme, suit les résultats', C.a7], ['MK', 'Moussa K.', 'Infirmier relais', 'CSI de Mokolo, sans dermatologue', '#0b5f55'], ['AN', 'Dr Aïcha', 'Dermatologue du réseau', 'Corrige à distance et forme', C.g7], ['B', 'Le bailleur', 'Et le ministère', 'Reçoivent les résultats chaque mois', C.n8]];
  return <div style={{ position: 'absolute', inset: 0, background: C.bg, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 140px', gap: 56, ...vis(o), zIndex: 70 }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}><span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: C.a7 }}>GlowScan · programmes ONG</span><span style={{ fontFamily: HF, fontSize: 72, lineHeight: 1.08, maxWidth: 1500 }}>Former les soignants là où il n'y a pas de dermatologue.</span></div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>{P.map(([ini, n, r, d, c], i) => { const p = M.enter(T, 0.5 + i * 0.3, 0.45); return <div key={n} style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 28, borderRadius: 36, background: C.surf, opacity: p, transform: `translateY(${(1 - p) * 16}px)` }}><span style={{ width: 72, height: 72, borderRadius: 999, background: c, color: C.n1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700 }}>{ini}</span><b style={{ fontSize: 26 }}>{n}</b><span style={{ fontSize: 19, fontWeight: 700, color: c }}>{r}</span><span style={{ fontSize: 17, color: C.n8, lineHeight: 1.4 }}>{d}</span></div>; })}</div>
  </div>;
}
function Fin() {
  const { T, Q } = useC(); const o = win(T, Q.Fin, Infinity, 0.6);
  return <div style={{ position: 'absolute', inset: 0, background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, ...vis(o), zIndex: 80 }}>
    <img src="client/public/glowscan-mark.png" style={{ width: 120, height: 120, borderRadius: 999, transform: `scale(${0.9 + 0.1 * M.pop(T, Q.Fin, 0.6)})` }} />
    <span style={{ fontFamily: HF, fontSize: 80, lineHeight: 1 }}>GlowScan Africa</span>
    <span style={{ fontSize: 28, color: C.n8 }}>Chaque cas soigné forme un soignant de plus.</span>
    <span style={{ fontSize: 24, fontWeight: 700, color: C.a7 }}>glow-scan.com</span>
  </div>;
}
function Piece() {
  const { T, Q } = useC();
  const dox = Math.max(win(T, Q.Programme, Q.Formation, 0.35), win(T, Q.Avis, Q.Retour, 0.35), win(T, Q.Pilotage, Q.Fin, 0.35));
  const po = Math.max(win(T, Q.Formation, Q.Avis, 0.35), win(T, Q.Retour, Q.Pilotage, 0.35));
  return <div style={{ position: 'absolute', inset: 0, background: C.surf, color: C.text, fontFamily: BF, overflow: 'hidden' }}>
    <div style={{ position: 'absolute', inset: 0, transform: 'scale(.86)', transformOrigin: '960px 60px' }}><Phone o={po} /><Desktop o={dox} /><Cursor o={dox} /></div>
    <Label /><Caption /><Intro /><Fin />
  </div>;
}
window.ParcoursONG = function ParcoursONG() {
  const [ready, setReady] = React.useState(Object.keys(DATA).length === Object.keys(IMG).length);
  React.useEffect(() => { IMG_READY.then(() => setReady(true)); }, []);
  if (!ready) return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.bg, fontFamily: BF, fontSize: 18 }}>Chargement du parcours…</div>;
  return <CompositionStage width={1920} height={1080} scenes={window.OM_SCENES} playback={window.OM_PLAYBACK} bg={C.surf}><Piece /></CompositionStage>;
};
