import { useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const isRestaurant = user?.role === "restaurant";

  const closeMenu = () => setMenuOpen(false);

  const handleLogout = () => {
    logout();
    closeMenu();
  };

  return (
    <header className="tf-navbar">
      <Link to="/" className="tf-nav-brand" onClick={closeMenu}>
        <span className="tf-nav-mark">T</span>
        <span>TableFlow</span>
      </Link>

      {/* Hamburger toggle — visible below 900px */}
      <button
        type="button"
        className={`tf-nav-toggle ${menuOpen ? "active" : ""}`}
        aria-label="Toggle navigation"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span />
        <span />
        <span />
      </button>

      <nav className={`tf-nav-links ${menuOpen ? "open" : ""}`}>
        <Link to="/" className="tf-nav-link" onClick={closeMenu}>Home</Link>
        <Link to="/restaurants" className="tf-nav-link" onClick={closeMenu}>Restaurants</Link>
        <Link to="/menu" className="tf-nav-link" onClick={closeMenu}>Menu</Link>
        <Link to="/reservations" className="tf-nav-link" onClick={closeMenu}>Reservations</Link>
        {isRestaurant && (
          <Link to="/dashboard" className="tf-nav-link" onClick={closeMenu}>Dashboard</Link>
        )}

        {/* Auth actions — inside the dropdown on mobile */}
        <div className="tf-nav-actions tf-nav-actions-mobile">
          {isAuthenticated ? (
            <>
              <span className="tf-nav-user">{user?.name}</span>
              <button type="button" onClick={handleLogout} className="tf-nav-logout">
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="tf-nav-login" onClick={closeMenu}>Sign in</Link>
              <Link to="/register" className="tf-nav-reserve" onClick={closeMenu}>Join TableFlow</Link>
            </>
          )}
        </div>
      </nav>

      {/* Auth actions — right side on desktop */}
      <div className="tf-nav-actions tf-nav-actions-desktop">
        {isAuthenticated ? (
          <>
            <span className="tf-nav-user">{user?.name}</span>
            <button type="button" onClick={logout} className="tf-nav-logout">Sign out</button>
          </>
        ) : (
          <>
            <Link to="/login" className="tf-nav-login">Sign in</Link>
            <Link to="/register" className="tf-nav-reserve">Join TableFlow</Link>
          </>
        )}
      </div>
    </header>
  );
};

export default Navbar;