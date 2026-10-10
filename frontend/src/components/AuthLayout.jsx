import { Link } from "react-router-dom";

const AuthLayout = ({ children, title, subtitle, description }) => {
  return (
    <main className="tf-auth-page">
      <div className="tf-auth-grid">

        {/* =========================================
            LEFT VISUAL EXPERIENCE
        ========================================= */}

        <section className="tf-auth-visual">
          <img
            src="https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1800&q=90"
            alt="Elegant restaurant interior"
            className="tf-auth-image"
          />

          <div className="tf-auth-image-overlay" />

          <div className="tf-auth-visual-content">

            <Link to="/" className="tf-brand">
              <span className="tf-brand-mark">T</span>
              TableFlow
            </Link>

            <div className="tf-visual-copy">
              <p className="tf-visual-kicker">
                The art of dining
              </p>

              <h2 className="tf-visual-title">
                Your table.
                <span>Your moment.</span>
              </h2>

              <p className="tf-visual-description">
                Discover remarkable places, explore menus,
                and reserve an experience worth remembering.
              </p>
            </div>

            <div className="tf-visual-footer">
              <span className="tf-visual-footer-line" />
              Crafted for memorable evenings
            </div>

          </div>
        </section>

        {/* =========================================
            RIGHT FORM EXPERIENCE
        ========================================= */}

        <section className="tf-auth-form-side">

          <div className="tf-auth-container">

            <Link to="/" className="tf-brand tf-mobile-brand">
              <span className="tf-brand-mark">T</span>
              TableFlow
            </Link>

            <div className="tf-form-header">
              <p className="tf-eyebrow">
                {title}
              </p>

              <h1 className="tf-form-title">
                {subtitle}
              </h1>

              {description && (
                <p className="tf-form-subtitle">
                  {description}
                </p>
              )}
            </div>

            {children}

          </div>

        </section>

      </div>
    </main>
  );
};

export default AuthLayout;