import { useState, useEffect, useCallback } from "react";

// ── Helpers ──────────────────────────────────────────────────────────────────
const LS = {
  get: (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

const DEFAULT_SETTINGS = {
  cwl: { hit: 3, miss: -5 },
  war: { hit: 2, miss: -1 },
  capital: { hit: 0.3, miss: -0.2 },
  games: { under1k: -3, zero: -5 },
  event: { hit: 3, miss: -2 },
  disabled: [],
};

const MONTH_KEY = () => { const d = new Date(); return `${d.getUTCFullYear()}-${d.getUTCMonth()}`; };

const verdict = (score) => {
  if (score >= 25) return { label: "KEEP", color: "#4ade80", bg: "rgba(74,222,128,0.15)", border: "#4ade80" };
  if (score >= -5) return { label: "WARN", color: "#facc15", bg: "rgba(250,204,21,0.15)", border: "#facc15" };
  return { label: "KICK", color: "#f87171", bg: "rgba(248,113,113,0.15)", border: "#f87171" };
};

const clanGamesScore = (points) => {
  if (points === 0) return -5;
  if (points < 1000) return -3;
  return Math.min(Math.floor(points / 1000), 10);
};

// ── API ───────────────────────────────────────────────────────────────────────
const COC_BASE = "https://api.clashofclans.com/v1";
const cocFetch = async (path, token) => {
  const r = await fetch(`${COC_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (r.status === 403) throw new Error("ACCESS_DENIED");
  if (!r.ok) throw new Error(`API_ERROR_${r.status}`);
  return r.json();
};

// ── Components ────────────────────────────────────────────────────────────────
const Star = ({ filled }) => (
  <span style={{ color: filled ? "#facc15" : "#374151", fontSize: 14 }}>★</span>
);

const Badge = ({ v }) => (
  <span style={{
    display: "inline-block", padding: "2px 10px", borderRadius: 999,
    fontSize: 11, fontWeight: 800, letterSpacing: 1,
    color: v.color, background: v.bg, border: `1px solid ${v.border}`,
    fontFamily: "inherit",
  }}>{v.label}</span>
);

const ScoreChip = ({ score }) => {
  const col = score >= 25 ? "#4ade80" : score >= -5 ? "#facc15" : "#f87171";
  return (
    <span style={{ color: col, fontWeight: 800, fontSize: 16 }}>
      {score > 0 ? "+" : ""}{typeof score === "number" ? score.toFixed(1) : score}
    </span>
  );
};

const Card = ({ children, style }) => (
  <div style={{
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 16, padding: 20, ...style,
  }}>{children}</div>
);

const Btn = ({ onClick, children, style, danger, secondary }) => (
  <button onClick={onClick} style={{
    padding: "8px 18px", borderRadius: 10, border: "none", cursor: "pointer",
    fontFamily: "inherit", fontWeight: 700, fontSize: 13, transition: "all .15s",
    background: danger ? "rgba(248,113,113,0.2)" : secondary ? "rgba(255,255,255,0.08)" : "linear-gradient(135deg,#c8972a,#e8b84b)",
    color: danger ? "#f87171" : secondary ? "#d1c4a0" : "#1a1008",
    border: danger ? "1px solid rgba(248,113,113,0.4)" : secondary ? "1px solid rgba(255,255,255,0.12)" : "none",
    ...style,
  }}>{children}</button>
);

const Input = ({ value, onChange, placeholder, type = "text", style }) => (
  <input
    type={type} value={value} onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    style={{
      background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 10, padding: "8px 14px", color: "#f0e6d0", fontFamily: "inherit",
      fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box", ...style,
    }}
  />
);

const SectionTitle = ({ children }) => (
  <h3 style={{ color: "#e8b84b", fontFamily: "'Cinzel', serif", fontSize: 14, letterSpacing: 2, textTransform: "uppercase", margin: "0 0 14px", borderBottom: "1px solid rgba(232,184,75,0.2)", paddingBottom: 8 }}>{children}</h3>
);

// ── CoC-style Logo ────────────────────────────────────────────────────────────
function CoCLogo() {
  const s = (size) => ({
    display: "block",
    fontFamily: "'Lilita One', cursive",
    fontSize: size,
    fontWeight: 900,
    color: "#FFE135",
    WebkitTextStroke: `${Math.round(size / 14)}px #7a4400`,
    paintOrder: "stroke fill",
    textShadow: `0 ${Math.round(size/13)}px 0 #b36a00, 0 ${Math.round(size/10)}px 0 #7a4400, 0 ${Math.round(size/7)}px ${Math.round(size/4)}px rgba(0,0,0,0.85)`,
    lineHeight: 1.05,
    letterSpacing: 2,
  });
  return (
    <div style={{ textAlign: "center" }}>
      <span style={s(72)}>CLASH</span>
      <span style={{ ...s(36), color: "#FFD000", WebkitTextStroke: "2px #7a4400", letterSpacing: 10 }}>OF</span>
      <span style={s(72)}>CLANS</span>
    </div>
  );
}

// ── Setup Guide Modal ────────────────────────────────────────────────────────
function SetupGuide({ onClose }) {
  const [step, setStep] = useState(0);
  const steps = [
    {
      icon: "🌐",
      title: "Go to the Developer Portal",
      desc: "Open your browser and go to the Clash of Clans developer site:",
      highlight: "developer.clashofclans.com",
      link: "https://developer.clashofclans.com",
      tip: "This is Supercell's official site for developers. It is completely free to use.",
    },
    {
      icon: "📧",
      title: "Create an Account",
      desc: "Click Login and sign up with any email address and password. Check your email and verify your account.",
      tip: "Use any email — it does not have to be your Clash of Clans email.",
    },
    {
      icon: "🔑",
      title: "Create a New Key",
      desc: "Once logged in, click My Account at the top right, then click the blue Create New Key button.",
      tip: "Give it any name like Clan Tracker. The description field does not matter.",
    },
    {
      icon: "📍",
      title: "Find Your IP Address",
      desc: "The portal needs your current IP address. Open a new tab and go to:",
      highlight: "whatismyip.com",
      link: "https://www.whatismyip.com",
      tip: "Copy the number shown — it looks something like: 82.123.45.67. This tells Clash of Clans who is allowed to use your key.",
    },
    {
      icon: "📋",
      title: "Enter Your IP and Create",
      desc: "Paste your IP address into the Allowed IP Addresses field on the key form, then click Create.",
      tip: "Warning: Home internet IPs change every few weeks. When that happens the sync will stop working and you need to come back here and update your IP.",
    },
    {
      icon: "✅",
      title: "Copy Your Token",
      desc: "Your key is created! Click on it to see the full token — a very long string of letters and numbers starting with eyJ... Copy the whole thing.",
      tip: "Do not share this token publicly. Paste it into the API Token field on this screen.",
    },
    {
      icon: "🏰",
      title: "Find Your Clan Tag",
      desc: "In Clash of Clans, open your Clan profile and tap the tag below your clan name. It starts with # and looks like #ABC123.",
      tip: "You can also find your clan tag by searching your clan name on clashofstats.com",
    },
  ];

  const cur = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ maxWidth: 460, width: "100%", background: "linear-gradient(180deg, #2a1500 0%, #1a0d00 100%)", border: "2px solid #c8972a", borderRadius: 20, padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.9)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontFamily: "'Cinzel', serif", color: "#e8b84b", margin: 0, fontSize: 15, letterSpacing: 2 }}>HOW TO GET YOUR TOKEN</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#6b5a45", cursor: "pointer", fontSize: 22, padding: 0 }}>✕</button>
        </div>

        {/* Progress bar */}
        <div style={{ display: "flex", gap: 5, marginBottom: 24 }}>
          {steps.map((_, i) => (
            <div key={i} onClick={() => setStep(i)} style={{ flex: 1, height: 4, borderRadius: 2, cursor: "pointer", transition: "background .2s", background: i <= step ? "#e8b84b" : "rgba(255,255,255,0.1)" }} />
          ))}
        </div>

        {/* Content */}
        <div style={{ minHeight: 200 }}>
          <div style={{ fontSize: 42, textAlign: "center", marginBottom: 14 }}>{cur.icon}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ background: "#c8972a", color: "#1a0800", fontFamily: "'Cinzel', serif", fontWeight: 800, fontSize: 12, width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{step + 1}</span>
            <h3 style={{ color: "#f0e6d0", fontFamily: "'Cinzel', serif", fontSize: 15, margin: 0 }}>{cur.title}</h3>
          </div>
          <p style={{ color: "#d1c4a0", fontSize: 14, lineHeight: 1.65, margin: "0 0 12px" }}>{cur.desc}</p>
          {cur.highlight && (
            <a href={cur.link} target="_blank" rel="noopener noreferrer" style={{ display: "block", background: "rgba(232,184,75,0.1)", border: "1px solid rgba(232,184,75,0.3)", borderRadius: 8, padding: "9px 14px", color: "#e8b84b", fontWeight: 700, fontSize: 14, textDecoration: "none", marginBottom: 12, textAlign: "center" }}>
              🔗 {cur.highlight}
            </a>
          )}
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "10px 14px" }}>
            <p style={{ color: "#9d8a6a", fontSize: 12, margin: 0, lineHeight: 1.55 }}>💡 {cur.tip}</p>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          {step > 0 && <Btn secondary onClick={() => setStep(s => s - 1)} style={{ flex: 1 }}>← Back</Btn>}
          {!isLast
            ? <Btn onClick={() => setStep(s => s + 1)} style={{ flex: 1 }}>Next Step →</Btn>
            : <Btn onClick={onClose} style={{ flex: 1 }}>✅ Got it!</Btn>}
        </div>
      </div>
    </div>
  );
}

