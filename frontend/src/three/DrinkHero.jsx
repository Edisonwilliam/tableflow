import { Canvas, useFrame } from "@react-three/fiber";
import {
  Environment,
  Lightformer,
  MeshTransmissionMaterial,
  RoundedBox,
  ContactShadows,
} from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* ---------- helpers ---------- */

const lathe = (pts, seg = 72) =>
  new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);

/* Tumbler: thick heavy base, slightly flared wall, rounded rim */
const GlassBody = () => {
  const geo = useMemo(
    () =>
      lathe([
        [0, -1.3],
        [0.7, -1.3],
        [0.76, -1.28],
        [0.8, -1.2],
        [0.9, 1.28],
        [0.93, 1.32],
        [0.96, 1.3],
        [0.95, 1.24],
        [0.85, -0.9],
        [0.62, -0.88],
        [0, -0.88],
      ]),
    []
  );
  return (
    <mesh geometry={geo}>
      <MeshTransmissionMaterial
        samples={2}
        resolution={192}
        thickness={0.3}
        roughness={0.03}
        ior={1.45}
        clearcoat={1}
      />
    </mesh>
  );
};

/* Liquid geometry starts at y=0 so GSAP can "pour" it via scale.y */
const Liquid = ({ liquidRef }) => {
  const geo = useMemo(
    () =>
      lathe([
        [0, 0],
        [0.6, 0],
        [0.84, 0.03],
        [0.88, 1.9],
        [0.87, 1.93],
        [0, 1.93],
      ]),
    []
  );
  return (
    <group ref={liquidRef} position={[0, -0.87, 0]}>
      <mesh geometry={geo}>
        <meshPhysicalMaterial
          color="#b4531f"
          roughness={0.1}
          clearcoat={0.6}
          transparent
          opacity={0.92}
        />
      </mesh>
      {/* meniscus */}
      <mesh position={[0, 1.93, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.87, 48]} />
        <meshPhysicalMaterial
          color="#d47a3a"
          roughness={0.08}
          clearcoat={1}
          transparent
          opacity={0.85}
        />
      </mesh>
    </group>
  );
};

/* Ice: rounded, clear, drifting with sin motion */
const IceCube = ({ position, rotation, size, phase, iceRef }) => {
  const local = useRef();
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + phase;
    local.current.position.y = Math.sin(t * 0.8) * 0.035;
    local.current.rotation.x = Math.sin(t * 0.5) * 0.06;
    local.current.rotation.z = Math.cos(t * 0.6) * 0.06;
  });
  return (
    <group position={position} rotation={rotation} ref={iceRef}>
      <group ref={local}>
        <RoundedBox args={[size, size, size]} radius={size * 0.16} smoothness={5}>
          <meshPhysicalMaterial
            color="#eaf3f7"
            roughness={0.1}
            clearcoat={1}
            transparent
            opacity={0.55}
            envMapIntensity={1.4}
          />
        </RoundedBox>
      </group>
    </group>
  );
};

/* Carbonation: tiny bubbles rising through the liquid */
const Bubbles = ({ count = 18 }) => {
  const mesh = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const data = useMemo(
    () =>
      Array.from({ length: count }, () => {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * 0.68;
        return {
          x: Math.cos(a) * r,
          z: Math.sin(a) * r,
          speed: 0.12 + Math.random() * 0.22,
          offset: Math.random(),
          s: 0.012 + Math.random() * 0.02,
        };
      }),
    [count]
  );

  useFrame(({ clock }) => {
    data.forEach((b, i) => {
      const p = (clock.elapsedTime * b.speed + b.offset) % 1;
      dummy.position.set(
        b.x + Math.sin(p * 12 + i) * 0.015,
        -0.8 + p * 1.7,
        b.z
      );
      dummy.scale.setScalar(b.s * (0.6 + p * 0.8));
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[null, null, count]}>
      <sphereGeometry args={[1, 10, 10]} />
      <meshBasicMaterial color="#ffe6cc" transparent opacity={0.55} />
    </instancedMesh>
  );
};

/* Orange peel twist hooked over the rim */
const PeelTwist = () => {
  const geo = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      const a = t * Math.PI * 5;
      const r = 0.1 * (1 - t * 0.35);
      pts.push(
        new THREE.Vector3(
          0.78 - t * 0.5 + Math.cos(a) * r,
          1.45 - t * 0.9 + Math.sin(a) * r,
          Math.sin(t * 3) * 0.12
        )
      );
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.028, 8);
  }, []);
  return (
    <mesh geometry={geo}>
      <meshPhysicalMaterial color="#e9822a" roughness={0.45} clearcoat={0.4} />
    </mesh>
  );
};

/* ---------- rig: all GSAP lives here ---------- */

