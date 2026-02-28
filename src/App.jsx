import { useState, useMemo, useEffect, useCallback, createContext, useContext } from "react";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL || "/api";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const SITUATIONS = ["EV", "PP", "SH", "EN"];
const SIT_LABEL  = { EV: "Even Strength", PP: "Power Play", SH: "Shorthanded", EN: "Empty Net" };
const SIT_COLOR  = { EV: "#00d4ff", PP: "#ffd600", SH: "#ff6b35", EN: "#b347ff" };
const PERIODS    = ["1", "2", "3", "OT"];
const OUTCOMES   = ["W", "L", "OTW", "OTL", "SOW", "SOL"];
const POSITIONS  = ["C", "LW", "RW", "D", "G", "F"];
const isWin      = o => ["W","OTW","SOW"].includes(o);
const pct        = (n, d) => d === 0 ? 0 : (n / d) * 100;
const fmt        = n => Number(n).toFixed(1) + "%";
const toSecs     = t => { if (!t) return 9999; const [m,s] = t.split(":").map(Number); return m*60+(s||0); };
const iS         = { width:"100%", background:"#07090d", border:"1px solid #141926", borderRadius:5, padding:"9px 11px", color:"#dde1ec", fontSize:12 };
const blankEntry  = () => ({ date: new Date().toISOString().split("T")[0], opponent:"", period:"1", timeInPeriod:"", situation:"EV", gameOutcome:"W", wasFirstGoal:false, homeAway:"HOME", notes:"" });
const blankPlayer = () => ({ name:"", team:"", jerseyNumber:"", position:"RW", sport:"NHL" });

// ─── AUTH CONTEXT ─────────────────────────────────────────────────────────────
const AuthCtx = createContext(null);
function useAuth() { return useContext(AuthCtx); }

// ─── API CLIENT ──────────────────────────────────────────────────────────────
function useApi() {
  const token = localStorage.getItem("fl_token");
  const headers = { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) };

  const call = useCallback(async (method, path, body) => {
    const res = await fetch(`${API}${path}`, {
      method,
      headers,
      ...(body && { body: JSON.stringify(body) }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "API error");
    return data;
  }, [token]);

  return {
    get:    (path)        => call("GET",    path),
    post:   (path, body)  => call("POST",   path, body),
    put:    (path, body)  => call("PUT",    path, body),
    delete: (path)        => call("DELETE", path),
  };
}

// ─── TOAST ───────────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((msg, type="info") => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);
  return { toasts, show };
}

