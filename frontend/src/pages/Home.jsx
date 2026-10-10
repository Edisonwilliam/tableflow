import { Link } from "react-router-dom";
import { useLayoutEffect, useRef, useState, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import Navbar from "../components/Navbar";
import DrinkHero from "../three/DrinkHero";
import "../section.css";

gsap.registerPlugin(ScrollTrigger);

const img = (id, w = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

const steps = [
  ["01", "Discover", "Browse restaurants, menus and drinks, with photos of the room before you decide."],
  ["02", "Choose", "Pick the seat that suits the evening: a window, the counter, a quiet corner."],
  ["03", "Reserve", "Set the date, time and party size. Your table is held before you arrive."],
];

const spaces = [
  ["Window tables", "Natural light at lunch, city glow at night.", "photo-1517248135467-4c7edcad34c4"],
  ["Chef's counter", "Sit close to the kitchen and watch the plates come together.", "photo-1414235077428-338989a2e8c0"],
  ["Private dining", "A closed room for birthdays, dinners and small celebrations.", "photo-1559339352-11d035aa65de"],
  ["Garden terrace", "Open-air tables for long, unhurried evenings.", "photo-1424847651672-bf20a4b0982b"],
];

/* =========================================================
   AUTH DETECTION
   Works with plain string tokens, JSON blobs, and either
   localStorage or sessionStorage. Covers the common key names
   used by most React auth setups.
========================================================= */

const STORAGE_KEYS = [
  "token",
  "authToken",
  "accessToken",
  "access_token",
  "jwt",
  "auth",
  "user",
  "userInfo",
  "currentUser",
  "tableflow_user",
  "tableflow_token",
];

const storageHasAuth = (store) => {
  if (!store) return false;

  for (const key of STORAGE_KEYS) {
    let raw;
    try {
      raw = store.getItem(key);
    } catch {
      continue;
    }

    if (!raw) continue;

    // Plain string token (not JSON)
    if (!raw.startsWith("{")) {
      if (raw.length > 10) return true;
      continue;
    }

    // JSON blob — check for meaningful auth fields
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") continue;

      if (
        parsed.token ||
        parsed.accessToken ||
        parsed.jwt ||
        parsed._id ||
        parsed.id ||
        parsed.email ||
        parsed.user ||
        parsed.isAuthenticated === true
      ) {
        return true;
      }
    } catch {
      // Non-empty, non-JSON — treat as a token
      return true;
    }
  }

  return false;
};

const isLoggedIn = () => {
  if (typeof window === "undefined") return false;
  return (
    storageHasAuth(window.localStorage) ||
    storageHasAuth(window.sessionStorage)
  );
};

/* =========================================================
   HOME
========================================================= */

const Home = () => {
  const rootRef = useRef(null);
  const [authed, setAuthed] = useState(() => isLoggedIn());

  /* ---------- keep auth state in sync ---------- */
  useEffect(() => {
    const sync = () => setAuthed(isLoggedIn());

    // run once on mount (in case initial state was stale)
    sync();

    window.addEventListener("storage", sync); // other tabs
    window.addEventListener("focus", sync);   // user returns to tab
    window.addEventListener("pageshow", sync); // back/forward cache

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
      window.removeEventListener("pageshow", sync);
    };
  }, []);

  /* ---------- destinations ---------- */
  const exploreTo = authed ? "/restaurants" : "/register";
  const reserveTo = authed ? "/restaurants" : "/register";

  /* ---------- animations ---------- */
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      /* HERO */
      const copy = [
        ".tf-hero-kicker",
        ".tf-hero-title",
        ".tf-hero-description",
        ".tf-hero-actions",
        ".tf-hero-note",
      ];
      gsap.set(copy, { opacity: 0, y: 40 });
      gsap.set([".tf-hero-side-label", ".tf-hero-scroll"], { opacity: 0 });
      gsap
        .timeline({ defaults: { ease: "power3.out" }, delay: 0.2 })
        .to(copy, { opacity: 1, y: 0, duration: 0.9, stagger: 0.12 })
        .to(
          [".tf-hero-side-label", ".tf-hero-scroll"],
          { opacity: 1, duration: 0.8 },
          "-=0.4"
        );

      gsap.to(".tf-hero-copy", {
        y: -90,
        opacity: 0.15,
        ease: "none",
        scrollTrigger: {
          trigger: ".tf-hero",
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      /* EXPERIENCE */
      gsap
        .timeline({
          scrollTrigger: {
            trigger: ".tf-xp-list",
            start: "top 75%",
            once: true,
          },
          defaults: { ease: "power2.out" },
        })
        .from(".tf-xp-line", {
          scaleX: 0,
          transformOrigin: "left",
          duration: 1,
          stagger: 0.15,
        })
        .from(
          ".tf-xp-row > *:not(.tf-xp-line)",
          { opacity: 0, y: 12, duration: 0.7, stagger: 0.04 },
          "-=0.8"
        );

      /* SPACES — pinned horizontal gallery */
      const mm = gsap.matchMedia();
      mm.add("(min-width: 901px)", () => {
        const track = document.querySelector(".tf-gal-track");
        if (!track) return;

        const dist = () =>
          Math.max(
            0,
            track.getBoundingClientRect().width - window.innerWidth + 40
          );

        const st = {
          trigger: ".tf-gal",
          start: "top top",
          end: () => `+=${dist()}`,
          scrub: 0.4,
          invalidateOnRefresh: true,
        };

        gsap.to(track, {
          x: () => -dist(),
          ease: "none",
          scrollTrigger: { ...st, pin: true },
        });

        gsap.to(".tf-gal-progress span", {
          scaleX: 1,
          ease: "none",
          scrollTrigger: { ...st, scrub: true },
        });
      });

      /* DISCOVER */
      gsap.fromTo(
        ".tf-discover-image",
        { clipPath: "inset(12% 12% 12% 12%)", scale: 1.15 },
        {
          clipPath: "inset(0% 0% 0% 0%)",
          scale: 1,
          ease: "none",
          scrollTrigger: {
            trigger: ".tf-discover-grid",
            start: "top 85%",
            end: "top 25%",
            scrub: true,
          },
        }
      );

      gsap.from(".tf-discover-content > *", {
        y: 40,
        opacity: 0,
        duration: 0.9,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: { trigger: ".tf-discover-content", start: "top 75%" },
      });

      /* CTA */
      gsap.fromTo(
        ".tf-cta-bg",
        { yPercent: -8 },
        {
          yPercent: 8,
          ease: "none",
          scrollTrigger: {
            trigger: ".tf-cta",
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        }
      );

      gsap.from(".tf-cta-inner > *", {
        y: 36,
        opacity: 0,
        duration: 0.9,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: { trigger: ".tf-cta-inner", start: "top 80%" },
      });
    }, rootRef);

    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    document.fonts?.ready.then(refresh);

    return () => {
      window.removeEventListener("load", refresh);
      ctx.revert();
    };
  }, []);

  return (
    <main ref={rootRef} className="tf-home">
      <Navbar />

      {/* HERO */}
      <section className="tf-hero">
        <div className="tf-hero-background" />
        <div className="tf-ambient tf-ambient-one" />
        <div className="tf-ambient tf-ambient-two" />
        <div className="tf-ambient tf-ambient-three" />
        <div className="tf-grain" />

        <div className="tf-hero-inner">
          <div className="tf-hero-copy">
            <p className="tf-hero-kicker">A better way to dine</p>
            <h1 className="tf-hero-title">
              Find your
              <span>perfect table.</span>
            </h1>
            <p className="tf-hero-description">
              Discover remarkable restaurants, explore their menus, and
              reserve an experience designed around your evening.
            </p>
            <div className="tf-hero-actions">
              <Link to={reserveTo} className="tf-hero-primary">
                Reserve a table
              </Link>
              <Link to={exploreTo} className="tf-hero-secondary">
                Explore
              </Link>
            </div>
            <div className="tf-hero-note">
              <span />
              Curated dining experiences
            </div>
          </div>
          <DrinkHero />
        </div>

        <div className="tf-hero-side-label">
          <span>TABLEFLOW</span>
          <div />
          <span>01 — EXPERIENCE</span>
        </div>
        <div className="tf-hero-scroll">
          <span>Scroll to discover</span>
          <div className="tf-scroll-line" />
        </div>
      </section>

      {/* EXPERIENCE */}
      <section id="experience" className="tf-xp">
        <div className="tf-xp-inner">
          <div className="tf-xp-head">
            <h2>From first look to reserved table.</h2>
            <p>Three steps, all before you leave the house.</p>
          </div>

          <div className="tf-xp-list">
            {steps.map(([n, title, text]) => (
              <article className="tf-xp-row" key={n}>
                <span className="tf-xp-line" />
                <span className="tf-xp-num">{n}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* SPACES */}
      <section className="tf-gal">
        <div className="tf-gal-head">
          <h2>Choose where you sit.</h2>
          <p>
            Every restaurant shows its seating, so the room is never a
            surprise.
          </p>
        </div>

        <div className="tf-gal-track">
          {spaces.map(([name, text, id]) => (
            <figure className="tf-gal-card" key={name}>
              <img src={img(id, 800)} alt={name} loading="lazy" />
              <figcaption>
                <h3>{name}</h3>
                <p>{text}</p>
              </figcaption>
            </figure>
          ))}
        </div>

        <div className="tf-gal-progress">
          <span />
        </div>
      </section>

      {/* DISCOVER */}
      <section id="discover" className="tf-discover">
        <div className="tf-section-container">
          <div className="tf-discover-grid">
            <img
              src={img("photo-1515003197210-e0cd71810b5f", 1000)}
              alt="Elegant restaurant interior"
              className="tf-discover-image"
            />
            <div className="tf-discover-content">
              <p className="tf-eyebrow">More than a reservation</p>
              <h2 className="tf-discover-title">
                The experience starts before you arrive.
              </h2>
              <p>
                TableFlow brings the restaurant experience into one
                beautifully connected space.
              </p>
              <p>
                Explore what is being served, understand the space, and
                choose exactly where you want to sit.
              </p>
              <Link
                to={authed ? "/restaurants" : "/register"}
                className="tf-discover-link"
              >
                {authed ? "Start exploring →" : "Create an account →"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA + FOOTER */}
      <section className="tf-cta">
        <div
          className="tf-cta-bg"
          style={{
            backgroundImage: `url(${img(
              "photo-1555396273-367ea4eb4db5",
              1400
            )})`,
          }}
        />
        <div className="tf-cta-shade" />
        <div className="tf-cta-inner">
          <h2>Tonight's table is waiting.</h2>
          <p>
            {authed
              ? "Reserve your next table in under a minute."
              : "Create a free account and reserve in under a minute."}
          </p>
          <Link to={reserveTo} className="tf-hero-primary">
            Reserve a table
          </Link>
        </div>
        <footer className="tf-footer">
          <span>© {new Date().getFullYear()} TableFlow</span>
          <nav>
            <a href="#experience">Experience</a>
            <a href="#discover">Discover</a>
            <Link to={authed ? "/reservations" : "/login"}>
              {authed ? "My reservations" : "Log in"}
            </Link>
          </nav>
        </footer>
      </section>
    </main>
  );
};

export default Home;