import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import api from "../services/api";

gsap.registerPlugin(ScrollTrigger);

/* =========================================================
   TOKENS
========================================================= */

const serif = "font-['Playfair_Display',serif]";
const skeleton = "animate-pulse bg-white/[0.05]";

const glow =
  "pointer-events-none absolute inset-x-0 top-0 h-[620px] bg-[radial-gradient(ellipse_55%_70%_at_85%_0%,rgba(200,135,85,0.15),transparent_70%),radial-gradient(ellipse_40%_50%_at_5%_25%,rgba(125,67,34,0.12),transparent_70%)]";

const spot =
  "after:pointer-events-none after:absolute after:inset-0 after:z-[3] after:bg-[radial-gradient(320px_circle_at_var(--mx,50%)_var(--my,50%),rgba(223,162,116,0.14),transparent_60%)] after:opacity-0 after:transition-opacity after:duration-300 after:content-[''] hover:after:opacity-100";

const cardBase =
  "group relative overflow-hidden rounded-3xl border border-[#f4eee5]/10 bg-gradient-to-br from-white/[0.05] to-white/[0.012] transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1.5 hover:border-[#dfa274]/40 hover:shadow-[0_30px_60px_rgba(0,0,0,0.45)]";

const categoryOrder = [
  "Starters",
  "Main Course",
  "Sides",
  "Desserts",
  "Drinks",
  "Cocktails",
];

const rank = (category) => {
  const index = categoryOrder.indexOf(category);
  return index === -1 ? 99 : index;
};

const formatPrice = (price) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(price) || 0);

/* =========================================================
   ICONS
========================================================= */

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

/* =========================================================
   HEADER
========================================================= */

const Header = ({
  back,
  eyebrow,
  children,
  text,
}) => (
  <header className="mb-10 max-w-3xl">
    {back && (
      <Link
        data-in
        to={back.to}
        className="group mb-8 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.04em] text-[#c8bdb0] transition hover:text-[#f4eee5]"
      >
        <Arrow className="h-3.5 w-3.5 rotate-180 transition group-hover:-translate-x-1" />

        {back.label}
      </Link>
    )}

    <p
      data-in
      className="mb-5 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#dfa274] before:h-px before:w-[34px] before:bg-[#c88755] before:content-['']"
    >
      {eyebrow}
    </p>

    <h1
      className={`text-[clamp(40px,6vw,76px)] font-medium leading-[1] tracking-[-0.045em] text-[#fffaf3] ${serif}`}
    >
      <span className="block overflow-hidden pb-[0.1em]">
        <span data-line className="inline-block">
          {children}
        </span>
      </span>
    </h1>

    <p
      data-in
      className="mt-4 max-w-xl text-[15px] leading-7 text-[#c8bdb0]"
    >
      {text}
    </p>
  </header>
);

/* =========================================================
   PAGE SHELL
========================================================= */

const Shell = ({ children, innerRef }) => (
  <main
    ref={innerRef}
    className="relative min-h-screen overflow-x-clip bg-[#0d0a08] text-[#f4eee5]"
  >
    <div
      aria-hidden="true"
      className={glow}
    />

    <div className="relative mx-auto max-w-[1200px] px-5 pb-28 pt-[110px] sm:px-8 lg:px-14 lg:pt-[140px]">
      {children}
    </div>
  </main>
);

/* =========================================================
   LOADING
========================================================= */

const LoadingBlock = ({
  h = "h-[400px]",
  cols = "md:grid-cols-2 lg:grid-cols-3",
}) => (
  <div className={`grid gap-6 ${cols}`}>
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <div
        key={i}
        className={`${h} rounded-3xl border border-[#f4eee5]/10 ${skeleton}`}
      />
    ))}
  </div>
);

/* =========================================================
   ERROR
========================================================= */

const ErrorBlock = ({
  title,
  message,
  onRetry,
}) => (
  <div className="mx-auto max-w-md rounded-3xl border border-[#f4eee5]/10 bg-white/[0.03] px-8 py-14 text-center">
    <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#d8786f]/15 text-xl font-bold text-[#e79a93]">
      !
    </div>

    <h2
      className={`mt-5 text-3xl font-medium text-[#fffaf3] ${serif}`}
    >
      {title}
    </h2>

    <p className="mx-auto mt-2 max-w-xs text-sm leading-7 text-[#a79b8e]">
      {message}
    </p>

    <button
      type="button"
      onClick={onRetry}
      className="mt-7 h-11 rounded-full bg-[#c88755] px-6 text-[13px] font-bold text-[#171310] transition hover:bg-[#dfa274] active:scale-[0.97]"
    >
      Try again
    </button>
  </div>
);

/* =========================================================
   MENU ITEM CARD
========================================================= */

