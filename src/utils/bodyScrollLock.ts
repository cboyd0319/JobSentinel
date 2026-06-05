let lockCount = 0;
let previousOverflow: string | null = null;

export function lockBodyScroll(): () => void {
  if (typeof document === "undefined") {
    return () => {};
  }

  if (lockCount === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }

  lockCount += 1;
  let released = false;

  return () => {
    if (released) {
      return;
    }

    released = true;
    lockCount = Math.max(0, lockCount - 1);

    if (lockCount === 0) {
      document.body.style.overflow = previousOverflow ?? "";
      previousOverflow = null;
    }
  };
}

export function resetBodyScrollLocksForTests(): void {
  lockCount = 0;
  previousOverflow = null;
  if (typeof document !== "undefined") {
    document.body.style.overflow = "";
  }
}
