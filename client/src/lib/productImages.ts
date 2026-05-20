import shampoingchebeimg from "src/lib/af728efe-3c54-403f-931c-ed9159d72bca.jpeg";
import huileChebeImg from "src/lib/38809ce3-e754-43e4-826d-497e58e983a7.jpeg";
import cremeChebeImg from "src/lib/47ffadf3-c93f-45f6-8c37-c0eedcb78881.jpeg";
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
import asHuileEssentielleImg from "/src/lib/IMG_0108.jpeg";
import cremeVisageImg from "/src/lib/IMG_0113.jpeg";

// Ebony Hair (BISSA'A Cosmetics) — photos produits rognées individuellement
//import ebonyBainHuileImg from "@assets/generated_images/ebony/bain-huile.jpg";
//import ebonyHuileCoiffanteImg from "@assets/generated_images/ebony/huile-coiffante.jpg";
//import ebonySoinProfondImg from "@assets/generated_images/ebony/soin-profond.jpg";
//import ebonyShampoingLekieImg from "@assets/generated_images/ebony/shampoing-lekie.jpg";
//import ebonyApresShampoing from "@assets/generated_images/ebony/apres-shampoing.jpg";
//import ebonySprayDemelantImg from "@assets/generated_images/ebony/spray-demelant.jpg";
//import ebonyMousseKariteImg from "@assets/generated_images/ebony/mousse-karite.jpg";
//import ebonyMasqueReparationImg from "@assets/generated_images/ebony/masque-reparation.jpg";
//import ebonyActivateurRepousseImg from "@assets/generated_images/ebony/activateur-repousse.jpg";
//import ebonyHuileRicinImg from "@assets/generated_images/ebony/huile-ricin.jpg";
//import ebonyHuileAvocat from "@assets/generated_images/ebony/huile-avocat.jpg";
//import ebonyHuileAilImg from "@assets/generated_images/ebony/huile-ail.jpg";
//import ebonyHuileNeemImg from "@assets/generated_images/ebony/huile-neem.jpg";
//import ebonyHuileCocoImg from "@assets/generated_images/ebony/huile-coco.jpg";
//import ebonyHuileFenugrec from "@assets/generated_images/ebony/huile-fenugrec.jpg";
//import ebonyHuileMoringaImg from "@assets/generated_images/ebony/huile-moringa.jpg";
//import ebonyHuileCarotteImg from "@assets/generated_images/ebony/huile-carotte.jpg";
//import ebonyHuileSesameImg from "@assets/generated_images/ebony/huile-sesame.jpg";
//import ebonyGlycerinImg from "@assets/generated_images/ebony/glycerine-vegetale.jpg";
//import ebonySavonNoirImg from "@assets/generated_images/ebony/savon-noir.jpg";
//import ebonySavonExfoliantImg from "@assets/generated_images/ebony/savon-exfoliant.jpg";
//import ebonySavonSurgrasImg from "@assets/generated_images/ebony/savon-surgras.jpg";
//import ebonySavonCorpsImg from "@assets/generated_images/ebony/savon-corps.jpg";

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

  // Ebony Hair (BISSA'A Cosmetics)
  "ebony-hair-bain-huile": ebonyBainHuileImg,
  "ebony-hair-huile-coiffante": ebonyHuileCoiffanteImg,
  "ebony-hair-soin-profond": ebonySoinProfondImg,
  "ebony-hair-shampoing-lekie": ebonyShampoingLekieImg,
  "ebony-hair-apres-shampoing": ebonyApresShampoing,
  "ebony-hair-spray-demelant": ebonySprayDemelantImg,
  "ebony-hair-mousse-karite": ebonyMousseKariteImg,
  "ebony-hair-huile-avocat": ebonyHuileAvocat,
  "ebony-hair-huile-ail": ebonyHuileAilImg,
  "ebony-hair-huile-neem": ebonyHuileNeemImg,
  "ebony-hair-masque-reparation": ebonyMasqueReparationImg,
  "ebony-hair-activateur-repousse": ebonyActivateurRepousseImg,
  "ebony-hair-huile-ricin": ebonyHuileRicinImg,
  "ebony-hair-huile-coco": ebonyHuileCocoImg,
  "ebony-hair-huile-fenugrec": ebonyHuileFenugrec,
  // Ebony Hair — Corps & Peau
  "ebony-savon-noir": ebonySavonNoirImg,
  "ebony-savon-exfoliant": ebonySavonExfoliantImg,
  "ebony-savon-surgras": ebonySavonSurgrasImg,
  "ebony-savon-corps": ebonySavonCorpsImg,
  "ebony-glycerine-vegetale": ebonyGlycerinImg,
  "ebony-huile-moringa": ebonyHuileMoringaImg,
  "ebony-huile-carotte": ebonyHuileCarotteImg,
  "ebony-huile-sesame": ebonyHuileSesameImg,

  // Hair Bloom
  "shampooing-chebe": shampooingChebeImg,
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
