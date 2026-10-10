import { Canvas, useFrame } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Lightformer,
  OrbitControls,
  RoundedBox,
  useGLTF,
  useTexture,
} from "@react-three/drei";
import {
  Component,
  Suspense,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import * as THREE from "three";
import gsap from "gsap";

import { pickScene, drinkColor } from "./dishtheme";

/* =========================================================
   HELPERS
========================================================= */

const rng = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const lathe = (pts, seg = 64) =>
  new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);

const plateGeo = () =>
  lathe([
    [0, 0.02], [1.3, 0.02], [1.75, 0.14], [2.05, 0.3],
    [2.12, 0.28], [1.95, 0.08], [1.2, 0], [0, 0],
  ]);

/* =========================================================
   RISING STEAM / BUBBLES
========================================================= */

const Rising = ({
  position = [0, 0, 0],
  spread = 0.5,
  height = 1.6,
  count = 14,
  size = 0.2,
  color = "#ffffff",
  opacity = 0.09,
  grow = true,
  seed = 7,
}) => {
  const mesh = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const data = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: count }, () => ({
      x: (r() - 0.5) * spread,
      z: (r() - 0.5) * spread,
      s: size * (0.6 + r() * 0.8),
      sp: 0.12 + r() * 0.18,
      o: r(),
    }));
  }, [count, spread, size, seed]);

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    data.forEach((d, i) => {
      const p = (clock.elapsedTime * d.sp + d.o) % 1;
      dummy.position.set(
        position[0] + d.x + Math.sin(p * 6 + i) * 0.06,
        position[1] + p * height,
        position[2] + d.z
      );
      dummy.scale.setScalar(d.s * (grow ? 0.6 + p * 1.2 : 0.8 + p * 0.3));
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[null, null, count]}>
      <sphereGeometry args={[1, 10, 10]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </instancedMesh>
  );
};

/* =========================================================
   FRIES
========================================================= */

const Fries = ({ name }) => {
  const root = useRef();
  const stack = useRef();
  const tint = /jollof|jello/i.test(name) ? "#e0702a" : "#f2b134";

  const sticks = useMemo(() => {
    const r = rng(11);
    return Array.from({ length: 36 }, () => {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * 0.5;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      const h = 1.5 + r() * 0.8;
      return {
        pos: [x, -0.4 + h / 2 + r() * 0.1, z],
        rot: [z * 0.55 + (r() - 0.5) * 0.2, r() * Math.PI, -x * 0.55 + (r() - 0.5) * 0.2],
        h,
        color: new THREE.Color(tint).offsetHSL((r() - 0.5) * 0.02, 0, (r() - 0.5) * 0.12),
      };
    });
  }, [tint]);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(root.current.position, { y: -3, duration: 1.1, ease: "back.out(1.6)" });
      gsap.from(root.current.rotation, { y: -2.6, duration: 1.7, ease: "power3.out" });
      gsap.from([...stack.current.children].map((c) => c.position), {
        y: "+=4.5", duration: 1, ease: "bounce.out",
        stagger: { each: 0.025, from: "random" }, delay: 0.5,
      });
      gsap.to(root.current.position, {
        y: "+=0.12", duration: 2.2, yoyo: true, repeat: -1,
        ease: "sine.inOut", delay: 1.8,
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <group ref={root} position={[0, -0.3, 0]}>
      <mesh position={[0, -0.45, 0]} rotation={[0, Math.PI / 4, 0]}>
        <cylinderGeometry args={[0.95, 0.62, 1.3, 4, 1, true]} />
        <meshStandardMaterial color="#c8382a" roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.12, 0]} rotation={[0, Math.PI / 4, 0]}>
        <cylinderGeometry args={[0.905, 0.86, 0.16, 4, 1, true]} />
        <meshStandardMaterial color="#f4e6cf" roughness={0.8} side={THREE.DoubleSide} />
      </mesh>

      <group ref={stack}>
        {sticks.map((s, i) => (
          <RoundedBox key={i} args={[0.14, s.h, 0.14]} radius={0.03} smoothness={2}
            position={s.pos} rotation={s.rot}>
            <meshStandardMaterial color={s.color} roughness={0.62} />
          </RoundedBox>
        ))}
      </group>

      <Rising position={[0, 1.6, 0]} spread={0.7} height={1.4} size={0.22} />
    </group>
  );
};

/* =========================================================
   SPAGHETTI
========================================================= */