// ── Setup Screen ──────────────────────────────────────────────────────────────
function SetupScreen({ onSave }) {
  const [token, setToken] = useState("");
  const [tag, setTag] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const connect = async () => {
    if (!token.trim() || !tag.trim()) { setError("Both fields required."); return; }
    setLoading(true); setError("");
    const cleanTag = tag.trim().startsWith("#") ? tag.trim() : "#" + tag.trim();
    try {
      const data = await cocFetch(`/clans/${encodeURIComponent(cleanTag)}`, token.trim());
      onSave({ token: token.trim(), tag: cleanTag, clanName: data.name, clanBadge: data.badgeUrls?.small });
    } catch (e) {
      if (e.message === "ACCESS_DENIED") setError("Invalid token or clan tag.");
      else setError("Could not connect. Check your token and clan tag.");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, position: "relative", overflow: "hidden" }}>
      {/* Decorative background gems */}
      <div style={{ position: "absolute", top: 40, left: "10%", width: 8, height: 8, background: "#e8b84b", borderRadius: 2, opacity: 0.3, transform: "rotate(45deg)" }} />
      <div style={{ position: "absolute", top: 120, right: "15%", width: 6, height: 6, background: "#c8972a", borderRadius: 2, opacity: 0.2, transform: "rotate(45deg)" }} />
      <div style={{ position: "absolute", bottom: 80, left: "20%", width: 10, height: 10, background: "#e8b84b", borderRadius: 2, opacity: 0.15, transform: "rotate(45deg)" }} />

      <div style={{ maxWidth: 480, width: "100%" }}>
        {/* Hero section */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <CoCLogo />
          <div style={{ height: 2, background: "linear-gradient(90deg, transparent, rgba(232,184,75,0.5), transparent)", margin: "16px 0 12px" }} />
          <p style={{ color: "#c4a96a", margin: 0, fontSize: 13, fontStyle: "italic", letterSpacing: 1 }}>Track your clan's warriors. Reward the brave. Remove the idle.</p>
        </div>

        {/* Form card with CoC-style border */}
        <div style={{ position: "relative" }}>
          <div style={{ background: "linear-gradient(180deg, rgba(92,45,10,0.6) 0%, rgba(26,16,8,0.95) 100%)", border: "2px solid #c8972a", borderRadius: 16, padding: 24, boxShadow: "0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(232,184,75,0.2)" }}>
            {/* Inner top highlight */}
            <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(232,184,75,0.4), transparent)", marginBottom: 20 }} />

            {showGuide && <SetupGuide onClose={() => setShowGuide(false)} />}

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label style={{ color: "#e8b84b", fontSize: 12, fontFamily: "'Cinzel', serif", letterSpacing: 1 }}>API TOKEN</label>
                <button onClick={() => setShowGuide(true)} style={{ background: "none", border: "none", color: "#c8972a", cursor: "pointer", fontSize: 12, fontFamily: "inherit", textDecoration: "underline", padding: 0 }}>❓ How do I get this?</button>
              </div>
              <Input value={token} onChange={setToken} placeholder="Your Clash of Clans API token" />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ color: "#e8b84b", fontSize: 12, fontFamily: "'Cinzel', serif", letterSpacing: 1, display: "block", marginBottom: 6 }}>CLAN TAG</label>
              <Input value={tag} onChange={setTag} placeholder="#ABC123" />
            </div>

            <div style={{ background: "rgba(232,184,75,0.07)", border: "1px solid rgba(232,184,75,0.25)", borderRadius: 8, padding: "10px 14px", marginBottom: 10, fontSize: 12, color: "#c4a96a" }}>
              🛡️ Your clan's <strong>war log must be Public</strong> in-game. The site detects and warns you automatically.
            </div>
            <div style={{ background: "rgba(255,150,50,0.07)", border: "1px solid rgba(255,150,50,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 12, color: "#c4a96a" }}>
              ⚔️ Always <strong>sync after each war/CWL ends</strong> — the API doesn't keep history once a new war starts.
            </div>

            {error && (
              <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 8, padding: "8px 14px", marginBottom: 14 }}>
                <p style={{ color: "#f87171", fontSize: 13, margin: 0 }}>⚠️ {error}</p>
              </div>
            )}

            <button onClick={connect} disabled={loading} style={{
              width: "100%", padding: "12px", border: "none", borderRadius: 10, cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "'Cinzel', serif", fontWeight: 800, fontSize: 15, letterSpacing: 2,
              background: loading ? "rgba(200,151,42,0.4)" : "linear-gradient(180deg, #e8b84b 0%, #c8972a 50%, #a07020 100%)",
              color: loading ? "#9d8a6a" : "#1a0800",
              boxShadow: loading ? "none" : "0 4px 0 #7a5010, 0 6px 12px rgba(0,0,0,0.4)",
              transform: loading ? "none" : "translateY(0)",
              textShadow: "0 1px 0 rgba(255,255,255,0.2)",
              transition: "all .1s",
            }}>{loading ? "CONNECTING…" : "⚔️ CONNECT CLAN"}</button>

            <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(232,184,75,0.4), transparent)", marginTop: 20 }} />
          </div>
          {/* Card corner accents */}
          {[["0","0"], ["0","auto"], ["auto","0"], ["auto","auto"]].map(([t,b], i) => (
            <div key={i} style={{ position: "absolute", top: t === "0" ? -2 : "auto", bottom: b === "auto" ? -2 : "auto", left: i % 2 === 0 ? -2 : "auto", right: i % 2 === 1 ? -2 : "auto", width: 12, height: 12, background: "#e8b84b", borderRadius: 2 }} />
          ))}
        </div>

        <p style={{ textAlign: "center", color: "#3d2e1e", fontSize: 11, marginTop: 20, fontFamily: "'Cinzel', serif", letterSpacing: 1 }}>
          NOT AFFILIATED WITH SUPERCELL · FAN TOOL
        </p>
      </div>
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = ["Dashboard", "Activity", "Performance", "Scores", "Settings"];

