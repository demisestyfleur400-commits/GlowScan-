import { useState } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import type { UppyFile, UploadResult } from "@uppy/core";
import DashboardModal from "@uppy/react/dashboard-modal";
import AwsS3 from "@uppy/aws-s3";
import { Button } from "@/components/ui/button";

// Importations obligatoires d'Uppy
import "@uppy/core/css/style.min.css";
import "@uppy/dashboard/css/style.min.css";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: (
    file: UppyFile<Record<string, unknown>, Record<string, unknown>>
  ) => Promise<{
    method: "PUT";
    url: string;
    headers?: Record<string, string>;
  }>;
  onComplete?: (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>
  ) => void;
  buttonClassName?: string;
  children: ReactNode;
}

export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10 Mo par défaut
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  
  // Instance Uppy mémorisée dans le state pour éviter les réinitialisations au re-render
  const [uppy] = useState(() =>
    new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
        allowedFileTypes: ["image/jpeg", "image/png", "image/webp"], // Sécurité : On restreint aux images skincare
      },
      autoProceed: false,
    })
      .use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: onGetUploadParameters,
      })
      .on("complete", (result) => {
        onComplete?.(result);
        // Fermeture automatique et fluide après 800ms pour laisser l'utilisateur voir le succès "vert" d'Uppy
        setTimeout(() => setShowModal(false), 800);
      })
  );

  return (
    <div className="w-full inline-block">
      {/* Bouton de déclenchement stylisé à l'image du design GlowScan */}
      <Button 
        type="button"
        onClick={() => setShowModal(true)} 
        className={`w-full h-14 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 text-white font-black text-xs uppercase tracking-wider shadow-xl shadow-pink-600/10 active:scale-[0.98] transition-all hover:opacity-95 ${buttonClassName}`}
      >
        {children}
      </Button>

      {/* Surcharges CSS injectées localement pour transformer l'identité visuelle d'Uppy */}
      <style>{`
        .uppy-DashboardModal .uppy-Dashboard-inner {
          border-radius: 1.5rem !important;
          background-color: #f8fafc !important; /* slate-50 */
          font-family: inherit !important;
          border: 1px solid #f1f5f9 !important;
        }
        .uppy-DashboardModal .uppy-Dashboard-browse {
          color: #db2777 !important; /* pink-600 */
          font-weight: 800 !important;
        }
        .uppy-Dashboard-bgIcon {
          color: #fbcfe8 !important; /* pink-200 */
        }
        .uppy-DashboardTabs-title, .uppy-Dashboard-Item-name {
          font-size: 11px !important;
          font-weight: 800 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          color: #0f172a !important; /* slate-900 */
        }
        .uppy-StatusBar-actionBtn--upload {
          background-color: #db2777 !important; /* pink-600 */
          background-image: linear-gradient(to right, #db2777, #9333ea) !important; /* Gradient GlowScan */
          border-radius: 0.75rem !important;
          font-size: 10px !important;
          font-weight: 900 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
        }
      `}</style>

      <DashboardModal
        uppy={uppy}
        open={showModal}
        onRequestClose={() => setShowModal(false)}
        proudlyDisplayPoweredByUppy={false}
        closeModalOnClickOutside={true}
        animateOpenClose={true}
        locale={{
          strings: {
            dropPasteFiles: "Dépose tes fichiers ici ou %{browse}",
            browse: "parcours tes dossiers",
            uploading: "Envoi en cours...",
            complete: "Envoi réussi ✔"
          }
        }}
      />
    </div>
  );
}
