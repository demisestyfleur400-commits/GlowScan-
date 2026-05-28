import { useState } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import type { UppyFile, UploadResult } from "@uppy/core";
import DashboardModal from "@uppy/react/dashboard-modal";
import AwsS3 from "@uppy/aws-s3";

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
  maxFileSize = 10485760,
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [showModal, setShowModal] = useState(false);

  const [uppy] = useState(() =>
    new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
        allowedFileTypes: ["image/jpeg", "image/png", "image/webp"],
      },
      autoProceed: false,
    })
      .use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: onGetUploadParameters,
      })
      .on("complete", (result) => {
        onComplete?.(result);
        setTimeout(() => setShowModal(false), 800);
      })
  );

  return (
    <div className="w-full inline-block">
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className={`w-full h-14 rounded-full flex items-center justify-center gap-2 font-extrabold text-xs tracking-wide text-white active:scale-[0.98] transition-transform ${buttonClassName || ""}`}
        style={{ background: "#7c3aed" }}
      >
        {children}
      </button>

      <style>{`
        .uppy-DashboardModal .uppy-Dashboard-inner {
          border-radius: 1.5rem !important;
          background-color: #13101f !important;
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif !important;
          border: 1px solid rgba(167,139,250,0.18) !important;
          color: #f3f0ff !important;
        }
        .uppy-DashboardModal .uppy-Dashboard-browse {
          color: #a78bfa !important;
          font-weight: 800 !important;
        }
        .uppy-Dashboard-bgIcon {
          color: rgba(167,139,250,0.3) !important;
        }
        .uppy-DashboardTabs-title, .uppy-Dashboard-Item-name {
          font-size: 11px !important;
          font-weight: 800 !important;
          color: #f3f0ff !important;
        }
        .uppy-Dashboard-note, .uppy-DashboardContent-title {
          color: rgba(200,185,255,0.65) !important;
        }
        .uppy-StatusBar-actionBtn--upload {
          background: #7c3aed !important;
          border-radius: 9999px !important;
          font-size: 11px !important;
          font-weight: 800 !important;
        }
        .uppy-Dashboard-Item-previewImg {
          border-radius: 12px !important;
        }
        .uppy-DashboardContent-bar {
          background: #13101f !important;
          border-bottom: 1px solid rgba(255,255,255,0.07) !important;
        }
        .uppy-StatusBar {
          background: #13101f !important;
          border-top: 1px solid rgba(255,255,255,0.07) !important;
        }
        .uppy-StatusBar-content {
          color: rgba(200,185,255,0.65) !important;
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
            uploading: "Envoi en cours…",
            complete: "Envoi réussi ✔",
          },
        }}
      />
    </div>
  );
}
