"use client";

import { useEffect, useRef } from "react";

const VERT = `#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`;

/**
 * Flowing field of green light: layered fbm noise, a pointer-tracked bloom and
 * a scanline ripple. Deliberately monochrome green on near-black so it stays
 * inside the brand palette.
 */
const FRAG = `#version 300 es
precision highp float;
out vec4 outColor;

uniform vec2 uRes;
uniform vec2 uPointer;
uniform float uTime;

float hash(vec2 v) {
  return fract(sin(dot(v, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 v) {
  vec2 i = floor(v);
  vec2 f = fract(v);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 v) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    sum += amp * noise(v);
    v = v * 2.02 + vec2(1.7, 9.2);
    amp *= 0.5;
  }
  return sum;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 aspect = vec2(uRes.x / uRes.y, 1.0);
  vec2 q = (uv - 0.5) * aspect;
  vec2 pointer = (uPointer - 0.5) * aspect;

  float t = uTime * 0.045;

  // Drifting cloud field, warped by a second noise lookup.
  vec2 warp = vec2(fbm(q * 2.0 + t), fbm(q * 2.0 - t + 4.0));
  float clouds = fbm(q * 2.6 + warp * 1.4 + vec2(0.0, -t * 1.6));

  // Bloom that leans toward the cursor and breathes.
  float d = length(q - pointer * 0.55);
  float bloom = exp(-d * 2.6) * (0.55 + 0.12 * sin(uTime * 0.8));

  // Soft horizon so the field settles into the page instead of filling it.
  float horizon = smoothstep(0.95, -0.25, uv.y * 1.35);

  float energy = clouds * 0.55 + bloom;
  energy *= horizon;

  // Faint contour rings give the cloud some structure.
  float rings = smoothstep(0.012, 0.0, abs(fract(clouds * 5.0 - t * 2.0) - 0.5) - 0.47);
  energy += rings * 0.12 * horizon;

  vec3 deep = vec3(0.012, 0.031, 0.020);
  vec3 green = vec3(0.482, 0.769, 0.498);
  vec3 col = deep + green * pow(max(energy, 0.0), 1.7) * 0.85;

  // Dither to keep the gradient from banding on dark panels.
  col += (hash(gl_FragCoord.xy + uTime) - 0.5) * 0.012;

  outColor = vec4(col, 1.0);
}
`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

export default function ShaderField({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const gl = canvas.getContext("webgl2", {
      antialias: false,
      alpha: false,
      powerPreference: "low-power",
    });
    if (!gl) {
      // CSS gradient fallback already lives behind the canvas.
      canvas.style.display = "none";
      return;
    }

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) {
      canvas.style.display = "none";
      return;
    }

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      canvas.style.display = "none";
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "uRes");
    const uPointer = gl.getUniformLocation(prog, "uPointer");
    const uTime = gl.getUniformLocation(prog, "uTime");

    const pointer = { x: 0.5, y: 0.55 };
    const target = { x: 0.5, y: 0.55 };

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.floor(canvas!.clientWidth * dpr);
      const h = Math.floor(canvas!.clientHeight * dpr);
      if (canvas!.width !== w || canvas!.height !== h) {
        canvas!.width = w;
        canvas!.height = h;
        gl!.viewport(0, 0, w, h);
      }
    }

    function onMove(e: PointerEvent) {
      target.x = e.clientX / window.innerWidth;
      target.y = 1 - e.clientY / window.innerHeight;
    }
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("resize", resize);

    let raf = 0;
    let running = true;
    const start = performance.now();

    function frame(now: number) {
      if (!running) return;
      resize();
      pointer.x += (target.x - pointer.x) * 0.045;
      pointer.y += (target.y - pointer.y) * 0.045;
      gl!.uniform2f(uRes, canvas!.width, canvas!.height);
      gl!.uniform2f(uPointer, pointer.x, pointer.y);
      gl!.uniform1f(uTime, (now - start) / 1000);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
      if (!reduced) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    // Stop burning GPU when the hero scrolls away or the tab is hidden.
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !running) {
        running = true;
        raf = requestAnimationFrame(frame);
      } else if (!entry.isIntersecting && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    });
    io.observe(canvas);

    function onVisibility() {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        raf = requestAnimationFrame(frame);
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", resize);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
    };
  }, []);

  return (
    <div className={`absolute inset-0 overflow-hidden brand-field ${className}`} aria-hidden>
      <canvas ref={canvasRef} className="h-full w-full block" />
      <div className="brand-field-fade" />
    </div>
  );
}
