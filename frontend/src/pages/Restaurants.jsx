import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import api from "../services/api";

gsap.registerPlugin(ScrollTrigger);

// brand tokens used across the page
const serif = "font-['Playfair_Display',serif]";
const shimmer = "animate-pulse bg-white/[0.05]";

const Restaurants = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState(""); // debounced search
  const [cuisine, setCuisine] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const pageRef = useRef(null);
  const searchRef = useRef(null);

  /* ---------- load ---------- */

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await api.get("/restaurants");
        setRestaurants(response.data.restaurants || []);
      } catch (err) {
        console.error("Load restaurants error:", err);
        setError(err.response?.data?.message || "Unable to load restaurants.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // debounce typing so animations don't replay on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [search]);

  // press "/" to jump to search
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ---------- derived data ---------- */

  const cuisines = useMemo(() => {
    const set = new Set(restaurants.map((r) => r.cuisine).filter(Boolean));
    return ["All", ...Array.from(set).sort()];
  }, [restaurants]);

  const filtered = useMemo(
    () =>
      restaurants.filter((r) => {
        if (cuisine !== "All" && r.cuisine !== cuisine) return false;
        if (!query) return true;
        return [r.name, r.cuisine, r.address, r.description].some((v) => v?.toLowerCase().includes(query));
      }),
    [restaurants, query, cuisine]
  );

  /* ---------- animation ---------- */

  // hero intro, once data is ready
  useLayoutEffect(() => {
    if (loading || error) return;
    const ctx = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .from("[data-eyebrow]", { opacity: 0, y: 16, duration: 0.6 })
        .from("[data-line]", { yPercent: 110, duration: 0.9, stagger: 0.12 }, "-=0.3")
        .from("[data-lead]", { opacity: 0, y: 16, duration: 0.6 }, "-=0.5")
        .from("[data-search]", { opacity: 0, y: 20, scale: 0.98, duration: 0.7 }, "-=0.45")
        .from("[data-chip]", { opacity: 0, y: 12, duration: 0.45, stagger: 0.04 }, "-=0.4");
    }, pageRef);
    return () => ctx.revert();
  }, [loading, error]);

  // cards reveal as they scroll in; replays when the list changes
  useLayoutEffect(() => {
    if (loading || error) return;
    const ctx = gsap.context(() => {
      gsap.set("[data-card]", { opacity: 0, y: 36 });
      ScrollTrigger.batch("[data-card]", {
        start: "top 92%",
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, {
            opacity: 1,
            y: 0,
            duration: 0.7,
            stagger: 0.09,
            ease: "power3.out",
            overwrite: true,
            clearProps: "transform", // hand the transform back to Tailwind's hover lift
          }),
      });
    }, pageRef);
    return () => ctx.revert();
  }, [loading, error, query, cuisine, restaurants]);

  // cursor spotlight on cards (just sets two CSS variables)
  const handleMove = (e) => {
    const card = e.target.closest?.("[data-card]");
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - r.left}px`);
    card.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  /* ---------- loading ---------- */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0d0a08]">
        <div className="mx-auto w-full max-w-[1280px] px-5 pb-28 pt-[110px] sm:px-8 lg:px-14 lg:pt-[150px]">
          <div className="mb-16 grid gap-4">
            <div className={`h-24 w-4/5 max-w-[620px] rounded-2xl ${shimmer}`} />
            <div className={`h-5 w-3/5 max-w-[480px] rounded-lg ${shimmer}`} />
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-7">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={`h-[460px] rounded-3xl border border-[#f4eee5]/10 ${shimmer}`} />
            ))}
          </div>
        </div>
      </main>
    );
  }

  /* ---------- error ---------- */

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0d0a08] px-5">
        <div className="w-full max-w-md rounded-3xl border border-[#f4eee5]/10 bg-white/[0.03] px-8 py-12 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#d8786f]/15 text-xl font-bold text-[#e79a93]">
            !
          </div>
          <h1 className={`mt-5 text-3xl font-medium text-[#fffaf3] ${serif}`}>Something went wrong</h1>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-7 text-[#a79b8e]">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-7 h-11 rounded-full bg-[#c88755] px-6 text-[13px] font-bold text-[#171310] transition hover:bg-[#dfa274] active:scale-[0.97]"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  /* ---------- page ---------- */

  return (
    <main ref={pageRef} className="relative min-h-screen overflow-x-hidden bg-[#0d0a08] text-[#f4eee5]">
      {/* ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[720px] bg-[radial-gradient(ellipse_60%_70%_at_78%_0%,rgba(200,135,85,0.16),transparent_70%),radial-gradient(ellipse_40%_50%_at_8%_30%,rgba(125,67,34,0.14),transparent_70%)]"
      />

      {/* pt clears the absolutely positioned navbar */}
      <div className="relative mx-auto w-full max-w-[1280px] px-5 pb-28 pt-[110px] sm:px-8 lg:px-14 lg:pt-[150px]">
        {/* HERO */}
        <header className="mb-14 max-w-[760px] lg:mb-[72px]">
          <p
            data-eyebrow
            className="mb-6 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#dfa274] before:h-px before:w-[34px] before:bg-[#c88755] before:content-['']"
          >
            Discover &amp; reserve
          </p>

          <h1 className={`m-0 text-[clamp(44px,7vw,92px)] font-medium leading-[0.98] tracking-[-0.05em] text-[#fffaf3] ${serif}`}>
            <span className="block overflow-hidden pb-[0.08em]">
              <span data-line className="inline-block">Find your next</span>
            </span>
            <span className="block overflow-hidden pb-[0.08em]">
              <span data-line className="inline-block italic text-[#dfa274]">memorable table.</span>
            </span>
          </h1>

          <p data-lead className="mt-7 max-w-[500px] text-base leading-[1.75] text-[#c8bdb0]">
            Explore restaurants, discover their menus, and reserve a table in just a few moments.
          </p>

          {/* search */}
          <label
            data-search
            className="mt-10 flex h-[58px] max-w-[620px] items-center gap-3.5 rounded-full border border-[#f4eee5]/[0.18] bg-white/[0.04] pl-5 pr-3 transition duration-300 focus-within:border-[#dfa274]/70 focus-within:bg-white/[0.06] focus-within:shadow-[0_0_0_5px_rgba(200,135,85,0.1),0_18px_50px_rgba(0,0,0,0.35)] sm:h-16"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="h-5 w-5 shrink-0 text-[#dfa274]">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>

            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search restaurants, cuisine or location"
              aria-label="Search restaurants"
              className="h-full min-w-0 flex-1 border-0 bg-transparent text-[15px] text-[#fffaf3] outline-none placeholder:text-[#c8bdb0]/45"
            />

            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="h-[38px] rounded-full bg-white/[0.08] px-4 text-xs font-semibold text-[#f4eee5] transition hover:bg-white/[0.14]"
              >
                Clear
              </button>
            ) : (
              <kbd className="mr-1 hidden h-7 w-7 place-items-center rounded-lg border border-[#f4eee5]/[0.18] text-xs font-semibold text-[#a79b8e] sm:grid">
                /
              </kbd>
            )}
          </label>

          {/* cuisine chips */}
          {cuisines.length > 2 && (
            <div role="tablist" aria-label="Filter by cuisine" className="mt-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {cuisines.map((c) => (
                <button
                  key={c}
                  data-chip
                  type="button"
                  role="tab"
                  aria-selected={cuisine === c}
                  onClick={() => setCuisine(c)}
                  className={`h-[38px] shrink-0 rounded-full border px-[18px] text-[13px] font-semibold transition duration-300 ${
                    cuisine === c
                      ? "border-[#c88755] bg-[#c88755] text-[#171310]"
                      : "border-[#f4eee5]/10 text-[#c8bdb0] hover:border-[#dfa274]/50 hover:text-[#f4eee5]"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </header>

        {/* LIST */}
        <section>
          <div className="mb-9 flex items-baseline justify-between gap-4 border-b border-[#f4eee5]/10 pb-5">
            <h2 className={`text-2xl font-medium tracking-[-0.02em] text-[#fffaf3] sm:text-[28px] ${serif}`}>
              {query || cuisine !== "All" ? "Results" : "Explore restaurants"}
            </h2>
            <span className="text-[13px] text-[#a79b8e]">
              {filtered.length} {filtered.length === 1 ? "restaurant" : "restaurants"}
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#f4eee5]/[0.18] px-6 py-24 text-center">
              <div className="mx-auto h-14 w-14 animate-pulse rounded-full border border-[#dfa274]/45" />
              <h3 className={`mt-5 text-[28px] font-medium text-[#fffaf3] ${serif}`}>No restaurants found</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-7 text-[#a79b8e]">
                Try another name, cuisine or location.
              </p>
              {(search || cuisine !== "All") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setCuisine("All");
                  }}
                  className="mt-7 h-11 rounded-full bg-[#c88755] px-6 text-[13px] font-bold text-[#171310] transition hover:bg-[#dfa274] active:scale-[0.97]"
                >
                  Reset filters
                </button>
              )}
            </div>
          ) : (
            <div onPointerMove={handleMove} className="grid gap-x-7 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((r) => (
                <article
                  key={r._id}
                  data-card
                  className="group relative overflow-hidden rounded-3xl border border-[#f4eee5]/10 bg-gradient-to-br from-white/[0.05] to-white/[0.012] transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1.5 hover:border-[#dfa274]/40 hover:shadow-[0_30px_60px_rgba(0,0,0,0.45)] after:pointer-events-none after:absolute after:inset-0 after:z-[3] after:bg-[radial-gradient(320px_circle_at_var(--mx,50%)_var(--my,50%),rgba(223,162,116,0.14),transparent_60%)] after:opacity-0 after:transition-opacity after:duration-300 after:content-[''] hover:after:opacity-100 lg:[&:nth-child(3n+2)]:mt-11"
                >
                  <Link
                    to={`/restaurants/${r._id}`}
                    aria-label={`View ${r.name}`}
                    className="block h-full rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-[#dfa274]"
                  >
                    {/* image */}
                    <div className="relative aspect-[4/3.4] overflow-hidden bg-[#211711]">
                      {r.image ? (
                        <img
                          src={r.image}
                          alt={r.name}
                          loading="lazy"
                          className="h-full w-full object-cover saturate-[0.85] transition duration-[900ms] ease-out group-hover:scale-[1.07] group-hover:saturate-100"
                        />
                      ) : (
                        <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_30%_20%,rgba(200,135,85,0.25),transparent_60%)]">
                          <span className={`text-[84px] font-medium text-[#dfa274]/70 ${serif}`}>
                            {r.name?.[0]?.toUpperCase() || "T"}
                          </span>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-b from-[#0d0a08]/20 via-transparent to-[#0d0a08]/75" />

                      {r.cuisine && (
                        <span className="absolute left-4 top-4 rounded-full border border-[#f4eee5]/20 bg-[#0d0a08]/55 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.04em] text-[#f4eee5] backdrop-blur-sm">
                          {r.cuisine}
                        </span>
                      )}
                    </div>

                    {/* content */}
                    <div className="p-[22px] sm:px-[26px] sm:pb-[26px] sm:pt-6">
                      <h3 className={`truncate text-[26px] font-medium tracking-[-0.02em] text-[#fffaf3] ${serif}`}>
                        {r.name}
                      </h3>

                      {r.address && (
                        <p className="mt-2.5 flex items-start gap-2 text-[13px] leading-normal text-[#a79b8e]">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="mt-0.5 h-[15px] w-[15px] shrink-0 text-[#c88755]">
                            <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
                            <circle cx="12" cy="10" r="2.5" />
                          </svg>
                          <span className="line-clamp-1">{r.address}</span>
                        </p>
                      )}

                      <p className="mt-4 line-clamp-3 min-h-[5.1em] text-sm leading-[1.7] text-[#c8bdb0]">
                        {r.description || "Discover a memorable dining experience at this TableFlow restaurant."}
                      </p>

                      <span className="mt-6 flex items-center justify-between border-t border-[#f4eee5]/10 pt-5 text-[13px] font-bold tracking-[0.02em] text-[#f4eee5]">
                        View restaurant
                        <i className="grid h-[38px] w-[38px] place-items-center rounded-full border border-[#f4eee5]/[0.18] text-[#dfa274] transition duration-300 group-hover:translate-x-1 group-hover:border-[#c88755] group-hover:bg-[#c88755] group-hover:text-[#171310]">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="h-4 w-4">
                            <path d="M5 12h14" />
                            <path d="m13 6 6 6-6 6" />
                          </svg>
                        </i>
                      </span>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default Restaurants;