const Spaghetti = () => {
  const root = useRef();
  const nest = useRef();
  const toppings = useRef();
  const fork = useRef();
  const plate = useMemo(plateGeo, []);

  const strands = useMemo(() => {
    const r = rng(21);
    return Array.from({ length: 18 }, (_, k) => {
      const loops = 1.4 + r() * 0.8;
      const rad = 0.35 + r() * 0.65;
      const phase = r() * Math.PI * 2;
      const layer = 0.14 + (k / 18) * 0.42;
      const pts = [];
      for (let i = 0; i <= 44; i++) {
        const t = (i / 44) * Math.PI * 2 * loops;
        const rr = rad * (0.8 + 0.25 * Math.sin(t * 1.5 + phase));
        pts.push(new THREE.Vector3(
          Math.cos(t + phase) * rr,
          layer + Math.sin(t * 2.2 + phase) * 0.07,
          Math.sin(t + phase) * rr
        ));
      }
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 110, 0.03, 6);
    });
  }, []);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(root.current.position, { y: -3, duration: 1, ease: "power3.out" });
      gsap.from([...nest.current.children].map((c) => c.position), {
        y: "+=3.2", duration: 1.3, ease: "elastic.out(1, 0.6)", stagger: 0.06, delay: 0.3,
      });
      gsap.from(toppings.current.scale, {
        x: 0, y: 0, z: 0, duration: 1, ease: "elastic.out(1, 0.5)", delay: 1.5,
      });
      gsap.from(fork.current.position, {
        x: 4, y: 2.5, duration: 1.4, ease: "power3.out", delay: 1.2,
      });
      gsap.to(nest.current.rotation, {
        y: Math.PI * 2, duration: 28, repeat: -1, ease: "none",
      });
      gsap.to(fork.current.position, {
        y: "+=0.14", duration: 2, yoyo: true, repeat: -1,
        ease: "sine.inOut", delay: 2.6,
      });
      gsap.to(fork.current.rotation, {
        x: 0.35, duration: 2.6, yoyo: true, repeat: -1,
        ease: "sine.inOut", delay: 2.6,
      });
    });
    return () => ctx.revert();
  }, []);

  const forkMat = <meshStandardMaterial color="#d8d8dc" metalness={1} roughness={0.22} />;

  return (
    <group ref={root} position={[0, -1.35, 0]} scale={0.78}>
      <mesh geometry={plate}>
        <meshStandardMaterial color="#f6f1ea" roughness={0.3} side={THREE.DoubleSide} />
      </mesh>

      <group ref={nest}>
        {strands.map((g, i) => (
          <mesh key={i} geometry={g}>
            <meshStandardMaterial color="#e8c25f" roughness={0.48} />
          </mesh>
        ))}
      </group>

      <group ref={toppings} position={[0, 0.5, 0]}>
        <mesh position={[0, 0.18, 0]} scale={[0.85, 0.42, 0.85]}>
          <sphereGeometry args={[1, 24, 16]} />
          <meshPhysicalMaterial color="#b32a1c" roughness={0.35} clearcoat={0.8} />
        </mesh>

        {[[0.32, 0.5, 0.1], [-0.25, 0.48, 0.22], [0, 0.52, -0.3]].map((p, i) => (
          <mesh key={i} position={p}>
            <sphereGeometry args={[0.24, 20, 16]} />
            <meshStandardMaterial color="#6b3a22" roughness={0.7} />
          </mesh>
        ))}

        {[[-0.1, 0.78, 0, 0.5], [0.15, 0.74, 0.18, -0.6]].map(([x, y, z, ry], i) => (
          <mesh key={i} position={[x, y, z]} rotation={[0.3, ry, 0.2]} scale={[0.3, 0.035, 0.17]}>
            <sphereGeometry args={[1, 16, 10]} />
            <meshStandardMaterial color="#3f8f3a" roughness={0.6} />
          </mesh>
        ))}
      </group>

      <group ref={fork} position={[2.1, 1.5, 0.6]} rotation={[0, -0.6, -0.9]}>
        <mesh position={[0, -0.8, 0]}>
          <cylinderGeometry args={[0.045, 0.06, 1.6, 12]} />
          {forkMat}
        </mesh>
        <mesh position={[0, 0.1, 0]}>
          <boxGeometry args={[0.34, 0.2, 0.03]} />
          {forkMat}
        </mesh>
        {[-0.14, -0.047, 0.047, 0.14].map((x, i) => (
          <mesh key={i} position={[x, 0.45, 0]}>
            <cylinderGeometry args={[0.014, 0.014, 0.6, 8]} />
            {forkMat}
          </mesh>
        ))}
      </group>

      <Rising position={[0, 1.1, 0]} spread={1} height={1.8} size={0.28} count={16} seed={5} />
    </group>
  );
};

/* =========================================================
   DRINK
========================================================= */

const Drink = ({ name }) => {
  const root = useRef();
  const liquid = useRef();
  const ice = useRef();
  const straw = useRef();
  const slice = useRef();
  const color = drinkColor(name);

  const glass = useMemo(() =>
    lathe([
      [0, -1.3], [0.7, -1.3], [0.78, -1.25], [0.95, 1.3],
      [0.98, 1.33], [0.93, 1.28], [0.8, -1.1], [0, -1.1],
    ]), []);

  const body = useMemo(() =>
    lathe([[0, 0], [0.76, 0], [0.9, 2.3], [0, 2.3]]), []);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(liquid.current.scale, { y: 0.001 });
      gsap.from(root.current.position, { y: 3.5, duration: 1.1, ease: "power3.out" });
      gsap.from(root.current.rotation, { y: -2.2, duration: 1.6, ease: "power3.out" });
      gsap.to(liquid.current.scale, { y: 1, duration: 1.8, ease: "power2.inOut", delay: 0.7 });
      gsap.from([...ice.current.children].map((c) => c.position), {
        y: "+=3", duration: 0.9, ease: "bounce.out", stagger: 0.15, delay: 2.1,
      });
      gsap.from(straw.current.position, { y: "+=3", duration: 0.9, ease: "power3.out", delay: 2.5 });
      gsap.from(slice.current.scale, {
        x: 0, y: 0, z: 0, duration: 0.8, ease: "back.out(2.4)", delay: 3,
      });
      gsap.to(root.current.position, {
        y: "+=0.12", duration: 2.4, yoyo: true, repeat: -1,
        ease: "sine.inOut", delay: 3.4,
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <group ref={root} position={[0, -0.1, 0]}>
      <mesh geometry={glass}>
        <meshPhysicalMaterial color="#f6efe6" transparent opacity={0.2} roughness={0.04}
          clearcoat={1} side={THREE.DoubleSide} depthWrite={false} envMapIntensity={1.6} />
      </mesh>

      <group ref={liquid} position={[0, -1.1, 0]}>
        <mesh geometry={body}>
          <meshPhysicalMaterial color={color} roughness={0.12} clearcoat={0.6}
            transparent opacity={0.9} />
        </mesh>
      </group>

      <group ref={ice}>
        {[[-0.28, 0.75, 0.1, 0.62], [0.3, 0.95, -0.1, 0.55], [0, 0.4, -0.3, 0.5]]
          .map(([x, y, z, s], i) => (
            <RoundedBox key={i} args={[s, s, s]} radius={s * 0.16} smoothness={4}
              position={[x, y, z]} rotation={[0.3 * i, 0.5 + i, 0.2]}>
              <meshPhysicalMaterial color="#eaf3f7" roughness={0.1} clearcoat={1}
                transparent opacity={0.5} />
            </RoundedBox>
          ))}
      </group>

      <group ref={straw} position={[0.28, 0.4, 0]} rotation={[0, 0, -0.16]}>
        <mesh>
          <cylinderGeometry args={[0.05, 0.05, 3.1, 12]} />
          <meshStandardMaterial color="#f4e8d8" roughness={0.5} />
        </mesh>
        {[-0.8, 0, 0.8].map((y, i) => (
          <mesh key={i} position={[0, y, 0]}>
            <cylinderGeometry args={[0.053, 0.053, 0.28, 12]} />
            <meshStandardMaterial color="#c8382a" roughness={0.5} />
          </mesh>
        ))}
      </group>

      <group ref={slice} position={[0.92, 1.28, 0]} rotation={[0, 0.4, 0.35]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.52, 0.52, 0.07, 32]} />
          <meshStandardMaterial color="#f0922a" roughness={0.5} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.04]}>
          <cylinderGeometry args={[0.43, 0.43, 0.02, 32]} />
          <meshStandardMaterial color="#ffd27a" roughness={0.6} />
        </mesh>
      </group>

      <Rising position={[0, -0.9, 0]} spread={1.1} height={2} count={26} size={0.035}
        opacity={0.55} grow={false} color="#ffffff" seed={3} />
    </group>
  );
};

