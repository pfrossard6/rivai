import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase";

// ─── Storage (Supabase) ────────────────────────────────────────────────────
const TK = "rivai_timer_v1";
const saveTimer = (sec, running, startedAt) => localStorage.setItem(TK, JSON.stringify({ sec, running, startedAt }));
const loadTimer = () => {
  try {
    const t = JSON.parse(localStorage.getItem(TK) || "{}");
    if (t.running && t.startedAt) {
      const elapsed = Math.floor((Date.now() - t.startedAt) / 1000);
      return { sec: (t.sec || 0) + elapsed, running: true, startedAt: Date.now() };
    }
    return { sec: t.sec || 0, running: false, startedAt: null };
  } catch { return { sec: 0, running: false, startedAt: null }; }
};

const getSession = () => localStorage.getItem("rivai_session");
const saveSession = e => localStorage.setItem("rivai_session", e);
const clearSession = () => localStorage.removeItem("rivai_session");

async function getUser(email) {
  const { data, error } = await supabase.from("users").select("*").eq("email", email).single();
  if (error) return null;
  return dbToUser(data);
}

async function saveUser(user) {
  const { error } = await supabase.from("users").upsert(userToDb(user), { onConflict: "email" });
  if (error) console.error("Erro ao salvar:", error.message);
}

function dbToUser(row) {
  return {
    email: row.email, password: row.password, name: row.name,
    xp: row.xp ?? 50, streak: row.streak ?? 0, lastStudy: row.last_study ?? null,
    achievements: row.achievements ?? ["welcome"],
    chatHistory: row.chat_history ?? [], completedMissions: row.completed_missions ?? [],
    completedTopics: row.completed_topics ?? [], notes: row.notes ?? [],
    quizHistory: row.quiz_history ?? [], profile: row.profile ?? null,
    course: row.course ?? null, settings: row.settings ?? { dailyGoal: 1 },
  };
}

function userToDb(user) {
  return {
    email: user.email, password: user.password, name: user.name,
    xp: user.xp, streak: user.streak, last_study: user.lastStudy,
    achievements: user.achievements, chat_history: user.chatHistory,
    completed_missions: user.completedMissions, completed_topics: user.completedTopics,
    notes: user.notes, quiz_history: user.quizHistory,
    profile: user.profile, course: user.course, settings: user.settings,
  };
}

// ─── Data ──────────────────────────────────────────────────────────────────
const GOALS = [
  { id: "productive", label: "Ser mais produtivo" },
  { id: "implement", label: "Implementar IA em empresas" },
  { id: "build", label: "Construir produtos com IA" },
  { id: "career", label: "Mudar de carreira" },
  { id: "automate", label: "Automatizar processos" },
  { id: "analyze", label: "Analisar dados" },
  { id: "communicate", label: "Comunicar melhor" },
  { id: "understand", label: "Entender IA profundamente" },
];
const AREAS = [
  { id: "operations", label: "Operações / Logística" }, { id: "business", label: "Gestão / Administração" },
  { id: "engineering", label: "Engenharia / Técnico" }, { id: "marketing", label: "Marketing / Comunicação" },
  { id: "sales", label: "Vendas / Comercial" }, { id: "education", label: "Educação / Pesquisa" },
  { id: "health", label: "Saúde / Bem-estar" }, { id: "finance", label: "Finanças / Contabilidade" },
  { id: "design", label: "Design / Criativo" }, { id: "hr", label: "RH / Pessoas" },
  { id: "law", label: "Direito / Compliance" }, { id: "other", label: "Outra área" },
];
const LEVELS = [
  { id: "never", label: "Nunca usei IA de verdade", icon: "🌱" },
  { id: "curious", label: "Usei algumas vezes", icon: "🔍" },
  { id: "regular", label: "Uso no dia a dia, básico", icon: "⚡" },
  { id: "intermediate", label: "Sei fazer bons prompts", icon: "🎯" },
  { id: "advanced", label: "Entendo APIs e automações", icon: "🚀" },
];
const TOOLS = [
  { id: "chatgpt", label: "ChatGPT" }, { id: "claude", label: "Claude" },
  { id: "gemini", label: "Gemini" }, { id: "midjourney", label: "Midjourney" },
  { id: "copilot", label: "GitHub Copilot" }, { id: "notion", label: "Notion AI" },
  { id: "zapier", label: "Zapier / Make" }, { id: "none", label: "Nenhuma ainda" },
];
const CHALLENGES = [
  { id: "time", label: "Falta de tempo" }, { id: "technical", label: "Dificuldade técnica" },
  { id: "trust", label: "Não sei confiar na IA" }, { id: "apply", label: "Não sei aplicar" },
  { id: "overwhelm", label: "Não sei por onde começar" }, { id: "cost", label: "Custo das ferramentas" },
  { id: "privacy", label: "Dúvidas de privacidade" }, { id: "team", label: "Resistência da equipe" },
];
const ACHIEVEMENTS = [
  { id: "welcome", icon: "🚀", title: "Decolagem", desc: "Criou sua conta", xp: 50, color: "#6c63ff" },
  { id: "profile", icon: "🧠", title: "Auto-conhecimento", desc: "Perfil completo", xp: 100, color: "#00d4aa" },
  { id: "first_study", icon: "📚", title: "Primeiro Estudo", desc: "Iniciou uma sessão", xp: 75, color: "#f59e0b" },
  { id: "streak_3", icon: "🔥", title: "Em Chamas", desc: "3 dias seguidos", xp: 200, color: "#ef4444" },
  { id: "streak_7", icon: "💥", title: "Imparável", desc: "7 dias seguidos", xp: 500, color: "#ef4444" },
  { id: "chat_5", icon: "💬", title: "Curioso", desc: "5 perguntas ao tutor", xp: 100, color: "#6c63ff" },
  { id: "quiz_5", icon: "🎯", title: "Quiz Master", desc: "5 quizzes completos", xp: 150, color: "#f59e0b" },
  { id: "notes_10", icon: "📓", title: "Anotador", desc: "10 anotações criadas", xp: 100, color: "#00d4aa" },
  { id: "progress_50", icon: "⭐", title: "Meio Caminho", desc: "50% da trilha concluída", xp: 300, color: "#f59e0b" },
  { id: "xp_2000", icon: "💎", title: "Diamante", desc: "2000 XP acumulados", xp: 500, color: "#00d4aa" },
];

// ─── Daily missions — now require explicit action ──────────────────────────
const DAILY_MISSIONS = [
  { id: "study_30", icon: "⏱️", title: "Sessão de 30min", desc: "Vá para Estudar e fique 30 min", xp: 50, tab: "study" },
  { id: "ask_tutor", icon: "💬", title: "Pergunte ao Tutor", desc: "Vá para o Tutor e faça uma pergunta", xp: 40, tab: "tutor" },
  { id: "do_quiz", icon: "🎯", title: "Quiz do Dia", desc: "Complete o quiz diário", xp: 60, tab: "quiz" },
  { id: "take_note", icon: "📓", title: "Faça uma Anotação", desc: "Crie uma anotação de estudo", xp: 30, tab: "notes" },
];

const getTodayStr = () => new Date().toDateString();
const getLevel = xp => {
  const lvl = Math.floor(xp / 500) + 1;
  const titles = ["", "Iniciante", "Explorador", "Praticante", "Especialista", "Mestre", "Lenda"];
  return { lvl, title: titles[Math.min(lvl, titles.length - 1)], pct: ((xp % 500) / 500) * 100 };
};
const newUser = (email, pw, name) => ({
  email, password: pw, name,
  profile: null, course: null,
  xp: 50, streak: 0, lastStudy: null,
  achievements: ["welcome"],
  chatHistory: [], completedMissions: [],
  completedTopics: [],
  notes: [],
  quizHistory: [],
  settings: { dailyGoal: 1, notifications: true },
});

// ─── Theme ─────────────────────────────────────────────────────────────────
const THEMES = {
  dark: {
    bg: "#080810", surface: "#0e0e1a", card: "#12121e", border: "#1e1e32",
    accent: "#6c63ff", accentLight: "#8b84ff", accentDim: "#6c63ff18", accentGlow: "#6c63ff40",
    green: "#00d4aa", greenDim: "#00d4aa18", amber: "#f59e0b", amberDim: "#f59e0b18",
    red: "#ef4444", redDim: "#ef444418",
    textPrimary: "#eeeeff", textSecondary: "#8888bb", textDim: "#3a3a5c",
    btnText: "#fff", navBg: "#0e0e1af0",
  },
  light: {
    bg: "#f0f7f4", surface: "#ffffff", card: "#ffffff", border: "#cce8df",
    accent: "#0a7c59", accentLight: "#0fa374", accentDim: "#0a7c5912", accentGlow: "#0a7c5930",
    green: "#0a7c59", greenDim: "#0a7c5912", amber: "#d97706", amberDim: "#d9770615",
    red: "#dc2626", redDim: "#dc262615",
    textPrimary: "#0d2b20", textSecondary: "#3d6b58", textDim: "#9bbcb0",
    btnText: "#fff", navBg: "#f0f7f4f0",
  },
};

// ─── API helpers ───────────────────────────────────────────────────────────
function extractJSON(text) {
  const strategies = [
    () => { const m = text.match(/```json\s*([\s\S]*?)\s*```/); return m ? m[1] : null; },
    () => { const m = text.match(/```\s*([\s\S]*?)\s*```/); return m ? m[1] : null; },
    () => { const m = text.match(/(\{[\s\S]*\})/); return m ? m[1] : null; },
    () => text.trim(),
  ];
  for (const s of strategies) {
    try { const candidate = s(); if (candidate) { JSON.parse(candidate); return candidate; } } catch {}
  }
  throw new Error("Não foi possível extrair JSON da resposta");
}

