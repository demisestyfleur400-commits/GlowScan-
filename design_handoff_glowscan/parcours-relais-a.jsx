const { CompositionStage, useComposition, Easing, clamp } = window;
const C = { bg: '#f5ead8', surf: '#ebddc5', text: '#201e1d', acc: '#c67139', a1: '#fff2eb', a2: '#ffe1d0', a7: '#8c491a', a8: '#643312', a9: '#402310', g1: '#f0fae1', g6: '#728157', g7: '#56633f', g8: '#3d472b', n1: '#f9f4ed', n2: '#eee7db', n3: '#dcd3c4', n4: '#c0b6a5', n7: '#645c50', n8: '#474238', n9: '#2e2b25', div: 'rgba(32,30,29,.16)', rel: '#0b5f55' };
const HF = '"Caprasimo", system-ui, sans-serif', BF = '"Figtree", system-ui, sans-serif';
const SRC = 'img/dpn.jpeg';
const DATA = {};
const IMG_READY = fetch(SRC).then(r => r.blob()).then(b => new Promise(res => { const fr = new FileReader(); fr.onload = () => { DATA.s = fr.result; res(); }; fr.onerror = () => res(); fr.readAsDataURL(b); })).catch(() => {});
const Img = ({ pos = 'center', style }) => <img src={DATA.s || SRC} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: pos, ...style }} />;
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
const Wave = ({ n = 26, p = 1, c = C.n1 }) => <span style={{ display: 'flex', alignItems: 'center', gap: 3, height: 28 }}>{Array.from({ length: n }, (_, i) => <span key={i} style={{ width: 3, borderRadius: 2, height: 6 + Math.abs(Math.sin(i * 1.7)) * 20, background: c, opacity: i / n <= p ? 1 : 0.35 }}></span>)}</span>;
const PHead = ({ k, title, sub }) => <><div style={A(22, 54, 356, 28, { display: 'flex', alignItems: 'center' })}><Tag bg={C.g1} fg={C.g8}>{k}</Tag></div><div style={A(22, 90, 356, 60, { display: 'flex', flexDirection: 'column' })}><span style={{ fontFamily: HF, fontSize: 24, lineHeight: 1.1 }}>{title}</span><span style={{ fontSize: 12, color: C.n7, marginTop: 4 }}>{sub}</span></div></>;

