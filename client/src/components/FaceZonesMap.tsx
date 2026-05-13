import type { FaceZone } from "@shared/schema";

interface Props {
  zones: FaceZone[];
}

// Coordonnées normalisées des zones sur le visage SVG (viewBox 200×260)
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
  red: "rgba(239, 68, 68, 0.45)",
  yellow: "rgba(245, 158, 11, 0.40)",
  green: "rgba(34, 197, 94, 0.30)",
};

const STATUS_STROKE: Record<FaceZone["status"], string> = {
  red: "#ef4444",
  yellow: "#f59e0b",
  green: "#22c55e",
};

const STATUS_LABEL: Record<FaceZone["status"], string> = {
  red: "Problème actif",
  yellow: "À surveiller",
  green: "Zone saine",
};

export default function FaceZonesMap({ zones }: Props) {
  if (!zones || zones.length === 0) return null;

  const counts = {
    red: zones.filter((z) => z.status === "red").length,
    yellow: zones.filter((z) => z.status === "yellow").length,
    green: zones.filter((z) => z.status === "green").length,
  };

  return (
    <div className="rounded-2xl bg-white border border-gray-200 p-4 shadow-sm" data-testid="face-zones-map">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900 font-display">
          Carte de ta peau
        </h3>
        <div className="flex items-center gap-3 text-[11px] font-medium text-gray-600">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> {counts.red}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-500" /> {counts.yellow}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> {counts.green}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 items-start">
        {/* SVG du visage */}
        <div className="flex justify-center">
          <svg
            viewBox="0 0 200 260"
            className="w-44 h-auto"
            aria-label="Carte des zones du visage"
          >
            {/* Silhouette du visage (style minimaliste) */}
            <ellipse
              cx="100"
              cy="135"
              rx="72"
              ry="92"
              fill="#fafafa"
              stroke="#e5e7eb"
              strokeWidth="1.5"
            />
            {/* Cou */}
            <path
              d="M 75 220 Q 100 245 125 220 L 130 255 L 70 255 Z"
              fill="#fafafa"
              stroke="#e5e7eb"
              strokeWidth="1.5"
            />

            {/* Zones colorées dynamiques */}
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
                  strokeWidth="1"
                  opacity="0.85"
                />
              );
            })}

            {/* Yeux (repères discrets) */}
            <circle cx="75" cy="105" r="3" fill="#9ca3af" />
            <circle cx="125" cy="105" r="3" fill="#9ca3af" />
            {/* Bouche (repère discret) */}
            <path
              d="M 88 195 Q 100 200 112 195"
              fill="none"
              stroke="#9ca3af"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Liste des zones */}
        <div className="space-y-1.5">
          {zones.map((zone, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-sm"
              data-testid={`zone-${zone.status}-${i}`}
            >
              <span
                className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: STATUS_STROKE[zone.status] }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="font-semibold text-gray-900">{zone.name}</span>
                  <span
                    className="text-[10px] uppercase tracking-wider font-medium"
                    style={{ color: STATUS_STROKE[zone.status] }}
                  >
                    {STATUS_LABEL[zone.status]}
                  </span>
                </div>
                {zone.issue && (
                  <p className="text-xs text-gray-600 leading-snug font-medical">
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
