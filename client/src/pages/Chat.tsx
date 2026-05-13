import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Sparkles, ArrowLeft, ScanFace, Crown, Lock } from "lucide-react";
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
    <div className="min-h-screen flex flex-col items-center justify-center px-6 pb-20" style={{ background: "linear-gradient(160deg, #f0fdf4 0%, #f5f3ff 100%)" }}>
      <div className="w-20 h-20 rounded-3xl bg-white shadow-lg flex items-center justify-center mb-6 text-4xl">{icon}</div>
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-pink-50 border border-pink-200 rounded-full px-4 py-1.5 mb-4">
          <Crown className="w-4 h-4 text-pink-500" />
          <span className="text-xs font-bold text-pink-700">Fonctionnalité Premium</span>
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-3" style={{ fontFamily: "'Outfit', sans-serif" }}>{feature}</h1>
        <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
          Débloque l'accès illimité à {feature.toLowerCase()}, les analyses sans limite et bien plus encore pour seulement <strong>500 FCFA/semaine</strong> ou <strong>2 000 FCFA/mois</strong>.
        </p>
      </div>
      <div className="w-full max-w-sm space-y-3 mb-8">
        {["Analyses de peau illimitées", "SkinBot IA — assistant peau 24h/24", "Scan Produit — vérifier tes cosmétiques", "Scan Nutriment — impact de l'alimentation", "Boutique — accès aux produits recommandés"].map(item => (
          <div key={item} className="flex items-center gap-3 bg-white rounded-2xl p-3.5 shadow-sm border border-gray-50">
            <div className="w-6 h-6 rounded-full bg-pink-50 flex items-center justify-center flex-shrink-0">
              <span className="text-pink-500 text-xs font-bold">✓</span>
            </div>
            <span className="text-sm font-medium text-gray-700">{item}</span>
          </div>
        ))}
      </div>
      <a href="/premium" className="w-full max-w-sm flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm text-white shadow-lg" style={{ background: "linear-gradient(135deg, #b8860b 0%, #d4a017 50%, #c9a84c 100%)", fontFamily: "'Outfit', sans-serif" }}>
        <Crown className="w-5 h-5" />
        Passer Premium — dès 500 FCFA/semaine
      </a>
      <a href="/" className="mt-4 text-sm text-gray-400 font-medium">← Retour à l'accueil</a>
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
        ? `Bonjour ! 👋 Je suis SkinBot, ton assistant peau personnalisé. J'ai analysé ton dernier scan (${lastScan.condition}, score ${lastScan.score}/100). Pose-moi n'importe quelle question sur ta peau, je suis là pour t'aider !`
        : "Bonjour ! 👋 Je suis SkinBot, ton assistant dermatologique IA. Pose-moi n'importe quelle question sur ta peau et je te réponds en français !",
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
        i === prev.length - 1 ? { ...m, content: "Désolé, une erreur s'est produite. Réessaie !", loading: false } : m
      ));
    } finally {
      setIsLoading(false);
    }
  }

  if (!user) {
    return <PremiumGatePage feature="SkinBot IA" icon="🤖" />;
  }

  return (
    <div className="flex flex-col h-screen bg-[#FFF8FB] max-w-lg mx-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <Link href="/">
          <button className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-extrabold text-gray-900">SkinBot IA</p>
          <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
            En ligne · Powered by GlowScan
          </p>
        </div>
        {lastScan && (
          <div className="ml-auto flex items-center gap-1.5 bg-pink-50 border border-pink-100 px-2.5 py-1 rounded-full">
            <ScanFace className="w-3.5 h-3.5 text-pink-600" />
            <span className="text-[10px] font-bold text-pink-700">{lastScan.score}/100</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-end gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              {/* Avatar */}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === "assistant" ? "bg-gradient-to-br from-violet-500 to-purple-600" : "bg-gradient-to-br from-pink-400 to-emerald-500"}`}>
                {msg.role === "assistant" ? <Bot className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-white" />}
              </div>

              {/* Bubble */}
              <div className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === "assistant"
                  ? "bg-white border border-gray-100 text-gray-800 shadow-sm rounded-bl-sm"
                  : "bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-br-sm"
              }`}
                data-testid={`message-${msg.role}-${i}`}
              >
                {msg.loading ? (
                  <div className="flex items-center gap-1.5 py-1">
                    {[0, 1, 2].map(j => (
                      <div key={j} className="w-2 h-2 rounded-full bg-violet-300 animate-bounce" style={{ animationDelay: `${j * 0.15}s` }} />
                    ))}
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Suggestions (only on first message) */}
        {messages.length === 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 pt-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Questions fréquentes</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => send(s)}
                  className="text-xs bg-white border border-gray-200 text-gray-700 font-medium px-3 py-1.5 rounded-full hover:border-violet-300 hover:text-violet-700 transition-colors shadow-sm"
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

      {/* Input */}
      <div className="bg-white border-t border-gray-100 px-4 py-3 sticky bottom-0">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 gap-2 focus-within:border-violet-300 focus-within:ring-2 focus-within:ring-violet-100 transition-all">
            <Sparkles className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Pose ta question sur ta peau..."
              className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
              data-testid="input-chat"
              disabled={isLoading}
            />
          </div>
          <button
            onClick={() => send()}
            disabled={!input.trim() || isLoading}
            className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-purple-200 disabled:opacity-40 active:scale-95 transition-all"
            data-testid="button-send-chat"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-gray-400 text-center mt-1.5">SkinBot ne remplace pas un dermatologue.</p>
      </div>
    </div>
  );
}