/* =========================================================
   PLATE (fallback / dessert)
========================================================= */

const Plate = () => {
  const root = useRef();
  const cloche = useRef();
  const plate = useMemo(plateGeo, []);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(root.current.position, { y: -3, duration: 1, ease: "power3.out" });
      gsap.timeline({ delay: 1.1 })
        .to(cloche.current.position, { y: 2.3, duration: 1.2, ease: "power3.inOut" })
        .to(cloche.current.rotation, { y: Math.PI * 2, duration: 1.2, ease: "power3.inOut" }, 0)
        .to(cloche.current.position, {
          y: "+=0.15", duration: 2.2, yoyo: true, repeat: -1, ease: "sine.inOut",
        });
    });
    return () => ctx.revert();
  }, []);

  return (
    <group ref={root} position={[0, -1.35, 0]} scale={0.8}>
      <mesh geometry={plate}>
        <meshStandardMaterial color="#f6f1ea" roughness={0.3} side={THREE.DoubleSide} />
      </mesh>
      <group ref={cloche}>
        <mesh>
          <sphereGeometry args={[1.55, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#d8d8dc" metalness={1} roughness={0.14} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 1.62, 0]}>
          <sphereGeometry args={[0.14, 16, 16]} />
          <meshStandardMaterial color="#d8d8dc" metalness={1} roughness={0.14} />
        </mesh>
      </group>
      <Rising position={[0, 0.9, 0]} spread={0.9} height={1.8} size={0.26} />
    </group>
  );
};

/* =========================================================
   RICE
========================================================= */

const GRAINS = 3200;
const clamp01 = (n) => Math.min(1, Math.max(0, n));
const MOUND_R = 1.1;
const MOUND_H = 0.85;

const moundHeight = (rr) =>
  MOUND_H * Math.pow(Math.max(0, 1 - (rr / MOUND_R) ** 2), 0.65);

const Rice = ({ name }) => {
  const root = useRef();
  const grains = useRef();
  const core = useRef();
  const bits = useRef();
  const bitsGroup = useRef();
  const toppings = useRef();
  const progress = useRef({ v: 0 });
  const settled = useRef(false);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const plate = useMemo(plateGeo, []);
  const white = /white|coconut|basmati|plain|steamed/i.test(name);

  const data = useMemo(() => {
    const r = rng(31);
    return Array.from({ length: GRAINS }, () => {
      const a = r() * Math.PI * 2;
      const rr = MOUND_R * Math.sqrt(r());
      const y = 0.06 + moundHeight(rr) *
        (r() < 0.25 ? r() : 0.55 + 0.45 * Math.pow(r(), 0.35));
      const x = Math.cos(a) * rr;
      const z = Math.sin(a) * rr;
      return {
        x, y, z,
        rx: (r() - 0.5) * 0.9,
        ry: r() * Math.PI,
        rz: (r() - 0.5) * 0.9,
        len: 0.05 + r() * 0.022,
        w: 0.02 + r() * 0.006,
        delay: (y / MOUND_H) * 0.42 + r() * 0.18,
        sx: x * 0.5 + (r() - 0.5) * 0.6,
        sy: y + 2.4 + r() * 1.4,
        sz: z * 0.5 + (r() - 0.5) * 0.6,
        spin: (r() - 0.5) * 6,
      };
    });
  }, []);

  const bitData = useMemo(() => {
    const r = rng(55);
    const cols = ["#7a1e0e", "#3f7a2a", "#e0b13a", "#5a1208"];
    return Array.from({ length: 70 }, () => {
      const a = r() * Math.PI * 2;
      const rr = MOUND_R * 0.95 * Math.sqrt(r());
      return {
        x: Math.cos(a) * rr,
        y: 0.06 + moundHeight(rr) * 0.97,
        z: Math.sin(a) * rr,
        s: 0.03 + r() * 0.03,
        c: cols[Math.floor(r() * cols.length)],
      };
    });
  }, []);

  useLayoutEffect(() => {
    const r = rng(77);
    const c = new THREE.Color();
    const palette = white
      ? ["#f4eddc", "#ece2cb", "#fbf6ea", "#f4eddc"]
      : ["#d05a22", "#c24c18", "#d05a22", "#dd7430", "#a93a12", "#e48b3e"];

    data.forEach((_, i) => {
      c.set(palette[Math.floor(r() * palette.length)])
        .offsetHSL((r() - 0.5) * 0.02, (r() - 0.5) * 0.1, (r() - 0.5) * 0.07);
      grains.current.setColorAt(i, c);
    });
    grains.current.instanceColor.needsUpdate = true;

    if (bits.current) {
      bitData.forEach((b, i) => {
        dummy.position.set(b.x, b.y, b.z);
        dummy.rotation.set(r() * 3, r() * 3, r() * 3);
        dummy.scale.set(b.s * 1.4, b.s * 0.7, b.s);
        dummy.updateMatrix();
        bits.current.setMatrixAt(i, dummy.matrix);
        bits.current.setColorAt(i, c.set(b.c));
      });
      bits.current.instanceMatrix.needsUpdate = true;
      bits.current.instanceColor.needsUpdate = true;
    }
  }, [data, bitData, white, dummy]);

  useFrame(() => {
    if (settled.current) return;
    const v = progress.current.v;
    data.forEach((g, i) => {
      const e = 1 - Math.pow(1 - clamp01((v - g.delay) / 0.4), 3);
      dummy.position.set(
        g.sx + (g.x - g.sx) * e,
        g.sy + (g.y - g.sy) * e,
        g.sz + (g.z - g.sz) * e
      );
      dummy.rotation.set(
        g.rx + (1 - e) * g.spin,
        g.ry + (1 - e) * g.spin * 0.6,
        g.rz
      );
      dummy.scale.set(g.len, g.w, g.w);
      dummy.updateMatrix();
      grains.current.setMatrixAt(i, dummy.matrix);
    });
    grains.current.instanceMatrix.needsUpdate = true;
    if (v >= 1) settled.current = true;
  });

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(root.current.position, { y: -3, duration: 1, ease: "power3.out" });
      gsap.from(core.current.scale, { y: 0.001, duration: 1.8, ease: "power2.out", delay: 0.8 });
      gsap.to(progress.current, { v: 1, duration: 2.6, ease: "none", delay: 0.5 });
      if (bitsGroup.current) {
        gsap.from(bitsGroup.current.scale, {
          x: 0.01, y: 0.01, z: 0.01, duration: 1, ease: "power2.out", delay: 2.6,
        });
      }
      gsap.from(toppings.current.position, {
        y: "+=3", duration: 1.1, ease: "bounce.out", delay: 2.5,
      });
      gsap.from(toppings.current.rotation, {
        y: -1.2, duration: 1.4, ease: "power3.out", delay: 2.5,
      });
      gsap.to(root.current.position, {
        y: "+=0.08", duration: 2.6, yoyo: true, repeat: -1,
        ease: "sine.inOut", delay: 4,
      });
    });
    return () => ctx.revert();
  }, []);

  const slices = [
    [-1.05, 1.15, 0.2], [-0.55, 1.42, -0.15], [-0.02, 1.5, 0.3],
    [0.5, 1.4, -0.1], [-1.4, 0.55, 0.35],
  ];

  return (
    <group ref={root} position={[0, -1.35, 0]} scale={0.8}>
      <mesh geometry={plate}>
        <meshStandardMaterial color="#f6f1ea" roughness={0.28} side={THREE.DoubleSide} />
      </mesh>

      <mesh ref={core} position={[0, 0.05, 0]}
        scale={[MOUND_R * 0.96, MOUND_H * 0.9, MOUND_R * 0.96]}>
        <sphereGeometry args={[1, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={white ? "#d9cfb8" : "#8c2f10"} roughness={0.85} />
      </mesh>

      <instancedMesh ref={grains} args={[null, null, GRAINS]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial roughness={0.48} metalness={0} />
      </instancedMesh>

      {!white && (
        <group ref={bitsGroup}>
          <instancedMesh ref={bits} args={[null, null, bitData.length]}>
            <sphereGeometry args={[1, 8, 6]} />
            <meshStandardMaterial roughness={0.6} />
          </instancedMesh>
        </group>
      )}

      <group ref={toppings}>
        {slices.map(([x, z, tilt], i) => (
          <group key={i} position={[x, 0.13, z]} rotation={[0, i * 1.3, tilt * 0.4]}
            scale={[1.25, 1, 0.85]}>
            <mesh>
              <cylinderGeometry args={[0.3, 0.3, 0.1, 28]} />
              <meshStandardMaterial color="#8f4f14" roughness={0.55} />
            </mesh>
            <mesh position={[0, 0.056, 0]}>
              <cylinderGeometry args={[0.25, 0.25, 0.02, 28]} />
              <meshStandardMaterial color="#eab04a" roughness={0.5} />
            </mesh>
          </group>
        ))}

        <group position={[1.25, 0.38, 0.55]} rotation={[0, -0.55, 0.22]}>
          <mesh scale={[0.62, 0.4, 0.4]}>
            <sphereGeometry args={[1, 24, 16]} />
            <meshPhysicalMaterial color="#7d3812" roughness={0.42} clearcoat={0.5} />
          </mesh>
          <mesh position={[0.62, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <cylinderGeometry args={[0.07, 0.2, 0.6, 16]} />
            <meshPhysicalMaterial color="#7d3812" roughness={0.42} clearcoat={0.5} />
          </mesh>
          <mesh position={[1.08, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <cylinderGeometry args={[0.05, 0.05, 0.35, 12]} />
            <meshStandardMaterial color="#efe6d4" roughness={0.6} />
          </mesh>
        </group>
      </group>

      <Rising position={[0, 1, 0]} spread={1.1} height={1.8} size={0.26} count={16} seed={9} />
    </group>
  );
};

/* =========================================================
   PIZZA
========================================================= */

const SLICES = 8;
const SL = (Math.PI * 2) / SLICES;
const PR = 1.75;

const Pizza = ({ name }) => {
  const root = useRef();
  const slices = useRef([]);
  const meat = !/margherita|veg|cheese|plain/i.test(name);

  const parts = useMemo(() =>
    Array.from({ length: SLICES }, (_, i) => {
      const r = rng(100 + i);
      const blobs = Array.from({ length: 4 }, () => {
        const phi = (0.18 + 0.64 * r()) * SL;
        const rad = (0.3 + 0.5 * r()) * PR;
        return {
          p: [Math.sin(phi) * rad, 0.15, Math.cos(phi) * rad],
          s: [0.2 + r() * 0.16, 0.05, 0.2 + r() * 0.16],
          brown: r() < 0.3,
        };
      });
      const puffs = Array.from({ length: 5 }, (_, k) => {
        const phi = (0.1 + 0.8 * (k / 4)) * SL;
        return {
          p: [Math.sin(phi) * PR * 0.96, 0.13, Math.cos(phi) * PR * 0.96],
          char: r() < 0.22,
          s: 0.18 + r() * 0.03,
        };
      });
      return { blobs, puffs };
    }), []);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(root.current.position, { y: -3, duration: 1, ease: "power3.out" });
      slices.current.forEach((g, i) => {
        const mid = i * SL + SL / 2;
        const delay = 0.4 + i * 0.11;
        gsap.from(g.position, {
          x: Math.sin(mid) * 3.2, z: Math.cos(mid) * 3.2, y: 2.6,
          duration: 1, ease: "back.out(1.5)", delay,
        });
        gsap.from(g.rotation, {
          x: (i % 2 ? 1 : -1) * 1.4, z: (i % 2 ? -1 : 1) * 0.9,
          duration: 1, ease: "power3.out", delay,
        });
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <group ref={root} position={[0, -1.3, 0]} scale={0.85}>
      <mesh position={[0, -0.07, 0]}>
        <cylinderGeometry args={[2.3, 2.3, 0.14, 64]} />
        <meshStandardMaterial color="#8a5a34" roughness={0.78} />
      </mesh>

      {parts.map((part, i) => {
        const mid = SL / 2;
        return (
          <group key={i} ref={(el) => (slices.current[i] = el)}>
            <group rotation={[0, i * SL, 0]}>
              <mesh position={[0, 0.05, 0]}>
                <cylinderGeometry args={[PR, PR, 0.1, 14, 1, false, 0, SL - 0.012]} />
                <meshStandardMaterial color="#e2b068" roughness={0.85} />
              </mesh>
              <mesh position={[0, 0.1, 0]}>
                <cylinderGeometry args={[PR * 0.92, PR * 0.92, 0.04, 12, 1, false, 0, SL - 0.012]} />
                <meshStandardMaterial color="#b8321c" roughness={0.5} />
              </mesh>
              <mesh position={[0, 0.125, 0]}>
                <cylinderGeometry args={[PR * 0.84, PR * 0.84, 0.05, 12, 1, false, 0, SL - 0.012]} />
                <meshPhysicalMaterial color="#f5dc8e" roughness={0.38} clearcoat={0.5} />
              </mesh>

              {part.blobs.map((b, k) => (
                <mesh key={k} position={b.p} scale={b.s}>
                  <sphereGeometry args={[1, 14, 8]} />
                  <meshStandardMaterial color={b.brown ? "#d9a243" : "#f5dc8e"} roughness={0.4} />
                </mesh>
              ))}

              {part.puffs.map((c, k) => (
                <mesh key={k} position={c.p} scale={[c.s, c.s * 0.72, c.s]}>
                  <sphereGeometry args={[1, 12, 10]} />
                  <meshStandardMaterial color={c.char ? "#7a4018" : "#dba04a"} roughness={0.8} />
                </mesh>
              ))}

              {meat ? (
                <group position={[Math.sin(mid) * 1.05, 0.16, Math.cos(mid) * 1.05]}>
                  <mesh>
                    <cylinderGeometry args={[0.245, 0.245, 0.03, 24]} />
                    <meshStandardMaterial color="#7c140e" roughness={0.6} />
                  </mesh>
                  <mesh position={[0, 0.012, 0]}>
                    <cylinderGeometry args={[0.225, 0.225, 0.03, 24]} />
                    <meshPhysicalMaterial color="#a8231a" roughness={0.42} clearcoat={0.6} />
                  </mesh>
                </group>
              ) : (
                <mesh position={[Math.sin(mid) * 1.05, 0.17, Math.cos(mid) * 1.05]}
                  scale={[0.22, 0.09, 0.22]}>
                  <sphereGeometry args={[1, 16, 10]} />
                  <meshPhysicalMaterial color="#f8f2e4" roughness={0.35} clearcoat={0.6} />
                </mesh>
              )}

              {(!meat || i % 2 === 0) && (
                <mesh position={[Math.sin(mid) * 0.6, 0.17, Math.cos(mid) * 0.6]}
                  rotation={[0.1, mid, 0.15]} scale={[0.2, 0.02, 0.11]}>
                  <sphereGeometry args={[1, 12, 8]} />
                  <meshStandardMaterial color="#3f8f3a" roughness={0.55} />
                </mesh>
              )}
            </group>
          </group>
        );
      })}

      <Rising position={[0, 0.3, 0]} spread={1.8} height={1.6} size={0.28} count={16} seed={13} opacity={0.07} />
    </group>
  );
};

/* =========================================================
   BURGER
========================================================= */

const Burger = () => {
  const root = useRef();
  const layers = useRef([]);
  const top = useRef();
  const seeds = useRef();

  const bunGeo = useMemo(() =>
    lathe([[0, 0], [1.25, 0], [1.34, 0.1], [1.32, 0.26], [1.2, 0.3], [0, 0.3]]), []);
  const pattyGeo = useMemo(() =>
    lathe([[0, 0], [1.28, 0], [1.37, 0.08], [1.38, 0.24], [1.28, 0.31], [0, 0.31]]), []);

  const lettuce = useMemo(() => {
    const r = rng(41);
    return Array.from({ length: 24 }, (_, i) => {
      const a = (i / 24) * Math.PI * 2;
      return {
        p: [Math.cos(a) * (1.3 + r() * 0.12), 0.05 + r() * 0.06, Math.sin(a) * (1.3 + r() * 0.12)],
        ry: -a,
        s: [0.3 + r() * 0.1, 0.06, 0.2 + r() * 0.06],
        c: r() < 0.5 ? "#6aa83a" : "#8bc34a",
      };
    });
  }, []);

  const seedData = useMemo(() => {
    const r = rng(63);
    const o = new THREE.Object3D();
    return Array.from({ length: 52 }, () => {
      const th = 0.1 + r() * 1.05;
      const ph = r() * Math.PI * 2;
      const p = new THREE.Vector3(
        1.38 * Math.sin(th) * Math.cos(ph),
        1.38 * 0.82 * Math.cos(th),
        1.38 * Math.sin(th) * Math.sin(ph)
      );
      o.position.copy(p).multiplyScalar(1.004);
      o.lookAt(p.clone().multiplyScalar(2));
      o.rotateZ(r() * Math.PI);
      o.scale.set(0.075, 0.042, 0.022);
      o.updateMatrix();
      return o.matrix.clone();
    });
  }, []);

  useLayoutEffect(() => {
    seedData.forEach((mx, i) => seeds.current.setMatrixAt(i, mx));
    seeds.current.instanceMatrix.needsUpdate = true;
  }, [seedData]);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(root.current.position, { y: -3, duration: 0.9, ease: "power3.out" });
      gsap.from(layers.current.map((g) => g.position), {
        y: "+=4", duration: 0.9, ease: "bounce.out", stagger: 0.16, delay: 0.4,
      });
      gsap.from(root.current.rotation, { y: -2.4, duration: 2, ease: "power3.out" });
      gsap.timeline({ delay: 3.4, repeat: -1, repeatDelay: 2.4, yoyo: true })
        .to(top.current.position, { y: "+=0.95", duration: 1.1, ease: "power2.inOut" }, 0)
        .to(top.current.rotation, { z: 0.32, duration: 1.1, ease: "power2.inOut" }, 0);
    });
    return () => ctx.revert();
  }, []);

  const set = (i) => (el) => (layers.current[i] = el);
  const metal = <meshStandardMaterial color="#d8d8dc" metalness={1} roughness={0.22} />;

  return (
    <group ref={root} position={[0, -1.3, 0]}>
      <mesh position={[0, -0.06, 0]}>
        <cylinderGeometry args={[1.9, 1.9, 0.12, 48]} />
        <meshStandardMaterial color="#8a5a34" roughness={0.78} />
      </mesh>

      <group ref={set(0)}>
        <mesh geometry={bunGeo}>
          <meshStandardMaterial color="#d9964a" roughness={0.6} />
        </mesh>
      </group>

      <group ref={set(1)} position={[0, 0.3, 0]}>
        <mesh scale={[1.3, 0.03, 1.3]}>
          <cylinderGeometry args={[1, 1, 1, 32]} />
          <meshStandardMaterial color="#6aa83a" roughness={0.5} />
        </mesh>
        {lettuce.map((l, i) => (
          <mesh key={i} position={l.p} rotation={[0, l.ry, 0.1]} scale={l.s}>
            <sphereGeometry args={[1, 10, 8]} />
            <meshStandardMaterial color={l.c} roughness={0.5} />
          </mesh>
        ))}
      </group>

      <group ref={set(2)} position={[0, 0.36, 0]}>
        <mesh geometry={pattyGeo}>
          <meshStandardMaterial color="#4a2412" roughness={0.88} />
        </mesh>
      </group>

      <group ref={set(3)} position={[0, 0.68, 0]} rotation={[0, Math.PI / 4, 0]}>
        <RoundedBox args={[2.35, 0.045, 2.35]} radius={0.02} smoothness={2}>
          <meshPhysicalMaterial color="#f2b629" roughness={0.32} clearcoat={0.3} />
        </RoundedBox>
      </group>

      <group ref={set(4)} position={[0, 0.73, 0]}>
        {[[-0.25, 0, 0.1], [0.28, 0.04, -0.12]].map((p, i) => (
          <group key={i} position={p}>
            <mesh>
              <cylinderGeometry args={[0.88, 0.88, 0.08, 32]} />
              <meshStandardMaterial color="#d33a22" roughness={0.4} />
            </mesh>
          </group>
        ))}
      </group>

      <group ref={set(5)} position={[0, 0.88, 0]}>
        {[0.6, 0.38].map((r, i) => (
          <mesh key={i} rotation={[Math.PI / 2, 0, 0]} position={[i * 0.1, i * 0.01, 0]}>
            <torusGeometry args={[r, 0.028, 8, 36]} />
            <meshStandardMaterial color="#efdbe8" roughness={0.4} />
          </mesh>
        ))}
      </group>

      <group ref={set(6)} position={[0, 0.92, 0]}>
        <group ref={top}>
          <mesh scale={[1, 0.82, 1]}>
            <sphereGeometry args={[1.38, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshPhysicalMaterial color="#d68b3c" roughness={0.5} clearcoat={0.45}
              clearcoatRoughness={0.4} />
          </mesh>
          <instancedMesh ref={seeds} args={[null, null, seedData.length]}>
            <sphereGeometry args={[1, 8, 6]} />
            <meshStandardMaterial color="#f3e3b8" roughness={0.5} />
          </instancedMesh>
        </group>
      </group>

      <Rising position={[0, 0.9, 0]} spread={1.2} height={1.6} size={0.24}
        count={12} seed={17} opacity={0.06} />
    </group>
  );
};

/* =========================================================
   SALAD
========================================================= */

const Salad = () => {
  const root = useRef();
  const bowl = useRef();
  const ingredients = useRef();

  const items = useMemo(() => {
    const r = rng(81);
    return Array.from({ length: 42 }, () => {
      const angle = r() * Math.PI * 2;
      const radius = Math.sqrt(r()) * 1.15;
      return {
        x: Math.cos(angle) * radius,
        y: 0.12 + r() * 0.55,
        z: Math.sin(angle) * radius,
        scale: 0.12 + r() * 0.12,
        rotation: [r() * Math.PI, r() * Math.PI, r() * Math.PI],
        type: Math.floor(r() * 5),
      };
    });
  }, []);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(root.current.position, { y: -3, duration: 1, ease: "power3.out" });
      gsap.from(ingredients.current.scale, {
        x: 0.1, y: 0.1, z: 0.1, duration: 1.4, ease: "elastic.out(1, 0.6)", delay: 0.4,
      });
      gsap.from(bowl.current.rotation, { y: -1.5, duration: 1.4, ease: "power3.out" });
      gsap.to(root.current.position, {
        y: "+=0.1", duration: 2.4, yoyo: true, repeat: -1,
        ease: "sine.inOut", delay: 1.8,
      });
    });
    return () => ctx.revert();
  }, []);

  const colors = ["#4f8d35", "#79ad43", "#d83d2d", "#f1b23e", "#e8e0cf"];

  return (
    <group ref={root} position={[0, -1.35, 0]} scale={0.82}>
      <group ref={bowl}>
        <mesh position={[0, -0.15, 0]}>
          <sphereGeometry args={[1.75, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshPhysicalMaterial color="#f4eee4" roughness={0.3} clearcoat={0.5} />
        </mesh>
        <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.5, 0.12, 16, 64]} />
          <meshStandardMaterial color="#ded4c4" roughness={0.35} />
        </mesh>
      </group>

      <group ref={ingredients}>
        {items.map((item, index) => (
          <mesh key={index} position={[item.x, item.y, item.z]} rotation={item.rotation}
            scale={[item.scale * 1.5, item.scale * 0.55, item.scale]}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshStandardMaterial color={colors[item.type]} roughness={0.55} />
          </mesh>
        ))}

        {[[-0.55, 0.72, 0.15], [0.48, 0.65, -0.2], [0.1, 0.76, 0.42], [-0.1, 0.63, -0.55]]
          .map((position, index) => (
            <mesh key={`t-${index}`} position={position} scale={[0.22, 0.08, 0.22]}>
              <sphereGeometry args={[1, 16, 10]} />
              <meshPhysicalMaterial color="#d93627" roughness={0.35} clearcoat={0.5} />
            </mesh>
          ))}

        {[[-0.8, 0.55, -0.1], [0.7, 0.6, 0.2], [0.25, 0.58, -0.65]]
          .map((position, index) => (
            <mesh key={`c-${index}`} position={position}
              rotation={[Math.PI / 2, 0, index]}>
              <cylinderGeometry args={[0.2, 0.2, 0.06, 24]} />
              <meshStandardMaterial color="#76a943" roughness={0.45} />
            </mesh>
          ))}

        {[[-0.35, 0.83, 0.32], [0.4, 0.8, 0.35]].map((position, index) => (
          <mesh key={`o-${index}`} position={position} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.18, 0.025, 8, 24]} />
            <meshStandardMaterial color="#f0dce6" roughness={0.35} />
          </mesh>
        ))}

        <mesh position={[0, 0.9, 0]} scale={[1, 0.025, 0.8]}>
          <sphereGeometry args={[1, 32, 16]} />
          <meshStandardMaterial color="#e5c57d" transparent opacity={0.72} roughness={0.3} />
        </mesh>
      </group>

      <Rising position={[0, 1, 0]} spread={1.2} height={1.5} size={0.18}
        count={10} seed={91} opacity={0.05} />
    </group>
  );
};

