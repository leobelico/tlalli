"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * On phones, `.table-base` tables inside the app render as stacked cards (see globals.css). Each cell
 * needs its column name as a label; this copies the header text into `data-label` so every table gets
 * it without changing the pages (QA B14). Re-runs on navigation and when content changes.
 */
export function ResponsiveTables() {
  const pathname = usePathname();
  useEffect(() => {
    const label = () => {
      for (const table of document.querySelectorAll<HTMLTableElement>(".app-main table.table-base")) {
        const heads = [...table.querySelectorAll("thead th")].map((th) => th.textContent?.trim() ?? "");
        for (const row of table.querySelectorAll("tbody tr")) {
          [...row.children].forEach((cell, i) => {
            const text = heads[i] ?? "";
            if (cell.getAttribute("data-label") !== text) cell.setAttribute("data-label", text);
          });
        }
      }
    };
    label();
    const main = document.querySelector(".app-main");
    if (!main) return;
    const obs = new MutationObserver(label);
    obs.observe(main, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [pathname]);
  return null;
}
