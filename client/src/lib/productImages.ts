import shampoingChebeImg from "/src/lib/af728efe-3c54-403f-931c-ed9159d72bca.jpeg";
import huileChebeImg from "/src/lib/38809ce3-e754-43e4-826d-497e58e983a7.jpeg";
import cremeChebeImg from "/src/lib/47ffadf3-c93f-45f6-8c37-c0eedcb78881.jpeg";
import asSerumJeunesseImg from "/src/lib/IMG_0108.jpeg";
import asGelContourYeuxImg from "/src/lib/IMG_0109.jpeg";
import asPotionLumiereImg from "/src/lib/IMG_0110.jpeg";
import asSolutionDouceurImg from "/src/lib/IMG_0111.jpeg";
import asCoconLumineuxImg from "/src/lib/IMG_0101.jpeg";
import asTresorCacaoImg from "/src/lib/IMG_0102.jpeg";
import asGelDoucheImg from "/src/lib/IMG_0103.jpeg";
import asGommageEclatImg from "/src/lib/IMG_0104.jpeg";
import asSavonCorpsImg from "/src/lib/IMG_0105.jpeg";
import asSerumMainsPiedsImg from "/src/lib/IMG_0106.jpeg";
import asHuileEclatImg from "/src/lib/IMG_0107.jpeg";
import asHuileEssentielleImg from "/src/lib/IMG_0108.jpeg";
import cremeVisageImg from "/src/lib/IMG_0113.jpeg";

export const productImages: Record<string, string> = {
  // Andrea Skincare
  "creme-visage": cremeVisageImg,
  "serum-jeunesse": asSerumJeunesseImg,
  "gel-contour-yeux": asGelContourYeuxImg,
  "potion-lumiere": asPotionLumiereImg,
  "solution-douceur": asSolutionDouceurImg,
  "cocon-lumineux": asCoconLumineuxImg,
  "tresor-cacao": asTresorCacaoImg,
  "gel-douche-eclat": asGelDoucheImg,
  "gommage-eclat": asGommageEclatImg,
  "savon-corps": asSavonCorpsImg,
  "serum-mains-pieds": asSerumMainsPiedsImg,
  "huile-eclat": asHuileEclatImg,
  "huile-essentielle": asHuileEssentielleImg,

  // Hair Bloom
  "shampooing-chebe": shampoingChebeImg,
  "huile-chebe": huileChebeImg,
  "creme-chebe": cremeChebeImg,
};

export function getSafetyScore(productId: string): number {
  const hash = (s: string) => {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  };
  return 85 + (hash(productId) % 12);
}
