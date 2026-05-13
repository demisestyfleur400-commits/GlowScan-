import { useEffect } from "react";

function douaaHour(): number {
  const fmt = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Africa/Douala",
    hour: "2-digit",
    hour12: false,
  });
  return parseInt(fmt.format(new Date()), 10);
}

function shouldBeDark(): boolean {
  const h = douaaHour();
  return h < 6 || h >= 19;
}

export function useAutoTheme() {
  useEffect(() => {
    const apply = () => {
      const root = document.documentElement;
      if (shouldBeDark()) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };
    apply();
    const id = window.setInterval(apply, 5 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);
}