const MenuItemCard = ({
  item,
  restaurantId,
  quantity,
  onAdd,
  onRemove,
}) => {
  const hasSelection = quantity > 0;

  return (
    <article
      data-card
      className={`${cardBase} ${spot} ${
        hasSelection
          ? "border-[#dfa274]/45 shadow-[0_20px_50px_rgba(200,135,85,0.12)]"
          : ""
      }`}
    >
      <Link
        to={`/menu/${restaurantId}/item/${item._id}`}
        aria-label={`View ${item.name}`}
        className="flex h-full gap-5 rounded-3xl p-4 outline-none focus-visible:ring-2 focus-visible:ring-[#dfa274] sm:p-5"
      >
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-[#211711] sm:h-32 sm:w-32">
          {item.image ? (
            <img
              src={item.image}
              alt={item.name}
              loading="lazy"
              className="h-full w-full object-cover saturate-[0.85] transition duration-[900ms] ease-out group-hover:scale-[1.1] group-hover:saturate-100"
            />
          ) : (
            <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_30%_20%,rgba(200,135,85,0.25),transparent_60%)]">
              <span
                className={`text-5xl text-[#dfa274]/70 ${serif}`}
              >
                {item.name?.charAt(0)?.toUpperCase() ||
                  "M"}
              </span>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-3">
            <h3
              className={`text-[21px] font-medium leading-tight tracking-[-0.01em] text-[#fffaf3] ${serif}`}
            >
              {item.name}
            </h3>

            <span className="shrink-0 rounded-full bg-[#c88755]/15 px-3 py-1 text-[13px] font-bold tabular-nums text-[#dfa274]">
              {formatPrice(item.price)}
            </span>
          </div>

          <p className="mt-2.5 line-clamp-2 text-sm leading-[1.65] text-[#c8bdb0]">
            {item.description ||
              "A delicious selection from this restaurant's menu."}
          </p>

          <div className="mt-auto flex items-center justify-between gap-3 pt-4">
            <span className="flex items-center gap-2 text-xs font-semibold text-[#a79b8e] transition group-hover:text-[#dfa274]">
              View details

              <Arrow className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
            </span>

            {/* PRE-ORDER CONTROLS */}

            <div
              className="relative z-10 flex items-center gap-2"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              {hasSelection ? (
                <div className="flex h-9 items-center rounded-full border border-[#dfa274]/40 bg-[#c88755]/10">
                  <button
                    type="button"
                    aria-label={`Remove one ${item.name}`}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onRemove(item);
                    }}
                    className="grid h-9 w-9 place-items-center rounded-full text-lg font-semibold text-[#dfa274] transition hover:bg-white/[0.08] active:scale-90"
                  >
                    −
                  </button>

                  <span className="min-w-[24px] text-center text-sm font-bold text-[#fffaf3]">
                    {quantity}
                  </span>

                  <button
                    type="button"
                    aria-label={`Add another ${item.name}`}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onAdd(item);
                    }}
                    className="grid h-9 w-9 place-items-center rounded-full text-lg font-semibold text-[#dfa274] transition hover:bg-white/[0.08] active:scale-90"
                  >
                    +
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onAdd(item);
                  }}
                  className="flex h-9 items-center gap-2 rounded-full border border-[#dfa274]/35 bg-[#c88755]/10 px-4 text-[11px] font-bold uppercase tracking-[0.08em] text-[#dfa274] transition hover:border-[#dfa274] hover:bg-[#c88755]/20 active:scale-[0.97]"
                >
                  <span className="text-base leading-none">
                    +
                  </span>
                  Add
                </button>
              )}
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
};

/* =========================================================
   PRE-ORDER BAR
========================================================= */

const PreOrderBar = ({
  restaurant,
  items,
  onClear,
  onContinue,
}) => {
  if (!items.length) {
    return null;
  }

  const totalQuantity = items.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const totalPrice = items.reduce(
    (total, item) =>
      total + Number(item.price || 0) * item.quantity,
    0
  );

  return (
    <div className="sticky bottom-5 z-40 mb-10">
      <div className="overflow-hidden rounded-3xl border border-[#dfa274]/30 bg-[#17100c]/95 p-4 shadow-[0_25px_70px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-[#c88755] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-[#171310]">
                Pre-order
              </span>

              <span className="text-xs text-[#a79b8e]">
                {restaurant.name}
              </span>
            </div>

            <p className="mt-2 text-sm font-semibold text-[#fffaf3]">
              {totalQuantity}{" "}
              {totalQuantity === 1
                ? "item"
                : "items"}{" "}
              selected
            </p>

            <div className="mt-2 flex max-h-16 flex-wrap gap-x-4 gap-y-1 overflow-hidden text-xs text-[#c8bdb0]">
              {items.map((item) => (
                <span key={item.menuItem}>
                  {item.name} × {item.quantity}
                </span>
              ))}
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[#a79b8e]">
                Estimated total
              </p>

              <p className="mt-1 text-lg font-bold text-[#dfa274]">
                {formatPrice(totalPrice)}
              </p>
            </div>

            <button
              type="button"
              onClick={onClear}
              className="hidden text-xs font-semibold text-[#a79b8e] transition hover:text-[#f4eee5] sm:block"
            >
              Clear
            </button>

            <button
              type="button"
              onClick={onContinue}
              className="flex h-11 items-center gap-2 rounded-full bg-[#c88755] px-5 text-[12px] font-bold text-[#171310] transition hover:bg-[#dfa274] active:scale-[0.97]"
            >
              Continue to reservation
              <Arrow className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onClear}
          className="mt-3 text-xs font-semibold text-[#a79b8e] transition hover:text-[#f4eee5] sm:hidden"
        >
          Clear selection
        </button>
      </div>
    </div>
  );
};