function StatusBar() {
  const { T, Q } = useC();
  const t = T < Q.Cas ? '7:40' : T < Q.Vocal ? '8:05' : T < Q.Retour ? '9:12' : '10:20';
  return <div style={A(0, 0, 400, 44, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 30px', fontSize: 14, fontWeight: 700, zIndex: 30, background: C.bg })}><span>{t}</span><span style={{ width: 100, height: 28, borderRadius: 999, background: C.n9 }}></span><span>Lumitel · 3G</span></div>;
}
function Invitation() {
  const { T, Q } = useC(); const i = Q.Invitation, ok = T >= i + 4.2;
  const S = [['Téléphone', '+257 79 41 22 08', i + 0.6], ['Carte professionnelle', 'Carte d\'infirmière · photo envoyée', i + 1.6], ['Centre de santé', 'CDS de Kayanza · Burundi', i + 2.4], ['Module photo', 'Validé · 6 min', i + 3.0]];
  return <div style={{ position: 'absolute', inset: 0, background: C.bg, ...vis(win(T, i + 0.1, Q.Cas + 0.2)) }}>
    <PHead k="Invitation au réseau" title="Rejoindre GlowScan" sub="Invitée par Dr Aïcha Nkemdirim · Douala, Cameroun" />
    {S.map(([t, s, at], k) => { const d = T >= at; return <div key={t} style={A(22, 164 + k * 94, 356, 82, { borderRadius: 24, background: d ? C.g1 : C.surf, display: 'flex', alignItems: 'center', gap: 14, padding: '0 18px' })}>
      <span style={{ flex: 'none', width: 30, height: 30, borderRadius: 999, background: d ? C.g6 : C.n3, color: C.n1, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{d ? '✓' : k + 1}</span>
      <span style={{ display: 'flex', flexDirection: 'column' }}><b style={{ fontSize: 15 }}>{t}</b><span style={{ fontSize: 13, color: C.n8 }}>{s}</span></span></div>; })}
    <div style={A(22, 560, 356, 120, { borderRadius: 24, background: ok ? C.g6 : C.a1, color: ok ? C.n1 : C.a9, padding: '16px 20px', ...vis(M.enter(T, i + 3.3)) })}><b style={{ fontSize: 16 }}>{ok ? 'Compte vérifié ✓' : 'Vérification en cours…'}</b><div style={{ fontSize: 13, marginTop: 4, lineHeight: 1.45 }}>{ok ? 'Carte vérifiée par GlowScan et parrainage de Dr Aïcha.' : 'GlowScan contrôle votre carte professionnelle.'}</div></div>
    <Btn x={22} y={716} w={356} h={56} bg={ok ? C.acc : C.n4} pr={press(T, i + 5.2)}>Envoyer mon premier cas</Btn>
  </div>;
}
function Cas() {
  const { T, Q } = useC(); const c = Q.Cas;
  const shots = [c + 0.8, c + 1.8, c + 2.4, c + 3.0], bad = T >= c + 0.8 && T < c + 1.8;
  const n = Math.max(0, shots.filter(t => T >= t).length - 1);
  const flash = shots.reduce((m, s) => Math.max(m, T >= s && T < s + 0.3 ? 1 - (T - s) / 0.3 : 0), 0);
  const pick = T >= c + 3.8, cash = T >= c + 4.6, sent = T >= c + 5.6;
  const P = ['center 40%', 'center 25%', 'left 45%'];
  return <div style={{ position: 'absolute', inset: 0, background: C.bg, ...vis(win(T, c + 0.1, Q.Routage + 0.2)) }}>
    <PHead k="Nouveau cas" title="Jeanne, 45 ans · visage" sub="Petites taches en relief depuis 2 ans" />
    <div style={A(22, 158, 356, 220, { borderRadius: 28, overflow: 'hidden' })}><Img pos={P[Math.min(n, 2)]} style={{ filter: bad ? 'blur(8px)' : 'none' }} />
      {bad && <span style={A(12, 168, 332, 40, { borderRadius: 999, background: C.a8, color: C.n1, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' })}>Photo trop floue · reprenez-la</span>}
      <span style={{ position: 'absolute', inset: 0, background: '#fff', opacity: flash }}></span></div>
    {[0, 1, 2].map(k => <div key={k} style={A(22 + k * 66, 390, 56, 56, { borderRadius: 16, overflow: 'hidden', border: n > k ? 'none' : `2px dashed ${C.n4}` })}>{n > k && <Img pos={P[k]} />}</div>)}
    <Lbl x={22} y={460} w={356}>Votre diagnostic, avant l'IA</Lbl>
    <div style={A(22, 486, 356, 40, { display: 'flex', gap: 8 })}><Chip on={pick} w={100}>Verrues</Chip><Chip w={150}>Grains de beauté</Chip><Chip w={80}>Acné</Chip></div>
    <Lbl x={22} y={538} w={356}>Qui paie l'avis ?</Lbl>
    <div style={A(22, 564, 356, 48, { borderRadius: 999, border: `1px solid ${C.div}`, display: 'flex', alignItems: 'center', padding: '0 18px', fontSize: 13, fontWeight: 600 })}>Mobile Money de la patiente</div>
    <div style={A(22, 620, 356, 48, { borderRadius: 999, border: `1px solid ${cash ? C.acc : C.div}`, background: cash ? C.acc : 'transparent', color: cash ? C.n1 : C.text, display: 'flex', alignItems: 'center', padding: '0 18px', fontSize: 13, fontWeight: 600 })}>Espèces · débité de mon crédit</div>
    <div style={A(22, 676, 356, 30, { fontSize: 12, color: C.n7, display: 'flex', alignItems: 'center', ...vis(M.enter(T, c + 4.7)) })}>3 000 F CFA ≈ 14 500 FBu · il vous reste 11 avis</div>
    <Btn x={22} y={716} w={356} h={56} bg={sent ? C.g6 : C.acc} pr={Math.max(...shots.map(s => press(T, s)), press(T, c + 5.6))}>{T < c + 3.0 ? 'Prendre la photo' : sent ? 'Envoyé ✓ · recherche d\'un dermatologue' : 'Envoyer au réseau'}</Btn>
  </div>;
}
const Q1 = 'Bonjour Claudine. Pouvez-vous prendre une photo plus près, avec une pièce à côté ? Est-ce que ça gratte ?';
function Vocal() {
  const { T, Q } = useC(); const v = Q.Vocal, nt = win(T, v + 0.2, v + 1.6, 0.3);
  const ph = T >= v + 2.0, rec = T >= v + 2.8 && T < v + 4.6, voice = T >= v + 4.8;
  const f = t => M.enter(T, t, 0.3);
  return <div style={{ position: 'absolute', inset: 0, background: C.bg, ...vis(win(T, v + 0.1, Q.Avis + 0.2)) }}>
    <PHead k="Discussion du cas #B-118" title="Dr Aïcha Nkemdirim" sub="Dermatologue · Cameroun · en français" />
    <div style={A(16, 160, 368, 540, { display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 10 })}>
      <div style={{ display: 'flex' }}><div style={{ maxWidth: '84%', padding: '10px 14px', borderRadius: 20, background: C.surf, fontSize: 14, lineHeight: 1.45 }}>{Q1}</div></div>
      {ph && <div style={{ display: 'flex', justifyContent: 'flex-end', opacity: f(v + 2.0) }}><div style={{ position: 'relative', width: 200, height: 150, borderRadius: 20, overflow: 'hidden' }}><Img pos="center 30%" style={{ transform: 'scale(1.6)' }} /></div></div>}
      {voice && <div style={{ display: 'flex', justifyContent: 'flex-end', opacity: f(v + 4.8) }}><div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 20, background: C.rel, color: C.n1 }}><span style={{ width: 30, height: 30, borderRadius: 999, background: C.n1, color: C.rel, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>▶</span><Wave n={22} /><b style={{ fontSize: 13 }}>0:08</b></div></div>}
      {voice && <span style={{ alignSelf: 'center', fontSize: 12, color: C.n7, opacity: f(v + 5.2) }}>Sans internet, les messages arrivent aussi par SMS</span>}
    </div>
    <Btn x={22} y={716} w={356} h={56} bg={rec ? C.a8 : T < v + 2.6 ? C.acc : C.rel} pr={press(T, v + 1.4)}>{T < v + 2.0 ? 'Prendre la photo' : rec ? <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ width: 12, height: 12, borderRadius: 999, background: C.n1, opacity: Math.floor(T * 3) % 2 ? 1 : 0.4 }}></span>Enregistrement 0:0{Math.min(8, Math.floor((T - v - 2.8) * 4.5))}</span> : voice ? 'Message vocal envoyé ✓' : 'Maintenir pour parler'}</Btn>
    <div style={A(10, lerp(-90, 8, nt), 380, 70, { borderRadius: 24, background: C.n1, boxShadow: '0 10px 30px rgba(46,43,37,.25)', display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', zIndex: 25, ...vis(nt) })}><span style={{ width: 38, height: 38, borderRadius: 12, background: C.g6, color: C.n1, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>AN</span><span style={{ display: 'flex', flexDirection: 'column' }}><b style={{ fontSize: 13 }}>Dr Aïcha · cas #B-118</b><span style={{ fontSize: 13 }}>Une question sur votre cas</span></span></div>
  </div>;
}
function Retour() {
  const { T, Q } = useC(); const r = Q.Retour;
  return <div style={{ position: 'absolute', inset: 0, background: C.bg, ...vis(win(T, r + 0.1, Q.Reseau + 0.2)) }}>
    <PHead k="Retour du dermatologue" title="Cas #B-118 · Jeanne" sub="Dr Aïcha · Cameroun · réponse en 2 h 10" />
    <div style={A(22, 158, 356, 100, { borderRadius: 24, background: C.surf, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8 })}><span style={{ fontSize: 12, color: C.n7, fontWeight: 700 }}>VOTRE DIAGNOSTIC</span><span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15 }}><s style={{ color: C.n7 }}>Verrues</s><span>→</span><b>Dermatose papuleuse nigra</b></span></div>
    <div style={A(22, 270, 356, 150, { borderRadius: 24, background: C.g1, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 6, color: C.g8 })}><span style={{ fontSize: 12, fontWeight: 700 }}>LA LEÇON</span><span style={{ fontSize: 14, lineHeight: 1.5 }}>Petites papules noires du visage, familiales, sans démangeaison : c'est bénin. Rassurez, pas de traitement.</span></div>
    <div style={A(22, 432, 356, 110, { borderRadius: 24, background: C.n1, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 6, ...vis(M.enter(T, r + 1.2)) })}><span style={{ fontSize: 12, fontWeight: 700, color: C.n7 }}>VOTRE PART · 20 %</span><span style={{ fontFamily: HF, fontSize: 26 }}>600 F CFA ≈ 2 900 FBu</span><span style={{ fontSize: 12, color: C.n7 }}>Versée sur votre Lumicash</span></div>
    <div style={A(22, 554, 356, 140, { borderRadius: 24, background: C.surf, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 })}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}><b>Dermatose papuleuse · 3 / 20</b><b>67 %</b></div>
      <div style={{ position: 'relative', height: 10, borderRadius: 999, background: C.n3 }}><div style={{ height: '100%', width: `${lerp(60, 67, M.move(T, r + 2.0, 0.8))}%`, borderRadius: 999, background: C.acc }}></div><span style={{ position: 'absolute', left: '85%', top: -5, width: 3, height: 20, background: C.n9 }}></span></div>
      <span style={{ fontSize: 12, color: C.n7 }}>Autonome à 85 % d'accord sur 20 cas</span>
    </div>
    <Btn x={22} y={716} w={356} h={56} pr={press(T, r + 4.4)}>J'ai compris</Btn>
  </div>;
}
function Touches() {
  const { T, Q } = useC(); const i = Q.Invitation, c = Q.Cas, v = Q.Vocal, r = Q.Retour;
  const taps = [[i + 1.3, 200, 306], [i + 5.2, 200, 744], [c + 0.8, 200, 744], [c + 1.8, 200, 744], [c + 2.4, 200, 744], [c + 3.0, 200, 744], [c + 3.8, 72, 506], [c + 4.6, 200, 644], [c + 5.6, 200, 744], [v + 1.4, 200, 744], [r + 4.4, 200, 744]];
  const hold = T >= v + 2.8 && T < v + 4.6;
  return <>{taps.map(([t, x, y]) => { const op = win(T, t - 0.28, t + 0.32, 0.12); if (op <= 0) return null; return <span key={t} style={A(x - 22, y - 22, 44, 44, { borderRadius: 999, background: 'rgba(32,30,29,.28)', border: '2px solid rgba(249,244,237,.85)', opacity: op, transform: `scale(${1 - press(T, t) * 0.22})`, zIndex: 40 })}></span>; })}
    {hold && <span style={A(178, 722, 44, 44, { borderRadius: 999, background: 'rgba(32,30,29,.35)', border: '2px solid rgba(249,244,237,.9)', transform: 'scale(.85)', zIndex: 40 })}></span>}</>;
}
function Phone({ o }) {
  return <div style={A(746, 96, 428, 888, { borderRadius: 60, background: C.n9, padding: 14, boxShadow: '0 30px 80px rgba(46,43,37,.35)', ...vis(o), transform: `scale(${0.96 + 0.04 * o})` })}>
    <div style={{ position: 'relative', width: 400, height: 860, borderRadius: 46, overflow: 'hidden', background: C.bg }}><Invitation /><Cas /><Vocal /><Retour /><StatusBar /><Touches /></div>
  </div>;
}
window.PR = { C, HF, BF, Img, M, win, press, typed, A, lerp, vis, useC, caret, Tag, Btn, Chip, Check, Lbl, Wave, Phone, IMG_READY, DATA, Q1 };
