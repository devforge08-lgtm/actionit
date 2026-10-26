"use client";

/**
 * Fixed film-grain + vignette overlay. Sits above the page background and
 * below content, so every surface picks up a little texture.
 */
export default function Grain() {
  return (
    <div aria-hidden className="brand-grain">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-0 w-0 absolute">
        <filter id="brand-noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </svg>
      <div className="brand-grain-layer" />
      <div className="brand-vignette" />
    </div>
  );
}
