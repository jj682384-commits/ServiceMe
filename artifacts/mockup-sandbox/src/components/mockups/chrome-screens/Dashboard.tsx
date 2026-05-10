export function Dashboard() {
  const services = [
    { icon: "🔧", label: "Flat Tire" },
    { icon: "⚡", label: "Jump Start" },
    { icon: "🚛", label: "Towing" },
    { icon: "⛽", label: "Fuel" },
    { icon: "🔑", label: "Lockout" },
    { icon: "🔩", label: "Minor Repair" },
    { icon: "🔋", label: "EV Services" },
    { icon: "📍", label: "More" },
  ];

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
      {/* Map background simulation */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(180deg, #0A0A0A 0%, #111 30%, #0D0D0D 100%)",
      }}>
        {/* Grid lines to simulate map */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
        }} />
        {/* Map roads simulation */}
        <div style={{ position: "absolute", top: 180, left: 0, right: 0, height: 2, background: "rgba(255,255,255,0.04)" }} />
        <div style={{ position: "absolute", top: 280, left: 0, right: 0, height: 1, background: "rgba(255,255,255,0.03)" }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, left: 120, width: 2, background: "rgba(255,255,255,0.04)" }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, left: 260, width: 1, background: "rgba(255,255,255,0.03)" }} />
        {/* Location dot */}
        <div style={{
          position: "absolute", top: 230, left: 185,
          width: 16, height: 16, borderRadius: "50%",
          background: "radial-gradient(circle, #FFF 30%, rgba(255,255,255,0.3) 100%)",
          boxShadow: "0 0 0 8px rgba(255,255,255,0.08), 0 0 20px rgba(255,255,255,0.15)",
        }} />
        {/* Provider dots */}
        <div style={{ position: "absolute", top: 195, left: 145, width: 10, height: 10, borderRadius: "50%", background: "rgba(192,192,192,0.5)", boxShadow: "0 0 8px rgba(192,192,192,0.3)" }} />
        <div style={{ position: "absolute", top: 260, left: 225, width: 10, height: 10, borderRadius: "50%", background: "rgba(192,192,192,0.4)", boxShadow: "0 0 8px rgba(192,192,192,0.2)" }} />
        <div style={{ position: "absolute", top: 170, left: 260, width: 8, height: 8, borderRadius: "50%", background: "rgba(192,192,192,0.35)" }} />
      </div>

      {/* Header bar */}
      <div style={{
        position: "relative", zIndex: 10,
        padding: "14px 20px 0",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        {/* Status */}
        <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, fontWeight: 600 }}>9:41</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <div style={{ width: 16, height: 11, border: "1.5px solid rgba(255,255,255,0.5)", borderRadius: 3, position: "relative" }}>
            <div style={{ position: "absolute", top: 2, left: 2, right: 2, bottom: 2, background: "rgba(255,255,255,0.5)", borderRadius: 1 }} />
          </div>
        </div>
      </div>

      {/* Top navigation bar */}
      <div style={{
        position: "relative", zIndex: 10,
        padding: "12px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img
            src="/__mockup/images/resqride_logo.png"
            alt="ResqRide"
            style={{ width: 30, height: 30, objectFit: "contain" }}
          />
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <span style={{
              fontSize: 17, fontWeight: 800,
              background: "linear-gradient(180deg, #FFF 0%, #B0B0B0 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>Resq</span>
            <span style={{
              fontSize: 17, fontWeight: 800,
              background: "linear-gradient(180deg, #DDD 0%, #777 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>Ride</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {/* SOS button */}
          <button style={{
            padding: "6px 14px",
            borderRadius: 12,
            background: "rgba(180, 0, 0, 0.15)",
            border: "1px solid rgba(220, 40, 40, 0.3)",
            color: "rgba(255, 100, 100, 0.9)",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1,
            cursor: "pointer",
          }}>
            SOS
          </button>
          {/* Avatar */}
          <div style={{
            width: 34, height: 34, borderRadius: 17,
            background: "linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.04))",
            border: "1px solid rgba(255,255,255,0.12)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Spacer for map area */}
      <div style={{ flex: 1 }} />

      {/* Bottom panel */}
      <div style={{
        position: "relative", zIndex: 10,
        background: "linear-gradient(180deg, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.85) 20%, #000 50%)",
        paddingTop: 40,
      }}>
        {/* What do you need? */}
        <div style={{ padding: "0 20px 16px" }}>
          <h2 style={{ color: "#FFFFFF", fontSize: 20, fontWeight: 700, margin: 0, marginBottom: 4, letterSpacing: -0.3 }}>
            What do you need?
          </h2>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: 0 }}>
            3 providers nearby &nbsp;&bull;&nbsp; 8 min avg response
          </p>
        </div>

        {/* Services grid */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10,
          padding: "0 16px 16px",
        }}>
          {services.map(({ icon, label }) => (
            <button key={label} style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "12px 6px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14,
              cursor: "pointer", gap: 6,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
            }}>
              <span style={{ fontSize: 22 }}>{icon}</span>
              <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, fontWeight: 500, textAlign: "center" }}>{label}</span>
            </button>
          ))}
        </div>

        {/* Emergency strip */}
        <div style={{ padding: "0 16px 10px" }}>
          <button style={{
            width: "100%",
            padding: "14px",
            borderRadius: 14,
            background: "linear-gradient(135deg, rgba(140,0,0,0.25), rgba(100,0,0,0.15))",
            border: "1px solid rgba(220, 50, 50, 0.2)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            cursor: "pointer",
            boxShadow: "inset 0 1px 0 rgba(255,100,100,0.06)",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,100,100,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span style={{ color: "rgba(255,100,100,0.85)", fontSize: 14, fontWeight: 700, letterSpacing: 0.5 }}>Emergency Mode</span>
          </button>
        </div>

        {/* Bottom tab bar */}
        <div style={{
          display: "flex", justifyContent: "space-around", alignItems: "center",
          padding: "12px 0 28px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}>
          {[
            { icon: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", label: "Home", active: true },
            { icon: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z", label: "Map", active: false },
            { icon: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 14a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.04 4h3a2 2 0 0 1 2 1.72", label: "Activity", active: false },
            { icon: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", label: "Profile", active: false },
          ].map(({ icon, label, active }) => (
            <button key={label} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              background: "none", border: "none", cursor: "pointer", padding: "0 12px",
            }}>
              <div style={{
                width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: 8,
                background: active ? "rgba(255,255,255,0.08)" : "transparent",
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke={active ? "#FFFFFF" : "rgba(255,255,255,0.35)"}
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={icon} />
                </svg>
              </div>
              <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, color: active ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.3)" }}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
