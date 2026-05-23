export function forceReveal() {
  // Dispatch a global event so React components that listen can react
  try {
    window.dispatchEvent(new Event('rc:force-reveal'));
  } catch (err) {
    // ignore
  }

  // Also directly add revealed class to anything with .to-reveal
  try {
    const items = Array.from(document.querySelectorAll<HTMLElement>('.to-reveal'));
    items.forEach((el, idx) => {
      // apply a small stagger
      el.style.animationDelay = `${idx * 60}ms`;
      el.classList.add('revealed');
      el.classList.remove('to-reveal');
    });
  } catch (err) {
    // ignore
  }
}

export default forceReveal;
