import { DiagnoseApiResponse, PanelCard } from "./types";

type InfoUnit = { label?: string; text?: string; unit_text?: string; content?: string; category?: string; class?: string };

function getInfoUnits(result: DiagnoseApiResponse): InfoUnit[] {
  const compression = result.compression as Record<string, unknown> | undefined;
  const direct = compression?.info_units;
  const nested = (compression?.compression_assessment as Record<string, unknown> | undefined)?.info_units;
  const source = Array.isArray(direct) ? direct : Array.isArray(nested) ? nested : [];
  return source as InfoUnit[];
}

function makeText(unit: InfoUnit): string {
  return unit.text || unit.unit_text || unit.content || "(텍스트 없음)";
}

export function buildStatusCards(result: DiagnoseApiResponse): PanelCard[] {
  const cards: PanelCard[] = [];

  const slotResults = result.core_diagnosis?.slot_results ?? [];
  for (const slot of slotResults) {
    cards.push({
      id: slot.slot_id,
      text: slot.gold_text || slot.diagnostic_note || "코어 슬롯",
      colorClass: slot.status === "PASS" ? "bg-green-100 text-green-900" : "bg-blue-100 text-blue-900"
    });
  }

  const counters = { OPTIONAL: 0, EXTRA: 0, REDUNDANT: 0, UNCLEAR: 0 };
  const prefixes = { OPTIONAL: "O", EXTRA: "E", REDUNDANT: "R", UNCLEAR: "U" } as const;

  for (const unit of getInfoUnits(result)) {
    const category = (unit.category || unit.class || "").toUpperCase();
    if (!(category in counters)) {
      continue;
    }

    const key = category as keyof typeof counters;
    counters[key] += 1;

    cards.push({
      id: `${prefixes[key]}${counters[key]}`,
      text: makeText(unit),
      colorClass: "bg-purple-100 text-purple-900"
    });
  }

  return cards;
}