async function callAPI(messages, system, maxTokens = 1000) {
  const body = { model: "claude-sonnet-4-5", max_tokens: maxTokens, messages };
  if (system) body.system = system;
  const r = await fetch("/api/chat", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) { const err = await r.text(); throw new Error(`API ${r.status}: ${err.slice(0, 120)}`); }
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d.content?.find(b => b.type === "text")?.text || "";
}

async function generateCourse(profile) {
  const system = `Você é um especialista em educação de IA. Gere APENAS um objeto JSON válido, sem nenhum texto antes ou depois, sem markdown, sem blocos de código. Apenas o JSON puro começando com { e terminando com }.`;
  const content = `Crie um plano de estudos personalizado para:
- Nome: ${profile.name}
- Área: ${profile.areas.join(", ")}
- Nível: ${profile.level}
- Objetivos: ${profile.goals.join(", ")}
- Ferramentas: ${profile.tools.join(", ") || "nenhuma"}
- Desafios: ${profile.challenges.join(", ")}
- Horas/dia: ${profile.hours}h
- Contexto: ${profile.context || "não informado"}

Retorne este JSON exato (substitua os valores):
{"headline":"frase motivacional curta máx 8 palavras","overview":"2-3 frases específicas para este perfil","phases":[{"number":1,"title":"nome da fase","duration":"3 semanas","color":"violet","focus":"foco principal","days":[{"period":"dia 1-2","title":"título do tópico","description":"descrição concreta e específica para este perfil","tag":"prática"}]}],"first_prompt":"prompt detalhado que o aluno deve usar para começar o dia 1 com o tutor IA"}

Regras: 3 fases (fase1=violet, fase2=emerald, fase3=amber), 3-4 dias por fase, tags: prática/teoria/projeto/ferramenta/análise/automação, seja muito específico para o perfil real.`;

  const raw = await callAPI([{ role: "user", content }], system, 2500);
  return JSON.parse(extractJSON(raw));
}

async function askTutor(messages, profile) {
  const system = `Você é um tutor de IA especializado e personalizado. Estilo: direto, empolgante, didático mas descontraído.
Perfil: ${profile?.name}, área: ${profile?.areas?.join(", ")}, nível: ${profile?.level}, objetivos: ${profile?.goals?.join(", ")}, contexto: ${profile?.context || "não informado"}.
Regras: máx 4 parágrafos curtos, use exemplos concretos da área do aluno, seja específico nunca genérico, responda em português.`;
  return await callAPI(messages, system, 900);
}

async function generateQuiz(profile, course) {
  const system = `Você é um especialista em educação. Gere APENAS JSON válido, sem texto antes ou depois, sem markdown.`;
  const phase = course?.phases?.[0];
  const content = `Gere um quiz de 5 perguntas sobre IA para:
- Área: ${profile?.areas?.join(", ") || "geral"}
- Nível: ${profile?.level || "iniciante"}
- Fase atual do curso: ${phase?.title || "fundamentos"}
- Contexto: ${profile?.context || "não informado"}

JSON exato:
{"title":"título do quiz","questions":[{"q":"pergunta","options":["A) opção","B) opção","C) opção","D) opção"],"answer":0,"explanation":"explicação curta"}]}

answer é o índice da opção correta (0-3). 5 perguntas específicas para o perfil.`;

  const raw = await callAPI([{ role: "user", content }], system, 1200);
  return JSON.parse(extractJSON(raw));
}

// ─── Phase colors ──────────────────────────────────────────────────────────
const getPC = (c, T) => ({
  violet: { bg: T.accent + "18", border: T.accent + "44", text: T.accentLight || T.accent, dot: T.accent },
  emerald: { bg: T.green + "18", border: T.green + "44", text: T.green, dot: T.green },
  amber: { bg: T.amber + "18", border: T.amber + "44", text: T.amber, dot: T.amber },
}[c] || { bg: T.accent + "18", border: T.accent + "44", text: T.accent, dot: T.accent });

// ─── Shared UI ─────────────────────────────────────────────────────────────
function Card({ T, children, style = {}, glow, onClick }) {
  return (
    <div onClick={onClick} style={{ background: T.card, border: `1px solid ${glow ? T.accent + "55" : T.border}`, borderRadius: 18, padding: "18px", boxShadow: glow ? `0 0 20px ${T.accentGlow}` : (T.card === "#ffffff" ? "0 2px 10px #0001" : "none"), cursor: onClick ? "pointer" : "default", ...style }}>
      {children}
    </div>
  );
}

function BtnPrimary({ T, children, onClick, disabled, style = {} }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ padding: "13px 20px", background: disabled ? T.textDim : `linear-gradient(135deg, ${T.accent}, ${T.accentLight || T.green})`, color: T.btnText, border: "none", borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "'Nunito', sans-serif", transition: "all 0.2s", boxShadow: disabled ? "none" : `0 4px 16px ${T.accentGlow}`, width: "100%", ...style }}>
      {children}
    </button>
  );
}

function TInput({ T, placeholder, type = "text", value, onChange, style = {} }) {
  const [f, setF] = useState(false);
  return <input type={type} placeholder={placeholder} value={value} onChange={onChange} onFocus={() => setF(true)} onBlur={() => setF(false)} style={{ width: "100%", background: T.surface, border: `1px solid ${f ? T.accent : T.border}`, borderRadius: 11, color: T.textPrimary, fontFamily: "'Nunito', sans-serif", fontSize: 14, padding: "12px 14px", outline: "none", marginBottom: 12, transition: "border 0.2s", boxShadow: f ? `0 0 0 3px ${T.accentDim}` : "none", ...style }} />;
}

function Chip({ T, label, active, onClick, radio, icon }) {
  return (
    <div onClick={onClick} style={{ padding: "10px 13px", border: `1.5px solid ${active ? T.accent : T.border}`, borderRadius: 11, fontSize: 13, fontWeight: active ? 700 : 500, color: active ? T.textPrimary : T.textSecondary, background: active ? T.accentDim : "transparent", cursor: "pointer", transition: "all 0.15s", userSelect: "none", display: "flex", alignItems: "center", gap: 8, boxShadow: active ? `0 0 0 1px ${T.accent}` : "none" }}>
      {icon && <span>{icon}</span>}
      <span style={{ width: 16, height: 16, borderRadius: radio ? "50%" : 4, border: `2px solid ${active ? T.accent : T.textDim}`, background: active ? T.accent : "transparent", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 9, color: "#fff", transition: "all 0.15s" }}>{active ? (radio ? "●" : "✓") : ""}</span>
      {label}
    </div>
  );
}

