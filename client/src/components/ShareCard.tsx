import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, MessageCircle } from "lucide-react";

interface ShareCardProps {
  score: number;
  condition: string;
  area: string;
  userName?: string;
  appUrl?: string;
  onClose: () => void;
}

const AREA_LABELS: Record<string, string> = {
  face: "Visage",
  body: "Corps",
  hair: "Cheveux",
};

function getScoreColor(score: number): string {
  if (score >= 70) return "#22c55e";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

function getScoreLabel(score: number): string {
  if (score >= 75) return "Excellente santé";
  if (score >= 60) return "Bonne santé";
  if (score >= 45) return "À améliorer";
  return "Soin urgent";
}

function drawCard(
  canvas: HTMLCanvasElement,
  score: number,
  condition: string,
  area: string,
  userName: string,
  appUrl: string
) {
  const W = 540;
  const H = 960;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#0a0a0a");
  grad.addColorStop(0.5, "#0d1a0d");
  grad.addColorStop(1, "#0a0a0a");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Green glow top
  const glowTop = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, 300);
  glowTop.addColorStop(0, "rgba(34,197,94,0.25)");
  glowTop.addColorStop(1, "transparent");
  ctx.fillStyle = glowTop;
  ctx.fillRect(0, 0, W, 300);

  // Green glow bottom
  const glowBot = ctx.createRadialGradient(W / 2, H, 0, W / 2, H, 300);
  glowBot.addColorStop(0, "rgba(34,197,94,0.15)");
  glowBot.addColorStop(1, "transparent");
  ctx.fillStyle = glowBot;
  ctx.fillRect(0, H - 300, W, 300);

  // Top subtle line
  ctx.strokeStyle = "rgba(34,197,94,0.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, 0);
  ctx.lineTo(40, H);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(W - 40, 0);
  ctx.lineTo(W - 40, H);
  ctx.stroke();

  // GLOW SCAN logo at top
  ctx.fillStyle = "#22c55e";
  ctx.font = "bold 38px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("GLOW", W / 2, 90);
  ctx.fillStyle = "#ffffff";
  ctx.fillText("SCAN", W / 2, 132);

  // Separator line
  ctx.strokeStyle = "rgba(34,197,94,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 60, 150);
  ctx.lineTo(W / 2 + 60, 150);
  ctx.stroke();

  // "MON GLOW SCORE" label
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "bold 13px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.letterSpacing = "0.2em";
  ctx.fillText("MON GLOW SCORE", W / 2, 178);

  // Score circle
  const cx = W / 2;
  const cy = 360;
  const radius = 130;
  const scoreColor = getScoreColor(score);

  // Outer ring
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 8, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Background arc
  ctx.beginPath();
  ctx.arc(cx, cy, radius, -Math.PI / 2, Math.PI * 2 - Math.PI / 2);
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 14;
  ctx.lineCap = "round";
  ctx.stroke();

  // Score arc
  const scoreAngle = (score / 100) * Math.PI * 2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, -Math.PI / 2, scoreAngle - Math.PI / 2);
  ctx.strokeStyle = scoreColor;
  ctx.lineWidth = 14;
  ctx.lineCap = "round";
  ctx.stroke();

  // Score dot glow
  const dotX = cx + radius * Math.cos(scoreAngle - Math.PI / 2);
  const dotY = cy + radius * Math.sin(scoreAngle - Math.PI / 2);
  const dotGlow = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, 18);
  dotGlow.addColorStop(0, scoreColor);
  dotGlow.addColorStop(1, "transparent");
  ctx.fillStyle = dotGlow;
  ctx.beginPath();
  ctx.arc(dotX, dotY, 18, 0, Math.PI * 2);
  ctx.fill();

  // Score number
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 88px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(String(score), cx, cy + 28);

  // /100
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "bold 22px Arial, sans-serif";
  ctx.fillText("/100", cx, cy + 60);

  // Score label badge
  const labelText = getScoreLabel(score);
  ctx.font = "bold 14px Arial, sans-serif";
  const labelW = ctx.measureText(labelText).width + 32;
  const labelX = cx - labelW / 2;
  ctx.fillStyle = scoreColor + "33";
  ctx.beginPath();
  ctx.roundRect(labelX, cy + 78, labelW, 30, 15);
  ctx.fill();
  ctx.strokeStyle = scoreColor + "88";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = scoreColor;
  ctx.font = "bold 13px Arial, sans-serif";
  ctx.fillText(labelText, cx, cy + 98);

  // Area badge
  const areaLabel = AREA_LABELS[area] || area;
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  const areaW = 90;
  ctx.beginPath();
  ctx.roundRect(cx - areaW / 2, cy + 118, areaW, 24, 12);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "13px Arial, sans-serif";
  ctx.fillText("📍 " + areaLabel, cx, cy + 135);

  // Divider
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(80, 570);
  ctx.lineTo(W - 80, 570);
  ctx.stroke();

  // Condition label
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "11px Arial, sans-serif";
  ctx.fillText("DIAGNOSTIC", cx, 600);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 18px Arial, sans-serif";
  const condShort = condition.length > 32 ? condition.substring(0, 30) + "…" : condition;
  ctx.fillText(condShort, cx, 628);

  // Divider
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(80, 648);
  ctx.lineTo(W - 80, 648);
  ctx.stroke();

  // Challenge text
  ctx.fillStyle = "#22c55e";
  ctx.font = "bold 20px Arial, sans-serif";
  ctx.fillText("Compare avec moi 👇", cx, 690);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "14px Arial, sans-serif";
  ctx.fillText("Fais ton analyse gratuite sur", cx, 718);

  // URL box
  ctx.fillStyle = "rgba(34,197,94,0.12)";
  ctx.beginPath();
  ctx.roundRect(cx - 130, 730, 260, 36, 18);
  ctx.fill();
  ctx.strokeStyle = "rgba(34,197,94,0.4)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#22c55e";
  ctx.font = "bold 15px Arial, sans-serif";
  const shortUrl = appUrl.replace(/^https?:\/\//, "");
  ctx.fillText(shortUrl, cx, 754);

  // User name
  if (userName && userName !== "Toi") {
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.font = "12px Arial, sans-serif";
    ctx.fillText("Analyse de " + userName, cx, 800);
  }

  // Corner dots decoration
  const dotPositions = [
    [55, 55], [W - 55, 55], [55, H - 55], [W - 55, H - 55],
  ];
  dotPositions.forEach(([x, y]) => {
    ctx.fillStyle = "rgba(34,197,94,0.5)";
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
}

export function ShareCard({ score, condition, area, userName = "Toi", appUrl, onClose }: ShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const url = appUrl || window.location.origin;

  useEffect(() => {
    if (canvasRef.current) {
      drawCard(canvasRef.current, score, condition, area, userName, url);
    }
  }, [score, condition, area, userName, url]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `glow-scan-${score}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `🌟 Mon Glow Score est de ${score}/100 !\nDiagnostic : ${condition}\nFais ton analyse gratuite 👉 ${url}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm px-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: "spring", damping: 20 }}
          className="relative flex flex-col items-center gap-4 max-w-xs w-full"
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute -top-2 -right-2 z-10 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white border border-white/20"
            data-testid="button-close-sharecard"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Canvas card */}
          <canvas
            ref={canvasRef}
            className="rounded-2xl shadow-2xl w-full"
            style={{ maxHeight: "55vh", objectFit: "contain" }}
          />

          {/* Hint */}
          <p className="text-white/60 text-xs text-center">
            📸 Fais une capture d'écran ou télécharge ta carte
          </p>

          {/* Action buttons */}
          <div className="flex gap-3 w-full">
            <button
              onClick={handleDownload}
              data-testid="button-download-sharecard"
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-sm font-bold"
            >
              <Download className="w-4 h-4" />
              Télécharger
            </button>
            <button
              onClick={handleWhatsApp}
              data-testid="button-whatsapp-sharecard"
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#25D366] rounded-xl text-white text-sm font-bold"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
