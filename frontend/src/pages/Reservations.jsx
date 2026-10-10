import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import gsap from "gsap";

import api from "../services/api";

const statusOptions = [
  "all",
  "pending",
  "confirmed",
  "completed",
  "cancelled",
];

const formatStatus = (status) =>
  status.charAt(0).toUpperCase() +
  status.slice(1);

const formatDate = (date) =>
  new Intl.DateTimeFormat("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(date));

const isToday = (date) =>
  new Date(date).toDateString() ===
  new Date().toDateString();

const initials = (name = "Guest") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("") || "G";

const Reservations = () => {
  const [reservations, setReservations] =
    useState([]);

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [loading, setLoading] =
    useState(true);

  const [updatingId, setUpdatingId] =
    useState(null);

  const [error, setError] = useState("");

  const pageRef = useRef(null);

  // ==========================================
  // LOAD RESERVATIONS
  // ==========================================

  const loadReservations = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        "/reservations/restaurant"
      );

      setReservations(
        response.data.reservations || []
      );
    } catch (err) {
      console.error(
        "Reservations error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to load reservations."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReservations();
  }, []);

  // ==========================================
  // COUNTS
  // ==========================================

  const counts = useMemo(() => {
    const result = {
      all: reservations.length,
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
    };

    reservations.forEach((reservation) => {
      if (
        result[reservation.status] !==
        undefined
      ) {
        result[reservation.status] += 1;
      }
    });

    return result;
  }, [reservations]);

  // ==========================================
  // FILTER
  // ==========================================

  const filteredReservations = useMemo(() => {
    if (statusFilter === "all") {
      return reservations;
    }

    return reservations.filter(
      (reservation) =>
        reservation.status ===
        statusFilter
    );
  }, [
    reservations,
    statusFilter,
  ]);

  // ==========================================
  // UPDATE STATUS
  // ==========================================

  const updateStatus = async (
    reservationId,
    status
  ) => {
    try {
      setUpdatingId(reservationId);
      setError("");

      const response = await api.put(
        `/reservations/restaurant/${reservationId}/status`,
        { status }
      );

      const updated =
        response.data.reservation;

      setReservations((current) =>
        current.map((reservation) =>
          reservation._id === reservationId
            ? updated
            : reservation
        )
      );
    } catch (err) {
      console.error(
        "Update reservation error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to update reservation."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  // ==========================================
  // GSAP STAT ANIMATION
  // ==========================================

  useLayoutEffect(() => {
    if (loading) return;

    const ctx = gsap.context(() => {
      gsap.from(".reservation-stat", {
        y: 16,
        opacity: 0,
        duration: 0.5,
        stagger: 0.07,
        ease: "power2.out",
      });

      gsap.utils
        .toArray(".reservation-stat-value")
        .forEach((element) => {
          const target =
            Number(element.dataset.value) || 0;

          const object = { value: 0 };

          gsap.to(object, {
            value: target,
            duration: 0.8,
            ease: "power2.out",

            onUpdate: () => {
              element.textContent =
                Math.round(object.value);
            },
          });
        });
    }, pageRef);

    return () => ctx.revert();
  }, [loading]);

  // ==========================================
  // GSAP CARD ANIMATION
  // ==========================================

  useLayoutEffect(() => {
    if (loading) return;

    const ctx = gsap.context(() => {
      gsap.from(".reservation-card", {
        y: 18,
        opacity: 0,
        duration: 0.45,
        stagger: {
          each: 0.05,
          amount: 0.5,
        },
        ease: "power2.out",
        clearProps: "transform,opacity",
      });
    }, pageRef);

    return () => ctx.revert();
  }, [
    loading,
    statusFilter,
  ]);

  // ==========================================
  // STATS
  // ==========================================

  const stats = [
    {
      label: "Total",
      value: counts.all,
      style:
        "border-slate-200 bg-white text-slate-950",
    },
    {
      label: "Pending",
      value: counts.pending,
      style:
        "border-amber-100 bg-amber-50 text-amber-950",
    },
    {
      label: "Confirmed",
      value: counts.confirmed,
      style:
        "border-blue-100 bg-blue-50 text-blue-950",
    },
    {
      label: "Completed",
      value: counts.completed,
      style:
        "border-emerald-100 bg-emerald-50 text-emerald-950",
    },
  ];

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <section
      ref={pageRef}
      className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl space-y-8">

        {/* ======================================
            HEADER
        ======================================= */}

        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />

              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Restaurant management
              </p>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Reservations
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              Review and manage every
              reservation made at your
              restaurant.
            </p>
          </div>

          <button
            type="button"
            onClick={loadReservations}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg
              viewBox="0 0 24 24"
              className={`h-4 w-4 ${
                loading
                  ? "animate-spin"
                  : ""
              }`}
              aria-hidden="true"
            >
              <path
                d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            {loading
              ? "Refreshing"
              : "Refresh"}
          </button>
        </header>

        {/* ======================================
            ERROR
        ======================================= */}

        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          >
            {error}
          </div>
        )}

        {/* ======================================
            STATS
        ======================================= */}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={`reservation-stat rounded-3xl border p-5 shadow-sm ${stat.style}`}
            >
              <span className="text-sm font-medium opacity-70">
                {stat.label}
              </span>

              <strong
                className="reservation-stat-value mt-3 block text-3xl font-semibold"
                data-value={stat.value}
              >
                {loading
                  ? "–"
                  : stat.value}
              </strong>

              <p className="mt-1 text-xs opacity-60">
                Reservations
              </p>
            </div>
          ))}
        </div>

        {/* ======================================
            FILTER TOOLBAR
        ======================================= */}

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div
              className="flex gap-2 overflow-x-auto pb-1"
              role="tablist"
              aria-label="Filter by status"
            >
              {statusOptions.map(
                (status) => {
                  const active =
                    statusFilter ===
                    status;

                  return (
                    <button
                      key={status}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() =>
                        setStatusFilter(
                          status
                        )
                      }
                      className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
                        active
                          ? "bg-slate-950 text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {status === "all"
                        ? "All"
                        : formatStatus(
                            status
                          )}

                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                          active
                            ? "bg-white/15 text-white"
                            : "bg-white text-slate-500"
                        }`}
                      >
                        {
                          counts[
                            status
                          ]
                        }
                      </span>
                    </button>
                  );
                }
              )}
            </div>

            <p className="text-xs font-medium text-slate-400 lg:shrink-0">
              {loading
                ? ""
                : `Showing ${filteredReservations.length} of ${counts.all}`}
            </p>
          </div>
        </div>

        {/* ======================================
            CONTENT
        ======================================= */}

        {loading ? (
          <div
            className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
            aria-busy="true"
          >
            <div className="space-y-3">
              {[0, 1, 2].map(
                (item) => (
                  <div
                    key={item}
                    className="h-28 animate-pulse rounded-2xl bg-slate-100"
                  />
                )
              )}
            </div>
          </div>
        ) : filteredReservations.length ===
          0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
              <svg
                viewBox="0 0 24 24"
                className="h-7 w-7 text-slate-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              >
                <rect
                  x="3"
                  y="4"
                  width="18"
                  height="17"
                  rx="2"
                />

                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>

            <h2 className="mt-5 text-xl font-semibold text-slate-950">
              No{" "}
              {statusFilter ===
              "all"
                ? ""
                : statusFilter}{" "}
              reservations yet.
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              New bookings will show up
              here.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

            {/* DESKTOP TABLE HEADER */}

            <div className="hidden grid-cols-[1.2fr_1.5fr_1fr_1fr_1.3fr] gap-4 border-b border-slate-100 bg-slate-50 px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400 lg:grid">
              <span>Date & time</span>
              <span>Guest</span>
              <span>Table</span>
              <span>Status</span>
              <span>Actions</span>
            </div>

            {/* RESERVATIONS */}

            <div className="divide-y divide-slate-100">
              {filteredReservations.map(
                (reservation) => {
                  const busy =
                    updatingId ===
                    reservation._id;

                  return (
                    <article
                      key={
                        reservation._id
                      }
                      className={`reservation-card grid gap-5 p-5 transition hover:bg-slate-50/70 lg:grid-cols-[1.2fr_1.5fr_1fr_1fr_1.3fr] lg:items-center lg:gap-4 lg:px-6 ${
                        reservation.status ===
                        "cancelled"
                          ? "opacity-70"
                          : ""
                      }`}
                    >
                      {/* DATE */}

                      <div className="flex items-start justify-between lg:block">
                        <div>
                          {isToday(
                            reservation.date
                          ) && (
                            <span className="mb-2 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                              Today
                            </span>
                          )}

                          <p className="text-sm font-semibold text-slate-900">
                            {formatDate(
                              reservation.date
                            )}
                          </p>

                          <div className="mt-1 flex items-center gap-1.5">
                            <strong className="text-base text-slate-950">
                              {
                                reservation.startTime
                              }
                            </strong>

                            <span className="text-xs text-slate-400">
                              until
                            </span>

                            <span className="text-xs text-slate-500">
                              {
                                reservation.endTime
                              }
                            </span>
                          </div>
                        </div>

                        {/* MOBILE STATUS */}

                        <div className="lg:hidden">
                          <StatusPill
                            status={
                              reservation.status
                            }
                          />
                        </div>
                      </div>

                      {/* GUEST */}

                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold text-white">
                          {initials(
                            reservation
                              .customer
                              ?.name
                          )}
                        </div>

                        <div className="min-w-0">
                          <strong className="block truncate text-sm font-semibold text-slate-900">
                            {reservation
                              .customer
                              ?.name ||
                              "Guest"}
                          </strong>

                          {reservation
                            .customer
                            ?.email ? (
                            <a
                              href={`mailto:${reservation.customer.email}`}
                              className="block truncate text-xs text-slate-400 transition hover:text-slate-700"
                            >
                              {
                                reservation
                                  .customer
                                  .email
                              }
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400">
                              No email
                            </span>
                          )}
                        </div>
                      </div>

                      {/* TABLE */}

                      <div>
                        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400 lg:hidden">
                          Table
                        </span>

                        <strong className="block text-sm font-semibold text-slate-900">
                          {reservation
                            .table
                            ?.name || "—"}
                        </strong>

                        <small className="mt-1 block text-xs text-slate-400">
                          {
                            reservation.guests
                          }{" "}
                          {reservation.guests ===
                          1
                            ? "guest"
                            : "guests"}
                        </small>
                      </div>

                      {/* STATUS */}

                      <div className="hidden lg:block">
                        <StatusPill
                          status={
                            reservation.status
                          }
                        />
                      </div>

                      {/* ACTIONS */}

                      <div className="flex flex-wrap gap-2">
                        {reservation.status ===
                          "pending" && (
                          <>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                updateStatus(
                                  reservation._id,
                                  "confirmed"
                                )
                              }
                              className="rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {busy
                                ? "Updating…"
                                : "Confirm"}
                            </button>

                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                updateStatus(
                                  reservation._id,
                                  "cancelled"
                                )
                              }
                              className="rounded-xl bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </>
                        )}

                        {reservation.status ===
                          "confirmed" && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              updateStatus(
                                reservation._id,
                                "completed"
                              )
                            }
                            className="rounded-xl bg-slate-950 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {busy
                              ? "Updating…"
                              : "Mark completed"}
                          </button>
                        )}

                        {(reservation.status ===
                          "completed" ||
                          reservation.status ===
                            "cancelled") && (
                          <span className="text-xs font-medium text-slate-400">
                            No actions
                          </span>
                        )}
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

// ==========================================
// STATUS PILL
// ==========================================

const StatusPill = ({ status }) => {
  const styles = {
    pending:
      "bg-amber-50 text-amber-700 ring-amber-200",
    confirmed:
      "bg-blue-50 text-blue-700 ring-blue-200",
    completed:
      "bg-emerald-50 text-emerald-700 ring-emerald-200",
    cancelled:
      "bg-red-50 text-red-700 ring-red-200",
  };

  const dots = {
    pending: "bg-amber-500",
    confirmed: "bg-blue-500",
    completed: "bg-emerald-500",
    cancelled: "bg-red-500",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${
        styles[status] ||
        "bg-slate-100 text-slate-600 ring-slate-200"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          dots[status] ||
          "bg-slate-400"
        }`}
      />

      {formatStatus(status)}
    </span>
  );
};

export default Reservations;