// ─── App ───────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("login");
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState("");
  const [toasts, setToasts] = useState([]);
  const [xpPops, setXpPops] = useState([]);
  const [themeKey, setThemeKey] = useState(() => localStorage.getItem("aprendia_theme") || "dark");
  const T = THEMES[themeKey];

  const toggleTheme = () => { const n = themeKey === "dark" ? "light" : "dark"; setThemeKey(n); localStorage.setItem("aprendia_theme", n); };

  const addToast = useCallback((msg, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p.slice(-3), { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);

  const updateUser = useCallback(async (updated) => {
    await saveUser(updated);
    setUser(updated);
  }, []);

  const addXP = useCallback((amount, achievementId) => {
    setUser(prev => {
      if (!prev) return prev;
      const popId = Date.now() + Math.random();
      setXpPops(p => [...p, { id: popId, amount }]);
      setTimeout(() => setXpPops(p => p.filter(x => x.id !== popId)), 1600);
      const newXP = (prev.xp || 0) + amount;
      const newAch = [...(prev.achievements || [])];
      if (achievementId && !newAch.includes(achievementId)) {
        newAch.push(achievementId);
        const a = ACHIEVEMENTS.find(x => x.id === achievementId);
        if (a) setTimeout(() => addToast(`${a.icon} ${a.title} desbloqueada! +${a.xp} XP`, "achievement"), 400);
      }
      if (newXP >= 2000 && !newAch.includes("xp_2000")) { newAch.push("xp_2000"); setTimeout(() => addToast("💎 Diamante desbloqueada!", "achievement"), 700); }
      const updated = { ...prev, xp: newXP, achievements: newAch };
      saveUser(updated);
      return updated;
    });
  }, [addToast]);

  useEffect(() => {
    const email = getSession();
    if (email) { getUser(email).then(u => { if (u) { setUser(u); setScreen(u.course ? "dashboard" : "onboarding"); } }); }
  }, []);

  async function handleLogin(email, pw) {
    setAuthError("Entrando...");
    const u = await getUser(email);
    if (!u) { setAuthError("Usuário não encontrado."); return; }
    if (u.password !== pw) { setAuthError("Senha incorreta."); return; }
    saveSession(email); setUser(u); setScreen(u.course ? "dashboard" : "onboarding"); setAuthError("");
  }
  async function handleRegister(email, pw, name) {
    const existing = await getUser(email);
    if (existing) { setAuthError("E-mail já cadastrado."); return; }
    const nu = newUser(email, pw, name);
    await saveUser(nu); saveSession(email); setUser(nu); setScreen("onboarding"); setAuthError("");
    setTimeout(() => addToast("🚀 Bem-vindo! +50 XP", "achievement"), 600);
  }
  function handleProfileSaved(profile, course) {
    const updated = { ...user, profile, course, xp: (user.xp || 0) + 100, achievements: [...(user.achievements || []), "profile"] };
    updateUser(updated); setScreen("dashboard");
    setTimeout(() => addToast("✨ Curso gerado! +100 XP", "achievement"), 400);
  }

  const GS = `
    @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    body{background:${T.bg};color:${T.textPrimary};font-family:'Nunito',sans-serif;transition:background .3s,color .3s;}
    ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${T.border};border-radius:2px}
    @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
    @keyframes pop{0%{transform:scale(.85);opacity:0}70%{transform:scale(1.04)}100%{transform:scale(1);opacity:1}}
    @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
    @keyframes pulse{0%,100%{opacity:.4;transform:scale(.95)}50%{opacity:1;transform:scale(1.05)}}
    @keyframes bar{0%,100%{width:5%}50%{width:95%}}
    @keyframes toastIn{from{opacity:0;transform:translateX(60px)}to{opacity:1;transform:translateX(0)}}
    @keyframes xpPop{0%{opacity:0;transform:translateY(0) scale(.5)}30%{opacity:1;transform:translateY(-22px) scale(1.2)}100%{opacity:0;transform:translateY(-54px)}}
    @keyframes modalIn{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
    @keyframes overlayIn{from{opacity:0}to{opacity:1}}
  `;

  return (
    <>
      <style>{GS}</style>
      <div style={{ position: "fixed", bottom: 85, right: 16, zIndex: 9999, pointerEvents: "none" }}>
        {xpPops.map(p => <div key={p.id} style={{ fontSize: 15, fontWeight: 900, color: T.amber, animation: "xpPop 1.4s ease forwards", fontFamily: "'JetBrains Mono',monospace" }}>+{p.amount} XP</div>)}
      </div>
      <div style={{ position: "fixed", top: 12, right: 12, zIndex: 9998, display: "flex", flexDirection: "column", gap: 7 }}>
        {toasts.map(t => <div key={t.id} style={{ background: T.card, border: `1px solid ${t.type === "achievement" ? T.accent : T.green}`, borderRadius: 13, padding: "10px 15px", fontSize: 13, fontWeight: 700, color: T.textPrimary, animation: "toastIn .35s ease", boxShadow: `0 4px 20px ${T.accentGlow}`, maxWidth: 270 }}>{t.msg}</div>)}
      </div>
      {screen === "login" && <AuthScreen T={T} mode="login" onSubmit={handleLogin} onSwitch={() => { setAuthError(""); setScreen("register"); }} error={authError} setError={setAuthError} themeKey={themeKey} toggleTheme={toggleTheme} />}
      {screen === "register" && <AuthScreen T={T} mode="register" onSubmit={handleRegister} onSwitch={() => { setAuthError(""); setScreen("login"); }} error={authError} setError={setAuthError} themeKey={themeKey} toggleTheme={toggleTheme} />}
      {screen === "onboarding" && <OnboardingScreen T={T} user={user} onDone={handleProfileSaved} />}
      {screen === "dashboard" && <Dashboard T={T} user={user} updateUser={updateUser} addXP={addXP} addToast={addToast} onLogout={() => { clearSession(); setUser(null); setScreen("login"); }} onRestart={() => setScreen("onboarding")} themeKey={themeKey} toggleTheme={toggleTheme} />}
    </>
  );
}

// ─── Auth ──────────────────────────────────────────────────────────────────
function AuthScreen({ T, mode, onSubmit, onSwitch, error, setError, themeKey, toggleTheme }) {
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [pw, setPw] = useState("");
  const isLogin = mode === "login";
  function submit() { isLogin ? onSubmit(email, pw) : onSubmit(email, pw, name); }
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: T.bg, position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `radial-gradient(ellipse at 25% 25%, ${T.accent}12 0%, transparent 55%), radial-gradient(ellipse at 75% 75%, ${T.green}0e 0%, transparent 55%)`, pointerEvents: "none" }} />
      <button onClick={toggleTheme} style={{ position: "absolute", top: 16, right: 16, background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "7px 11px", cursor: "pointer", fontSize: 16 }}>{themeKey === "dark" ? "☀️" : "🌙"}</button>
      <div style={{ width: "100%", maxWidth: 400, animation: "fadeUp .5s ease" }}>
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 9, marginBottom: 5 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: `linear-gradient(135deg,${T.accent},${T.accentLight||T.green})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, animation: "float 3s ease-in-out infinite" }}>⬡</div>
            <span style={{ fontSize: 21, fontWeight: 900, color: T.textPrimary }}>Riv.<span style={{ color: T.accent }}>AI</span></span>
          </div>
          <p style={{ fontSize: 13, color: T.textSecondary }}>Seu tutor de IA personalizado</p>
        </div>
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 20, padding: "30px 26px", boxShadow: T.card === "#ffffff" ? "0 4px 24px #0002" : "none" }}>
          <h2 style={{ fontSize: 19, fontWeight: 800, color: T.textPrimary, marginBottom: 4 }}>{isLogin ? "Bem-vindo de volta 👋" : "Criar sua conta 🎯"}</h2>
          <p style={{ color: T.textSecondary, fontSize: 13, marginBottom: 20 }}>{isLogin ? "Continue sua jornada" : "Vamos montar seu curso personalizado"}</p>
          {!isLogin && <TInput T={T} placeholder="Seu nome" value={name} onChange={e => { setName(e.target.value); setError(""); }} />}
          <TInput T={T} placeholder="E-mail" type="email" value={email} onChange={e => { setEmail(e.target.value); setError(""); }} />
          <TInput T={T} placeholder="Senha" type="password" value={pw} onChange={e => { setPw(e.target.value); setError(""); }} />
          {error && <p style={{ color: T.red, fontSize: 13, marginBottom: 10 }}>{error}</p>}
          <BtnPrimary T={T} onClick={submit}>{isLogin ? "Entrar →" : "Criar conta grátis →"}</BtnPrimary>
          <p style={{ textAlign: "center", fontSize: 13, color: T.textSecondary, marginTop: 16, cursor: "pointer" }} onClick={onSwitch}>
            {isLogin ? "Novo por aqui? " : "Já tem conta? "}<span style={{ color: T.accent, fontWeight: 700 }}>{isLogin ? "Criar conta grátis" : "Entrar"}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Onboarding ────────────────────────────────────────────────────────────
function OnboardingScreen({ T, user, onDone }) {
  const [step, setStep] = useState(0);
  const [goals, setGoals] = useState([]); const [areas, setAreas] = useState([]);
  const [level, setLevel] = useState(""); const [tools, setTools] = useState([]);
  const [challenges, setChallenges] = useState([]); const [hours, setHours] = useState(1);
  const [context, setContext] = useState(""); const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState(""); const [err, setErr] = useState("");
  const TOTAL = 6;
  const toggle = (arr, set, id) => set(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const stepInfo = [
    { label: "Objetivos", q: "O que você quer alcançar com IA?" },
    { label: "Área", q: "Onde você atua profissionalmente?" },
    { label: "Nível", q: "Qual é sua experiência com IA?" },
    { label: "Ferramentas", q: "Quais ferramentas você já conhece?" },
    { label: "Desafios", q: "O que te trava com IA hoje?" },
    { label: "Detalhes", q: "Informações finais para personalizar" },
  ];

  async function finish() {
    setErr(""); setLoading(true);
    const msgs = ["Analisando seu perfil...", "Mapeando sua trilha ideal...", "Personalizando os módulos...", "Criando seu curso único..."];
    let i = 0; setLoadMsg(msgs[0]);
    const iv = setInterval(() => { i = (i + 1) % msgs.length; setLoadMsg(msgs[i]); }, 2000);
    const profile = {
      name: user?.name || "Estudante",
      goals: goals.map(g => GOALS.find(x => x.id === g)?.label || g),
      areas: areas.map(a => AREAS.find(x => x.id === a)?.label || a),
      level: LEVELS.find(l => l.id === level)?.label || level,
      tools: tools.map(t => TOOLS.find(x => x.id === t)?.label || t),
      challenges: challenges.map(c => CHALLENGES.find(x => x.id === c)?.label || c),
      hours, context,
    };
    try { const course = await generateCourse(profile); clearInterval(iv); onDone(profile, course); }
    catch (e) { clearInterval(iv); setLoading(false); setErr("Erro ao gerar curso: " + e.message + ". Tente novamente."); }
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: T.bg, gap: 18 }}>
      <div style={{ fontSize: 54, animation: "pulse 1.5s ease-in-out infinite" }}>⬡</div>
      <p style={{ fontSize: 17, fontWeight: 800, color: T.textPrimary }}>{loadMsg}</p>
      <p style={{ fontSize: 13, color: T.textSecondary }}>Criando algo único para você...</p>
      <div style={{ width: 220, height: 4, background: T.border, borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: 4, background: `linear-gradient(90deg,${T.accent},${T.green})`, borderRadius: 4, animation: "bar 2s ease-in-out infinite" }} />
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: T.bg, padding: "26px 18px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 30 }}>
          <span style={{ fontSize: 17, fontWeight: 900, color: T.textPrimary }}>Riv.<span style={{ color: T.accent }}>AI</span></span>
          <div style={{ flex: 1, display: "flex", gap: 3 }}>
            {Array.from({ length: TOTAL }).map((_, i) => <div key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: i <= step ? T.accent : T.border, transition: "background .3s" }} />)}
          </div>
          <span style={{ fontSize: 11, color: T.textDim, fontFamily: "'JetBrains Mono',monospace" }}>{step + 1}/{TOTAL}</span>
        </div>
        <div style={{ animation: "fadeUp .35s ease" }} key={step}>
          <p style={{ fontSize: 11, color: T.accent, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 4, fontFamily: "'JetBrains Mono',monospace" }}>{stepInfo[step].label}</p>
          <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 18, color: T.textPrimary }}>{stepInfo[step].q}</h2>
          {step === 0 && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 22 }}>{GOALS.map(g => <Chip key={g.id} T={T} label={g.label} active={goals.includes(g.id)} onClick={() => toggle(goals, setGoals, g.id)} />)}</div>}
          {step === 1 && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 22 }}>{AREAS.map(a => <Chip key={a.id} T={T} label={a.label} active={areas.includes(a.id)} onClick={() => toggle(areas, setAreas, a.id)} />)}</div>}
          {step === 2 && <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 22 }}>{LEVELS.map(l => <Chip key={l.id} T={T} label={l.label} icon={l.icon} active={level === l.id} onClick={() => setLevel(l.id)} radio />)}</div>}
          {step === 3 && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 22 }}>{TOOLS.map(t => <Chip key={t.id} T={T} label={t.label} active={tools.includes(t.id)} onClick={() => toggle(tools, setTools, t.id)} />)}</div>}
          {step === 4 && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 22 }}>{CHALLENGES.map(c => <Chip key={c.id} T={T} label={c.label} active={challenges.includes(c.id)} onClick={() => toggle(challenges, setChallenges, c.id)} />)}</div>}
          {step === 5 && <>
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary }}>Horas de estudo por dia</p>
                <span style={{ fontSize: 24, fontWeight: 900, color: T.accent, fontFamily: "'JetBrains Mono',monospace" }}>{hours}h</span>
              </div>
              <input type="range" min={1} max={5} step={1} value={hours} onChange={e => setHours(Number(e.target.value))} style={{ width: "100%", accentColor: T.accent, background: "transparent", border: "none", padding: 0, cursor: "pointer" }} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                {[1,2,3,4,5].map(h => <span key={h} style={{ fontSize: 11, color: hours === h ? T.accent : T.textDim, fontWeight: hours === h ? 800 : 400 }}>{h}h</span>)}
              </div>
            </div>
            <p style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary, marginBottom: 6 }}>Conte sobre você <span style={{ color: T.textDim, fontWeight: 500, fontSize: 13 }}>(opcional mas melhora muito)</span></p>
            <textarea rows={4} value={context} onChange={e => setContext(e.target.value)} placeholder="ex: trabalho com operações numa empresa de café, cuido de estoque e logística, tenho um projeto universitário chamado Produção 360..." style={{ width: "100%", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, color: T.textPrimary, fontFamily: "'Nunito',sans-serif", fontSize: 14, padding: "12px 14px", outline: "none", resize: "none", marginBottom: 4 }} onFocus={e => e.target.style.borderColor = T.accent} onBlur={e => e.target.style.borderColor = T.border} />
            {err && <p style={{ color: T.red, fontSize: 13, marginTop: 8, marginBottom: -4 }}>{err}</p>}
          </>}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            {step > 0 && <button onClick={() => setStep(s => s - 1)} style={{ padding: "13px 18px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 12, color: T.textSecondary, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito',sans-serif" }}>←</button>}
            <BtnPrimary T={T} disabled={step === 0 ? !goals.length : step === 1 ? !areas.length : step === 2 ? !level : false} style={{ flex: 1 }} onClick={step === 5 ? finish : () => setStep(s => s + 1)}>
              {step === 5 ? "✦ Gerar meu curso" : "Próximo →"}
            </BtnPrimary>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ─────────────────────────────────────────────────────────────
function Dashboard({ T, user, updateUser, addXP, addToast, onLogout, onRestart, themeKey, toggleTheme }) {
  const [tab, setTab] = useState("home");
  const [showProfile, setShowProfile] = useState(false);
  const navTo = useCallback(t => setTab(t), []);

  return (
    <div style={{ minHeight: "100vh", background: T.bg, paddingBottom: 70 }}>
      {/* Navbar */}
      <div style={{ background: T.navBg, borderBottom: `1px solid ${T.border}`, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(16px)" }}>
        <span style={{ fontSize: 16, fontWeight: 900, color: T.textPrimary }}>Riv.<span style={{ color: T.accent }}>AI</span></span>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
          {(() => { const { lvl, pct } = getLevel(user.xp || 0); return <>
            <div style={{ background: `linear-gradient(135deg,${T.accent},${T.accentLight||T.green})`, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 800, color: "#fff" }}>L{lvl}</div>
            <div style={{ flex: 1, height: 5, background: T.border, borderRadius: 4, overflow: "hidden", maxWidth: 160 }}>
              <div style={{ height: 5, background: `linear-gradient(90deg,${T.accent},${T.accentLight||T.green})`, width: pct + "%", borderRadius: 4, transition: "width .6s ease" }} />
            </div>
            <span style={{ fontSize: 11, color: T.amber, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", whiteSpace: "nowrap" }}>{user.xp || 0} XP</span>
          </>; })()}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {user.streak > 0 && <div style={{ display: "flex", alignItems: "center", gap: 3, background: T.redDim, border: `1px solid ${T.red}33`, borderRadius: 7, padding: "3px 8px" }}>
            <span>🔥</span><span style={{ fontSize: 12, fontWeight: 800, color: T.red }}>{user.streak}</span>
          </div>}
          <button onClick={toggleTheme} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 9, padding: "5px 9px", cursor: "pointer", fontSize: 14 }}>{themeKey === "dark" ? "☀️" : "🌙"}</button>
          <button onClick={() => setShowProfile(true)} style={{ width: 32, height: 32, borderRadius: 10, background: `linear-gradient(135deg,${T.accent},${T.accentLight||T.green})`, border: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "#fff", cursor: "pointer" }}>{(user.name || "?")[0].toUpperCase()}</button>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "18px 14px" }}>
        {tab === "home" && <HomeTab T={T} user={user} updateUser={updateUser} addXP={addXP} addToast={addToast} navTo={navTo} />}
        {tab === "study" && <StudyTab T={T} user={user} updateUser={updateUser} addXP={addXP} addToast={addToast} />}
        {tab === "trail" && <TrailTab T={T} user={user} updateUser={updateUser} addXP={addXP} addToast={addToast} />}
        {tab === "tutor" && <TutorTab T={T} user={user} updateUser={updateUser} addXP={addXP} addToast={addToast} />}
        {tab === "quiz" && <QuizTab T={T} user={user} updateUser={updateUser} addXP={addXP} addToast={addToast} />}
        {tab === "notes" && <NotesTab T={T} user={user} updateUser={updateUser} addXP={addXP} addToast={addToast} />}
        {tab === "rank" && <RankTab T={T} user={user} />}
      </div>

      {/* Bottom nav */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: T.navBg, borderTop: `1px solid ${T.border}`, display: "flex", zIndex: 100, backdropFilter: "blur(16px)" }}>
        {[
          { id: "home", icon: "🏠", label: "Início" },
          { id: "trail", icon: "🗺️", label: "Trilha" },
          { id: "study", icon: "⏱️", label: "Estudar" },
          { id: "tutor", icon: "⬡", label: "Tutor" },
          { id: "quiz", icon: "🎯", label: "Quiz" },
          { id: "notes", icon: "📓", label: "Notas" },
        ].map(item => (
          <button key={item.id} onClick={() => setTab(item.id)} style={{ flex: 1, padding: "8px 0 9px", background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, fontFamily: "'Nunito',sans-serif" }}>
            <span style={{ fontSize: 18, filter: tab === item.id ? "none" : "grayscale(80%) opacity(.45)", transform: tab === item.id ? "scale(1.16)" : "scale(1)", transition: "all .15s" }}>{item.icon}</span>
            <span style={{ fontSize: 9, fontWeight: tab === item.id ? 800 : 500, color: tab === item.id ? T.accent : T.textDim }}>{item.label}</span>
          </button>
        ))}
      </div>

      {showProfile && <ProfileModal T={T} user={user} updateUser={updateUser} onLogout={onLogout} onRestart={onRestart} addToast={addToast} onClose={() => setShowProfile(false)} />}
    </div>
  );
}

// ─── Profile Modal ─────────────────────────────────────────────────────────
function ProfileModal({ T, user, updateUser, onLogout, onRestart, addToast, onClose }) {
  const [name, setName] = useState(user.name || "");
  const [goal, setGoal] = useState(user.settings?.dailyGoal || 1);
  const { lvl, title, pct } = getLevel(user.xp || 0);

  function save() { updateUser({ ...user, name, settings: { ...(user.settings || {}), dailyGoal: goal } }); addToast("✓ Perfil atualizado!"); onClose(); }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ position: "absolute", inset: 0, background: "#000a", animation: "overlayIn .25s ease" }} onClick={onClose} />
      <div style={{ position: "relative", width: "100%", maxWidth: 520, background: T.card, border: `1px solid ${T.border}`, borderRadius: "20px 20px 0 0", padding: "24px 22px 32px", animation: "modalIn .3s ease", maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontWeight: 900, fontSize: 17, color: T.textPrimary }}>Meu Perfil</h3>
          <button onClick={onClose} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "5px 10px", cursor: "pointer", color: T.textSecondary, fontSize: 14, fontFamily: "'Nunito',sans-serif" }}>✕</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, padding: "14px", background: T.surface, borderRadius: 14, border: `1px solid ${T.border}` }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: `linear-gradient(135deg,${T.accent},${T.accentLight||T.green})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 900, color: "#fff", flexShrink: 0 }}>{(user.name || "?")[0].toUpperCase()}</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 800, fontSize: 15, color: T.textPrimary }}>{user.name}</p>
            <p style={{ fontSize: 12, color: T.accent, fontWeight: 700 }}>Nível {lvl} — {title}</p>
            <div style={{ height: 4, background: T.border, borderRadius: 4, marginTop: 6, overflow: "hidden" }}>
              <div style={{ height: 4, background: `linear-gradient(90deg,${T.accent},${T.accentLight||T.green})`, width: pct + "%" }} />
            </div>
            <p style={{ fontSize: 11, color: T.textDim, marginTop: 3 }}>{user.xp || 0} XP · {500 - ((user.xp || 0) % 500)} para o próx. nível</p>
          </div>
        </div>
        <p style={{ fontSize: 13, color: T.textSecondary, fontWeight: 700, marginBottom: 6 }}>Nome</p>
        <TInput T={T} placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} style={{ marginBottom: 14 }} />
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <p style={{ fontSize: 13, color: T.textSecondary, fontWeight: 700 }}>Meta diária</p>
          <span style={{ fontSize: 17, fontWeight: 900, color: T.accent, fontFamily: "'JetBrains Mono',monospace" }}>{goal}h</span>
        </div>
        <input type="range" min={1} max={5} step={1} value={goal} onChange={e => setGoal(Number(e.target.value))} style={{ width: "100%", accentColor: T.accent, background: "transparent", border: "none", padding: 0, cursor: "pointer", marginBottom: 18 }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 18 }}>
          {[{ l: "Streak", v: `${user.streak||0}🔥` }, { l: "Conquistas", v: `${(user.achievements||[]).length}/${ACHIEVEMENTS.length}` }, { l: "Notas", v: (user.notes||[]).length }].map(s => (
            <div key={s.l} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
              <p style={{ fontSize: 18, fontWeight: 900, color: T.accent, fontFamily: "'JetBrains Mono',monospace" }}>{s.v}</p>
              <p style={{ fontSize: 10, color: T.textDim, marginTop: 2 }}>{s.l}</p>
            </div>
          ))}
        </div>
        <BtnPrimary T={T} onClick={save} style={{ marginBottom: 10 }}>Salvar alterações</BtnPrimary>
        <button onClick={onRestart} style={{ width: "100%", padding: "12px", background: T.accentDim, border: `1px solid ${T.accent}33`, borderRadius: 12, color: T.accent, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito',sans-serif", marginBottom: 8 }}>🔄 Gerar novo curso</button>
        <button onClick={onLogout} style={{ width: "100%", padding: "12px", background: T.redDim, border: `1px solid ${T.red}33`, borderRadius: 12, color: T.red, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito',sans-serif" }}>Sair da conta</button>
        <div style={{ marginTop: 14, padding: "12px 14px", background: T.accentDim, border: `1px solid ${T.accent}22`, borderRadius: 12, textAlign: "center" }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: T.accent, marginBottom: 3 }}>📱 Instalar como app</p>
          <p style={{ fontSize: 11, color: T.textSecondary, lineHeight: 1.5 }}>Android: menu ⋮ → "Adicionar à tela inicial" · iPhone: compartilhar → "Adicionar à Tela de Início"</p>
        </div>
      </div>
    </div>
  );
}

// ─── Home Tab ──────────────────────────────────────────────────────────────
function HomeTab({ T, user, updateUser, addXP, addToast, navTo }) {
  const completedMissions = user.completedMissions || [];

  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      <h1 style={{ fontSize: 21, fontWeight: 900, color: T.textPrimary, marginBottom: 3 }}>Olá, {user.name?.split(" ")[0]}! 👋</h1>
      {user.course && <p style={{ color: T.textSecondary, fontSize: 13, marginBottom: 18 }}>{user.course.headline}</p>}

      {/* Quick stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
        {[
          { l: "Streak", v: `${user.streak||0}🔥`, c: T.red },
          { l: "XP Total", v: user.xp||0, c: T.amber },
          { l: "Conquistas", v: `${(user.achievements||[]).length}🏆`, c: T.accent }
        ].map(st => (
          <Card T={T} key={st.l} style={{ textAlign: "center", padding: "12px 8px" }}>
            <p style={{ fontSize: 19, fontWeight: 900, color: st.c, fontFamily: "'JetBrains Mono',monospace" }}>{st.v}</p>
            <p style={{ fontSize: 10, color: T.textDim, marginTop: 2 }}>{st.l}</p>
          </Card>
        ))}
      </div>

      {/* Missions */}
      <Card T={T} style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ fontWeight: 800, fontSize: 14, color: T.textPrimary }}>⚡ Missões do dia</h3>
          <span style={{ fontSize: 11, color: T.textDim, fontFamily: "'JetBrains Mono',monospace" }}>{DAILY_MISSIONS.filter(m => completedMissions.includes(m.id + "_" + getTodayStr())).length}/{DAILY_MISSIONS.length}</span>
        </div>
        {DAILY_MISSIONS.map(mission => {
          const isDone = completedMissions.includes(mission.id + "_" + getTodayStr());
          return (
            <div key={mission.id} onClick={() => !isDone && navTo(mission.tab)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: isDone ? T.greenDim : T.surface, border: `1px solid ${isDone ? T.green + "33" : T.border}`, borderRadius: 11, marginBottom: 7, transition: "all .2s", cursor: isDone ? "default" : "pointer" }}>
              <span style={{ fontSize: 17, filter: isDone ? "none" : "grayscale(50%)" }}>{mission.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: 13, color: isDone ? T.green : T.textPrimary, textDecoration: isDone ? "line-through" : "none" }}>{mission.title}</p>
                <p style={{ fontSize: 11, color: T.textDim }}>{mission.desc}</p>
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, color: T.amber, fontFamily: "'JetBrains Mono',monospace" }}>+{mission.xp}</span>
              <span style={{ fontSize: 13, color: isDone ? T.green : T.textDim }}>{isDone ? "✓" : "→"}</span>
            </div>
          );
        })}
      </Card>

      {/* Quick nav */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {[{ id: "study", icon: "⏱️", label: "Estudar" }, { id: "trail", icon: "🗺️", label: "Trilha" }, { id: "tutor", icon: "⬡", label: "Tutor" }].map(item => (
          <Card T={T} key={item.id} style={{ padding: "14px 10px", textAlign: "center" }} onClick={() => navTo(item.id)}>
            <div style={{ fontSize: 24, marginBottom: 5 }}>{item.icon}</div>
            <p style={{ fontWeight: 800, fontSize: 13, color: T.textPrimary }}>{item.label}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Study Tab (timer moved here) ──────────────────────────────────────────
function StudyTab({ T, user, updateUser, addXP, addToast }) {
  const timerState = useRef(loadTimer());
  const [timerSec, setTimerSec] = useState(timerState.current.sec);
  const [running, setRunning] = useState(timerState.current.running);
  const startedAtRef = useRef(timerState.current.running ? Date.now() : null);
  const ivRef = useRef(null);
  const goalSec = (user.settings?.dailyGoal || 1) * 3600;
  const completedMissions = user.completedMissions || [];

  useEffect(() => {
    if (running) {
      if (!startedAtRef.current) startedAtRef.current = Date.now();
      ivRef.current = setInterval(() => {
        setTimerSec(s => {
          const n = s + 1;
          saveTimer(n, true, startedAtRef.current);
          // Auto-complete study mission at 30 min
          if (n === 1800) {
            const key = "study_30_" + getTodayStr();
            if (!completedMissions.includes(key)) {
              const newMissions = [...completedMissions, key];
              updateUser({ ...user, completedMissions: newMissions });
              addXP(50);
              addToast("⏱️ 30 minutos de estudo! +50 XP", "achievement");
            }
          }
          return n;
        });
      }, 1000);
    } else {
      clearInterval(ivRef.current);
      saveTimer(timerSec, false, null);
      startedAtRef.current = null;
    }
    return () => clearInterval(ivRef.current);
  }, [running]);

  function handleStart() {
    if (!running && timerSec === 0) {
      addXP(10, "first_study");
      const today = getTodayStr();
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      if (user.lastStudy !== today) {
        let streak = user.lastStudy === yesterday ? (user.streak || 0) + 1 : 1;
        const newAch = [...(user.achievements || [])];
        if (streak >= 3 && !newAch.includes("streak_3")) newAch.push("streak_3");
        if (streak >= 7 && !newAch.includes("streak_7")) newAch.push("streak_7");
        updateUser({ ...user, streak, lastStudy: today, achievements: newAch });
        addToast(`🔥 Streak: ${streak} dias!`);
      }
    }
    startedAtRef.current = Date.now();
    setRunning(r => !r);
  }

  function resetTimer() { setRunning(false); setTimerSec(0); saveTimer(0, false, null); startedAtRef.current = null; }

  const pad = n => String(n).padStart(2, "0");
  const h = Math.floor(timerSec / 3600), m = Math.floor((timerSec % 3600) / 60), s = timerSec % 60;
  const pct = Math.min(100, (timerSec / goalSec) * 100);
  const done = timerSec >= goalSec;

  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      <h2 style={{ fontSize: 20, fontWeight: 900, color: T.textPrimary, marginBottom: 4 }}>Sessão de Estudo ⏱️</h2>
      <p style={{ color: T.textSecondary, fontSize: 13, marginBottom: 18 }}>Inicie o timer e estude com foco. Ao completar 30 min, sua missão é marcada automaticamente!</p>

      <Card T={T} style={{ marginBottom: 16, textAlign: "center", background: done ? T.greenDim : T.card, border: `1px solid ${done ? T.green + "44" : T.border}` }}>
        <p style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 12, fontFamily: "'JetBrains Mono',monospace" }}>tempo de hoje</p>
        <div style={{ fontSize: 56, fontWeight: 900, fontFamily: "'JetBrains Mono',monospace", color: done ? T.green : T.textPrimary, marginBottom: 8 }}>{pad(h)}:{pad(m)}:{pad(s)}</div>
        <div style={{ height: 6, background: T.border, borderRadius: 6, marginBottom: 8, overflow: "hidden" }}>
          <div style={{ height: 6, background: done ? `linear-gradient(90deg,${T.green},#00ffcc)` : `linear-gradient(90deg,${T.accent},${T.accentLight||T.green})`, width: pct + "%", borderRadius: 6, transition: "width 1s linear" }} />
        </div>
        <p style={{ fontSize: 13, color: T.textDim, marginBottom: 20 }}>{done ? "🎉 Meta diária concluída!" : `Meta: ${user.settings?.dailyGoal || 1}h — faltam ${Math.max(0, Math.floor((goalSec - timerSec) / 60))}min`}</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <BtnPrimary T={T} style={{ width: "auto", padding: "13px 32px" }} onClick={handleStart}>{running ? "⏸ Pausar" : "▶ Iniciar"}</BtnPrimary>
          {timerSec > 0 && <button onClick={resetTimer} style={{ padding: "13px 16px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 12, color: T.textSecondary, fontSize: 16, cursor: "pointer", fontFamily: "'Nunito',sans-serif" }}>↺</button>}
        </div>
      </Card>

      <Card T={T}>
        <p style={{ fontWeight: 800, fontSize: 14, color: T.textPrimary, marginBottom: 8 }}>💡 Dicas para estudar melhor</p>
        {["Use o Tutor para tirar dúvidas enquanto estuda", "Faça anotações do que aprender para fixar melhor", "Complete o quiz ao final da sessão", "Copie os tópicos da Trilha e cole no Tutor para aprender"].map((tip, i) => (
          <p key={i} style={{ fontSize: 13, color: T.textSecondary, padding: "8px 0", borderBottom: i < 3 ? `1px solid ${T.border}` : "none" }}>→ {tip}</p>
        ))}
      </Card>
    </div>
  );
}

// ─── Trail Tab ─────────────────────────────────────────────────────────────
function TrailTab({ T, user, updateUser, addXP, addToast }) {
  const [openPhase, setOpenPhase] = useState(0);
  const [copied, setCopied] = useState(false);
  const course = user.course;
  const completedTopics = user.completedTopics || [];

  function toggleTopic(phaseIdx, dayIdx) {
    const key = `${phaseIdx}_${dayIdx}`;
    const newCompleted = completedTopics.includes(key) ? completedTopics.filter(k => k !== key) : [...completedTopics, key];
    updateUser({ ...user, completedTopics: newCompleted });
    if (!completedTopics.includes(key)) { addXP(20); addToast("✓ Tópico concluído! +20 XP"); }
    const totalTopics = course?.phases?.reduce((s, p) => s + (p.days?.length || 0), 0) || 1;
    if (newCompleted.length >= Math.floor(totalTopics / 2) && !(user.achievements || []).includes("progress_50")) addXP(300, "progress_50");
  }

  if (!course) return <div style={{ textAlign: "center", padding: 40, color: T.textSecondary }}>Nenhum curso encontrado.</div>;

  const totalTopics = course.phases?.reduce((s, p) => s + (p.days?.length || 0), 0) || 1;
  const progressPct = Math.round((completedTopics.length / totalTopics) * 100);

  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 5 }}>
        <h2 style={{ fontSize: 20, fontWeight: 900, color: T.textPrimary }}>Sua trilha 🗺️</h2>
        <span style={{ fontSize: 13, fontWeight: 800, color: T.accent }}>{progressPct}%</span>
      </div>
      <div style={{ height: 5, background: T.border, borderRadius: 4, marginBottom: 6, overflow: "hidden" }}>
        <div style={{ height: 5, background: `linear-gradient(90deg,${T.accent},${T.green})`, width: progressPct + "%", borderRadius: 4, transition: "width .5s ease" }} />
      </div>
      <p style={{ color: T.textSecondary, fontSize: 13, marginBottom: 8, lineHeight: 1.6 }}>{course.overview}</p>
      <p style={{ color: T.accent, fontSize: 12, fontWeight: 700, marginBottom: 18 }}>💡 Clique em qualquer tópico e cole no Tutor para estudar!</p>

      <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 18, overflowX: "auto", paddingBottom: 4 }}>
        {course.phases?.map((phase, pi) => {
          const col = getPC(phase.color, T);
          return (
            <div key={pi} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
              <div onClick={() => setOpenPhase(pi)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer", padding: "0 8px" }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: openPhase === pi ? col.bg : T.surface, border: `2px solid ${openPhase === pi ? col.dot : T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 900, color: col.text, transition: "all .2s", boxShadow: openPhase === pi ? `0 0 16px ${col.dot}44` : "none" }}>{pi + 1}</div>
                <p style={{ fontSize: 10, fontWeight: 700, color: openPhase === pi ? col.text : T.textDim, textAlign: "center", maxWidth: 66, lineHeight: 1.3 }}>{phase.title}</p>
                <p style={{ fontSize: 9, color: T.textDim }}>{phase.duration}</p>
              </div>
              {pi < course.phases.length - 1 && <div style={{ width: 24, height: 2, background: T.border, flexShrink: 0, marginBottom: 26 }} />}
            </div>
          );
        })}
      </div>

      {course.phases?.map((phase, pi) => {
        const col = getPC(phase.color, T);
        if (openPhase !== pi) return null;
        return (
          <Card T={T} key={pi} style={{ marginBottom: 12, border: `1px solid ${col.border}`, animation: "pop .3s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: col.bg, border: `1px solid ${col.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: col.text }}>{pi + 1}</div>
              <div><p style={{ fontWeight: 800, fontSize: 15, color: T.textPrimary }}>{phase.title}</p><p style={{ fontSize: 11, color: T.textDim }}>{phase.duration} · {phase.focus}</p></div>
            </div>
            {phase.days?.map((day, di) => {
              const key = `${pi}_${di}`;
              const done = completedTopics.includes(key);
              return (
                <div key={di} style={{ display: "flex", gap: 12, padding: "12px 0", borderTop: `1px solid ${T.border}`, opacity: done ? 0.7 : 1, transition: "opacity .2s" }}>
                  <div style={{ minWidth: 52, fontSize: 10, fontWeight: 700, color: col.text, paddingTop: 2, fontFamily: "'JetBrains Mono',monospace" }}>{day.period}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: 14, color: T.textPrimary, marginBottom: 4, textDecoration: done ? "line-through" : "none" }}>{day.title}</p>
                    <p style={{ fontSize: 13, color: T.textSecondary, marginBottom: 7, lineHeight: 1.6 }}>{day.description}</p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, background: col.bg, color: col.text, padding: "2px 9px", borderRadius: 5, border: `1px solid ${col.border}`, fontWeight: 700 }}>{day.tag}</span>
                      <button onClick={() => { navigator.clipboard?.writeText(`Quero aprender sobre: ${day.title}. ${day.description}`); addToast("✓ Copiado! Cole no Tutor."); }} style={{ fontSize: 11, background: T.accentDim, color: T.accent, padding: "2px 9px", borderRadius: 5, border: `1px solid ${T.accent}33`, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito',sans-serif" }}>📋 Copiar para Tutor</button>
                    </div>
                  </div>
                  <button onClick={() => toggleTopic(pi, di)} style={{ width: 28, height: 28, borderRadius: 8, border: `2px solid ${done ? T.green : T.border}`, background: done ? T.green : "transparent", color: done ? "#fff" : T.textDim, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .2s", fontFamily: "'Nunito',sans-serif", marginTop: 2 }}>{done ? "✓" : "○"}</button>
                </div>
              );
            })}
          </Card>
        );
      })}

      {course.first_prompt && (
        <Card T={T} glow style={{ marginTop: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: T.accent, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".08em", fontFamily: "'JetBrains Mono',monospace" }}>✦ Prompt do dia 1</p>
          <p style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.7, fontStyle: "italic", marginBottom: 12 }}>"{course.first_prompt}"</p>
          <BtnPrimary T={T} style={{ width: "auto", padding: "10px 18px", fontSize: 13 }} onClick={() => { navigator.clipboard?.writeText(course.first_prompt); setCopied(true); addXP(5); setTimeout(() => setCopied(false), 2000); }}>{copied ? "✓ Copiado!" : "Copiar prompt"}</BtnPrimary>
        </Card>
      )}
    </div>
  );
}

