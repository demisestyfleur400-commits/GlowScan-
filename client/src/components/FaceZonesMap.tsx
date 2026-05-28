import type { FaceZone } from "@shared/schema";

interface Props {
  zones: FaceZone[];
}

const ZONE_COORDS: Record<string, { cx: number; cy: number; rx: number; ry: number }> = {
  "front": { cx: 100, cy: 55, rx: 50, ry: 22 },
  "tempes": { cx: 100, cy: 75, rx: 70, ry: 12 },
  "joue gauche": { cx: 60, cy: 130, rx: 22, ry: 30 },
  "joue droite": { cx: 140, cy: 130, rx: 22, ry: 30 },
  "nez": { cx: 100, cy: 130, rx: 12, ry: 28 },
  "contour des lèvres": { cx: 100, cy: 185, rx: 25, ry: 10 },
  "menton": { cx: 100, cy: 215, rx: 28, ry: 18 },
  "cuir chevelu": { cx: 100, cy: 20, rx: 60, ry: 15 },
  "cou": { cx: 100, cy: 250, rx: 45, ry: 10 },
};

const STATUS_FILL: Record<FaceZone["status"], string> = {
  red: "rgba(233,30,140,0.3)",
  yellow: "rgba(245,158,11,0.28)",
  green: "rgba(16,185,129,0.2)",
};

const STATUS_STROKE: Record<FaceZone["status"], string> = {
  red: "#f9a8d4",
  yellow: "#fbbf24",
  green: "#6ee7b7",
};

const STATUS_STYLE: Record<FaceZone["status"], React.CSSProperties> = {
  red: { background: "rgba(233,30,140,0.08)", border: "1px solid rgba(233,30,140,0.2)", color: "#f9a8d4" },
  yellow: { background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#fbbf24" },
  green: { background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#6ee7b7" },
};

const STATUS_LABEL: Record<FaceZone["status"], string> = {
  red: "Urgence active",
  yellow: "À surveiller",
  green: "Équilibrée",
};

export default function FaceZonesMap({ zones }: Props) {
  if (!zones || zones.length === 0) return null;

  const counts = {
    red: zones.filter((z) => z.status === "red").length,
    yellow: zones.filter((z) => z.status === "yellow").length,
    green: zones.filter((z) => z.status === "green").length,
  };

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
      }}
      data-testid="face-zones-map"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-widest" style={{ color: "#f3f0ff" }}>
            Cartographie faciale IA
          </h3>
          <p className="text-[10px] font-medium mt-0.5" style={{ color: "rgba(200,185,255,0.65)" }}>
            Analyse thermique par intelligence artificielle
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-extrabold">
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg" style={{ background: "rgba(233,30,140,0.1)", border: "1px solid rgba(233,30,140,0.2)", color: "#f9a8d4" }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#f43f5e" }} /> {counts.red}
          </span>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#fbbf24" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#fbbf24" }} /> {counts.yellow}
          </span>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#6ee7b7" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#10b981" }} /> {counts.green}
          </span>
        </div>
      </div>

      {/* Grid: SVG + details */}
      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 items-center">
        {/* Face SVG */}
        <div className="flex justify-center p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <svg viewBox="0 0 200 260" className="w-40 h-auto" aria-label="Carte des zones du visage">
            {/* Silhouette */}
            <ellipse cx="100" cy="135" rx="72" ry="92" fill="rgba(255,255,255,0.05)" stroke="rgba(167,139,250,0.2)" strokeWidth="1.5" />
            {/* Cou */}
            <path d="M 75 220 Q 100 245 125 220 L 130 255 L 70 255 Z" fill="rgba(255,255,255,0.05)" stroke="rgba(167,139,250,0.2)" strokeWidth="1.5" />

            {/* Zone highlights */}
            {zones.map((zone, i) => {
              const key = zone.name.toLowerCase().trim();
              const coord = ZONE_COORDS[key];
              if (!coord) return null;
              return (
                <ellipse
                  key={i}
                  cx={coord.cx}
                  cy={coord.cy}
                  rx={coord.rx}
                  ry={coord.ry}
                  fill={STATUS_FILL[zone.status]}
                  stroke={STATUS_STROKE[zone.status]}
                  strokeWidth="1.5"
                  strokeDasharray={zone.status === "yellow" ? "3 2" : "none"}
                  opacity="0.9"
                />
              );
            })}

            {/* Eyes */}
            <circle cx="75" cy="105" r="2.5" fill="rgba(167,139,250,0.3)" />
            <circle cx="125" cy="105" r="2.5" fill="rgba(167,139,250,0.3)" />
            {/* Mouth */}
            <path d="M 90 195 Q 100 198 110 195" fill="none" stroke="rgba(167,139,250,0.3)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>

        {/* Zone list */}
        <div className="space-y-2">
          {zones.map((zone, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-2.5 rounded-xl"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              data-testid={`zone-${zone.status}-${i}`}
            >
              <span className="mt-1 w-2 h-2 rounded-full flex-shrink-0" style={{ background: STATUS_STROKE[zone.status] }} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-extrabold uppercase tracking-wide" style={{ color: "#f3f0ff" }}>{zone.name}</span>
                  <span
                    className="text-[9px] uppercase tracking-widest font-extrabold px-1.5 py-0.5 rounded-lg"
                    style={STATUS_STYLE[zone.status]}
                  >
                    {STATUS_LABEL[zone.status]}
                  </span>
                </div>
                {zone.issue && (
                  <p className="text-xs font-medium mt-1 leading-normal" style={{ color: "rgba(200,185,255,0.65)" }}>
                    {zone.issue}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
