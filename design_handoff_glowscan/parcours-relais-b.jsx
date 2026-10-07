const { CompositionStage } = window;
const { C, HF, BF, Img, M, win, press, typed, A, lerp, vis, useC, caret, Tag, Btn, Chip, Check, Wave, Phone, IMG_READY, DATA, Q1 } = window.PR;

function Sidebar() {
  const nav = ['Tableau de bord', 'Télé-expertise', 'Patients', 'Confrères', 'Portefeuille'];
  return <div style={A(0, 0, 240, 892, { background: C.surf, padding: '24px 20px' })}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><img src="client/public/glowscan-mark.png" style={{ width: 34, height: 34, borderRadius: 999 }} /><span style={{ fontFamily: HF, fontSize: 18 }}>GlowScan <span style={{ color: C.g7 }}>Derm</span></span></div>
    {nav.map((l, i) => <div key={l} style={A(20, 90 + i * 48, 200, 40, { borderRadius: 999, padding: '0 16px', display: 'flex', alignItems: 'center', fontSize: 14, fontWeight: i === 1 ? 700 : 600, background: i === 1 ? C.bg : 'transparent', color: i === 1 ? C.a8 : C.text })}>{l}</div>)}
    <div style={A(20, 800, 200, 56, { display: 'flex', alignItems: 'center', gap: 10 })}><span style={{ width: 40, height: 40, borderRadius: 999, background: C.g6, color: C.n1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>AN</span><span style={{ display: 'flex', flexDirection: 'column' }}><b style={{ fontSize: 13 }}>Dr Aïcha N.</b><span style={{ fontSize: 11, color: C.n7 }}>Douala · Cameroun</span></span></div>
  </div>;
}
function Routing() {
  const { T, Q } = useC(); const g = Q.Routage, o = win(T, g, g + 2.9, 0.25);
  const S = [['Dermatologues au Burundi : aucun disponible avant 48 h', g + 0.5], ['Recherche dans le réseau : français, disponible, délai sous 24 h', g + 1.0], ['Attribué à Dr Aïcha Nkemdirim · Cameroun', g + 1.5], ['Accord de Jeanne pour envoyer son dossier au Cameroun', g + 2.0]];
  return <div style={{ position: 'absolute', inset: 0, ...vis(o) }}>
    <div style={A(272, 32, 1400, 50, { fontFamily: HF, fontSize: 40 })}>Nouveau cas du réseau</div>
    <div style={A(272, 110, 1464, 300, { borderRadius: 32, background: C.surf, padding: 32, display: 'flex', flexDirection: 'column', gap: 18 })}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}><b style={{ fontSize: 20 }}>Cas #B-118 · CDS de Kayanza, Burundi</b><Tag bg={C.a1} fg={C.a8}>Avis simple · 3 000 F CFA</Tag><Tag bg={C.n2} fg={C.n8}>En français</Tag></div>
      {S.map(([l, t]) => <Check key={l} ok={T >= t} fs={17}>{l}</Check>)}
    </div>
    <Btn x={272} y={440} w={360} h={56} pr={press(T, g + 2.6)}>Ouvrir le cas</Btn>
  </div>;
}
const LES = 'Petites papules noires du visage, familiales, sans démangeaison : DPN. Bénigne, rassurer.';
function CaseView() {
  const { T, Q } = useC(); const g = Q.Routage, a = Q.Avis;
  const o = Math.max(win(T, g + 2.8, Q.Vocal, 0.25), win(T, a, Q.Retour, 0.25));
  const draft = T >= g + 6.4 ? '' : typed(T, g + 3.6, Q1, 44), inF = T >= g + 3.4 && T < g + 6.4;
  const asked = T >= g + 6.5, got = T >= a, play = T >= a + 0.6, tr = T >= a + 1.2;
  const corr = T >= a + 2.2, les = typed(T, a + 2.8, LES, 38), lf = T >= a + 2.6 && T < a + 5.4, sent = T >= a + 5.8;
  const f = t => M.enter(T, t, 0.3);
  return <div style={{ position: 'absolute', inset: 0, ...vis(o) }}>
    <div style={A(272, 24, 1464, 40, { display: 'flex', alignItems: 'center', gap: 16 })}><span style={{ fontSize: 15, fontWeight: 700, color: C.a7 }}>← Télé-expertise</span><span style={{ fontFamily: HF, fontSize: 26 }}>Cas #B-118 · Kayanza, Burundi</span><span style={{ flex: 1 }}></span><Tag bg={sent ? C.g1 : C.a1} fg={sent ? C.g8 : C.a8} style={{ fontSize: 13, padding: '6px 14px' }}>{sent ? 'Avis envoyé · 1 800 F CFA crédités' : 'Payé en espèces au centre · réponse sous 24 h'}</Tag></div>
    <div style={A(272, 80, 520, 380, { borderRadius: 28, overflow: 'hidden' })}><Img pos="center 40%" /></div>
    <div style={A(272, 476, 520, 180, { borderRadius: 28, background: C.surf, padding: 24, display: 'flex', flexDirection: 'column', gap: 8 })}><b style={{ fontSize: 16 }}>Jeanne, 45 ans · visage</b><span style={{ fontSize: 14, color: C.n8 }}>Petites taches en relief depuis 2 ans</span><span style={{ fontSize: 14, color: C.n8 }}>Envoyé par Claudine N., infirmière · carte vérifiée</span></div>
    <div style={A(816, 80, 460, 100, { borderRadius: 24, background: C.a1, padding: '14px 22px' })}><span style={{ fontSize: 12, fontWeight: 700, color: C.a8, letterSpacing: '.08em' }}>PROPOSITION DU RELAIS</span><div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>Verrues</div></div>
    <div style={A(816, 192, 460, 100, { borderRadius: 24, background: C.surf, padding: '14px 22px' })}><span style={{ fontSize: 12, fontWeight: 700, color: C.n7, letterSpacing: '.08em' }}>SUGGESTION IA · INDICATIVE</span><div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>Dermatose papuleuse nigra · 88 %</div></div>
    <Btn x={816} y={310} w={220} h={56} bg={C.bg} fg={C.text} style={{ border: `1px solid ${C.div}` }}>Confirmer</Btn>
    <Btn x={1056} y={310} w={220} h={56} bg={corr ? C.n9 : C.acc} pr={press(T, a + 2.2)}>{corr ? 'Correction ✓' : 'Corriger'}</Btn>
    <div style={A(816, 382, 460, 52, { borderRadius: 999, background: C.g1, display: 'flex', alignItems: 'center', padding: '0 20px', fontSize: 15, fontWeight: 700, color: C.g8, ...vis(M.enter(T, a + 2.3)) })}>Votre diagnostic : dermatose papuleuse nigra</div>
    <div style={A(816, 446, 460, 150, { borderRadius: 24, background: C.bg, border: `2px solid ${lf ? C.acc : C.div}`, padding: '14px 18px', fontSize: 14, lineHeight: 1.5, color: les ? C.text : C.n7, ...vis(got ? 1 : 0) })}><span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.n7, marginBottom: 4 }}>LA LEÇON POUR LE RELAIS</span>{les || 'Le signe qui aurait dû l\'orienter…'}{caret(T, lf)}</div>
    <div style={A(816, 612, 460, 40, { display: 'flex', gap: 10, ...vis(got ? 1 : 0) })}><Chip on={T >= a + 5.2} w={240}>Rassurer · pas de traitement</Chip><Chip w={200}>Orienter vers l'hôpital</Chip></div>
    <Btn x={816} y={700} w={460} h={56} bg={sent ? C.g6 : got ? C.acc : C.n4} pr={press(T, a + 5.8)}>{sent ? 'Avis envoyé ✓' : 'Envoyer l\'avis'}</Btn>
    <div style={A(1300, 80, 436, 790, { borderRadius: 28, background: C.surf })}>
      <div style={A(20, 16, 396, 40, { display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, fontWeight: 700 })}>Discussion avec Claudine<span style={{ width: 8, height: 8, borderRadius: 999, background: C.g6 }}></span></div>
      <div style={A(16, 64, 404, 646, { display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 10, overflow: 'hidden' })}>
        <span style={{ alignSelf: 'center', padding: '8px 14px', borderRadius: 999, background: C.n2, fontSize: 12, color: C.n8 }}>Cas reçu · 3 photos · accord de la patiente</span>
        {asked && <div style={{ display: 'flex', justifyContent: 'flex-end', opacity: f(g + 6.5) }}><div style={{ maxWidth: '84%', padding: '10px 14px', borderRadius: 20, background: C.acc, color: C.n1, fontSize: 14, lineHeight: 1.45 }}>{Q1}</div></div>}
        {got && <div style={{ display: 'flex' }}><div style={{ position: 'relative', width: 200, height: 140, borderRadius: 20, overflow: 'hidden' }}><Img pos="center 30%" style={{ transform: 'scale(1.6)' }} /></div></div>}
        {got && <div style={{ display: 'flex' }}><div style={{ maxWidth: '92%', padding: '10px 14px 12px', borderRadius: 20, background: '#0b5f55', color: C.n1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tr && <span style={{ fontSize: 13, lineHeight: 1.45, opacity: f(a + 1.2) }}>Transcription : « Ça ne gratte pas. Ça grandit depuis deux ans. Sa mère a la même chose. »</span>}
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ width: 40, height: 40, borderRadius: 999, background: C.n1, color: '#0b5f55', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${1 - press(T, a + 0.6) * 0.12})` }}>{play && T < a + 2.0 ? '❚❚' : '▶'}</span><Wave n={24} p={play ? clampP((T - a - 0.6) / 1.4) : 0} /><b style={{ fontSize: 13 }}>0:08</b></span>
        </div></div>}
      </div>
      <div style={A(16, 718, 380, 56, { borderRadius: 999, background: C.bg, border: `2px solid ${inF ? C.acc : 'transparent'}`, display: 'flex', alignItems: 'center', padding: '0 18px', fontSize: 14, overflow: 'hidden', whiteSpace: 'nowrap' })}><span style={{ direction: 'rtl', overflow: 'hidden', color: draft ? C.text : C.n7 }}>{draft ? draft + caret(T, true) : 'Écrire ou envoyer un vocal…'}</span></div>
      <div style={A(372, 722, 48, 48, { borderRadius: 999, background: C.acc, color: C.n1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, transform: `scale(${1 - press(T, g + 6.4) * 0.12})` })}>↑</div>
    </div>
  </div>;
}
const clampP = x => Math.max(0, Math.min(1, x));
function Toasts() {
  const { T, Q } = useC(); const a = Q.Avis, o = win(T, a + 6.0, a + 7.6, 0.3);
  return <div style={A(1300, 20, 436, 96, { borderRadius: 28, background: C.g6, color: C.n1, boxShadow: '0 12px 32px rgba(46,43,37,.22)', padding: '18px 24px', ...vis(o), zIndex: 12 })}><b style={{ fontSize: 16 }}>Avis envoyé à Claudine ✓</b><div style={{ fontSize: 14, marginTop: 6 }}>60 % pour vous · 20 % pour Claudine</div></div>;
}
function Desktop({ o }) {
  const { T, Q } = useC(); const path = T < Q.Routage + 2.8 ? 'reseau/nouveau-cas' : 'tele-expertise/B-118';
  return <div style={A(80, 84, 1760, 940, { borderRadius: 24, overflow: 'hidden', background: C.bg, boxShadow: '0 30px 80px rgba(46,43,37,.3)', ...vis(o), transform: `scale(${0.97 + 0.03 * o})` })}>
    <div style={A(0, 0, 1760, 48, { background: C.n3, display: 'flex', alignItems: 'center', gap: 8, padding: '0 20px' })}>{[0, 1, 2].map(i => <span key={i} style={{ width: 12, height: 12, borderRadius: 999, background: C.n4 }}></span>)}<span style={{ marginLeft: 420, width: 640, height: 30, borderRadius: 999, background: C.n1, display: 'flex', alignItems: 'center', padding: '0 16px', fontSize: 13, color: C.n8 }}>glow-scan.com/derm/{path}</span></div>
    <div style={A(0, 48, 1760, 892)}><Sidebar /><Routing /><CaseView /><Toasts /></div>
  </div>;
}
function Cursor({ o }) {
  const { T, Q } = useC(); const g = Q.Routage, a = Q.Avis;
  const K = [[g, 900, 700], [g + 2.3, 532, 600], [g + 3.2, 1546, 878], [g + 6.0, 1546, 878], [g + 6.3, 1756, 878], [g + 7.5, 1500, 700], [a, 1500, 700], [a + 0.5, 1406, 810], [a + 2.0, 1246, 470], [a + 2.5, 1126, 653], [a + 5.0, 1126, 653], [a + 5.2, 1126, 764], [a + 5.6, 1126, 860], [a + 6.8, 1300, 760]];
  let x = K[0][1], y = K[0][2];
  for (let i = 0; i < K.length - 1; i++) { const [t0, x0, y0] = K[i], [t1, x1, y1] = K[i + 1]; if (T >= t0) { const s = Math.max(t0, t1 - 0.75), p = M.move(T, s, t1 - s); x = lerp(x0, x1, p); y = lerp(y0, y1, p); } }
  const clicks = [g + 2.6, g + 3.4, g + 6.4, a + 0.6, a + 2.2, a + 2.6, a + 5.2, a + 5.8];
  const ring = clicks.reduce((m, c) => (T >= c && T < c + 0.45) ? (T - c) / 0.45 : m, -1);
  return <div style={{ position: 'absolute', left: x, top: y, ...vis(o), zIndex: 60, pointerEvents: 'none' }}>
    {ring >= 0 && <span style={{ position: 'absolute', left: -24, top: -24, width: 48, height: 48, borderRadius: 999, border: `3px solid ${C.acc}`, opacity: 1 - ring, transform: `scale(${0.4 + ring})` }}></span>}
    <svg width="30" height="36" viewBox="0 0 30 36" style={{ position: 'absolute', left: -3, top: -2 }}><path d="M3 2 L3 28 L10 22 L15 33 L20 31 L15 20 L25 20 Z" fill={C.n9} stroke={C.n1} strokeWidth="2" strokeLinejoin="round" /></svg>
  </div>;
}
function Label() {
  const { T, Q } = useC();
  const L = [[Q.Invitation, 'Claudine N. · infirmière · Kayanza, Burundi'], [Q.Routage, 'Dr Aïcha · Douala, Cameroun'], [Q.Vocal, 'Claudine · Kayanza, Burundi'], [Q.Avis, 'Dr Aïcha · Douala, Cameroun'], [Q.Retour, 'Claudine · Kayanza, Burundi'], [Q.Reseau, '']];
  if (T < Q.Invitation) return null;
  let cur = L[0]; for (const l of L) if (T >= l[0]) cur = l;
  const o = cur[1] ? M.enter(T, cur[0], 0.4) : 0;
  return <div style={A(0, 16, 1920, 40, { display: 'flex', justifyContent: 'center', ...vis(o) })}><span style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 18px', borderRadius: 999, background: C.n1, fontSize: 16, fontWeight: 700 }}><span style={{ width: 10, height: 10, borderRadius: 999, background: C.acc }}></span>{cur[1]}</span></div>;
}
const ROLE = { rel: ['Relais', C.rel], doc: ['Dermatologue', C.g7], net: ['Réseau', C.a7] };
function Caption() {
  const { T, Q } = useC();
  const L = [[Q.Invitation, 'rel', 'Claudine, infirmière au Burundi, est invitée par un dermatologue. GlowScan vérifie sa carte.'], [Q.Cas, 'rel', 'Elle envoie un cas et son diagnostic. Photo floue refusée. La patiente paie en espèces.'], [Q.Routage, 'net', 'Aucun dermatologue libre au Burundi : le cas part au Cameroun, avec l\'accord de la patiente.'], [Q.Routage + 2.8, 'doc', 'Dr Aïcha demande une photo de plus près, dans la discussion du cas.'], [Q.Vocal, 'rel', 'Claudine répond par photo et message vocal. Sans internet, tout passe aussi par SMS.'], [Q.Avis, 'doc', 'Dr Aïcha écoute, corrige et écrit la leçon. 60 % pour elle, 20 % pour Claudine.'], [Q.Retour, 'rel', 'Claudine reçoit la correction et sa part, dans sa monnaie. Elle progresse.'], [Q.Reseau, 'net', 'Où qu\'il vive, chaque Africain accède à un dermatologue : avec son soignant ou directement.'], [Q.Fin, null, '']];
  if (T < Q.Invitation) return null;
  let i = 0; L.forEach((l, k) => { if (T >= l[0]) i = k; });
  const [t0, r, txt] = L[i]; if (!r) return null;
  const o = M.enter(T, t0, 0.35), [rl, rc] = ROLE[r];
  return <div style={A(120, 924, 1680, 120, { display: 'flex', justifyContent: 'center', alignItems: 'center', ...vis(o), zIndex: 75 })}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 22, padding: '18px 32px 18px 18px', borderRadius: 999, background: C.n1, boxShadow: '0 12px 32px rgba(46,43,37,.18)' }}>
      <span style={{ flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 150, height: 64, borderRadius: 999, background: rc, color: C.n1 }}><span style={{ fontSize: 12, fontWeight: 700, opacity: .85 }}>Étape {i + 1} / 8</span><b style={{ fontSize: 17 }}>{rl}</b></span>
      <span style={{ fontSize: 30, fontWeight: 600, lineHeight: 1.25 }}>{txt}</span>
    </div>
  </div>;
}
function Intro() {
  const { T, Q } = useC(); const o = win(T, 0, Q.Invitation, 0.45);
  const P = [['CN', 'Claudine N.', 'Infirmière relais', 'Centre de santé de Kayanza, Burundi', C.rel], ['J', 'Jeanne, 45 ans', 'Patiente', 'Aucun dermatologue près de chez elle', C.n8], ['AN', 'Dr Aïcha', 'Dermatologue', 'Douala, Cameroun', C.g7]];
  return <div style={{ position: 'absolute', inset: 0, background: C.bg, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 160px', gap: 56, ...vis(o), zIndex: 70 }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}><span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: C.a7 }}>GlowScan · télé-expertise entre pays</span><span style={{ fontFamily: HF, fontSize: 76, lineHeight: 1.08, maxWidth: 1400 }}>Un avis de dermatologue, même d'un pays à l'autre.</span></div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>{P.map(([ini, n, r, d, c], i) => { const p = M.enter(T, 0.5 + i * 0.35, 0.45); return <div key={n} style={{ display: 'flex', gap: 22, alignItems: 'center', padding: 28, borderRadius: 36, background: C.surf, opacity: p }}><span style={{ flex: 'none', width: 84, height: 84, borderRadius: 999, background: c, color: C.n1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700 }}>{ini}</span><span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><b style={{ fontSize: 28 }}>{n}</b><span style={{ fontSize: 20, fontWeight: 700, color: c }}>{r}</span><span style={{ fontSize: 18, color: C.n8 }}>{d}</span></span></div>; })}</div>
  </div>;
}
function Reseau() {
  const { T, Q } = useC(); const n = Q.Reseau, o = win(T, n, Q.Fin, 0.45);
  const modes = [['Consultation assistée', 'Le patient passe par un soignant local : centre de santé, pharmacie, généraliste. Le dermatologue conseille le soignant.', C.rel], ['Consultation directe', 'Le patient consulte en ligne un dermatologue autorisé à exercer dans son pays.', C.g7]];
  const rails = [['Annuaire vérifié', 'Pays, langues, autorisations'], ['Envoi au bon dermatologue', 'Langue, disponibilité, délai'], ['Paiement local', 'F CFA, FBu, CDF… par Mobile Money'], ['Accord du patient', 'Pour chaque envoi hors de son pays']];
  return <div style={{ position: 'absolute', inset: 0, background: C.bg, padding: '100px 140px 180px', display: 'flex', flexDirection: 'column', gap: 40, ...vis(o), zIndex: 65 }}>
    <span style={{ fontFamily: HF, fontSize: 64, lineHeight: 1.08 }}>Le réseau de la dermatologie africaine</span>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>{modes.map(([t, d, c], i) => { const p = M.enter(T, n + 0.4 + i * 0.4); return <div key={t} style={{ padding: 36, borderRadius: 36, background: c, color: C.n1, opacity: p, transform: `translateY(${(1 - p) * 16}px)` }}><b style={{ fontSize: 34 }}>{t}</b><div style={{ fontSize: 22, lineHeight: 1.45, marginTop: 12 }}>{d}</div></div>; })}</div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>{rails.map(([t, d], i) => { const p = M.enter(T, n + 1.4 + i * 0.3); return <div key={t} style={{ padding: 28, borderRadius: 32, background: C.surf, opacity: p }}><b style={{ fontSize: 24 }}>{t}</b><div style={{ fontSize: 18, color: C.n8, marginTop: 8 }}>{d}</div></div>; })}</div>
  </div>;
}
function Fin() {
  const { T, Q } = useC(); const o = win(T, Q.Fin, Infinity, 0.6);
  return <div style={{ position: 'absolute', inset: 0, background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, ...vis(o), zIndex: 80 }}>
    <img src="client/public/glowscan-mark.png" style={{ width: 120, height: 120, borderRadius: 999, transform: `scale(${0.9 + 0.1 * M.pop(T, Q.Fin, 0.6)})` }} />
    <span style={{ fontFamily: HF, fontSize: 80, lineHeight: 1 }}>GlowScan Africa</span>
    <span style={{ fontSize: 28, color: C.n8 }}>Un dermatologue pour chaque Africain, où qu'il vive.</span>
    <span style={{ fontSize: 24, fontWeight: 700, color: C.a7 }}>glow-scan.com</span>
  </div>;
}
function Piece() {
  const { T, Q } = useC();
  const dox = Math.max(win(T, Q.Routage, Q.Vocal, 0.35), win(T, Q.Avis, Q.Retour, 0.35));
  const po = Math.max(win(T, Q.Invitation, Q.Routage, 0.35), win(T, Q.Vocal, Q.Avis, 0.35), win(T, Q.Retour, Q.Reseau, 0.35));
  return <div style={{ position: 'absolute', inset: 0, background: C.surf, color: C.text, fontFamily: BF, overflow: 'hidden' }}>
    <div style={{ position: 'absolute', inset: 0, transform: 'scale(.86)', transformOrigin: '960px 60px' }}><Phone o={po} /><Desktop o={dox} /><Cursor o={dox} /></div>
    <Label /><Reseau /><Caption /><Intro /><Fin />
  </div>;
}
window.ParcoursRelais = function ParcoursRelais() {
  const [ready, setReady] = React.useState(!!DATA.s);
  React.useEffect(() => { IMG_READY.then(() => setReady(true)); }, []);
  if (!ready) return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.bg, fontFamily: BF, fontSize: 18 }}>Chargement du parcours…</div>;
  return <CompositionStage width={1920} height={1080} scenes={window.OM_SCENES} playback={window.OM_PLAYBACK} bg={C.surf}><Piece /></CompositionStage>;
};
