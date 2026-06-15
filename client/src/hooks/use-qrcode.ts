import { useEffect, useState } from "react";

export function useQrCode(scanId?: number, patientId?: number) {
  const [qrSvg, setQrSvg] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!scanId) return;

    const fetchQrCode = async () => {
      try {
        setLoading(true);
        const url = `/api/pro/scans/${scanId}/qrcode${patientId ? `?patientId=${patientId}` : ""}`;
        const response = await fetch(url);
        const svg = await response.text();
        setQrSvg(svg);
      } catch (err) {
        console.error("Failed to fetch QR code:", err);
        setQrSvg("");
      } finally {
        setLoading(false);
      }
    };

    fetchQrCode();
  }, [scanId, patientId]);

  return { qrSvg, loading };
}
