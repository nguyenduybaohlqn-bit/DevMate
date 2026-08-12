import { useEffect, useState } from "react";
import { formatClock } from "../utils/format";
import { MenuIcon } from "./Icons";
import styles from "./StatusBar.module.css";

interface StatusBarProps {
  sessionTitle: string;
  statusText: string;
  onOpenMobileMenu: () => void;
}

export function StatusBar({ sessionTitle, statusText, onOpenMobileMenu }: StatusBarProps) {
  const [clock, setClock] = useState(() => formatClock(new Date()));
  const [latency, setLatency] = useState(() => `${18 + Math.floor(Math.random() * 30)}ms`);

  useEffect(() => {
    const id = setInterval(() => setClock(formatClock(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setLatency(`${18 + Math.floor(Math.random() * 30)}ms`), 3400);
    return () => clearInterval(id);
  }, []);

  return (
    <header className={styles.statusbar}>
      <div className={styles.left}>
        <button className={styles.mobileMenuBtn} aria-label="Mở menu" onClick={onOpenMobileMenu}>
          <MenuIcon width={20} height={20} />
        </button>
        <div className={styles.title}>
          <b>NEXUS</b>
          <span>{sessionTitle.toUpperCase()}</span>
        </div>
      </div>
      <div className={styles.right}>
        <div className={styles.chip}>
          <span className={styles.dot} />
          <span>{statusText}</span>
        </div>
        <div className={styles.chip}>MODEL: GEMINI</div>
        <div className={styles.chip}>◱ {latency}</div>
        <div className={styles.clock}>{clock}</div>
      </div>
    </header>
  );
}
