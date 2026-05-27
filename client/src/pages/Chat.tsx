import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Sparkles, ArrowLeft, ScanFace, Crown, Lock, Terminal, ShieldAlert } from "lucide-react";
import { Link } from "wouter";
import { useScans } from "@/hooks/use-scans";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";

interface Message {
  role: "user" | "assistant";
  content: string;
  loading?: boolean;
}

const SUGGESTIONS = [
  "Pourquoi j'ai des boutons sur le front ?",
  "Quel ordre appliquer mes produits ?",
  "Comment réduire les taches sombres ?",
  "Mon score va-t-il s'améliorer ?",
  "Quelle routine pour peau grasse ?",
];

function PremiumGatePage({ feature }: { feature: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 pb-20" style={{ background: "#0D0A0E" }}>
      {/* Orb */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full" style={{ background: "radial-gradient(circle, rgba(233,30,140,0.15) 0%, transparent 70%)" }} />
      </div>

      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: "rgba(233,30,140,0.12)", border: "1px solid rgba(233,30,140,0.25)" }}
      >
        <Lock className="w-6 h-6" style={{ color: "#E91E8C" }} />
      </div>

      <div className="text-center mb-8 relative z-10">
        <div
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1 mb-4"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <Crown className="w-3.5 h-3.5" style={{ color: "#E91E8C" }} />
          <span className="text-[10px] font-black text-white uppercase tracking-wider font-mono">Module Premium</span>
        </div>
        <h1 className="text-xl font-black text-white uppercase tracking-tight mb-2">{feature}</h1>
        <p className="text-xs leading-relaxed max-w-xs font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>
          Débloquez l'accès illimité à l'assistant {feature}, aux analyses cellulaires continues et aux protocoles avancés pour <strong className="text-white">500 FCFA/semaine</strong> ou <strong className="text-white">2 000 FCFA/mois</strong>.
        </p>
      </div>

      <div className="w-full max-w-xs space-y-2 mb-8 text-left relative z-10">
        {[
          "Analyses de peau illimitées",
          "GlowScan AI — diagnostic continu 24h/24",
          "Scan de formulation cosmétique",
          "Analyse de l'impact nutritionnel",
          "Accès intégral aux prescriptions cliniques",
        ].map(item => (
          <div
            key={item}
            className="flex items-center gap-3 rounded-xl p-3"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div
              className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(233,30,140,0.15)", border: "1px solid rgba(233,30,140,0.25)" }}
            >
              <span className="text-xs font-black" style={{ color: "#E91E8C" }}>✓</span>
            </div>
            <span className="text-xs font-semibold text-white">{item}</span>
          </div>
        ))}
      </div>

      <a
        href="/premium"
        className="w-full max-w-xs flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm text-white active:scale-95 transition-transform relative z-10"
        style={{
          background: "linear-gradient(135deg, #E91E8C 0%, #f43f5e 60%, #fb923c 100%)",
          boxShadow: "0 0 30px rgba(233,30,140,0.4)",
        }}
      >
        <Crown className="w-4 h-4" />
        Activer la licence pro
      </a>
      <a href="/" className="mt-5 text-xs font-bold uppercase tracking-wider hover:underline relative z-10" style={{ color: "rgba(255,255,255,0.35)" }}>← Accueil</a>
    </div>
  );
}