/* =========================================================
   CHICKEN
========================================================= */

const Chicken = () => {
  const root = useRef();
  const pieces = useRef();

  const chickenPieces = useMemo(() => {
    const r = rng(101);
    return Array.from({ length: 6 }, (_, i) => {
      const angle = (i / 6) * Math.PI * 2;
      const radius = 0.35 + r() * 0.55;
      return {
        x: Math.cos(angle) * radius,
        y: 0.15 + r() * 0.12,
        z: Math.sin(angle) * radius,
        scale: 0.7 + r() * 0.25,
        rotation: [(r() - 0.5) * 0.35, angle, (r() - 0.5) * 0.3],
      };
    });
  }, []);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(root.current.position, { y: -3, duration: 1, ease: "power3.out" });
      gsap.from(pieces.current.children.map((c) => c.position), {
        y: "+=2.8", duration: 1, ease: "bounce.out", stagger: 0.12, delay: 0.4,
      });
      gsap.from(root.current.rotation, { y: -1.8, duration: 1.6, ease: "power3.out" });
      gsap.to(root.current.position, {
        y: "+=0.1", duration: 2.5, yoyo: true, repeat: -1,
        ease: "sine.inOut", delay: 2,
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <group ref={root} position={[0, -1.35, 0]} scale={0.82}>
      <mesh geometry={plateGeo()}>
        <meshStandardMaterial color="#f6f1ea" roughness={0.28} side={THREE.DoubleSide} />
      </mesh>

      <group ref={pieces}>
        {chickenPieces.map((piece, index) => (
          <group key={index} position={[piece.x, piece.y, piece.z]}
            rotation={piece.rotation} scale={piece.scale}>
            <mesh scale={[0.75, 0.52, 0.55]}>
              <sphereGeometry args={[1, 24, 16]} />
              <meshPhysicalMaterial color="#9a4818" roughness={0.48} clearcoat={0.35} />
            </mesh>
            <mesh position={[0, 0.22, 0]} scale={[0.62, 0.12, 0.48]}>
              <sphereGeometry args={[1, 20, 12]} />
              <meshPhysicalMaterial color="#d27a27" roughness={0.5} clearcoat={0.4} />
            </mesh>
            <mesh position={[0.72, -0.02, 0]} rotation={[0, 0, -Math.PI / 2]}>
              <cylinderGeometry args={[0.07, 0.14, 0.75, 14]} />
              <meshStandardMaterial color="#eee2cf" roughness={0.6} />
            </mesh>
            <mesh position={[1.08, -0.02, 0]}>
              <sphereGeometry args={[0.11, 12, 10]} />
              <meshStandardMaterial color="#f0e5d2" roughness={0.6} />
            </mesh>
            {[-0.22, 0, 0.22].map((x, markIndex) => (
              <mesh key={markIndex} position={[x, 0.31, 0]}
                rotation={[0, 0, 0.55]} scale={[0.035, 0.025, 0.25]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color="#4c2412" roughness={0.8} />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      {[[-1.1, 0.13, 0.8], [1.0, 0.13, -0.8], [-0.9, 0.13, -0.8]].map((position, index) => (
        <mesh key={index} position={position} scale={[0.22, 0.035, 0.12]}
          rotation={[0, index, 0.2]}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshStandardMaterial color="#4c9638" roughness={0.5} />
        </mesh>
      ))}

      <Rising position={[0, 0.8, 0]} spread={1.1} height={1.6} size={0.22}
        count={14} seed={111} opacity={0.07} />
    </group>
  );
};

/* =========================================================
   GENERIC PHOTO PLATE
========================================================= */

const PhotoPlate = ({ url }) => {
  const tex = useTexture(url);
  const root = useRef();
  const plate = useMemo(plateGeo, []);

  const cap = useMemo(() => {
    const R = 2.97;
    const g = new THREE.SphereGeometry(R, 56, 24, 0, Math.PI * 2, 0, 0.55);
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    const half = R * Math.sin(0.55);
    for (let i = 0; i < pos.count; i++) {
      uv.setXY(
        i,
        pos.getX(i) / (2 * half) + 0.5,
        1 - (pos.getZ(i) / (2 * half) + 0.5)
      );
    }
    g.translate(0, -R * Math.cos(0.55) + 0.08, 0);
    return g;
  }, []);

  useLayoutEffect(() => {
    if ("colorSpace" in tex) tex.colorSpace = THREE.SRGBColorSpace;
    const ctx = gsap.context(() => {
      gsap.from(root.current.position, { y: -3, duration: 1.1, ease: "power3.out" });
      gsap.from(root.current.scale, {
        x: 0.2, y: 0.2, z: 0.2, duration: 1.4, ease: "elastic.out(1, 0.6)",
      });
      gsap.to(root.current.position, {
        y: "+=0.1", duration: 2.4, yoyo: true, repeat: -1,
        ease: "sine.inOut", delay: 1.6,
      });
    });
    return () => ctx.revert();
  }, [tex]);

  return (
    <group ref={root} position={[0, -1.3, 0]} scale={0.8}>
      <mesh geometry={plate}>
        <meshStandardMaterial color="#f6f1ea" roughness={0.28} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={cap} position={[0, 0.2, 0]}>
        <meshStandardMaterial map={tex} roughness={0.6} />
      </mesh>
      <Rising position={[0, 0.8, 0]} spread={1.1} height={1.7} size={0.26} />
    </group>
  );
};

/* =========================================================
   ERROR BOUNDARY
========================================================= */

class Boundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/* =========================================================
   REAL GLB MODEL
========================================================= */

const Model = ({ url }) => {
  const { scene } = useGLTF(url);
  const root = useRef();

  const object = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const s = 2.8 / Math.max(size.x, size.y, size.z);
    clone.scale.setScalar(s);
    clone.position.set(-center.x * s, -1.4 - box.min.y * s, -center.z * s);
    return clone;
  }, [scene]);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(root.current.scale, {
        x: 0.01, y: 0.01, z: 0.01, duration: 1.4, ease: "elastic.out(1, 0.6)",
      });
      gsap.from(root.current.rotation, { y: -3, duration: 1.8, ease: "power3.out" });
    });
    return () => ctx.revert();
  }, []);

  return (
    <group ref={root}>
      <primitive object={object} />
    </group>
  );
};

/* =========================================================
   SCENE MAP
========================================================= */

const scenes = {
  fries: Fries,
  spaghetti: Spaghetti,
  rice: Rice,
  pizza: Pizza,
  burger: Burger,
  drink: Drink,
  dessert: Plate,
  salad: Salad,
  chicken: Chicken,
  plate: Plate,
};

/* =========================================================
   DISH SCENE
========================================================= */

const DishScene = ({ item }) => {
  const kind = pickScene(item);
  const Scene = scenes[kind] || Plate;

  const type = String(item?.animationType || "").toLowerCase().trim();
  const modelUrl = item?.modelUrl;
  const useCustomModel = type === "model" && Boolean(modelUrl);
  const usePhoto = type === "photo" && Boolean(item?.image);

  return (
    <Canvas
      camera={{ position: [0, 1.3, 6.4], fov: 34 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
    >
      <Environment resolution={128} frames={1} environmentIntensity={0.9}>
        <Lightformer form="rect" intensity={6} position={[-4, 2, 2]}
          scale={[2, 6, 1]} color="#ffd9b0" />
        <Lightformer form="rect" intensity={4} position={[4, 3, -2]}
          scale={[2, 5, 1]} color="#ffffff" />
        <Lightformer form="ring" intensity={3} position={[0, 5, 0]}
          scale={4} rotation-x={Math.PI / 2} color="#ffb877" />
      </Environment>

      <spotLight position={[3, 6, 4]} angle={0.45} penumbra={1}
        intensity={55} color="#ffe2c7" />

      {useCustomModel ? (
        <Boundary key={`model-${modelUrl}`} fallback={<Scene name={item?.name || ""} />}>
          <Suspense fallback={null}>
            <Model url={modelUrl} />
          </Suspense>
        </Boundary>
      ) : usePhoto ? (
        <Boundary key={`photo-${item.image}`} fallback={<Scene name={item?.name || ""} />}>
          <Suspense fallback={null}>
            <PhotoPlate url={item.image} />
          </Suspense>
        </Boundary>
      ) : (
        <Scene key={`${kind}-${item?._id || item?.name || "dish"}`} name={item?.name || ""} />
      )}

      <ContactShadows position={[0, -1.42, 0]} opacity={0.55} scale={7}
        blur={2.6} far={2.5} resolution={256} />

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={1.1}
        minPolarAngle={Math.PI / 3.2}
        maxPolarAngle={Math.PI / 2.1}
      />
    </Canvas>
  );
};

export default DishScene;