// ─── Tutor Tab ─────────────────────────────────────────────────────────────
function TutorTab({ T, user, updateUser, addXP, addToast }) {
  const [msgs, setMsgs] = useState(user.chatHistory || []);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  async function send(text) {
    const msg = text || input;
    if (!msg.trim() || loading) return;
    const userMsg = { role: "user", content: msg };
    const newMsgs = [...msgs, userMsg];
    setMsgs(newMsgs); setInput(""); setLoading(true);
    try {
      const reply = await askTutor(newMsgs.map(m => ({ role: m.role, content: m.content })), user.profile || {});
      const final = [...newMsgs, { role: "assistant", content: reply }];
      setMsgs(final); updateUser({ ...user, chatHistory: final });
      addXP(8);
      const count = final.filter(m => m.role === "user").length;
      if (count === 1) {
        // Mark ask_tutor mission
        const key = "ask_tutor_" + getTodayStr();
        if (!(user.completedMissions || []).includes(key)) {
          updateUser({ ...user, chatHistory: final, completedMissions: [...(user.completedMissions || []), key] });
          addXP(40);
          addToast("💬 Missão completa! +40 XP", "achievement");
        }
      }
      if (count === 5) addXP(100, "chat_5");
    } catch (e) { addToast("Erro ao conectar com o tutor: " + e.message, "error"); }
    finally { setLoading(false); }
  }

  const suggestions = ["Como fazer um bom prompt?", "O que é automação com IA?", "Como aplicar IA no meu trabalho?"];

  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: `linear-gradient(135deg,${T.accent},${T.accentLight||T.green})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, boxShadow: `0 0 16px ${T.accentGlow}` }}>⬡</div>
        <div><h2 style={{ fontWeight: 900, fontSize: 16, color: T.textPrimary }}>Tutor Personalizado</h2><p style={{ fontSize: 11, color: T.green }}>● especializado no seu perfil</p></div>
      </div>
      <Card T={T} style={{ marginBottom: 10 }}>
        <div style={{ height: 380, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
          {msgs.length === 0 && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 20 }}>
              <div style={{ fontSize: 42, animation: "float 3s ease-in-out infinite" }}>⬡</div>
              <p style={{ fontWeight: 800, fontSize: 15, color: T.textPrimary }}>Pronto para aprender!</p>
              <p style={{ color: T.textSecondary, fontSize: 13, textAlign: "center", lineHeight: 1.6 }}>Pergunte qualquer coisa sobre IA. Sou especializado no seu perfil.</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, justifyContent: "center", marginTop: 6 }}>
                {suggestions.map(s => <button key={s} onClick={() => send(s)} style={{ padding: "7px 12px", background: T.accentDim, border: `1px solid ${T.accent}33`, borderRadius: 18, color: T.accent, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito',sans-serif" }}>{s}</button>)}
              </div>
            </div>
          )}
          {msgs.map((msg, i) => (
            <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", animation: "fadeUp .25s ease" }}>
              {msg.role === "assistant" && <div style={{ width: 24, height: 24, borderRadius: 7, background: `linear-gradient(135deg,${T.accent},${T.accentLight||T.green})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0, marginRight: 7, marginTop: 2 }}>⬡</div>}
              <div style={{ maxWidth: "82%", padding: "10px 14px", borderRadius: msg.role === "user" ? "15px 15px 4px 15px" : "15px 15px 15px 4px", background: msg.role === "user" ? `linear-gradient(135deg,${T.accent},${T.accentLight||T.green})` : T.surface, border: msg.role === "user" ? "none" : `1px solid ${T.border}`, fontSize: 13, lineHeight: 1.7, color: msg.role === "user" ? "#fff" : T.textPrimary, fontWeight: msg.role === "user" ? 600 : 400, whiteSpace: "pre-wrap" }}>{msg.content}</div>
            </div>
          ))}
          {loading && <div style={{ display: "flex", gap: 5, padding: "10px 14px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: "15px 15px 15px 4px", width: "fit-content", marginLeft: 31 }}>
            {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: T.accent, animation: `pulse 1s ease-in-out ${i * .15}s infinite` }} />)}
          </div>}
          <div ref={endRef} />
        </div>
      </Card>
      <div style={{ display: "flex", gap: 8 }}>
        <input placeholder="Pergunte ao seu tutor..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()} style={{ flex: 1, background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, color: T.textPrimary, fontFamily: "'Nunito',sans-serif", fontSize: 14, padding: "12px 14px", outline: "none" }} onFocus={e => e.target.style.borderColor = T.accent} onBlur={e => e.target.style.borderColor = T.border} />
        <BtnPrimary T={T} style={{ width: 48, padding: 0, fontSize: 17, borderRadius: 12, flexShrink: 0 }} onClick={() => send()} disabled={loading}>→</BtnPrimary>
      </div>
    </div>
  );
}

