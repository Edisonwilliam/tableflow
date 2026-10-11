import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import api from "../services/api";

gsap.registerPlugin(ScrollTrigger);

// brand tokens used across the page
const serif = "font-['Playfair_Display',serif]";
const shimmer = "animate-pulse bg-white/[0.05]";

// shared page container: fluid gutters, one place to tune spacing
const shell =
  "mx-auto w-full max-w-[1280px] px-4 pb-20 pt-[96px] min-[420px]:px-5 sm:px-8 sm:pb-24 sm:pt-[120px] lg:px-14 lg:pb-28 lg:pt-[150px]";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
      const tag = document.activeElement?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
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

  // hero intro, once data is ready (skipped for reduced-motion users)
  useLayoutEffect(() => {
    if (loading || error || prefersReducedMotion()) return;
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
    if (loading || error || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.set("[data-card]", { opacity: 0, y: 36 });
      ScrollTrigger.batch("[data-card]", {
        start: "top 94%",
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
    if (e.pointerType === "touch") return;
    const card = e.target.closest?.("[data-card]");
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - r.left}px`);
    card.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  /* ---------- loading ---------- */

  if (loading) {
    return (
      <main className="min-h-[100svh] bg-[#0d0a08]" aria-busy="true" aria-label="Loading restaurants">
        <div className={shell}>
          <div className="mb-12 grid gap-4 sm:mb-16">
            <div className={`h-20 w-full max-w-[620px] rounded-2xl sm:h-24 sm:w-4/5 ${shimmer}`} />
            <div className={`h-5 w-3/5 max-w-[480px] rounded-lg ${shimmer}`} />
            <div className={`mt-4 h-14 w-full max-w-[620px] rounded-full sm:h-16 ${shimmer}`} />
          </div>

          <div className="grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-7">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="overflow-hidden rounded-3xl border border-[#f4eee5]/10">
                <div className={`aspect-[4/3] ${shimmer}`} />
                <div className="grid gap-3 p-5 sm:p-6">
                  <div className={`h-6 w-2/3 rounded-md ${shimmer}`} />
                  <div className={`h-3.5 w-1/2 rounded-md ${shimmer}`} />
                  <div className={`h-3.5 w-full rounded-md ${shimmer}`} />
                  <div className={`h-3.5 w-4/5 rounded-md ${shimmer}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  /* ---------- error ---------- */

  if (error) {
    return (
      <main className="grid min-h-[100svh] place-items-center bg-[#0d0a08] px-4 sm:px-5">
        <div role="alert" className="w-full max-w-md rounded-3xl border border-[#f4eee5]/10 bg-white/[0.03] px-6 py-10 text-center sm:px-8 sm:py-12">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#d8786f]/15 text-xl font-bold text-[#e79a93]">
            !
          </div>
          <h1 className={`mt-5 text-[26px] font-medium text-[#fffaf3] sm:text-3xl ${serif}`}>Something went wrong</h1>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-7 text-[#a79b8e]">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-7 h-12 rounded-full bg-[#c88755] px-7 text-[13px] font-bold text-[#171310] transition hover:bg-[#dfa274] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dfa274] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0a08] active:scale-[0.97]"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  /* ---------- page ---------- */

  return (
    <main ref={pageRef} className="relative min-h-[100svh] overflow-x-hidden bg-[#0d0a08] text-[#f4eee5]">
      {/* ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(ellipse_80%_60%_at_80%_0%,rgba(200,135,85,0.16),transparent_70%),radial-gradient(ellipse_60%_50%_at_0%_30%,rgba(125,67,34,0.14),transparent_70%)] sm:h-[720px] lg:bg-[radial-gradient(ellipse_60%_70%_at_78%_0%,rgba(200,135,85,0.16),transparent_70%),radial-gradient(ellipse_40%_50%_at_8%_30%,rgba(125,67,34,0.14),transparent_70%)]"
      />

      {/* top padding clears the absolutely positioned navbar */}
      <div className={`relative ${shell}`}>
        {/* HERO */}
        <header className="mb-12 max-w-[760px] sm:mb-14 lg:mb-[72px]">
          <p
            data-eyebrow
            className="mb-5 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#dfa274] before:h-px before:w-[28px] before:bg-[#c88755] before:content-[''] sm:mb-6 sm:before:w-[34px]"
          >
            Discover &amp; reserve
          </p>

          <h1 className={`m-0 text-[clamp(38px,9.5vw,92px)] font-medium leading-[1] tracking-[-0.045em] text-[#fffaf3] ${serif}`}>
            <span className="block overflow-hidden pb-[0.1em]">
              <span data-line className="inline-block">Find your next</span>
            </span>
            <span className="block overflow-hidden pb-[0.1em]">
              <span data-line className="inline-block italic text-[#dfa274]">memorable table.</span>
            </span>
          </h1>

          <p data-lead className="mt-5 max-w-[500px] text-[15px] leading-[1.7] text-[#c8bdb0] sm:mt-7 sm:text-base sm:leading-[1.75]">
            Explore restaurants, discover their menus, and reserve a table in just a few moments.
          </p>

          {/* search */}
          <label
            data-search
            className="mt-8 flex h-14 max-w-[620px] items-center gap-3 rounded-full border border-[#f4eee5]/[0.18] bg-white/[0.04] pl-4 pr-2.5 transition duration-300 focus-within:border-[#dfa274]/70 focus-within:bg-white/[0.06] focus-within:shadow-[0_0_0_4px_rgba(200,135,85,0.1),0_18px_50px_rgba(0,0,0,0.35)] sm:mt-10 sm:h-16 sm:gap-3.5 sm:pl-5 sm:pr-3"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="h-5 w-5 shrink-0 text-[#dfa274]">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>

            <input
              ref={searchRef}
              type="search"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, cuisine or location"
              aria-label="Search restaurants"
              /* 16px on mobile stops iOS from zooming the page on focus */
              className="h-full min-w-0 flex-1 appearance-none border-0 bg-transparent text-base text-[#fffaf3] outline-none placeholder:text-[#c8bdb0]/45 sm:text-[15px] [&::-webkit-search-cancel-button]:hidden"
            />

            {search ? (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  searchRef.current?.focus();
                }}
                className="h-10 shrink-0 rounded-full bg-white/[0.08] px-4 text-xs font-semibold text-[#f4eee5] transition hover:bg-white/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dfa274] active:scale-[0.97]"
              >
                Clear
              </button>
            ) : (
              <kbd className="mr-1 hidden h-7 w-7 place-items-center rounded-lg border border-[#f4eee5]/[0.18] text-xs font-semibold text-[#a79b8e] [@media(hover:hover)]:grid">
                /
              </kbd>
            )}
          </label>

          {/* cuisine chips: bleed to the screen edge on mobile, fade at the right */}
          {cuisines.length > 2 && (
            <div
              role="group"
              aria-label="Filter by cuisine"
              className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-[420px]:-mx-5 min-[420px]:px-5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
            >
              {cuisines.map((c) => (
                <button
                  key={c}
                  data-chip
                  type="button"
                  aria-pressed={cuisine === c}
                  onClick={() => setCuisine(c)}
                  className={`h-10 shrink-0 whitespace-nowrap rounded-full border px-[18px] text-[13px] font-semibold transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dfa274] active:scale-[0.96] ${
                    cuisine === c
                      ? "border-[#c88755] bg-[#c88755] text-[#171310]"
                      : "border-[#f4eee5]/10 text-[#c8bdb0] [@media(hover:hover)]:hover:border-[#dfa274]/50 [@media(hover:hover)]:hover:text-[#f4eee5]"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </header>

        {/* LIST */}
        <section aria-label="Restaurants">
          <div className="mb-7 flex items-baseline justify-between gap-4 border-b border-[#f4eee5]/10 pb-4 sm:mb-9 sm:pb-5">
            <h2 className={`text-[22px] font-medium tracking-[-0.02em] text-[#fffaf3] sm:text-[28px] ${serif}`}>
              {query || cuisine !== "All" ? "Results" : "Explore restaurants"}
            </h2>
            <span aria-live="polite" className="shrink-0 text-[13px] text-[#a79b8e]">
              {filtered.length} {filtered.length === 1 ? "restaurant" : "restaurants"}
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#f4eee5]/[0.18] px-5 py-16 text-center sm:px-6 sm:py-24">
              <div className="mx-auto h-14 w-14 animate-pulse rounded-full border border-[#dfa274]/45" />
              <h3 className={`mt-5 text-2xl font-medium text-[#fffaf3] sm:text-[28px] ${serif}`}>No restaurants found</h3>
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
                  className="mt-7 h-12 rounded-full bg-[#c88755] px-7 text-[13px] font-bold text-[#171310] transition hover:bg-[#dfa274] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dfa274] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0a08] active:scale-[0.97]"
                >
                  Reset filters
                </button>
              )}
            </div>
          ) : (
            <div
              onPointerMove={handleMove}
              className="grid gap-5 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-7 lg:grid-cols-3 lg:gap-x-7 lg:gap-y-8"
            >
              {filtered.map((r) => (
                <article
                  key={r._id}
                  data-card
                  className="group relative min-w-0 overflow-hidden rounded-[22px] border border-[#f4eee5]/10 bg-gradient-to-br from-white/[0.05] to-white/[0.012] transition-[transform,border-color,box-shadow] duration-300 active:scale-[0.99] sm:rounded-3xl [@media(hover:hover)]:hover:-translate-y-1.5 [@media(hover:hover)]:hover:border-[#dfa274]/40 [@media(hover:hover)]:hover:shadow-[0_30px_60px_rgba(0,0,0,0.45)] after:pointer-events-none after:absolute after:inset-0 after:z-[3] after:bg-[radial-gradient(320px_circle_at_var(--mx,50%)_var(--my,50%),rgba(223,162,116,0.14),transparent_60%)] after:opacity-0 after:transition-opacity after:duration-300 after:content-[''] [@media(hover:hover)]:hover:after:opacity-100 lg:[&:nth-child(3n+2)]:mt-11"
                >
                  <Link
                    to={`/restaurants/${r._id}`}
                    aria-label={`View ${r.name}`}
                    className="block h-full rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#dfa274]"
                  >
                    {/* image */}
                    <div className="relative aspect-[4/3] overflow-hidden bg-[#211711] sm:aspect-[4/3.4]">
                      {r.image ? (
                        <img
                          src={r.image}
                          alt={r.name}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover saturate-[0.85] transition duration-[900ms] ease-out [@media(hover:hover)]:group-hover:scale-[1.07] [@media(hover:hover)]:group-hover:saturate-100"
                        />
                      ) : (
                        <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_30%_20%,rgba(200,135,85,0.25),transparent_60%)]">
                          <span className={`text-[72px] font-medium text-[#dfa274]/70 sm:text-[84px] ${serif}`}>
                            {r.name?.[0]?.toUpperCase() || "T"}
                          </span>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-b from-[#0d0a08]/20 via-transparent to-[#0d0a08]/75" />

                      {r.cuisine && (
                        <span className="absolute left-3.5 top-3.5 max-w-[calc(100%-1.75rem)] truncate rounded-full border border-[#f4eee5]/20 bg-[#0d0a08]/55 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.04em] text-[#f4eee5] backdrop-blur-sm sm:left-4 sm:top-4">
                          {r.cuisine}
                        </span>
                      )}
                    </div>

                    {/* content */}
                    <div className="p-5 sm:px-[26px] sm:pb-[26px] sm:pt-6">
                      <h3 className={`truncate text-[22px] font-medium tracking-[-0.02em] text-[#fffaf3] sm:text-2xl lg:text-[26px] ${serif}`}>
                        {r.name}
                      </h3>

                      {r.address && (
                        <p className="mt-2 flex items-start gap-2 text-[13px] leading-normal text-[#a79b8e] sm:mt-2.5">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="mt-0.5 h-[15px] w-[15px] shrink-0 text-[#c88755]">
                            <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
                            <circle cx="12" cy="10" r="2.5" />
                          </svg>
                          <span className="line-clamp-1">{r.address}</span>
                        </p>
                      )}

                      <p className="mt-3.5 line-clamp-3 text-sm leading-[1.7] text-[#c8bdb0] sm:mt-4 sm:min-h-[5.1em]">
                        {r.description || "Discover a memorable dining experience at this TableFlow restaurant."}
                      </p>

                      <span className="mt-5 flex items-center justify-between border-t border-[#f4eee5]/10 pt-4 text-[13px] font-bold tracking-[0.02em] text-[#f4eee5] sm:mt-6 sm:pt-5">
                        View restaurant
                        <i className="grid h-10 w-10 place-items-center rounded-full border border-[#f4eee5]/[0.18] text-[#dfa274] transition duration-300 [@media(hover:hover)]:group-hover:translate-x-1 [@media(hover:hover)]:group-hover:border-[#c88755] [@media(hover:hover)]:group-hover:bg-[#c88755] [@media(hover:hover)]:group-hover:text-[#171310]">
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