import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, X, Loader2, Play, Camera, RefreshCw, ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { resizeBase64Image } from "@/lib/imageUtils";

interface FileUploadProps {
  onFileSelect: (base64: string) => void;
  isProcessing?: boolean;
}

type Mode = "camera" | "preview" | "gallery_fallback";

export function FileUpload({ onFileSelect, isProcessing }: FileUploadProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<Mode>("camera");
  const [preview, setPreview] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  };

  const startCamera = useCallback(async (facing: "user" | "environment" = "user") => {
    stopStream();
    setCameraError(null);
    setCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraReady(true);
        };
      }
    } catch (err: any) {
      const msg =
        err?.name === "NotAllowedError"
          ? "Accès à la caméra refusé. Autorise la caméra dans ton navigateur."
          : err?.name === "NotFoundError"
          ? "Aucune caméra trouvée sur cet appareil."
          : "Impossible d'ouvrir la caméra. Utilise la galerie.";
      setCameraError(msg);
      setMode("gallery_fallback");
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => stopStream();
  }, [facingMode, startCamera]);

  const flipCamera = async () => {
    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || !cameraReady) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    stopStream();
    const optimized = await resizeBase64Image(dataUrl, 1024, 0.85);
    setPreview(optimized);
    setMode("preview");
  };

  const retake = () => {
    setPreview(null);
    setMode("camera");
    startCamera(facingMode);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (file.size > 10 * 1024 * 1024) {
      setError("La taille doit être inférieure à 10 Mo");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const result = reader.result as string;
      stopStream();
      const optimized = await resizeBase64Image(result, 1024, 0.85);
      setPreview(optimized);
      setMode("preview");
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = () => {
    if (preview) onFileSelect(preview);
  };

  return (
    <div className="w-full space-y-4">
      <canvas ref={canvasRef} className="hidden" />

      <AnimatePresence mode="wait">

        {/* ── CAMÉRA LIVE ── */}
        {mode === "camera" && (
          <motion.div
            key="camera"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            {/* Viseur Caméra */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-black shadow-inner border border-gray-100" style={{ aspectRatio: "3/4" }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
              />

              {/* Animation des repères de scan */}
              {cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {[
                    "top-[15%] left-[10%] border-t-2 border-l-2 rounded-tl-2xl",
                    "top-[15%] right-[10%] border-t-2 border-r-2 rounded-tr-2xl",
                    "bottom-[15%] left-[10%] border-b-2 border-l-2 rounded-bl-2xl",
                    "bottom-[15%] right-[10%] border-b-2 border-r-2 rounded-br-2xl",
                  ].map((cls, i) => (
                    <div key={i} className={`absolute w-10 h-10 border-white/80 ${cls}`} />
                  ))}
                  <motion.div
                    className="absolute left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-transparent via-pink-400 to-transparent"
                    animate={{ top: ["16%", "84%", "16%"] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  />
                </div>
              )}

              {/* Loader de démarrage */}
              {!cameraReady && !cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
                  <Loader2 className="w-6 h-6 text-pink-500 animate-spin mb-2" />
                  <p className="text-white/90 text-xs font-black uppercase tracking-wider">Calibration de l'objectif…</p>
                </div>
              )}
            </div>

            {/* Hub de contrôle */}
            <div
              className="flex items-center justify-between px-6 py-2 rounded-3xl"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              {/* Galerie */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-11 h-11 rounded-full flex items-center justify-center active:scale-90 transition-all"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
                title="Ouvrir la galerie"
              >
                <ImageIcon className="w-4 h-4" />
              </button>

              {/* Déclencheur Photo Central */}
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={capturePhoto}
                disabled={!cameraReady || isProcessing}
                className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "rgba(255,255,255,0.1)", border: "3px solid rgba(233,30,140,0.5)", boxShadow: "0 0 20px rgba(233,30,140,0.2)" }}
              >
                <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #E91E8C, #f43f5e)" }}>
                  <Camera className="w-5 h-5 text-white" />
                </div>
              </motion.button>

              {/* Pivot Caméra (Avant / Arrière) */}
              <button
                type="button"
                onClick={flipCamera}
                disabled={!cameraReady}
                className="w-11 h-11 rounded-full flex items-center justify-center active:scale-90 transition-all disabled:opacity-30"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
                title="Changer de caméra"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── FALLBACK GALERIE ── */}
        {mode === "gallery_fallback" && (
          <motion.div
            key="gallery"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {cameraError && (
              <div
                className="p-3.5 rounded-2xl text-center"
                style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}
              >
                <p className="text-xs font-bold leading-normal" style={{ color: "rgba(251,191,36,0.9)" }}>💡 {cameraError}</p>
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              data-testid="dropzone"
              className="relative overflow-hidden rounded-[2.5rem] border-2 border-dashed w-full min-h-[300px] flex flex-col items-center justify-center gap-4 transition-all"
              style={{ borderColor: "rgba(233,30,140,0.25)", background: "rgba(233,30,140,0.04)" }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(233,30,140,0.12)", border: "1px solid rgba(233,30,140,0.25)" }}
              >
                <Upload className="w-6 h-6" style={{ color: "#E91E8C" }} />
              </div>
              <div className="text-center px-6">
                <p className="text-sm font-black text-white uppercase tracking-wide">Importer un cliché</p>
                <p className="text-xs mt-1 font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>Prend en charge JPG, PNG, WEBP</p>
              </div>
            </button>
          </motion.div>
        )}

        {/* ── APERÇU + ANALYSER ── */}
        {mode === "preview" && preview && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="relative overflow-hidden rounded-[2.5rem] border border-gray-100" style={{ aspectRatio: "3/4" }}>
              <img src={preview} alt="Aperçu du visage" className="w-full h-full object-cover" />
              <button
                onClick={retake}
                data-testid="button-retake"
                className="absolute top-4 right-4 w-10 h-10 bg-black/40 backdrop-blur-md text-white rounded-full flex items-center justify-center border border-white/10 active:scale-90 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                <span
                  className="backdrop-blur text-white text-[10px] font-black uppercase tracking-wider px-4 py-2 rounded-full"
                  style={{ background: "rgba(233,30,140,0.85)", boxShadow: "0 0 20px rgba(233,30,140,0.4)" }}
                >
                  ✓ Cliché Validé
                </span>
              </div>
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={isProcessing}
              data-testid="button-upload"
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 text-white font-black text-xs uppercase tracking-wider shadow-xl shadow-pink-600/10 active:scale-[0.98] transition-transform"
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Calcul cartographique...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Analyser mon visage
                </span>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
        data-testid="input-file"
      />

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-destructive text-xs font-black text-center uppercase tracking-wide"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}
