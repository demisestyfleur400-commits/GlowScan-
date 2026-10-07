const { CompositionStage, useComposition, Easing, clamp } = window;
const C = { bg: '#f5ead8', surf: '#ebddc5', text: '#201e1d', acc: '#c67139', a1: '#fff2eb', a2: '#ffe1d0', a3: '#ffc6a5', a7: '#8c491a', a8: '#643312', a9: '#402310', g1: '#f0fae1', g2: '#e1eecc', g6: '#728157', g7: '#56633f', g8: '#3d472b', n1: '#f9f4ed', n2: '#eee7db', n3: '#dcd3c4', n4: '#c0b6a5', n7: '#645c50', n8: '#474238', n9: '#2e2b25', div: 'rgba(32,30,29,.16)' };
const HF = '"Caprasimo", system-ui, sans-serif', BF = '"Figtree", system-ui, sans-serif';
const IMG = { a: 'img/acne.jpeg' };
const DATA = {};
const IMG_READY = Promise.all(Object.values(IMG).map(u => fetch(u).then(r => r.blob()).then(b => new Promise(res => { const fr = new FileReader(); fr.onload = () => { DATA[u] = fr.result; res(); }; fr.onerror = () => res(); fr.readAsDataURL(b); })).catch(() => {})));
const Img = ({ pos = 'center', style }) => <img src={DATA[IMG.a] || IMG.a} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: pos, ...style }} />;
const M = { enter: (T, s, d = 0.45) => Easing.easeOutCubic(clamp((T - s) / d, 0, 1)), move: (T, s, d = 0.7) => Easing.easeInOutCubic(clamp((T - s) / d, 0, 1)), pop: (T, s, d = 0.4) => Easing.easeOutBack(clamp((T - s) / d, 0, 1)) };
const win = (T, a, b = Infinity, f = 0.3) => Math.max(0, Math.min(M.enter(T, a, f), 1 - M.enter(T, b - f, f)));
const press = (T, t) => (T >= t && T < t + 0.22) ? Math.sin((T - t) / 0.22 * Math.PI) : 0;
const typed = (T, s, txt, cps) => txt.slice(0, clamp(Math.floor((T - s) * cps), 0, txt.length));
const A = (x, y, w, h, s) => ({ position: 'absolute', left: x, top: y, width: w, height: h, boxSizing: 'border-box', ...s });
const lerp = (a, b, p) => a + (b - a) * p;
const vis = o => ({ opacity: o, visibility: o <= 0.001 ? 'hidden' : 'visible' });
const useC = () => { const { T, CUES } = useComposition(); return { T, Q: CUES }; };
const Tag = ({ bg, fg, children, style }) => <span style={{ display: 'inline-flex', alignSelf: 'center', alignItems: 'center', padding: '4px 12px', borderRadius: 999, background: bg, color: fg, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', ...style }}>{children}</span>;
const Btn = ({ x, y, w, h = 52, bg = C.acc, fg = C.n1, pr = 0, fs = 15, children, style }) => <div style={A(x, y, w, h, { borderRadius: 999, background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: fs, fontWeight: 700, transform: `scale(${1 - pr * 0.05})`, filter: pr ? `brightness(${1 - pr * 0.15})` : 'none', ...style })}>{children}</div>;
const Chip = ({ on, w, children }) => <span style={{ width: w, height: 40, flex: 'none', borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, border: `1px solid ${on ? C.acc : C.div}`, background: on ? C.acc : 'transparent', color: on ? C.n1 : C.text }}>{children}</span>;
const Check = ({ ok, children }) => <span style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14, fontWeight: 600, opacity: ok ? 1 : 0.45 }}><span style={{ width: 22, height: 22, borderRadius: 999, background: ok ? C.g6 : C.n3, color: C.n1, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{ok ? '✓' : ''}</span>{children}</span>;
const Done = ({ T, t, title, sub }) => <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}><span style={{ width: 72, height: 72, borderRadius: 999, background: C.g6, color: C.n1, fontSize: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${M.pop(T, t)})` }}>✓</span><b style={{ fontSize: 20 }}>{title}</b><span style={{ fontSize: 14, color: C.n7 }}>{sub}</span></div>;

/* ───────── TÉLÉPHONE ───────── */
function StatusBar() {
  const { T, Q } = useC(); const pat = T >= Q.Patient;
  return <div style={A(0, 0, 400, 44, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 30px', fontSize: 14, fontWeight: 700, zIndex: 30, color: pat ? C.n1 : C.text, background: pat ? '#0b5f55' : C.bg })}><span>{pat ? '9:07' : '8:33'}</span><span style={{ width: 100, height: 28, borderRadius: 999, background: C.n9 }}></span><span>4G · 76 %</span></div>;
}
function Camera() {
  const { T, Q } = useC(); const ph = Q.Photos;
  const shots = [ph + 1.2, ph + 2.6, ph + 4.0], n = shots.filter(s => T >= s).length;
  const pos = ['center 30%', 'left 40%', 'right 45%'][Math.min(n, 2)];
  const flash = shots.reduce((m, s) => Math.max(m, T >= s && T < s + 0.35 ? 1 - (T - s) / 0.35 : 0), 0);
  const sent = T >= ph + 5.7;
  const hint = ['De face, visage dans l\'ovale', 'Profil gauche', 'Profil droit', 'Photos prises'][n];
  return <div style={{ position: 'absolute', inset: 0, background: C.bg, ...vis(win(T, ph + 0.1, Q.Attente + 0.2)) }}>
    <div style={A(22, 54, 356, 30, { display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}><Tag bg={C.g1} fg={C.g8}>Mode accueil · Cabinet Bonanjo</Tag><span style={{ fontSize: 12, color: C.n7 }}>Clarisse</span></div>
    <div style={A(22, 94, 356, 44, { display: 'flex', flexDirection: 'column' })}><span style={{ fontFamily: HF, fontSize: 24, lineHeight: 1.1 }}>Paul Tchoumi</span><span style={{ fontSize: 12, color: C.n7 }}>24 ans · 2ᵉ visite · poussée d'acné</span></div>
    <div style={A(22, 150, 356, 480, { borderRadius: 32, overflow: 'hidden', background: '#2a1c12' })}>
      <Img pos={pos} />
      <span style={A(68, 70, 220, 300, { borderRadius: '50%', border: '3px dashed rgba(249,244,237,.85)' })}></span>
      <span style={A(14, 14, 328, 30, { display: 'flex', justifyContent: 'space-between' })}><Tag bg={C.g6} fg={C.n1}>Lumière OK</Tag><Tag bg={C.n9} fg={C.n1}>Photo {Math.min(n + 1, 3)} / 3</Tag></span>
      <span style={A(0, 436, 356, 24, { textAlign: 'center', fontSize: 14, fontWeight: 700, color: C.n1, textShadow: '0 1px 4px rgba(0,0,0,.6)' })}>{hint}</span>
      <span style={{ position: 'absolute', inset: 0, background: '#fff', opacity: flash }}></span>
    </div>
    {[0, 1, 2].map(i => <div key={i} style={A(22 + i * 66, 648, 56, 56, { borderRadius: 16, overflow: 'hidden', border: n > i ? 'none' : `2px dashed ${C.n4}` })}>{n > i && <Img pos={['center 30%', 'left 40%', 'right 45%'][i]} />}</div>)}
    <div style={A(230, 656, 148, 40, { fontSize: 12, color: C.n7, textAlign: 'right', lineHeight: 1.35 })}>Rangées dans son dossier,<br />pas dans la galerie.</div>
    <Btn x={22} y={716} w={356} h={56} fs={16} bg={sent ? C.g6 : C.acc} pr={Math.max(...shots.map(s => press(T, s)), press(T, ph + 5.4))}>{sent ? 'Envoyé au dossier ✓' : n < 3 ? 'Prendre la photo' : 'Envoyer au dossier'}</Btn>
  </div>;
}
const Wa = ({ me, o, children, time }) => <div style={{ display: 'flex', justifyContent: me ? 'flex-end' : 'flex-start', opacity: o, transform: `translateY(${(1 - o) * 8}px)` }}><div style={{ maxWidth: '84%', padding: '9px 12px 6px', borderRadius: 16, background: me ? '#d9fdd3' : C.n1, fontSize: 14, lineHeight: 1.45, boxShadow: '0 1px 1px rgba(0,0,0,.08)' }}>{children}<div style={{ fontSize: 10, color: C.n7, textAlign: 'right', marginTop: 2 }}>{time}{me ? ' ✓✓' : ''}</div></div></div>;
function WhatsApp() {
  const { T, Q } = useC(); const p = Q.Patient, f = t => M.enter(T, t, 0.3);
  const draft = T >= p + 4.0 ? '' : typed(T, p + 3.4, '1', 4);
  return <div style={{ position: 'absolute', inset: 0, background: '#efe7dc', ...vis(win(T, p + 0.1)) }}>
    <div style={A(0, 44, 400, 64, { background: '#0b5f55', color: C.n1, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px' })}><span style={{ fontSize: 20 }}>←</span><img src="client/public/glowscan-mark.png" style={{ width: 40, height: 40, borderRadius: 999, background: C.n1 }} /><span style={{ display: 'flex', flexDirection: 'column' }}><b style={{ fontSize: 15 }}>GlowScan Africa</b><span style={{ fontSize: 11, opacity: .85 }}>Compte professionnel</span></span></div>
    <div style={A(12, 116, 376, 660, { display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 8, overflow: 'hidden' })}>
      {T >= p + 0.4 && <Wa o={f(p + 0.4)} time="09:05">Bonjour Paul, voici votre compte rendu signé par Dr Aïcha Nkemdirim.</Wa>}
      {T >= p + 0.8 && <Wa o={f(p + 0.8)} time="09:05"><div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, background: C.n2 }}><span style={{ width: 36, height: 44, borderRadius: 6, background: C.acc, color: C.n1, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>PDF</span><span style={{ display: 'flex', flexDirection: 'column' }}><b style={{ fontSize: 13 }}>Compte rendu · Dr Aïcha.pdf</b><span style={{ fontSize: 11, color: C.n7 }}>2 pages · ordonnance jointe</span></span></div></Wa>}
      {T >= p + 1.4 && <Wa o={f(p + 1.4)} time="09:06">Reçu : 15 000 F payés en espèces au Cabinet Bonanjo.</Wa>}
      {T >= p + 2.0 && <Wa o={f(p + 2.0)} time="09:06">Rendez-vous de contrôle : <b>mardi 27 octobre à 10:00</b> avec Dr Aïcha. Répondez 1 pour confirmer.</Wa>}
      {T >= p + 4.1 && <Wa me o={f(p + 4.1)} time="09:07">1</Wa>}
      {T >= p + 4.8 && <Wa o={f(p + 4.8)} time="09:07">Rendez-vous confirmé. Vous recevrez un rappel la veille et un SMS 2 h avant.</Wa>}
    </div>
    <div style={A(10, 784, 322, 52, { borderRadius: 999, background: C.n1, display: 'flex', alignItems: 'center', padding: '0 18px', fontSize: 15, color: draft ? C.text : C.n7 })}>{draft || 'Message'}{T >= p + 3.2 && T < p + 4.0 && Math.floor(T * 2.5) % 2 === 0 ? '|' : ''}</div>
    <div style={A(340, 784, 52, 52, { borderRadius: 999, background: '#0b8a6f', color: C.n1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, transform: `scale(${1 - press(T, p + 4.0) * 0.12})` })}>↑</div>
  </div>;
}
function Touches() {
  const { T, Q } = useC(); const ph = Q.Photos, p = Q.Patient;
  const taps = [[ph + 1.2, 200, 744], [ph + 2.6, 200, 744], [ph + 4.0, 200, 744], [ph + 5.4, 200, 744], [p + 3.2, 170, 810], [p + 4.0, 366, 810]];
  return taps.map(([t, x, y]) => { const o = win(T, t - 0.28, t + 0.32, 0.12); if (o <= 0) return null; return <span key={t} style={A(x - 22, y - 22, 44, 44, { borderRadius: 999, background: 'rgba(32,30,29,.28)', border: '2px solid rgba(249,244,237,.85)', opacity: o, transform: `scale(${1 - press(T, t) * 0.22})`, zIndex: 40 })}></span>; });
}
function Phone({ o }) {
  return <div style={A(746, 96, 428, 888, { borderRadius: 60, background: C.n9, padding: 14, boxShadow: '0 30px 80px rgba(46,43,37,.35)', ...vis(o), transform: `scale(${0.96 + 0.04 * o})` })}>
    <div style={{ position: 'relative', width: 400, height: 860, borderRadius: 46, overflow: 'hidden', background: C.bg }}><Camera /><WhatsApp /><StatusBar /><Touches /></div>
  </div>;
}

/* ───────── ORDINATEUR ───────── */
const isDoc = (T, Q) => T >= Q.Dossier && T < Q.Agenda;
function Sidebar() {
  const { T, Q } = useC(); const doc = isDoc(T, Q);
  const nav = doc ? ['Tableau de bord', 'Salle d\'attente', 'Patients', 'Consultations', 'Agenda', 'Télé-expertise', 'Confrères', 'Portefeuille'] : ['Accueil du jour', 'Agenda', 'Patients', 'Encaissements'];
  const active = doc ? (T < Q.Dossier + 1.4 ? 0 : 2) : T < Q.Agenda ? 0 : T < Q.Agenda + 2.8 ? 3 : 1;
  return <div style={A(0, 0, 240, 892, { background: C.surf, padding: '24px 20px' })}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><img src="client/public/glowscan-mark.png" style={{ width: 34, height: 34, borderRadius: 999 }} /><span style={{ fontFamily: HF, fontSize: 18 }}>GlowScan <span style={{ color: C.g7 }}>Derm</span></span></div>
    {nav.map((l, i) => <div key={l} style={A(20, 90 + i * 48, 200, 40, { borderRadius: 999, padding: '0 16px', display: 'flex', alignItems: 'center', fontSize: 14, fontWeight: i === active ? 700 : 600, background: i === active ? C.bg : 'transparent', color: i === active ? C.a8 : C.text })}>{l}</div>)}
    {!doc && <div style={A(20, 300, 200, 70, { borderRadius: 20, background: C.bg, padding: '10px 14px', fontSize: 12, lineHeight: 1.45, color: C.n8 })}>Accès secrétaire : pas de diagnostic, pas de portefeuille.</div>}
    <div style={A(20, 800, 200, 56, { display: 'flex', alignItems: 'center', gap: 10 })}><span style={{ width: 40, height: 40, borderRadius: 999, background: doc ? C.g6 : C.acc, color: C.n1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>{doc ? 'AN' : 'CM'}</span><span style={{ display: 'flex', flexDirection: 'column' }}><b style={{ fontSize: 13 }}>{doc ? 'Dr Aïcha N.' : 'Clarisse M.'}</b><span style={{ fontSize: 11, color: C.n7 }}>{doc ? 'Dermatologue' : 'Secrétaire'}</span></span></div>
  </div>;
}
const DAY = [['08:30', 'Paul Tchoumi', 'Acné · 2ᵉ visite'], ['09:00', 'Mireille Abena', 'Contrôle eczéma'], ['09:30', 'Samuel Ndongo', 'Première visite'], ['10:00', 'Awa Bello', 'Taches · 3ᵉ visite'], ['10:30', 'Jean Mbarga', 'Première visite']];
function Journee() {
  const { T, Q } = useC(); const ac = Q.Accueil, at = Q.Attente, o = win(T, ac, Q.Dossier, 0.25);
  const arrived = T >= ac + 1.6, ready = T >= at + 2.2, motif = T >= ac + 2.6, askPh = T >= ac + 3.8;
  const st = !arrived ? ['Attendu', C.n2, C.n8] : !ready ? ['Arrivé · photos', C.a1, C.a8] : ['Salle d\'attente · dossier prêt', C.g1, C.g8];
  const pan = M.enter(T, ac + 1.7, 0.4);
  const steps = [['3 photos reçues', at + 0.3], ['Analyse IA', at + 1.2], ['Comparaison avec le 3 septembre', at + 1.9]];
  return <div style={{ position: 'absolute', inset: 0, ...vis(o) }}>
    <div style={A(272, 32, 860, 50, { fontFamily: HF, fontSize: 40 })}>Accueil du jour</div>
    <div style={A(272, 86, 860, 24, { fontSize: 15, color: C.n7 })}>Mardi 29 septembre · Dr Aïcha · 5 rendez-vous</div>
    {DAY.map(([h, n, m], i) => <div key={n} style={A(272, 130 + i * 80, 860, 68, { borderRadius: 999, background: i === 0 && arrived ? C.bg : C.surf, border: i === 0 && arrived ? `2px solid ${C.acc}` : '2px solid transparent', display: 'flex', alignItems: 'center', gap: 20, padding: '0 12px 0 28px', fontSize: 15 })}>
      <b style={{ width: 56 }}>{h}</b><b style={{ width: 200 }}>{n}</b><span style={{ flex: 1, color: C.n8 }}>{m}</span>
      {i === 0 ? (arrived ? <Tag bg={st[1]} fg={st[2]}>{st[0]}</Tag> : <span style={{ width: 130, height: 48, borderRadius: 999, background: C.acc, color: C.n1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, transform: `scale(${1 - press(T, ac + 1.6) * 0.06})` }}>Arrivé</span>) : <Tag bg={C.n2} fg={C.n8}>Confirmé WhatsApp</Tag>}
    </div>)}
    <div style={A(1160, 110, 576, 740, { borderRadius: 32, background: C.n1, boxShadow: '0 12px 32px rgba(46,43,37,.18)', ...vis(pan), transform: `translateX(${(1 - pan) * 30}px)` })}>
      <div style={A(28, 28, 520, 40, { fontFamily: HF, fontSize: 26 })}>Arrivée · Paul Tchoumi</div>
      <div style={A(28, 76, 520, 24, { fontSize: 14, color: C.n7 })}>24 ans · dernier passage le 3 septembre</div>
      <div style={A(28, 110, 520, 24, { fontSize: 13, fontWeight: 700 })}>Motif de la visite</div>
      <div style={A(28, 140, 520, 40, { display: 'flex', gap: 8 })}><Chip on={motif} w={150}>Poussée d'acné</Chip><Chip w={110}>Contrôle</Chip><Chip w={90}>Autre</Chip></div>
      <div style={A(28, 206, 520, 24, { fontSize: 13, fontWeight: 700 })}>Photos</div>
      <div style={A(28, 232, 520, 20, { fontSize: 13, color: C.n7 })}>3 photos avec le téléphone du cabinet, avant la consultation</div>
      <Btn x={28} y={262} w={520} h={52} bg={askPh ? C.n9 : C.acc} pr={press(T, ac + 3.8)}>{askPh ? 'Envoyé au téléphone du cabinet' : 'Prendre les photos'}</Btn>
      {T >= at && <>
        <div style={A(28, 340, 520, 100, { display: 'flex', gap: 12, opacity: M.enter(T, at + 0.2) })}>{['center 30%', 'left 40%', 'right 45%'].map(p => <span key={p} style={{ position: 'relative', width: 100, height: 100, borderRadius: 20, overflow: 'hidden' }}><Img pos={p} /></span>)}</div>
        <div style={A(28, 462, 520, 120, { display: 'flex', flexDirection: 'column', gap: 12 })}>{steps.map(([l, t]) => <Check key={l} ok={T >= t}>{l}</Check>)}</div>
        {ready && <div style={A(28, 600, 520, 110, { borderRadius: 24, background: C.g1, padding: '18px 22px', color: C.g8, opacity: M.enter(T, at + 2.2) })}><b style={{ fontSize: 16 }}>Dossier prêt pour Dr Aïcha</b><div style={{ fontSize: 14, marginTop: 6 }}>Paul passe en salle d'attente. Le médecin a tout avant d'appeler.</div></div>}
      </>}
    </div>
  </div>;
}
function DocHome() {
  const { T, Q } = useC(); const d = Q.Dossier, o = win(T, d, d + 1.5, 0.25);
  const rows = [['Paul Tchoumi', 'Dossier prêt · analysé à 08:34', true], ['Mireille Abena', 'Arrivée à 08:55 · photos en cours', false]];
  return <div style={{ position: 'absolute', inset: 0, ...vis(o) }}>
    <div style={A(272, 32, 860, 50, { fontFamily: HF, fontSize: 40 })}>Bonjour Dr Aïcha</div>
    <div style={A(272, 88, 860, 24, { fontSize: 15, color: C.n7 })}>Salle d'attente</div>
    {rows.map(([n, s, r], i) => <div key={n} style={A(272, 130 + i * 90, 860, 76, { borderRadius: 999, background: C.surf, display: 'flex', alignItems: 'center', gap: 20, padding: '0 14px 0 28px' })}><span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}><b style={{ fontSize: 16 }}>{n}</b><span style={{ fontSize: 13, color: r ? C.g7 : C.n7, fontWeight: 600 }}>{s}</span></span>{r && <span style={{ width: 170, height: 48, borderRadius: 999, background: C.acc, color: C.n1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, transform: `scale(${1 - press(T, d + 1.2) * 0.06})` }}>Ouvrir le dossier</span>}</div>)}
  </div>;
}
const ADD = 'Adapalène 0,1 %, un soir sur deux';
function Dossier() {
  const { T, Q } = useC(); const d = Q.Dossier, cr = Q.CompteRendu, o = win(T, d + 1.4, Q.Agenda, 0.25);
  return <div style={{ position: 'absolute', inset: 0, ...vis(o) }}>
    <div style={A(272, 24, 1464, 40, { display: 'flex', alignItems: 'center', gap: 16 })}><span style={{ fontSize: 15, fontWeight: 700, color: C.a7 }}>← Salle d'attente</span><span style={{ fontFamily: HF, fontSize: 26 }}>Paul Tchoumi</span><span style={{ fontSize: 14, color: C.n7 }}>24 ans · phototype V · 2ᵉ visite</span></div>
    {[['3 septembre', 'saturate(1.25) brightness(.92)', 'center 30%'], ['Aujourd\'hui', 'none', 'center 30%']].map(([l, f, p], i) => <div key={l} style={A(272 + i * 288, 80, 272, 300, { borderRadius: 28, overflow: 'hidden' })}><Img pos={p} style={{ filter: f }} /><span style={A(12, 252, 140, 34, { borderRadius: 999, background: C.n1, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' })}>{l}</span></div>)}
    <div style={A(272, 400, 560, 130, { borderRadius: 28, background: C.surf, padding: 24, display: 'flex', alignItems: 'center', gap: 20 })}><span style={{ fontFamily: HF, fontSize: 44 }}>52 → 61</span><span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><Tag bg={C.g1} fg={C.g8}>+9 en 4 semaines</Tag><span style={{ fontSize: 13, color: C.n7 }}>Moins d'inflammation, nouvelles lésions sur le menton</span></span></div>
    <div style={A(272, 548, 560, 100, { borderRadius: 28, background: C.a1, padding: '18px 24px', fontSize: 14, lineHeight: 1.5, color: C.a9 })}><b>Noté à l'accueil par Clarisse</b><br />Poussée depuis 10 jours, période d'examens.</div>
    <div style={A(272, 666, 560, 200, { borderRadius: 28, background: C.surf, padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 10 })}><b style={{ fontSize: 14 }}>Historique</b>{[['3 sept.', 'Acné modérée · peroxyde de benzoyle 5 %'], ['1er oct. prévu', 'Photo de contrôle reçue à J+28']].map(([a, b]) => <span key={a} style={{ display: 'flex', gap: 14, fontSize: 14 }}><b style={{ width: 110, flex: 'none' }}>{a}</b><span style={{ color: C.n8 }}>{b}</span></span>)}</div>
    <div style={A(856, 80, 440, 280, { borderRadius: 28, background: C.surf, padding: 24, display: 'flex', flexDirection: 'column', gap: 10 })}><b style={{ fontSize: 17 }}>Examen clinique</b><span style={{ fontSize: 14, lineHeight: 1.5, color: C.n8 }}>Les photos ont été prises à l'accueil. Examinez Paul, puis cochez ce que vous observez.</span></div>
    <Btn x={880} y={200} w={392} h={56} pr={press(T, d + 4.4)}>Commencer l'examen</Btn>
    <div style={A(1320, 80, 416, 400, { borderRadius: 28, background: C.surf, padding: 24, display: 'flex', flexDirection: 'column', gap: 12 })}><b style={{ fontSize: 15 }}>Salle d'attente</b>{[['Paul Tchoumi', 'En consultation', C.a1, C.a8], ['Mireille Abena', 'Dossier prêt', C.g1, C.g8], ['Samuel Ndongo', 'Attendu 09:30', C.n2, C.n8]].map(([n, s, bg, fg]) => <div key={n} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: 999, background: C.bg }}><b style={{ fontSize: 14 }}>{n}</b><Tag bg={bg} fg={fg}>{s}</Tag></div>)}</div>
    <Exam />
    <Report />
  </div>;
}
const DX = [['Acné inflammatoire modérée', '81 %'], ['Rosacée papulo-pustuleuse', '11 %'], ['Folliculite', '8 %']];
function Exam() {
  const { T, Q } = useC(); const e = Q.Examen, cr = Q.CompteRendu, o = win(T, e, cr + 0.6, 0.3);
  const rows = [[110, 'Lésions observées', [['Papules', 110, e + 0.8], ['Pustules', 110, e + 1.4], ['Comédons', 120, e + 2.0], ['Nodules', 110], ['Cicatrices', 120]]], [200, 'Localisation', [['Joues', 100, e + 2.8], ['Menton', 110, e + 3.3], ['Front', 100], ['Dos', 90]]], [290, 'Signes associés', [['Peau grasse', 140, e + 4.0], ['Douleur', 110], ['Démangeaisons', 160]]]];
  const note = typed(T, e + 4.6, 'Poussée récente, aucun nodule.', 22), nf = T >= e + 4.5 && T < e + 6.2;
  const loading = T >= e + 6.5 && T < e + 7.8, res = T >= e + 7.8, valid = T >= e + 8.8;
  return <div style={A(856, 80, 880, 790, { borderRadius: 28, background: C.n1, boxShadow: '0 12px 32px rgba(46,43,37,.22)', ...vis(o), transform: `translateX(${(1 - o) * 40}px)` })}>
    <div style={A(32, 24, 816, 44, { display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}><span style={{ fontFamily: HF, fontSize: 26 }}>Examen clinique · Paul</span><Tag bg={C.g1} fg={C.g8}>Fait par Dr Aïcha, en personne</Tag></div>
    {rows.map(([y, l, chips]) => <React.Fragment key={l}><div style={A(32, y - 30, 816, 24, { fontSize: 13, fontWeight: 700 })}>{l}</div><div style={A(32, y, 816, 40, { display: 'flex', gap: 10 })}>{chips.map(([n, w, t]) => <Chip key={n} on={!!t && T >= t} w={w}>{n}</Chip>)}</div></React.Fragment>)}
    <div style={A(32, 350, 816, 24, { fontSize: 13, fontWeight: 700 })}>Note</div>
    <div style={A(32, 380, 816, 52, { borderRadius: 999, background: C.bg, border: `2px solid ${nf ? C.acc : C.div}`, display: 'flex', alignItems: 'center', padding: '0 18px', fontSize: 15, color: note ? C.text : C.n7 })}>{note || 'Ce que vous remarquez…'}{nf && Math.floor(T * 2.5) % 2 === 0 ? '|' : ''}</div>
    {!loading && !res && <Btn x={32} y={460} w={816} h={56} pr={press(T, e + 6.4)}>Analyser photos + examen</Btn>}
    {loading && <div style={A(32, 460, 816, 200, { borderRadius: 24, background: C.surf, padding: 24, display: 'flex', gap: 24, alignItems: 'center' })}><div style={{ flex: 'none', width: 80, height: 80, borderRadius: 999, background: `conic-gradient(${C.acc} 0 90deg, ${C.n3} 90deg)`, transform: `rotate(${(T - e) * 300}deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 64, height: 64, borderRadius: 999, background: C.surf }}></div></div><div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}><Check ok={T >= e + 6.8}>3 photos de l'accueil</Check><Check ok={T >= e + 7.1}>Votre examen clinique</Check><Check ok={T >= e + 7.4}>Visite du 3 septembre</Check></div></div>}
    {res && <>
      <div style={A(32, 450, 816, 24, { fontSize: 13, letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 700, color: C.n7 })}>Suggestion IA · indicative</div>
      {DX.map(([n, pc], i) => { const on = i === 0 && valid, ro = M.enter(T, e + 7.8 + i * 0.2, 0.35); return <div key={n} style={A(32, 478 + i * 70, 816, 60, { borderRadius: 24, background: on ? C.g1 : C.surf, border: `2px solid ${on ? C.g6 : 'transparent'}`, display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px 0 20px', opacity: ro })}><span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}><b style={{ fontSize: 15 }}>{n}</b><span style={{ fontSize: 12, color: C.n7 }}>{on ? 'Validé par vous · vous restez le médecin' : pc}</span></span>{i === 0 && <span style={{ width: 104, height: 40, borderRadius: 999, background: on ? C.g6 : C.n9, color: C.n1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, transform: `scale(${1 - press(T, e + 8.8) * 0.08})` }}>{on ? 'Validé ✓' : 'Valider'}</span>}</div>; })}
      <Btn x={32} y={700} w={816} h={56} bg={valid ? C.acc : C.n4} pr={press(T, cr + 0.4)}>Rédiger le compte rendu</Btn>
    </>}
  </div>;
}
function Report() {
  const { T, Q } = useC(); const cr = Q.CompteRendu, o = win(T, cr + 0.5, Q.Agenda, 0.3);
  const draft = typed(T, cr + 1.5, ADD, 16), focus = T >= cr + 1.2 && T < cr + 4.0;
  const pin = win(T, cr + 5.4, cr + 7.4, 0.25), signed = T >= cr + 6.4;
  const R = ({ y, h, k, children }) => <div style={A(32, y, 816, h, { display: 'grid', gridTemplateColumns: '150px 1fr', gap: 20, padding: '16px 20px', borderRadius: 20, background: C.surf })}><span style={{ fontSize: 13, fontWeight: 700, color: C.n7, textTransform: 'uppercase', letterSpacing: '.06em' }}>{k}</span><span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{children}</span></div>;
  return <>
    <div style={A(856, 80, 880, 790, { borderRadius: 28, background: C.n1, boxShadow: '0 12px 32px rgba(46,43,37,.22)', ...vis(o), transform: `translateX(${(1 - o) * 40}px)` })}>
      <div style={A(32, 28, 816, 40, { display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}><span style={{ fontFamily: HF, fontSize: 28 }}>Compte rendu</span><Tag bg={C.g1} fg={C.g8}>Pré-rempli depuis le dossier</Tag></div>
      <R y={96} h={84} k="Diagnostic"><b style={{ fontSize: 16 }}>Acné inflammatoire modérée</b><span style={{ fontSize: 14, color: C.n8 }}>En amélioration depuis le 3 septembre</span></R>
      <R y={196} h={150} k="Traitement"><b style={{ fontSize: 16 }}>Peroxyde de benzoyle 5 %, le soir (poursuivre)</b>
        <span style={{ height: 44, marginTop: 8, borderRadius: 999, background: C.bg, border: `2px solid ${focus ? C.acc : C.div}`, display: 'flex', alignItems: 'center', padding: '0 16px', fontSize: 15, fontWeight: draft ? 700 : 400, color: draft ? C.text : C.n7 }}>{draft || '+ Ajouter un produit'}{focus && Math.floor(T * 2.5) % 2 === 0 ? '|' : ''}</span></R>
      <R y={362} h={84} k="Contrôle"><b style={{ fontSize: 16 }}>Dans 4 semaines · mardi 27 octobre</b><span style={{ fontSize: 14, color: C.n8 }}>Clarisse fixe l'heure avec le patient</span></R>
      <R y={462} h={84} k="Envoi"><b style={{ fontSize: 16 }}>WhatsApp de Paul · +237 6•• •• 31 07</b><span style={{ fontSize: 14, color: C.n8 }}>Ordonnance jointe en page 2</span></R>
      <div style={A(32, 712, 480, 40, { fontSize: 13, color: C.n7, display: 'flex', alignItems: 'center' })}>Le patient reçoit une version en mots simples</div>
      <Btn x={540} y={700} w={308} h={56} pr={press(T, cr + 5.2)}>Signer et envoyer</Btn>
    </div>
    <div style={A(0, 0, 1760, 892, { background: 'rgba(20,16,12,.35)', ...vis(pin), zIndex: 10 })}>
      <div style={A(680, 316, 400, 260, { borderRadius: 32, background: C.n1, padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 })}>
        {!signed ? <><b style={{ fontSize: 20 }}>Code de signature</b><span style={{ fontSize: 14, color: C.n7 }}>Votre code personnel à 4 chiffres</span><div style={{ display: 'flex', gap: 18, padding: '12px 0' }}>{[0, 1, 2, 3].map(i => <span key={i} style={{ width: 20, height: 20, borderRadius: 999, background: T >= cr + 5.6 + i * 0.18 ? C.n9 : C.n3 }}></span>)}</div></> : <Done T={T} t={cr + 6.4} title="Signé et envoyé" sub="Sur le WhatsApp de Paul" />}
      </div>
    </div>
  </>;
}
function Fin_() {
  const { T, Q } = useC(); const ag = Q.Agenda, o = win(T, ag, Q.Patient, 0.25);
  const cash = T >= ag + 1.0, paid = T >= ag + 1.9, slot = T >= ag + 3.6, sent = T >= ag + 4.9;
  const slots = [['09:00', 'Pris'], ['10:00', ''], ['10:30', ''], ['11:30', '']];
  return <div style={{ position: 'absolute', inset: 0, ...vis(o) }}>
    <div style={A(272, 32, 1000, 50, { fontFamily: HF, fontSize: 40 })}>Fin de consultation · Paul Tchoumi</div>
    <div style={A(272, 86, 1000, 24, { fontSize: 15, color: C.n7 })}>Compte rendu envoyé par Dr Aïcha à 09:04</div>
    <div style={A(272, 130, 700, 380, { borderRadius: 32, background: C.surf })}>
      <div style={A(32, 28, 636, 30, { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' })}><b style={{ fontSize: 17 }}>Consultation au cabinet</b><span style={{ fontFamily: HF, fontSize: 30 }}>15 000 F</span></div>
      <div style={A(32, 90, 636, 24, { fontSize: 13, fontWeight: 700 })}>Moyen de paiement</div>
      <div style={A(32, 122, 636, 40, { display: 'flex', gap: 8 })}><Chip on={cash} w={110}>Espèces</Chip><Chip w={150}>Orange Money</Chip><Chip w={130}>MTN MoMo</Chip></div>
      <Btn x={32} y={190} w={636} h={52} bg={paid ? C.g6 : C.acc} pr={press(T, ag + 1.8)}>{paid ? 'Encaissé ✓ · reçu envoyé sur WhatsApp' : 'Encaisser 15 000 F'}</Btn>
      <div style={A(32, 268, 636, 80, { fontSize: 14, lineHeight: 1.5, color: C.n8 })}>Patient du cabinet : le montant revient entièrement au cabinet. Il apparaît dans la caisse du jour de Dr Aïcha.</div>
    </div>
    <div style={A(996, 130, 740, 560, { borderRadius: 32, background: C.surf })}>
      <div style={A(32, 28, 676, 30, { fontSize: 17, fontWeight: 700 })}>Contrôle demandé par Dr Aïcha</div>
      <div style={A(32, 64, 676, 30, { fontFamily: HF, fontSize: 28 })}>Mardi 27 octobre</div>
      <div style={A(32, 120, 676, 52, { display: 'flex', gap: 12 })}>{slots.map(([h, taken], i) => { const on = i === 1 && slot; return <span key={h} style={{ width: 150, height: 52, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, background: on ? C.acc : taken ? C.n3 : C.bg, color: on ? C.n1 : taken ? C.n7 : C.text, textDecoration: taken ? 'line-through' : 'none', transform: `scale(${i === 1 ? 1 - press(T, ag + 3.6) * 0.06 : 1})` }}>{h}</span>; })}</div>
      <Btn x={32} y={200} w={676} h={56} bg={sent ? C.n9 : slot ? C.acc : C.n4} pr={press(T, ag + 4.6)}>{sent ? 'Envoyé · en attente de confirmation' : 'Réserver et envoyer sur WhatsApp'}</Btn>
      <div style={A(32, 290, 676, 200, { display: 'flex', flexDirection: 'column', gap: 12 })}>{['Confirmation : « Répondez 1 pour confirmer »', 'Rappel WhatsApp la veille', 'SMS 2 h avant le rendez-vous', 'Photo de contrôle demandée à J+28'].map((l, i) => <Check key={l} ok={sent && T >= ag + 5.0 + i * 0.25}>{l}</Check>)}</div>
    </div>
  </div>;
}
function Toasts() {
  const { T, Q } = useC(); const at = Q.Attente, cr = Q.CompteRendu;
  const t = [[at + 2.6, at + 4.8, 'Dr Aïcha est prévenue', 'Paul est en salle d\'attente, dossier prêt', C.n1, C.text], [cr + 7.0, cr + 8.9, 'Compte rendu envoyé ✓', 'Clarisse est prévenue pour l\'encaissement', C.g6, C.n1]];
  return t.map(([a, b, h, s, bg, fg]) => { const o = win(T, a, b, 0.3); return <div key={a} style={A(1300, 20, 436, 96, { borderRadius: 28, background: bg, color: fg, boxShadow: '0 12px 32px rgba(46,43,37,.22)', padding: '18px 24px', ...vis(o), transform: `translateY(${(1 - o) * -20}px)`, zIndex: 12 })}><b style={{ fontSize: 16 }}>{h}</b><div style={{ fontSize: 14, marginTop: 6 }}>{s}</div></div>; });
}
function Desktop({ o }) {
  const { T, Q } = useC();
  const path = T < Q.Dossier ? 'accueil' : T < Q.Dossier + 1.4 ? 'tableau-de-bord' : T < Q.Examen ? 'patients/paul-tchoumi' : T < Q.CompteRendu + 0.5 ? 'patients/paul-tchoumi/analyse' : T < Q.Agenda ? 'patients/paul-tchoumi/compte-rendu' : 'encaissements/paul-tchoumi';
  return <div style={A(80, 84, 1760, 940, { borderRadius: 24, overflow: 'hidden', background: C.bg, boxShadow: '0 30px 80px rgba(46,43,37,.3)', ...vis(o), transform: `scale(${0.97 + 0.03 * o})` })}>
    <div style={A(0, 0, 1760, 48, { background: C.n3, display: 'flex', alignItems: 'center', gap: 8, padding: '0 20px' })}>{[0, 1, 2].map(i => <span key={i} style={{ width: 12, height: 12, borderRadius: 999, background: C.n4 }}></span>)}<span style={{ marginLeft: 420, width: 640, height: 30, borderRadius: 999, background: C.n1, display: 'flex', alignItems: 'center', padding: '0 16px', fontSize: 13, color: C.n8 }}>glow-scan.com/derm/{path}</span></div>
    <div style={A(0, 48, 1760, 892)}><Sidebar /><Journee /><DocHome /><Dossier /><Fin_ /><Toasts /></div>
  </div>;
}
function Cursor({ o }) {
  const { T, Q } = useC(); const ac = Q.Accueil, at = Q.Attente, d = Q.Dossier, e = Q.Examen, cr = Q.CompteRendu, ag = Q.Agenda;
  const K = [[ac, 900, 700], [ac + 1.3, 1127, 296], [ac + 2.3, 1343, 372], [ac + 3.5, 1528, 518], [at, 1528, 518], [at + 1.0, 1300, 760], [d, 1300, 760], [d + 1.0, 1107, 320], [d + 1.6, 1107, 320], [d + 2.6, 700, 380], [d + 3.4, 700, 380], [d + 4.2, 1156, 360], [e, 1156, 360], [e + 0.6, 1023, 342], [e + 1.2, 1143, 342], [e + 1.8, 1268, 342], [e + 2.6, 1018, 432], [e + 3.1, 1133, 432], [e + 3.8, 1038, 522], [e + 4.3, 1376, 618], [e + 5.9, 1376, 618], [e + 6.2, 1376, 700], [e + 7.8, 1376, 700], [e + 8.6, 1718, 720], [e + 9.6, 1376, 940], [cr + 0.2, 1376, 940], [cr + 1.0, 1456, 514], [cr + 4.0, 1456, 514], [cr + 4.9, 1626, 940], [ag, 1626, 940], [ag + 0.8, 439, 394], [ag + 1.6, 702, 468], [ag + 3.3, 1345, 418], [ag + 4.4, 1446, 530], [ag + 6.0, 1500, 760]];
  let x = K[0][1], y = K[0][2];
  for (let i = 0; i < K.length - 1; i++) { const [t0, x0, y0] = K[i], [t1, x1, y1] = K[i + 1]; if (T >= t0) { const s = Math.max(t0, t1 - 0.75), p = M.move(T, s, t1 - s); x = lerp(x0, x1, p); y = lerp(y0, y1, p); } }
  const clicks = [ac + 1.6, ac + 2.6, ac + 3.8, d + 1.2, d + 4.4, e + 0.8, e + 1.4, e + 2.0, e + 2.8, e + 3.3, e + 4.0, e + 4.5, e + 6.4, e + 8.8, cr + 0.4, cr + 1.2, cr + 5.2, ag + 1.0, ag + 1.8, ag + 3.6, ag + 4.6];
  const ring = clicks.reduce((m, c) => (T >= c && T < c + 0.45) ? (T - c) / 0.45 : m, -1);
  return <div style={{ position: 'absolute', left: x, top: y, ...vis(o), zIndex: 60, pointerEvents: 'none' }}>
    {ring >= 0 && <span style={{ position: 'absolute', left: -24, top: -24, width: 48, height: 48, borderRadius: 999, border: `3px solid ${C.acc}`, opacity: 1 - ring, transform: `scale(${0.4 + ring})` }}></span>}
    <svg width="30" height="36" viewBox="0 0 30 36" style={{ position: 'absolute', left: -3, top: -2 }}><path d="M3 2 L3 28 L10 22 L15 33 L20 31 L15 20 L25 20 Z" fill={C.n9} stroke={C.n1} strokeWidth="2" strokeLinejoin="round" /></svg>
  </div>;
}
function Label() {
  const { T, Q } = useC();
  const L = [[Q.Accueil, 'Clarisse · secrétaire · Cabinet Bonanjo · 08:31'], [Q.Photos, 'Clarisse · téléphone du cabinet · 08:33'], [Q.Attente, 'Clarisse · 08:34'], [Q.Dossier, 'Dr Aïcha · 08:52'], [Q.Examen, 'Dr Aïcha · 08:54'], [Q.CompteRendu, 'Dr Aïcha · 09:03'], [Q.Agenda, 'Clarisse · 09:05'], [Q.Patient, 'Paul, 24 ans · 09:07'], [Q.Fin, '']];
  let cur = L[0]; for (const l of L) if (T >= l[0]) cur = l;
  const o = cur[1] ? M.enter(T, cur[0], 0.4) : 0;
  return <div style={A(0, 28, 1920, 40, { display: 'flex', justifyContent: 'center', ...vis(o) })}><span style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 18px', borderRadius: 999, background: C.n1, fontSize: 16, fontWeight: 700 }}><span style={{ width: 10, height: 10, borderRadius: 999, background: C.acc }}></span>{cur[1]}</span></div>;
}
function Fin() {
  const { T, Q } = useC(); const o = win(T, Q.Fin, Infinity, 0.6);
  return <div style={{ position: 'absolute', inset: 0, background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, ...vis(o) }}>
    <img src="client/public/glowscan-mark.png" style={{ width: 120, height: 120, borderRadius: 999, transform: `scale(${0.9 + 0.1 * M.pop(T, Q.Fin, 0.6)})` }} />
    <span style={{ fontFamily: HF, fontSize: 84, lineHeight: 1 }}>GlowScan <span style={{ color: C.g7 }}>Derm</span></span>
    <span style={{ fontSize: 28, color: C.n8 }}>De l'accueil au rendez-vous de contrôle, sans papier.</span>
    <span style={{ fontSize: 24, fontWeight: 700, color: C.a7 }}>glow-scan.com/derm</span>
  </div>;
}
function Piece() {
  const { T, Q } = useC();
  const po = Math.max(win(T, Q.Photos, Q.Attente, 0.35), win(T, Q.Patient, Q.Fin, 0.35));
  const dox = Math.max(win(T, Q.Accueil, Q.Photos, 0.35), win(T, Q.Attente, Q.Patient, 0.35));
  return <div style={{ position: 'absolute', inset: 0, background: C.surf, color: C.text, fontFamily: BF, overflow: 'hidden' }}>
    <div style={{ position: 'absolute', inset: 0, transform: 'scale(.86)', transformOrigin: '960px 60px' }}><Phone o={po} /><Desktop o={dox} /><Cursor o={dox} /></div>
    <Label /><Caption /><Intro /><Fin />
  </div>;
}
const ROLE = { sec: ['Secrétaire', C.acc], doc: ['Dermatologue', C.g7], ia: ['IA GlowScan', C.n9], pat: ['Patient', '#0b5f55'] };
function Caption() {
  const { T, Q } = useC();
  const L = [[Q.Accueil, 'sec', 'Paul arrive au cabinet. La secrétaire enregistre son arrivée et le motif de sa visite.'], [Q.Photos, 'sec', 'Elle prend 3 photos avec le téléphone du cabinet. Elles vont directement dans le dossier de Paul.'], [Q.Attente, 'sec', 'Paul passe en salle d\'attente. La dermatologue est prévenue : le dossier est prêt.'], [Q.Dossier, 'doc', 'Dr Aïcha ouvre le dossier : photos du jour, première visite et note de la secrétaire.'], [Q.Examen, 'doc', 'Elle examine Paul en personne et coche ce qu\'elle observe.'], [Q.Examen + 6.4, 'ia', 'L\'IA croise les photos, l\'examen et l\'historique, puis propose 3 diagnostics. Dr Aïcha valide.'], [Q.CompteRendu, 'doc', 'Le compte rendu est pré-rempli. Elle ajoute un produit, signe avec son code et l\'envoie.'], [Q.Agenda, 'sec', 'La secrétaire encaisse la consultation et réserve le contrôle dans 4 semaines.'], [Q.Patient, 'pat', 'Paul reçoit tout sur WhatsApp : compte rendu, reçu et rendez-vous. Il confirme.'], [Q.Fin, null, '']];
  let i = 0; L.forEach((l, k) => { if (T >= l[0]) i = k; });
  const [t0, r, txt] = L[i]; if (!r) return null;
  const o = M.enter(T, t0, 0.35), [rl, rc] = ROLE[r];
  return <div style={A(120, 924, 1680, 120, { display: 'flex', justifyContent: 'center', alignItems: 'center', ...vis(o), transform: `translateY(${(1 - o) * 12}px)` })}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 22, padding: '18px 32px 18px 18px', borderRadius: 999, background: C.n1, boxShadow: '0 12px 32px rgba(46,43,37,.18)', maxWidth: 1680 }}>
      <span style={{ flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 150, height: 64, borderRadius: 999, background: rc, color: C.n1 }}><span style={{ fontSize: 12, fontWeight: 700, opacity: .85 }}>Étape {i + 1} / 9</span><b style={{ fontSize: 17 }}>{rl}</b></span>
      <span style={{ fontSize: 30, fontWeight: 600, lineHeight: 1.25 }}>{txt}</span>
    </div>
  </div>;
}
function Intro() {
  const { T, Q } = useC(); const o = win(T, 0, Q.Accueil, 0.45);
  const P = [['CM', 'Clarisse', 'Secrétaire', 'Accueil, photos, encaissement, agenda', C.acc], ['AN', 'Dr Aïcha', 'Dermatologue', 'Examen, diagnostic, compte rendu signé', C.g7], ['PT', 'Paul, 24 ans', 'Patient du cabinet', 'Reçoit tout sur son WhatsApp', '#0b5f55']];
  return <div style={{ position: 'absolute', inset: 0, background: C.bg, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 160px', gap: 56, ...vis(o), zIndex: 70 }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}><span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: C.a7 }}>GlowScan Derm · au cabinet</span><span style={{ fontFamily: HF, fontSize: 76, lineHeight: 1.08, maxWidth: 1400 }}>Une consultation, de l'accueil au rendez-vous de contrôle.</span></div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>{P.map(([ini, n, r, d, c], i) => { const p = M.enter(T, 0.5 + i * 0.35, 0.45); return <div key={n} style={{ display: 'flex', gap: 22, alignItems: 'center', padding: 28, borderRadius: 36, background: C.surf, opacity: p, transform: `translateY(${(1 - p) * 16}px)` }}><span style={{ flex: 'none', width: 84, height: 84, borderRadius: 999, background: c, color: C.n1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700 }}>{ini}</span><span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><b style={{ fontSize: 28 }}>{n}</b><span style={{ fontSize: 20, fontWeight: 700, color: c }}>{r}</span><span style={{ fontSize: 18, color: C.n8 }}>{d}</span></span></div>; })}</div>
  </div>;
}
window.ParcoursCabinet = function ParcoursCabinet() {
  const [ready, setReady] = React.useState(Object.keys(DATA).length === Object.keys(IMG).length);
  React.useEffect(() => { IMG_READY.then(() => setReady(true)); }, []);
  if (!ready) return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.bg, fontFamily: BF, fontSize: 18 }}>Chargement du parcours…</div>;
  return <CompositionStage width={1920} height={1080} scenes={window.OM_SCENES} playback={window.OM_PLAYBACK} bg={C.surf}><Piece /></CompositionStage>;
};