function TabBar({ active, setActive }) {
  return (
    <div style={{ display: "flex", gap: 4, background: "rgba(0,0,0,0.3)", borderRadius: 14, padding: 4, marginBottom: 24, flexWrap: "wrap" }}>
      {TABS.map(t => (
        <button key={t} onClick={() => setActive(t)} style={{
          flex: 1, minWidth: 80, padding: "9px 4px", border: "none", borderRadius: 10, cursor: "pointer",
          fontFamily: "'Cinzel', serif", fontSize: 12, letterSpacing: 1, transition: "all .2s",
          background: active === t ? "linear-gradient(135deg,#c8972a,#e8b84b)" : "transparent",
          color: active === t ? "#1a1008" : "#9d8a6a", fontWeight: active === t ? 800 : 600,
        }}>{t}</button>
      ))}
    </div>
  );
}

// ── Dashboard Tab ─────────────────────────────────────────────────────────────
function DashboardTab({ members, scores, onSync, syncing, warLogPrivate, onAddMember, onRemoveMember }) {
  const [newName, setNewName] = useState("");
  const add = () => { if (newName.trim()) { onAddMember(newName.trim()); setNewName(""); } };

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <Btn onClick={onSync}>{syncing ? "⟳ Syncing…" : "⟳ Sync from API"}</Btn>
      </div>

      {warLogPrivate && (
        <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 12, padding: "12px 16px", marginBottom: 16, color: "#f87171", fontSize: 13 }}>
          🔒 <strong>War log is private.</strong> Open it in-game under Clan Settings to enable war data sync.
        </div>
      )}

      <Card style={{ marginBottom: 20 }}>
        <SectionTitle>Add Member Manually</SectionTitle>
        <div style={{ display: "flex", gap: 8 }}>
          <Input value={newName} onChange={setNewName} placeholder="Member name" />
          <Btn onClick={add} style={{ whiteSpace: "nowrap" }}>Add</Btn>
        </div>
      </Card>

      <Card>
        <SectionTitle>Clan Roster ({members.length})</SectionTitle>
        {members.length === 0 && <p style={{ color: "#9d8a6a", fontSize: 13 }}>No members yet. Sync from API or add manually.</p>}
        <div style={{ display: "grid", gap: 8 }}>
          {members.map(m => {
            const s = scores[m.tag || m.name] || { overall: 0, monthly: 0 };
            const v = verdict(s.overall);
            return (
              <div key={m.tag || m.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                <div>
                  <span style={{ color: "#f0e6d0", fontWeight: 700 }}>{m.name}</span>
                  {m.role && <span style={{ color: "#9d8a6a", fontSize: 11, marginLeft: 8 }}>{m.role}</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <ScoreChip score={s.overall} />
                  <Badge v={v} />
                  <button onClick={() => onRemoveMember(m.tag || m.name)} style={{ background: "none", border: "none", color: "#6b5a45", cursor: "pointer", fontSize: 16, padding: 0 }}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ── Activity Tab ──────────────────────────────────────────────────────────────
function ActivityTab({ members, events, onAddEvent, onUpdateEvent, onDeleteEvent, scores, settings }) {
  const [tab, setTab] = useState("war");
  const [form, setForm] = useState({});
  const [showAdd, setShowAdd] = useState(false);

  const eventTypes = ["war", "cwl", "capital", "games", "special"];
  const eventLabels = { war: "Clan War", cwl: "CWL Day", capital: "Capital Raid", games: "Clan Games", special: "Special Event" };

  const addEvent = () => {
    const e = { id: Date.now(), type: tab, date: new Date().toISOString(), members: {}, ...form };
    onAddEvent(e);
    setForm({}); setShowAdd(false);
  };

  const filtered = events.filter(e => e.type === tab);

  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 20, flexWrap: "wrap" }}>
        {eventTypes.map(t => (
          <button key={t} onClick={() => { setTab(t); setShowAdd(false); }} style={{
            padding: "7px 14px", border: "none", borderRadius: 8, cursor: "pointer",
            fontFamily: "inherit", fontSize: 12, fontWeight: 700,
            background: tab === t ? "rgba(232,184,75,0.2)" : "rgba(255,255,255,0.05)",
            color: tab === t ? "#e8b84b" : "#9d8a6a",
            border: tab === t ? "1px solid rgba(232,184,75,0.4)" : "1px solid transparent",
          }}>{eventLabels[t]}</button>
        ))}
      </div>

      <Btn onClick={() => setShowAdd(!showAdd)} style={{ marginBottom: 16 }}>+ Add {eventLabels[tab]}</Btn>

      {showAdd && (
        <Card style={{ marginBottom: 16 }}>
          <SectionTitle>New {eventLabels[tab]}</SectionTitle>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ color: "#9d8a6a", fontSize: 12, display: "block", marginBottom: 4 }}>Name / Label</label>
              <Input value={form.label || ""} onChange={v => setForm(f => ({ ...f, label: v }))} placeholder={`e.g. War vs ClanXYZ`} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ color: "#9d8a6a", fontSize: 12, display: "block", marginBottom: 4 }}>Date</label>
              <Input type="date" value={form.date?.slice(0, 10) || new Date().toISOString().slice(0, 10)} onChange={v => setForm(f => ({ ...f, date: v }))} />
            </div>
          </div>
          {tab === "special" && (
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ color: "#9d8a6a", fontSize: 12, display: "block", marginBottom: 4 }}>Hit bonus</label>
                <Input type="number" value={form.hitBonus ?? settings.event.hit} onChange={v => setForm(f => ({ ...f, hitBonus: +v }))} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ color: "#9d8a6a", fontSize: 12, display: "block", marginBottom: 4 }}>Miss penalty</label>
                <Input type="number" value={form.missPenalty ?? settings.event.miss} onChange={v => setForm(f => ({ ...f, missPenalty: +v }))} />
              </div>
            </div>
          )}

          <SectionTitle>Member Participation</SectionTitle>
          <div style={{ display: "grid", gap: 8, maxHeight: 300, overflowY: "auto" }}>
            {members.map(m => {
              const key = m.tag || m.name;
              const val = (form.members || {})[key] || {};
              return (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "rgba(0,0,0,0.2)", borderRadius: 8 }}>
                  <span style={{ color: "#d1c4a0", flex: 1, fontSize: 13 }}>{m.name}</span>
                  {tab === "war" && (
                    <>
                      <select value={val.status || "not_in"} onChange={e => setForm(f => ({ ...f, members: { ...f.members, [key]: { ...val, status: e.target.value } } }))}
                        style={{ background: "#1a1008", color: "#d1c4a0", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "4px 8px", fontSize: 12 }}>
                        <option value="not_in">Not in war</option>
                        <option value="attacked">Attacked</option>
                        <option value="missed">Missed</option>
                      </select>
                      {val.status === "attacked" && (
                        <>
                          <Input type="number" value={val.attacks || ""} onChange={v => setForm(f => ({ ...f, members: { ...f.members, [key]: { ...val, attacks: +v } } }))} placeholder="Attacks" style={{ width: 70 }} />
                          <Input type="number" value={val.stars || ""} onChange={v => setForm(f => ({ ...f, members: { ...f.members, [key]: { ...val, stars: +v } } }))} placeholder="Stars" style={{ width: 70 }} />
                        </>
                      )}
                    </>
                  )}
                  {tab === "cwl" && (
                    <>
                      <select value={val.status || "not_in"} onChange={e => setForm(f => ({ ...f, members: { ...f.members, [key]: { ...val, status: e.target.value } } }))}
                        style={{ background: "#1a1008", color: "#d1c4a0", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "4px 8px", fontSize: 12 }}>
                        <option value="not_in">Not switched in</option>
                        <option value="attacked">Attacked</option>
                        <option value="missed">Missed (was switched in)</option>
                      </select>
                      {val.status === "attacked" && (
                        <Input type="number" value={val.stars || ""} onChange={v => setForm(f => ({ ...f, members: { ...f.members, [key]: { ...val, stars: +v } } }))} placeholder="Stars" style={{ width: 70 }} />
                      )}
                    </>
                  )}
                  {tab === "capital" && (
                    <>
                      <Input type="number" value={val.attacks || ""} onChange={v => setForm(f => ({ ...f, members: { ...f.members, [key]: { ...val, attacks: +v } } }))} placeholder="Attacks" style={{ width: 70 }} />
                      <Input type="number" value={val.points || ""} onChange={v => setForm(f => ({ ...f, members: { ...f.members, [key]: { ...val, points: +v } } }))} placeholder="Points" style={{ width: 80 }} />
                      <Input type="number" value={val.maxAttacks || ""} onChange={v => setForm(f => ({ ...f, members: { ...f.members, [key]: { ...val, maxAttacks: +v } } }))} placeholder="Max atks" style={{ width: 80 }} />
                    </>
                  )}
                  {tab === "games" && (
                    <Input type="number" value={val.points || ""} onChange={v => setForm(f => ({ ...f, members: { ...f.members, [key]: { ...val, points: +v } } }))} placeholder="Points" style={{ width: 100 }} />
                  )}
                  {tab === "special" && (
                    <select value={val.status || "missed"} onChange={e => setForm(f => ({ ...f, members: { ...f.members, [key]: { ...val, status: e.target.value } } }))}
                      style={{ background: "#1a1008", color: "#d1c4a0", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "4px 8px", fontSize: 12 }}>
                      <option value="hit">Hit target</option>
                      <option value="missed">Missed target</option>
                    </select>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <Btn onClick={addEvent}>Save Event</Btn>
            <Btn secondary onClick={() => setShowAdd(false)}>Cancel</Btn>
          </div>
        </Card>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {filtered.length === 0 && <p style={{ color: "#9d8a6a", fontSize: 13 }}>No {eventLabels[tab]} events recorded yet.</p>}
        {filtered.map(ev => (
          <Card key={ev.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <span style={{ color: "#e8b84b", fontWeight: 700 }}>{ev.label || eventLabels[ev.type]}</span>
                <span style={{ color: "#6b5a45", fontSize: 12, marginLeft: 10 }}>{ev.date?.slice(0, 10)}</span>
              </div>
              <Btn danger onClick={() => onDeleteEvent(ev.id)}>Delete</Btn>
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {members.map(m => {
                const key = m.tag || m.name;
                const val = (ev.members || {})[key] || {};
                let summary = "—";
                if (ev.type === "war") {
                  if (val.status === "not_in") summary = <span style={{ color: "#6b5a45" }}>Not in war</span>;
                  else if (val.status === "attacked") summary = <span style={{ color: "#4ade80" }}>{val.attacks || 0} atk · {val.stars || 0}⭐</span>;
                  else if (val.status === "missed") summary = <span style={{ color: "#f87171" }}>Missed</span>;
                }
                if (ev.type === "cwl") {
                  if (val.status === "not_in") summary = <span style={{ color: "#6b5a45" }}>Not switched in</span>;
                  else if (val.status === "attacked") summary = <span style={{ color: "#4ade80" }}>Attacked · {val.stars || 0}⭐</span>;
                  else if (val.status === "missed") summary = <span style={{ color: "#f87171" }}>Missed (was in)</span>;
                }
                if (ev.type === "capital") summary = val.attacks ? <span style={{ color: "#60a5fa" }}>{val.attacks}/{val.maxAttacks || "?"} atk · {val.points || 0}pts</span> : <span style={{ color: "#6b5a45" }}>—</span>;
                if (ev.type === "games") summary = val.points ? <span style={{ color: "#a78bfa" }}>{val.points.toLocaleString()} pts → <ScoreChip score={clanGamesScore(val.points)} /></span> : <span style={{ color: "#f87171" }}>-5</span>;
                if (ev.type === "special") summary = val.status === "hit" ? <span style={{ color: "#4ade80" }}>Hit target</span> : <span style={{ color: "#f87171" }}>Missed target</span>;
                return (
                  <div key={key} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <span style={{ color: "#d1c4a0" }}>{m.name}</span>
                    {summary}
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Performance Tab ───────────────────────────────────────────────────────────
function PerformanceTab({ members, events }) {
  const [selected, setSelected] = useState(null);

  const getMemberPerf = (mKey) => {
    let warStars = 0, warMaxStars = 0;
    let cwlStars = 0, cwlMaxStars = 0;
    let capitalPoints = 0, capitalAttacks = 0;

    events.forEach(ev => {
      const val = (ev.members || {})[mKey] || {};
      if (ev.type === "war" && val.status === "attacked") {
        warStars += val.stars || 0;
        warMaxStars += (val.attacks || 0) * 3;
      }
      if (ev.type === "cwl" && val.status === "attacked") {
        cwlStars += val.stars || 0;
        cwlMaxStars += 3;
      }
      if (ev.type === "capital" && val.attacks) {
        capitalPoints += val.points || 0;
        capitalAttacks += val.attacks || 0;
      }
    });

    return { warStars, warMaxStars, cwlStars, cwlMaxStars, capitalPoints, capitalAttacks };
  };

  const StarBar = ({ got, max }) => {
    if (max === 0) return <span style={{ color: "#6b5a45", fontSize: 13 }}>No data</span>;
    const pct = Math.round((got / max) * 100);
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ color: "#d1c4a0", fontSize: 13 }}>{got} / {max} ⭐</span>
          <span style={{ color: pct >= 70 ? "#4ade80" : pct >= 40 ? "#facc15" : "#f87171", fontSize: 13 }}>{pct}%</span>
        </div>
        <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: pct >= 70 ? "#4ade80" : pct >= 40 ? "#facc15" : "#f87171", borderRadius: 3, transition: "width .4s" }} />
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: "grid", gap: 10 }}>
        {members.map(m => {
          const key = m.tag || m.name;
          const p = getMemberPerf(key);
          const isOpen = selected === key;
          return (
            <Card key={key} style={{ cursor: "pointer" }} >
              <div onClick={() => setSelected(isOpen ? null : key)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#f0e6d0", fontWeight: 700 }}>{m.name}</span>
                <span style={{ color: "#6b5a45", fontSize: 18 }}>{isOpen ? "▲" : "▼"}</span>
              </div>
              {isOpen && (
                <div style={{ marginTop: 16, display: "grid", gap: 16 }}>
                  <div>
                    <p style={{ color: "#e8b84b", fontSize: 12, fontWeight: 700, letterSpacing: 1, margin: "0 0 8px" }}>CLAN WARS</p>
                    <StarBar got={p.warStars} max={p.warMaxStars} />
                  </div>
                  <div>
                    <p style={{ color: "#e8b84b", fontSize: 12, fontWeight: 700, letterSpacing: 1, margin: "0 0 8px" }}>CLAN WAR LEAGUE</p>
                    <StarBar got={p.cwlStars} max={p.cwlMaxStars} />
                  </div>
                  <div>
                    <p style={{ color: "#e8b84b", fontSize: 12, fontWeight: 700, letterSpacing: 1, margin: "0 0 8px" }}>CLAN CAPITAL</p>
                    {p.capitalAttacks === 0
                      ? <span style={{ color: "#6b5a45", fontSize: 13 }}>No data</span>
                      : (
                        <div style={{ display: "flex", gap: 20 }}>
                          <div><p style={{ color: "#9d8a6a", fontSize: 11, margin: "0 0 2px" }}>Total Points</p><p style={{ color: "#60a5fa", fontWeight: 700, margin: 0 }}>{p.capitalPoints.toLocaleString()}</p></div>
                          <div><p style={{ color: "#9d8a6a", fontSize: 11, margin: "0 0 2px" }}>Attacks</p><p style={{ color: "#60a5fa", fontWeight: 700, margin: 0 }}>{p.capitalAttacks}</p></div>
                          <div><p style={{ color: "#9d8a6a", fontSize: 11, margin: "0 0 2px" }}>Avg/Attack</p><p style={{ color: "#60a5fa", fontWeight: 700, margin: 0 }}>{(p.capitalPoints / p.capitalAttacks).toFixed(0)}</p></div>
                        </div>
                      )
                    }
                  </div>
                </div>
              )}
            </Card>
          );
        })}
        {members.length === 0 && <p style={{ color: "#9d8a6a", fontSize: 13 }}>No members yet.</p>}
      </div>
    </div>
  );
}

// ── Scores Tab ────────────────────────────────────────────────────────────────
function ScoresTab({ members, scores, onAdjust }) {
  const [adjMember, setAdjMember] = useState(null);
  const [adjVal, setAdjVal] = useState("");

  const doAdjust = () => {
    const n = parseFloat(adjVal);
    if (!isNaN(n) && adjMember) { onAdjust(adjMember, n); setAdjMember(null); setAdjVal(""); }
  };

  const sorted = [...members].sort((a, b) => {
    const sa = (scores[a.tag || a.name] || {}).overall || 0;
    const sb = (scores[b.tag || b.name] || {}).overall || 0;
    return sb - sa;
  });

  return (
    <div>
      <div style={{ display: "grid", gap: 3, marginBottom: 20 }}>
        {[{ label: "KEEP", desc: "Score ≥ 25", col: "#4ade80" }, { label: "WARN", desc: "Score −5 to 24", col: "#facc15" }, { label: "KICK", desc: "Score < −5", col: "#f87171" }].map(v => (
          <div key={v.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 8 }}>
            <span style={{ color: v.col, fontWeight: 800, fontSize: 13, minWidth: 40 }}>{v.label}</span>
            <span style={{ color: "#9d8a6a", fontSize: 12 }}>{v.desc}</span>
          </div>
        ))}
      </div>

      {adjMember && (
        <Card style={{ marginBottom: 16, border: "1px solid rgba(232,184,75,0.3)" }}>
          <SectionTitle>Manual Adjustment — {members.find(m => (m.tag || m.name) === adjMember)?.name}</SectionTitle>
          <div style={{ display: "flex", gap: 8 }}>
            <Input type="number" value={adjVal} onChange={setAdjVal} placeholder="e.g. +10 or -5" />
            <Btn onClick={doAdjust}>Apply</Btn>
            <Btn secondary onClick={() => { setAdjMember(null); setAdjVal(""); }}>Cancel</Btn>
          </div>
        </Card>
      )}

      <div style={{ display: "grid", gap: 8 }}>
        {sorted.map((m, i) => {
          const key = m.tag || m.name;
          const s = scores[key] || { overall: 0, monthly: 0 };
          const v = verdict(s.overall);
          return (
            <Card key={key}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ color: "#6b5a45", fontWeight: 800, fontSize: 18, minWidth: 28 }}>#{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ color: "#f0e6d0", fontWeight: 700 }}>{m.name}</span>
                    <Badge v={v} />
                  </div>
                  <div style={{ display: "flex", gap: 20 }}>
                    <div>
                      <p style={{ color: "#9d8a6a", fontSize: 11, margin: "0 0 2px" }}>OVERALL</p>
                      <ScoreChip score={s.overall} />
                    </div>
                    <div>
                      <p style={{ color: "#9d8a6a", fontSize: 11, margin: "0 0 2px" }}>THIS MONTH</p>
                      <ScoreChip score={s.monthly} />
                    </div>
                    {s.adjustments !== undefined && s.adjustments !== 0 && (
                      <div>
                        <p style={{ color: "#9d8a6a", fontSize: 11, margin: "0 0 2px" }}>ADJUSTMENTS</p>
                        <ScoreChip score={s.adjustments} />
                      </div>
                    )}
                  </div>
                </div>
                <Btn secondary onClick={() => setAdjMember(key)} style={{ fontSize: 12, padding: "6px 12px" }}>± Adjust</Btn>
              </div>
            </Card>
          );
        })}
        {members.length === 0 && <p style={{ color: "#9d8a6a", fontSize: 13 }}>No members yet.</p>}
      </div>
    </div>
  );
}

// ── Settings Tab ──────────────────────────────────────────────────────────────
function SettingsTab({ settings, onSave, onDisconnect }) {
  const [s, setS] = useState(settings);
  const toggle = (type) => {
    setS(prev => ({
      ...prev,
      disabled: prev.disabled.includes(type) ? prev.disabled.filter(t => t !== type) : [...prev.disabled, type],
    }));
  };
  const types = [
    { key: "cwl", label: "Clan War League" },
    { key: "war", label: "Clan Wars" },
    { key: "capital", label: "Clan Capital" },
    { key: "games", label: "Clan Games" },
    { key: "event", label: "Special Events" },
  ];

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <SectionTitle>Scoring Values</SectionTitle>
        {[
          { label: "CWL Attack Hit", path: ["cwl", "hit"] },
          { label: "CWL Attack Miss", path: ["cwl", "miss"] },
          { label: "War Attack Hit", path: ["war", "hit"] },
          { label: "War Attack Miss", path: ["war", "miss"] },
          { label: "Capital Attack Hit", path: ["capital", "hit"] },
          { label: "Capital Attack Miss", path: ["capital", "miss"] },
          { label: "Games Under 1k", path: ["games", "under1k"] },
          { label: "Games Zero Contrib", path: ["games", "zero"] },
          { label: "Special Event Hit", path: ["event", "hit"] },
          { label: "Special Event Miss", path: ["event", "miss"] },
        ].map(({ label, path }) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ color: "#d1c4a0", fontSize: 13 }}>{label}</span>
            <Input
              type="number"
              value={s[path[0]][path[1]]}
              onChange={v => setS(prev => ({ ...prev, [path[0]]: { ...prev[path[0]], [path[1]]: parseFloat(v) || 0 } }))}
              style={{ width: 90 }}
            />
          </div>
        ))}
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <SectionTitle>Disable Event Scoring</SectionTitle>
        <p style={{ color: "#9d8a6a", fontSize: 12, margin: "0 0 12px" }}>Disabled events won't affect scores (positives and negatives both removed).</p>
        {types.map(({ key, label }) => (
          <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ color: s.disabled.includes(key) ? "#6b5a45" : "#d1c4a0", fontSize: 13 }}>{label}</span>
            <button onClick={() => toggle(key)} style={{
              padding: "5px 14px", border: "none", borderRadius: 8, cursor: "pointer",
              fontFamily: "inherit", fontSize: 12, fontWeight: 700,
              background: s.disabled.includes(key) ? "rgba(248,113,113,0.15)" : "rgba(74,222,128,0.15)",
              color: s.disabled.includes(key) ? "#f87171" : "#4ade80",
              border: `1px solid ${s.disabled.includes(key) ? "rgba(248,113,113,0.3)" : "rgba(74,222,128,0.3)"}`,
            }}>{s.disabled.includes(key) ? "Disabled" : "Enabled"}</button>
          </div>
        ))}
      </Card>

      <div style={{ display: "flex", gap: 10 }}>
        <Btn onClick={() => onSave(s)}>Save Settings</Btn>
        <Btn danger onClick={onDisconnect}>Disconnect Clan</Btn>
      </div>
    </div>
  );
}

