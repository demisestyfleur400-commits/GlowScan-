import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, X, Loader2, Play, Camera, RefreshCw, ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
      }}
    >
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <AnimatePresence mode="wait">

        {/* CAMERA LIVE */}
        {mode === "camera" && (
          <motion.div
            key="camera"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ display: "flex", flexDirection: "column", gap: "20px" }}
          >
            {/* Viewfinder */}
            <div
              style={{
                position: "relative",
                overflow: "hidden",
                borderRadius: "40px",
                background: "#0d0a0e",
                border: "1px solid rgba(167,139,250,0.18)",
                aspectRatio: "3/4",
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: facingMode === "user" ? "scaleX(-1)" : "none",
                }}
              />

              {/* Scan corner markers */}
              {cameraReady && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    pointerEvents: "none",
                  }}
                >
                  {[
                    { top: "15%", left: "10%", borderTop: "2px solid rgba(167,139,250,0.7)", borderLeft: "2px solid rgba(167,139,250,0.7)", borderRadius: "16px 0 0 0" },
                    { top: "15%", right: "10%", borderTop: "2px solid rgba(167,139,250,0.7)", borderRight: "2px solid rgba(167,139,250,0.7)", borderRadius: "0 16px 0 0" },
                    { bottom: "15%", left: "10%", borderBottom: "2px solid rgba(167,139,250,0.7)", borderLeft: "2px solid rgba(167,139,250,0.7)", borderRadius: "0 0 0 16px" },
                    { bottom: "15%", right: "10%", borderBottom: "2px solid rgba(167,139,250,0.7)", borderRight: "2px solid rgba(167,139,250,0.7)", borderRadius: "0 0 16px 0" },
                  ].map((style, i) => (
                    <div
                      key={i}
                      style={{ position: "absolute", width: "40px", height: "40px", ...style }}
                    />
                  ))}
                  <motion.div
                    style={{
                      position: "absolute",
                      left: "10%",
                      right: "10%",
                      height: "2px",
                      background: "linear-gradient(90deg, transparent, #a78bfa, transparent)",
                    }}
                    animate={{ top: ["16%", "84%", "16%"] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  />
                </div>
              )}

              {/* Camera loading state */}
              {!cameraReady && !cameraError && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(13,10,14,0.75)",
                    backdropFilter: "blur(8px)",
                    gap: "8px",
                  }}
                >
                  <Loader2 style={{ width: "24px", height: "24px", color: "#a78bfa", animation: "spin 1s linear infinite" }} />
                  <p style={{ color: "rgba(200,185,255,0.65)", fontSize: "12px", fontWeight: 600 }}>Calibration de l'objectif…</p>
                </div>
              )}
            </div>

            {/* Camera control hub */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 24px",
                borderRadius: "9999px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {/* Gallery button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Ouvrir la galerie"
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "9999px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "rgba(200,185,255,0.65)",
                  cursor: "pointer",
                  transition: "transform 0.1s",
                }}
              >
                <ImageIcon style={{ width: "18px", height: "18px" }} />
              </button>

              {/* Capture button */}
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={capturePhoto}
                disabled={!cameraReady || isProcessing}
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "9999px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(124,58,237,0.12)",
                  border: "3px solid rgba(124,58,237,0.5)",
                  cursor: cameraReady && !isProcessing ? "pointer" : "not-allowed",
                  opacity: !cameraReady || isProcessing ? 0.4 : 1,
                  transition: "opacity 0.15s",
                }}
              >
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "9999px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
                  }}
                >
                  <Camera style={{ width: "20px", height: "20px", color: "#f3f0ff" }} />
                </div>
              </motion.button>

              {/* Flip camera button */}
              <button
                type="button"
                onClick={flipCamera}
                disabled={!cameraReady}
                title="Changer de caméra"
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "9999px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "rgba(200,185,255,0.65)",
                  cursor: cameraReady ? "pointer" : "not-allowed",
                  opacity: !cameraReady ? 0.3 : 1,
                  transition: "transform 0.1s, opacity 0.15s",
                }}
              >
                <RefreshCw style={{ width: "18px", height: "18px" }} />
              </button>
            </div>
          </motion.div>
        )}

        {/* GALLERY FALLBACK */}
        {mode === "gallery_fallback" && (
          <motion.div
            key="gallery"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {cameraError && (
              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: "16px",
                  textAlign: "center",
                  background: "rgba(245,158,11,0.1)",
                  border: "1px solid rgba(245,158,11,0.25)",
                }}
              >
                <p style={{ fontSize: "12px", fontWeight: 600, color: "#fbbf24", lineHeight: 1.5 }}>
                  {cameraError}
                </p>
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              data-testid="dropzone"
              style={{
                position: "relative",
                overflow: "hidden",
                borderRadius: "40px",
                border: "2px dashed rgba(167,139,250,0.3)",
                width: "100%",
                minHeight: "300px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "16px",
                background: "rgba(167,139,250,0.04)",
                cursor: "pointer",
                transition: "border-color 0.15s, background 0.15s",
              }}
            >
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(124,58,237,0.12)",
                  border: "1px solid rgba(124,58,237,0.25)",
                }}
              >
                <Upload style={{ width: "24px", height: "24px", color: "#a78bfa" }} />
              </div>
              <div style={{ textAlign: "center", padding: "0 24px" }}>
                <p style={{ fontSize: "14px", fontWeight: 700, color: "#f3f0ff" }}>Importer un cliché</p>
                <p style={{ fontSize: "12px", marginTop: "4px", fontWeight: 500, color: "rgba(255,255,255,0.35)" }}>
                  JPG, PNG, WEBP — max 10 Mo
                </p>
              </div>
            </button>
          </motion.div>
        )}

        {/* PREVIEW + ANALYZE */}
        {mode === "preview" && preview && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <div
              style={{
                position: "relative",
                overflow: "hidden",
                borderRadius: "40px",
                border: "1px solid rgba(167,139,250,0.18)",
                aspectRatio: "3/4",
              }}
            >
              <img src={preview} alt="Aperçu du visage" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <button
                onClick={retake}
                data-testid="button-retake"
                style={{
                  position: "absolute",
                  top: "16px",
                  right: "16px",
                  width: "40px",
                  height: "40px",
                  background: "rgba(13,10,14,0.6)",
                  backdropFilter: "blur(12px)",
                  color: "#f3f0ff",
                  borderRadius: "9999px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid rgba(255,255,255,0.15)",
                  cursor: "pointer",
                  transition: "transform 0.1s",
                }}
              >
                <X style={{ width: "18px", height: "18px" }} />
              </button>

              {/* Validated badge */}
              <div
                style={{
                  position: "absolute",
                  bottom: "16px",
                  left: "50%",
                  transform: "translateX(-50%)",
                }}
              >
                <span
                  style={{
                    backdropFilter: "blur(12px)",
                    color: "#f3f0ff",
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "6px 16px",
                    borderRadius: "9999px",
                    background: "rgba(124,58,237,0.75)",
                    border: "1px solid rgba(167,139,250,0.4)",
                    whiteSpace: "nowrap",
                  }}
                >
                  Cliché validé
                </span>
              </div>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={isProcessing}
              data-testid="button-upload"
              style={{
                width: "100%",
                height: "56px",
                borderRadius: "9999px",
                background: "#7c3aed",
                color: "#f3f0ff",
                fontWeight: 800,
                fontSize: "14px",
                border: "none",
                cursor: isProcessing ? "not-allowed" : "pointer",
                opacity: isProcessing ? 0.7 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "opacity 0.15s, transform 0.1s",
              }}
            >
              {isProcessing ? (
                <>
                  <Loader2 style={{ width: "18px", height: "18px", animation: "spin 1s linear infinite" }} />
                  Calcul cartographique...
                </>
              ) : (
                <>
                  <Play style={{ width: "16px", height: "16px", fill: "currentColor" }} />
                  Analyser mon visage
                </>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: "none" }}
        onChange={handleFileSelect}
        data-testid="input-file"
      />

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            fontSize: "12px",
            fontWeight: 600,
            textAlign: "center",
            color: "#f9a8d4",
            background: "rgba(233,30,140,0.08)",
            border: "1px solid rgba(233,30,140,0.2)",
            padding: "10px 16px",
            borderRadius: "12px",
          }}
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}
