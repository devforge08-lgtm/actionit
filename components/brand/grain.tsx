/**
 * Fixed film-grain + vignette overlay. Sits above the page background and
 * below content, so every surface picks up a little texture.
 */
export default function Grain() {
  return (
    <div aria-hidden className="brand-grain">
      <div className="brand-grain-layer" />
      <div className="brand-vignette" />
    </div>
  );
}