/* =========================================================
   RESTAURANT MENU SECTION
========================================================= */

const RestaurantMenuSection = ({
  restaurant,
  menuItems,
  searchQuery,
  category,
  handleMove,
  selectedItems,
  onAdd,
  onRemove,
  onContinue,
}) => {
  const filteredItems = menuItems.filter(
    (item) => {
      const matchesSearch =
        !searchQuery ||
        item.name
          ?.toLowerCase()
          .includes(searchQuery) ||
        item.description
          ?.toLowerCase()
          .includes(searchQuery);

      const matchesCategory =
        category === "All" ||
        item.category === category;

      return (
        matchesSearch && matchesCategory
      );
    }
  );

  const groups = {};

  filteredItems.forEach((item) => {
    const group =
      item.category || "Other";

    if (!groups[group]) {
      groups[group] = [];
    }

    groups[group].push(item);
  });

  const groupedItems = Object.entries(
    groups
  ).sort(
    (a, b) =>
      rank(a[0]) - rank(b[0])
  );

  const restaurantId =
    restaurant._id || restaurant.id;

  if (filteredItems.length === 0) {
    return null;
  }

  const restaurantSelection =
    selectedItems[restaurantId] || [];

  const selectedQuantity =
    restaurantSelection.reduce(
      (total, item) =>
        total + item.quantity,
      0
    );

  return (
    <section
      data-restaurant-section
      className="space-y-10"
    >
      {/* RESTAURANT HEADER */}

      <div className="relative overflow-hidden rounded-[2rem] border border-[#dfa274]/20 bg-gradient-to-br from-[#c88755]/10 via-white/[0.03] to-transparent p-6 sm:p-8">
        <div
          aria-hidden="true"
          className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#c88755]/10 blur-3xl"
        />

        <div className="relative">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-[#dfa274]/30 bg-[#c88755]/10 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#dfa274]">
              Restaurant
            </span>

            <span className="text-xs text-[#a79b8e]">
              {filteredItems.length}{" "}
              {filteredItems.length === 1
                ? "dish"
                : "dishes"}
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                className={`text-[clamp(32px,5vw,52px)] font-medium leading-none tracking-[-0.035em] text-[#fffaf3] ${serif}`}
              >
                {restaurant.name ||
                  "Restaurant"}
              </h2>

              {restaurant.description && (
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[#c8bdb0]">
                  {restaurant.description}
                </p>
              )}
            </div>

            <Link
              to={`/restaurants/${restaurantId}`}
              className="inline-flex h-11 w-fit shrink-0 items-center gap-2 rounded-full border border-[#f4eee5]/15 px-5 text-[12px] font-semibold text-[#f4eee5] transition hover:border-[#dfa274]/50 hover:bg-[#c88755]/10"
            >
              View restaurant

              <Arrow className="h-3.5 w-3.5" />
            </Link>
          </div>

          {selectedQuantity > 0 && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dfa274]/20 bg-black/20 px-4 py-3">
              <div>
                <p className="text-xs font-semibold text-[#fffaf3]">
                  {selectedQuantity}{" "}
                  {selectedQuantity === 1
                    ? "item"
                    : "items"}{" "}
                  selected for your reservation
                </p>

                <p className="mt-1 text-[11px] text-[#a79b8e]">
                  Add more dishes below or continue to reservation.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  onContinue(restaurantId)
                }
                className="flex h-10 items-center gap-2 rounded-full bg-[#c88755] px-4 text-[11px] font-bold text-[#171310] transition hover:bg-[#dfa274] active:scale-[0.97]"
              >
                Continue
                <Arrow className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MENU GROUPS */}

      {groupedItems.map(
        ([groupCategory, items]) => (
          <div
            key={`${restaurantId}-${groupCategory}`}
          >
            <div className="mb-8">
              <div className="flex items-end justify-between gap-4 pb-5">
                <h3
                  className={`text-[clamp(28px,4vw,42px)] font-medium leading-none tracking-[-0.03em] text-[#fffaf3] ${serif}`}
                >
                  {groupCategory}
                </h3>

                <span className="text-[13px] text-[#a79b8e]">
                  {items.length}{" "}
                  {items.length === 1
                    ? "dish"
                    : "dishes"}
                </span>
              </div>

              <div
                data-rule
                className="h-px bg-gradient-to-r from-[#c88755] via-[#f4eee5]/15 to-transparent"
              />
            </div>

            <div
              onPointerMove={handleMove}
              className="grid gap-5 lg:grid-cols-2"
            >
              {items.map((item) => {
                const selected =
                  selectedItems[
                    restaurantId
                  ]?.find(
                    (selectedItem) =>
                      selectedItem.menuItem ===
                      item._id
                  );

                return (
                  <MenuItemCard
                    key={item._id}
                    item={item}
                    restaurantId={
                      restaurantId
                    }
                    quantity={
                      selected?.quantity || 0
                    }
                    onAdd={() =>
                      onAdd(
                        restaurantId,
                        item
                      )
                    }
                    onRemove={() =>
                      onRemove(
                        restaurantId,
                        item
                      )
                    }
                  />
                );
              })}
            </div>
          </div>
        )
      )}
    </section>
  );
};

