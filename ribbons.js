import { Renderer, Transform, Vec3, Vec2, Color, Polyline } from 'https://esm.sh/ogl@1.0.11';

class RibbonsEffect {
  constructor(options = {}) {
    this.options = Object.assign({
      colors: ['#800000',
        ],
      baseSpring: 0.025,
      baseFriction: 0.95,
      baseThickness: 30,
      offsetFactor: 0.035,
      maxAge: 500,
      pointCount: 48,
      speedMultiplier: 0.6,
      enableFade: false,
      enableShaderEffect: false,
      effectAmplitude: 1.4,
      backgroundColor: [0, 0, 0, 0]
    }, options);

    this.isTouch = window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(hover: none)').matches;
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (this.isTouch || this.prefersReducedMotion) return;

    this.init();
  }

  init() {
    this.renderer = new Renderer({ dpr: window.devicePixelRatio || 2, alpha: true });
    this.gl = this.renderer.gl;
    const bg = this.options.backgroundColor;
    if (Array.isArray(bg) && bg.length === 4) {
      this.gl.clearColor(bg[0], bg[1], bg[2], bg[3]);
    } else {
      this.gl.clearColor(0, 0, 0, 0);
    }

    this.container = document.createElement('div');
    this.container.id = 'ribbons-container';
    this.container.style.position = 'fixed';
    this.container.style.top = '0';
    this.container.style.left = '0';
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.pointerEvents = 'none';
    this.container.style.zIndex = '9';
    document.body.appendChild(this.container);

    this.gl.canvas.style.position = 'absolute';
    this.gl.canvas.style.top = '0';
    this.gl.canvas.style.left = '0';
    this.gl.canvas.style.width = '100%';
    this.gl.canvas.style.height = '100%';
    this.container.appendChild(this.gl.canvas);

    this.scene = new Transform();
    this.lines = [];

    const vertex = `
      precision highp float;
      attribute vec3 position;
      attribute vec3 next;
      attribute vec3 prev;
      attribute vec2 uv;
      attribute float side;
      uniform vec2 uResolution;
      uniform float uDPR;
      uniform float uThickness;
      uniform float uTime;
      uniform float uEnableShaderEffect;
      uniform float uEffectAmplitude;
      varying vec2 vUV;
      vec4 getPosition() {
          vec4 current = vec4(position, 1.0);
          vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
          vec2 nextScreen = next.xy * aspect;
          vec2 prevScreen = prev.xy * aspect;
          vec2 tangent = normalize(nextScreen - prevScreen);
          vec2 normal = vec2(-tangent.y, tangent.x);
          normal /= aspect;
          normal *= mix(1.0, 0.1, pow(abs(uv.y - 0.5) * 2.0, 2.0));
          float dist = length(nextScreen - prevScreen);
          normal *= smoothstep(0.0, 0.02, dist);
          float pixelWidthRatio = 1.0 / (uResolution.y / uDPR);
          float pixelWidth = current.w * pixelWidthRatio;
          normal *= pixelWidth * uThickness;
          current.xy -= normal * side;
          if(uEnableShaderEffect > 0.5) {
            current.xy += normal * sin(uTime + current.x * 10.0) * uEffectAmplitude;
          }
          return current;
      }
      void main() {
          vUV = uv;
          gl_Position = getPosition();
      }
    `;

    const fragment = `
      precision highp float;
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uEnableFade;
      varying vec2 vUV;
      void main() {
          float fadeFactor = 1.0;
          if(uEnableFade > 0.5) {
              fadeFactor = 1.0 - smoothstep(0.0, 1.0, vUV.y);
          }
          gl_FragColor = vec4(uColor, uOpacity * fadeFactor);
      }
    `;

    const center = (this.options.colors.length - 1) / 2;
    this.options.colors.forEach((color, index) => {
      const spring = this.options.baseSpring + (Math.random() - 0.5) * 0.05;
      const friction = this.options.baseFriction + (Math.random() - 0.5) * 0.05;
      const thickness = this.options.baseThickness + (Math.random() - 0.5) * 3;
      const mouseOffset = new Vec3(
        (index - center) * this.options.offsetFactor + (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.1,
        0
      );

      const line = {
        spring,
        friction,
        mouseVelocity: new Vec3(),
        mouseOffset
      };

      const points = [];
      for (let i = 0; i < this.options.pointCount; i++) {
        points.push(new Vec3());
      }
      line.points = points;

      line.polyline = new Polyline(this.gl, {
        points,
        vertex,
        fragment,
        uniforms: {
          uColor: { value: new Color(color) },
          uThickness: { value: thickness },
          uOpacity: { value: 1.0 },
          uTime: { value: 0.0 },
          uEnableShaderEffect: { value: this.options.enableShaderEffect ? 1.0 : 0.0 },
          uEffectAmplitude: { value: this.options.effectAmplitude },
          uEnableFade: { value: this.options.enableFade ? 1.0 : 0.0 },
          uResolution: { value: new Vec2(window.innerWidth, window.innerHeight) },
          uDPR: { value: window.devicePixelRatio || 2 }
        }
      });
      line.polyline.mesh.setParent(this.scene);
      this.lines.push(line);
    });

    this.onResize();
    window.addEventListener('resize', this.onResize.bind(this));

    this.mouse = new Vec3();
    this.updateMouse = this.updateMouse.bind(this);
    document.addEventListener('mousemove', this.updateMouse);
    document.addEventListener('touchstart', this.updateMouse, { passive: true });
    document.addEventListener('touchmove', this.updateMouse, { passive: true });

    this.tmp = new Vec3();
    this.lastTime = performance.now();
    this.update = this.update.bind(this);
    requestAnimationFrame(this.update);
  }

  onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(width, height);
    this.lines.forEach(line => {
      line.polyline.program.uniforms.uResolution.value.set(width, height);
      line.polyline.resize();
    });
  }

  updateMouse(e) {
    let x, y;
    if (e.changedTouches && e.changedTouches.length) {
      x = e.changedTouches[0].clientX;
      y = e.changedTouches[0].clientY;
    } else {
      x = e.clientX;
      y = e.clientY;
    }
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.mouse.set((x / width) * 2 - 1, (y / height) * -2 + 1, 0);
  }

  update() {
    requestAnimationFrame(this.update);
    const currentTime = performance.now();
    const dt = currentTime - this.lastTime;
    this.lastTime = currentTime;

    this.lines.forEach(line => {
      this.tmp.copy(this.mouse).add(line.mouseOffset).sub(line.points[0]).multiply(line.spring);
      line.mouseVelocity.add(this.tmp).multiply(line.friction);
      line.points[0].add(line.mouseVelocity);

      for (let i = 1; i < line.points.length; i++) {
        if (isFinite(this.options.maxAge) && this.options.maxAge > 0) {
          const segmentDelay = this.options.maxAge / (line.points.length - 1);
          const alpha = Math.min(1, (dt * this.options.speedMultiplier) / segmentDelay);
          line.points[i].lerp(line.points[i - 1], alpha);
        } else {
          line.points[i].lerp(line.points[i - 1], 0.9);
        }
      }
      if (line.polyline.mesh.program.uniforms.uTime) {
        line.polyline.mesh.program.uniforms.uTime.value = currentTime * 0.001;
      }
      line.polyline.updateGeometry();
    });

    this.renderer.render({ scene: this.scene });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new RibbonsEffect();
});
