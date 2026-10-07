const { CompositionStage, useComposition, Easing, clamp } = window;
const C = { bg: '#f5ead8', surf: '#ebddc5', text: '#201e1d', acc: '#c67139', acc100: '#fff2eb', acc200: '#ffe1d0', acc300: '#ffc6a5', acc700: '#8c491a', acc800: '#643312', acc900: '#402310', g100: '#f0fae1', g200: '#e1eecc', g600: '#728157', g700: '#56633f', g900: '#272e1b', n100: '#f9f4ed', n200: '#eee7db', n300: '#dcd3c4', n700: '#645c50', n900: '#2e2b25', paper: '#fffaf3' };
const HF = '"Caprasimo", system-ui, sans-serif', BF = '"Figtree", system-ui, sans-serif';
const IMG = { front: 'img/melasma-face.jpeg', profile: 'img/melasma-profil.jpeg', close: 'img/melasma-joue.jpeg', herpes: 'img/herpes.jpeg', dpn: 'img/dpn.jpeg', acne: 'img/acne.jpeg' };
const Ph = ({ src, pos = 'center', style }) => <img src={src} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: pos, ...style }} />;
const HZ = { transform: 'scale(1.4)', transformOrigin: '68% 40%' };
const MOTION = {
  enter: (T, s, d = 0.6) => Easing.easeOutCubic(clamp((T - s) / d, 0, 1)),
  draw: (T, s, d = 1) => Easing.easeInOutCubic(clamp((T - s) / d, 0, 1)),
  pop: (T, s, d = 0.5) => Easing.easeOutBack(clamp((T - s) / d, 0, 1)),
};
const win = (T, a, b = Infinity, f = 0.45) => Math.max(0, Math.min(MOTION.enter(T, a, f), 1 - MOTION.enter(T, b - f, f)));
const A = (x, y, w, h, s) => ({ position: 'absolute', left: x, top: y, width: w, height: h, boxSizing: 'border-box', ...s });
const fmt = n => Math.round(n).toLocaleString('fr-FR').replace(/\u202f|\u00a0/g, ' ');
const on = (T, t) => T >= t;
const Pill = ({ bg, fg, children, style }) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999, background: bg, color: fg, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', ...style }}>{children}</span>;
const Btn = ({ x, y, w, h = 48, bg = C.acc, fg = C.n100, children, press = 0, fs = 16 }) => (
  <div style={A(x, y, w, h, { borderRadius: 999, background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: fs, fontWeight: 700, transform: `scale(${1 - press * 0.05})` })}>{children}</div>
);
const pressAt = (T, t) => (T >= t && T < t + 0.25) ? Math.sin((T - t) / 0.25 * Math.PI) : 0;
const Skin = ({ tone = '#7a5234', spots = [] , style }) => (
  <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', background: `radial-gradient(120% 90% at 50% 40%, ${tone}, #4a3120)`, ...style }}>
    {spots.map((s, i) => <span key={i} style={{ position: 'absolute', left: s[0], top: s[1], width: s[2], height: s[2] * 0.8, borderRadius: '50%', background: 'rgba(40,22,10,.45)', filter: 'blur(6px)' }} />)}
  </div>
);

function Opening() {
  const { T, CUES } = useComposition();
  const o = 1 - MOTION.enter(T, CUES.Probleme - 0.3, 0.6), s = 1;
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, opacity: o, transform: `scale(${s})` }}>
      <img src="client/public/glowscan-mark.png" style={{ width: 150, height: 150, borderRadius: 999 }} />
      <div style={{ fontFamily: HF, fontSize: 120, lineHeight: 1 }}>GlowScan <span style={{ color: C.g700 }}>Derm</span></div>
      <div style={{ fontSize: 40, fontWeight: 600, color: C.n700, }}>Le réseau de la dermatologie africaine</div>
    </div>
  );
}

function Probleme() {
  const { T, CUES } = useComposition(); const P = CUES.Probleme;
  const o = win(T, P, CUES.Patient + 0.2, 0.6);
  const l = i => ({ opacity: MOTION.enter(T, P + 0.3 + i * 0.9), transform: `translateY(${(1 - MOTION.enter(T, P + 0.3 + i * 0.9)) * 30}px)` });
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 36, padding: '0 200px', textAlign: 'center', opacity: o }}>
      <div style={{ fontFamily: HF, fontSize: 96, lineHeight: 1.08, ...l(0) }}>Trop de patients.<br /><span style={{ color: C.acc }}>Trop peu de dermatologues.</span></div>
      <div style={{ fontSize: 36, lineHeight: 1.45, color: C.n700, maxWidth: 1300, ...l(1.4) }}>Des soignants de terrain seuls face aux maladies de peau. Des dermatologues débordés par l'administratif.</div>
    </div>
  );
}

const SIDE = [
  ['Patient', 'Paiement', 'Côté patient · appli GlowScan', 'Une photo. Un score. Une alerte claire.', 'L\'IA, calibrée sur les peaux noires, repère ce qu\'un médecin doit voir.'],
  ['Paiement', 'Dermato', 'Côté patient', 'Il choisit son dermatologue et paie par Mobile Money.', 'L\'argent reste bloqué jusqu\'à la réponse du médecin.'],
  ['Dermato', 'Encaissement', 'Côté dermatologue · GlowScan Derm', 'Le diagnostic est déjà proposé. Il valide.', 'Compte rendu pré-rempli, signé, envoyé sur WhatsApp.'],
  ['Encaissement', 'Cabinet', 'Côté dermatologue', '80 % pour le médecin. 20 % pour GlowScan.', 'Retrait vers Orange Money ou MTN MoMo en 2 minutes.'],
  ['Cabinet', 'Agenda', 'Ses propres patients · au cabinet', 'La secrétaire ou l\'infirmière prépare le dossier.', 'À l\'accueil : identité, motif, 3 photos. L\'IA analyse avant même la consultation.'],
  ['Agenda', 'Relais', 'Agenda, rappels et suivi', 'Les rendez-vous se gèrent. Les rappels partent seuls.', 'WhatsApp la veille, photo de contrôle demandée au bon moment. Le médecin ou sa secrétaire.'],
  ['Relais', 'Teleexpertise', 'Télé-expertise · zones sans dermatologue', 'L\'infirmier envoie le cas et propose son diagnostic.', 'Avant de voir l\'IA : c\'est comme ça qu\'il apprend.'],
  ['Teleexpertise', 'Formation', 'Télé-expertise · côté dermatologue', 'Il corrige. Il est payé à chaque avis.', 'Avis simple 3 000 F, urgent 5 000 F, payé au centre de santé ou par le programme : 60 % médecin, 20 % relais, 20 % GlowScan.'],
  ['Formation', 'ONG', 'Formation continue', 'La correction devient sa leçon.', 'À 85 % d\'accord sur 20 cas, il traite seul cette maladie.'],
  ['ONG', 'Cloture', 'Côté ONG et districts', 'Chaque cas forme un soignant.', 'Cas traités, agents formés, progression : un rapport chaque mois.'],
];
function Side() {
  const { T, CUES } = useComposition();
  return SIDE.map(([a, b, k, h, s]) => {
    const o = win(T, CUES[a] + 0.15, CUES[b] + 0.1, 0.5); if (!o) return null;
    const e = MOTION.enter(T, CUES[a] + 0.15, 0.8);
    return (
      <div key={a} style={A(120, 0, 640, 1080, { display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 26, opacity: o, transform: `translateX(${(1 - e) * -30}px)` })}>
        <span style={{ fontSize: 24, letterSpacing: '.12em', textTransform: 'uppercase', fontWeight: 700, color: C.acc700 }}>{k}</span>
        <span style={{ fontFamily: HF, fontSize: 68, lineHeight: 1.08 }}>{h}</span>
        <span style={{ fontSize: 30, lineHeight: 1.45, color: C.n700 }}>{s}</span>
      </div>
    );
  });
}

