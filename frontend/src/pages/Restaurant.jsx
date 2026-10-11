import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import api from "../services/api";

gsap.registerPlugin(ScrollTrigger);

const serif = "font-['Playfair_Display',serif]";
const shimmer = "animate-pulse bg-white/[0.05]";

// shared horizontal container so every section lines up
const wrap = "mx-auto w-full max-w-[1200px] px-4 min-[420px]:px-5 sm:px-8 lg:px-14";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const Arrow = ({ className = "h-4 w-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className={className}>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

const Restaurant = () => {
  const { id } = useParams();

  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const pageRef = useRef(null);

  /* ---------- load ---------- */

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const [restaurantResponse, menuResponse] = await Promise.all([
          api.get(`/restaurants/${id}`),
          api.get(`/menu/restaurant/${id}`),
        ]);

        setRestaurant(restaurantResponse.data.restaurant);
        setMenuItems(menuResponse.data.menuItems || []);
      } catch (err) {
        console.error("Load restaurant page error:", err);
        setError(err.response?.data?.message || "Unable to load this restaurant.");
      } finally {
        setLoading(false);
      }
    };

    if (id) load();
  }, [id]);

  /* ---------- derived ---------- */

  const categories = useMemo(() => {
    const unique = [...new Set(menuItems.map((i) => i.category).filter(Boolean))];
    return ["All", ...unique];
  }, [menuItems]);

  const filteredMenu = useMemo(
    () => (activeCategory === "All" ? menuItems : menuItems.filter((i) => i.category === activeCategory)),
    [menuItems, activeCategory]
  );

  /* ---------- animation ---------- */

  // hero intro, parallax and the sticky reserve bar
  useLayoutEffect(() => {
    if (loading || error || !restaurant) return;
    const reduced = prefersReducedMotion();

    const ctx = gsap.context(() => {
      if (!reduced) {
        gsap
          .timeline({ defaults: { ease: "power3.out" } })
          .fromTo("[data-hero-img]", { scale: 1.25 }, { scale: 1.08, duration: 2 }, 0)
          .from("[data-hero-in]", { opacity: 0, y: 18, duration: 0.7, stagger: 0.1 }, 0.2)
          .from("[data-hero-line]", { yPercent: 110, duration: 1, stagger: 0.1 }, 0.3);

        // image drifts slower than the page
        gsap.to("[data-hero-img]", {
          yPercent: 14,
          ease: "none",
          scrollTrigger: { trigger: "[data-hero]", start: "top top", end: "bottom top", scrub: true },
        });

        // closing call to action
        gsap.from("[data-cta] > *", {
          opacity: 0,
          y: 30,
          duration: 0.8,
          stagger: 0.12,
          ease: "power3.out",
          scrollTrigger: { trigger: "[data-cta]", start: "top 85%", once: true },
        });
      }

      // compact bar slides in after the hero (instant for reduced motion)
      gsap.set("[data-bar]", { yPercent: -100 });
      ScrollTrigger.create({
        trigger: "[data-hero]",
        start: "bottom 90px",
        onEnter: () => gsap.to("[data-bar]", { yPercent: 0, duration: reduced ? 0 : 0.4, ease: "power2.out" }),
        onLeaveBack: () => gsap.to("[data-bar]", { yPercent: -100, duration: reduced ? 0 : 0.3, ease: "power2.in" }),
      });
    }, pageRef);

    return () => ctx.revert();
  }, [loading, error, restaurant]);

  // dishes reveal as they scroll in; replays when the category changes
  useLayoutEffect(() => {
    if (loading || error || !restaurant || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.set("[data-dish]", { opacity: 0, y: 32 });
      ScrollTrigger.batch("[data-dish]", {
        start: "top 94%",
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, {
            opacity: 1,
            y: 0,
            duration: 0.65,
            stagger: 0.08,
            ease: "power3.out",
            overwrite: true,
            clearProps: "transform",
          }),
      });
    }, pageRef);

    return () => ctx.revert();
  }, [loading, error, restaurant, activeCategory, menuItems]);

  // cursor spotlight on dishes (mouse and pen only)
  const handleMove = (e) => {
    if (e.pointerType === "touch") return;
    const card = e.target.closest?.("[data-dish]");
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - r.left}px`);
    card.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  /* ---------- loading ---------- */

  if (loading) {
    return (
      <main className="min-h-[100svh] bg-[#0d0a08]" aria-busy="true" aria-label="Loading restaurant">
        <div className={`h-[70svh] w-full lg:h-[80svh] ${shimmer}`} />
        <div className={`${wrap} py-14 sm:py-16`}>
          <div className={`mb-8 h-9 w-3/4 max-w-72 rounded-xl sm:mb-10 sm:h-10 ${shimmer}`} />
          <div className="grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="overflow-hidden rounded-3xl border border-[#f4eee5]/10">
                <div className={`aspect-[4/3] ${shimmer}`} />
                <div className="grid gap-3 p-5 sm:p-6">
                  <div className={`h-6 w-2/3 rounded-md ${shimmer}`} />
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

  if (error || !restaurant) {
    return (
      <main className="grid min-h-[100svh] place-items-center bg-[#0d0a08] px-4 sm:px-5">
        <div role="alert" className="w-full max-w-md rounded-3xl border border-[#f4eee5]/10 bg-white/[0.03] px-6 py-10 text-center sm:px-8 sm:py-12">
          <div className="mx-auto h-14 w-14 rounded-full border border-[#dfa274]/45" />
          <h1 className={`mt-5 text-[26px] font-medium text-[#fffaf3] sm:text-3xl ${serif}`}>Restaurant unavailable</h1>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-7 text-[#a79b8e]">
            {error || "This restaurant could not be found."}
          </p>
          <Link
            to="/restaurants"
            className="mt-7 inline-flex h-12 items-center rounded-full bg-[#c88755] px-7 text-[13px] font-bold text-[#171310] transition hover:bg-[#dfa274] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dfa274] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0a08] active:scale-[0.97]"
          >
            Browse restaurants
          </Link>
        </div>
      </main>
    );
  }

  /* ---------- page ---------- */

  const reserveTo = `/restaurants/${restaurant._id}/reserve`;
  const ring =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dfa274] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0a08]";

  return (
    <main ref={pageRef} className="relative min-h-[100svh] overflow-x-clip bg-[#0d0a08] text-[#f4eee5]">
      {/* COMPACT BAR (appears after the hero) */}
      <div
        data-bar
        className="fixed inset-x-0 top-0 z-40 -translate-y-full border-b border-[#f4eee5]/10 bg-[#0d0a08]/85 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md"
      >
        <div className={`${wrap} flex h-14 items-center justify-between gap-3 sm:h-16 sm:gap-4`}>
          <p className={`min-w-0 truncate text-base font-medium text-[#fffaf3] sm:text-lg ${serif}`}>{restaurant.name}</p>
          <Link
            to={reserveTo}
            className={`inline-flex h-10 shrink-0 items-center rounded-full bg-[#c88755] px-4 text-xs font-bold text-[#171310] transition hover:bg-[#dfa274] active:scale-[0.97] sm:px-5 ${ring}`}
          >
            Reserve<span className="hidden min-[420px]:inline">&nbsp;a table</span>
          </Link>
        </div>
      </div>

      {/* HERO (full bleed, sits under the navbar) */}
      <section data-hero className="relative flex min-h-[78svh] items-end overflow-hidden lg:min-h-[90svh]">
        <div data-hero-img className="absolute inset-0 will-change-transform">
          {restaurant.image ? (
            <img src={restaurant.image} alt={restaurant.name} className="h-full w-full object-cover saturate-[0.9]" />
          ) : (
            <div className="h-full w-full bg-[#17100c] bg-[radial-gradient(ellipse_at_70%_30%,rgba(200,135,85,0.35),transparent_60%)]" />
          )}
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0a08] via-[#0d0a08]/65 to-[#0d0a08]/25 sm:via-[#0d0a08]/55" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d0a08]/60 via-transparent to-transparent" />

        <div className={`relative ${wrap} pb-10 pt-32 sm:pb-14 sm:pt-40 lg:pb-20`}>
          <Link
            data-hero-in
            to="/restaurants"
            className={`group mb-6 inline-flex h-10 items-center gap-2 rounded-full text-xs font-semibold tracking-[0.04em] text-[#f4eee5]/75 transition hover:text-[#f4eee5] sm:mb-8 ${ring}`}
          >
            <Arrow className="h-3.5 w-3.5 rotate-180 transition [@media(hover:hover)]:group-hover:-translate-x-1" />
            All restaurants
          </Link>

          {restaurant.cuisine && (
            <p
              data-hero-in
              className="mb-4 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#dfa274] before:h-px before:w-[28px] before:bg-[#c88755] before:content-[''] sm:mb-5 sm:before:w-[34px]"
            >
              {restaurant.cuisine}
            </p>
          )}

          <h1 className={`max-w-4xl text-[clamp(40px,10vw,104px)] font-medium leading-[1] tracking-[-0.045em] text-[#fffaf3] [overflow-wrap:anywhere] ${serif}`}>
            <span className="block overflow-hidden pb-[0.1em]">
              <span data-hero-line className="inline-block">{restaurant.name}</span>
            </span>
          </h1>

          <p data-hero-in className="mt-5 max-w-xl text-[15px] leading-[1.7] text-[#c8bdb0] sm:mt-6 sm:text-base sm:leading-[1.75]">
            {restaurant.description || "A memorable dining experience awaits."}
          </p>

          <div data-hero-in className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              to={reserveTo}
              className={`group inline-flex h-[52px] w-full items-center justify-between gap-3 rounded-full bg-[#c88755] pl-7 pr-2 text-[13px] font-bold text-[#171310] transition duration-300 hover:bg-[#dfa274] active:scale-[0.98] sm:w-auto sm:justify-start [@media(hover:hover)]:hover:shadow-[0_14px_40px_rgba(200,135,85,0.3)] ${ring}`}
            >
              Reserve a table
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#171310] text-[#dfa274] transition duration-300 [@media(hover:hover)]:group-hover:translate-x-0.5">
                <Arrow />
              </span>
            </Link>

            {restaurant.address && (
              <span className="inline-flex min-h-[52px] max-w-full items-center gap-2 rounded-full border border-[#f4eee5]/20 bg-[#0d0a08]/40 px-5 py-2 text-[13px] text-[#f4eee5]/85 backdrop-blur-sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="h-4 w-4 shrink-0 text-[#dfa274]">
                  <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
                  <circle cx="12" cy="10" r="2.5" />
                </svg>
                <span className="min-w-0 leading-snug">{restaurant.address}</span>
              </span>
            )}

            {restaurant.phone && (
              <a
                href={`tel:${restaurant.phone}`}
                className={`inline-flex h-[52px] items-center gap-2 rounded-full border border-[#f4eee5]/20 bg-[#0d0a08]/40 px-5 text-[13px] text-[#f4eee5]/85 backdrop-blur-sm transition hover:border-[#dfa274]/60 ${ring}`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="h-4 w-4 shrink-0 text-[#dfa274]">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 3.07 5.18 2 2 0 0 1 5.06 3h3a2 2 0 0 1 2 1.72c.12.9.33 1.77.62 2.61a2 2 0 0 1-.45 2.11L9 10.71a16 16 0 0 0 4.29 4.29l1.27-1.27a2 2 0 0 1 2.11-.45c.84.29 1.71.5 2.61.62A2 2 0 0 1 22 16.92Z" />
                </svg>
                {restaurant.phone}
              </a>
            )}
          </div>
        </div>
      </section>

      {/* MENU */}
      <section className={`relative ${wrap} pb-16 pt-14 sm:pb-20 sm:pt-16 lg:pt-24`}>
        <div className="flex flex-col gap-3 border-b border-[#f4eee5]/10 pb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:pb-8">
          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#dfa274] sm:mb-4">The menu</p>
            <h2 className={`text-[clamp(30px,6vw,56px)] font-medium leading-[1.05] tracking-[-0.035em] text-[#fffaf3] ${serif}`}>
              What are you craving?
            </h2>
          </div>
          <p aria-live="polite" className="text-[13px] text-[#a79b8e]">
            {filteredMenu.length} {filteredMenu.length === 1 ? "dish" : "dishes"}
          </p>
        </div>

        {/* categories stay in reach while scrolling a long menu */}
        {categories.length > 1 && (
          <div className="sticky top-14 z-30 -mx-4 bg-[#0d0a08]/85 px-4 py-3 backdrop-blur-md min-[420px]:-mx-5 min-[420px]:px-5 sm:top-16 sm:-mx-8 sm:px-8 lg:-mx-14 lg:px-14">
            <div
              role="group"
              aria-label="Menu categories"
              className="flex gap-2 overflow-x-auto [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  aria-pressed={activeCategory === category}
                  onClick={() => setActiveCategory(category)}
                  className={`h-10 shrink-0 whitespace-nowrap rounded-full border px-[18px] text-[13px] font-semibold transition duration-300 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dfa274] ${
                    activeCategory === category
                      ? "border-[#c88755] bg-[#c88755] text-[#171310]"
                      : "border-[#f4eee5]/10 text-[#c8bdb0] [@media(hover:hover)]:hover:border-[#dfa274]/50 [@media(hover:hover)]:hover:text-[#f4eee5]"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}

        {filteredMenu.length > 0 ? (
          <div
            onPointerMove={handleMove}
            className="mt-6 grid gap-5 sm:mt-8 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-7 lg:grid-cols-3 lg:gap-x-7 lg:gap-y-8"
          >
            {filteredMenu.map((item) => (
              <article
                key={item._id}
                data-dish
                className="group relative min-w-0 overflow-hidden rounded-[22px] border border-[#f4eee5]/10 bg-gradient-to-br from-white/[0.05] to-white/[0.012] transition-[transform,border-color,box-shadow] duration-300 sm:rounded-3xl [@media(hover:hover)]:hover:-translate-y-1.5 [@media(hover:hover)]:hover:border-[#dfa274]/40 [@media(hover:hover)]:hover:shadow-[0_30px_60px_rgba(0,0,0,0.45)] after:pointer-events-none after:absolute after:inset-0 after:z-[3] after:bg-[radial-gradient(320px_circle_at_var(--mx,50%)_var(--my,50%),rgba(223,162,116,0.14),transparent_60%)] after:opacity-0 after:transition-opacity after:duration-300 after:content-[''] [@media(hover:hover)]:hover:after:opacity-100"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-[#211711]">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover saturate-[0.85] transition duration-[900ms] ease-out [@media(hover:hover)]:group-hover:scale-[1.07] [@media(hover:hover)]:group-hover:saturate-100"
                    />
                  ) : (
                    <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_30%_20%,rgba(200,135,85,0.25),transparent_60%)]">
                      <span className={`text-6xl font-medium text-[#dfa274]/70 sm:text-7xl ${serif}`}>
                        {item.name?.[0]?.toUpperCase() || "M"}
                      </span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-b from-[#0d0a08]/10 via-transparent to-[#0d0a08]/60" />

                  {item.category && (
                    <span className="absolute left-3.5 top-3.5 max-w-[calc(100%-1.75rem)] truncate rounded-full border border-[#f4eee5]/20 bg-[#0d0a08]/55 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.04em] text-[#f4eee5] backdrop-blur-sm sm:left-4 sm:top-4">
                      {item.category}
                    </span>
                  )}
                </div>

                <div className="p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3 sm:gap-4">
                    <h3 className={`min-w-0 text-xl font-medium leading-tight tracking-[-0.01em] text-[#fffaf3] [overflow-wrap:anywhere] sm:text-[22px] ${serif}`}>
                      {item.name}
                    </h3>
                    <span className="shrink-0 whitespace-nowrap rounded-full bg-[#c88755]/15 px-3 py-1 text-[13px] font-bold tabular-nums text-[#dfa274]">
                      ₦{Number(item.price).toLocaleString("en-NG")}
                    </span>
                  </div>

                  <p className="mt-3 line-clamp-3 text-sm leading-[1.7] text-[#c8bdb0]">
                    {item.description || "Prepared fresh for your dining experience."}
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-dashed border-[#f4eee5]/[0.18] px-5 py-16 text-center sm:mt-10 sm:px-6 sm:py-24">
            <div className="mx-auto h-14 w-14 animate-pulse rounded-full border border-[#dfa274]/45" />
            <h3 className={`mt-5 text-2xl font-medium text-[#fffaf3] sm:text-[28px] ${serif}`}>Menu coming soon</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-7 text-[#a79b8e]">
              This restaurant hasn't added any available menu items yet.
            </p>
          </div>
        )}
      </section>

      {/* RESERVATION CTA */}
      <section className={`${wrap} pb-[max(4rem,env(safe-area-inset-bottom))] sm:pb-24`}>
        <div className="relative overflow-hidden rounded-[26px] border border-[#f4eee5]/10 bg-[#17100c] px-6 py-12 sm:rounded-[32px] sm:px-12 sm:py-16 lg:px-16 lg:py-20">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-[300px] w-[300px] rounded-full bg-[radial-gradient(circle,rgba(200,135,85,0.28),transparent_70%)] sm:h-[420px] sm:w-[420px]" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 left-1/3 h-[260px] w-[260px] rounded-full bg-[radial-gradient(circle,rgba(125,67,34,0.22),transparent_70%)] sm:h-[360px] sm:w-[360px]" />

          <div data-cta className="relative max-w-2xl">
            <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.2em] text-[#dfa274] sm:mb-5">Your table is waiting</p>

            <h2 className={`text-[clamp(32px,7vw,64px)] font-medium leading-[1.05] tracking-[-0.04em] text-[#fffaf3] ${serif}`}>
              Make your next meal <span className="italic text-[#dfa274]">worth remembering.</span>
            </h2>

            <p className="mt-4 max-w-md text-[15px] leading-[1.7] text-[#c8bdb0] sm:mt-5 sm:text-base sm:leading-[1.75]">
              Choose your date, time and table. We'll take care of the rest.
            </p>

            <Link
              to={reserveTo}
              className={`group mt-8 inline-flex h-[52px] w-full items-center justify-between gap-3 rounded-full bg-[#c88755] pl-7 pr-2 text-[13px] font-bold text-[#171310] transition duration-300 hover:bg-[#dfa274] active:scale-[0.98] sm:mt-9 sm:w-auto sm:justify-start [@media(hover:hover)]:hover:shadow-[0_14px_40px_rgba(200,135,85,0.3)] ${ring}`}
            >
              Reserve your table
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#171310] text-[#dfa274] transition duration-300 [@media(hover:hover)]:group-hover:translate-x-0.5">
                <Arrow />
              </span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Restaurant;