// ─── Quiz Tab ──────────────────────────────────────────────────────────────
function QuizTab({ T, user, updateUser, addXP, addToast }) {
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [err, setErr] = useState("");

  async function startQuiz() {
    setLoading(true); setErr("");
    try {
      const q = await generateQuiz(user.profile, user.course);
      setQuiz(q); setCurrent(0); setSelected(null); setAnswered(false); setScore(0); setFinished(false);
    } catch (e) { setErr("Erro ao gerar quiz: " + e.message); }
    finally { setLoading(false); }
  }

  function answer(idx) {
    if (answered) return;
    setSelected(idx); setAnswered(true);
    if (idx === quiz.questions[current].answer) setScore(s => s + 1);
  }

  function next() {
    if (current + 1 >= quiz.questions.length) {
      setFinished(true);
      const xpGained = score * 20 + 30;
      addXP(xpGained);
      const history = [...(user.quizHistory || []), { date: getTodayStr(), score, total: quiz.questions.length, xp: xpGained }];
      // Mark quiz mission
      const key = "do_quiz_" + getTodayStr();
      const newMissions = (user.completedMissions || []).includes(key) ? user.completedMissions : [...(user.completedMissions || []), key];
      updateUser({ ...user, quizHistory: history, completedMissions: newMissions });
      addToast(`🎯 Quiz completo! ${score}/${quiz.questions.length} · +${xpGained} XP`);
      if (!( user.completedMissions || []).includes(key)) addXP(60);
      const totalQuizzes = history.length;
      if (totalQuizzes >= 5) addXP(150, "quiz_5");
    } else {
      setCurrent(c => c + 1); setSelected(null); setAnswered(false);
    }
  }

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 16 }}>
      <div style={{ fontSize: 40, animation: "pulse 1.2s ease-in-out infinite" }}>🎯</div>
      <p style={{ fontWeight: 800, color: T.textPrimary }}>Gerando quiz personalizado...</p>
    </div>
  );

  if (!quiz) return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      <h2 style={{ fontSize: 20, fontWeight: 900, color: T.textPrimary, marginBottom: 5 }}>Quiz Diário 🎯</h2>
      <p style={{ color: T.textSecondary, fontSize: 13, marginBottom: 20 }}>Perguntas geradas por IA, personalizadas para o seu perfil e trilha.</p>
      <Card T={T} style={{ textAlign: "center", padding: "32px 20px", marginBottom: 16 }}>
        <div style={{ fontSize: 52, marginBottom: 14 }}>🎯</div>
        <p style={{ fontWeight: 800, fontSize: 18, color: T.textPrimary, marginBottom: 8 }}>Pronto para ser testado?</p>
        <p style={{ color: T.textSecondary, fontSize: 13, marginBottom: 20 }}>5 perguntas baseadas na sua trilha e área de atuação.</p>
        <BtnPrimary T={T} style={{ width: "auto", padding: "13px 32px" }} onClick={startQuiz}>Começar Quiz →</BtnPrimary>
        {err && <p style={{ color: T.red, fontSize: 13, marginTop: 12 }}>{err}</p>}
      </Card>
      {user.quizHistory?.length > 0 && (
        <Card T={T}>
          <p style={{ fontWeight: 800, fontSize: 14, color: T.textPrimary, marginBottom: 10 }}>Histórico</p>
          {user.quizHistory.slice(-5).reverse().map((q, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${T.border}` }}>
              <span style={{ fontSize: 13, color: T.textSecondary }}>{q.date}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: q.score >= q.total * 0.8 ? T.green : q.score >= q.total * 0.5 ? T.amber : T.red }}>{q.score}/{q.total} · +{q.xp} XP</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );

  if (finished) return (
    <div style={{ animation: "fadeUp .4s ease", textAlign: "center" }}>
      <Card T={T} style={{ padding: "36px 24px", marginBottom: 16 }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>{score === quiz.questions.length ? "🏆" : score >= quiz.questions.length * 0.6 ? "⭐" : "💪"}</div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: T.textPrimary, marginBottom: 6 }}>{score === quiz.questions.length ? "Perfeito!" : score >= quiz.questions.length * 0.6 ? "Muito bem!" : "Continue praticando!"}</h2>
        <p style={{ fontSize: 32, fontWeight: 900, color: T.accent, marginBottom: 4, fontFamily: "'JetBrains Mono',monospace" }}>{score}/{quiz.questions.length}</p>
        <p style={{ color: T.textSecondary, fontSize: 14, marginBottom: 20 }}>+{score * 20 + 30} XP ganhos</p>
        <BtnPrimary T={T} onClick={startQuiz}>Novo Quiz →</BtnPrimary>
      </Card>
    </div>
  );

  const q = quiz.questions[current];
  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ fontSize: 16, fontWeight: 900, color: T.textPrimary }}>{quiz.title}</h2>
        <span style={{ fontSize: 12, color: T.textDim, fontFamily: "'JetBrains Mono',monospace" }}>{current + 1}/{quiz.questions.length}</span>
      </div>
      <div style={{ height: 4, background: T.border, borderRadius: 4, marginBottom: 18, overflow: "hidden" }}>
        <div style={{ height: 4, background: T.accent, width: ((current / quiz.questions.length) * 100) + "%", borderRadius: 4, transition: "width .4s ease" }} />
      </div>
      <Card T={T} style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: T.textPrimary, lineHeight: 1.5 }}>{q.q}</p>
      </Card>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
        {q.options.map((opt, i) => {
          const isCorrect = i === q.answer;
          const isSelected = i === selected;
          let bg = T.surface, border = T.border, color = T.textPrimary;
          if (answered) {
            if (isCorrect) { bg = T.greenDim; border = T.green + "44"; color = T.green; }
            else if (isSelected) { bg = T.redDim; border = T.red + "44"; color = T.red; }
          } else if (isSelected) { bg = T.accentDim; border = T.accent; }
          return (
            <div key={i} onClick={() => answer(i)} style={{ padding: "13px 15px", background: bg, border: `1.5px solid ${border}`, borderRadius: 12, fontSize: 14, fontWeight: 500, color, cursor: answered ? "default" : "pointer", transition: "all .15s", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{answered && isCorrect ? "✓" : answered && isSelected ? "✗" : String.fromCharCode(65 + i)}</span>
              {opt}
            </div>
          );
        })}
      </div>
      {answered && (
        <Card T={T} style={{ marginBottom: 12, background: T.greenDim, border: `1px solid ${T.green}33` }}>
          <p style={{ fontSize: 13, color: T.textPrimary, lineHeight: 1.6 }}><span style={{ fontWeight: 800, color: T.green }}>💡 </span>{q.explanation}</p>
        </Card>
      )}
      {answered && <BtnPrimary T={T} onClick={next}>{current + 1 >= quiz.questions.length ? "Ver resultado →" : "Próxima pergunta →"}</BtnPrimary>}
    </div>
  );
}

// ─── Notes Tab ─────────────────────────────────────────────────────────────
function NotesTab({ T, user, updateUser, addXP, addToast }) {
  const [notes, setNotes] = useState(user.notes || []);
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [editing, setEditing] = useState(null);
  const [view, setView] = useState("list");

  function saveNote() {
    if (!text.trim()) return;
    const note = { id: Date.now(), title: title || "Sem título", text, date: new Date().toLocaleDateString("pt-BR"), time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) };
    let newNotes;
    if (editing !== null) {
      newNotes = notes.map(n => n.id === editing ? { ...n, title: note.title, text: note.text } : n);
    } else {
      newNotes = [note, ...notes];
      addXP(15); addToast("📓 Anotação salva! +15 XP");
      // Mark notes mission
      const key = "take_note_" + getTodayStr();
      if (!(user.completedMissions || []).includes(key)) {
        updateUser({ ...user, notes: newNotes, completedMissions: [...(user.completedMissions || []), key] });
        addXP(30);
        addToast("📓 Missão completa! +30 XP", "achievement");
        if (newNotes.length >= 10) addXP(100, "notes_10");
        setText(""); setTitle(""); setEditing(null); setView("list");
        return;
      }
      if (newNotes.length >= 10) addXP(100, "notes_10");
    }
    setNotes(newNotes); updateUser({ ...user, notes: newNotes });
    setText(""); setTitle(""); setEditing(null); setView("list");
  }

  function deleteNote(id) { const n = notes.filter(x => x.id !== id); setNotes(n); updateUser({ ...user, notes: n }); }

  if (view === "new" || editing !== null) {
    const editNote = editing !== null ? notes.find(n => n.id === editing) : null;
    return (
      <div style={{ animation: "fadeUp .4s ease" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <button onClick={() => { setView("list"); setEditing(null); setText(""); setTitle(""); }} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 9, padding: "7px 12px", cursor: "pointer", color: T.textSecondary, fontSize: 13, fontFamily: "'Nunito',sans-serif" }}>← Voltar</button>
          <h2 style={{ fontSize: 16, fontWeight: 900, color: T.textPrimary }}>{editing !== null ? "Editar nota" : "Nova anotação"}</h2>
        </div>
        <TInput T={T} placeholder="Título da anotação" value={title || (editNote?.title || "")} onChange={e => setTitle(e.target.value)} style={{ marginBottom: 10, fontSize: 15, fontWeight: 700 }} />
        <textarea value={text || (editNote?.text || "")} onChange={e => setText(e.target.value)} placeholder="Escreva o que você aprendeu hoje..." rows={10} style={{ width: "100%", background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, color: T.textPrimary, fontFamily: "'Nunito',sans-serif", fontSize: 14, padding: "14px 16px", outline: "none", resize: "none", lineHeight: 1.7, marginBottom: 12 }} onFocus={e => e.target.style.borderColor = T.accent} onBlur={e => e.target.style.borderColor = T.border} />
        <BtnPrimary T={T} onClick={saveNote}>Salvar anotação</BtnPrimary>
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div><h2 style={{ fontSize: 20, fontWeight: 900, color: T.textPrimary }}>Anotações 📓</h2><p style={{ fontSize: 12, color: T.textDim }}>{notes.length} nota{notes.length !== 1 ? "s" : ""}</p></div>
        <BtnPrimary T={T} style={{ width: "auto", padding: "10px 18px", fontSize: 13 }} onClick={() => { setView("new"); setText(""); setTitle(""); setEditing(null); }}>+ Nova nota</BtnPrimary>
      </div>
      {notes.length === 0 ? (
        <Card T={T} style={{ textAlign: "center", padding: "36px 20px" }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>📓</div>
          <p style={{ fontWeight: 800, fontSize: 16, color: T.textPrimary, marginBottom: 6 }}>Nenhuma anotação ainda</p>
          <p style={{ color: T.textSecondary, fontSize: 13, marginBottom: 18 }}>Anote o que você aprende para fixar melhor o conteúdo.</p>
          <BtnPrimary T={T} style={{ width: "auto", padding: "11px 24px" }} onClick={() => setView("new")}>Criar primeira nota</BtnPrimary>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {notes.map(note => (
            <Card T={T} key={note.id} style={{ padding: "15px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <p style={{ fontWeight: 800, fontSize: 14, color: T.textPrimary, flex: 1, marginRight: 10 }}>{note.title}</p>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => { setEditing(note.id); setText(note.text); setTitle(note.title); }} style={{ background: T.accentDim, border: `1px solid ${T.accent}22`, borderRadius: 7, padding: "4px 9px", cursor: "pointer", color: T.accent, fontSize: 12, fontFamily: "'Nunito',sans-serif" }}>✏️</button>
                  <button onClick={() => deleteNote(note.id)} style={{ background: T.redDim, border: `1px solid ${T.red}22`, borderRadius: 7, padding: "4px 9px", cursor: "pointer", color: T.red, fontSize: 12, fontFamily: "'Nunito',sans-serif" }}>🗑️</button>
                </div>
              </div>
              <p style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.6, marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{note.text}</p>
              <p style={{ fontSize: 10, color: T.textDim, fontFamily: "'JetBrains Mono',monospace" }}>{note.date} · {note.time}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Rank Tab ──────────────────────────────────────────────────────────────
function RankTab({ T, user }) {
  const [allUsers, setAllUsers] = useState([]);
  useEffect(() => {
    supabase.from("users").select("name,xp,email,streak,achievements").order("xp", { ascending: false }).then(({ data }) => { if (data) setAllUsers(data.map(dbToUser)); });
  }, []);

  const myRank = allUsers.findIndex(u => u.email === user.email) + 1;
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      <h2 style={{ fontSize: 20, fontWeight: 900, color: T.textPrimary, marginBottom: 4 }}>Ranking 🏆</h2>
      <p style={{ color: T.textSecondary, fontSize: 13, marginBottom: 18 }}>Todos os usuários da plataforma</p>

      {myRank > 0 && (
        <Card T={T} glow style={{ marginBottom: 14, textAlign: "center", padding: "16px" }}>
          <p style={{ fontSize: 12, color: T.textDim, marginBottom: 4 }}>Sua posição</p>
          <p style={{ fontSize: 32, fontWeight: 900, color: T.accent }}>#{myRank}</p>
          <p style={{ fontSize: 13, color: T.textSecondary }}>{user.xp || 0} XP · {user.name}</p>
        </Card>
      )}

      {allUsers.length <= 1 ? (
        <Card T={T} style={{ textAlign: "center", padding: "32px 20px" }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🏆</div>
          <p style={{ fontWeight: 800, fontSize: 16, color: T.textPrimary, marginBottom: 6 }}>Você é o primeiro!</p>
          <p style={{ color: T.textSecondary, fontSize: 13 }}>Convide amigos para usar o Riv.AI e aparecer no ranking!</p>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {allUsers.map((u, i) => {
            const isMe = u.email === user.email;
            return (
              <div key={u.email} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: isMe ? T.accentDim : T.card, border: `1px solid ${isMe ? T.accent + "44" : T.border}`, borderRadius: 13, transition: "all .2s" }}>
                <span style={{ fontSize: i < 3 ? 20 : 14, fontWeight: 900, minWidth: 28, textAlign: "center", color: i < 3 ? undefined : T.textDim, fontFamily: "'JetBrains Mono',monospace" }}>{i < 3 ? medals[i] : `#${i + 1}`}</span>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg,${T.accent},${T.accentLight||T.green})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: "#fff", flexShrink: 0 }}>{(u.name || "?")[0].toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: 14, color: isMe ? T.accent : T.textPrimary }}>{u.name}{isMe ? " (você)" : ""}</p>
                  <p style={{ fontSize: 11, color: T.textDim }}>🔥 {u.streak || 0} dias · {(u.achievements || []).length} conquistas</p>
                </div>
                <span style={{ fontSize: 13, fontWeight: 900, color: T.amber, fontFamily: "'JetBrains Mono',monospace" }}>{u.xp || 0} XP</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}