// ── Score Calculator ──────────────────────────────────────────────────────────
function calcScores(members, events, settings, adjustments, monthKey) {
  const scores = {};
  members.forEach(m => {
    const key = m.tag || m.name;
    let overall = 0;
    let monthly = 0;

    events.forEach(ev => {
      if (settings.disabled.includes(ev.type)) return;
      const val = (ev.members || {})[key] || {};
      const evMonth = ev.date ? ev.date.slice(0, 7).replace("-", "-") : "";
      const isThisMonth = evMonth === monthKey.replace("-", "-").slice(0, 7);
      let pts = 0;

      if (ev.type === "war") {
        if (val.status === "not_in") pts = 0;
        else if (val.status === "attacked") pts = (val.attacks || 0) * settings.war.hit;
        else if (val.status === "missed") pts = settings.war.miss;
      }
      if (ev.type === "cwl") {
        if (val.status === "not_in") pts = 0;
        else if (val.status === "attacked") pts = settings.cwl.hit;
        else if (val.status === "missed") pts = settings.cwl.miss;
      }
      if (ev.type === "capital") {
        if (!val.attacks && !val.points) pts = 0;
        else {
          const used = val.attacks || 0;
          const max = val.maxAttacks || 0;
          const missed = Math.max(0, max - used);
          pts = used * settings.capital.hit + missed * settings.capital.miss;
        }
      }
      if (ev.type === "games") {
        pts = clanGamesScore(val.points || 0);
        if (val.points === undefined) pts = settings.games.zero;
      }
      if (ev.type === "special") {
        if (val.status === "hit") pts = ev.hitBonus ?? settings.event.hit;
        else pts = ev.missPenalty ?? settings.event.miss;
      }

      overall += pts;
      if (isThisMonth) monthly += pts;
    });

    const adj = adjustments[key] || 0;
    scores[key] = { overall: parseFloat((overall + adj).toFixed(1)), monthly: parseFloat(monthly.toFixed(1)), adjustments: adj };
  });
  return scores;
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [config, setConfig] = useState(() => LS.get("coc_config", null));
  const [members, setMembers] = useState(() => LS.get("coc_members", []));
  const [events, setEvents] = useState(() => LS.get("coc_events", []));
  const [settings, setSettings] = useState(() => LS.get("coc_settings", DEFAULT_SETTINGS));
  const [adjustments, setAdjustments] = useState(() => LS.get("coc_adjustments", {}));
  const [tab, setTab] = useState("Dashboard");
  const [syncing, setSyncing] = useState(false);
  const [warLogPrivate, setWarLogPrivate] = useState(false);

  useEffect(() => { LS.set("coc_members", members); }, [members]);
  useEffect(() => { LS.set("coc_events", events); }, [events]);
  useEffect(() => { LS.set("coc_settings", settings); }, [settings]);
  useEffect(() => { LS.set("coc_adjustments", adjustments); }, [adjustments]);

  const scores = calcScores(members, events, settings, adjustments, MONTH_KEY());

  const handleSync = async () => {
    if (!config) return;
    setSyncing(true); setWarLogPrivate(false);
    try {
      const clan = await cocFetch(`/clans/${encodeURIComponent(config.tag)}`, config.token);
      const memberList = (clan.memberList || []).map(m => ({ name: m.name, tag: m.tag, role: m.role }));
      setMembers(prev => {
        const existing = new Set(prev.map(m => m.tag));
        const newOnes = memberList.filter(m => !existing.has(m.tag));
        return [...prev.filter(m => memberList.some(mm => mm.tag === m.tag)), ...newOnes];
      });
    } catch (e) {
      if (e.message === "ACCESS_DENIED") setWarLogPrivate(true);
    }
    setSyncing(false);
  };

  const handleSaveConfig = (cfg) => { LS.set("coc_config", cfg); setConfig(cfg); };
  const handleDisconnect = () => { LS.set("coc_config", null); setConfig(null); };
  const handleAddMember = (name) => setMembers(prev => [...prev, { name, tag: name }]);
  const handleRemoveMember = (key) => setMembers(prev => prev.filter(m => (m.tag || m.name) !== key));
  const handleAddEvent = (ev) => setEvents(prev => [...prev, ev]);
  const handleDeleteEvent = (id) => setEvents(prev => prev.filter(e => e.id !== id));
  const handleAdjust = (key, val) => setAdjustments(prev => ({ ...prev, [key]: parseFloat(((prev[key] || 0) + val).toFixed(1)) }));

  if (!config) return (
    <div style={{ fontFamily: "'Crimson Text', Georgia, serif", background: "radial-gradient(ellipse at top, #1a1008 0%, #0d0804 100%)", minHeight: "100vh", color: "#f0e6d0" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;800&family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=Lilita+One&display=swap'); * { box-sizing: border-box; } input[type=number]::-webkit-inner-spin-button { opacity: 0.5; }`}</style>
      <SetupScreen onSave={handleSaveConfig} />
    </div>
  );

  return (
    <div style={{ fontFamily: "'Crimson Text', Georgia, serif", background: "radial-gradient(ellipse at top, #1a1008 0%, #0d0804 100%)", minHeight: "100vh", color: "#f0e6d0" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;800&family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=Lilita+One&display=swap'); * { box-sizing: border-box; } input[type=number]::-webkit-inner-spin-button { opacity: 0.5; } input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.6); }`}</style>

      {/* Header */}
      <div style={{ background: "linear-gradient(180deg, rgba(92,45,10,0.98) 0%, rgba(40,20,5,0.98) 100%)", borderBottom: "2px solid #c8972a", padding: "0 20px", position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(10px)", boxShadow: "0 4px 20px rgba(0,0,0,0.6)" }}>
        {/* Top gold line */}
        <div style={{ height: 2, background: "linear-gradient(90deg, transparent, #e8b84b, #ffe566, #e8b84b, transparent)", marginBottom: 0 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0" }}>
          <span style={{ fontSize: 28 }}>⚔️</span>
          <div>
            <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: 15, color: "#e8b84b", margin: 0, letterSpacing: 3, textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>CLAN TRACKER</h1>
            <p style={{ color: "#9d8a6a", margin: 0, fontSize: 11, letterSpacing: 1 }}>{config.clanName || config.tag}</p>
          </div>
          {/* Decorative divider */}
          <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(232,184,75,0.3), transparent)", marginLeft: 8 }} />
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <span style={{ color: "#6b5a45", fontSize: 11, fontFamily: "'Cinzel', serif", letterSpacing: 1 }}>⚔️</span>
          </div>
        </div>
      </div>

      {/* Decorative top border */}
      <div style={{ height: 3, background: "linear-gradient(90deg, transparent, #c8972a, #e8b84b, #c8972a, transparent)" }} />

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px" }}>
        <TabBar active={tab} setActive={setTab} />

        {tab === "Dashboard" && <DashboardTab members={members} scores={scores} onSync={handleSync} syncing={syncing} warLogPrivate={warLogPrivate} onAddMember={handleAddMember} onRemoveMember={handleRemoveMember} />}
        {tab === "Activity" && <ActivityTab members={members} events={events} onAddEvent={handleAddEvent} onUpdateEvent={() => {}} onDeleteEvent={handleDeleteEvent} scores={scores} settings={settings} />}
        {tab === "Performance" && <PerformanceTab members={members} events={events} />}
        {tab === "Scores" && <ScoresTab members={members} scores={scores} onAdjust={handleAdjust} />}
        {tab === "Settings" && <SettingsTab settings={settings} onSave={s => { setSettings(s); }} onDisconnect={handleDisconnect} />}
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", padding: "24px 20px 32px", borderTop: "1px solid rgba(232,184,75,0.1)", marginTop: 20 }}>
        <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(232,184,75,0.2), transparent)", marginBottom: 16 }} />
        <p style={{ color: "#3d2e1e", fontSize: 11, fontFamily: "'Cinzel', serif", letterSpacing: 1, margin: "0 0 4px" }}>⚔️ CLAN TRACKER · DATA STORED LOCALLY IN YOUR BROWSER</p>
        <p style={{ color: "#2a1e10", fontSize: 10, margin: 0, letterSpacing: 0.5 }}>Not affiliated with Supercell. Clash of Clans is a trademark of Supercell Oy.</p>
      </div>
    </div>
  );
}
