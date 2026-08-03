// Images produits par identifiant de catalogue.
// Les anciennes marques locales partenaires ont été retirées du catalogue →
// plus aucune image associée ici. Les produits GlowScan Dermo et internationaux
// utilisent leur champ `image` du catalogue directement.
export const productImages: Record<string, string> = {};

export function getSafetyScore(productId: string): number {
  const hash = (s: string) => {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  };
  return 85 + (hash(productId) % 12);
}