/* =========================================================
   MAIN MENU PAGE
========================================================= */

const Menu = () => {
  const { restaurantId } =
    useParams();

  const navigate = useNavigate();

  const [restaurants, setRestaurants] =
    useState([]);

  const [menuItems, setMenuItems] =
    useState([]);

  const [restaurantMenus, setRestaurantMenus] =
    useState({});

  /*
   * {
   *   restaurantId: [
   *     {
   *       menuItem,
   *       name,
   *       price,
   *       quantity
   *     }
   *   ]
   * }
   */
  const [selectedItems, setSelectedItems] =
    useState({});

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [query, setQuery] =
    useState("");

  const [category, setCategory] =
    useState("All");

  const pageRef =
    useRef(null);

  /* =======================================================
     FETCH ALL RESTAURANTS
  ======================================================= */

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await api.get("/restaurants");

      const restaurantList =
        response.data.restaurants ||
        response.data.data ||
        [];

      setRestaurants(
        restaurantList
      );

      const menuResults =
        await Promise.all(
          restaurantList.map(
            async (restaurant) => {
              const id =
                restaurant._id ||
                restaurant.id;

              try {
                const menuResponse =
                  await api.get(
                    `/menu/restaurant/${id}`
                  );

                return {
                  id,
                  menuItems:
                    menuResponse.data
                      ?.menuItems || [],
                };
              } catch (menuError) {
                console.error(
                  `Failed to load menu for ${restaurant.name}:`,
                  menuError
                );

                return {
                  id,
                  menuItems: [],
                };
              }
            }
          )
        );

      const menuMap = {};

      menuResults.forEach(
        ({ id, menuItems }) => {
          menuMap[id] = menuItems;
        }
      );

      setRestaurantMenus(
        menuMap
      );
    } catch (err) {
      console.error(
        "Fetch restaurants error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to load restaurants."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     FETCH ONE RESTAURANT MENU
  ======================================================= */

  const fetchRestaurantMenu =
    async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await api.get(
            `/menu/restaurant/${restaurantId}`
          );

        setMenuItems(
          response.data.menuItems || []
        );

        if (response.data.restaurant) {
          setRestaurants([
            response.data.restaurant,
          ]);
        }
      } catch (err) {
        console.error(
          "Fetch restaurant menu error:",
          err
        );

        setError(
          err.response?.data?.message ||
            "Unable to load this restaurant's menu."
        );
      } finally {
        setLoading(false);
      }
    };

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    setSearch("");
    setCategory("All");

    if (restaurantId) {
      fetchRestaurantMenu();
    } else {
      fetchRestaurants();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  /* =======================================================
     SEARCH DEBOUNCE
  ======================================================= */

  useEffect(() => {
    const timeout =
      setTimeout(() => {
        setQuery(
          search
            .trim()
            .toLowerCase()
        );
      }, 250);

    return () =>
      clearTimeout(timeout);
  }, [search]);

  /* =======================================================
     ALL ITEMS ACROSS RESTAURANTS
  ======================================================= */

  const allRestaurantItems =
    useMemo(() => {
      return Object.values(
        restaurantMenus
      ).flat();
    }, [restaurantMenus]);

  /* =======================================================
     CATEGORIES
  ======================================================= */

  const categories =
    useMemo(() => {
      const source =
        restaurantId
          ? menuItems
          : allRestaurantItems;

      const unique = [
        ...new Set(
          source
            .map(
              (item) => item.category
            )
            .filter(Boolean)
        ),
      ];

      return [
        "All",
        ...unique.sort(
          (a, b) =>
            rank(a) - rank(b)
        ),
      ];
    }, [
      restaurantId,
      menuItems,
      allRestaurantItems,
    ]);

  /* =======================================================
     FILTERED SINGLE RESTAURANT MENU
  ======================================================= */

  const filteredSingleMenu =
    useMemo(() => {
      return menuItems.filter(
        (item) => {
          const matchesSearch =
            !query ||
            item.name
              ?.toLowerCase()
              .includes(query) ||
            item.description
              ?.toLowerCase()
              .includes(query);

          const matchesCategory =
            category === "All" ||
            item.category ===
              category;

          return (
            matchesSearch &&
            matchesCategory
          );
        }
      );
    }, [
      menuItems,
      query,
      category,
    ]);

  /* =======================================================
     RESTAURANT GROUPS FOR /MENU
  ======================================================= */

  const visibleRestaurants =
    useMemo(() => {
      if (restaurantId) {
        return [];
      }

      return restaurants
        .map((restaurant) => {
          const id =
            restaurant._id ||
            restaurant.id;

          const items =
            restaurantMenus[id] || [];

          const filteredItems =
            items.filter(
              (item) => {
                const matchesSearch =
                  !query ||
                  item.name
                    ?.toLowerCase()
                    .includes(
                      query
                    ) ||
                  item.description
                    ?.toLowerCase()
                    .includes(
                      query
                    );

                const matchesCategory =
                  category ===
                    "All" ||
                  item.category ===
                    category;

                return (
                  matchesSearch &&
                  matchesCategory
                );
              }
            );

          return {
            restaurant,
            items: filteredItems,
          };
        })
        .filter(
          ({ items }) =>
            items.length > 0
        );
    }, [
      restaurantId,
      restaurants,
      restaurantMenus,
      query,
      category,
    ]);

  /* =======================================================
     ADD ITEM TO PRE-ORDER
  ======================================================= */

  const handleAddItem = (
    currentRestaurantId,
    item
  ) => {
    setSelectedItems((current) => {
      const existing =
        current[
          currentRestaurantId
        ] || [];

      const found =
        existing.find(
          (selectedItem) =>
            selectedItem.menuItem ===
            item._id
        );

      if (found) {
        return {
          ...current,
          [currentRestaurantId]:
            existing.map(
              (selectedItem) =>
                selectedItem.menuItem ===
                item._id
                  ? {
                      ...selectedItem,
                      quantity:
                        selectedItem.quantity +
                        1,
                    }
                  : selectedItem
            ),
        };
      }

      return {
        ...current,
        [currentRestaurantId]: [
          ...existing,
          {
            menuItem: item._id,
            name: item.name,
            price: Number(
              item.price
            ) || 0,
            quantity: 1,
          },
        ],
      };
    });
  };

  /* =======================================================
     REMOVE ITEM FROM PRE-ORDER
  ======================================================= */

  const handleRemoveItem = (
    currentRestaurantId,
    item
  ) => {
    setSelectedItems((current) => {
      const existing =
        current[
          currentRestaurantId
        ] || [];

      const found =
        existing.find(
          (selectedItem) =>
            selectedItem.menuItem ===
            item._id
        );

      if (!found) {
        return current;
      }

      if (found.quantity <= 1) {
        const remaining =
          existing.filter(
            (selectedItem) =>
              selectedItem.menuItem !==
              item._id
          );

        return {
          ...current,
          [currentRestaurantId]:
            remaining,
        };
      }

      return {
        ...current,
        [currentRestaurantId]:
          existing.map(
            (selectedItem) =>
              selectedItem.menuItem ===
              item._id
                ? {
                    ...selectedItem,
                    quantity:
                      selectedItem.quantity -
                      1,
                  }
                : selectedItem
          ),
      };
    });
  };

  /* =======================================================
     GET CURRENT RESTAURANT SELECTION
  ======================================================= */

  const currentSelection =
    restaurantId
      ? selectedItems[
          restaurantId
        ] || []
      : [];

  /* =======================================================
     CLEAR CURRENT RESTAURANT SELECTION
  ======================================================= */

  const clearRestaurantSelection = (
    currentRestaurantId
  ) => {
    setSelectedItems((current) => {
      const next = {
        ...current,
      };

      delete next[
        currentRestaurantId
      ];

      return next;
    });
  };

  /* =======================================================
     CONTINUE TO RESERVATION
  ======================================================= */

  const continueToReservation = (
    currentRestaurantId
  ) => {
    const items =
      selectedItems[
        currentRestaurantId
      ] || [];

    navigate(
      `/restaurants/${currentRestaurantId}/reserve`,
      {
        state: {
          preOrder: items,
        },
      }
    );
  };

  /* =======================================================
     ANIMATIONS
  ======================================================= */

  useLayoutEffect(() => {
    if (loading || error) {
      return;
    }

    const context =
      gsap.context(() => {
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
            stagger: 0.08,
          })
          .from(
            "[data-line]",
            {
              yPercent: 110,
              duration: 0.9,
            },
            "-=0.55"
          );
      }, pageRef);

    return () =>
      context.revert();
  }, [
    loading,
    error,
    restaurantId,
  ]);

  useLayoutEffect(() => {
    if (loading || error) {
      return;
    }

    const context =
      gsap.context(() => {
        gsap.set(
          "[data-card]",
          {
            opacity: 0,
            y: 30,
          }
        );

        gsap.set(
          "[data-rule]",
          {
            scaleX: 0,
            transformOrigin:
              "left",
          }
        );

        ScrollTrigger.batch(
          "[data-card]",
          {
            start: "top 94%",
            once: true,
            onEnter: (batch) =>
              gsap.to(batch, {
                opacity: 1,
                y: 0,
                duration: 0.65,
                stagger: 0.07,
                ease: "power3.out",
                overwrite: true,
                clearProps:
                  "transform",
              }),
          }
        );

        ScrollTrigger.batch(
          "[data-rule]",
          {
            start: "top 95%",
            once: true,
            onEnter: (batch) =>
              gsap.to(batch, {
                scaleX: 1,
                duration: 1,
                ease: "power2.out",
              }),
          }
        );
      }, pageRef);

    return () =>
      context.revert();
  }, [
    loading,
    error,
    restaurantId,
    query,
    category,
    menuItems,
    restaurantMenus,
    restaurants,
  ]);

  /* =======================================================
     MOUSE SPOTLIGHT
  ======================================================= */

  const handleMove = (event) => {
    const card =
      event.target.closest?.(
        "[data-card]"
      );

    if (!card) {
      return;
    }

    const rect =
      card.getBoundingClientRect();

    card.style.setProperty(
      "--mx",
      `${event.clientX - rect.left}px`
    );

    card.style.setProperty(
      "--my",
      `${event.clientY - rect.top}px`
    );
  };

  /* =======================================================
     /MENU
     ALL RESTAURANTS + THEIR OWN MENUS
  ======================================================= */

  if (!restaurantId) {
    return (
      <Shell innerRef={pageRef}>
        <Header
          eyebrow="TableFlow menu"
          text="Explore what each restaurant has to offer. Every restaurant has its own menu."
        >
          Explore restaurant{" "}
          <span className="italic text-[#dfa274]">
            menus.
          </span>
        </Header>

        {loading ? (
          <LoadingBlock
            h="h-[150px]"
            cols="lg:grid-cols-2"
          />
        ) : error ? (
          <ErrorBlock
            title="Unable to load menus"
            message={error}
            onRetry={
              fetchRestaurants
            }
          />
        ) : restaurants.length ===
          0 ? (
          <div className="rounded-3xl border border-dashed border-[#f4eee5]/[0.18] px-6 py-24 text-center">
            <div className="mx-auto h-14 w-14 animate-pulse rounded-full border border-[#dfa274]/45" />

            <h2
              className={`mt-5 text-3xl font-medium text-[#fffaf3] ${serif}`}
            >
              No restaurants available
            </h2>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-7 text-[#a79b8e]">
              There are currently no
              restaurants available
              to browse.
            </p>
          </div>
        ) : visibleRestaurants.length ===
          0 ? (
          <div className="rounded-3xl border border-dashed border-[#f4eee5]/[0.18] px-6 py-24 text-center">
            <h2
              className={`text-3xl font-medium text-[#fffaf3] ${serif}`}
            >
              No menu items found
            </h2>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-7 text-[#a79b8e]">
              Try another search term
              or select a different
              category.
            </p>

            {(search ||
              category !== "All") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCategory(
                    "All"
                  );
                }}
                className="mt-7 h-11 rounded-full bg-[#c88755] px-6 text-[13px] font-bold text-[#171310] transition hover:bg-[#dfa274] active:scale-[0.97]"
              >
                Reset filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* GLOBAL MENU CONTROLS */}

            <div
              data-in
              className="sticky top-3 z-30 mb-14 flex flex-col gap-3 rounded-3xl border border-[#f4eee5]/10 bg-[#0d0a08]/80 p-3 backdrop-blur-md lg:flex-row lg:items-center lg:justify-between"
            >
              <label className="flex h-12 w-full items-center gap-3 rounded-full border border-[#f4eee5]/[0.14] bg-white/[0.04] pl-5 pr-3 transition focus-within:border-[#dfa274]/70 focus-within:ring-4 focus-within:ring-[#c88755]/10 lg:max-w-sm">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                  className="h-[18px] w-[18px] shrink-0 text-[#dfa274]"
                >
                  <circle
                    cx="11"
                    cy="11"
                    r="7"
                  />

                  <path d="m20 20-4-4" />
                </svg>

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search all restaurant menus"
                  aria-label="Search all restaurant menus"
                  className="h-full min-w-0 flex-1 bg-transparent text-sm text-[#fffaf3] outline-none placeholder:text-[#c8bdb0]/45"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() =>
                      setSearch("")
                    }
                    className="h-8 rounded-full bg-white/[0.08] px-3 text-xs font-semibold text-[#f4eee5] transition hover:bg-white/[0.14]"
                  >
                    Clear
                  </button>
                )}
              </label>

              {categories.length >
                1 && (
                <div
                  role="tablist"
                  aria-label="Categories"
                  className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {categories.map(
                    (itemCategory) => (
                      <button
                        key={
                          itemCategory
                        }
                        type="button"
                        role="tab"
                        aria-selected={
                          category ===
                          itemCategory
                        }
                        onClick={() =>
                          setCategory(
                            itemCategory
                          )
                        }
                        className={`h-10 shrink-0 rounded-full border px-[18px] text-[13px] font-semibold transition duration-300 ${
                          category ===
                          itemCategory
                            ? "border-[#c88755] bg-[#c88755] text-[#171310]"
                            : "border-[#f4eee5]/10 text-[#c8bdb0] hover:border-[#dfa274]/50 hover:text-[#f4eee5]"
                        }`}
                      >
                        {
                          itemCategory
                        }
                      </button>
                    )
                  )}
                </div>
              )}
            </div>

            {/* RESTAURANT GROUPS */}

            <div className="space-y-20">
              {visibleRestaurants.map(
                ({
                  restaurant,
                  items,
                }) => (
                  <RestaurantMenuSection
                    key={
                      restaurant._id ||
                      restaurant.id
                    }
                    restaurant={
                      restaurant
                    }
                    menuItems={items}
                    searchQuery=""
                    category="All"
                    handleMove={
                      handleMove
                    }
                    selectedItems={
                      selectedItems
                    }
                    onAdd={
                      handleAddItem
                    }
                    onRemove={
                      handleRemoveItem
                    }
                    onContinue={
                      continueToReservation
                    }
                  />
                )
              )}
            </div>
          </>
        )}

        {/* CURRENT PRE-ORDER */}

        {Object.entries(
          selectedItems
        ).map(
          ([selectedRestaurantId, items]) => {
            if (!items.length) {
              return null;
            }

            const restaurant =
              restaurants.find(
                (entry) =>
                  (entry._id ||
                    entry.id) ===
                  selectedRestaurantId
              );

            if (!restaurant) {
              return null;
            }

            return (
              <PreOrderBar
                key={
                  selectedRestaurantId
                }
                restaurant={
                  restaurant
                }
                items={items}
                onClear={() =>
                  clearRestaurantSelection(
                    selectedRestaurantId
                  )
                }
                onContinue={() =>
                  continueToReservation(
                    selectedRestaurantId
                  )
                }
              />
            );
          }
        )}
      </Shell>
    );
  }

  /* =======================================================
     /MENU/:RESTAURANT_ID
     SINGLE RESTAURANT MENU
  ======================================================= */

  const singleRestaurant =
    restaurants.find(
      (restaurant) =>
        (restaurant._id ||
          restaurant.id) ===
        restaurantId
    ) || {
      _id: restaurantId,
      name: "Restaurant",
    };

  return (
    <Shell innerRef={pageRef}>
      <Header
        back={{
          to: "/menu",
          label: "All restaurants",
        }}
        eyebrow="Restaurant menu"
        text="Browse the available dishes and drinks from this restaurant."
      >
        Explore the{" "}
        <span className="italic text-[#dfa274]">
          menu.
        </span>
      </Header>

      {loading ? (
        <LoadingBlock
          h="h-[150px]"
          cols="lg:grid-cols-2"
        />
      ) : error ? (
        <ErrorBlock
          title="Unable to load menu"
          message={error}
          onRetry={
            fetchRestaurantMenu
          }
        />
      ) : (
        <>
          {/* SINGLE RESTAURANT CONTROLS */}

          <div
            data-in
            className="sticky top-3 z-30 mb-12 flex flex-col gap-3 rounded-3xl border border-[#f4eee5]/10 bg-[#0d0a08]/80 p-3 backdrop-blur-md lg:flex-row lg:items-center lg:justify-between"
          >
            <label className="flex h-12 w-full items-center gap-3 rounded-full border border-[#f4eee5]/[0.14] bg-white/[0.04] pl-5 pr-3 transition focus-within:border-[#dfa274]/70 focus-within:ring-4 focus-within:ring-[#c88755]/10 lg:max-w-sm">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
                className="h-[18px] w-[18px] shrink-0 text-[#dfa274]"
              >
                <circle
                  cx="11"
                  cy="11"
                  r="7"
                />

                <path d="m20 20-4-4" />
              </svg>

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search this menu"
                aria-label="Search this menu"
                className="h-full min-w-0 flex-1 bg-transparent text-sm text-[#fffaf3] outline-none placeholder:text-[#c8bdb0]/45"
              />

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    setSearch("")
                  }
                  className="h-8 rounded-full bg-white/[0.08] px-3 text-xs font-semibold text-[#f4eee5] transition hover:bg-white/[0.14]"
                >
                  Clear
                </button>
              )}
            </label>

            {categories.length >
              1 && (
              <div
                role="tablist"
                aria-label="Categories"
                className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {categories.map(
                  (itemCategory) => (
                    <button
                      key={
                        itemCategory
                      }
                      type="button"
                      role="tab"
                      aria-selected={
                        category ===
                        itemCategory
                      }
                      onClick={() =>
                        setCategory(
                          itemCategory
                        )
                      }
                      className={`h-10 shrink-0 rounded-full border px-[18px] text-[13px] font-semibold transition duration-300 ${
                        category ===
                        itemCategory
                          ? "border-[#c88755] bg-[#c88755] text-[#171310]"
                          : "border-[#f4eee5]/10 text-[#c8bdb0] hover:border-[#dfa274]/50 hover:text-[#f4eee5]"
                      }`}
                    >
                      {itemCategory}
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {filteredSingleMenu.length ===
          0 ? (
            <div className="rounded-3xl border border-dashed border-[#f4eee5]/[0.18] px-6 py-24 text-center">
              <h2
                className={`text-3xl font-medium text-[#fffaf3] ${serif}`}
              >
                No menu items found
              </h2>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-7 text-[#a79b8e]">
                Try another search term
                or select a different
                category.
              </p>

              {(search ||
                category !== "All") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setCategory(
                      "All"
                    );
                  }}
                  className="mt-7 h-11 rounded-full bg-[#c88755] px-6 text-[13px] font-bold text-[#171310] transition hover:bg-[#dfa274] active:scale-[0.97]"
                >
                  Reset filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-16">
                {Object.entries(
                  filteredSingleMenu.reduce(
                    (groups, item) => {
                      const group =
                        item.category ||
                        "Other";

                      if (!groups[group]) {
                        groups[group] = [];
                      }

                      groups[group].push(
                        item
                      );

                      return groups;
                    },
                    {}
                  )
                )
                  .sort(
                    (a, b) =>
                      rank(a[0]) -
                      rank(b[0])
                  )
                  .map(
                    ([
                      groupCategory,
                      items,
                    ]) => (
                      <section
                        key={
                          groupCategory
                        }
                      >
                        <div className="mb-8">
                          <div className="flex items-end justify-between gap-4 pb-5">
                            <h2
                              className={`text-[clamp(30px,4vw,44px)] font-medium leading-none tracking-[-0.03em] text-[#fffaf3] ${serif}`}
                            >
                              {
                                groupCategory
                              }
                            </h2>

                            <span className="text-[13px] text-[#a79b8e]">
                              {
                                items.length
                              }{" "}
                              {items.length ===
                              1
                                ? "dish"
                                : "dishes"}
                            </span>
                          </div>

                          <div
                            data-rule
                            className="h-px bg-gradient-to-r from-[#c88755] via-[#f4eee5]/15 to-transparent"
                          />
                        </div>

                        <div
                          onPointerMove={
                            handleMove
                          }
                          className="grid gap-5 lg:grid-cols-2"
                        >
                          {items.map(
                            (item) => {
                              const selected =
                                selectedItems[
                                  restaurantId
                                ]?.find(
                                  (
                                    selectedItem
                                  ) =>
                                    selectedItem.menuItem ===
                                    item._id
                                );

                              return (
                                <MenuItemCard
                                  key={
                                    item._id
                                  }
                                  item={
                                    item
                                  }
                                  restaurantId={
                                    restaurantId
                                  }
                                  quantity={
                                    selected?.quantity ||
                                    0
                                  }
                                  onAdd={() =>
                                    handleAddItem(
                                      restaurantId,
                                      item
                                    )
                                  }
                                  onRemove={() =>
                                    handleRemoveItem(
                                      restaurantId,
                                      item
                                    )
                                  }
                                />
                              );
                            }
                          )}
                        </div>
                      </section>
                    )
                  )}
              </div>

              {/* SINGLE RESTAURANT PRE-ORDER */}

              <PreOrderBar
                restaurant={
                  singleRestaurant
                }
                items={
                  currentSelection
                }
                onClear={() =>
                  clearRestaurantSelection(
                    restaurantId
                  )
                }
                onContinue={() =>
                  continueToReservation(
                    restaurantId
                  )
                }
              />
            </>
          )}
        </>
      )}
    </Shell>
  );
};

export default Menu;