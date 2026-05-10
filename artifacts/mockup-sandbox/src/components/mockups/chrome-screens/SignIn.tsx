export function SignIn() {
  return (
    <div
      style={{
        width: 390,
        height: 844,
        background: "#000000",
        position: "relative",
        overflow: "hidden",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Ambient top glow */}
      <div style={{
        position: "absolute", top: -100, left: "50%", transform: "translateX(-50%)",
        width: 400, height: 300, borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(180,180,200,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      {/* Bottom glow */}
      <div style={{
        position: "absolute", bottom: -80, right: 0,
        width: 250, height: 250, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(160,160,180,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Fine grid */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "linear-gradient(rgba(255,255,255,0.013) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.013) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
        pointerEvents: "none",
      }} />

      {/* Status bar */}
      <div style={{ padding: "14px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, fontWeight: 600 }}>9:41</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <div style={{ width: 16, height: 11, border: "1.5px solid rgba(255,255,255,0.5)", borderRadius: 3, position: "relative" }}>
            <div style={{ position: "absolute", top: 2, left: 2, right: 2, bottom: 2, background: "rgba(255,255,255,0.5)", borderRadius: 1 }} />
          </div>
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
            <rect x="0" y="8" width="3" height="4" rx="0.5" fill="rgba(255,255,255,0.5)" />
            <rect x="4.5" y="5" width="3" height="7" rx="0.5" fill="rgba(255,255,255,0.5)" />
            <rect x="9" y="2" width="3" height="10" rx="0.5" fill="rgba(255,255,255,0.5)" />
            <rect x="13.5" y="0" width="2.5" height="12" rx="0.5" fill="rgba(255,255,255,0.5)" />
          </svg>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0 28px", paddingBottom: 40, paddingTop: 16 }}>
        {/* Back button */}
        <button style={{
          width: 40, height: 40, borderRadius: 20, marginBottom: 24,
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        {/* Logo small + header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <img
              src="/__mockup/images/resqride_logo.png"
              alt="ResqRide"
              style={{ width: 36, height: 36, objectFit: "contain" }}
            />
            <div style={{ display: "flex", alignItems: "baseline" }}>
              <span style={{
                fontSize: 18, fontWeight: 800,
                background: "linear-gradient(180deg, #FFF 0%, #B0B0B0 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>Resq</span>
              <span style={{
                fontSize: 18, fontWeight: 800,
                background: "linear-gradient(180deg, #DDD 0%, #777 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>Ride</span>
            </div>
          </div>
          <h1 style={{ color: "#FFFFFF", fontSize: 28, fontWeight: 800, margin: 0, marginBottom: 6, letterSpacing: -0.5 }}>
            Welcome Back
          </h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 15, margin: 0 }}>
            Sign in to continue with ResqRide
          </p>
        </div>

        {/* Form fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
          {/* Email */}
          <div>
            <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 500, display: "block", marginBottom: 8 }}>Email Address</label>
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "14px 16px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 14,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
              </svg>
              <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 15 }}>Enter your email</span>
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 500, display: "block", marginBottom: 8 }}>Password</label>
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "14px 16px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(192,192,192,0.18)",
              borderRadius: 14,
              boxShadow: "0 0 0 1px rgba(192,192,192,0.06), inset 0 1px 0 rgba(255,255,255,0.03)",
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(192,192,192,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <span style={{ flex: 1, color: "rgba(255,255,255,0.25)", fontSize: 15 }}>Enter your password</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
            </div>
          </div>

          {/* Forgot password */}
          <div style={{ alignSelf: "flex-end" }}>
            <span style={{ color: "rgba(192,192,192,0.6)", fontSize: 13, fontWeight: 500 }}>Forgot Password?</span>
          </div>
        </div>

        {/* Sign in button */}
        <button style={{
          padding: "16px", borderRadius: 16,
          background: "linear-gradient(135deg, #2A2A2A 0%, #1C1C1C 50%, #252525 100%)",
          border: "1px solid rgba(255,255,255,0.14)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.5)",
          color: "#FFFFFF", fontSize: 16, fontWeight: 700,
          cursor: "pointer", position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: "50%",
            background: "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 100%)",
          }} />
          Sign In
        </button>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
          <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 13 }}>or continue with</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
        </div>

        {/* Google button */}
        <button style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          padding: "14px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
          cursor: "pointer", marginBottom: 28,
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" opacity="0.7"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" opacity="0.7"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" opacity="0.7"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" opacity="0.7"/>
          </svg>
          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 15, fontWeight: 500 }}>Continue with Google</span>
        </button>

        {/* Sign up link */}
        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: "auto" }}>
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 15 }}>Don't have an account?</span>
          <span style={{
            fontSize: 15, fontWeight: 600,
            background: "linear-gradient(135deg, #C0C0C0, #888)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>Sign Up</span>
        </div>
      </div>
    </div>
  );
}
