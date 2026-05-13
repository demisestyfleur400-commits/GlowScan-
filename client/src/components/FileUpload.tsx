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
  }, []);

  const flipCamera = async () => {
    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
    await startCamera(next);
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
    // Optimisation réseau : redimensionne à 1024px max avant tout (≈10× plus léger)
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
      // Optimisation réseau : redimensionne à 1024px max (jusqu'à 20× plus léger sur 3G)
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
            className="space-y-3"
          >
            {/* Viewfinder */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-black" style={{ aspectRatio: "3/4" }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
              />

              {/* Overlay scan brackets */}
              {cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {[
                    "top-[15%] left-[10%] border-t-2 border-l-2 rounded-tl-2xl",
                    "top-[15%] right-[10%] border-t-2 border-r-2 rounded-tr-2xl",
                    "bottom-[15%] left-[10%] border-b-2 border-l-2 rounded-bl-2xl",
                    "bottom-[15%] right-[10%] border-b-2 border-r-2 rounded-br-2xl",
                  ].map((cls, i) => (
                    <div key={i} className={`absolute w-10 h-10 border-white/70 ${cls}`} />
                  ))}
                  <motion.div
                    className="absolute left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-transparent via-pink-400 to-transparent"
                    animate={{ top: ["16%", "84%", "16%"] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                    style={{ position: "absolute" }}
                  />
                </div>
              )}

              {/* Chargement caméra */}
              {!cameraReady && !cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
                  <Loader2 className="w-8 h-8 text-white animate-spin mb-2" />
                  <p className="text-white text-xs font-medium">Ouverture de la caméra…</p>
                </div>
              )}

              {/* Bouton flip (avant/arrière) */}
              {cameraReady && (
                <button
                  onClick={flipCamera}
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center active:scale-90 transition-all"
                  data-testid="button-flip-camera"
                >
                  <RefreshCw className="w-5 h-5 text-white" />
                </button>
              )}

              {/* Bouton galerie */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center active:scale-90 transition-all"
                data-testid="button-open-gallery"
              >
                <ImageIcon className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Bouton capture */}
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={capturePhoto}
              disabled={!cameraReady || isProcessing}
              data-testid="button-capture-photo"
              className="w-full flex items-center justify-center gap-3 py-5 rounded-[2rem] bg-gradient-to-r from-pink-500 to-emerald-500 text-white font-extrabold text-base shadow-xl shadow-pink-300/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Camera className="w-6 h-6" />
              Prendre la photo
            </motion.button>

            <p className="text-center text-gray-400 text-xs">
              ou{" "}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-pink-600 font-bold underline-offset-2 underline"
              >
                choisir depuis la galerie
              </button>
            </p>
          </motion.div>
        )}

        {/* ── FALLBACK GALERIE (si caméra refusée) ── */}
        {mode === "gallery_fallback" && (
          <motion.div
            key="gallery"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {cameraError && (
              <div className="p-4 rounded-2xl bg-pink-50 border border-pink-200 text-center">
                <p className="text-pink-700 text-sm font-bold mb-1">📷 {cameraError}</p>
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              data-testid="dropzone"
              className="relative overflow-hidden rounded-[2.5rem] border-2 border-dashed border-gray-200 hover:border-pink-400 hover:bg-gray-50 transition-all w-full min-h-[280px] flex flex-col items-center justify-center gap-4"
            >
              <div className="w-20 h-20 rounded-3xl bg-pink-50 flex items-center justify-center">
                <Upload className="w-10 h-10 text-pink-500" />
              </div>
              <div className="text-center px-6">
                <p className="text-xl font-black text-gray-800">Choisir une photo</p>
                <p className="text-gray-400 text-sm mt-1">JPG, PNG jusqu'à 10 Mo</p>
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
            className="space-y-3"
          >
            <div className="relative overflow-hidden rounded-[2.5rem]" style={{ aspectRatio: "3/4" }}>
              <img src={preview} alt="Aperçu" className="w-full h-full object-cover" />
              <button
                onClick={retake}
                data-testid="button-retake"
                className="absolute top-4 right-4 p-3 bg-black/50 backdrop-blur text-white rounded-full hover:bg-black/70 transition-all active:scale-90"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                <span className="bg-black/50 backdrop-blur text-white text-xs font-bold px-4 py-2 rounded-full">
                  ✓ Photo prête
                </span>
              </div>
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={isProcessing}
              data-testid="button-upload"
              className="w-full h-16 rounded-[2rem] bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg shadow-xl shadow-purple-200 hover:shadow-2xl transition-all active:scale-[0.98]"
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Analyse en cours…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Play className="w-6 h-6 fill-current" />
                  Lancer l'analyse
                </span>
              )}
            </Button>

            <button
              onClick={retake}
              className="w-full py-3 text-sm text-gray-400 hover:text-gray-600 font-medium transition-colors"
              data-testid="button-retake-link"
            >
              🔄 Reprendre la photo
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input fichier caché */}
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
          className="text-destructive text-sm font-bold text-center"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}
