import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [restaurant, setRestaurant] = useState(null);
  const [tables, setTables] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [reservations, setReservations] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError("");

        const [
          restaurantResponse,
          tablesResponse,
          menuResponse,
          reservationsResponse,
        ] = await Promise.all([
          api.get("/restaurants/my"),
          api.get("/tables"),
          api.get("/menu"),
          api.get("/reservations/restaurant"),
        ]);

        setRestaurant(
          restaurantResponse.data.restaurant
        );

        setTables(
          tablesResponse.data.tables || []
        );

        setMenuItems(
          menuResponse.data.menuItems || []
        );

        setReservations(
          reservationsResponse.data.reservations || []
        );
      } catch (err) {
        console.error(
          "Dashboard data error:",
          err
        );

        setError(
          err.response?.data?.message ||
            "Unable to load dashboard data."
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const pendingReservations = useMemo(() => {
    return reservations.filter(
      (reservation) =>
        reservation.status === "pending"
    ).length;
  }, [reservations]);

  const confirmedReservations = useMemo(() => {
    return reservations.filter(
      (reservation) =>
        reservation.status === "confirmed"
    ).length;
  }, [reservations]);

  const availableTables = useMemo(() => {
    return tables.filter(
      (table) => table.isAvailable
    ).length;
  }, [tables]);

  const todayReservations = useMemo(() => {
    const today = new Date();

    return reservations
      .filter((reservation) => {
        const reservationDate = new Date(
          reservation.date
        );

        return (
          reservationDate.getFullYear() ===
            today.getFullYear() &&
          reservationDate.getMonth() ===
            today.getMonth() &&
          reservationDate.getDate() ===
            today.getDate()
        );
      })
      .sort((a, b) =>
        a.startTime.localeCompare(b.startTime)
      );
  }, [reservations]);

  const formatDate = (date) => {
    return new Intl.DateTimeFormat("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(date));
  };

  if (loading) {
    return (
      <section className="tf-dashboard-page">
        <div className="tf-dashboard-loading">
          Loading your restaurant...
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="tf-dashboard-page">
        <div className="tf-dashboard-error">
          <p>{error}</p>

          <button
            type="button"
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="tf-dashboard-page">
      {/* Header */}
      <div className="tf-dashboard-page-header">
        <button
          type="button"
          className="tf-dashboard-back"
          onClick={() => navigate("/")}
        >
          <span className="tf-dashboard-back-icon">
            ←
          </span>
          Home
        </button>

        <div>
          <p className="tf-dashboard-eyebrow">
            {restaurant?.name || "Restaurant overview"}
          </p>

          <h1 className="tf-dashboard-title">
            Good evening
            {user?.name
              ? `, ${user.name.split(" ")[0]}`
              : ""}
            .
          </h1>

          <p className="tf-dashboard-subtitle">
            Here's what's happening with your
            restaurant today.
          </p>
        </div>
      </div>

      {/* Statistics */}
      <div className="tf-dashboard-stats">
        <div className="tf-dashboard-stat-card">
          <span>Total reservations</span>

          <strong>
            {reservations.length}
          </strong>
        </div>

        <div className="tf-dashboard-stat-card">
          <span>Pending</span>

          <strong>
            {pendingReservations}
          </strong>
        </div>

        <div className="tf-dashboard-stat-card">
          <span>Confirmed</span>

          <strong>
            {confirmedReservations}
          </strong>
        </div>

        <div className="tf-dashboard-stat-card">
          <span>Available tables</span>

          <strong>
            {availableTables}
          </strong>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="tf-dashboard-content-grid">
        {/* Today's Reservations */}
        <section className="tf-dashboard-panel">
          <div className="tf-dashboard-panel-header">
            <div>
              <p className="tf-dashboard-panel-eyebrow">
                Today
              </p>

              <h2>
                Today's reservations
              </h2>
            </div>

            <span className="tf-dashboard-panel-count">
              {todayReservations.length}
            </span>
          </div>

          {todayReservations.length === 0 ? (
            <div className="tf-dashboard-empty">
              <span className="tf-dashboard-empty-mark">
                —
              </span>

              <p>
                No reservations scheduled for
                today.
              </p>
            </div>
          ) : (
            <div className="tf-dashboard-reservations">
              {todayReservations.map(
                (reservation) => (
                  <div
                    key={reservation._id}
                    className="tf-dashboard-reservation"
                  >
                    <div className="tf-dashboard-reservation-time">
                      <strong>
                        {reservation.startTime}
                      </strong>

                      <span>
                        {reservation.endTime}
                      </span>
                    </div>

                    <div className="tf-dashboard-reservation-info">
                      <strong>
                        {reservation.customer?.name ||
                          "Guest"}
                      </strong>

                      <span>
                        {reservation.guests}{" "}
                        {reservation.guests === 1
                          ? "guest"
                          : "guests"}{" "}
                        ·{" "}
                        {reservation.table?.name ||
                          "Table"}
                      </span>
                    </div>

                    <span
                      className={`tf-dashboard-status tf-dashboard-status-${reservation.status}`}
                    >
                      {reservation.status}
                    </span>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {/* Restaurant Snapshot */}
        <section className="tf-dashboard-panel">
          <div className="tf-dashboard-panel-header">
            <div>
              <p className="tf-dashboard-panel-eyebrow">
                Overview
              </p>

              <h2>
                Restaurant snapshot
              </h2>
            </div>
          </div>

          <div className="tf-dashboard-snapshot">
            <div className="tf-dashboard-snapshot-row">
              <span>Tables</span>

              <strong>
                {tables.length}
              </strong>
            </div>

            <div className="tf-dashboard-snapshot-row">
              <span>Menu items</span>

              <strong>
                {menuItems.length}
              </strong>
            </div>

            <div className="tf-dashboard-snapshot-row">
              <span>Available menu items</span>

              <strong>
                {
                  menuItems.filter(
                    (item) => item.isAvailable
                  ).length
                }
              </strong>
            </div>

            <div className="tf-dashboard-snapshot-row">
              <span>Restaurant status</span>

              <strong
                className={
                  restaurant?.isActive
                    ? "tf-dashboard-active"
                    : "tf-dashboard-inactive"
                }
              >
                {restaurant?.isActive
                  ? "Active"
                  : "Inactive"}
              </strong>
            </div>

            <div className="tf-dashboard-snapshot-row">
              <span>Address</span>

              <strong className="tf-dashboard-address">
                {restaurant?.address ||
                  "Not provided"}
              </strong>
            </div>
          </div>
        </section>
      </div>

      {/* Recent Reservations */}
      <section className="tf-dashboard-panel tf-dashboard-recent-panel">
        <div className="tf-dashboard-panel-header">
          <div>
            <p className="tf-dashboard-panel-eyebrow">
              Activity
            </p>

            <h2>
              Recent reservations
            </h2>
          </div>
        </div>

        {reservations.length === 0 ? (
          <div className="tf-dashboard-empty">
            <span className="tf-dashboard-empty-mark">
              —
            </span>

            <p>
              Your reservation activity will
              appear here.
            </p>
          </div>
        ) : (
          <div className="tf-dashboard-table-wrapper">
            <table className="tf-dashboard-table">
              <thead>
                <tr>
                  <th>Guest</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Table</th>
                  <th>Guests</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {reservations
                  .slice()
                  .sort(
                    (a, b) =>
                      new Date(b.createdAt) -
                      new Date(a.createdAt)
                  )
                  .slice(0, 5)
                  .map((reservation) => (
                    <tr
                      key={reservation._id}
                    >
                      <td>
                        <strong>
                          {reservation.customer
                            ?.name ||
                            "Guest"}
                        </strong>
                      </td>

                      <td>
                        {formatDate(
                          reservation.date
                        )}
                      </td>

                      <td>
                        {reservation.startTime}
                      </td>

                      <td>
                        {reservation.table
                          ?.name || "—"}
                      </td>

                      <td>
                        {reservation.guests}
                      </td>

                      <td>
                        <span
                          className={`tf-dashboard-status tf-dashboard-status-${reservation.status}`}
                        >
                          {reservation.status}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
};

export default Dashboard;