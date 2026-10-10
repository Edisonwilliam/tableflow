import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import gsap from "gsap";

import api from "../services/api";

/* ---------- shared style tokens ---------- */

const serif = "font-['Playfair_Display',serif]";

const panel =
  "rounded-3xl border border-[#f4eee5]/10 bg-gradient-to-br from-white/[0.05] to-white/[0.012]";

const label =
  "mb-2 block text-xs font-semibold tracking-[0.02em] text-[#c8bdb0]";

const field =
  "h-[54px] w-full rounded-xl border border-[#f4eee5]/10 bg-white/[0.04] px-4 text-sm text-[#fffaf3] outline-none transition focus:border-[#dfa274]/70 focus:bg-white/[0.06] focus:ring-4 focus:ring-[#c88755]/10 [color-scheme:dark]";

const skeleton = "animate-pulse bg-white/[0.05]";

const steps = [
  "Date & time",
  "Choose a table",
  "Pre-order",
  "Confirm",
];

const durations = [
  ["1h", 60],
  ["1½h", 90],
  ["2h", 120],
  ["3h", 180],
];

/* ---------- helpers ---------- */

/*
 * Add minutes to a HH:mm time.
 *
 * Example:
 * addMinutes("10:00", 60)  -> "11:00"
 * addMinutes("10:00", 90)  -> "11:30"
 */
const addMinutes = (time, mins) => {
  if (!time) return "";

  const [hours, minutes] = time
    .split(":")
    .map(Number);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes)
  ) {
    return "";
  }

  const totalMinutes =
    hours * 60 + minutes + mins;

  // We don't allow a reservation to cross midnight.
  if (totalMinutes >= 24 * 60) {
    return "";
  }

  const newHours = Math.floor(totalMinutes / 60);
  const newMinutes = totalMinutes % 60;

  return `${String(newHours).padStart(
    2,
    "0"
  )}:${String(newMinutes).padStart(2, "0")}`;
};

const prettyDate = (d) =>
  d
    ? new Date(
        `${d}T00:00:00`
      ).toLocaleDateString("en-NG", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Not selected";

const formatMoney = (amount) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

/* ---------- animated summary value ---------- */

const Flash = ({ value, className = "" }) => {
  const ref = useRef(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }

    gsap.fromTo(
      ref.current,
      {
        opacity: 0.2,
        y: 6,
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.4,
        ease: "power2.out",
      }
    );
  }, [value]);

  return (
    <span ref={ref} className={className}>
      {value}
    </span>
  );
};

/* ---------- table card ---------- */

