import { useCallback, useState } from "react";
import type { Blueprint } from "../types";
import { SAMPLE_BLUEPRINT } from "../data/sampleBlueprint";

interface UseBlueprintReturn {
  blueprint: Blueprint;
  scanning: boolean;
  selectedId: string | null;
  select: (id: string | null) => void;
  rescan: () => Promise<void>;
}

/**
 * TODO tích hợp thật: thay `SAMPLE_BLUEPRINT` bằng gọi API, vd:
 *
 *   const res = await fetch(`${BACKEND_URL}/api/blueprint/scan`, { method: "POST" });
 *   const data: Blueprint = await res.json();
 *
 * Miễn response đúng shape `Blueprint` (types/blueprint.ts) thì không
 * phải sửa gì ở GraphCanvas/InspectorPanel/ExplorerPanel — toàn bộ UI chỉ
 * tiêu thụ dữ liệu, không tự suy luận quan hệ.
 */
export function useBlueprint(): UseBlueprintReturn {
  const [blueprint, setBlueprint] = useState<Blueprint>(SAMPLE_BLUEPRINT);
  const [scanning, setScanning] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const select = useCallback((id: string | null) => setSelectedId(id), []);

  const rescan = useCallback(async () => {
    setScanning(true);
    // Mô phỏng thời gian quét — thay bằng fetch thật khi có backend.
    await new Promise((r) => setTimeout(r, 900));
    setBlueprint({
      ...SAMPLE_BLUEPRINT,
      statistics: { ...SAMPLE_BLUEPRINT.statistics, lastScanAt: new Date().toISOString() },
    });
    setScanning(false);
  }, []);

  return { blueprint, scanning, selectedId, select, rescan };
}
