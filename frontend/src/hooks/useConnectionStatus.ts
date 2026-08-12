import { useEffect, useState } from "react";
import type { CoreState } from "../types";

interface ConnectionStatus {
  coreState: CoreState;
  statusText: string;
}

/** Chuỗi "khởi động" ngắn khi app mount — lõi quay nhanh (thinking) trong
 *  ~1.1s rồi ổn định về idle/"TRỰC TUYẾN". Dùng cho icon nhỏ ở sidebar và
 *  dòng trạng thái ở statusbar. */
export function useConnectionStatus(): ConnectionStatus {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setConnected(true), 1100);
    return () => clearTimeout(t);
  }, []);

  return connected
    ? { coreState: "idle", statusText: "TRỰC TUYẾN" }
    : { coreState: "thinking", statusText: "ĐANG KẾT NỐI..." };
}