const TableCard = ({
  table,
  selected,
  onSelect,
}) => {
  return (
    <button
      type="button"
      onClick={() => onSelect(table)}
      className={`group relative w-full overflow-hidden rounded-2xl border text-left transition-all duration-300 ${
        selected
          ? "border-[#dfa274] bg-[#c88755]/10 shadow-[0_0_0_3px_rgba(200,135,85,0.12),0_20px_50px_rgba(0,0,0,0.25)]"
          : "border-[#f4eee5]/10 bg-white/[0.025] hover:-translate-y-1 hover:border-[#dfa274]/45 hover:bg-white/[0.045] hover:shadow-[0_20px_50px_rgba(0,0,0,0.25)]"
      }`}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-[#211711]">
        {table.image ? (
          <img
            src={table.image}
            alt={table.name}
            className={`h-full w-full object-cover transition duration-700 ${
              selected
                ? "scale-[1.04]"
                : "group-hover:scale-[1.05]"
            }`}
          />
        ) : (
          <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_30%_20%,rgba(200,135,85,0.25),transparent_60%)]">
            <span
              className={`text-5xl text-[#dfa274]/70 ${serif}`}
            >
              {table.name?.[0] || "T"}
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0a08]/80 via-transparent to-transparent" />

        {selected && (
          <span
            data-check
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-[#c88755] text-sm font-bold text-[#171310] shadow-lg"
          >
            ✓
          </span>
        )}

        <div className="absolute bottom-3 left-4 right-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#dfa274]">
            Available table
          </p>

          <h3
            className={`mt-1 text-2xl font-medium text-[#fffaf3] ${serif}`}
          >
            {table.name}
          </h3>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#fffaf3]">
              {table.capacity}{" "}
              {table.capacity === 1
                ? "guest"
                : "guests"}
            </p>

            <p className="mt-1 text-xs text-[#a79b8e]">
              {table.location || "Main Dining"}
            </p>
          </div>

          <span
            className={`rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] ${
              selected
                ? "border-[#c88755]/40 bg-[#c88755]/10 text-[#dfa274]"
                : "border-[#7fc7ae]/20 bg-[#7fc7ae]/10 text-[#7fc7ae]"
            }`}
          >
            {selected ? "Selected" : "Available"}
          </span>
        </div>

        <div
          className={`mt-4 flex h-10 items-center justify-center rounded-full text-xs font-bold transition ${
            selected
              ? "bg-[#c88755] text-[#171310]"
              : "border border-[#f4eee5]/10 bg-white/[0.04] text-[#c8bdb0] group-hover:border-[#dfa274]/40 group-hover:text-[#fffaf3]"
          }`}
        >
          {selected
            ? "Table selected"
            : "Select this table"}
        </div>
      </div>
    </button>
  );
};

/* ---------- sleek pre-order item card ---------- */

const PreOrderItem = ({
  item,
  quantity,
  onAdd,
  onRemove,
}) => {
  const total = Number(item.price || 0) * quantity;
  const isSelected = quantity > 0;

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border transition-all duration-500 ${
        isSelected
          ? "border-[#dfa274]/60 bg-gradient-to-br from-[#c88755]/[0.12] to-[#c88755]/[0.03] shadow-[0_0_0_1px_rgba(223,162,116,0.15),0_20px_50px_rgba(0,0,0,0.3)]"
          : "border-[#f4eee5]/10 bg-white/[0.02] hover:border-[#dfa274]/35 hover:bg-white/[0.04] hover:shadow-[0_20px_50px_rgba(0,0,0,0.25)]"
      }`}
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden bg-[#211711]">
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className={`h-full w-full object-cover transition duration-700 ${
              isSelected ? "scale-105" : "group-hover:scale-105"
            }`}
          />
        ) : (
          <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_30%_20%,rgba(200,135,85,0.3),transparent_60%)]">
            <span className={`text-4xl text-[#dfa274]/60 ${serif}`}>
              {item.name?.[0] || "F"}
            </span>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0a08] via-[#0d0a08]/40 to-transparent" />

        {/* Category Badge */}
        <span className="absolute left-3 top-3 rounded-full border border-[#f4eee5]/10 bg-[#0d0a08]/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#dfa274] backdrop-blur-sm">
          {item.category || "Menu"}
        </span>

        {/* Quantity Badge */}
        {isSelected && (
          <span className="absolute right-3 top-3 grid h-8 min-w-8 place-items-center rounded-full bg-[#c88755] px-2 text-xs font-bold text-[#171310] shadow-lg">
            {quantity}
          </span>
        )}

        {/* Price Tag */}
        <span className="absolute bottom-3 right-3 rounded-full bg-[#0d0a08]/80 px-3 py-1.5 text-sm font-bold text-[#fffaf3] backdrop-blur-sm">
          {formatMoney(item.price)}
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className={`text-lg font-medium leading-tight text-[#fffaf3] ${serif}`}>
          {item.name}
        </h3>

        {item.description && (
          <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-[#a79b8e]">
            {item.description}
          </p>
        )}

        {/* Action Row */}
        <div className="mt-4 flex items-center justify-between gap-3">
          {isSelected ? (
            <>
              <span className="text-sm font-bold text-[#dfa274]">
                {formatMoney(total)}
              </span>

              <div className="flex h-9 items-center rounded-full border border-[#dfa274]/30 bg-[#c88755]/10">
                <button
                  type="button"
                  onClick={() => onRemove(item._id)}
                  className="grid h-9 w-9 place-items-center rounded-full text-lg text-[#dfa274] transition hover:bg-white/[0.08] active:scale-90"
                >
                  −
                </button>

                <span className="w-6 text-center text-xs font-bold text-[#fffaf3]">
                  {quantity}
                </span>

                <button
                  type="button"
                  onClick={() => onAdd(item)}
                  className="grid h-9 w-9 place-items-center rounded-full text-lg text-[#dfa274] transition hover:bg-white/[0.08] active:scale-90"
                >
                  +
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onAdd(item)}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-full border border-[#f4eee5]/10 bg-white/[0.03] text-xs font-bold text-[#c8bdb0] transition hover:border-[#dfa274]/40 hover:bg-[#c88755]/10 hover:text-[#dfa274]"
            >
              <span className="text-base leading-none">+</span>
              Add to pre-order
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ---------- component ---------- */

const Reservation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [restaurant, setRestaurant] =
    useState(null);

  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [selectedDuration, setSelectedDuration] =
    useState(60);

  const [guests, setGuests] = useState(2);
  const [notes, setNotes] = useState("");

  const [availableTables, setAvailableTables] =
    useState([]);

  const [selectedTable, setSelectedTable] =
    useState(null);

  /* ---------- PRE-ORDER ---------- */

  const [menuItems, setMenuItems] = useState([]);
  const [preOrder, setPreOrder] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");

  const [loadingMenu, setLoadingMenu] =
    useState(false);

  const [reservationStage, setReservationStage] =
    useState(1);

  const [loadingRestaurant, setLoadingRestaurant] =
    useState(true);

  const [
    checkingAvailability,
    setCheckingAvailability,
  ] = useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const pageRef = useRef(null);
  const tablesRef = useRef(null);
  const preOrderRef = useRef(null);
  const redirectTimer = useRef(null);

  /* ---------- cleanup ---------- */

  useEffect(() => {
    return () => {
      if (redirectTimer.current) {
        clearTimeout(redirectTimer.current);
      }
    };
  }, []);

  /* ---------- derived ---------- */

  const minimumDate = useMemo(() => {
    const t = new Date();

    return `${t.getFullYear()}-${String(
      t.getMonth() + 1
    ).padStart(2, "0")}-${String(
      t.getDate()
    ).padStart(2, "0")}`;
  }, []);

  const currentStep = reservationStage;

  const selectedPreOrderCount = useMemo(
    () =>
      preOrder.reduce(
        (sum, item) => sum + item.quantity,
        0
      ),
    [preOrder]
  );

  const preOrderTotal = useMemo(
    () =>
      preOrder.reduce(
        (sum, item) =>
          sum +
          Number(item.price || 0) *
            item.quantity,
        0
      ),
    [preOrder]
  );

  /* ---------- pre-order categories ---------- */

  const categories = useMemo(() => {
    const unique = new Set(
      menuItems
        .map((item) => item.category)
        .filter(Boolean)
    );
    return Array.from(unique);
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    if (activeCategory === "all") return menuItems;
    return menuItems.filter(
      (item) => item.category === activeCategory
    );
  }, [menuItems, activeCategory]);

  /* ---------- reset results ---------- */

  const resetResults = () => {
    setAvailableTables([]);
    setSelectedTable(null);
    setReservationStage(1);
  };

  /* ---------- load restaurant ---------- */

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingRestaurant(true);
        setError("");

        const response = await api.get(
          `/restaurants/${id}`
        );

        setRestaurant(response.data.restaurant);
      } catch (err) {
        console.error(
          "Load reservation restaurant error:",
          err
        );

        setError(
          err.response?.data?.message ||
            "Unable to load this restaurant."
        );
      } finally {
        setLoadingRestaurant(false);
      }
    };

    load();
  }, [id]);

  /* ---------- load restaurant menu ---------- */

  const loadMenu = async () => {
    try {
      setLoadingMenu(true);
      setError("");

      const response = await api.get(
        `/menu/restaurant/${id}`
      );

      setMenuItems(
        response.data.menuItems || []
      );
    } catch (err) {
      console.error(
        "Load reservation menu error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to load this restaurant's menu."
      );
    } finally {
      setLoadingMenu(false);
    }
  };

  /* =====================================================
     TIME / DURATION LOGIC
     ===================================================== */

  /*
   * Apply the currently selected duration
   * whenever the start time changes.
   */
  const handleStartTimeChange = (value) => {
    setStartTime(value);

    if (value) {
      const calculatedEnd = addMinutes(
        value,
        selectedDuration
      );

      setEndTime(calculatedEnd);
    } else {
      setEndTime("");
    }

    resetResults();
    setError("");
  };

  /*
   * Change duration and immediately calculate
   * the end time from the selected start time.
   */
  const handleDurationChange = (minutes) => {
    if (!startTime) return;

    const calculatedEnd = addMinutes(
      startTime,
      minutes
    );

    if (!calculatedEnd) {
      return;
    }

    setSelectedDuration(minutes);
    setEndTime(calculatedEnd);

    resetResults();
    setError("");
  };

  /*
   * If the user manually changes an end time,
   * determine whether it matches one of our
   * supported durations.
   *
   * We don't allow arbitrary end times because
   * the booking system is based on fixed durations.
   */
  const handleEndTimeChange = (value) => {
    if (!startTime || !value) {
      return;
    }

    const [startHours, startMinutes] =
      startTime.split(":").map(Number);

    const [endHours, endMinutes] =
      value.split(":").map(Number);

    const startTotal =
      startHours * 60 + startMinutes;

    const endTotal =
      endHours * 60 + endMinutes;

    const difference =
      endTotal - startTotal;

    const matchingDuration = durations.find(
      ([, minutes]) => minutes === difference
    );

    if (!matchingDuration) {
      setError(
        "Please choose one of the available reservation durations."
      );

      return;
    }

    setSelectedDuration(
      matchingDuration[1]
    );
    setEndTime(value);

    resetResults();
    setError("");
  };

  /* ---------- check availability ---------- */

  const handleCheckAvailability = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!date) {
      return setError(
        "Please select a reservation date."
      );
    }

    if (!startTime) {
      return setError(
        "Please select a start time."
      );
    }

    if (!endTime) {
      return setError(
        "Please select a reservation duration."
      );
    }

    if (startTime >= endTime) {
      return setError(
        "End time must be later than start time."
      );
    }

    if (!guests || guests < 1) {
      return setError(
        "Please select at least one guest."
      );
    }

    try {
      setCheckingAvailability(true);

      const response = await api.get(
        "/tables/availability",
        {
          params: {
            restaurantId: id,
            date,
            startTime,
            endTime,
            guests: Number(guests),
          },
        }
      );

      const tables =
        response.data.availableTables || [];

      setAvailableTables(tables);
      setSelectedTable(null);

      if (tables.length === 0) {
        setReservationStage(1);

        setError(
          "No tables are available for the selected date and time."
        );
      } else {
        setReservationStage(2);
      }
    } catch (err) {
      console.error(
        "Check table availability error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to check table availability."
      );
    } finally {
      setCheckingAvailability(false);
    }
  };

  /* ---------- select table ---------- */

  const handleSelectTable = (table) => {
    setSelectedTable(table);
    setError("");
    setSuccess("");
  };

  /* ---------- continue to preorder ---------- */

  const handleContinueToPreOrder = async () => {
    if (!selectedTable) {
      return setError(
        "Please select a table first."
      );
    }

    setError("");

    if (menuItems.length === 0) {
      await loadMenu();
    }

    setReservationStage(3);

    setTimeout(() => {
      preOrderRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  /* ---------- add menu item ---------- */

  const handleAddPreOrder = (item) => {
    setPreOrder((current) => {
      const existing = current.find(
        (entry) =>
          entry.menuItem === item._id
      );

      if (existing) {
        return current.map((entry) =>
          entry.menuItem === item._id
            ? {
                ...entry,
                quantity:
                  entry.quantity + 1,
              }
            : entry
        );
      }

      return [
        ...current,
        {
          menuItem: item._id,
          name: item.name,
          price: Number(item.price || 0),
          quantity: 1,
        },
      ];
    });

    setError("");
  };

  /* ---------- remove menu item ---------- */

  const handleRemovePreOrder = (
    menuItemId
  ) => {
    setPreOrder((current) =>
      current
        .map((entry) =>
          entry.menuItem === menuItemId
            ? {
                ...entry,
                quantity:
                  entry.quantity - 1,
              }
            : entry
        )
        .filter(
          (entry) => entry.quantity > 0
        )
    );
  };

  /* ---------- get quantity ---------- */

  const getPreOrderQuantity = (
    menuItemId
  ) => {
    const item = preOrder.find(
      (entry) =>
        entry.menuItem === menuItemId
    );

    return item?.quantity || 0;
  };

  /* ---------- continue to confirmation ---------- */

  const handleContinueToConfirm = () => {
    setError("");
    setReservationStage(4);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* ---------- submit reservation ---------- */

  const handleSubmitReservation = async () => {
    if (!selectedTable) {
      return setError(
        "Please select a table first."
      );
    }

    setError("");
    setSuccess("");

    try {
      setSubmitting(true);

      const response = await api.post(
        "/reservations",
        {
          restaurantId: id,
          tableId: selectedTable._id,
          date,
          startTime,
          endTime,
          guests: Number(guests),
          notes: notes.trim(),

          preOrder: preOrder.map((item) => ({
            menuItem: item.menuItem,
            quantity: item.quantity,
          })),
        }
      );

      setSuccess(
        response.data.message ||
          "Reservation created successfully."
      );

      redirectTimer.current =
        setTimeout(() => {
          navigate("/reservations");
        }, 2600);
    } catch (err) {
      console.error(
        "Create reservation error:",
        err
      );

      if (err.response?.status === 409) {
        setSelectedTable(null);
        setReservationStage(2);

        setError(
          err.response?.data?.message ||
            "This table is no longer available for the selected time. Please choose another table."
        );

        try {
          const refreshResponse =
            await api.get(
              "/tables/availability",
              {
                params: {
                  restaurantId: id,
                  date,
                  startTime,
                  endTime,
                  guests: Number(guests),
                },
              }
            );

          setAvailableTables(
            refreshResponse.data
              .availableTables || []
          );
        } catch (refreshError) {
          console.error(
            "Refresh availability error:",
            refreshError
          );
        }
      } else {
        setError(
          err.response?.data?.message ||
            "Unable to create reservation."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- page animation ---------- */

  useLayoutEffect(() => {
    if (loadingRestaurant || !restaurant)
      return;

    const ctx = gsap.context(() => {
      gsap
        .timeline({
          defaults: {
            ease: "power3.out",
          },
        })
        .from("[data-in='head']", {
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
          "-=0.5"
        )
        .from(
          "[data-in='steps']",
          {
            opacity: 0,
            y: 14,
            duration: 0.6,
          },
          "-=0.5"
        )
        .from(
          "[data-in='panel']",
          {
            opacity: 0,
            y: 30,
            duration: 0.8,
            stagger: 0.12,
          },
          "-=0.4"
        );
    }, pageRef);

    return () => ctx.revert();
  }, [loadingRestaurant, restaurant]);

  /* ---------- scroll to tables ---------- */

  useLayoutEffect(() => {
    if (
      !availableTables.length ||
      !tablesRef.current
    ) {
      return;
    }

    gsap.fromTo(
      tablesRef.current,
      {
        opacity: 0,
        y: 28,
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: "power3.out",
      }
    );

    tablesRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [availableTables]);

  /* ---------- selected table animation ---------- */

  useLayoutEffect(() => {
    if (!selectedTable) return;

    gsap.fromTo(
      "[data-check]",
      {
        scale: 0,
      },
      {
        scale: 1,
        duration: 0.45,
        ease: "back.out(2.4)",
      }
    );
  }, [selectedTable]);

  /* ---------- error animation ---------- */

  useLayoutEffect(() => {
    if (!error) return;

    gsap.fromTo(
      "[data-alert]",
      {
        x: -10,
        opacity: 0,
      },
      {
        x: 0,
        opacity: 1,
        duration: 0.6,
        ease: "elastic.out(1, 0.45)",
      }
    );
  }, [error]);

  /* ---------- success animation ---------- */

  useLayoutEffect(() => {
    if (!success) return;

    const ctx = gsap.context(() => {
      const circle =
        document.querySelector(
          "[data-ok-circle]"
        );

      const tick =
        document.querySelector(
          "[data-ok-tick]"
        );

      if (!circle || !tick) return;

      const cLen =
        circle.getTotalLength();

      const tLen =
        tick.getTotalLength();

      gsap.set(circle, {
        strokeDasharray: cLen,
        strokeDashoffset: cLen,
      });

      gsap.set(tick, {
        strokeDasharray: tLen,
        strokeDashoffset: tLen,
      });

      gsap
        .timeline({
          defaults: {
            ease: "power2.out",
          },
        })
        .from("[data-ok-box]", {
          opacity: 0,
          scale: 0.92,
          duration: 0.4,
        })
        .to(
          circle,
          {
            strokeDashoffset: 0,
            duration: 0.8,
          },
          0.1
        )
        .to(
          tick,
          {
            strokeDashoffset: 0,
            duration: 0.5,
          },
          0.8
        )
        .from(
          "[data-ok-text]",
          {
            opacity: 0,
            y: 14,
            duration: 0.5,
            stagger: 0.1,
          },
          1
        );
    });

    return () => ctx.revert();
  }, [success]);

  /* ---------- loading ---------- */

  if (loadingRestaurant) {
    return (
      <main className="min-h-screen bg-[#0d0a08] px-5 pb-20 pt-[110px] sm:px-8 lg:px-14 lg:pt-[140px]">
        <div className="mx-auto max-w-[1180px]">
          <div
            className={`h-5 w-40 rounded-lg ${skeleton}`}
          />

          <div
            className={`mt-6 h-16 w-full max-w-md rounded-2xl ${skeleton}`}
          />

          <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_420px]">
            <div
              className={`h-[520px] rounded-3xl ${skeleton}`}
            />

            <div
              className={`h-[520px] rounded-3xl ${skeleton}`}
            />
          </div>
        </div>
      </main>
    );
  }

  /* ---------- restaurant error ---------- */

  if (!restaurant) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0d0a08] px-5">
        <div className="w-full max-w-md rounded-3xl border border-[#f4eee5]/10 bg-white/[0.03] px-8 py-12 text-center">
          <div className="mx-auto h-14 w-14 rounded-full border border-[#dfa274]/45" />

          <h1
            className={`mt-5 text-3xl font-medium text-[#fffaf3] ${serif}`}
          >
            Restaurant unavailable
          </h1>

          <p className="mx-auto mt-2 max-w-xs text-sm leading-7 text-[#a79b8e]">
            {error ||
              "We couldn't find this restaurant."}
          </p>

          <Link
            to="/restaurants"
            className="mt-7 inline-flex h-11 items-center rounded-full bg-[#c88755] px-6 text-[13px] font-bold text-[#171310] transition hover:bg-[#dfa274] active:scale-[0.97]"
          >
            Browse restaurants
          </Link>
        </div>
      </main>
    );
  }

  /* ---------- page ---------- */

  return (
    <main
      ref={pageRef}
      className="relative min-h-screen overflow-x-clip bg-[#0d0a08] text-[#f4eee5]"
    >
      {/* BACKGROUND */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[620px] bg-[radial-gradient(ellipse_55%_70%_at_85%_0%,rgba(200,135,85,0.15),transparent_70%),radial-gradient(ellipse_40%_50%_at_5%_25%,rgba(125,67,34,0.12),transparent_70%)]"
      />

      <div className="relative mx-auto max-w-[1180px] px-5 pb-24 pt-[110px] sm:px-8 lg:px-14 lg:pt-[140px]">
        {/* HEADER */}

        <header className="mb-10">
          <Link
            data-in="head"
            to={`/restaurants/${restaurant._id}`}
            className="group inline-flex items-center gap-2 text-xs font-semibold tracking-[0.04em] text-[#c8bdb0] transition hover:text-[#f4eee5]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
              className="h-3.5 w-3.5 transition group-hover:-translate-x-1"
            >
              <path d="M19 12H5" />
              <path d="m11 18-6-6 6-6" />
            </svg>

            Back to restaurant
          </Link>

          <p
            data-in="head"
            className="mb-5 mt-8 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#dfa274] before:h-px before:w-[34px] before:bg-[#c88755] before:content-['']"
          >
            Table reservation
          </p>

          <h1
            className={`text-[clamp(40px,6vw,76px)] font-medium leading-[1] tracking-[-0.045em] text-[#fffaf3] ${serif}`}
          >
            <span className="block overflow-hidden pb-[0.1em]">
              <span
                data-line
                className="inline-block"
              >
                Reserve your{" "}
                <span className="italic text-[#dfa274]">
                  table.
                </span>
              </span>
            </span>
          </h1>

          <p
            data-in="head"
            className="mt-4 max-w-xl text-[15px] leading-7 text-[#c8bdb0]"
          >
            Choose when you'd like to visit{" "}
            <span className="font-semibold text-[#fffaf3]">
              {restaurant.name}
            </span>
            , pick your table, then pre-order anything
            you'd like ready for your visit.
          </p>
        </header>

        {/* STEPPER */}

        <ol
          data-in="steps"
          className="mb-10 flex items-center"
          aria-label="Reservation progress"
        >
          {steps.map((name, i) => {
            const n = i + 1;

            const done = currentStep > n;
            const active = currentStep === n;

            return (
              <li
                key={name}
                className={`flex items-center ${
                  i < steps.length - 1
                    ? "flex-1"
                    : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border text-xs font-bold transition-all duration-500 ${
                      done
                        ? "border-[#c88755] bg-[#c88755] text-[#171310]"
                        : active
                        ? "border-[#dfa274] text-[#dfa274] shadow-[0_0_0_5px_rgba(200,135,85,0.12)]"
                        : "border-[#f4eee5]/15 text-[#a79b8e]"
                    }`}
                  >
                    {done ? "✓" : n}
                  </span>

                  <span
                    className={`hidden text-[13px] font-semibold transition-colors duration-500 sm:block ${
                      active || done
                        ? "text-[#fffaf3]"
                        : "text-[#a79b8e]"
                    }`}
                  >
                    {name}
                  </span>
                </div>

                {i < steps.length - 1 && (
                  <span className="mx-4 h-px flex-1 overflow-hidden bg-[#f4eee5]/10">
                    <span
                      className={`block h-full bg-[#c88755] transition-[width] duration-700 ease-out ${
                        done ? "w-full" : "w-0"
                      }`}
                    />
                  </span>
                )}
              </li>
            );
          })}
        </ol>

        {/* ALERT */}

        {error && (
          <div
            data-alert
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-2xl border border-[#d8786f]/25 bg-[#d8786f]/10 px-5 py-4 text-sm text-[#e79a93]"
          >
            <span className="mt-0.5 font-bold">
              !
            </span>

            <p>{error}</p>
          </div>
        )}

        <div className="grid items-start gap-8 lg:grid-cols-[1fr_400px]">
          {/* LEFT */}

          <section
            data-in="panel"
            className={`${panel} p-5 sm:p-8`}
          >
            {/* RESTAURANT STRIP */}

            <div className="flex items-center gap-5 border-b border-[#f4eee5]/10 pb-7">
              <div className="h-20 w-28 shrink-0 overflow-hidden rounded-2xl bg-[#211711]">
                {restaurant.image ? (
                  <img
                    src={restaurant.image}
                    alt={restaurant.name}
                    className="h-full w-full object-cover saturate-[0.9]"
                  />
                ) : (
                  <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_30%_20%,rgba(200,135,85,0.25),transparent_60%)]">
                    <span
                      className={`text-3xl text-[#dfa274]/70 ${serif}`}
                    >
                      {restaurant.name?.[0]}
                    </span>
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#dfa274]">
                  {restaurant.cuisine ||
                    "Restaurant"}
                </p>

                <h2
                  className={`mt-1 truncate text-2xl font-medium text-[#fffaf3] ${serif}`}
                >
                  {restaurant.name}
                </h2>

                <p className="mt-1 truncate text-[13px] text-[#a79b8e]">
                  {restaurant.address}
                </p>
              </div>
            </div>

            {/* =========================
                STAGE 1
            ========================= */}

            {reservationStage === 1 && (
              <form
                onSubmit={handleCheckAvailability}
                className="mt-8"
              >
                <h2
                  className={`text-2xl font-medium text-[#fffaf3] ${serif}`}
                >
                  When are you visiting?
                </h2>

                <p className="mt-1 text-sm text-[#a79b8e]">
                  Choose your preferred date, time and
                  party size.
                </p>

                <div className="mt-7 grid gap-5 sm:grid-cols-2">
                  {/* DATE */}

                  <div>
                    <label
                      htmlFor="reservation-date"
                      className={label}
                    >
                      Date
                    </label>

                    <input
                      id="reservation-date"
                      type="date"
                      min={minimumDate}
                      value={date}
                      onChange={(e) => {
                        setDate(
                          e.target.value
                        );
                        resetResults();
                        setError("");
                      }}
                      className={field}
                    />
                  </div>

                  {/* GUESTS */}

                  <div>
                    <span className={label}>
                      Guests
                    </span>

                    <div className="flex h-[54px] items-center justify-between rounded-xl border border-[#f4eee5]/10 bg-white/[0.04] px-2">
                      <button
                        type="button"
                        aria-label="Remove a guest"
                        disabled={guests <= 1}
                        onClick={() => {
                          setGuests((g) =>
                            Math.max(
                              1,
                              g - 1
                            )
                          );

                          resetResults();
                        }}
                        className="grid h-10 w-10 place-items-center rounded-lg text-xl text-[#dfa274] transition hover:bg-white/[0.06] active:scale-90 disabled:opacity-30"
                      >
                        −
                      </button>

                      <span className="text-sm font-semibold text-[#fffaf3]">
                        <Flash value={guests} />{" "}
                        {guests === 1
                          ? "guest"
                          : "guests"}
                      </span>

                      <button
                        type="button"
                        aria-label="Add a guest"
                        disabled={guests >= 12}
                        onClick={() => {
                          setGuests((g) =>
                            Math.min(
                              12,
                              g + 1
                            )
                          );

                          resetResults();
                        }}
                        className="grid h-10 w-10 place-items-center rounded-lg text-xl text-[#dfa274] transition hover:bg-white/[0.06] active:scale-90 disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* START TIME */}

                  <div>
                    <label
                      htmlFor="start-time"
                      className={label}
                    >
                      Start time
                    </label>

                    <input
                      id="start-time"
                      type="time"
                      value={startTime}
                      onChange={(e) =>
                        handleStartTimeChange(
                          e.target.value
                        )
                      }
                      className={field}
                    />
                  </div>

                  {/* END TIME */}

                  <div>
                    <label
                      htmlFor="end-time"
                      className={label}
                    >
                      End time
                    </label>

                    <input
                      id="end-time"
                      type="time"
                      value={endTime}
                      readOnly
                      tabIndex={-1}
                      className={`${field} cursor-not-allowed opacity-80`}
                    />

                    <p className="mt-2 text-[11px] text-[#a79b8e]">
                      End time is calculated from your
                      selected duration.
                    </p>
                  </div>
                </div>

                {/* QUICK DURATIONS */}

                {startTime && (
                  <div className="mt-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="text-xs text-[#a79b8e]">
                        Reservation duration
                      </span>

                      {endTime && (
                        <span className="text-xs font-semibold text-[#dfa274]">
                          {startTime} – {endTime}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {durations.map(
                        ([text, mins]) => {
                          const value =
                            addMinutes(
                              startTime,
                              mins
                            );

                          const active =
                            selectedDuration ===
                              mins &&
                            endTime === value;

                          return (
                            <button
                              key={text}
                              type="button"
                              disabled={!value}
                              onClick={() =>
                                handleDurationChange(
                                  mins
                                )
                              }
                              className={`h-9 rounded-full border px-4 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-30 ${
                                active
                                  ? "border-[#c88755] bg-[#c88755] text-[#171310]"
                                  : "border-[#f4eee5]/10 bg-white/[0.02] text-[#c8bdb0] hover:border-[#dfa274]/50 hover:text-[#fffaf3]"
                              }`}
                            >
                              {text}
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>
                )}

                {/* CHECK AVAILABILITY */}

                <button
                  type="submit"
                  disabled={
                    checkingAvailability
                  }
                  className="mt-7 flex h-[54px] w-full items-center justify-center gap-3 rounded-full bg-[#c88755] text-[13px] font-bold text-[#171310] transition duration-300 hover:bg-[#dfa274] hover:shadow-[0_14px_40px_rgba(200,135,85,0.28)] active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
                >
                  {checkingAvailability && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#171310]/30 border-t-[#171310]" />
                  )}

                  {checkingAvailability
                    ? "Checking tables…"
                    : "Check available tables"}
                </button>
              </form>
            )}

            {/* =========================
                STAGE 2
            ========================= */}

            {reservationStage === 2 && (
              <div
                ref={tablesRef}
                className="mt-8"
              >
                <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                  <div>
                    <h2
                      className={`text-2xl font-medium text-[#fffaf3] ${serif}`}
                    >
                      Choose your table
                    </h2>

                    <p className="mt-1 text-sm text-[#a79b8e]">
                      Select the table you'd like for
                      your visit.
                    </p>
                  </div>

                  <span className="flex shrink-0 items-center gap-2 text-[13px] font-semibold text-[#7fc7ae]">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-[#7fc7ae]" />

                    {availableTables.length}{" "}
                    {availableTables.length === 1
                      ? "table"
                      : "tables"}{" "}
                    available
                  </span>
                </div>

                <div className="mb-6 rounded-2xl border border-[#f4eee5]/10 bg-white/[0.025] p-4">
                  <div className="grid gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-[#a79b8e]">
                        Date
                      </p>

                      <p className="mt-1 font-semibold text-[#fffaf3]">
                        {prettyDate(date)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[#a79b8e]">
                        Time
                      </p>

                      <p className="mt-1 font-semibold text-[#fffaf3]">
                        {startTime} – {endTime}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[#a79b8e]">
                        Guests
                      </p>

                      <p className="mt-1 font-semibold text-[#fffaf3]">
                        {guests}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  {availableTables.map(
                    (table) => (
                      <TableCard
                        key={table._id}
                        table={table}
                        selected={
                          selectedTable?._id ===
                          table._id
                        }
                        onSelect={
                          handleSelectTable
                        }
                      />
                    )
                  )}
                </div>

                <button
                  type="button"
                  disabled={
                    !selectedTable ||
                    loadingMenu
                  }
                  onClick={
                    handleContinueToPreOrder
                  }
                  className="mt-7 flex h-[54px] w-full items-center justify-center gap-3 rounded-full bg-[#c88755] text-[13px] font-bold text-[#171310] transition hover:bg-[#dfa274] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-[#a79b8e]"
                >
                  {loadingMenu ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#171310]/30 border-t-[#171310]" />
                      Loading menu…
                    </>
                  ) : (
                    <>
                      Continue to pre-order
                      <span>→</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* =========================
                STAGE 3
            ========================= */}

            {reservationStage === 3 && (
              <div
                ref={preOrderRef}
                className="mt-8 scroll-mt-8"
              >
                {/* Header */}

                <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#dfa274]">
                      Optional
                    </p>

                    <h2
                      className={`mt-2 text-3xl font-medium text-[#fffaf3] ${serif}`}
                    >
                      Pre-order your food
                    </h2>

                    <p className="mt-2 max-w-xl text-sm leading-6 text-[#a79b8e]">
                      Choose anything you'd like included
                      with your reservation. Your selections
                      will be added to the reservation ticket
                      for the restaurant.
                    </p>
                  </div>

                  {selectedPreOrderCount >
                    0 && (
                    <div className="shrink-0 rounded-full border border-[#dfa274]/25 bg-[#c88755]/10 px-4 py-2 text-xs font-semibold text-[#dfa274]">
                      {selectedPreOrderCount}{" "}
                      {selectedPreOrderCount ===
                      1
                        ? "item"
                        : "items"}{" "}
                      selected
                    </div>
                  )}
                </div>

                {/* Category Filter */}

                {!loadingMenu &&
                  menuItems.length > 0 && (
                    <div className="mb-5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setActiveCategory("all")
                        }
                        className={`h-9 rounded-full border px-4 text-xs font-semibold transition ${
                          activeCategory === "all"
                            ? "border-[#c88755] bg-[#c88755] text-[#171310]"
                            : "border-[#f4eee5]/10 bg-white/[0.02] text-[#c8bdb0] hover:border-[#dfa274]/50 hover:text-[#fffaf3]"
                        }`}
                      >
                        All
                      </button>

                      {categories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() =>
                            setActiveCategory(cat)
                          }
                          className={`h-9 rounded-full border px-4 text-xs font-semibold transition ${
                            activeCategory === cat
                              ? "border-[#c88755] bg-[#c88755] text-[#171310]"
                              : "border-[#f4eee5]/10 bg-white/[0.02] text-[#c8bdb0] hover:border-[#dfa274]/50 hover:text-[#fffaf3]"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}

                {/* Menu Grid */}

                {loadingMenu ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6].map(
                      (item) => (
                        <div
                          key={item}
                          className={`h-72 rounded-2xl ${skeleton}`}
                        />
                      )
                    )}
                  </div>
                ) : menuItems.length === 0 ? (
                  <div className="rounded-2xl border border-[#f4eee5]/10 bg-white/[0.025] px-6 py-10 text-center">
                    <p className="text-sm font-semibold text-[#fffaf3]">
                      No menu items are available
                    </p>

                    <p className="mt-2 text-xs leading-6 text-[#a79b8e]">
                      You can continue without a
                      pre-order.
                    </p>
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="rounded-2xl border border-[#f4eee5]/10 bg-white/[0.025] px-6 py-10 text-center">
                    <p className="text-sm font-semibold text-[#fffaf3]">
                      No items in this category
                    </p>

                    <p className="mt-2 text-xs leading-6 text-[#a79b8e]">
                      Try selecting a different
                      category.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredItems.map((item) => (
                      <PreOrderItem
                        key={item._id}
                        item={item}
                        quantity={getPreOrderQuantity(
                          item._id
                        )}
                        onAdd={handleAddPreOrder}
                        onRemove={
                          handleRemovePreOrder
                        }
                      />
                    ))}
                  </div>
                )}

                {/* Floating Cart Summary (mobile) */}

                {selectedPreOrderCount > 0 && (
                  <div className="fixed bottom-6 left-1/2 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-full border border-[#dfa274]/30 bg-[#17100c]/95 px-5 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:hidden">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#dfa274]">
                          Pre-order
                        </p>

                        <p className="truncate text-sm font-semibold text-[#fffaf3]">
                          {selectedPreOrderCount}{" "}
                          {selectedPreOrderCount ===
                          1
                            ? "item"
                            : "items"}{" "}
                          ·{" "}
                          {formatMoney(preOrderTotal)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={
                          handleContinueToConfirm
                        }
                        className="shrink-0 rounded-full bg-[#c88755] px-4 py-2 text-xs font-bold text-[#171310] transition hover:bg-[#dfa274]"
                      >
                        Continue →
                      </button>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}

                <div className="mt-8 flex flex-col gap-3 pb-20 sm:flex-row sm:pb-0">
                  <button
                    type="button"
                    onClick={() =>
                      setReservationStage(2)
                    }
                    className="h-[54px] flex-1 rounded-full border border-[#f4eee5]/10 bg-white/[0.03] text-[13px] font-bold text-[#c8bdb0] transition hover:border-[#dfa274]/40 hover:text-[#fffaf3]"
                  >
                    ← Back to table
                  </button>

                  <button
                    type="button"
                    onClick={
                      handleContinueToConfirm
                    }
                    className="h-[54px] flex-[1.5] rounded-full bg-[#c88755] text-[13px] font-bold text-[#171310] transition hover:bg-[#dfa274]"
                  >
                    {selectedPreOrderCount > 0
                      ? "Continue to confirmation"
                      : "Skip & continue"}

                    <span className="ml-2">
                      →
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* =========================
                STAGE 4
            ========================= */}

            {reservationStage === 4 && (
              <div className="mt-8">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#dfa274]">
                  Almost done
                </p>

                <h2
                  className={`mt-2 text-3xl font-medium text-[#fffaf3] ${serif}`}
                >
                  Review your reservation
                </h2>

                <p className="mt-2 text-sm leading-6 text-[#a79b8e]">
                  Everything looks good? Confirm your
                  reservation and we'll send the details to
                  the restaurant.
                </p>

                <div className="mt-7 rounded-2xl border border-[#f4eee5]/10 bg-white/[0.025] p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#dfa274]">
                    Booking details
                  </p>

                  <div className="mt-5 grid gap-5 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-[#a79b8e]">
                        Date
                      </p>

                      <p className="mt-1 text-sm font-semibold text-[#fffaf3]">
                        {prettyDate(date)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[#a79b8e]">
                        Time
                      </p>

                      <p className="mt-1 text-sm font-semibold text-[#fffaf3]">
                        {startTime} – {endTime}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[#a79b8e]">
                        Guests
                      </p>

                      <p className="mt-1 text-sm font-semibold text-[#fffaf3]">
                        {guests}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[#a79b8e]">
                        Table
                      </p>

                      <p className="mt-1 text-sm font-semibold text-[#fffaf3]">
                        {selectedTable?.name ||
                          selectedTable?.tableNumber ||
                          "Selected table"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-[#f4eee5]/10 bg-white/[0.025] p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#dfa274]">
                        Pre-order
                      </p>

                      <h3
                        className={`mt-1 text-xl font-medium text-[#fffaf3] ${serif}`}
                      >
                        Food for your table
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setReservationStage(3)
                      }
                      className="text-xs font-semibold text-[#dfa274] hover:text-[#fffaf3]"
                    >
                      Edit
                    </button>
                  </div>

                  {preOrder.length === 0 ? (
                    <p className="mt-5 text-sm text-[#a79b8e]">
                      No food or drinks pre-ordered.
                    </p>
                  ) : (
                    <div className="mt-5 space-y-3">
                      {preOrder.map(
                        (item) => (
                          <div
                            key={item.menuItem}
                            className="flex items-center justify-between gap-4 border-b border-[#f4eee5]/10 pb-3 last:border-0 last:pb-0"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[#fffaf3]">
                                {item.name}
                              </p>

                              <p className="mt-1 text-xs text-[#a79b8e]">
                                {formatMoney(
                                  item.price
                                )}{" "}
                                ×{" "}
                                {item.quantity}
                              </p>
                            </div>

                            <p className="shrink-0 text-sm font-semibold text-[#fffaf3]">
                              {formatMoney(
                                item.price *
                                  item.quantity
                              )}
                            </p>
                          </div>
                        )
                      )}

                      <div className="flex items-center justify-between border-t border-[#f4eee5]/10 pt-4">
                        <span className="text-sm text-[#a79b8e]">
                          Pre-order total
                        </span>

                        <span className="text-base font-bold text-[#dfa274]">
                          {formatMoney(
                            preOrderTotal
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-5">
                  <label
                    htmlFor="reservation-notes"
                    className={label}
                  >
                    Special request{" "}
                    <span className="font-normal text-[#a79b8e]">
                      (optional)
                    </span>
                  </label>

                  <textarea
                    id="reservation-notes"
                    value={notes}
                    onChange={(e) =>
                      setNotes(
                        e.target.value
                      )
                    }
                    maxLength={500}
                    rows={4}
                    placeholder="Birthday, accessibility request, seating preference…"
                    className="w-full resize-none rounded-xl border border-[#f4eee5]/10 bg-white/[0.04] px-4 py-3 text-sm text-[#fffaf3] outline-none transition placeholder:text-[#a79b8e]/60 focus:border-[#dfa274]/70 focus:ring-4 focus:ring-[#c88755]/10"
                  />

                  <p className="mt-2 text-right text-xs text-[#a79b8e]">
                    {notes.length}/500
                  </p>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() =>
                      setReservationStage(3)
                    }
                    className="h-[54px] flex-1 rounded-full border border-[#f4eee5]/10 bg-white/[0.03] text-[13px] font-bold text-[#c8bdb0] transition hover:border-[#dfa274]/40 hover:text-[#fffaf3]"
                  >
                    ← Edit pre-order
                  </button>

                  <button
                    type="button"
                    onClick={
                      handleSubmitReservation
                    }
                    disabled={
                      !selectedTable ||
                      submitting
                    }
                    className="h-[54px] flex-[1.5] rounded-full bg-[#c88755] text-[13px] font-bold text-[#171310] transition hover:bg-[#dfa274] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? (
                      <span className="inline-flex items-center gap-3">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#171310]/30 border-t-[#171310]" />
                        Confirming…
                      </span>
                    ) : (
                      "Confirm reservation"
                    )}
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* RIGHT: SUMMARY */}

          <aside
            data-in="panel"
            className="lg:sticky lg:top-8"
          >
            <div className="relative overflow-hidden rounded-3xl border border-[#dfa274]/25 bg-[#17100c] p-6 shadow-[0_30px_70px_rgba(0,0,0,0.45)] sm:p-7">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(200,135,85,0.22),transparent_70%)]"
              />

              <p className="relative text-[11px] font-bold uppercase tracking-[0.2em] text-[#dfa274]">
                Reservation summary
              </p>

              <h2
                className={`relative mt-3 text-[28px] font-medium leading-tight text-[#fffaf3] ${serif}`}
              >
                {restaurant.name}
              </h2>

              <dl className="relative mt-7 space-y-4 text-sm">
                {[
                  [
                    "Date",
                    prettyDate(date),
                  ],
                  [
                    "Time",
                    startTime && endTime
                      ? `${startTime} – ${endTime}`
                      : "Not selected",
                  ],
                  [
                    "Guests",
                    String(guests),
                  ],
                  [
                    "Table",
                    selectedTable
                      ? selectedTable.name ||
                        selectedTable.tableNumber ||
                        `Table ${selectedTable._id}`
                      : "Not selected",
                  ],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-start justify-between gap-4"
                  >
                    <dt className="text-[#a79b8e]">
                      {k}
                    </dt>

                    <dd
                      className={`text-right font-semibold ${
                        v === "Not selected"
                          ? "text-[#a79b8e]/70"
                          : "text-[#fffaf3]"
                      }`}
                    >
                      <Flash value={v} />
                    </dd>
                  </div>
                ))}
              </dl>

              {/* TICKET PERFORATION */}

              <div
                aria-hidden="true"
                className="relative -mx-6 my-7 sm:-mx-7"
              >
                <div className="border-t border-dashed border-[#f4eee5]/15" />

                <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-[#0d0a08]" />

                <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-[#0d0a08]" />
              </div>

              {/* PRE-ORDER TICKET */}

              <div className="relative">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#dfa274]">
                    Pre-order
                  </p>

                  {selectedPreOrderCount >
                    0 && (
                    <span className="rounded-full bg-[#c88755]/10 px-2.5 py-1 text-[10px] font-bold text-[#dfa274]">
                      {selectedPreOrderCount}{" "}
                      items
                    </span>
                  )}
                </div>

                {preOrder.length === 0 ? (
                  <p className="mt-3 text-xs leading-6 text-[#a79b8e]">
                    No food selected yet. You'll be able
                    to add food after choosing your table.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {preOrder.map(
                      (item) => (
                        <div
                          key={item.menuItem}
                          className="flex items-start justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-[#fffaf3]">
                              {item.name}
                            </p>

                            <p className="mt-0.5 text-[11px] text-[#a79b8e]">
                              ×{" "}
                              {item.quantity}
                            </p>
                          </div>

                          <span className="shrink-0 text-xs font-semibold text-[#c8bdb0]">
                            {formatMoney(
                              item.price *
                                item.quantity
                            )}
                          </span>
                        </div>
                      )
                    )}

                    <div className="flex items-center justify-between border-t border-[#f4eee5]/10 pt-3">
                      <span className="text-xs text-[#a79b8e]">
                        Food total
                      </span>

                      <span className="text-sm font-bold text-[#dfa274]">
                        {formatMoney(
                          preOrderTotal
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* NOTES */}

              {reservationStage < 4 && (
                <div className="relative mt-7">
                  <label
                    htmlFor="reservation-notes"
                    className={label}
                  >
                    Special request{" "}
                    <span className="font-normal text-[#a79b8e]">
                      (optional)
                    </span>
                  </label>

                  <textarea
                    id="reservation-notes"
                    value={notes}
                    onChange={(e) =>
                      setNotes(
                        e.target.value
                      )
                    }
                    maxLength={500}
                    rows={4}
                    placeholder="Birthday, accessibility request, seating preference…"
                    className="w-full resize-none rounded-xl border border-[#f4eee5]/10 bg-white/[0.04] px-4 py-3 text-sm text-[#fffaf3] outline-none transition placeholder:text-[#a79b8e]/60 focus:border-[#dfa274]/70 focus:ring-4 focus:ring-[#c88755]/10"
                  />

                  <p className="mt-2 text-right text-xs text-[#a79b8e]">
                    {notes.length}/500
                  </p>
                </div>
              )}

              {/* ACTION BUTTON */}

              {reservationStage === 1 && (
                <p className="relative mt-5 text-center text-xs text-[#a79b8e]">
                  Enter your date and time to find
                  available tables.
                </p>
              )}

              {reservationStage === 2 && (
                <button
                  type="button"
                  onClick={
                    handleContinueToPreOrder
                  }
                  disabled={
                    !selectedTable ||
                    loadingMenu
                  }
                  className="relative mt-5 flex h-[54px] w-full items-center justify-center gap-3 rounded-full bg-[#c88755] text-[13px] font-bold text-[#171310] transition hover:bg-[#dfa274] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-[#a79b8e]"
                >
                  {loadingMenu ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#171310]/30 border-t-[#171310]" />
                      Loading menu…
                    </>
                  ) : (
                    "Continue to pre-order →"
                  )}
                </button>
              )}

              {reservationStage === 3 && (
                <button
                  type="button"
                  onClick={
                    handleContinueToConfirm
                  }
                  className="relative mt-5 flex h-[54px] w-full items-center justify-center rounded-full bg-[#c88755] text-[13px] font-bold text-[#171310] transition hover:bg-[#dfa274]"
                >
                  Continue to confirmation →
                </button>
              )}

              {reservationStage === 4 && (
                <button
                  type="button"
                  onClick={
                    handleSubmitReservation
                  }
                  disabled={
                    !selectedTable ||
                    submitting
                  }
                  className="relative mt-5 flex h-[54px] w-full items-center justify-center gap-3 rounded-full bg-[#c88755] text-[13px] font-bold text-[#171310] transition hover:bg-[#dfa274] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-[#a79b8e]"
                >
                  {submitting && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#171310]/30 border-t-[#171310]" />
                  )}

                  {submitting
                    ? "Confirming…"
                    : "Confirm reservation"}
                </button>
              )}
            </div>

            {/* GOOD TO KNOW */}

            <div className="mt-4 rounded-2xl border border-[#f4eee5]/10 bg-white/[0.025] p-5">
              <p className="text-sm font-semibold text-[#fffaf3]">
                Good to know
              </p>

              <ul className="mt-3 space-y-2 text-[13px] leading-6 text-[#a79b8e]">
                <li className="flex gap-2">
                  <span className="text-[#c88755]">
                    •
                  </span>

                  Reservations are created as pending.
                </li>

                <li className="flex gap-2">
                  <span className="text-[#c88755]">
                    •
                  </span>

                  Your pre-order is attached to the
                  reservation ticket.
                </li>

                <li className="flex gap-2">
                  <span className="text-[#c88755]">
                    •
                  </span>

                  The restaurant will confirm your
                  reservation.
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>

      {/* SUCCESS OVERLAY */}

      {success && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-[#0d0a08]/90 px-5 backdrop-blur-md"
          role="status"
        >
          <div
            data-ok-box
            className="w-full max-w-sm rounded-3xl border border-[#dfa274]/30 bg-[#17100c] px-8 py-12 text-center shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
          >
            <svg
              viewBox="0 0 80 80"
              fill="none"
              aria-hidden="true"
              className="mx-auto h-24 w-24"
            >
              <circle
                data-ok-circle
                cx="40"
                cy="40"
                r="36"
                stroke="#c88755"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              <path
                data-ok-tick
                d="M25 41l10 10 20-22"
                stroke="#dfa274"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <h2
              data-ok-text
              className={`mt-6 text-3xl font-medium text-[#fffaf3] ${serif}`}
            >
              You're all set
            </h2>

            <p
              data-ok-text
              className="mt-2 text-sm leading-7 text-[#c8bdb0]"
            >
              {success}
            </p>

            <p
              data-ok-text
              className="mt-5 text-xs text-[#a79b8e]"
            >
              Taking you to your reservations…
            </p>
          </div>
        </div>
      )}
    </main>
  );
};

export default Reservation;