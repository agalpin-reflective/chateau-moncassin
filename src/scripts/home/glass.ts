import fragmentSource from './glass.frag.glsl?raw';
import { $ } from '../lib/dom';
import { reduce } from '../lib/motion';

const VERTEX_SOURCE = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}';
const UNIFORMS = ['uRes', 'uTime', 'uSwirl', 'uAngle', 'uPointer'] as const;
type UniformName = (typeof UNIFORMS)[number];

/**
 * Le verre de vin du hero, en WebGL brut : un seul triangle plein écran, pas de scène 3D.
 * Le rendu s'arrête hors écran ou onglet masqué ; l'image fixe reste en place si WebGL manque
 * ou si l'utilisateur a demandé à réduire le mouvement.
 */
export function createGlass() {
  const fig = $('.glass');
  const canvas = $<HTMLCanvasElement>('.glass-canvas');
  const hero = $('.hero');
  const root = document.documentElement;

  let gl: WebGLRenderingContext | null = null;
  let program: WebGLProgram | null = null;
  let buffer: WebGLBuffer | null = null;
  const uniforms = {} as Record<UniformName, WebGLUniformLocation | null>;
  let raf = 0;
  let firstFrame = true;
  let onScreen = true;
  let pageVisible = !document.hidden;

  let energy = 0.35;
  let swirl = 0.35;
  let angle = 0.7;
  let px = 0;
  let py = 0;
  let tx = 0;
  let ty = 0;
  let lastT = 0;
  let lastPX: number | null = null;
  let lastPY = 0;
  let lastPT = 0;

  const compile = (ctx: WebGLRenderingContext, type: number, source: string) => {
    const shader = ctx.createShader(type);
    if (!shader) throw new Error('shader');
    ctx.shaderSource(shader, source);
    ctx.compileShader(shader);
    if (!ctx.getShaderParameter(shader, ctx.COMPILE_STATUS)) throw new Error(ctx.getShaderInfoLog(shader) ?? 'shader');
    return shader;
  };

  const setup = (ctx: WebGLRenderingContext) => {
    const vs = compile(ctx, ctx.VERTEX_SHADER, VERTEX_SOURCE);
    const fs = compile(ctx, ctx.FRAGMENT_SHADER, fragmentSource);
    program = ctx.createProgram();
    if (!program) throw new Error('program');
    ctx.attachShader(program, vs);
    ctx.attachShader(program, fs);
    ctx.linkProgram(program);
    if (!ctx.getProgramParameter(program, ctx.LINK_STATUS)) throw new Error('link');
    ctx.deleteShader(vs);
    ctx.deleteShader(fs);
    ctx.useProgram(program);
    buffer = ctx.createBuffer();
    ctx.bindBuffer(ctx.ARRAY_BUFFER, buffer);
    ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), ctx.STATIC_DRAW);
    const loc = ctx.getAttribLocation(program, 'a');
    ctx.enableVertexAttribArray(loc);
    ctx.vertexAttribPointer(loc, 2, ctx.FLOAT, false, 0, 0);
    UNIFORMS.forEach((name) => {
      uniforms[name] = ctx.getUniformLocation(program!, name);
    });
    ctx.clearColor(0, 0, 0, 0);
  };

  const resize = () => {
    if (!gl || !fig || !canvas) return;
    const rect = fig.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  };

  const running = () => Boolean(gl) && onScreen && pageVisible;

  const frame = (now: number) => {
    raf = 0;
    if (!running() || !gl || !canvas || !fig) return;
    raf = requestAnimationFrame(frame);
    const t = now / 1000;
    const dt = lastT ? Math.min(0.05, t - lastT) : 0.016;
    lastT = t;
    energy *= Math.pow(0.4, dt);
    swirl += (Math.min(energy, 2.2) - swirl) * Math.min(1, dt * 2.5);
    angle += dt * (0.1 + swirl * 1.4);
    px += (tx - px) * Math.min(1, dt * 4);
    py += (ty - py) * Math.min(1, dt * 4);
    gl.uniform2f(uniforms.uRes, canvas.width, canvas.height);
    gl.uniform1f(uniforms.uTime, t % 1000);
    gl.uniform1f(uniforms.uSwirl, swirl);
    gl.uniform1f(uniforms.uAngle, angle);
    gl.uniform2f(uniforms.uPointer, px, py);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (firstFrame) {
      firstFrame = false;
      fig.classList.add('is-live');
    }
  };

  const start = () => {
    if (!raf && running()) {
      lastT = 0;
      raf = requestAnimationFrame(frame);
    }
  };
  const stop = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };
  const resetPointer = () => {
    tx = 0;
    ty = 0;
    lastPX = null;
  };
  const onPointer = (e: PointerEvent) => {
    if (!fig) return;
    const rect = fig.getBoundingClientRect();
    const radius = rect.width * 0.42;
    tx = Math.max(-1.2, Math.min(1.2, (e.clientX - (rect.left + rect.width / 2)) / radius));
    ty = Math.max(-1.2, Math.min(1.2, -(e.clientY - (rect.top + rect.height / 2)) / radius));
    const now = e.timeStamp || performance.now();
    if (lastPX !== null) {
      const dist = Math.hypot(e.clientX - lastPX, e.clientY - lastPY);
      const dtp = Math.max(8, now - lastPT);
      energy = Math.min(2.4, energy + Math.min(0.35, (dist / dtp) * 0.05));
    }
    lastPX = e.clientX;
    lastPY = e.clientY;
    lastPT = now;
  };

  const init = () => {
    if (!fig || !canvas || !hero || reduce) {
      root.classList.add('no-webgl');
      return;
    }
    try {
      gl = canvas.getContext('webgl', {
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: 'low-power',
      });
      if (!gl) throw new Error('webgl');
      setup(gl);
    } catch {
      gl = null;
      root.classList.add('no-webgl');
      return;
    }
    resize();
    new ResizeObserver(resize).observe(fig);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        onScreen = entry.isIntersecting;
        if (onScreen) start();
        else stop();
      }).observe(fig);
    }
    document.addEventListener('visibilitychange', () => {
      pageVisible = !document.hidden;
      if (pageVisible) start();
      else stop();
    });
    hero.addEventListener('pointermove', onPointer, { passive: true });
    hero.addEventListener('pointerleave', resetPointer);
    hero.addEventListener('pointercancel', resetPointer);
    window.addEventListener('blur', resetPointer);
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      stop();
      fig.classList.remove('is-live');
    });
    canvas.addEventListener('webglcontextrestored', () => {
      try {
        if (gl) setup(gl);
        resize();
        firstFrame = true;
        start();
      } catch {
        gl = null;
        root.classList.add('no-webgl');
      }
    });
    start();
  };

  const destroy = () => {
    stop();
    if (gl) {
      if (buffer) gl.deleteBuffer(buffer);
      if (program) gl.deleteProgram(program);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
    gl = null;
  };

  return {
    init,
    destroy,
    /** Donne un élan au tourbillon (arrivée sur la page). */
    kick(value: number) {
      energy = Math.max(energy, value);
    },
    /** Ajoute de l'énergie au tourbillon (vitesse de défilement). */
    add(value: number) {
      energy = Math.min(2.4, energy + value);
    },
  };
}