export default function Chat() {
  const { user } = useAuth();
  const { isPremium, isLoading: subLoading } = useSubscription();
  const { data: scans } = useScans();
  const lastScan = scans?.[0];
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: lastScan
        ? `Bonjour. Assistant GlowScan AI initialisé. J'ai analysé les métriques de votre dernier diagnostic (${lastScan.condition}, index ${lastScan.score}/100). Posez-moi vos questions sur votre épiderme ou votre protocole de soin.`
        : "Bonjour. Assistant GlowScan AI connecté. Formulez vos questions relatives à vos problématiques cutanées ou à vos analyses de formulations.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || isLoading) return;
    setInput("");

    const history = messages.filter(m => !m.loading).map(m => ({ role: m.role, content: m.content }));
    const userMsg: Message = { role: "user", content: msg };
    const botMsg: Message = { role: "assistant", content: "", loading: true };

    setMessages(prev => [...prev, userMsg, botMsg]);
    setIsLoading(true);

    const scanContext = lastScan ? {
      condition: lastScan.condition,
      score: lastScan.score,
      skinType: (lastScan as any).skinType || "",
      area: lastScan.area,
      details: lastScan.analysis?.substring(0, 200),
    } : undefined;

    try {
      const res = await fetch("/api/skin-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history, scanContext }),
      });
      if (!res.body) throw new Error("No stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const raw = line.slice(6);
            if (raw === "[DONE]") break;
            try {
              const parsed = JSON.parse(raw);
              if (parsed.content) {
                full += parsed.content;
                setMessages(prev => prev.map((m, i) =>
                  i === prev.length - 1 ? { ...m, content: full, loading: false } : m
                ));
              }
            } catch {}
          }
        }
      }
    } catch {
      setMessages(prev => prev.map((m, i) =>
        i === prev.length - 1 ? { ...m, content: "Une erreur de liaison réseau est survenue. Veuillez réémettre votre requête.", loading: false } : m
      ));
    } finally {
      setIsLoading(false);
    }
  }

  if (!user) {
    return <PremiumGatePage feature="GlowScan AI" icon="🤖" />;
  }

  return (
    <div
      className="flex flex-col h-screen max-w-lg mx-auto"
      style={{ background: "#0D0A0E", borderLeft: "1px solid rgba(255,255,255,0.05)", borderRight: "1px solid rgba(255,255,255,0.05)" }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-3 sticky top-0 z-10"
        style={{ background: "rgba(13,10,14,0.95)", borderBottom: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(20px)" }}
      >
        <Link href="/">
          <button
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>

        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(233,30,140,0.12)", border: "1px solid rgba(233,30,140,0.25)" }}
        >
          <Terminal className="w-4 h-4" style={{ color: "#E91E8C" }} />
        </div>

        <div className="text-left">
          <p className="text-xs font-black text-white uppercase tracking-wide">GlowScan AI</p>
          <p className="text-[10px] font-bold font-mono flex items-center gap-1" style={{ color: "#86efac" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse" />
            Core Engine active
          </p>
        </div>

        {lastScan && (
          <div
            className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-lg"
            style={{ background: "rgba(233,30,140,0.12)", border: "1px solid rgba(233,30,140,0.25)" }}
          >
            <ScanFace className="w-3.5 h-3.5" style={{ color: "#E91E8C" }} />
            <span className="text-[10px] font-mono font-bold text-white">{lastScan.score}/100</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-start gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              {/* Avatar */}
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                style={
                  msg.role === "assistant"
                    ? { background: "rgba(233,30,140,0.12)", border: "1px solid rgba(233,30,140,0.25)", color: "#E91E8C" }
                    : { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)" }
                }
              >
                {msg.role === "assistant" ? <Terminal className="w-3 h-3" /> : <User className="w-3 h-3" />}
              </div>

              {/* Bubble */}
              <div
                className="max-w-[80%] px-3.5 py-2.5 rounded-xl text-xs leading-relaxed text-left"
                style={
                  msg.role === "assistant"
                    ? { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.75)", fontWeight: 500 }
                    : {
                        background: "linear-gradient(135deg, rgba(233,30,140,0.2) 0%, rgba(244,63,94,0.2) 100%)",
                        border: "1px solid rgba(233,30,140,0.3)",
                        color: "rgba(255,255,255,0.9)",
                        fontWeight: 600,
                      }
                }
                data-testid={`message-${msg.role}-${i}`}
              >
                {msg.loading ? (
                  <div className="flex items-center gap-1 py-1">
                    {[0, 1, 2].map(j => (
                      <div
                        key={j}
                        className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{ background: "rgba(233,30,140,0.6)", animationDelay: `${j * 0.12}s` }}
                      />
                    ))}
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Suggestions */}
        {messages.length === 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 pt-4">
            <p className="text-[9px] font-black uppercase tracking-widest font-mono text-center" style={{ color: "rgba(255,255,255,0.25)" }}>
              Requêtes fréquentes
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center max-w-sm mx-auto">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => send(s)}
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all active:scale-95"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
                  data-testid={`suggestion-${i}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Zone de saisie */}
      <div
        className="px-4 py-3 sticky bottom-0"
        style={{ background: "rgba(13,10,14,0.95)", borderTop: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(20px)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="flex-1 flex items-center rounded-xl px-3.5 py-2.5 gap-2 transition-all"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <Sparkles className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(255,255,255,0.25)" }} />
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Posez votre question sur votre épiderme..."
              className="flex-1 bg-transparent text-xs outline-none font-medium"
              style={{ color: "rgba(255,255,255,0.8)" }}
              data-testid="input-chat"
              disabled={isLoading}
            />
          </div>
          <button
            onClick={() => send()}
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 active:scale-95 transition-all disabled:opacity-30"
            style={{
              background: "linear-gradient(135deg, #E91E8C, #f43f5e)",
              boxShadow: "0 0 20px rgba(233,30,140,0.3)",
            }}
            data-testid="button-send-chat"
          >
            <Send className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
        <div className="flex items-center justify-center gap-1 mt-2 text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.2)" }}>
          <ShieldAlert className="w-3 h-3" />
          <span>GlowScan AI fournit des indicateurs informatifs et ne remplace pas un avis médical.</span>
        </div>
      </div>
    </div>
  );
}