const SX = 1124, SY = 114;
function Phone() {
  const { T, CUES } = useComposition();
  const P = CUES.Patient, Pay = CUES.Paiement, D = CUES.Dermato, R = CUES.Relais, O = CUES.ONG, TE = CUES.Teleexpertise, F = CUES.Formation;
  const po = Math.max(win(T, P - 0.1, D + 0.35, 0.6), win(T, R - 0.1, TE + 0.35, 0.6), win(T, F - 0.1, O + 0.35, 0.6)); if (!po) return null;
  const L = { cam: win(T, P - 0.2, P + 3.4, 0.35), res: win(T, P + 3.2, Pay + 0.25, 0.35), list: win(T, Pay, Pay + 1.75, 0.35), form: win(T, Pay + 1.6, D + 0.5, 0.35), rel: Math.max(win(T, R - 0.3, TE + 0.5, 0.35), win(T, F - 0.3, O + 0.5, 0.35)) };
  const shots = [P + 1.25, P + 1.65, P + 2.05].filter(t => T >= t).length;
  const flash = [P + 1.25, P + 1.65, P + 2.05].reduce((m, t) => Math.max(m, T >= t && T < t + 0.3 ? 1 - (T - t) / 0.3 : 0), 0);
  const ring = MOTION.draw(T, P + 3.4, 1.3), paid = on(T, Pay + 4.3), paying = on(T, Pay + 3.05) && !paid;
  const bar = 80 + 5 * MOTION.draw(T, F + 2.5, 0.9);
  return (
    <div style={A(1110, 100, 420, 880, { borderRadius: 60, background: C.n900, padding: 14, opacity: po, transform: `translateY(${(1 - po) * 40}px)`, boxShadow: '0 40px 80px rgba(46,43,37,.25)' })}>
      <div style={{ position: 'relative', width: 392, height: 852, borderRadius: 48, overflow: 'hidden', background: C.bg }}>
        <div style={A(0, 0, 392, 40, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', fontSize: 13, fontWeight: 700 })}><span>9:41</span><span style={{ width: 96, height: 26, borderRadius: 999, background: C.n900 }} /><span>4G · 82 %</span></div>

        <div style={{ position: 'absolute', inset: 0, opacity: L.cam }}>
          <div style={A(20, 48, 352, 40, { fontFamily: HF, fontSize: 30 })}>Scanner</div>
          <div style={A(20, 100, 352, 560, { borderRadius: 32, background: '#3e2a1c', overflow: 'hidden' })}>
            <div style={A(81, 110, 190, 250, { borderRadius: '50%', overflow: 'hidden' })}><Ph src={IMG.front} pos="center 35%" /></div>
            <div style={A(71, 100, 210, 270, { borderRadius: '50%', border: '3px dashed rgba(249,244,237,.8)' })} />
            <div style={A(14, 14, 324, 30, { display: 'flex', justifyContent: 'space-between' })}><Pill bg={C.g600} fg={C.n100}>Lumière OK</Pill><Pill bg={C.n900} fg={C.n100}>Photo {Math.min(shots + 1, 3)} / 3</Pill></div>
            <div style={A(0, 500, 352, 30, { textAlign: 'center', color: C.n100, fontSize: 14, fontWeight: 600 })}>{shots === 0 ? 'Visage dans l\'ovale' : shots < 3 ? 'Tournez légèrement la tête' : 'Photos prises'}</div>
            <div style={{ position: 'absolute', inset: 0, background: '#fff', opacity: flash * 0.8 }} />
          </div>
          <div style={A(20, 676, 352, 44, { borderRadius: 999, background: C.g100, color: C.g900, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', fontSize: 14, fontWeight: 700, opacity: MOTION.enter(T, P + 2.2, 0.3) })}>
            <span style={{ flex: 1 }}>Analyse de vos 3 photos…</span>
            <span style={{ width: 90, height: 6, borderRadius: 999, background: C.g200, overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: `${MOTION.draw(T, P + 2.2, 1)*100}%`, background: C.g600 }} /></span>
          </div>
          <Btn x={20} y={740} w={352} h={56} press={pressAt(T, P + 1.2)}>Prendre la photo</Btn>
        </div>

        <div style={{ position: 'absolute', inset: 0, opacity: L.res }}>
          <div style={A(20, 50, 352, 36, { display: 'flex', flexDirection: 'column' })}><span style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', fontWeight: 700, color: C.n700 }}>Rapport d'analyse</span><span style={{ fontSize: 14, fontWeight: 700 }}>Visage · 24 septembre · 3 photos</span></div>
          <div style={A(20, 100, 120, 120, { borderRadius: 999, background: `conic-gradient(${C.acc} ${58 * 3.6 * ring}deg, ${C.n200} 0)`, display: 'flex', alignItems: 'center', justifyContent: 'center' })}>
            <div style={{ width: 96, height: 96, borderRadius: 999, background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontFamily: HF, fontSize: 36, lineHeight: 1 }}>{Math.round(58 * ring)}</span><span style={{ fontSize: 11, color: C.n700 }}>Glow Score</span></div>
          </div>
          <div style={A(158, 106, 214, 110, { display: 'flex', flexDirection: 'column', gap: 6, opacity: MOTION.enter(T, P + 4.3) })}>
            <Pill bg={C.acc200} fg={C.acc900} style={{ alignSelf: 'flex-start', transform: `scale(${MOTION.pop(T, P + 4.3)})`, transformOrigin: 'left center' }}>Avis médical conseillé</Pill>
            <span style={{ fontFamily: HF, fontSize: 24, lineHeight: 1.1 }}>Taches brunes étendues</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.acc700 }}>−6 depuis juin</span>
          </div>
          <div style={A(20, 238, 352, 212, { borderRadius: 28, overflow: 'hidden' })}>
            <Ph src={IMG.front} pos="center 40%" />
            {[[30, 72, C.acc], [70, 72, C.acc], [50, 14, C.acc300], [50, 60, C.g600], [50, 92, C.g600]].map(([x, y, c], i) => { const s = MOTION.pop(T, P + 4.6 + i * 0.12); return <span key={i} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: 26, height: 26, marginLeft: -13, marginTop: -13, borderRadius: 999, background: c, border: `2px solid ${C.n100}`, color: C.n100, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${s})` }}>{i + 1}</span>; })}
          </div>
          <div style={A(20, 466, 352, 206, { borderRadius: 28, background: C.acc100, color: C.acc900, padding: 18, display: 'flex', flexDirection: 'column', gap: 8, opacity: MOTION.enter(T, P + 5.2), transform: `translateY(${(1 - MOTION.enter(T, P + 5.2)) * 20}px)` })}>
            <span style={{ fontSize: 17, fontWeight: 700 }}>Un dermatologue doit voir ces taches</span>
            <span style={{ fontSize: 13, lineHeight: 1.45 }}>Sous 60, GlowScan ne vend aucun produit. Votre dossier est prêt pour le médecin.</span>
          </div>
          <div style={{ opacity: MOTION.enter(T, P + 5.2) }}><Btn x={36} y={580} w={320} press={pressAt(T, P + 6.6)}>Consulter un dermatologue</Btn></div>
          <div style={A(20, 694, 352, 40, { fontSize: 11, lineHeight: 1.5, color: C.n700 })}>Analyse indicative, calibrée sur les phototypes IV à VI. Ne remplace pas un examen médical.</div>
        </div>

        <div style={{ position: 'absolute', inset: 0, opacity: L.list }}>
          <div style={A(20, 50, 352, 40, { fontFamily: HF, fontSize: 26 })}>Choisir un dermatologue</div>
          {[['AN', 'Dr Aïcha Nkemdirim', 'Douala · ★ 4,9 · répond en 3 h', '5 000 F', C.g600], ['ME', 'Pr Mathieu Essomba', 'Yaoundé · ★ 4,8 · répond en 8 h', '8 000 F', C.acc], ['SO', 'Dr Sandrine Owona', 'Douala · ★ 4,7 · demain', '4 800 F', C.acc700]].map((d, i) => (
            <div key={i} style={A(20, 110 + i * 108, 352, 96, { borderRadius: 24, background: i === 0 && on(T, Pay + 1.1) ? C.acc200 : C.surf, padding: 14, display: 'flex', alignItems: 'center', gap: 12, transform: `scale(${1 - (i === 0 ? pressAt(T, Pay + 1.1) * 0.03 : 0)})` })}>
              <span style={{ flex: 'none', width: 52, height: 52, borderRadius: 999, background: d[4], color: C.n100, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{d[0]}</span>
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}><b style={{ fontSize: 15 }}>{d[1]}</b><span style={{ fontSize: 12, color: C.n700 }}>{d[2]}</span></span>
              <b style={{ fontSize: 15 }}>{d[3]}</b>
            </div>
          ))}
        </div>

        <div style={{ position: 'absolute', inset: 0, opacity: L.form }}>
          <div style={A(20, 50, 352, 44, { display: 'flex', alignItems: 'center', gap: 12 })}><span style={{ width: 44, height: 44, borderRadius: 999, background: C.g600, color: C.n100, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>AN</span><span style={{ fontFamily: HF, fontSize: 22 }}>Dr Aïcha Nkemdirim</span></div>
          <div style={A(20, 110, 352, 120, { borderRadius: 24, background: C.surf, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 })}>
            <b style={{ fontSize: 13 }}>Envoyé automatiquement au médecin</b>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{[IMG.front, IMG.profile, IMG.close].map(s => <span key={s} style={{ position: 'relative', width: 56, height: 56, borderRadius: 16, overflow: 'hidden' }}><Ph src={s} pos="center 35%" /></span>)}<span style={{ flex: 1, fontSize: 12, color: C.n700 }}>3 photos · score 58 · historique depuis juin</span></div>
          </div>
          <div style={A(20, 246, 352, 44, { display: 'flex', gap: 6, flexWrap: 'wrap' })}><Pill bg={C.surf} fg={C.text}>Depuis + de 3 mois</Pill><Pill bg={C.surf} fg={C.text}>Pas d'éclaircissant</Pill></div>
          <div style={A(20, 310, 352, 250, { borderRadius: 28, background: C.surf })} />
          <div style={A(38, 326, 316, 40, { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' })}><b style={{ fontSize: 15 }}>Consultation en ligne</b><span style={{ fontFamily: HF, fontSize: 24 }}>5 000 F</span></div>
          <div style={A(38, 374, 316, 50, { borderRadius: 999, background: C.bg, display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px 0 16px', fontSize: 16 })}><b>+237</b><span style={{ flex: 1 }}>677 12 45 90</span><Pill bg="#ffcb05" fg="#1a1a1a">MTN MoMo</Pill></div>
          <div style={A(38, 430, 316, 36, { fontSize: 11, lineHeight: 1.4, color: C.n700 })}>Remboursé automatiquement sans réponse sous 24 h.</div>
          <Btn x={38} y={470} w={316} h={56} bg={paid ? C.g600 : paying ? C.acc700 : C.acc} press={pressAt(T, Pay + 3.0)} fs={15}>{paid ? 'Payé ✓' : paying ? 'Validez sur votre téléphone…' : 'Payer 5 000 F'}</Btn>
          <div style={A(20, 580, 352, 128, { borderRadius: 28, background: C.g100, color: C.g900, padding: 18, display: 'flex', flexDirection: 'column', gap: 6, opacity: MOTION.enter(T, Pay + 4.3), transform: `translateY(${(1 - MOTION.enter(T, Pay + 4.3)) * 20}px)` })}>
            <b style={{ fontSize: 16 }}>Dossier envoyé à Dr Aïcha</b>
            <span style={{ fontSize: 13, lineHeight: 1.45 }}>Votre paiement reste bloqué jusqu'à sa réponse. Vous serez prévenue sur WhatsApp.</span>
          </div>
        </div>

        <div style={{ position: 'absolute', inset: 0, opacity: L.rel }}>
          <div style={A(20, 48, 352, 44, { display: 'flex', alignItems: 'center', gap: 12 })}><span style={{ width: 44, height: 44, borderRadius: 999, background: C.acc200, color: C.acc800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>P</span><span style={{ display: 'flex', flexDirection: 'column' }}><b style={{ fontSize: 15 }}>Paul · infirmier relais</b><span style={{ fontSize: 12, color: C.n700 }}>CSI de Mokolo</span></span></div>
          <div style={A(20, 102, 352, 228, { borderRadius: 28, overflow: 'hidden' })}><Ph src={IMG.herpes} style={HZ} /><div style={A(12, 182, 328, 36, {})}><Pill bg={C.n900} fg={C.n100}>Femme, 34 ans · lèvre depuis 3 jours</Pill></div></div>
          <div style={A(20, 344, 352, 30, { fontSize: 15, fontWeight: 700 })}>Votre diagnostic ?</div>
          {['Impétigo', 'Herpès', 'Eczéma'].map((t, i) => { const sel = i === 0 && on(T, R + 1.2); return <div key={t} style={A(20 + i * 120, 380, 112, 44, { borderRadius: 999, border: `1.5px solid ${sel ? C.acc : C.n300}`, background: sel ? C.acc : 'transparent', color: sel ? C.n100 : C.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 })}>{t}</div>; })}
          <Btn x={20} y={440} w={352} h={52} bg={on(T, R + 2.2) ? C.g600 : C.acc} press={pressAt(T, R + 2.2)} fs={15}>{on(T, R + 2.2) ? 'Envoyé à Dr Aïcha ✓' : 'Envoyer à un dermatologue'}</Btn>
          <div style={A(20, 504, 352, 34, { display: 'flex', gap: 6 })}><Pill bg={C.surf} fg={C.text}>Avis simple · 3 000 F</Pill><Pill bg={C.surf} fg={C.text} style={{ opacity: MOTION.enter(T, R + 2.6) }}>IA : herpès labial 79 %</Pill></div>
          <div style={A(20, 548, 352, 146, { borderRadius: 28, background: C.g100, color: C.g900, padding: 16, display: 'flex', flexDirection: 'column', gap: 4, opacity: T >= F - 0.3 ? MOTION.enter(T, F + 0.6) : 0, transform: `translateY(${(1 - MOTION.enter(T, F + 0.6)) * 24}px)` })}>
            <span style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 700 }}>Correction · Dr Aïcha</span>
            <span style={{ fontFamily: HF, fontSize: 22 }}>Herpès labial</span>
            <span style={{ fontSize: 13, lineHeight: 1.4 }}>Vésicules groupées, brûlure avant l'éruption. L'impétigo donne des croûtes jaunâtres.</span>
          </div>
          <div style={A(20, 706, 352, 118, { borderRadius: 28, background: C.surf, padding: 16, display: 'flex', flexDirection: 'column', gap: 8, opacity: T >= F - 0.3 ? MOTION.enter(T, F + 2) : 0 })}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><b>Votre parcours · Herpès</b><span>accord {bar >= 84.9 ? 17 : 16} / 20</span></div>
            <div style={{ height: 10, borderRadius: 999, background: C.n200, overflow: 'hidden' }}><div style={{ height: '100%', width: `${bar}%`, background: C.g600, borderRadius: 999 }} /></div>
            <Pill bg={C.g600} fg={C.n100} style={{ alignSelf: 'flex-start', transform: `scale(${MOTION.pop(T, F + 3.8)})`, transformOrigin: 'left center' }}>Autonome sur l'herpès</Pill>
          </div>
        </div>
      </div>
    </div>
  );
}

const Side_NAV = ['Accueil', 'Agenda', 'Patients', 'Télé-expertise', 'Portefeuille', 'Pilotage'];
function Laptop() {
  const { T, CUES } = useComposition();
  const D = CUES.Dermato, E = CUES.Encaissement, Cab = CUES.Cabinet, Ag = CUES.Agenda, R = CUES.Relais, TE = CUES.Teleexpertise, F = CUES.Formation, O = CUES.ONG, Cl = CUES.Cloture;
  const lo = Math.max(win(T, D - 0.1, R + 0.35, 0.6), win(T, TE - 0.1, F + 0.35, 0.6), win(T, O - 0.1, Cl + 0.35, 0.6)); if (!lo) return null;
  const L = { derm: win(T, D - 0.3, E + 0.3, 0.35), wal: win(T, E, Cab + 0.3, 0.35), cab: win(T, Cab, Ag + 0.3, 0.35), ag: win(T, Ag, R + 0.5, 0.35), te: win(T, TE - 0.3, F + 0.5, 0.35), ong: win(T, O - 0.3, Cl + 0.5, 0.35) };
  const active = T < E ? 2 : T < Cab ? 4 : T < Ag ? 0 : T < R + 0.4 ? 1 : T < F + 0.4 ? 3 : 5;
  const type = (s, t0, dur) => s.slice(0, Math.round(s.length * clamp((T - t0) / dur, 0, 1)));
  const photosN = [Cab + 2.3, Cab + 2.6, Cab + 2.9].filter(t => T >= t).length;
  const avis = 'Herpès labial. Vésicules groupées sur le bord de la lèvre, brûlure avant l\'éruption. Pas de croûtes jaunâtres : ce n\'est pas un impétigo. Aciclovir si vu tôt.';
  const SLOTS = [['08:30', 'Nadège E.', 'Consultation en ligne', C.g200], ['09:30', 'Awa Kamga', 'Contrôle mélasma', C.acc200], ['10:30', null], ['11:30', 'Paul · CSI de Mokolo', 'Télé-expertise', C.g200], ['12:30', 'Pause', '', C.n200], ['13:30', 'Marc Tchoua', 'Première visite', C.acc200]];
  const lines = [['Patient', 'Nadège Eyenga, 31 ans, phototype V'], ['Diagnostic', 'Mélasma épidermique'], ['Traitement', 'Acide azélaïque 15 % le soir'], ['', 'Écran solaire SPF 50 chaque matin'], ['Contrôle', 'Photo de suivi dans 4 semaines']];
  const sig = MOTION.draw(T, D + 5.7, 0.8), signed = on(T, D + 6.5);
  const bal = 76000 + 4000 * MOTION.draw(T, E + 0.8, 1.2), split = MOTION.draw(T, E + 1, 1.2);
  const k = MOTION.draw(T, O + 0.4, 1.3), line = MOTION.draw(T, O + 0.9, 1.8);
  const pts = [52, 61, 68, 74, 81, 86].map((v, i) => `${30 + i * 88},${220 - (v - 40) * 3.4}`).join(' ');
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: lo, transform: `translateY(${(1 - lo) * 40}px)` }}>
      <div style={A(800, 150, 1020, 640, { borderRadius: 26, background: C.n900, padding: 16, boxShadow: '0 40px 80px rgba(46,43,37,.25)' })}>
        <div style={{ position: 'relative', width: 988, height: 608, borderRadius: 12, overflow: 'hidden', background: C.bg }}>
          <div style={A(0, 0, 170, 608, { background: C.surf, padding: '18px 12px', display: 'flex', flexDirection: 'column', gap: 6 })}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 6px 14px' }}><img src="client/public/glowscan-mark.png" style={{ width: 26, height: 26, borderRadius: 999 }} /><span style={{ fontFamily: HF, fontSize: 15 }}>GlowScan Derm</span></div>
            {Side_NAV.map((n, i) => <span key={n} style={{ padding: '9px 12px', borderRadius: 999, fontSize: 13, fontWeight: 700, background: i === active ? C.acc : 'transparent', color: i === active ? C.n100 : C.text }}>{n}</span>)}
          </div>

          <div style={{ position: 'absolute', inset: 0, opacity: L.derm }}>
            <div style={A(190, 16 + (1 - MOTION.enter(T, D + 0.3)) * -30, 560, 44, { borderRadius: 999, background: C.g600, color: C.n100, display: 'flex', alignItems: 'center', padding: '0 18px', fontSize: 14, fontWeight: 700, opacity: win(T, D + 0.3, D + 2.2, 0.3) })}>Nouvelle consultation payée · Nadège E., 31 ans · 5 000 F</div>
            <div style={A(190, 76, 390, 110, { display: 'flex', flexDirection: 'column', gap: 8 })}>
              <b style={{ fontSize: 16 }}>Nadège Eyenga · 31 ans · phototype V</b>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{[IMG.front, IMG.profile, IMG.close].map(s => <span key={s} style={{ position: 'relative', width: 64, height: 64, borderRadius: 16, overflow: 'hidden' }}><Ph src={s} pos="center 35%" /></span>)}<span style={{ fontSize: 12, color: C.n700, lineHeight: 1.4 }}>Glow Score 58<br />−6 depuis juin</span></div>
            </div>
            <div style={A(190, 194, 390, 58, { borderRadius: 20, background: C.surf, padding: '10px 14px', fontSize: 13, lineHeight: 1.4 })}>« Les taches sont revenues après mes vacances à Kribi. »</div>
            <div style={A(190, 266, 390, 150, { borderRadius: 24, background: C.acc100, padding: 16, display: 'flex', flexDirection: 'column', gap: 6 })}>
              <span style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 700, color: C.acc700 }}>Suggestion IA · indicative</span>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}><span style={{ fontFamily: HF, fontSize: 22 }}>Mélasma épidermique</span><b style={{ fontSize: 14 }}>87 %</b></div>
            </div>
            <Btn x={206} y={366} w={120} h={40} fs={14} bg={on(T, D + 2.4) ? C.g600 : C.acc} press={pressAt(T, D + 2.4)}>{on(T, D + 2.4) ? 'Validé ✓' : 'Valider'}</Btn>
            <Btn x={336} y={366} w={120} h={40} fs={14} bg="transparent" fg={C.acc700}>Corriger</Btn>
            <div style={A(600, 76, 368, 516, { borderRadius: 16, background: C.paper, boxShadow: '0 20px 40px rgba(46,43,37,.15)', padding: 20, opacity: MOTION.enter(T, D + 2.6), transform: `translateX(${(1 - MOTION.enter(T, D + 2.6)) * 40}px)` })}>
              <div style={{ fontFamily: HF, fontSize: 18 }}>Compte rendu de consultation</div>
              <div style={{ fontSize: 11, color: C.n700, marginTop: 2 }}>Dr Aïcha Nkemdirim · Dermatologue · Douala</div>
              <div style={{ height: 1, background: C.n300, margin: '14px 0' }} />
              {lines.map(([l, v], i) => { const o = MOTION.enter(T, D + 3 + i * 0.4, 0.4); return <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13, marginBottom: 10, opacity: o }}><span style={{ width: 78, flex: 'none', color: C.n700 }}>{l}</span><b style={{ fontWeight: 600 }}>{v}</b></div>; })}
              <div style={A(20, 350, 328, 86, { borderRadius: 14, border: `1.5px dashed ${C.n300}` })}>
                <svg width="328" height="86" viewBox="0 0 328 86" style={{ position: 'absolute', inset: 0 }}><path d="M40 56 C60 20, 80 20, 86 50 S110 70, 124 40 S150 20, 160 52 S196 60, 214 34 L240 50 S270 58, 290 36" fill="none" stroke={C.n900} strokeWidth="2.5" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - sig} /></svg>
                <span style={{ position: 'absolute', left: 12, bottom: 6, fontSize: 10, color: C.n700 }}>Signature · code à 4 chiffres</span>
              </div>
              <Btn x={20} y={452} w={328} h={44} fs={14} bg={signed ? C.g600 : C.acc} press={pressAt(T, D + 5.6)}>{signed ? 'Signé et envoyé ✓' : 'Signer et envoyer'}</Btn>
            </div>
            <div style={A(190, 440, 390, 110, { borderRadius: 24, background: C.g100, color: C.g900, padding: 16, display: 'flex', flexDirection: 'column', gap: 6, opacity: MOTION.enter(T, D + 6.8), transform: `translateY(${(1 - MOTION.enter(T, D + 6.8)) * 20}px)` })}>
              <b style={{ fontSize: 15 }}>Envoyé à Nadège ✓</b>
              <div style={{ display: 'flex', gap: 6 }}><Pill bg={C.g600} fg={C.n100}>WhatsApp</Pill><Pill bg={C.g600} fg={C.n100}>Email</Pill></div>
              <span style={{ fontSize: 12 }}>Temps total : 3 minutes</span>
            </div>
          </div>

          <div style={{ position: 'absolute', inset: 0, opacity: L.wal }}>
            <div style={A(190, 20, 600, 40, { fontFamily: HF, fontSize: 28 })}>Portefeuille</div>
            <div style={A(190, 76, 380, 150, { borderRadius: 24, background: C.g100, color: C.g900, padding: 18, display: 'flex', flexDirection: 'column', gap: 6 })}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Solde disponible</span>
              <span style={{ fontFamily: HF, fontSize: 44, lineHeight: 1 }}>{fmt(bal)} F</span>
              <Pill bg={C.g600} fg={C.n100} style={{ alignSelf: 'flex-start', transform: `scale(${MOTION.pop(T, E + 0.8)})`, transformOrigin: 'left center' }}>+4 000 F · consultation Nadège E.</Pill>
            </div>
            <div style={A(590, 76, 378, 150, { borderRadius: 24, background: C.surf, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 })}>
              <b style={{ fontSize: 13 }}>Répartition · consultation 5 000 F</b>
              <div style={{ display: 'flex', height: 18, borderRadius: 999, overflow: 'hidden', background: C.n200 }}><span style={{ width: `${80 * split}%`, background: C.g600 }} /><span style={{ width: `${20 * split}%`, background: C.acc }} /></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}><span style={{ color: C.g700 }}>Vous · 4 000 F</span><span style={{ color: C.acc700 }}>GlowScan · 1 000 F</span></div>
            </div>
            <div style={A(190, 246, 778, 156, { borderRadius: 24, background: C.surf, padding: '10px 18px' })}>
              {[['Consultation · Nadège E.', 'aujourd\'hui', '+4 000 F', true], ['Avis relais · CSI de Mokolo', 'hier', '+1 800 F'], ['Consultation · Jean M.', 'lundi', '+4 000 F']].map(([a, b, c, n], i) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < 2 ? `1px solid ${C.n300}` : 'none', fontSize: 14 }}><b style={{ flex: 1 }}>{a}</b><span style={{ color: C.n700, width: 110 }}>{b}</span><b style={{ color: C.g700 }}>{c}</b>{n ? <Pill bg={C.acc200} fg={C.acc900}>Nouveau</Pill> : <span style={{ width: 80 }} />}</div>)}
            </div>
            <Btn x={190} y={420} w={320} h={52} fs={15} press={pressAt(T, E + 3.4)}>Retirer vers MTN MoMo</Btn>
            <div style={A(190, 490, 560, 56, { borderRadius: 999, background: C.g600, color: C.n100, display: 'flex', alignItems: 'center', padding: '0 22px', fontSize: 15, fontWeight: 700, opacity: MOTION.enter(T, E + 3.8), transform: `translateY(${(1 - MOTION.enter(T, E + 3.8)) * 16}px)` })}>Retrait de 80 000 F envoyé · reçu en 2 minutes ✓</div>
          </div>

          <div style={{ position: 'absolute', inset: 0, opacity: L.cab }}>
            <div style={A(190, 18, 778, 40, { display: 'flex', alignItems: 'center', justifyContent: 'space-between' })}><span style={{ fontFamily: HF, fontSize: 26 }}>Accueil du cabinet</span><Pill bg={C.acc200} fg={C.acc900}>Connectée : Marie · secrétaire</Pill></div>
            <div style={A(190, 70, 380, 300, { borderRadius: 24, background: C.surf, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 })}>
              <b style={{ fontSize: 13 }}>Nouveau patient</b>
              {[['Nom', 'Jean Mbarga'], ['Âge', '27 ans · homme'], ['WhatsApp', '+237 699 41 20 18'], ['Motif', 'Boutons sur le visage depuis 1 an']].map(([l, v], i) => <div key={l} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}><span style={{ fontSize: 11, color: C.n700 }}>{l}</span><span style={{ height: 34, borderRadius: 999, background: C.bg, display: 'flex', alignItems: 'center', padding: '0 14px', fontSize: 14, fontWeight: 600 }}>{type(v, Cab + 0.4 + i * 0.45, 0.4)}</span></div>)}
            </div>
            <div style={A(590, 70, 378, 300, { borderRadius: 24, background: C.surf, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 })}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><b style={{ fontSize: 13 }}>Photos · tablette de l'infirmière</b><span style={{ fontSize: 12, color: C.n700 }}>{photosN} / 3</span></div>
              <div style={{ position: 'relative', height: 170, borderRadius: 18, overflow: 'hidden', background: C.n200, opacity: MOTION.enter(T, Cab + 2.3, 0.4) }}><Ph src={IMG.acne} pos="center 25%" /></div>
              {T < Cab + 4.2
                ? <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 700, opacity: MOTION.enter(T, Cab + 3.1, 0.3) }}><span>Analyse IA…</span><span style={{ flex: 1, height: 6, borderRadius: 999, background: C.n200, overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: `${MOTION.draw(T, Cab + 3.1, 1.1) * 100}%`, background: C.g600 }} /></span></div>
                : <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}><Pill bg={C.acc200} fg={C.acc900}>Glow Score 44</Pill><Pill bg={C.bg} fg={C.text}>Acné inflammatoire · indicatif</Pill></div>}
            </div>
            <Btn x={190} y={390} w={300} h={50} fs={15} bg={on(T, Cab + 5) ? C.g600 : C.acc} press={pressAt(T, Cab + 5)}>{on(T, Cab + 5) ? 'Envoyé au médecin ✓' : 'Envoyer au médecin'}</Btn>
            <div style={A(190, 460, 778, 130, { borderRadius: 24, background: C.surf, padding: '12px 18px' })}>
              <b style={{ fontSize: 13 }}>Salle d'attente · Dr Aïcha</b>
              {[['Jean Mbarga', 'Dossier prêt · analyse faite', C.g600, C.n100, Cab + 5.3], ['Awa Kamga', '10:30 · contrôle', C.n200, C.text, -1]].map(([n, st, bg, fg, t0]) => <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', fontSize: 14, opacity: t0 < 0 ? 1 : MOTION.enter(T, t0), transform: `translateY(${t0 < 0 ? 0 : (1 - MOTION.enter(T, t0)) * 12}px)` }}><b style={{ flex: 1 }}>{n}</b><Pill bg={bg} fg={fg}>{st}</Pill></div>)}
            </div>
          </div>

          <div style={{ position: 'absolute', inset: 0, opacity: L.ag }}>
            <div style={A(190, 18, 778, 40, { display: 'flex', alignItems: 'center', justifyContent: 'space-between' })}><span style={{ fontFamily: HF, fontSize: 26 }}>Agenda · jeudi 25 septembre</span><Pill bg={C.acc200} fg={C.acc900}>Marie · secrétaire</Pill></div>
            <div style={A(190, 70, 500, 520, { borderRadius: 24, background: C.surf })} />
            {SLOTS.map(([t, n, m, bg], i) => { const y = 86 + i * 80; const free = !n; const booked = free && on(T, Ag + 1.2); return <React.Fragment key={t}>
              <span style={A(206, y + 22, 50, 20, { fontSize: 13, fontWeight: 700, color: C.n700 })}>{t}</span>
              <div style={A(262, y, 412, 64, { borderRadius: 18, background: free ? (booked ? C.acc200 : 'transparent') : bg, border: free && !booked ? `2px dashed ${C.n300}` : 'none', padding: '0 16px', display: 'flex', alignItems: 'center', gap: 10, transform: `scale(${free ? 1 - pressAt(T, Ag + 1.2) * 0.03 : 1})` })}>
                {free && !booked ? <span style={{ fontSize: 14, fontWeight: 700, color: C.n700 }}>+ Créneau libre</span> : <>
                  <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}><b style={{ fontSize: 14 }}>{free ? 'Jean Mbarga' : n}</b><span style={{ fontSize: 12, color: C.n700 }}>{free ? 'Suivi acné' : m}</span></span>
                  {free && <Pill bg={C.g600} fg={C.n100} style={{ opacity: MOTION.enter(T, Ag + 4.8) }}>Confirmé sur WhatsApp ✓</Pill>}
                </>}
              </div>
            </React.Fragment>; })}
            <div style={A(710, 70, 258, 250, { borderRadius: 24, background: C.surf, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 })}>
              <b style={{ fontSize: 13 }}>Rappels automatiques</b>
              {[['La veille', 'Rappel WhatsApp du RDV'], ['2 h avant', 'SMS de rappel'], ['Après la visite', 'Compte rendu PDF'], ['J+28', 'Photo de contrôle demandée']].map(([a, b], i) => <div key={a} style={{ display: 'flex', flexDirection: 'column', opacity: MOTION.enter(T, Ag + 1.8 + i * 0.3) }}><span style={{ fontSize: 11, fontWeight: 700, color: C.acc700 }}>{a}</span><span style={{ fontSize: 13, fontWeight: 600 }}>{b}</span></div>)}
            </div>
            <div style={A(710, 334, 258, 256, { borderRadius: 24, background: C.g100, color: C.g900, padding: 16, display: 'flex', flexDirection: 'column', gap: 8, opacity: MOTION.enter(T, Ag + 5.6) })}>
              <b style={{ fontSize: 13 }}>Suivi · Nadège E.</b>
              <div style={{ position: 'relative', height: 120, borderRadius: 16, overflow: 'hidden' }}><Ph src={IMG.close} pos="center 40%" /></div>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Photo de contrôle reçue ce matin</span>
              <Pill bg={C.g600} fg={C.n100} style={{ alignSelf: 'flex-start', transform: `scale(${MOTION.pop(T, Ag + 6.2)})`, transformOrigin: 'left center' }}>Score 58 → 66 · en amélioration</Pill>
            </div>
          </div>

          <div style={{ position: 'absolute', inset: 0, opacity: L.te }}>
            <div style={A(190, 18, 778, 40, { display: 'flex', alignItems: 'center', justifyContent: 'space-between' })}><span style={{ fontFamily: HF, fontSize: 26 }}>Télé-expertise · demandes des relais</span><Pill bg={C.acc} fg={C.n100}>3 en attente</Pill></div>
            {[[IMG.herpes, HZ, 'CSI de Mokolo · Paul', 'Avis simple · 3 000 F', 'il y a 12 min'], [IMG.dpn, { objectPosition: '100% 50%' }, 'CSI de Maroua · Awa', 'Avis simple · 3 000 F', 'il y a 40 min'], [null, null, 'CSI de Mora · Esther', 'Urgent · 5 000 F · sous 2 h', 'il y a 1 h']].map(([src, st, n, p, t], i) => { const sel = i === 0 && on(T, TE + 0.8); return (
              <div key={n} style={A(190, 70 + i * 110, 300, 100, { borderRadius: 22, background: sel ? C.acc200 : C.surf, padding: 14, display: 'flex', alignItems: 'center', gap: 12, transform: `scale(${i === 0 ? 1 - pressAt(T, TE + 0.8) * 0.03 : 1})` })}>
                <span style={{ position: 'relative', flex: 'none', width: 72, height: 72, borderRadius: 16, overflow: 'hidden', background: i === 2 ? C.acc : C.n200, color: C.n100, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>{src ? <Ph src={src} style={st} /> : 'Urgent'}</span>
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}><b style={{ fontSize: 14 }}>{n}</b><span style={{ fontSize: 12, fontWeight: 700, color: i === 2 ? C.acc700 : C.g700 }}>{p}</span><span style={{ fontSize: 11, color: C.n700 }}>{t}</span></span>
              </div>); })}
            <div style={{ position: 'absolute', inset: 0, opacity: MOTION.enter(T, TE + 1.1) }}>
              <div style={A(506, 70, 462, 180, { borderRadius: 22, overflow: 'hidden' })}><Ph src={IMG.herpes} style={HZ} /></div>
              <div style={A(506, 262, 462, 30, { display: 'flex', gap: 6 })}><Pill bg={C.surf} fg={C.text}>Relais : impétigo</Pill><Pill bg={C.surf} fg={C.text}>IA : herpès labial 79 %</Pill></div>
              <div style={A(506, 300, 462, 100, { borderRadius: 18, background: C.paper, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 4 })}><span style={{ fontSize: 11, fontWeight: 700, color: C.acc700 }}>Votre avis · devient la leçon de Paul</span><span style={{ fontSize: 13, lineHeight: 1.4 }}>{type(avis, TE + 1.6, 2.2)}</span></div>
              <Btn x={506} y={412} w={300} h={44} fs={14} bg={on(T, TE + 4) ? C.g600 : C.acc} press={pressAt(T, TE + 4)}>{on(T, TE + 4) ? 'Envoyé à Paul ✓' : 'Corriger et envoyer'}</Btn>
              <Btn x={816} y={412} w={152} h={44} fs={14} bg="transparent" fg={C.acc700}>Confirmer</Btn>
              <div style={A(506, 468, 462, 122, { borderRadius: 22, background: C.g100, color: C.g900, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8, opacity: MOTION.enter(T, TE + 4.6), transform: `translateY(${(1 - MOTION.enter(T, TE + 4.6)) * 16}px)` })}>
                <b style={{ fontSize: 14 }}>Avis payé · 3 000 F</b>
                <div style={{ display: 'flex', height: 14, borderRadius: 999, overflow: 'hidden', background: C.n200 }}>{[[60, C.g600], [20, C.acc300], [20, C.acc]].map(([w, c], i) => <span key={i} style={{ width: `${w * MOTION.draw(T, TE + 4.8, 1)}%`, background: c }} />)}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700 }}><span>Vous · 1 800 F</span><span>Paul · 600 F</span><span>GlowScan · 600 F</span></div>
                <span style={{ fontSize: 11 }}>Payé par la patiente au CSI par MoMo, ou pris en charge par le programme.</span>
              </div>
            </div>
          </div>

          <div style={{ position: 'absolute', inset: 0, opacity: L.ong }}>
            <div style={A(190, 18, 778, 44, { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' })}><span style={{ fontFamily: HF, fontSize: 26 }}>Programme · District de Mokolo</span><span style={{ fontSize: 13, color: C.n700 }}>Septembre 2026</span></div>
            {[['Cas traités', fmt(312 * k)], ['Agents formés', fmt(24 * k)], ['Accord avec le dermatologue', fmt(86 * k) + ' %']].map(([l, v], i) => <div key={l} style={A(190 + i * 264, 76, 250, 112, { borderRadius: 24, background: i === 2 ? C.g100 : C.surf, padding: 16, display: 'flex', flexDirection: 'column', gap: 6 })}><span style={{ fontSize: 12, color: C.n700, fontWeight: 600 }}>{l}</span><span style={{ fontFamily: HF, fontSize: 38, lineHeight: 1 }}>{v}</span></div>)}
            <div style={A(190, 204, 510, 264, { borderRadius: 24, background: C.surf, padding: 16 })}>
              <b style={{ fontSize: 13 }}>Accord agents / dermatologue</b>
              <svg width="478" height="220" viewBox="0 0 520 240" style={{ position: 'absolute', left: 16, top: 36 }}>
                <line x1="20" y1="136" x2="500" y2="136" stroke={C.acc} strokeDasharray="6 6" strokeWidth="1.5" />
                <text x="500" y="128" textAnchor="end" fontSize="12" fill={C.acc700} fontFamily={BF} fontWeight="700">seuil d'autonomie 85 %</text>
                <polyline points={pts} fill="none" stroke={C.g600} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - line} />
                {['Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept'].map((m, i) => <text key={m} x={30 + i * 88} y="236" textAnchor="middle" fontSize="12" fill={C.n700} fontFamily={BF}>{m}</text>)}
              </svg>
            </div>
            <div style={A(716, 204, 252, 264, { borderRadius: 24, background: C.surf, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 })}>
              <b style={{ fontSize: 13 }}>Agents</b>
              {[['Paul · Mokolo', 85], ['Awa · Maroua', 78], ['Idriss · Kousséri', 71], ['Esther · Mora', 64]].map(([n, v], i) => <div key={n} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600 }}><span>{n}</span><span>{v} %</span></div><div style={{ height: 8, borderRadius: 999, background: C.n200 }}><div style={{ height: '100%', width: `${v * MOTION.draw(T, O + 1 + i * 0.15, 1)}%`, borderRadius: 999, background: v >= 85 ? C.g600 : C.acc300 }} /></div></div>)}
            </div>
            <Btn x={190} y={486} w={280} h={50} fs={15} press={pressAt(T, O + 3.8)}>Générer le rapport mensuel</Btn>
            <div style={A(486, 486, 482, 50, { borderRadius: 999, background: C.g600, color: C.n100, display: 'flex', alignItems: 'center', padding: '0 20px', fontSize: 14, fontWeight: 700, opacity: MOTION.enter(T, O + 4.3), transform: `scale(${0.9 + 0.1 * MOTION.pop(T, O + 4.3)})` })}>Rapport_septembre.pdf · envoyé au bailleur ✓</div>
          </div>
        </div>
      </div>
      <div style={A(730, 790, 1160, 24, { borderRadius: '0 0 20px 20px', background: C.n300 })} />
      <div style={A(1380, 34, 460, 104, { borderRadius: 26, background: C.paper, boxShadow: '0 20px 40px rgba(46,43,37,.18)', padding: '14px 18px', display: 'flex', gap: 14, alignItems: 'center', opacity: win(T, Ag + 3.4, R + 0.2, 0.4), transform: `translateY(${(1 - MOTION.enter(T, Ag + 3.4)) * -24}px)` })}>
        <span style={{ flex: 'none', width: 48, height: 48, borderRadius: 14, background: C.g600, color: C.n100, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>WA</span>
        <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}><b style={{ fontSize: 14 }}>WhatsApp · GlowScan pour Jean</b><span style={{ fontSize: 13, lineHeight: 1.35 }}>Rappel : RDV demain 10:30 avec Dr Aïcha. Répondez 1 pour confirmer.</span><span style={{ fontSize: 12, fontWeight: 700, color: C.g700, opacity: MOTION.enter(T, Ag + 4.6) }}>Jean : 1 ✓</span></span>
      </div>
    </div>
  );
}

function Cloture() {
  const { T, CUES } = useComposition(); const Cl = CUES.Cloture;
  const o = win(T, Cl, Infinity, 0.6);
  const steps = ['Patient', 'Cabinet', 'Dermatologue', 'Relais', 'ONG'];
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 36, textAlign: 'center', opacity: o }}>
      <img src="client/public/glowscan-mark.png" style={{ width: 96, height: 96, borderRadius: 999 }} />
      <div style={{ fontFamily: HF, fontSize: 88, lineHeight: 1.08 }}>GlowScan ne diagnostique pas.<br /><span style={{ color: C.acc }}>GlowScan documente.</span></div>
      <div style={{ fontSize: 36, fontWeight: 700, color: C.g700, opacity: MOTION.enter(T, Cl + 0.8) }}>Vous restez le médecin. Toujours.</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {steps.map((s, i) => { const e = MOTION.pop(T, Cl + 1.4 + i * 0.25); return <React.Fragment key={s}>{i > 0 && <span style={{ fontSize: 28, color: C.n700, opacity: e }}>→</span>}<span style={{ padding: '14px 28px', borderRadius: 999, background: i % 2 ? C.g200 : C.acc200, fontSize: 28, fontWeight: 700, transform: `scale(${e})` }}>{s}</span></React.Fragment>; })}
      </div>
      <div style={{ fontSize: 26, color: C.n700, opacity: MOTION.enter(T, Cl + 2.6) }}>glow-scan.com · WhatsApp +237 674 377 959</div>
    </div>
  );
}

function Cursor() {
  const { T, CUES } = useComposition();
  const P = CUES.Patient, Pay = CUES.Paiement, D = CUES.Dermato, E = CUES.Encaissement, R = CUES.Relais, O = CUES.ONG;
  const Cab = CUES.Cabinet, Ag = CUES.Agenda, TE = CUES.Teleexpertise, F = CUES.Formation;
  const K = [[P + 0.2, 1480, 990], [P + 1.2, 1320, 882], [P + 6.6, 1320, 718], [Pay + 1.1, 1320, 272], [Pay + 3.0, 1320, 612], [D + 2.4, 1082, 552], [D + 5.6, 1600, 716], [E + 3.4, 1156, 612], [Cab + 5.0, 1156, 581], [Ag + 1.2, 1284, 444], [R + 1.2, 1199, 516], [R + 2.2, 1320, 580], [TE + 0.8, 1156, 286], [TE + 4.0, 1472, 600], [O + 3.8, 1146, 677]];
  let x = K[0][1], y = K[0][2];
  for (let i = 0; i < K.length; i++) {
    if (T >= K[i][0]) { x = K[i][1]; y = K[i][2]; }
    const n = K[i + 1]; if (n && T >= n[0] - 0.8 && T < n[0]) { const e = MOTION.draw(T, n[0] - 0.8, 0.8); x = K[i][1] + (n[1] - K[i][1]) * e; y = K[i][2] + (n[2] - K[i][2]) * e; break; }
    if (n && T < n[0]) break;
  }
  const o = win(T, P + 0.3, O + 5.2, 0.4); if (!o) return null;
  const finger = T < D || (T >= R && T < TE) || (T >= F && T < O);
  const press = K.slice(1).reduce((m, k) => Math.max(m, pressAt(T, k[0])), 0);
  const rip = K.slice(1).map(k => T - k[0]).find(d => d >= 0 && d < 0.55);
  return (
    <div style={{ position: 'absolute', left: x, top: y, opacity: o, pointerEvents: 'none' }}>
      {rip !== undefined && <span style={{ position: 'absolute', left: -40, top: -40, width: 80, height: 80, borderRadius: 999, border: `3px solid ${C.acc}`, transform: `scale(${0.3 + rip * 1.6})`, opacity: 1 - rip / 0.55 }} />}
      {finger
        ? <span style={{ position: 'absolute', left: -24, top: -24, width: 48, height: 48, borderRadius: 999, background: 'rgba(46,43,37,.28)', border: '3px solid rgba(249,244,237,.95)', transform: `scale(${1 - press * 0.2})` }} />
        : <svg width="34" height="40" viewBox="0 0 34 40" style={{ position: 'absolute', left: -4, top: -2, transform: `scale(${1 - press * 0.15})`, transformOrigin: '4px 2px' }}><path d="M4 2 L4 32 L12 25 L18 38 L24 35 L18 23 L29 23 Z" fill={C.n900} stroke={C.n100} strokeWidth="2.5" strokeLinejoin="round" /></svg>}
    </div>
  );
}

function Piece() {
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.bg, color: C.text, fontFamily: BF, overflow: 'hidden' }}>
      <Opening /><Probleme /><Side /><Phone /><Laptop /><Cloture /><Cursor />
    </div>
  );
}

window.DermDemo = function DermDemo() {
  return <CompositionStage width={1920} height={1080} scenes={window.OM_SCENES} playback={window.OM_PLAYBACK} bg={C.bg}><Piece /></CompositionStage>;
};
