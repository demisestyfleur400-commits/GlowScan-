import type { FaceZone } from "@shared/schema";
import { ShieldAlert, Activity, CheckCircle } from "lucide-react";

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
  red: "rgba(239, 68, 68, 0.35)",
  yellow: "rgba(245, 158, 11, 0.30)",
  green: "rgba(34, 197, 94, 0.20)",
};

const STATUS_STROKE: Record<FaceZone["status"], string> = {
  red: "#dc2626",   // Rouge un peu plus soutenu pour le contraste
  yellow: "#d97706", // Ambre plus lisible sur le web
  green: "#16a34a",  // Vert plus pro
};

const STATUS_LABEL: Record<FaceZone["status"], string> = {
  red: "Urgence active",
  yellow: "À surveiller",
  green: "Zone équilibrée",
};

export default function FaceZonesMap({ zones }: Props) {
  if (!zones || zones.length === 0) return null;

  const counts = {
    red: zones.filter((z) => z.status === "red").length,
    yellow: zones.filter((z) => z.status === "yellow").length,
    green: zones.filter((z) => z.status === "green").length,
  };

  return (
    <div className="rounded-3xl bg-white border border-gray-100 p-5 shadow-xl shadow-gray-100/40" data-testid="face-zones-map">
      {/* Top Header de la carte */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-50">
        <div>
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
            Cartographie Faciale AI
          </h3>
          <p className="text-[10px] text-gray-400 font-medium">Analyse thermique par intelligence artificielle</p>
        </div>
        <div className="flex items-center gap-2.5 text-[10px] font-black tracking-wider">
          <span className="flex items-center gap-1 bg-red-50 text-red-700 px-2 py-0.5 rounded-md border border-red-100">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" /> {counts.red}
          </span>
          <span className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md border border-amber-100">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> {counts.yellow}
          </span>
          <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-100">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {counts.green}
          </span>
        </div>
      </div>

      {/* Grid Visage + Détails */}
      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 items-center">
        {/* SVG du visage ultra-stylisé et contrasté */}
        <div className="flex justify-center bg-slate-50/60 p-4 rounded-2xl border border-gray-100/80">
          <svg
            viewBox="0 0 200 260"
            className="w-40 h-auto filter drop-shadow-sm"
            aria-label="Carte des zones du visage"
          >
            {/* Silhouette principale */}
            <ellipse
              cx="100"
              cy="135"
              rx="72"
              ry="92"
              fill="#ffffff"
              stroke="#e2e8f0"
              strokeWidth="2"
            />
            {/* Cou */}
            <path
              d="M 75 220 Q 100 245 125 220 L 130 255 L 70 255 Z"
              fill="#ffffff"
              stroke="#e2e8f0"
              strokeWidth="2"
            />

            {/* Calques et zones dynamiques */}
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
                  strokeDasharray={zone.status === "yellow" ? "3 2" : "none"} // Effet pointillés stylé pour les zones à surveiller
                  opacity="0.9"
                />
              );
            })}

            {/* Yeux (Indicateurs discrets de position) */}
            <circle cx="75" cy="105" r="2.5" fill="#cbd5e1" />
            <circle cx="125" cy="105" r="2.5" fill="#cbd5e1" />
            {/* Bouche */}
            <path
              d="M 90 195 Q 100 198 110 195"
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Liste descriptive des imperfections détectées */}
        <div className="space-y-3">
          {zones.map((zone, i) => (
            <div
              key={i}
              className="flex items-start gap-3 bg-white p-2.5 rounded-xl border border-gray-50/80 shadow-sm hover:border-gray-100 transition-colors"
              data-testid={`zone-${zone.status}-${i}`}
            >
              {/* Petite puce colorée adaptative en fonction du statut */}
              <span
                className="mt-1 w-2 h-2 rounded-full flex-shrink-0 shadow-sm"
                style={{ backgroundColor: STATUS_STROKE[zone.status] }}
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-gray-950 uppercase tracking-wide">{zone.name}</span>
                  <span
                    className="text-[9px] uppercase tracking-widest font-extrabold px-1.5 py-0.5 rounded-md"
                    style={{ 
                      color: STATUS_STROKE[zone.status],
                      backgroundColor: zone.status === 'red' ? '#fef2f2' : zone.status === 'yellow' ? '#fffbeb' : '#f0fdf4'
                    }}
                  >
                    {STATUS_LABEL[zone.status]}
                  </span>
                </div>
                {zone.issue && (
                  <p className="text-xs font-medium text-gray-600 mt-1 leading-normal">
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
