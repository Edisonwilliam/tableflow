import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import api from "../services/api";

gsap.registerPlugin(ScrollTrigger);

/* ---------- tokens ---------- */

const serif = "font-['Playfair_Display',serif]";
const skeleton = "animate-pulse bg-white/[0.05]";

const statusStyles = {
  pending: { label: "Pending", cls: "bg-[#e3b04b]/12 text-[#e3b04b]", pulse: true },
  confirmed: { label: "Confirmed", cls: "bg-[#6fb8a0]/12 text-[#7fc7ae]" },
  completed: { label: "Completed", cls: "bg-[#dfa274]/12 text-[#dfa274]" },
  cancelled: { label: "Cancelled", cls: "bg-[#d8786f]/12 text-[#e79a93]" },
};

const tabs = [
  ["all", "All"],
  ["upcoming", "Upcoming"],
  ["past", "Past"],
  ["cancelled", "Cancelled"],
];

/* ---------- date helpers (dates are stored as UTC midnight) ---------- */

const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

const todayKey = () => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
};

const daysUntil = (d) => Math.round((Date.parse(dayKey(d)) - Date.parse(todayKey())) / 86400000);

const parts = (d) => {
  const date = new Date(d);
  return {
    weekday: date.toLocaleDateString("en-NG", { weekday: "short", timeZone: "UTC" }),
    day: date.getUTCDate(),
    month: date.toLocaleDateString("en-NG", { month: "short", timeZone: "UTC" }),
    year: date.getUTCFullYear(),
  };
};

const isUpcoming = (r) => ["pending", "confirmed"].includes(r.status) && dayKey(r.date) >= todayKey();

const countdown = (d) => {
  const n = daysUntil(d);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  return `In ${n} days`;
};