const Rig = () => {
  const rig = useRef();
  const liquid = useRef();
  const ice = [useRef(), useRef(), useRef()];
  const peel = useRef();

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // 1. Intro: glass settles, drink pours, ice drops in
      gsap.set(liquid.current.scale, { y: 0.001 });
      gsap.set(rig.current.position, { y: 2.2 });
      gsap.set(rig.current.rotation, { y: -1.2 });
      ice.forEach((r) => gsap.set(r.current.position, { y: "+=2.5" }));
      gsap.set(peel.current.scale, { x: 0, y: 0, z: 0 });

      const tl = gsap.timeline({ delay: 0.3 });
      tl.to(rig.current.position, { y: 0, duration: 1.4, ease: "expo.out" })
        .to(rig.current.rotation, { y: 0.35, duration: 2, ease: "power3.out" }, 0)
        .to(liquid.current.scale, { y: 1, duration: 2.2, ease: "power2.inOut" }, 0.6)
        .to(
          ice.map((r) => r.current.position),
          { y: "-=2.5", duration: 1.1, ease: "bounce.out", stagger: 0.18 },
          2.1
        )
        .to(
          peel.current.scale,
          { x: 1, y: 1, z: 1, duration: 0.9, ease: "back.out(2)" },
          3
        );

      // 2. Scroll: drink turns, lifts and ice drifts apart as hero leaves
      const st = gsap.timeline({
        scrollTrigger: {
          trigger: ".tf-hero",
          start: "top top",
          end: "bottom top",
          scrub: 1.2,
        },
      });
      st.to(rig.current.rotation, { y: "+=2.6", x: 0.25, ease: "none" }, 0)
        .to(rig.current.position, { y: 0.9, ease: "none" }, 0)
        .to(rig.current.scale, { x: 1.18, y: 1.18, z: 1.18, ease: "none" }, 0);
      ice.forEach((r, i) =>
        st.to(r.current.position, { y: `+=${0.2 + i * 0.12}`, ease: "none" }, 0)
      );

      // 3. Pointer tilt, smoothed with quickTo
      const tiltX = gsap.quickTo(rig.current.rotation, "x", { duration: 1.2, ease: "power3.out" });
      const move = (e) => {
        if (ScrollTrigger.isInViewport(".tf-hero", 0.1)) {
          tiltX((e.clientY / window.innerHeight - 0.5) * 0.25);
        }
      };
      window.addEventListener("pointermove", move);
      return () => window.removeEventListener("pointermove", move);
    });
    return () => ctx.revert();
  }, []);

  return (
    <group ref={rig}>
      <GlassBody />
      <Liquid liquidRef={liquid} />
      <IceCube iceRef={ice[0]} position={[-0.3, 0.55, 0.15]} rotation={[0.3, 0.5, 0.1]} size={0.62} phase={0} />
      <IceCube iceRef={ice[1]} position={[0.3, 0.9, -0.1]} rotation={[0.1, 0.2, 0.5]} size={0.55} phase={1.3} />
      <IceCube iceRef={ice[2]} position={[-0.05, 0.1, -0.3]} rotation={[0.5, 0.9, 0.2]} size={0.5} phase={2.1} />
      <Bubbles />
      <group ref={peel}>
        <PeelTwist />
      </group>
    </group>
  );
};

/* ---------- studio lighting (no external HDR needed) ---------- */

const Studio = () => (
  <Environment resolution={128} frames={1} environmentIntensity={0.9}>
    <Lightformer form="rect" intensity={6} position={[-4, 2, 2]} scale={[2, 6, 1]} color="#ffd9b0" />
    <Lightformer form="rect" intensity={4} position={[4, 3, -2]} scale={[2, 5, 1]} color="#ffffff" />
    <Lightformer form="ring" intensity={3} position={[0, 5, 0]} scale={4} rotation-x={Math.PI / 2} color="#ffb877" />
    <Lightformer form="rect" intensity={1.5} position={[0, -3, 3]} scale={[8, 1, 1]} color="#6b3a1d" />
  </Environment>
);

/* ---------- component ---------- */

const DrinkHero = () => {
  const box = useRef();
  const [visible, setVisible] = useState(true);

  // stop rendering the 3D scene entirely while it is off screen
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0 });
    io.observe(box.current);
    return () => io.disconnect();
  }, []);

  return (
  <div ref={box} className="tf-drink-scene">
    <div className="tf-drink-halo" />

    <Canvas
      camera={{ position: [0, 0.2, 6], fov: 34 }}
      dpr={[1, 1.25]}
      frameloop={visible ? "always" : "never"}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
    >
      <Studio />
      <spotLight position={[3, 6, 4]} angle={0.4} penumbra={1} intensity={60} color="#ffe2c7" />
      <Rig />
      <ContactShadows
        position={[0, -1.42, 0]}
        opacity={0.55}
        resolution={256}
        scale={6}
        blur={2.6}
        far={2.5}
        color="#000000"
      />
    </Canvas>

    <div className="tf-drink-label">
      <p>Today's pour</p>
    </div>
  </div>
  );
};

export default DrinkHero;