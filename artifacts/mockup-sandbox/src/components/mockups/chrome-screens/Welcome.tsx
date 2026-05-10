export function Welcome() {
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
      {/* Ambient chrome glow top-left */}
      <div style={{
        position: "absolute", top: -80, left: -80,
        width: 300, height: 300, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(192,192,192,0.12) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      {/* Ambient chrome glow bottom-right */}
      <div style={{
        position: "absolute", bottom: -60, right: -60,
        width: 260, height: 260, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(160,160,180,0.09) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Fine grid texture */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
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
          <svg width="17" height="12" viewBox="0 0 17 12" fill="none">
            <path d="M8.5 2.5C10.8 2.5 12.9 3.5 14.3 5.1L15.7 3.7C13.9 1.8 11.3 0.5 8.5 0.5C5.7 0.5 3.1 1.8 1.3 3.7L2.7 5.1C4.1 3.5 6.2 2.5 8.5 2.5Z" fill="rgba(255,255,255,0.5)" />
            <path d="M8.5 6C9.9 6 11.1 6.6 12 7.5L13.4 6.1C12.1 4.8 10.4 4 8.5 4C6.6 4 4.9 4.8 3.6 6.1L5 7.5C5.9 6.6 7.1 6 8.5 6Z" fill="rgba(255,255,255,0.5)" />
            <circle cx="8.5" cy="10" r="1.5" fill="rgba(255,255,255,0.7)" />
          </svg>
        </div>
      </div>

      {/* Logo area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0 28px", paddingBottom: 34, paddingTop: 0 }}>
        {/* Logo full-width */}
        <div style={{ alignItems: "center", display: "flex", flexDirection: "column", marginBottom: 4 }}>
          <img
            src="/__mockup/images/resqride_logo.png"
            alt="ResqRide"
            style={{ width: "100%", maxWidth: 340, height: 320, objectFit: "contain" }}
          />

          {/* Tagline pill */}
          <div style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 20,
            padding: "5px 16px",
            marginBottom: 6,
          }}>
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 700, letterSpacing: 4 }}>ROADSIDE ASSISTANCE</span>
          </div>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 14, margin: 0, marginBottom: 0, textAlign: "center" }}>
            Help is always closer than you think
          </p>
        </div>

        {/* Feature pills */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 24, marginBottom: 28 }}>
          {["8-min avg response", "ID-verified providers", "GPS-powered matching"].map((text) => (
            <div key={text} style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 20,
              padding: "7px 14px",
            }}>
              <div style={{
                width: 5, height: 5, borderRadius: "50%",
                background: "linear-gradient(135deg, #C0C0C0, #888)",
              }} />
              <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: 500 }}>{text}</span>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
          {/* Primary — I Need Help */}
          <button style={{
            display: "flex", alignItems: "center", padding: "17px 20px",
            borderRadius: 18,
            background: "linear-gradient(135deg, #2A2A2A 0%, #1A1A1A 50%, #222 100%)",
            border: "1px solid rgba(255,255,255,0.16)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 4px 20px rgba(0,0,0,0.6)",
            cursor: "pointer", gap: 14, position: "relative", overflow: "hidden",
          }}>
            {/* Chrome sheen */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: "50%",
              background: "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 100%)",
              pointerEvents: "none",
            }} />
            <div style={{
              width: 44, height: 44, borderRadius: 22,
              background: "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))",
              border: "1px solid rgba(255,255,255,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 16 }}>I Need Help</div>
              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, marginTop: 2 }}>Get roadside assistance now</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>

          {/* Secondary — Sign In */}
          <button style={{
            display: "flex", alignItems: "center", padding: "17px 20px",
            borderRadius: 18,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            cursor: "pointer", gap: 14,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 22,
              background: "rgba(255,255,255,0.05)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(192,192,192,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
            </div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ color: "rgba(255,255,255,0.8)", fontWeight: 700, fontSize: 16 }}>Sign In</div>
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, marginTop: 2 }}>Already have an account?</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>

        {/* Provider link */}
        <div style={{
          display: "flex", alignItems: "center", padding: "14px 18px",
          borderRadius: 16,
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          gap: 12, marginBottom: 18,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 16, flexShrink: 0,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(192,192,192,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, fontWeight: 600 }}>Want to earn helping others?</div>
            <div style={{ color: "rgba(192,192,192,0.5)", fontSize: 12, marginTop: 1 }}>Become a service provider</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </div>

        {/* Terms */}
        <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 11, textAlign: "center", margin: 0, lineHeight: 1.5 }}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
