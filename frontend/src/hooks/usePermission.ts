import { useCallback, useRef, useState } from "react";
import type { PermissionRequest } from "../types";

let counter = 0;

interface UsePermissionReturn {
  request: PermissionRequest | null;
  ask: (req: Omit<PermissionRequest, "id">) => Promise<boolean>;
  respond: (allowed: boolean) => void;
}

/** Nguyên tắc: quyền không phải popup, không thuộc riêng mode nào — bất
 *  kỳ hành động nào (chat, tool, agent...) vượt qua ranh giới tin cậy đều
 *  gọi `ask()` và đợi, UI hiển thị dạng card ngay trong luồng thay vì
 *  window.confirm hay modal đè lên. */
export function usePermission(): UsePermissionReturn {
  const [request, setRequest] = useState<PermissionRequest | null>(null);
  const resolverRef = useRef<((allowed: boolean) => void) | null>(null);

  const ask = useCallback((req: Omit<PermissionRequest, "id">) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setRequest({ ...req, id: `perm-${Date.now()}-${counter++}` });
    });
  }, []);

  const respond = useCallback((allowed: boolean) => {
    resolverRef.current?.(allowed);
    resolverRef.current = null;
    setRequest(null);
  }, []);

  return { request, ask, respond };
}