function ToastList({ toasts }) {
  const colors = { info:"#00d4ff", success:"#00e676", error:"#ff3d5a", warning:"#ffd600" };
  return (
    <div style={{ position:"fixed", top:16, right:16, zIndex:999, display:"flex", flexDirection:"column", gap:8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{ background:"#0d1018", border:`1px solid ${colors[t.type]||colors.info}`, borderRadius:6, padding:"10px 16px", fontSize:12, color:"#dde1ec", maxWidth:300, boxShadow:"0 4px 20px #00000088" }}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ─── FIELD COMPONENT ─────────────────────────────────────────────────────────
function F({ label, children, style }) {
  return (
    <div style={style}>
      <div style={{ fontSize:8, letterSpacing:2, color:"#3a4258", marginBottom:6 }}>{label}</div>
      {children}
    </div>
  );
}

// ─── SPINNER ─────────────────────────────────────────────────────────────────
function Spinner({ size=20 }) {
  return (
    <div style={{ width:size, height:size, border:`2px solid #1e2636`, borderTop:`2px solid #00d4ff`, borderRadius:"50%", animation:"spin .7s linear infinite" }} />
  );
}

// ════════════════════════════════════════════════════════════════════════════
// AUTH SCREENS
// ════════════════════════════════════════════════════════════════════════════
function AuthScreen({ onAuth }) {
  const [mode, setMode]   = useState("login"); // login | register
  const [form, setForm]   = useState({ email:"", password:"", name:"" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const api = useApi();

  async function submit() {
    if (!form.email || !form.password) return;
    setLoading(true); setError("");
    try {
      const path = mode === "login" ? "/auth/login" : "/auth/register";
      const body = mode === "login" ? { email:form.email, password:form.password } : form;
      const data = await api.post(path, body);
      localStorage.setItem("fl_token", data.token);
      onAuth(data.user, data.token);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight:"100vh", background:"#07090d", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Mono','Courier New',monospace" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Bebas+Neue&display=swap');*{box-sizing:border-box;margin:0;padding:0}@keyframes spin{to{transform:rotate(360deg)}}@keyframes su{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}.su{animation:su .25s ease forwards}.btn{cursor:pointer;border:none;font-family:inherit;transition:all .12s}.btn:hover{opacity:.8}input,select,textarea{font-family:inherit;outline:none}input:focus,select:focus{border-color:#00d4ff!important}`}</style>

      <div className="su" style={{ width:"100%", maxWidth:400, padding:24 }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:52, letterSpacing:4, color:"#00d4ff", lineHeight:1 }}>FIRST</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:52, letterSpacing:4, color:"#dde1ec", lineHeight:1 }}>LIGHT</div>
          <div style={{ fontSize:9, color:"#3a4258", letterSpacing:3, marginTop:6 }}>PLAYER GOAL OPENER TRACKER</div>
        </div>

        <div style={{ background:"#0d1018", border:"1px solid #141926", borderRadius:10, padding:28 }}>
          <div style={{ display:"flex", gap:4, marginBottom:24 }}>
            {["login","register"].map(m => (
              <button key={m} onClick={() => setMode(m)} className="btn" style={{ flex:1, padding:"8px", fontSize:10, letterSpacing:2, borderRadius:4, background: mode===m ? "#00d4ff" : "#141926", color: mode===m ? "#07090d" : "#5a6680" }}>
                {m === "login" ? "SIGN IN" : "SIGN UP"}
              </button>
            ))}
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {mode === "register" && (
              <F label="NAME">
                <input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="Your name" style={iS} />
              </F>
            )}
            <F label="EMAIL">
              <input type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} placeholder="you@email.com" style={iS} onKeyDown={e => e.key==="Enter" && submit()} />
            </F>
            <F label="PASSWORD">
              <input type="password" value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))} placeholder="••••••••" style={iS} onKeyDown={e => e.key==="Enter" && submit()} />
            </F>
          </div>

          {error && <div style={{ marginTop:12, fontSize:11, color:"#ff3d5a", textAlign:"center" }}>{error}</div>}

          <button onClick={submit} disabled={loading} className="btn" style={{ width:"100%", marginTop:20, background:"#00d4ff", color:"#07090d", padding:13, fontSize:11, letterSpacing:2, borderRadius:6, fontWeight:600, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            {loading ? <Spinner size={16}/> : (mode === "login" ? "SIGN IN" : "CREATE ACCOUNT")}
          </button>

          {mode === "register" && (
            <div style={{ marginTop:14, textAlign:"center", fontSize:10, color:"#3a4258" }}>✓ 14-day free trial · No credit card required</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [user, setUser]     = useState(null);
  const [token, setToken]   = useState(() => localStorage.getItem("fl_token"));
  const [booting, setBooting] = useState(true);
  const { toasts, show }    = useToast();

  // Check saved token on load
  useEffect(() => {
    const saved = localStorage.getItem("fl_token");
    if (!saved) { setBooting(false); return; }
    fetch(`${API}/auth/me`, { headers:{ Authorization:`Bearer ${saved}` } })
      .then(r => r.json())
      .then(d => { if (d.user) { setUser(d.user); setToken(saved); } else { localStorage.removeItem("fl_token"); } })
      .catch(() => localStorage.removeItem("fl_token"))
      .finally(() => setBooting(false));
  }, []);

  function handleAuth(u, t) { setUser(u); setToken(t); }
  function handleLogout() {
    fetch(`${API}/auth/logout`, { method:"POST", headers:{ Authorization:`Bearer ${token}` }}).catch(()=>{});
    localStorage.removeItem("fl_token");
    setUser(null); setToken(null);
  }

  if (booting) return (
    <div style={{ minHeight:"100vh", background:"#07090d", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <Spinner size={32}/>
    </div>
  );

  if (!user) return <AuthScreen onAuth={handleAuth}/>;

  return (
    <AuthCtx.Provider value={{ user, token }}>
      <ToastList toasts={toasts}/>
      <Dashboard toast={show} onLogout={handleLogout}/>
    </AuthCtx.Provider>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// DASHBOARD (authenticated)
// ════════════════════════════════════════════════════════════════════════════
function Dashboard({ toast, onLogout }) {
  const { user, token } = useAuth();
  const api = useApi();

  const [players, setPlayers]   = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [entries, setEntries]   = useState([]);
  const [stats, setStats]       = useState(null);
  const [view, setView]         = useState("profile");
  const [loading, setLoading]   = useState(false);
  const [entryForm, setEntryForm] = useState(blankEntry());
  const [playerForm, setPlayerForm] = useState(blankPlayer());
  const [editEntryId, setEditEntryId] = useState(null);
  const [filterSit, setFilterSit] = useState("All");
  const [filterPeriod, setFilterPeriod] = useState("All");
  const [importSearch, setImportSearch] = useState("");
  const [importResults, setImportResults] = useState([]);
  const [importLoading, setImportLoading] = useState(false);

  const player = players.find(p => p.id === selectedId);
  const canImport = user.plan === "PRO" || user.plan === "ELITE";
  const canAlerts = user.plan === "ELITE";

  // ── Load players ──────────────────────────────────────────────────────────
  useEffect(() => {
    api.get("/players")
      .then(d => {
        setPlayers(d.players);
        if (d.players.length && !selectedId) setSelectedId(d.players[0].id);
      })
      .catch(e => toast(e.message, "error"));
  }, []);

  // ── Load entries + stats when player changes ──────────────────────────────
  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    Promise.all([
      api.get(`/entries?playerId=${selectedId}`),
      api.get(`/stats/${selectedId}`),
    ]).then(([ed, sd]) => {
      setEntries(ed.entries || []);
      setStats(sd.stats);
    }).catch(e => toast(e.message, "error"))
      .finally(() => setLoading(false));
  }, [selectedId]);

  // ── Filtered game log ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return [...entries]
      .filter(e => (filterSit === "All" || e.situation === filterSit) && (filterPeriod === "All" || e.period === filterPeriod))
      .sort((a,b) => new Date(b.date) - new Date(a.date));
  }, [entries, filterSit, filterPeriod]);

  // ── Computed local stats (fallback if server stats not ready) ─────────────
  const localStats = useMemo(() => {
    if (stats) return stats;
    const goals = entries.filter(e => e.wasFirstGoal);
    const total = entries.length;
    const n = goals.length;
    const bySit = {}, byPeriod = {};
    SITUATIONS.forEach(s => { const sg=goals.filter(g=>g.situation===s); bySit[s]={count:sg.length,pctOfFirstGoals:pct(sg.length,n),pctOfAllGames:pct(sg.length,total)}; });
    PERIODS.forEach(p => { const pg=goals.filter(g=>g.period===p); byPeriod[p]={count:pg.length,pctOfFirstGoals:pct(pg.length,n)}; });
    const wins = goals.filter(g=>isWin(g.gameOutcome)).length;
    const avgs = goals.length ? goals.reduce((s,g)=>s+toSecs(g.timeInPeriod),0)/goals.length : 0;
    const crossTable = {};
    SITUATIONS.forEach(s=>{ crossTable[s]={}; PERIODS.forEach(p=>{ crossTable[s][p]=goals.filter(g=>g.situation===s&&g.period===p).length; }); });
    return { totalGames:total, firstGoalCount:n, firstGoalPct:+pct(n,total).toFixed(1), bySituation:bySit, byPeriod, crossTable, winRateFirst:+pct(wins,n).toFixed(1), period1FirstGoalPct:+pct(byPeriod["1"]?.count||0,n).toFixed(1), avgTime: goals.length ? `${Math.floor(avgs/60)}:${String(Math.round(avgs%60)).padStart(2,"0")}` : "—", streak:0 };
  }, [stats, entries]);

  // ── CRUD Handlers ─────────────────────────────────────────────────────────
  async function savePlayer() {
    if (!playerForm.name) return;
    try {
      const d = await api.post("/players", playerForm);
      setPlayers(prev => [...prev, d.player]);
      setSelectedId(d.player.id);
      setPlayerForm(blankPlayer());
      setView("profile");
      toast("Player added!", "success");
    } catch(e) { toast(e.message, "error"); }
  }

  async function deletePlayer(id) {
    if (!confirm("Delete this player and all their data?")) return;
    try {
      await api.delete(`/players/${id}`);
      const remaining = players.filter(p => p.id !== id);
      setPlayers(remaining);
      setSelectedId(remaining[0]?.id || null);
      setEntries([]); setStats(null);
      toast("Player deleted", "info");
    } catch(e) { toast(e.message, "error"); }
  }

  async function saveEntry() {
    if (!entryForm.date || !entryForm.opponent) return;
    try {
      const body = { ...entryForm, playerId: selectedId };
      if (editEntryId) {
        const d = await api.put(`/entries/${editEntryId}`, body);
        setEntries(prev => prev.map(e => e.id === editEntryId ? d.entry : e));
        toast("Entry updated", "success");
      } else {
        const d = await api.post("/entries", body);
        setEntries(prev => [d.entry, ...prev]);
        toast("Game logged!", "success");
      }
      // Refresh stats
      api.get(`/stats/${selectedId}`).then(d => setStats(d.stats)).catch(()=>{});
      setEntryForm(blankEntry()); setEditEntryId(null); setView("profile");
    } catch(e) { toast(e.message, "error"); }
  }

  async function deleteEntry(eid) {
    try {
      await api.delete(`/entries/${eid}`);
      setEntries(prev => prev.filter(e => e.id !== eid));
      api.get(`/stats/${selectedId}`).then(d => setStats(d.stats)).catch(()=>{});
      toast("Entry deleted", "info");
    } catch(e) { toast(e.message, "error"); }
  }

  function editEntry(e) {
    setEntryForm({
      date: e.date?.split("T")[0] || "",
      opponent: e.opponent, period: e.period,
      timeInPeriod: e.timeInPeriod || "", situation: e.situation,
      gameOutcome: e.gameOutcome, wasFirstGoal: e.wasFirstGoal,
      homeAway: e.homeAway || "HOME", notes: e.notes || "",
    });
    setEditEntryId(e.id); setView("add-entry");
  }

  // ── NHL Import ────────────────────────────────────────────────────────────
  async function searchNHL() {
    if (!importSearch) return;
    setImportLoading(true);
    try {
      const d = await api.get(`/import/search?q=${encodeURIComponent(importSearch)}&sport=NHL`);
      setImportResults(d.results || []);
      if (!d.results?.length) toast("No players found", "warning");
    } catch(e) { toast(e.message, "error"); }
    finally { setImportLoading(false); }
  }

  async function linkAndImport(nhlPlayer) {
    try {
      await api.post("/import/link", { playerId: selectedId, nhlPlayerId: nhlPlayer.id });
      toast("Linked! Starting import...", "info");
      const d = await api.post(`/import/player/${selectedId}`, {});
      toast(`Imported ${d.imported} entries!`, "success");
      const [ed, sd] = await Promise.all([api.get(`/entries?playerId=${selectedId}`), api.get(`/stats/${selectedId}`)]);
      setEntries(ed.entries || []); setStats(sd.stats);
      setImportResults([]); setImportSearch(""); setView("profile");
    } catch(e) { toast(e.message, "error"); }
  }

  async function exportPDF() {
    window.open(`${API}/export/player/${selectedId}.pdf?token=${token}`, "_blank");
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily:"'DM Mono','Courier New',monospace", background:"#07090d", minHeight:"100vh", color:"#dde1ec" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Bebas+Neue&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#1e2636}
        .btn{cursor:pointer;border:none;font-family:inherit;transition:all .12s}.btn:hover{opacity:.8}
        input,select,textarea{font-family:inherit;outline:none}
        input:focus,select:focus,textarea:focus{border-color:#00d4ff!important}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes su{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .su{animation:su .25s ease forwards}
      `}</style>

      <div style={{ display:"flex", minHeight:"100vh" }}>

        {/* ── SIDEBAR ── */}
        <div style={{ width:220, background:"#0b0e15", borderRight:"1px solid #141926", display:"flex", flexDirection:"column", position:"sticky", top:0, height:"100vh", overflowY:"auto" }}>
          <div style={{ padding:"18px 16px 14px", borderBottom:"1px solid #141926" }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, letterSpacing:3, color:"#00d4ff", lineHeight:1 }}>FIRST</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, letterSpacing:3, color:"#dde1ec", lineHeight:1 }}>LIGHT</div>
            <div style={{ fontSize:7, color:"#3a4258", letterSpacing:2, marginTop:3 }}>GOAL OPENER TRACKER</div>
          </div>

          {/* Plan badge */}
          <div style={{ padding:"8px 16px", borderBottom:"1px solid #141926" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontSize:9, color:"#3a4258" }}>{user.email?.split("@")[0]}</span>
              <span style={{ fontSize:8, padding:"2px 7px", borderRadius:3, background: user.plan==="ELITE"?"#b347ff22":user.plan==="PRO"?"#00d4ff22":"#141926", color: user.plan==="ELITE"?"#b347ff":user.plan==="PRO"?"#00d4ff":"#5a6680", border:`1px solid ${user.plan==="ELITE"?"#b347ff44":user.plan==="PRO"?"#00d4ff44":"#1e2636"}` }}>
                {user.plan}
              </span>
            </div>
          </div>

          <div style={{ padding:"12px 12px 4px", fontSize:8, color:"#3a4258", letterSpacing:2 }}>PLAYERS</div>
          {players.map(p => (
            <button key={p.id} onClick={() => { setSelectedId(p.id); setView("profile"); }} className="btn" style={{ display:"block", width:"100%", textAlign:"left", padding:"9px 16px", background: selectedId===p.id ? "#0f1420" : "transparent", borderLeft:`3px solid ${selectedId===p.id ? "#00d4ff" : "transparent"}`, color: selectedId===p.id ? "#dde1ec" : "#5a6680" }}>
              <div style={{ fontSize:12, fontWeight:500 }}>{p.name}</div>
              <div style={{ fontSize:9, color:"#3a4258", marginTop:1 }}>{p.team}{p.jerseyNumber ? ` #${p.jerseyNumber}` : ""} · {p.position}</div>
            </button>
          ))}

          <button onClick={() => { setPlayerForm(blankPlayer()); setView("add-player"); }} className="btn" style={{ margin:"8px 12px", padding:8, fontSize:9, letterSpacing:1, border:"1px dashed #1e2636", borderRadius:4, color:"#3a4258", background:"transparent" }}>
            + ADD PLAYER
          </button>

          <div style={{ marginTop:"auto", padding:"12px 14px", borderTop:"1px solid #141926", display:"flex", flexDirection:"column", gap:6 }}>
            {player && (
              <>
                <button onClick={() => { setEntryForm(blankEntry()); setEditEntryId(null); setView("add-entry"); }} className="btn" style={{ width:"100%", background:"#00d4ff", color:"#07090d", padding:10, fontSize:10, letterSpacing:2, borderRadius:4, fontWeight:600 }}>
                  + LOG GAME
                </button>
                {canImport && (
                  <button onClick={() => setView("import")} className="btn" style={{ width:"100%", background:"#141926", color:"#5a6680", padding:8, fontSize:9, letterSpacing:1, borderRadius:4, border:"1px solid #1e2636" }}>
                    ↓ NHL IMPORT
                  </button>
                )}
                <button onClick={exportPDF} className="btn" style={{ width:"100%", background:"#141926", color:"#5a6680", padding:8, fontSize:9, letterSpacing:1, borderRadius:4, border:"1px solid #1e2636" }}>
                  ↗ EXPORT PDF
                </button>
              </>
            )}
            <button onClick={onLogout} className="btn" style={{ width:"100%", background:"transparent", color:"#3a4258", padding:"6px", fontSize:9, letterSpacing:1 }}>
              SIGN OUT
            </button>
          </div>
        </div>

        {/* ── MAIN ── */}
        <div style={{ flex:1, overflowY:"auto" }}>

          {/* ── PROFILE ── */}
          {view === "profile" && player && (
            <div className="su" style={{ padding:28 }}>
              <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:24 }}>
                <div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:50, letterSpacing:2, lineHeight:1 }}>{player.name}</div>
                  <div style={{ fontSize:10, color:"#5a6680", letterSpacing:2, marginTop:4 }}>{player.team}{player.jerseyNumber?` · #${player.jerseyNumber}`:""} · {player.position} · {player.sport}</div>
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  {loading && <Spinner/>}
                  <button onClick={() => deletePlayer(player.id)} className="btn" style={{ fontSize:9, color:"#3a4258", background:"none" }}>DELETE</button>
                </div>
              </div>

              {/* Key stats */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10, marginBottom:20 }}>
                {[
                  { label:"GAMES LOGGED",   val:localStats.totalGames,               color:"#dde1ec" },
                  { label:"FIRST GOALS",    val:localStats.firstGoalCount,            color:"#00d4ff" },
                  { label:"FIRST GOAL %",   val:fmt(localStats.firstGoalPct),         color:"#00d4ff", big:true },
                  { label:"WIN WHEN OPENS", val:fmt(localStats.winRateFirst),         color:"#00e676" },
                  { label:"AVG OPEN TIME",  val:localStats.avgTime || "—",            color:"#ffd600" },
                ].map(s => (
                  <div key={s.label} style={{ background:"#0d1018", border:"1px solid #141926", borderRadius:6, padding:"14px 16px" }}>
                    <div style={{ fontSize:8, letterSpacing:2, color:"#3a4258", marginBottom:7 }}>{s.label}</div>
                    <div style={{ fontSize:s.big?26:20, fontFamily:"'Bebas Neue',sans-serif", color:s.color }}>{s.val}</div>
                  </div>
                ))}
              </div>

              {/* Breakdowns */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:18 }}>
                {/* By Situation */}
                <div style={{ background:"#0d1018", border:"1px solid #141926", borderRadius:8, padding:20 }}>
                  <div style={{ fontSize:9, letterSpacing:2, color:"#3a4258", marginBottom:16 }}>FIRST GOALS — GAME SITUATION</div>
                  {SITUATIONS.map(s => {
                    const d = localStats.bySituation?.[s] || { count:0, pctOfFirstGoals:0 };
                    return (
                      <div key={s} style={{ marginBottom:14 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                            <div style={{ width:6, height:6, borderRadius:"50%", background:SIT_COLOR[s] }}/>
                            <span style={{ fontSize:11 }}>{SIT_LABEL[s]}</span>
                          </div>
                          <span style={{ fontSize:11, color:"#5a6680" }}>
                            <span style={{ color:SIT_COLOR[s], fontWeight:600 }}>{d.count}</span>{" "}({fmt(d.pctOfFirstGoals)})
                          </span>
                        </div>
                        <div style={{ height:4, background:"#141926", borderRadius:2 }}>
                          <div style={{ height:"100%", width:`${(d.count/(localStats.firstGoalCount||1))*100}%`, background:SIT_COLOR[s], borderRadius:2, transition:"width .6s" }}/>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* By Period */}
                <div style={{ background:"#0d1018", border:"1px solid #141926", borderRadius:8, padding:20 }}>
                  <div style={{ fontSize:9, letterSpacing:2, color:"#3a4258", marginBottom:16 }}>FIRST GOALS — BY PERIOD</div>
                  {PERIODS.map((p,i) => {
                    const d = localStats.byPeriod?.[p] || { count:0, pctOfFirstGoals:0 };
                    const barColor = ["#00d4ff","#5da9ff","#a07aff","#ff6b35"][i];
                    return (
                      <div key={p} style={{ marginBottom:14 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                          <span style={{ fontSize:11 }}>{p==="OT"?"Overtime":`Period ${p}`}</span>
                          <span style={{ fontSize:11, color:"#5a6680" }}>
                            <span style={{ color:"#dde1ec", fontWeight:600 }}>{d.count}</span>{" "}({fmt(d.pctOfFirstGoals)})
                          </span>
                        </div>
                        <div style={{ height:4, background:"#141926", borderRadius:2 }}>
                          <div style={{ height:"100%", width:`${(d.count/(localStats.firstGoalCount||1))*100}%`, background:barColor, borderRadius:2, transition:"width .6s" }}/>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ marginTop:14, padding:"10px 12px", background:"#070a10", borderRadius:6, border:"1px solid #141926" }}>
                    <div style={{ fontSize:8, color:"#3a4258", letterSpacing:2, marginBottom:4 }}>P1 FIRST GOALS</div>
                    <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
                      <div style={{ fontFamily:"'Bebas Neue'", fontSize:28, color:"#00d4ff" }}>{fmt(localStats.period1FirstGoalPct)}</div>
                      <div style={{ fontSize:10, color:"#5a6680" }}>of openers in 1st period</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cross-table */}
              <div style={{ background:"#0d1018", border:"1px solid #141926", borderRadius:8, padding:20, marginBottom:18 }}>
                <div style={{ fontSize:9, letterSpacing:2, color:"#3a4258", marginBottom:14 }}>SITUATION × PERIOD CROSS-TABLE</div>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign:"left", padding:"5px 10px", color:"#3a4258", fontSize:9, fontWeight:400 }}>SITUATION</th>
                      {PERIODS.map(p => <th key={p} style={{ padding:"5px 10px", color:"#3a4258", fontSize:9, fontWeight:400, textAlign:"center" }}>P{p}</th>)}
                      <th style={{ padding:"5px 10px", color:"#3a4258", fontSize:9, fontWeight:400, textAlign:"center" }}>TOTAL</th>
                      <th style={{ padding:"5px 10px", color:"#3a4258", fontSize:9, fontWeight:400, textAlign:"center" }}>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SITUATIONS.map(s => {
                      const row = localStats.crossTable?.[s] || {};
                      const total = PERIODS.reduce((sum,p) => sum+(row[p]||0), 0);
                      return (
                        <tr key={s} style={{ borderTop:"1px solid #141926" }}>
                          <td style={{ padding:"8px 10px" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                              <div style={{ width:5, height:5, borderRadius:"50%", background:SIT_COLOR[s] }}/>
                              {SIT_LABEL[s]}
                            </div>
                          </td>
                          {PERIODS.map(p => {
                            const cnt = row[p] || 0;
                            return <td key={p} style={{ padding:"8px 10px", textAlign:"center", color:cnt>0?SIT_COLOR[s]:"#1e2636", fontWeight:cnt>0?600:400 }}>{cnt>0?cnt:"—"}</td>;
                          })}
                          <td style={{ padding:"8px 10px", textAlign:"center", color:"#dde1ec", fontWeight:700 }}>{total}</td>
                          <td style={{ padding:"8px 10px", textAlign:"center", color:SIT_COLOR[s] }}>{localStats.firstGoalCount>0?fmt(pct(total,localStats.firstGoalCount)):"—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Game log */}
              <div style={{ background:"#0d1018", border:"1px solid #141926", borderRadius:8, padding:20 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                  <div style={{ fontSize:9, letterSpacing:2, color:"#3a4258" }}>GAME LOG ({filtered.length})</div>
                  <div style={{ display:"flex", gap:6 }}>
                    <select value={filterSit} onChange={e=>setFilterSit(e.target.value)} style={{ background:"#07090d", border:"1px solid #141926", borderRadius:4, padding:"4px 8px", color:"#5a6680", fontSize:10 }}>
                      <option>All</option>{SITUATIONS.map(s=><option key={s}>{s}</option>)}
                    </select>
                    <select value={filterPeriod} onChange={e=>setFilterPeriod(e.target.value)} style={{ background:"#07090d", border:"1px solid #141926", borderRadius:4, padding:"4px 8px", color:"#5a6680", fontSize:10 }}>
                      <option>All</option>{PERIODS.map(p=><option key={p}>{p}</option>)}
                    </select>
                  </div>
                </div>

                {filtered.length === 0 && <div style={{ textAlign:"center", padding:32, color:"#3a4258", fontSize:11 }}>No entries match filters</div>}
                {filtered.map(e => (
                  <div key={e.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 6px", borderBottom:"1px solid #0f1218" }}>
                    <div style={{ width:70, textAlign:"center" }}>
                      {e.wasFirstGoal
                        ? <span style={{ fontSize:8, letterSpacing:1, background:"#00d4ff18", color:"#00d4ff", border:"1px solid #00d4ff44", padding:"3px 6px", borderRadius:3 }}>OPENER</span>
                        : <span style={{ fontSize:8, color:"#3a4258" }}>—</span>
                      }
                    </div>
                    <div style={{ width:80, fontSize:10, color:"#5a6680" }}>{e.date?.split("T")[0]||e.date}</div>
                    <div style={{ width:50, fontSize:11 }}>vs {e.opponent}</div>
                    <div style={{ width:36, fontSize:10, color:"#5a6680", textAlign:"center" }}>P{e.period}</div>
                    <div style={{ width:46, fontSize:11, color:"#ffd600", textAlign:"center" }}>{e.timeInPeriod||"—"}</div>
                    <div style={{ width:38, textAlign:"center" }}>
                      <span style={{ fontSize:10, fontWeight:600, color:SIT_COLOR[e.situation] }}>{e.situation}</span>
                    </div>
                    <div style={{ width:40, textAlign:"center" }}>
                      <span style={{ padding:"2px 5px", borderRadius:3, fontSize:10, fontWeight:600, background:isWin(e.gameOutcome)?"#00e67622":"#ff3d5a22", color:isWin(e.gameOutcome)?"#00e676":"#ff3d5a" }}>{e.gameOutcome}</span>
                    </div>
                    <div style={{ width:20, fontSize:9, color:"#3a4258", textAlign:"center" }}>{e.homeAway==="HOME"?"H":"A"}</div>
                    <div style={{ flex:1, fontSize:10, color:"#5a6680", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{e.notes||""}</div>
                    <div style={{ display:"flex", gap:4 }}>
                      <button onClick={()=>editEntry(e)} className="btn" style={{ fontSize:9, color:"#3a4258", background:"none" }}>EDIT</button>
                      <button onClick={()=>deleteEntry(e.id)} className="btn" style={{ fontSize:12, color:"#ff3d5a55", background:"none" }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── ADD ENTRY ── */}
          {view === "add-entry" && (
            <div className="su" style={{ padding:28, maxWidth:540 }}>
              <div style={{ fontSize:9, letterSpacing:2, color:"#3a4258", marginBottom:20 }}>{editEntryId?"EDIT ENTRY":"LOG GAME"} — {player?.name}</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <F label="DATE"><input type="date" value={entryForm.date} onChange={e=>setEntryForm(f=>({...f,date:e.target.value}))} style={iS}/></F>
                <F label="OPPONENT"><input value={entryForm.opponent} onChange={e=>setEntryForm(f=>({...f,opponent:e.target.value}))} placeholder="e.g. FLA" style={iS}/></F>
                <F label="PERIOD">
                  <select value={entryForm.period} onChange={e=>setEntryForm(f=>({...f,period:e.target.value}))} style={iS}>
                    {PERIODS.map(p=><option key={p} value={p}>Period {p}</option>)}
                  </select>
                </F>
                <F label="TIME (mm:ss)"><input value={entryForm.timeInPeriod} onChange={e=>setEntryForm(f=>({...f,timeInPeriod:e.target.value}))} placeholder="08:32" style={iS}/></F>
                <F label="GAME SITUATION">
                  <select value={entryForm.situation} onChange={e=>setEntryForm(f=>({...f,situation:e.target.value}))} style={iS}>
                    {SITUATIONS.map(s=><option key={s} value={s}>{SIT_LABEL[s]} ({s})</option>)}
                  </select>
                </F>
                <F label="GAME OUTCOME">
                  <select value={entryForm.gameOutcome} onChange={e=>setEntryForm(f=>({...f,gameOutcome:e.target.value}))} style={iS}>
                    {OUTCOMES.map(o=><option key={o}>{o}</option>)}
                  </select>
                </F>
                <F label="HOME / AWAY">
                  <select value={entryForm.homeAway} onChange={e=>setEntryForm(f=>({...f,homeAway:e.target.value}))} style={iS}>
                    <option value="HOME">Home</option>
                    <option value="AWAY">Away</option>
                  </select>
                </F>
              </div>

              <div onClick={()=>setEntryForm(f=>({...f,wasFirstGoal:!f.wasFirstGoal}))} style={{ margin:"18px 0", padding:16, background:"#0d1018", border:`2px solid ${entryForm.wasFirstGoal?"#00d4ff":"#141926"}`, borderRadius:8, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div>
                  <div style={{ fontSize:13, color:entryForm.wasFirstGoal?"#00d4ff":"#5a6680" }}>Was this the FIRST GOAL of the game?</div>
                  <div style={{ fontSize:10, color:"#3a4258", marginTop:3 }}>Player scored the game opener</div>
                </div>
                <div style={{ width:52, height:28, borderRadius:14, background:entryForm.wasFirstGoal?"#00d4ff":"#141926", position:"relative", transition:"background .2s", flexShrink:0 }}>
                  <div style={{ position:"absolute", top:4, left:entryForm.wasFirstGoal?28:4, width:20, height:20, borderRadius:"50%", background:"#fff", transition:"left .2s" }}/>
                </div>
              </div>

              <F label="NOTES"><textarea value={entryForm.notes} onChange={e=>setEntryForm(f=>({...f,notes:e.target.value}))} placeholder="Any context..." style={{ ...iS, height:70, resize:"vertical" }}/></F>

              <div style={{ display:"flex", gap:8, marginTop:18 }}>
                <button onClick={saveEntry} className="btn" style={{ flex:1, background:"#00d4ff", color:"#07090d", padding:12, fontSize:11, letterSpacing:2, borderRadius:6, fontWeight:600 }}>{editEntryId?"UPDATE":"SAVE ENTRY"}</button>
                <button onClick={()=>{ setView("profile"); setEditEntryId(null); }} className="btn" style={{ background:"#0d1018", color:"#5a6680", padding:"12px 20px", border:"1px solid #141926", borderRadius:6, fontSize:11 }}>CANCEL</button>
              </div>
            </div>
          )}

          {/* ── ADD PLAYER ── */}
          {view === "add-player" && (
            <div className="su" style={{ padding:28, maxWidth:460 }}>
              <div style={{ fontSize:9, letterSpacing:2, color:"#3a4258", marginBottom:20 }}>NEW PLAYER</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <F label="PLAYER NAME" style={{ gridColumn:"1/-1" }}><input value={playerForm.name} onChange={e=>setPlayerForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Josh Doan" style={iS}/></F>
                <F label="TEAM"><input value={playerForm.team} onChange={e=>setPlayerForm(f=>({...f,team:e.target.value}))} placeholder="BUF" style={iS}/></F>
                <F label="JERSEY #"><input value={playerForm.jerseyNumber} onChange={e=>setPlayerForm(f=>({...f,jerseyNumber:e.target.value}))} placeholder="91" style={iS}/></F>
                <F label="POSITION">
                  <select value={playerForm.position} onChange={e=>setPlayerForm(f=>({...f,position:e.target.value}))} style={iS}>
                    {POSITIONS.map(p=><option key={p}>{p}</option>)}
                  </select>
                </F>
                <F label="SPORT">
                  <select value={playerForm.sport} onChange={e=>setPlayerForm(f=>({...f,sport:e.target.value}))} style={iS}>
                    {["NHL","NBA","NFL","MLB","OTHER"].map(s=><option key={s}>{s}</option>)}
                  </select>
                </F>
              </div>
              <div style={{ display:"flex", gap:8, marginTop:18 }}>
                <button onClick={savePlayer} className="btn" style={{ flex:1, background:"#00d4ff", color:"#07090d", padding:12, fontSize:11, letterSpacing:2, borderRadius:6, fontWeight:600 }}>ADD PLAYER</button>
                <button onClick={()=>setView("profile")} className="btn" style={{ background:"#0d1018", color:"#5a6680", padding:"12px 20px", border:"1px solid #141926", borderRadius:6, fontSize:11 }}>CANCEL</button>
              </div>
            </div>
          )}

          {/* ── NHL IMPORT (PRO+) ── */}
          {view === "import" && (
            <div className="su" style={{ padding:28, maxWidth:560 }}>
              <div style={{ fontSize:9, letterSpacing:2, color:"#3a4258", marginBottom:6 }}>NHL AUTO-IMPORT — {player?.name}</div>
              <div style={{ fontSize:10, color:"#5a6680", marginBottom:20 }}>Search for the player on the NHL API, link them, and import all their goal data automatically.</div>

              <div style={{ display:"flex", gap:8, marginBottom:16 }}>
                <input value={importSearch} onChange={e=>setImportSearch(e.target.value)} onKeyDown={e=>e.key==="Enter"&&searchNHL()} placeholder="Search NHL player name..." style={{ ...iS, flex:1 }}/>
                <button onClick={searchNHL} disabled={importLoading} className="btn" style={{ background:"#00d4ff", color:"#07090d", padding:"0 18px", fontSize:10, letterSpacing:1, borderRadius:5, fontWeight:600, display:"flex", alignItems:"center", gap:6 }}>
                  {importLoading ? <Spinner size={14}/> : "SEARCH"}
                </button>
              </div>

              {importResults.map(r => (
                <div key={r.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 14px", background:"#0d1018", border:"1px solid #141926", borderRadius:6, marginBottom:8 }}>
                  <div>
                    <div style={{ fontSize:12, color:"#dde1ec" }}>{r.name}</div>
                    <div style={{ fontSize:10, color:"#5a6680", marginTop:2 }}>{r.team} · {r.position} · ID: {r.id}</div>
                  </div>
                  <button onClick={()=>linkAndImport(r)} className="btn" style={{ background:"#00d4ff", color:"#07090d", padding:"6px 14px", fontSize:10, letterSpacing:1, borderRadius:4, fontWeight:600 }}>
                    LINK & IMPORT
                  </button>
                </div>
              ))}

              {!canImport && (
                <div style={{ padding:20, background:"#0d1018", border:"1px solid #b347ff44", borderRadius:8, textAlign:"center" }}>
                  <div style={{ color:"#b347ff", fontSize:12, marginBottom:8 }}>PRO plan required for auto-import</div>
                  <button className="btn" style={{ background:"#b347ff", color:"#fff", padding:"8px 20px", fontSize:10, letterSpacing:1, borderRadius:4 }}>UPGRADE TO PRO</button>
                </div>
              )}

              <button onClick={()=>setView("profile")} className="btn" style={{ marginTop:16, background:"#0d1018", color:"#5a6680", padding:"10px 20px", border:"1px solid #141926", borderRadius:6, fontSize:11 }}>← BACK</button>
            </div>
          )}

          {/* ── EMPTY STATE ── */}
          {!player && view === "profile" && (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", flexDirection:"column", gap:10, color:"#3a4258" }}>
              <div style={{ fontFamily:"'Bebas Neue'", fontSize:52, letterSpacing:4 }}>FIRST LIGHT</div>
              <div style={{ fontSize:11 }}>Add a player to start tracking game openers</div>
              <button onClick={()=>setView("add-player")} className="btn" style={{ background:"#00d4ff", color:"#07090d", padding:"10px 24px", fontSize:10, letterSpacing:2, borderRadius:4, marginTop:8 }}>+ ADD PLAYER</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
