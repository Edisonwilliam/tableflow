import { NavLink } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";

const DashboardSidebar = () => {
  const { user } = useAuth();

  const navItems = [
    {
      label: "Overview",
      path: "/dashboard",
      end: true,
    },
    {
      label: "Reservations",
      path: "/dashboard/reservations",
    },
    {
      label: "Tables",
      path: "/dashboard/tables",
    },
    {
      label: "Menu",
      path: "/dashboard/menu",
    },
    {
      label: "Restaurant",
      path: "/dashboard/restaurant",
    },
  ];

  return (
    <aside className="tf-dashboard-sidebar">
      {/* Brand */}
      <div className="tf-dashboard-brand">
        <span className="tf-dashboard-mark">T</span>

        <div>
          <span className="tf-dashboard-brand-name">
            TableFlow
          </span>

          <span className="tf-dashboard-brand-label">
            Restaurant
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="tf-dashboard-nav">
        <p className="tf-dashboard-nav-label">
          Manage
        </p>

        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              `tf-dashboard-nav-link ${
                isActive
                  ? "tf-dashboard-nav-link-active"
                  : ""
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="tf-dashboard-user">
        <div className="tf-dashboard-avatar">
          {user?.name?.charAt(0)?.toUpperCase() || "U"}
        </div>

        <div className="tf-dashboard-user-info">
          <span className="tf-dashboard-user-name">
            {user?.name || "User"}
          </span>

          <span className="tf-dashboard-user-role">
            {user?.role || "customer"}
          </span>
        </div>
      </div>
    </aside>
  );
};

export default DashboardSidebar;