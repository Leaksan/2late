import { useEffect, useState } from "react";

export function useKeyboardOpen() {
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const sync = () => {
      const gap = window.innerHeight - vv.height;
      setKeyboardOpen(gap > 120);
      setKeyboardInset(Math.max(0, window.innerHeight - vv.offsetTop - vv.height));
    };
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    sync();
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
    };
  }, []);

  return { keyboardOpen, keyboardInset };
}
