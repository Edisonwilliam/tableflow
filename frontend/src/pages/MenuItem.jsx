import {
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useParams } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import api from "../services/api";
import { themeFor } from "../three/dishTheme";

gsap.registerPlugin(ScrollTrigger);

// Load the 3D scene only when a customer opens a dish.
const DishScene = lazy(() => import("../three/DishScene"));

const serif = "font-['Playfair_Display',serif]";
const skeleton = "animate-pulse bg-white/[0.05]";

const formatPrice = (price) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(price) || 0);

const Arrow = ({ className = "h-4 w-4" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
    className={className}
  >
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

const MenuItem = () => {
  const { restaurantId, menuItemId } = useParams();

  const [items, setItems] = useState([]);
  const [restaurant, setRestaurant] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const pageRef = useRef(null);

  /*
   * -------------------------------------------------------
   * LOAD MENU
   * -------------------------------------------------------
   *
   * We use the public restaurant menu endpoint because
   * the backend already exposes the available menu items
   * through:
   *
   * GET /menu/restaurant/:restaurantId
   */
  useEffect(() => {
    let cancelled = false;

    const loadMenu = async () => {
      if (!restaurantId) {
        setError("Restaurant not found.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await api.get(
          `/menu/restaurant/${restaurantId}`
        );

        console.log(
          "TableFlow menu response:",
          response.data
        );

        if (cancelled) return;

        const data = response.data || {};

        /*
         * Your backend should return:
         *
         * {
         *   restaurant: {...},
         *   menuItems: [...]
         * }
         *
         * These fallbacks make the page tolerant of
         * slightly different response shapes.
         */
        const menuItems = Array.isArray(data.menuItems)
          ? data.menuItems
          : Array.isArray(data.menu)
          ? data.menu
          : Array.isArray(data.items)
          ? data.items
          : Array.isArray(data.data)
          ? data.data
          : [];

        setItems(menuItems);

        if (data.restaurant) {
          setRestaurant(data.restaurant);
        }
      } catch (err) {
        console.error(
          "Load menu item error:",
          err
        );

        if (cancelled) return;

        setError(
          err.response?.data?.message ||
            "Unable to load this dish."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadMenu();

    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  /*
   * -------------------------------------------------------
   * FIND CURRENT ITEM
   * -------------------------------------------------------
   *
   * URL:
   *
   * /menu/:restaurantId/item/:menuItemId
   *
   * MongoDB _id can sometimes be represented as an
   * ObjectId while the URL parameter is always a string,
   * so both sides are converted to String().
   */
  const item = useMemo(() => {
    if (!menuItemId || !items.length) {
      return null;
    }

    return (
      items.find(
        (menuItem) =>
          String(menuItem?._id) ===
          String(menuItemId)
      ) || null
    );
  }, [items, menuItemId]);

  /*
   * -------------------------------------------------------
   * DISH THEME
   * -------------------------------------------------------
   */
  const theme = useMemo(() => {
    if (!item) return null;

    try {
      return themeFor(item);
    } catch (err) {
      console.error(
        "Dish theme error:",
        err
      );

      return {
        glow: "rgba(200, 135, 85, 0.25)",
        hint: "Interactive dish",
      };
    }
  }, [item]);

  /*
   * -------------------------------------------------------
   * RELATED ITEMS
   * -------------------------------------------------------
   */
  const related = useMemo(() => {
    if (!item) return [];

    return items
      .filter(
        (menuItem) =>
          String(menuItem?._id) !==
            String(item._id) &&
          menuItem.category === item.category
      )
      .slice(0, 4);
  }, [items, item]);

  /*
   * -------------------------------------------------------
   * PAGE ANIMATIONS
   * -------------------------------------------------------
   */
  useLayoutEffect(() => {
    if (loading || !item) return;

    const ctx = gsap.context(() => {
      gsap
        .timeline({
          defaults: {
            ease: "power3.out",
          },
        })
        .from("[data-in]", {
          opacity: 0,
          y: 18,
          duration: 0.6,
          stagger: 0.09,
        })
        .from(
          "[data-line]",
          {
            yPercent: 110,
            duration: 1,
          },
          "-=0.6"
        )
        .from(
          "[data-stage]",
          {
            opacity: 0,
            scale: 0.94,
            duration: 1.2,
          },
          0
        );

      gsap.set("[data-more]", {
        opacity: 0,
        y: 28,
      });

      ScrollTrigger.batch("[data-more]", {
        start: "top 94%",
        once: true,
        onEnter: (elements) => {
          gsap.to(elements, {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.08,
            ease: "power3.out",
            clearProps: "transform",
          });
        },
      });
    }, pageRef);

    return () => ctx.revert();
  }, [loading, item]);

  /*
   * -------------------------------------------------------
   * LOADING STATE
   * -------------------------------------------------------
   */
  if (loading) {
    return (
      <main className="min-h-screen bg-[#0d0a08] px-5 pb-20 pt-[110px] sm:px-8 lg:px-14 lg:pt-[140px]">
        <div className="mx-auto grid max-w-[1280px] gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-5">
            <div
              className={`h-4 w-32 rounded-lg ${skeleton}`}
            />

            <div
              className={`h-20 w-4/5 rounded-2xl ${skeleton}`}
            />

            <div
              className={`h-24 w-full rounded-2xl ${skeleton}`}
            />
          </div>

          <div
            className={`h-[60vh] rounded-3xl ${skeleton}`}
          />
        </div>
      </main>
    );
  }

  /*
   * -------------------------------------------------------
   * ERROR / ITEM NOT FOUND
   * -------------------------------------------------------
   */
  if (error || !item) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0d0a08] px-5">
        <div className="w-full max-w-md rounded-3xl border border-[#f4eee5]/10 bg-white/[0.03] px-8 py-12 text-center">
          <div className="mx-auto h-14 w-14 rounded-full border border-[#dfa274]/45" />

          <h1
            className={`mt-5 text-3xl font-medium text-[#fffaf3] ${serif}`}
          >
            Dish unavailable
          </h1>

          <p className="mx-auto mt-2 max-w-xs text-sm leading-7 text-[#a79b8e]">
            {error ||
              "We couldn't find this dish on the menu."}
          </p>

          <Link
            to={`/menu/${restaurantId}`}
            className="mt-7 inline-flex h-11 items-center rounded-full bg-[#c88755] px-6 text-[13px] font-bold text-[#171310] transition hover:bg-[#dfa274] active:scale-[0.97]"
          >
            Back to menu
          </Link>
        </div>
      </main>
    );
  }

  /*
   * -------------------------------------------------------
   * PAGE
   * -------------------------------------------------------
   */
  return (
    <main
      ref={pageRef}
      className="relative min-h-screen overflow-x-clip bg-[#0d0a08] text-[#f4eee5]"
    >
      {/* Dish glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(
            ellipse 55% 60% at 72% 42%,
            ${theme?.glow || "rgba(200,135,85,0.25)"},
            transparent 70%
          )`,
        }}
      />

      <section className="relative mx-auto grid max-w-[1280px] items-center gap-4 px-5 pb-16 pt-[110px] sm:px-8 lg:min-h-screen lg:grid-cols-[0.85fr_1.15fr] lg:gap-8 lg:px-14 lg:pb-10 lg:pt-[110px]">
        {/* 3D STAGE */}
        <div
          data-stage
          className="relative order-first h-[52vh] min-h-[360px] lg:order-last lg:h-[82vh]"
        >
          <Suspense
            fallback={
              <div
                className={`h-full w-full rounded-3xl ${skeleton}`}
              />
            }
          >
            <DishScene item={item} />
          </Suspense>

          <p className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-2 text-[11px] font-semibold tracking-[0.12em] text-[#a79b8e]">
            <span className="h-px w-6 bg-[#c88755]/60" />

            DRAG TO TURN

            <span className="h-px w-6 bg-[#c88755]/60" />
          </p>
        </div>

        {/* COPY */}
        <div className="relative">
          <Link
            data-in
            to={`/menu/${restaurantId}`}
            className="group mb-8 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.04em] text-[#c8bdb0] transition hover:text-[#f4eee5]"
          >
            <Arrow className="h-3.5 w-3.5 rotate-180 transition group-hover:-translate-x-1" />

            Back to menu
          </Link>

          <p
            data-in
            className="mb-5 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#dfa274] before:h-px before:w-[34px] before:bg-[#c88755] before:content-['']"
          >
            {item.category || "Menu"}
          </p>

          <h1
            className={`text-[clamp(44px,6.5vw,92px)] font-medium leading-[0.98] tracking-[-0.05em] text-[#fffaf3] ${serif}`}
          >
            <span className="block overflow-hidden pb-[0.1em]">
              <span
                data-line
                className="inline-block"
              >
                {item.name}
              </span>
            </span>
          </h1>

          <div
            data-in
            className="mt-6 flex flex-wrap items-center gap-3"
          >
            <span className="rounded-full bg-[#c88755]/15 px-5 py-2 text-xl font-bold tabular-nums text-[#dfa274]">
              {formatPrice(item.price)}
            </span>

            <span className="rounded-full border border-[#f4eee5]/15 px-4 py-2 text-xs font-semibold text-[#c8bdb0]">
              {theme?.hint || "Interactive dish"}
            </span>
          </div>

          <p
            data-in
            className="mt-7 max-w-md text-base leading-[1.8] text-[#c8bdb0]"
          >
            {item.description ||
              "A delicious selection from our menu, prepared fresh for your table."}
          </p>

          <div
            data-in
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <Link
              to={`/restaurants/${restaurantId}/reserve`}
              className="group inline-flex h-[52px] items-center gap-3 rounded-full bg-[#c88755] pl-7 pr-2 text-[13px] font-bold text-[#171310] transition duration-300 hover:bg-[#dfa274] hover:shadow-[0_14px_40px_rgba(200,135,85,0.3)] active:scale-[0.98]"
            >
              Reserve a table

              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#171310] text-[#dfa274] transition duration-300 group-hover:translate-x-0.5">
                <Arrow />
              </span>
            </Link>

            <Link
              to={`/restaurants/${restaurantId}`}
              className="inline-flex h-[52px] items-center rounded-full border border-[#f4eee5]/[0.18] px-6 text-[13px] font-semibold text-[#f4eee5] transition hover:border-[#dfa274]/60 hover:bg-[#c88755]/10"
            >
              View restaurant
            </Link>
          </div>
        </div>
      </section>

      {/* MORE FROM CATEGORY */}
      {related.length > 0 && (
        <section className="relative mx-auto max-w-[1280px] px-5 pb-28 sm:px-8 lg:px-14">
          <div className="mb-8 flex items-end justify-between gap-4 border-b border-[#f4eee5]/10 pb-5">
            <h2
              className={`text-[clamp(28px,3.5vw,40px)] font-medium tracking-[-0.03em] text-[#fffaf3] ${serif}`}
            >
              More{" "}
              {item.category
                ? item.category.toLowerCase()
                : "dishes"}
            </h2>

            <Link
              to={`/menu/${restaurantId}`}
              className="text-[13px] font-semibold text-[#dfa274] transition hover:text-[#f4eee5]"
            >
              Full menu
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((relatedItem) => (
              <Link
                key={relatedItem._id}
                data-more
                to={`/menu/${restaurantId}/item/${relatedItem._id}`}
                className="group overflow-hidden rounded-3xl border border-[#f4eee5]/10 bg-gradient-to-br from-white/[0.05] to-white/[0.012] transition-[transform,border-color] duration-300 hover:-translate-y-1.5 hover:border-[#dfa274]/40"
              >
                <div className="aspect-[4/3] overflow-hidden bg-[#211711]">
                  {relatedItem.image ? (
                    <img
                      src={relatedItem.image}
                      alt={relatedItem.name}
                      loading="lazy"
                      className="h-full w-full object-cover saturate-[0.85] transition duration-700 group-hover:scale-[1.07] group-hover:saturate-100"
                    />
                  ) : (
                    <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_30%_20%,rgba(200,135,85,0.25),transparent_60%)]">
                      <span
                        className={`text-5xl text-[#dfa274]/70 ${serif}`}
                      >
                        {relatedItem.name
                          ?.charAt(0)
                          ?.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 p-5">
                  <h3
                    className={`truncate text-lg font-medium text-[#fffaf3] ${serif}`}
                  >
                    {relatedItem.name}
                  </h3>

                  <span className="shrink-0 text-[13px] font-bold tabular-nums text-[#dfa274]">
                    {formatPrice(
                      relatedItem.price
                    )}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
};

export default MenuItem;