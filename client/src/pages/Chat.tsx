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

function PremiumGatePage({ feature, icon }: { feature: string; icon: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6 pb-20 selection:bg-slate-950 selection:text-white">
      <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mb-6 text-2xl text-slate-950">
        <Lock className="w-6 h-6 text-slate-950" />
      </div>
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-1.5 bg-slate-950 border border-slate-900 rounded-lg px-3 py-1 mb-4 shadow-sm">
          <Crown className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[10px] font-black text-white uppercase tracking-wider font-mono">Module Premium</span>
        </div>
        <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">{feature}</h1>
        <p className="text-xs text-slate-500 leading-relaxed max-w-xs font-medium">
          Débloquez l'accès illimité à l'assistant {feature}, aux analyses cellulaires continues et aux protocoles avancés pour <strong>500 FCFA/semaine</strong> ou <strong>2 000 FCFA/mois</strong>.
        </p>
      </div>
      <div className="w-full max-w-xs space-y-2 mb-8 text-left">
        {[
          "Analyses de peau illimitées",
          "GlowScan AI — diagnostic continu 24h/24",
          "Scan de formulation cosmétique",
          "Analyse de l'impact nutritionnel",
          "Accès intégral aux prescriptions cliniques"
        ].map(item => (
          <div key={item} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-slate-200 shadow-xs">
            <div className="w-5 h-5 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0">
              <span className="text-emerald-500 text-xs font-black">✓</span>
            </div>
            <span className="text-xs font-semibold text-slate-700">{item}</span>
          </div>
        ))}
      </div>
      <a href="/premium" className="w-full max-w-xs flex items-center justify-center gap-2 py-3.5 rounded-xl bg-slate-950 text-white font-black text-xs uppercase tracking-widest shadow-md active:scale-95 transition-all">
        <Crown className="w-4 h-4 text-emerald-400" />
        Activer la licence pro
      </a>
      <a href="/" className="mt-5 text-xs text-slate-400 font-bold uppercase tracking-wider hover:underline">← Accueil</a>
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
    <div className="flex flex-col h-screen bg-slate-50 max-w-lg mx-auto border-x border-slate-200 selection:bg-slate-950 selection:text-white">
      {/* Header Clinique */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-xs">
        <Link href="/">
          <button className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-900 flex items-center justify-center shadow-md">
          <Terminal className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="text-left">
          <p className="text-xs font-black text-slate-950 uppercase tracking-wide">GlowScan AI</p>
          <p className="text-[10px] text-emerald-600 font-bold font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
            Core Engine active
          </p>
        </div>
        {lastScan && (
          <div className="ml-auto flex items-center gap-1 bg-slate-950 border border-slate-900 px-2.5 py-1 rounded-lg shadow-sm">
            <ScanFace className="w-3.5 h-3.5 text-emerald-400" />
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
              <div className={`w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                msg.role === "assistant" 
                  ? "bg-slate-950 border-slate-900 text-emerald-400" 
                  : "bg-white border-slate-200 text-slate-900 shadow-xs"
              }`}>
                {msg.role === "assistant" ? <Terminal className="w-3 h-3" /> : <User className="w-3 h-3" />}
              </div>

              {/* Bubble */}
              <div className={`max-w-[80%] px-3.5 py-2.5 rounded-xl text-xs leading-relaxed text-left ${
                msg.role === "assistant"
                  ? "bg-white border border-slate-200 text-slate-800 shadow-xs font-medium"
                  : "bg-slate-950 border border-slate-900 text-slate-100 font-semibold"
              }`}
                data-testid={`message-${msg.role}-${i}`}
              >
                {msg.loading ? (
                  <div className="flex items-center gap-1 py-1">
                    {[0, 1, 2].map(j => (
                      <div key={j} className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: `${j * 0.12}s` }} />
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
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono text-center">Requêtes fréquentes</p>
            <div className="flex flex-wrap gap-1.5 justify-center max-w-sm mx-auto">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => send(s)}
                  className="text-[11px] bg-white border border-slate-200 text-slate-700 font-semibold px-3 py-1.5 rounded-lg hover:border-slate-400 hover:text-slate-950 transition-colors shadow-xs"
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

      {/* Zone de saisie Console */}
      <div className="bg-white border-t border-slate-200 px-4 py-3 sticky bottom-0">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 gap-2 focus-within:border-slate-400 transition-all">
            <Sparkles className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Posez votre question sur votre épiderme..."
              className="flex-1 bg-transparent text-xs text-slate-800 placeholder-slate-400 outline-none font-medium"
              data-testid="input-chat"
              disabled={isLoading}
            />
          </div>
          <button
            onClick={() => send()}
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-xl bg-slate-950 text-white flex items-center justify-center border border-slate-900 shadow-md disabled:opacity-30 active:scale-95 transition-all flex-shrink-0"
            data-testid="button-send-chat"
          >
            <Send className="w-3.5 h-3.5 text-emerald-400" />
          </button>
        </div>
        <div className="flex items-center justify-center gap-1 mt-2 text-[10px] text-slate-400 font-semibold">
          <ShieldAlert className="w-3 h-3 text-slate-400" />
          <span>GlowScan AI fournit des indicateurs informatifs et ne remplace pas un avis médical.</span>
        </div>
      </div>
    </div>
  );
}
