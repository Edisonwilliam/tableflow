import { useLayoutEffect, useRef, useState } from "react";

/* =========================================================
   Shared Tailwind building blocks for Login + Register.
   Replaces every former tf-* class.
========================================================= */

export const serif = "font-['Playfair_Display',serif]";

export const ring =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dfa274] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0a08]";

// text links inside copy and error boxes
export const linkCls = `rounded font-semibold text-[#dfa274] underline-offset-4 transition hover:text-[#fffaf3] hover:underline ${ring}`;

// 16px on mobile stops iOS from zooming on focus; autofill is re-skinned for dark UI
const inputCls =
  "h-[52px] w-full min-w-0 rounded-xl border border-[#f4eee5]/10 bg-white/[0.04] px-4 text-base text-[#fffaf3] caret-[#dfa274] outline-none transition placeholder:text-[#a79b8e]/60 focus:border-[#dfa274]/70 focus:bg-white/[0.06] focus:ring-4 focus:ring-[#c88755]/10 sm:text-[15px] [&:-webkit-autofill]:[-webkit-text-fill-color:#fffaf3] [&:-webkit-autofill]:shadow-[inset_0_0_0_100px_#1b1410]";

/* ---------- spinner ---------- */

export const Spinner = ({ accent = false }) => (
  <span
    aria-hidden="true"
    className={`h-4 w-4 shrink-0 animate-spin rounded-full border-2 ${
      accent
        ? "border-[#dfa274]/30 border-t-[#dfa274]"
        : "border-[#171310]/30 border-t-[#171310]"
    }`}
  />
);

/* ---------- field (label + input, with show/hide for passwords) ---------- */

export const Field = ({ id, label, labelAction, type = "text", ...props }) => {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-xs font-semibold tracking-[0.02em] text-[#c8bdb0]">
          {label}
        </label>
        {labelAction}
      </div>

      <div className="relative">
        <input
          id={id}
          type={isPassword && show ? "text" : type}
          className={`${inputCls} ${isPassword ? "pr-12" : ""}`}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            aria-pressed={show}
            className="absolute right-1.5 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-lg text-[#a79b8e] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dfa274] [@media(hover:hover)]:hover:text-[#fffaf3]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-[18px] w-[18px]">
              {show ? (
                <>
                  <path d="M3 3l18 18" />
                  <path d="M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 8.5 4 9.5 6a12.6 12.6 0 0 1-2.6 3.4M6.5 7.6A12.4 12.4 0 0 0 2.5 12c1 2 4.5 6 9.5 6a9.6 9.6 0 0 0 4-.9" />
                  <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
                </>
              ) : (
                <>
                  <path d="M2.5 12C3.5 10 7 6 12 6s8.5 4 9.5 6c-1 2-4.5 6-9.5 6s-8.5-4-9.5-6Z" />
                  <circle cx="12" cy="12" r="3" />
                </>
              )}
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

/* ---------- notice + error ---------- */

export const Notice = ({ children }) => (
  <div
    role="status"
    className="flex items-start gap-3 rounded-2xl border border-[#dfa274]/25 bg-[#c88755]/10 px-4 py-3.5 text-sm leading-6 text-[#e8c9ab]"
  >
    <span aria-hidden="true" className="mt-0.5 text-[#dfa274]">✦</span>
    <p className="min-w-0">{children}</p>
  </div>
);

export const ErrorBox = ({ children }) => (
  <div
    role="alert"
    className="flex items-start gap-3 rounded-2xl border border-[#d8786f]/25 bg-[#d8786f]/10 px-4 py-3.5 text-sm leading-6 text-[#e79a93]"
  >
    <span aria-hidden="true" className="mt-0.5 font-bold">!</span>
    <div className="min-w-0 flex-1">{children}</div>
  </div>
);

/* ---------- divider ---------- */

export const Divider = ({ children = "or continue with" }) => (
  <div className="flex items-center gap-4 text-xs text-[#a79b8e]">
    <span className="h-px flex-1 bg-[#f4eee5]/10" />
    {children}
    <span className="h-px flex-1 bg-[#f4eee5]/10" />
  </div>
);

/* ---------- primary button ---------- */

export const PrimaryButton = ({ loading = false, loadingText, children, className = "", ...props }) => (
  <button
    {...props}
    disabled={props.disabled || loading}
    className={`flex h-[52px] w-full items-center justify-center gap-3 rounded-full bg-[#c88755] px-6 text-[13px] font-bold text-[#171310] transition duration-300 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 [@media(hover:hover)]:enabled:hover:bg-[#dfa274] [@media(hover:hover)]:enabled:hover:shadow-[0_14px_40px_rgba(200,135,85,0.28)] ${ring} ${className}`}
  >
    {loading && <Spinner />}
    {loading ? loadingText : children}
  </button>
);

/* ---------- Google slot ----------
   GoogleLogin only accepts a fixed pixel width (200-400), so we measure the
   container and hand the width to a render prop. Keeps it from overflowing on
   narrow phones and from looking tiny on wider ones. */

export const GoogleSlot = ({ children }) => {
  const ref = useRef(null);
  const [width, setWidth] = useState(280);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      const next = Math.max(200, Math.min(400, Math.floor(el.clientWidth)));
      setWidth((prev) => (Math.abs(prev - next) > 2 ? next : prev));
    };

    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="flex min-h-[44px] w-full justify-center">
      {children(width)}
    </div>
  );
};

/* ---------- status line under the Google button ---------- */

export const GoogleStatus = ({ children }) => (
  <p role="status" className="flex items-center justify-center gap-2.5 text-[13px] text-[#c8bdb0]">
    <Spinner accent />
    {children}
  </p>
);

/* ---------- footer line ---------- */

export const BottomText = ({ children }) => (
  <p className="text-center text-sm text-[#a79b8e]">{children}</p>
);