/* status pill that pops when its status changes */
const Pill = ({ status }) => {
  const ref = useRef(null);
  const first = useRef(true);
  const s = statusStyles[status] || { label: status, cls: "bg-white/10 text-[#c8bdb0]" };

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    gsap.fromTo(ref.current, { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(2.4)" });
  }, [status]);

  return (
    <span ref={ref} className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold ${s.cls}`}>
      <i className={`h-[7px] w-[7px] rounded-full bg-current ${s.pulse ? "animate-pulse" : ""}`} />
      {s.label}
    </span>
  );
};

const Detail = ({ label, children, sub }) => (
  <div className="min-w-0">
    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a79b8e]">{label}</p>
    <p className="mt-1.5 truncate text-sm font-semibold text-[#fffaf3]">{children}</p>
    {sub && <p className="mt-0.5 truncate text-xs text-[#a79b8e]">{sub}</p>}
  </div>
);

const Reservations = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);
  const [tab, setTab] = useState("all");

  const pageRef = useRef(null);

  /* ---------- data ---------- */

  const fetchReservations = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      setError("");
      const response = await api.get("/reservations/my");
      setReservations(response.data.reservations || []);
    } catch (err) {
      console.error("Reservations error:", err);
      setError(err.response?.data?.message || "Unable to load your reservations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const handleCancel = async (reservationId) => {
    try {
      setCancellingId(reservationId);
      setError("");
      await api.put(`/reservations/my/${reservationId}/cancel`);
      setConfirmingId(null);
      await fetchReservations({ silent: true }); // refresh without flashing the skeleton
    } catch (err) {
      console.error("Cancel reservation error:", err);
      setError(err.response?.data?.message || "Unable to cancel reservation.");
    } finally {
      setCancellingId(null);
    }
  };

  /* ---------- derived ---------- */

  const counts = useMemo(() => {
    const upcoming = reservations.filter(isUpcoming).length;
    const cancelled = reservations.filter((r) => r.status === "cancelled").length;
    return {
      all: reservations.length,
      upcoming,
      cancelled,
      past: reservations.length - upcoming - cancelled,
      pending: reservations.filter((r) => r.status === "pending").length,
      completed: reservations.filter((r) => r.status === "completed").length,
    };
  }, [reservations]);

  const visible = useMemo(() => {
    const up = reservations.filter(isUpcoming).sort((a, b) => new Date(a.date) - new Date(b.date));
    const cancelled = reservations.filter((r) => r.status === "cancelled").sort((a, b) => new Date(b.date) - new Date(a.date));
    const past = reservations
      .filter((r) => !isUpcoming(r) && r.status !== "cancelled")
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (tab === "upcoming") return up;
    if (tab === "past") return past;
    if (tab === "cancelled") return cancelled;
    return [...up, ...past, ...cancelled];
  }, [reservations, tab]);

  /* ---------- animation ---------- */

  useLayoutEffect(() => {
    if (loading) return;
    const ctx = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .from("[data-in]", { opacity: 0, y: 18, duration: 0.6, stagger: 0.08 })
        .from("[data-line]", { yPercent: 110, duration: 0.9 }, "-=0.55")
        .from("[data-stat]", { opacity: 0, y: 16, duration: 0.5, stagger: 0.07 }, "-=0.4");

      gsap.utils.toArray("[data-count]").forEach((el) => {
        const obj = { v: 0 };
        gsap.to(obj, {
          v: Number(el.dataset.count) || 0,
          duration: 0.9,
          ease: "power2.out",
          onUpdate: () => (el.textContent = Math.round(obj.v)),
        });
      });
    }, pageRef);
    return () => ctx.revert();
  }, [loading]);

  // tickets slide in as they scroll into view; replays on tab change
  useLayoutEffect(() => {
    if (loading) return;
    const ctx = gsap.context(() => {
      gsap.set("[data-ticket]", { opacity: 0, y: 32 });
      ScrollTrigger.batch("[data-ticket]", {
        start: "top 94%",
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, {
            opacity: 1,
            y: 0,
            duration: 0.65,
            stagger: 0.09,
            ease: "power3.out",
            overwrite: true,
            clearProps: "transform",
          }),
      });
    }, pageRef);
    return () => ctx.revert();
  }, [loading, tab, reservations]);

  // inline cancel confirmation slides in
  useLayoutEffect(() => {
    if (!confirmingId) return;
    gsap.fromTo("[data-confirm]", { opacity: 0, x: 14 }, { opacity: 1, x: 0, duration: 0.35, ease: "power2.out" });
  }, [confirmingId]);

  // errors nudge
  useLayoutEffect(() => {
    if (!error) return;
    gsap.fromTo("[data-alert]", { x: -10, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6, ease: "elastic.out(1, 0.45)" });
  }, [error]);

  /* ---------- loading ---------- */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0d0a08] px-5 pb-24 pt-[110px] sm:px-8 lg:px-14 lg:pt-[140px]">
        <div className="mx-auto max-w-[1080px]">
          <div className={`h-4 w-32 rounded-lg ${skeleton}`} />
          <div className={`mt-8 h-16 w-full max-w-md rounded-2xl ${skeleton}`} />
          <div className={`mt-10 h-24 rounded-3xl ${skeleton}`} />
          <div className="mt-10 space-y-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`h-52 rounded-3xl border border-[#f4eee5]/10 ${skeleton}`} />
            ))}
          </div>
        </div>
      </main>
    );
  }

  /* ---------- page ---------- */

  return (
    <main ref={pageRef} className="relative min-h-screen overflow-x-clip bg-[#0d0a08] text-[#f4eee5]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[620px] bg-[radial-gradient(ellipse_55%_70%_at_85%_0%,rgba(200,135,85,0.15),transparent_70%),radial-gradient(ellipse_40%_50%_at_5%_25%,rgba(125,67,34,0.12),transparent_70%)]"
      />

      <div className="relative mx-auto max-w-[1080px] px-5 pb-28 pt-[110px] sm:px-8 lg:px-14 lg:pt-[140px]">
        {/* HEADER */}
        <header className="mb-10">
          <Link
            data-in
            to="/restaurants"
            className="group inline-flex items-center gap-2 text-xs font-semibold tracking-[0.04em] text-[#c8bdb0] transition hover:text-[#f4eee5]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="h-3.5 w-3.5 transition group-hover:-translate-x-1">
              <path d="M19 12H5" />
              <path d="m11 18-6-6 6-6" />
            </svg>
            Explore restaurants
          </Link>

          <p data-in className="mb-5 mt-8 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#dfa274] before:h-px before:w-[34px] before:bg-[#c88755] before:content-['']">
            Your dining plans
          </p>

          <h1 className={`text-[clamp(40px,6vw,76px)] font-medium leading-[1] tracking-[-0.045em] text-[#fffaf3] ${serif}`}>
            <span className="block overflow-hidden pb-[0.1em]">
              <span data-line className="inline-block">
                My <span className="italic text-[#dfa274]">reservations.</span>
              </span>
            </span>
          </h1>

          <p data-in className="mt-4 max-w-xl text-[15px] leading-7 text-[#c8bdb0]">
            Keep track of your upcoming visits, reservation times, tables and booking status.
          </p>
        </header>

        {error && (
          <div data-alert role="alert" className="mb-6 flex items-start gap-3 rounded-2xl border border-[#d8786f]/25 bg-[#d8786f]/10 px-5 py-4 text-sm text-[#e79a93]">
            <span className="mt-0.5 font-bold">!</span>
            <p>{error}</p>
          </div>
        )}

        {reservations.length === 0 && !error ? (
          /* EMPTY */
          <section data-in className="rounded-3xl border border-dashed border-[#f4eee5]/[0.18] px-6 py-24 text-center">
            <div className="mx-auto h-14 w-14 animate-pulse rounded-full border border-[#dfa274]/45" />
            <h2 className={`mt-6 text-3xl font-medium text-[#fffaf3] ${serif}`}>No reservations yet</h2>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-[#a79b8e]">
              You haven't booked a table yet. Discover a restaurant and make your next dining experience special.
            </p>
            <Link
              to="/restaurants"
              className="mt-8 inline-flex h-12 items-center rounded-full bg-[#c88755] px-7 text-[13px] font-bold text-[#171310] transition hover:bg-[#dfa274] hover:shadow-[0_14px_40px_rgba(200,135,85,0.28)] active:scale-[0.97]"
            >
              Explore restaurants
            </Link>
          </section>
        ) : (
          <>
            {/* STATS */}
            <div className="mb-8 grid grid-cols-3 overflow-hidden rounded-3xl border border-[#f4eee5]/10 bg-gradient-to-br from-white/[0.05] to-white/[0.012]">
              {[
                ["Upcoming", counts.upcoming, "bg-[#7fc7ae]"],
                ["Awaiting confirmation", counts.pending, "bg-[#e3b04b]"],
                ["Completed", counts.completed, "bg-[#dfa274]"],
              ].map(([name, value, dot]) => (
                <div key={name} data-stat className="border-l border-[#f4eee5]/10 px-5 py-6 first:border-l-0 sm:px-8 sm:py-7">
                  <p className="flex items-center gap-2 text-xs font-medium text-[#a79b8e]">
                    <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${dot}`} />
                    <span className="truncate">{name}</span>
                  </p>
                  <p data-count={value} className={`mt-3 text-4xl font-medium leading-none tabular-nums text-[#fffaf3] sm:text-5xl ${serif}`}>
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {/* TABS */}
            <div
              data-in
              role="tablist"
              aria-label="Filter reservations"
              className="mb-8 flex w-fit max-w-full gap-1 overflow-x-auto rounded-full border border-[#f4eee5]/10 bg-white/[0.025] p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {tabs.map(([key, name]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                  className={`inline-flex h-[38px] shrink-0 items-center gap-2 rounded-full px-4 text-[13px] font-semibold transition duration-300 ${
                    tab === key ? "bg-[#c88755] text-[#171310]" : "text-[#c8bdb0] hover:text-[#f4eee5]"
                  }`}
                >
                  {name}
                  <span className={`min-w-[22px] rounded-full px-1.5 py-0.5 text-center text-[11px] ${tab === key ? "bg-[#171310]/20" : "bg-white/[0.07]"}`}>
                    {counts[key]}
                  </span>
                </button>
              ))}
            </div>

            {/* TICKETS */}
            {visible.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[#f4eee5]/[0.18] px-6 py-20 text-center">
                <p className="text-base font-semibold text-[#fffaf3]">Nothing here yet</p>
                <p className="mt-1 text-sm text-[#a79b8e]">Reservations in this group will appear here.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {visible.map((r) => {
                  const d = parts(r.date);
                  const upcoming = isUpcoming(r);
                  const dim = r.status === "cancelled";
                  const confirming = confirmingId === r._id;
                  const busy = cancellingId === r._id;

                  return (
                    <article
                      key={r._id}
                      data-ticket
                      className="group relative flex flex-col overflow-hidden rounded-3xl border border-[#f4eee5]/10 bg-gradient-to-br from-white/[0.05] to-white/[0.012] transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-[#dfa274]/35 hover:shadow-[0_28px_60px_rgba(0,0,0,0.45)] sm:flex-row"
                    >
                      {/* date stub */}
                      <div className={`flex items-center justify-between gap-4 px-6 py-5 sm:w-[176px] sm:shrink-0 sm:flex-col sm:justify-center sm:gap-1 sm:px-4 sm:py-8 sm:text-center ${dim ? "opacity-50" : ""}`}>
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#dfa274]">{d.weekday}</p>
                        <p className={`text-[56px] font-medium leading-none text-[#fffaf3] sm:text-[64px] ${serif}`}>{d.day}</p>
                        <p className="text-[13px] text-[#c8bdb0]">
                          {d.month} {d.year}
                        </p>
                        {upcoming && (
                          <span className="rounded-full bg-[#c88755]/15 px-3 py-1 text-[11px] font-bold text-[#dfa274] sm:mt-3">
                            {countdown(r.date)}
                          </span>
                        )}
                      </div>

                      {/* perforation */}
                      <div aria-hidden="true" className="relative border-t border-dashed border-[#f4eee5]/15 sm:self-stretch sm:border-l sm:border-t-0">
                        <span className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-[#0d0a08] sm:left-1/2 sm:top-[-12px] sm:-translate-x-1/2 sm:translate-y-0" />
                        <span className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-[#0d0a08] sm:bottom-[-12px] sm:left-1/2 sm:right-auto sm:top-auto sm:-translate-x-1/2 sm:translate-y-0" />
                      </div>

                      {/* body */}
                      <div className="min-w-0 flex-1 p-6 sm:p-8">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className={`min-w-0 ${dim ? "opacity-60" : ""}`}>
                            <h2 className={`truncate text-[28px] font-medium leading-tight tracking-[-0.02em] text-[#fffaf3] ${serif}`}>
                              {r.restaurant?.name || "Restaurant"}
                            </h2>
                            {r.restaurant?.address && (
                              <p className="mt-1.5 flex items-start gap-2 text-[13px] text-[#a79b8e]">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="mt-0.5 h-[15px] w-[15px] shrink-0 text-[#c88755]">
                                  <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
                                  <circle cx="12" cy="10" r="2.5" />
                                </svg>
                                <span className="line-clamp-1">{r.restaurant.address}</span>
                              </p>
                            )}
                          </div>
                          <Pill status={r.status} />
                        </div>

                        <div className={`mt-6 grid grid-cols-2 gap-x-5 gap-y-5 border-t border-[#f4eee5]/10 pt-6 lg:grid-cols-4 ${dim ? "opacity-60" : ""}`}>
                          <Detail label="Time">
                            {r.startTime} – {r.endTime}
                          </Detail>
                          <Detail label="Guests">
                            {r.guests} {r.guests === 1 ? "guest" : "guests"}
                          </Detail>
                          <Detail label="Table" sub={r.table?.location}>
                            {r.table?.name || "Assigned table"}
                          </Detail>
                          <Detail label="Booking ID">#{r._id.slice(-8).toUpperCase()}</Detail>
                        </div>

                        {r.notes && (
                          <div className="mt-6 rounded-2xl border border-[#dfa274]/15 bg-[#c88755]/[0.07] px-5 py-4">
                            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#dfa274]">Your note</p>
                            <p className="mt-1.5 text-sm leading-6 text-[#c8bdb0]">{r.notes}</p>
                          </div>
                        )}

                        {/* actions */}
                        <div className="mt-6 flex flex-wrap items-center gap-3">
                          {r.restaurant?._id && (
                            <Link
                              to={`/restaurants/${r.restaurant._id}`}
                              className="inline-flex h-10 items-center rounded-full border border-[#f4eee5]/[0.18] px-5 text-xs font-semibold text-[#f4eee5] transition hover:border-[#dfa274]/60 hover:bg-[#c88755]/10"
                            >
                              View restaurant
                            </Link>
                          )}

                          {r.status === "pending" &&
                            (confirming ? (
                              <div data-confirm className="flex flex-wrap items-center gap-2">
                                <span className="text-xs text-[#c8bdb0]">Cancel this reservation?</span>
                                <button
                                  type="button"
                                  onClick={() => handleCancel(r._id)}
                                  disabled={busy}
                                  className="inline-flex h-10 items-center gap-2 rounded-full bg-[#d8786f] px-5 text-xs font-bold text-[#171310] transition hover:bg-[#e79a93] active:scale-[0.97] disabled:cursor-wait disabled:opacity-60"
                                >
                                  {busy && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#171310]/30 border-t-[#171310]" />}
                                  {busy ? "Cancelling…" : "Yes, cancel"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmingId(null)}
                                  disabled={busy}
                                  className="inline-flex h-10 items-center rounded-full px-4 text-xs font-semibold text-[#c8bdb0] transition hover:text-[#fffaf3]"
                                >
                                  Keep it
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmingId(r._id)}
                                className="inline-flex h-10 items-center rounded-full border border-[#d8786f]/35 px-5 text-xs font-semibold text-[#e79a93] transition hover:border-[#d8786f]/60 hover:bg-[#d8786f]/10"
                              >
                                Cancel reservation
                              </button>
                            ))}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
};

export default Reservations;