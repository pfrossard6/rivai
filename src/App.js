import { useState, useEffect, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
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
const AREA_CONTEXT_EXAMPLES = {
  operations: "sou analista de logística numa fábrica de alimentos, cuido do estoque e da distribuição para 12 lojas",
  business: "sou gerente administrativo numa clínica odontológica, cuido de contratos e fornecedores",
  engineering: "sou engenheiro civil, trabalho em obras residenciais e faço orçamentos e cronogramas",
  marketing: "sou social media de uma loja de roupas, crio conteúdo e cuido dos anúncios no Instagram",
  sales: "sou vendedor de planos de saúde, faço prospecção e follow-up de clientes todo dia",
  education: "sou professora de matemática no ensino médio, também corrijo provas e monto material de aula",
  health: "sou enfermeira de UTI, trabalho em plantões de 12h e cuido de prontuários e escalas",
  finance: "sou analista financeiro numa construtora, faço fluxo de caixa e relatórios mensais",
  design: "sou designer freelancer, crio identidade visual e posts pra pequenos negócios",
  hr: "sou analista de RH numa indústria, cuido de recrutamento e folha de pagamento",
  law: "sou advogado trabalhista, atendo clientes e monto petições",
  other: "conte o que você faz no dia a dia, seus projetos e desafios reais",
};
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
  { id: "notes_10", icon: "📓", title: "Anotador", desc: "10 anotações criadas", xp: 100, color: "#00d4aa" },
  { id: "progress_50", icon: "⭐", title: "Meio Caminho", desc: "50% da trilha concluída", xp: 300, color: "#f59e0b" },
  { id: "xp_2000", icon: "💎", title: "Diamante", desc: "2000 XP acumulados", xp: 500, color: "#00d4aa" },
];
const DAILY_MISSIONS = [
  { id: "study_30", icon: "⏱️", title: "Sessão de 30min", desc: "Estude por pelo menos 30 minutos", xp: 50 },
  { id: "ask_tutor", icon: "💬", title: "Pergunte ao Tutor", desc: "Faça uma pergunta ao tutor", xp: 40 },
  { id: "take_note", icon: "📓", title: "Faça uma Anotação", desc: "Escreva uma anotação de estudo", xp: 30 },
];
const HOME_MISSIONS_DEF = [
  { id: "home_study_15", xp: 30 },
  { id: "home_review",   xp: 50 },
  { id: "home_tutor",    xp: 20 },
];
const TRAIL_STUDY_KEY = "rivai_trail_study";
const NAV_ITEMS = [
  { id: "home", icon: "🏠", label: "Início" },
  { id: "trail", icon: "📚", label: "Trilhas" },
  { id: "explore", icon: "🔍", label: "Explorar" },
];
const getTodayStr = () => new Date().toDateString();
const HEATMAP_KEY = "rivai_study_heatmap";
const getHeatmap = () => { try { return JSON.parse(localStorage.getItem(HEATMAP_KEY) || "{}"); } catch { return {}; } };
const addHeatmapMinutes = (mins) => {
  const map = getHeatmap();
  const today = new Date().toISOString().slice(0, 10);
  map[today] = (map[today] || 0) + mins;
  localStorage.setItem(HEATMAP_KEY, JSON.stringify(map));
};

// ─── Tutorial ──────────────────────────────────────────────────────────────
const TUTORIAL_KEY = "rivai_tutorial_v1";
const getTutorialDone = () => localStorage.getItem(TUTORIAL_KEY) === "1";
const markTutorialDone = () => localStorage.setItem(TUTORIAL_KEY, "1");


// ─── Avatar options ────────────────────────────────────────────────────────
const AVATAR_OPTIONS = ["🐶","🐱","🦊","🐼","🦁","🐨","🦄","🐸","🤖","👽","🧙","🧝","👩‍💻","🧑‍🚀","🦸","🌟","💎","⭐","🔥","⚡","🌊","🎯","🚀","🎨"];

// ─── Language & Profile Photo ──────────────────────────────────────────────
const PROFILE_EMOJIS = ["🐶","🐱","🦊","🐼","🦁","🐨","🦄","🐸","🤖","👽","🧙","🎯"];
const getProfilePhoto = () => localStorage.getItem("rivai_profile_photo");
const saveProfilePhoto = b64 => b64 ? localStorage.setItem("rivai_profile_photo", b64) : localStorage.removeItem("rivai_profile_photo");

// ─── Lesson content (fixed for Aula 1) ────────────────────────────────────
const LESSON_CONTENT_FIXED = {
  "0_0": {
    cards: [
      { icon: "🧠", title: "O que é Inteligência Artificial?", body: "Inteligência Artificial (IA) é a capacidade de máquinas realizarem tarefas que normalmente exigiriam inteligência humana — como aprender, raciocinar, tomar decisões e entender linguagem natural." },
      { icon: "⚙️", title: "Como a IA aprende?", body: "A IA aprende a partir de dados. Quanto mais exemplos ela vê, mais precisa fica. Um modelo como o ChatGPT foi treinado com bilhões de textos para aprender a gerar respostas coerentes e úteis." },
      { icon: "🗂️", title: "Tipos de IA", body: "• IA Generativa: cria texto, imagens, código (ChatGPT, Claude, Midjourney)\n• IA Analítica: analisa dados e faz previsões (recomendações da Netflix)\n• IA de Visão: reconhece imagens e vídeos (Face ID, carros autônomos)\n• IA de Automação: executa tarefas repetitivas (chatbots, RPA)" },
      { icon: "💡", title: "Você já usa IA", body: "Você usa IA sem perceber todos os dias:\n• Sugestões de músicas no Spotify\n• Filtro de spam no e-mail\n• Rotas inteligentes no Google Maps\n• Corretor ortográfico do celular\n• Detecção de fraude no cartão de crédito" },
      { icon: "⚡", title: "Seu próximo passo", body: "Agora que você entende o que é IA, o próximo tópico vai te ensinar a conversar com ela de forma eficiente. Isso se chama engenharia de prompts — a habilidade mais valiosa que você pode desenvolver agora." },
    ]
  }
};

// ─── Trail helpers ─────────────────────────────────────────────────────────
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
  settings: { dailyGoal: 1, notifications: true, nickname: null, avatar: null },
});

// ─── Theme ─────────────────────────────────────────────────────────────────
const THEMES = {
  dark: {
    bg: "#121214", surface: "#19191c", card: "#1c1c1f", border: "#2b2b2f",
    accent: "#6459E0", accentLight: "#8177E8", accentDim: "#6459E01c", accentGlow: "#6459E01c",
    green: "#22A35E", greenDim: "#22A35E18", amber: "#C77C22", amberDim: "#C77C2218",
    red: "#D14F4F", redDim: "#D14F4F18",
    textPrimary: "#EDEDEF", textSecondary: "#A0A0A8", textDim: "#5C5C64",
    btnText: "#fff", navBg: "#19191cf0",
  },
  light: {
    bg: "#FAFAFA", surface: "#ffffff", card: "#ffffff", border: "#E4E4E7",
    accent: "#5A4FCF", accentLight: "#7267DB", accentDim: "#5A4FCF10", accentGlow: "#5A4FCF10",
    green: "#188A4C", greenDim: "#188A4C12", amber: "#B4650F", amberDim: "#B4650F12",
    red: "#C43D3D", redDim: "#C43D3D12",
    textPrimary: "#18181B", textSecondary: "#52525B", textDim: "#A1A1AA",
    btnText: "#fff", navBg: "#FAFAFAF0",
  },
};

// ─── API helpers ───────────────────────────────────────────────────────────
function extractJSON(text) {
  // Try multiple strategies to extract valid JSON
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
- Contexto pessoal (a parte mais importante — use isso em CADA fase, não só no resumo geral): ${profile.context || "não informado"}

Retorne este JSON exato (substitua os valores):
{"headline":"frase motivacional curta máx 8 palavras","overview":"2-3 frases específicas para este perfil","phases":[{"number":1,"title":"nome da fase","duration":"3 semanas","color":"violet","focus":"foco principal","days":[{"period":"dia 1-2","title":"título do tópico","description":"descrição concreta e específica para este perfil","tag":"prática"}]}],"first_prompt":"prompt detalhado que o aluno deve usar para começar o dia 1 com o tutor IA"}

Regras: 3 fases (fase1=violet, fase2=emerald, fase3=amber), 3-4 dias por fase, tags: prática/teoria/projeto/ferramenta/análise/automação. O contexto pessoal do aluno precisa aparecer de forma concreta no título ou foco de CADA fase e na descrição de CADA dia — não apenas no overview inicial. Nunca gere títulos ou descrições genéricas que serviriam pra qualquer pessoa; um aluno da saúde e um da logística devem receber fases visivelmente diferentes.`;

  const raw = await callAPI([{ role: "user", content }], system, 2500);
  return JSON.parse(extractJSON(raw));
}

async function generateLessonContent(profile, phase, day) {
  const system = `Você é um especialista em educação que ensina IA aplicada de forma prática e específica. Gere APENAS JSON válido, sem texto antes ou depois, sem markdown.`;
  const content = `Crie o conteúdo completo de uma aula para:
- Aluno: ${profile?.name || "Estudante"}
- Área/profissão: ${profile?.areas?.join(", ") || "geral"}
- Nível: ${profile?.level || "iniciante"}
- Contexto pessoal (use isso para exemplos reais, é o mais importante): ${profile?.context || "não informado"}
- Módulo: ${phase?.title || ""}
- Aula: ${day?.title || ""} — ${day?.description || ""}

Retorne este JSON exato:
{"cards":[{"icon":"nome curto do conceito","title":"título do card","body":"explicação real e específica, 3-5 frases, com exemplo concreto ligado ao contexto do aluno"}],"flashcards":[{"front":"pergunta ou termo curto","back":"resposta curta e direta"}],"exercise":{"title":"título do exercício prático","instructions":"instrução de uma tarefa real que o aluno faz agora, usando um prompt ou ferramenta de IA, ligada ao contexto dele"}}

Regras: 3-4 cards de conteúdo real (nada de "use o tutor para aprofundar" — ensine de verdade aqui), 4-5 flashcards de revisão, 1 exercício prático específico para o contexto do aluno. Sempre em português.`;

  const raw = await callAPI([{ role: "user", content }], system, 2000);
  return JSON.parse(extractJSON(raw));
}

async function askTutor(messages, profile, lessonContext = null) {
  const lessonLine = lessonContext
    ? `\nContexto da aula atual: "${lessonContext.dayTitle}" (fase: ${lessonContext.phaseTitle}). Priorize respostas relacionadas a este conteúdo quando pertinente.`
    : "";
  const system = `Você é um tutor de IA especializado e personalizado. Estilo: direto, empolgante, didático mas descontraído.
Perfil: ${profile?.name}, área: ${profile?.areas?.join(", ")}, nível: ${profile?.level}, objetivos: ${profile?.goals?.join(", ")}, contexto: ${profile?.context || "não informado"}.${lessonLine}
Regras: máx 4 parágrafos curtos, use exemplos concretos da área do aluno, seja específico nunca genérico, responda em português.`;
  return await callAPI(messages, system, 900);
}

// ─── Phase colors ──────────────────────────────────────────────────────────
const getPC = (c, T) => ({
  violet: { bg: T.accent + "18", border: T.accent + "44", text: T.accentLight || T.accent, dot: T.accent },
  emerald: { bg: T.green + "18", border: T.green + "44", text: T.green, dot: T.green },
  amber: { bg: T.amber + "18", border: T.amber + "44", text: T.amber, dot: T.amber },
}[c] || { bg: T.accent + "18", border: T.accent + "44", text: T.accent, dot: T.accent });

// ─── Module cover icons (simple outline set, no emoji) ─────────────────────
const MODULE_ICON_PATHS = {
  book: "M4 5.5C4 4.67 4.67 4 5.5 4H12V19H5.5C4.67 19 4 18.33 4 17.5V5.5Z M12 4H18.5C19.33 4 20 4.67 20 5.5V17.5C20 18.33 19.33 19 18.5 19H12",
  chart: "M4 20V10 M10 20V4 M16 20V13 M4 20H20",
  gear: "M12 15.5A3.5 3.5 0 1 0 12 8.5A3.5 3.5 0 0 0 12 15.5Z M12 3V5.5 M12 18.5V21 M4.2 7.2L6 9 M18 15L19.8 16.8 M3 12H5.5 M18.5 12H21 M4.2 16.8L6 15 M18 9L19.8 7.2",
  compass: "M12 21A9 9 0 1 0 12 3A9 9 0 0 0 12 21Z M14.5 9.5L13 13L9.5 14.5L11 11L14.5 9.5Z",
  users: "M8 11A3 3 0 1 0 8 5A3 3 0 0 0 8 11Z M2.5 19C2.5 15.5 4.9 13.5 8 13.5C11.1 13.5 13.5 15.5 13.5 19 M16 8A2.5 2.5 0 1 0 16 3A2.5 2.5 0 0 0 16 8Z M14.5 13.2C17.2 13.6 19 15.4 19 18.5",
  target: "M12 21A9 9 0 1 0 12 3A9 9 0 0 0 12 21Z M12 16A4 4 0 1 0 12 8A4 4 0 0 0 12 16Z M12 13A1 1 0 1 0 12 11A1 1 0 0 0 12 13Z",
};
function ModuleIcon({ name, size = 20, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={MODULE_ICON_PATHS[name] || MODULE_ICON_PATHS.book} />
    </svg>
  );
}
const MODULE_ICON_ORDER = ["book", "gear", "chart", "compass", "users", "target"];
function pickModuleIcon(title = "", pi = 0) {
  const t = title.toLowerCase();
  if (/dado|métric|analytic/.test(t)) return "chart";
  if (/automa|processo|ferramenta/.test(t)) return "gear";
  if (/gestão|pessoa|equipe|time|lideran/.test(t)) return "users";
  if (/estratég|visão|planej/.test(t)) return "compass";
  if (/fundament|introdu|base/.test(t)) return "book";
  return MODULE_ICON_ORDER[pi % MODULE_ICON_ORDER.length];
}

// ─── Shared UI ─────────────────────────────────────────────────────────────
function Card({ T, children, style = {}, glow, onClick, ...rest }) {
  return (
    <div onClick={onClick} {...rest} style={{ background: T.card, border: `1px solid ${glow ? T.accent + "40" : T.border}`, borderRadius: 14, padding: "18px", boxShadow: T.card === "#ffffff" ? "0 1px 3px #0000000a" : "none", cursor: onClick ? "pointer" : "default", ...style }}>
      {children}
    </div>
  );
}

function BtnPrimary({ T, children, onClick, disabled, style = {} }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ padding: "13px 20px", background: disabled ? T.textDim : T.accent, color: T.btnText, border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "'Source Serif 4', serif", transition: "background 0.15s", width: "100%", ...style }}>
      {children}
    </button>
  );
}

function TInput({ T, placeholder, type = "text", value, onChange, style = {} }) {
  const [f, setF] = useState(false);
  return <input type={type} placeholder={placeholder} value={value} onChange={onChange} onFocus={() => setF(true)} onBlur={() => setF(false)} style={{ width: "100%", background: T.surface, border: `1px solid ${f ? T.accent : T.border}`, borderRadius: 11, color: T.textPrimary, fontFamily: "'Source Serif 4', serif", fontSize: 14, padding: "12px 14px", outline: "none", marginBottom: 12, transition: "border 0.2s", boxShadow: f ? `0 0 0 3px ${T.accentDim}` : "none", ...style }} />;
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

// ─── Tutorial Overlay ──────────────────────────────────────────────────────
const TOUR_STEPS = [
  { tab: "home", target: "home-trail", title: "Sua trilha", desc: "Aqui você vê sua trilha atual e continua de onde parou, direto pra próxima aula." },
  { tab: "home", target: "home-progress", title: "Seu progresso", desc: "Acompanhe quantos módulos você já concluiu e sua posição no ranking." },
  { tab: "trail", target: "trail-covers", title: "Seus cadernos", desc: "Cada módulo é um caderno — clique para abrir e ver as aulas, no seu ritmo, sem separação por dia." },
  { tab: "explore", target: "explore-search", title: "Explorar", desc: "Conteúdo geral sobre IA — ChatGPT, Claude, automação — pra qualquer pessoa, sem depender da sua trilha pessoal." },
  { tab: "home", target: "profile-avatar", title: "Seu perfil", desc: "Seu perfil, notas salvas e configurações ficam aqui, no ícone do canto." },
];

function GuidedTour({ T, setTab, onDone }) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);
  const s = TOUR_STEPS[step];

  useEffect(() => {
    setTab(s.tab);
    setRect(null);
    const t = setTimeout(() => {
      const el = document.querySelector(`[data-tour="${s.target}"]`);
      if (el) {
        el.scrollIntoView({ block: "center" });
        setRect(el.getBoundingClientRect());
      }
    }, 300);
    return () => clearTimeout(t);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  function next() {
    if (step + 1 >= TOUR_STEPS.length) onDone();
    else setStep(p => p + 1);
  }

  const pad = 8;
  const box = rect ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 } : null;
  const tooltipWidth = 280;
  let tooltipTop = 0, tooltipLeft = 0;
  if (box) {
    const spaceBelow = window.innerHeight - (box.top + box.height);
    tooltipTop = spaceBelow > 200 ? box.top + box.height + 14 : Math.max(14, box.top - 180);
    tooltipLeft = Math.min(Math.max(14, box.left), window.innerWidth - tooltipWidth - 14);
  }

  return (
    <>
      <div onClick={onDone} style={{ position: "fixed", inset: 0, zIndex: 900 }} />
      {box
        ? <div style={{ position: "fixed", top: box.top, left: box.left, width: box.width, height: box.height, borderRadius: 12, border: `2px solid ${T.accent}`, boxShadow: "0 0 0 9999px rgba(0,0,0,.62)", pointerEvents: "none", zIndex: 901, transition: "all .25s ease" }} />
        : <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.62)", zIndex: 901 }} />
      }
      <div style={{ position: "fixed", top: box ? tooltipTop : "50%", left: box ? tooltipLeft : "50%", transform: box ? "none" : "translate(-50%,-50%)", width: tooltipWidth, background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, zIndex: 902, animation: "fadeUp .25s ease" }}>
        <div style={{ display: "flex", gap: 5, marginBottom: 12 }}>
          {TOUR_STEPS.map((_, i) => <div key={i} style={{ flex: 1, height: 3, borderRadius: 3, background: i <= step ? T.accent : T.border }} />)}
        </div>
        <p style={{ fontWeight: 700, fontSize: 14, color: T.textPrimary, marginBottom: 6 }}>{s.title}</p>
        <p style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.6, marginBottom: 14 }}>{s.desc}</p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={onDone} style={{ background: "none", border: "none", color: T.textDim, fontSize: 12, cursor: "pointer", fontFamily: "'Source Serif 4',serif" }}>Pular</button>
          <button onClick={next} style={{ padding: "9px 16px", background: T.accent, color: "#fff", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Source Serif 4',serif" }}>{step + 1 >= TOUR_STEPS.length ? "Concluir" : "Próximo →"}</button>
        </div>
      </div>
    </>
  );
}

// ─── Lesson Screen ─────────────────────────────────────────────────────────
function TutorPanel({ T, user, updateUser, addXP, addToast, completeMission, lessonContext, onClose, dock }) {
  const [msgs, setMsgs] = useState([]);
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
      const reply = await askTutor(newMsgs.map(m => ({ role: m.role, content: m.content })), user.profile || {}, lessonContext);
      const final = [...newMsgs, { role: "assistant", content: reply }];
      setMsgs(final);
      addXP(8);
      completeMission("ask_tutor");
      completeMission("home_tutor");
      const count = final.filter(m => m.role === "user").length;
      if (count === 5) addXP(100, "chat_5");
    } catch (e) { addToast("Erro ao conectar com o tutor: " + e.message, "error"); }
    finally { setLoading(false); }
  }

  const WELCOME = "Olá! Sou seu tutor de IA. Pode me perguntar qualquer coisa — sobre as aulas, sobre IA em geral, ou sobre como aplicar no seu dia a dia.";

  const panel = (
    <div style={{ position: dock ? "static" : "relative", background: dock ? T.card : T.bg, border: dock ? `1px solid ${T.border}` : "none", borderRadius: 16, padding: "0 0 16px", width: dock ? "100%" : "min(420px, calc(100% - 40px))", height: dock ? "100%" : "80vh", display: "flex", flexDirection: "column", boxShadow: dock ? "none" : "0 8px 40px rgba(0,0,0,.45)", animation: dock ? "none" : "fadeUp .28s ease", margin: dock ? 0 : "0 20px 20px 0" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px 12px", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: T.accentDim, border: `1px solid ${T.accent}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: T.accent, flexShrink: 0 }}>⬡</div>
        <p style={{ flex: 1, fontWeight: 700, fontSize: 14, color: T.textPrimary }}>Tutor personalizado</p>
        {!dock && <button onClick={onClose} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 9, padding: "6px 11px", cursor: "pointer", color: T.textSecondary, fontSize: 13, fontFamily: "'Source Serif 4',serif", flexShrink: 0 }}>✕</button>}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>
        {/* Welcome message always shown */}
        <div style={{ display: "flex", justifyContent: "flex-start", animation: "fadeUp .25s ease" }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: T.accentDim, border: `1px solid ${T.accent}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: T.accent, flexShrink: 0, marginRight: 7, marginTop: 2 }}>⬡</div>
          <div style={{ maxWidth: "82%", padding: "9px 13px", borderRadius: "14px 14px 14px 4px", background: T.surface, border: `1px solid ${T.border}`, fontSize: 13, lineHeight: 1.7, color: T.textPrimary }}>{WELCOME}</div>
        </div>
        {msgs.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", animation: "fadeUp .25s ease" }}>
            {msg.role === "assistant" && <div style={{ width: 22, height: 22, borderRadius: 6, background: T.accentDim, border: `1px solid ${T.accent}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: T.accent, flexShrink: 0, marginRight: 7, marginTop: 2 }}>⬡</div>}
            <div style={{ maxWidth: "82%", padding: "9px 13px", borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: msg.role === "user" ? T.accent : T.surface, border: msg.role === "user" ? "none" : `1px solid ${T.border}`, fontSize: 13, lineHeight: 1.7, color: msg.role === "user" ? "#fff" : T.textPrimary, whiteSpace: "pre-wrap" }}>{msg.content}</div>
          </div>
        ))}
        {loading && <div style={{ display: "flex", gap: 5, padding: "9px 13px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: "14px 14px 14px 4px", width: "fit-content", marginLeft: 29 }}>
          {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: T.accent, animation: `pulse 1s ease-in-out ${i*.15}s infinite` }} />)}
        </div>}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 8, padding: "10px 16px 0" }}>
        <input
          placeholder="Me pergunte qualquer coisa sobre IA..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
            style={{ flex: 1, background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, color: T.textPrimary, fontFamily: "'Source Serif 4',serif", fontSize: 14, padding: "13px 15px", outline: "none", minHeight: 48 }}
            onFocus={e => e.target.style.borderColor = T.accent}
            onBlur={e => e.target.style.borderColor = T.border}
          />
          <BtnPrimary T={T} style={{ width: 46, padding: 0, fontSize: 16, borderRadius: 12, flexShrink: 0 }} onClick={() => send()} disabled={loading}>→</BtnPrimary>
        </div>
    </div>
  );

  if (dock) return panel;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.55)", backdropFilter: "blur(3px)" }} />
      {panel}
    </div>
  );
}

// ─── Mini Profile Menu ─────────────────────────────────────────────────────
function MiniProfileMenu({ T, user, onEditPhoto, onOpenProfile, onTutorial, onOpenNotes, onLogout, onClose }) {
  const isPhoto = user.settings?.avatarType === "photo";
  const photo = isPhoto ? getProfilePhoto() : null;
  const avatarContent = photo
    ? <img src={photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
    : (user.settings?.avatar && user.settings.avatarType === "emoji" ? user.settings.avatar : (user.name || "?")[0].toUpperCase());

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 390 }} />
      <div style={{ position: "fixed", top: 56, right: 10, zIndex: 400, background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "14px", minWidth: 230, boxShadow: "0 8px 32px rgba(0,0,0,.35)", animation: "fadeUp .2s ease" }}>
        {/* User info */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 12, borderBottom: `1px solid ${T.border}`, marginBottom: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg,${T.accent},${T.accentLight||T.green})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, color: "#fff", overflow: "hidden", flexShrink: 0 }}>
            {avatarContent}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 800, fontSize: 14, color: T.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.settings?.nickname || user.name}</p>
            <p style={{ fontSize: 11, color: T.textDim, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.email}</p>
          </div>
        </div>
        {/* Actions */}
        <button onClick={() => { onClose(); onEditPhoto(); }} style={{ width: "100%", padding: "10px 12px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, cursor: "pointer", fontFamily: "'Source Serif 4',serif", fontSize: 13, fontWeight: 700, color: T.textPrimary, textAlign: "left", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
          🖼️ Editar perfil
        </button>
        <button onClick={() => { onClose(); onTutorial(); }} style={{ width: "100%", padding: "10px 12px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, cursor: "pointer", fontFamily: "'Source Serif 4',serif", fontSize: 13, fontWeight: 700, color: T.textPrimary, textAlign: "left", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
          📖 Ver tutorial
        </button>
        <button onClick={() => { onClose(); onOpenNotes(); }} style={{ width: "100%", padding: "10px 12px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, cursor: "pointer", fontFamily: "'Source Serif 4',serif", fontSize: 13, fontWeight: 700, color: T.textPrimary, textAlign: "left", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
          📓 Minhas notas
        </button>
        <button onClick={() => { onClose(); onOpenProfile(); }} style={{ width: "100%", padding: "10px 12px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, cursor: "pointer", fontFamily: "'Source Serif 4',serif", fontSize: 13, fontWeight: 700, color: T.textPrimary, textAlign: "left", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
          ⚙️ Configurações
        </button>
        <button onClick={onLogout} style={{ width: "100%", padding: "10px 12px", background: T.redDim, border: `1px solid ${T.red}33`, borderRadius: 10, cursor: "pointer", fontFamily: "'Source Serif 4',serif", fontSize: 13, fontWeight: 700, color: T.red, textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}>
          🚪 Sair da conta
        </button>
      </div>
    </>
  );
}

// ─── Profile Photo Modal ───────────────────────────────────────────────────
function ProfilePhotoModal({ T, user, updateUser, addToast, onClose }) {
  const [mode, setMode] = useState(null);
  const [selectedEmoji, setSelectedEmoji] = useState(user.settings?.avatar || "");
  const fileRef = useRef(null);

  function applyInitial() {
    saveProfilePhoto(null);
    updateUser({ ...user, settings: { ...(user.settings || {}), avatar: null, avatarType: "initial" } });
    addToast("✓ Avatar atualizado!");
    onClose();
  }

  function applyEmoji() {
    if (!selectedEmoji) return;
    saveProfilePhoto(null);
    updateUser({ ...user, settings: { ...(user.settings || {}), avatar: selectedEmoji, avatarType: "emoji" } });
    addToast("✓ Emoji aplicado!");
    onClose();
  }

  function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      saveProfilePhoto(ev.target.result);
      updateUser({ ...user, settings: { ...(user.settings || {}), avatar: null, avatarType: "photo" } });
      addToast("✓ Foto de perfil atualizada!");
      onClose();
    };
    reader.readAsDataURL(file);
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ position: "absolute", inset: 0, background: "#000a", animation: "overlayIn .25s ease" }} onClick={onClose} />
      <div style={{ position: "relative", width: "100%", maxWidth: 380, background: T.card, border: `1px solid ${T.border}`, borderRadius: 20, padding: "24px 20px", animation: "pop .3s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontWeight: 900, fontSize: 16, color: T.textPrimary }}>Editar foto de perfil</h3>
          <button onClick={onClose} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "5px 10px", cursor: "pointer", color: T.textSecondary, fontSize: 14, fontFamily: "'Source Serif 4',serif" }}>✕</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: mode === "emoji" ? 14 : 0 }}>
          <button onClick={() => { setMode("photo"); setTimeout(() => fileRef.current?.click(), 60); }} style={{ padding: "13px 16px", background: mode === "photo" ? T.accentDim : T.surface, border: `1.5px solid ${mode === "photo" ? T.accent : T.border}`, borderRadius: 13, cursor: "pointer", fontFamily: "'Source Serif 4',serif", textAlign: "left", display: "flex", alignItems: "center", gap: 12, transition: "all .15s" }}>
            <span style={{ fontSize: 24 }}>📷</span>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary }}>Enviar foto</p>
              <p style={{ fontSize: 12, color: T.textSecondary }}>Upload de imagem do dispositivo</p>
            </div>
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: "none" }} />
          <button onClick={applyInitial} style={{ padding: "13px 16px", background: T.surface, border: `1.5px solid ${T.border}`, borderRadius: 13, cursor: "pointer", fontFamily: "'Source Serif 4',serif", textAlign: "left", display: "flex", alignItems: "center", gap: 12, transition: "all .15s" }}>
            <span style={{ fontSize: 24 }}>🔤</span>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary }}>Usar inicial do nome</p>
              <p style={{ fontSize: 12, color: T.textSecondary }}>Exibe a primeira letra do seu nome</p>
            </div>
          </button>
          <button onClick={() => setMode(m => m === "emoji" ? null : "emoji")} style={{ padding: "13px 16px", background: mode === "emoji" ? T.accentDim : T.surface, border: `1.5px solid ${mode === "emoji" ? T.accent : T.border}`, borderRadius: 13, cursor: "pointer", fontFamily: "'Source Serif 4',serif", textAlign: "left", display: "flex", alignItems: "center", gap: 12, transition: "all .15s" }}>
            <span style={{ fontSize: 24 }}>😀</span>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary }}>Escolher emoji</p>
              <p style={{ fontSize: 12, color: T.textSecondary }}>Selecione um emoji como avatar</p>
            </div>
          </button>
        </div>
        {mode === "emoji" && (
          <div style={{ marginTop: 4 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8, marginBottom: 12 }}>
              {PROFILE_EMOJIS.map(em => (
                <div key={em} onClick={() => setSelectedEmoji(em)} style={{ aspectRatio: "1", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, cursor: "pointer", background: selectedEmoji === em ? T.accentDim : T.surface, border: `1.5px solid ${selectedEmoji === em ? T.accent : T.border}`, transition: "all .15s" }}>{em}</div>
              ))}
            </div>
            <BtnPrimary T={T} onClick={applyEmoji} disabled={!selectedEmoji}>Aplicar emoji</BtnPrimary>
          </div>
        )}
      </div>
    </div>
  );
}

function LessonScreen({ T, phaseIdx, dayIdx, course, completedTopics, onConclude, onBack, user, updateUser, addXP, addToast, completeMission }) {
  const [elapsed, setElapsed] = useState(0);
  const [showTutor, setShowTutor] = useState(false);
  const phase = course.phases[phaseIdx];
  const day = phase?.days?.[dayIdx];
  const key = `${phaseIdx}_${dayIdx}`;
  const isDone = completedTopics.includes(key);
  const col = getPC(phase?.color, T);
  const fixedContent = LESSON_CONTENT_FIXED[key];
  const cachedContent = day?.content;
  const [genContent, setGenContent] = useState(null);
  const [genLoading, setGenLoading] = useState(false);
  const [genErr, setGenErr] = useState("");
  const [flipped, setFlipped] = useState(new Set());
  const [noteText, setNoteText] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const content = fixedContent || cachedContent || genContent;

  function saveQuickNote() {
    if (!noteText.trim()) return;
    const note = { id: Date.now(), title: day?.title || "Anotação da aula", text: noteText, date: new Date().toLocaleDateString("pt-BR"), time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) };
    const newNotes = [note, ...(user.notes || [])];
    updateUser({ ...user, notes: newNotes });
    addXP(15); addToast("Anotação salva! +15 XP");
    completeMission("take_note");
    if (newNotes.length >= 10) addXP(100, "notes_10");
    setNoteText(""); setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  }

  useEffect(() => {
    if (content || genLoading) return;
    setGenLoading(true); setGenErr("");
    generateLessonContent(user.profile, phase, day)
      .then(c => {
        setGenContent(c);
        const newPhases = user.course.phases.map((p, pi) => pi !== phaseIdx ? p : {
          ...p, days: p.days.map((d, di) => di !== dayIdx ? d : { ...d, content: c }),
        });
        updateUser({ ...user, course: { ...user.course, phases: newPhases } });
      })
      .catch(e => setGenErr("Não foi possível gerar o conteúdo desta aula: " + e.message))
      .finally(() => setGenLoading(false));
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isDone) return;
    const iv = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(iv);
  }, [isDone]);

  const pad = n => String(n).padStart(2, "0");
  const mins = Math.floor(elapsed / 60), secs = elapsed % 60;

  function toggleFlip(i) {
    setFlipped(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
  }

  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      {/* Floating tutor button */}
      <button onClick={() => setShowTutor(true)} style={{ position: "fixed", bottom: 82, right: 18, zIndex: 110, background: T.accent, border: "none", borderRadius: 10, padding: "11px 18px", color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: "'Source Serif 4',serif", cursor: "pointer" }}>
        Perguntar ao Tutor
      </button>

      {showTutor && (
        <TutorPanel
          T={T}
          user={user}
          updateUser={updateUser}
          addXP={addXP}
          addToast={addToast}
          completeMission={completeMission}
          lessonContext={{ phaseTitle: phase?.title, dayTitle: day?.title }}
          onClose={() => setShowTutor(false)}
        />
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <button onClick={onBack} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 9, padding: "7px 12px", cursor: "pointer", color: T.textSecondary, fontSize: 13, fontFamily: "'Source Serif 4',serif", flexShrink: 0 }}>← Voltar</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 10, color: col.text, fontWeight: 700, marginBottom: 1 }}>{phase?.title}</p>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: T.textPrimary, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{day?.title}</h2>
        </div>
        {!isDone && (
          <span style={{ fontSize: 12, color: T.textDim, fontFamily: "'JetBrains Mono',monospace", flexShrink: 0 }}>{pad(mins)}:{pad(secs)}</span>
        )}
      </div>

      {genLoading && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: 10 }}>
          <div style={{ width: 26, height: 26, border: `2.5px solid ${T.border}`, borderTopColor: T.accent, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <p style={{ fontSize: 13, color: T.textSecondary }}>Preparando o conteúdo desta aula...</p>
        </div>
      )}
      {genErr && (
        <div style={{ padding: 16, background: T.redDim, border: `1px solid ${T.red}44`, borderRadius: 12, marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: T.red }}>{genErr}</p>
        </div>
      )}

      {content && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
            {content.cards?.map((card, i) => (
              <Card T={T} key={i} style={{ animation: `fadeUp .4s ease ${i * .08}s both` }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: T.textPrimary, marginBottom: 8 }}>{card.title}</p>
                <p style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.8, whiteSpace: "pre-line" }}>{card.body}</p>
              </Card>
            ))}
          </div>

          {content.flashcards?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: T.textSecondary, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>Flashcards de revisão</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {content.flashcards.map((fc, i) => {
                  const isFlipped = flipped.has(i);
                  return (
                    <div key={i} onClick={() => toggleFlip(i)} style={{ background: isFlipped ? T.accentDim : T.card, border: `1px solid ${isFlipped ? T.accent + "44" : T.border}`, borderRadius: 12, padding: "14px 16px", cursor: "pointer" }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: isFlipped ? T.accent : T.textDim, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>{isFlipped ? "Resposta" : "Pergunta"}</p>
                      <p style={{ fontSize: 13, color: T.textPrimary, lineHeight: 1.6 }}>{isFlipped ? fc.back : fc.front}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {content.exercise && (
            <div style={{ background: T.accentDim, border: `1px solid ${T.accent}33`, borderRadius: 14, padding: "16px", marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Exercício prático</p>
              <p style={{ fontWeight: 700, fontSize: 14, color: T.textPrimary, marginBottom: 6 }}>{content.exercise.title}</p>
              <p style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.7 }}>{content.exercise.instructions}</p>
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: T.textSecondary, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Anotar algo desta aula</p>
            <textarea rows={2} value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Escreva um insight ou lembrete rápido..." style={{ width: "100%", background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, color: T.textPrimary, fontFamily: "'Source Serif 4',serif", fontSize: 13, padding: "10px 12px", outline: "none", resize: "none", marginBottom: 8 }} />
            <button onClick={saveQuickNote} disabled={!noteText.trim()} style={{ padding: "8px 14px", background: noteSaved ? T.green : T.surface, border: `1px solid ${noteSaved ? T.green : T.border}`, borderRadius: 9, color: noteSaved ? "#fff" : T.textSecondary, fontSize: 12, fontWeight: 600, fontFamily: "'Source Serif 4',serif", cursor: noteText.trim() ? "pointer" : "default" }}>
              {noteSaved ? "Salvo" : "Salvar nota"}
            </button>
          </div>
        </>
      )}

      {isDone ? (
        <div style={{ padding: "16px", background: T.greenDim, border: `1px solid ${T.green}44`, borderRadius: 14, textAlign: "center" }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: T.green }}>Aula concluída</p>
          <p style={{ fontSize: 12, color: T.textDim, marginTop: 4 }}>Você já completou esta aula. Boa revisão!</p>
        </div>
      ) : (
        <BtnPrimary T={T} onClick={() => onConclude(phaseIdx, dayIdx)}>
          Concluir aula · {pad(mins)}:{pad(secs)} estudados
        </BtnPrimary>
      )}
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
  const [showSplash, setShowSplash] = useState(true);
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
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

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
    @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    body{background:${T.bg};color:${T.textPrimary};font-family:'Source Serif 4',serif;transition:background .3s,color .3s;}
    ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${T.border};border-radius:2px}
    @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes pop{0%{transform:scale(.85);opacity:0}70%{transform:scale(1.04)}100%{transform:scale(1);opacity:1}}
    @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
    @keyframes pulse{0%,100%{opacity:.4;transform:scale(.95)}50%{opacity:1;transform:scale(1.05)}}
    @keyframes bar{0%,100%{width:5%}50%{width:95%}}
    @keyframes toastIn{from{opacity:0;transform:translateX(60px)}to{opacity:1;transform:translateX(0)}}
    @keyframes xpPop{0%{opacity:0;transform:translateY(0) scale(.5)}30%{opacity:1;transform:translateY(-22px) scale(1.2)}100%{opacity:0;transform:translateY(-54px)}}
    @keyframes modalIn{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
    @keyframes overlayIn{from{opacity:0}to{opacity:1}}
    @keyframes splashIn{0%{opacity:0;transform:scale(.8)}100%{opacity:1;transform:scale(1)}}
    @keyframes splashOut{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.04)}}
    .rv-tutor-dock{display:none}
    .rv-tutor-float-btn{display:flex}
    .rv-sidebar{display:none}
    .rv-bottomnav{display:flex}
    .rv-shell-root{padding-bottom:70px}
    .rv-shell-content{max-width:720px}
    @media (min-width:880px){
      .rv-tutor-dock{display:block}
      .rv-tutor-float-btn{display:none}
      .rv-sidebar{display:flex}
      .rv-bottomnav{display:none}
      .rv-shell-content{margin-left:196px;max-width:1040px}
      .rv-covers-grid{grid-template-columns:repeat(3,1fr) !important}
      .rv-shell-root{padding-bottom:0}
    }
  `;

  return (
    <>
      <style>{GS}</style>
      {showSplash && <SplashScreen />}
      {!showSplash && <>
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
      </>}
    </>
  );
}

// ─── Splash Screen ─────────────────────────────────────────────────────────
function SplashScreen() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, background: "#0F0F1A", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", animation: "splashIn .6s cubic-bezier(.22,.8,.44,1) forwards" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 56, fontWeight: 900, letterSpacing: "-1px", marginBottom: 16, lineHeight: 1 }}>
          <span style={{ color: "#ffffff" }}>Riv</span><span style={{ color: "#6C4DFF" }}>AI</span>
        </div>
        <p style={{ fontSize: 17, fontWeight: 600, color: "#6C4DFF", letterSpacing: ".02em" }}>Seu ritmo, amplificado.</p>
      </div>
    </div>
  );
}

// ─── Auth ──────────────────────────────────────────────────────────────────
function AuthScreen({ T, mode, onSubmit, onSwitch, error, setError, themeKey, toggleTheme }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [emailFocus, setEmailFocus] = useState(false);
  const [pwFocus, setPwFocus] = useState(false);
  const [nameFocus, setNameFocus] = useState(false);
  const [btnHover, setBtnHover] = useState(false);
  const isLogin = mode === "login";
  function submit() { isLogin ? onSubmit(email, pw) : onSubmit(email, pw, name); }

  const fieldStyle = (focused) => ({
    width: "100%", background: "#0F0F1A", border: `1px solid ${focused ? "#6C4DFF" : "#2D2D3F"}`,
    borderRadius: 12, color: "#ffffff", fontFamily: "'Source Serif 4', serif", fontSize: 14,
    padding: "13px 14px", outline: "none", marginBottom: 12, transition: "border .2s",
    boxShadow: focused ? "0 0 0 3px rgba(108,77,255,.18)" : "none", boxSizing: "border-box",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#0F0F1A", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* Radial gradient */}
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "700px", height: "700px", background: "radial-gradient(ellipse at center, rgba(108,77,255,.18) 0%, transparent 65%)", pointerEvents: "none" }} />

      {/* Theme toggle */}
      <button onClick={toggleTheme} style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,.06)", border: "1px solid #2D2D3F", borderRadius: 10, padding: "7px 11px", cursor: "pointer", fontSize: 16, zIndex: 10 }}>{themeKey === "dark" ? "☀️" : "🌙"}</button>

      {/* Logo + waves section */}
      <div style={{ width: "100%", maxWidth: 420, padding: "56px 24px 0", textAlign: "center", position: "relative", zIndex: 1 }}>
        {/* SVG waves decorativas */}
        <svg width="100%" height="48" viewBox="0 0 420 48" fill="none" style={{ marginBottom: 8, opacity: .22 }}>
          <path d="M0 32 Q52 8 105 28 T210 28 T315 28 T420 28 L420 48 L0 48 Z" fill="#6C4DFF" />
          <path d="M0 38 Q70 18 140 34 T280 34 T420 34 L420 48 L0 48 Z" fill="#8A2BE2" opacity=".6" />
        </svg>
        <div style={{ fontSize: 48, fontWeight: 900, letterSpacing: "-1px", marginBottom: 10, lineHeight: 1, animation: "fadeUp .5s ease" }}>
          <span style={{ color: "#ffffff" }}>Riv</span><span style={{ color: "#6C4DFF" }}>AI</span>
        </div>
        <p style={{ fontSize: 16, fontWeight: 700, color: "#6C4DFF", marginBottom: 6, animation: "fadeUp .55s ease" }}>Seu ritmo, amplificado.</p>
        <p style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 32, animation: "fadeUp .6s ease" }}>O tutor de IA que se adapta a você</p>
      </div>

      {/* Login card */}
      <div style={{ width: "100%", maxWidth: 420, padding: "0 16px 40px", position: "relative", zIndex: 1, animation: "fadeUp .65s ease" }}>
        <div style={{ background: "#1B1B24", borderRadius: 16, padding: "28px 24px", boxShadow: "0 8px 40px rgba(0,0,0,.5)" }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#ffffff", marginBottom: 4 }}>{isLogin ? "Bem-vindo de volta 👋" : "Criar sua conta 🎯"}</h2>
          <p style={{ color: "#9CA3AF", fontSize: 13, marginBottom: 20 }}>{isLogin ? "Continue sua jornada" : "Vamos montar seu curso personalizado"}</p>

          {!isLogin && (
            <input
              type="text" placeholder="Seu nome" value={name}
              onChange={e => { setName(e.target.value); setError(""); }}
              onFocus={() => setNameFocus(true)} onBlur={() => setNameFocus(false)}
              style={fieldStyle(nameFocus)}
            />
          )}
          <input
            type="email" placeholder="E-mail" value={email}
            onChange={e => { setEmail(e.target.value); setError(""); }}
            onFocus={() => setEmailFocus(true)} onBlur={() => setEmailFocus(false)}
            style={fieldStyle(emailFocus)}
          />
          <input
            type="password" placeholder="Senha" value={pw}
            onChange={e => { setPw(e.target.value); setError(""); }}
            onFocus={() => setPwFocus(true)} onBlur={() => setPwFocus(false)}
            style={{ ...fieldStyle(pwFocus), marginBottom: error ? 8 : 20 }}
            onKeyDown={e => e.key === "Enter" && submit()}
          />

          {error && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 14 }}>{error}</p>}

          <button
            onClick={submit}
            onMouseEnter={() => setBtnHover(true)}
            onMouseLeave={() => setBtnHover(false)}
            style={{ width: "100%", padding: "14px 20px", background: btnHover ? "#8A2BE2" : "#6C4DFF", color: "#ffffff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "'Source Serif 4', serif", transition: "background .2s", boxShadow: "0 4px 20px rgba(108,77,255,.4)" }}
          >
            {isLogin ? "Entrar →" : "Criar conta grátis →"}
          </button>

          <p style={{ textAlign: "center", fontSize: 13, color: "#9CA3AF", marginTop: 18, cursor: "pointer" }} onClick={onSwitch}>
            {isLogin ? "Novo por aqui? " : "Já tem conta? "}
            <span style={{ color: "#6C4DFF", fontWeight: 700 }}>{isLogin ? "Criar conta grátis" : "Entrar"}</span>
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
  const TOTAL = 7;
  const toggle = (arr, set, id) => set(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const stepInfo = [
    { label: "Objetivos", q: "O que você quer alcançar com IA?" },
    { label: "Área", q: "Onde você atua profissionalmente?" },
    { label: "Contexto", q: "Conte sobre o seu dia a dia" },
    { label: "Nível", q: "Qual é sua experiência com IA?" },
    { label: "Ferramentas", q: "Quais ferramentas você já conhece?" },
    { label: "Desafios", q: "O que te trava com IA hoje?" },
    { label: "Detalhes", q: "Última coisa" },
  ];
  const contextPlaceholder = "ex: " + (AREA_CONTEXT_EXAMPLES[areas[0]] || AREA_CONTEXT_EXAMPLES.other);

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
          <span style={{ fontSize: 17, fontWeight: 900, color: T.textPrimary }}>Riv.<span style={{ color: T.accent }}>IA</span></span>
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
          {step === 2 && <>
            <p style={{ fontSize: 13, color: T.textSecondary, marginBottom: 12, lineHeight: 1.6 }}>Essa é a parte que mais importa pra gente montar uma trilha de verdade sua — não genérica. Quanto mais específico, melhor.</p>
            <textarea rows={5} value={context} onChange={e => setContext(e.target.value)} placeholder={contextPlaceholder} style={{ width: "100%", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, color: T.textPrimary, fontFamily: "'Source Serif 4',serif", fontSize: 14, padding: "12px 14px", outline: "none", resize: "none", marginBottom: 8 }} onFocus={e => e.target.style.borderColor = T.accent} onBlur={e => e.target.style.borderColor = T.border} />
            <p style={{ fontSize: 11, color: T.textDim }}>{context.trim().length < 15 ? "Escreva pelo menos uma frase com detalhe real." : "Ótimo, isso ajuda bastante."}</p>
          </>}
          {step === 3 && <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 22 }}>{LEVELS.map(l => <Chip key={l.id} T={T} label={l.label} icon={l.icon} active={level === l.id} onClick={() => setLevel(l.id)} radio />)}</div>}
          {step === 4 && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 22 }}>{TOOLS.map(t => <Chip key={t.id} T={T} label={t.label} active={tools.includes(t.id)} onClick={() => toggle(tools, setTools, t.id)} />)}</div>}
          {step === 5 && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 22 }}>{CHALLENGES.map(c => <Chip key={c.id} T={T} label={c.label} active={challenges.includes(c.id)} onClick={() => toggle(challenges, setChallenges, c.id)} />)}</div>}
          {step === 6 && <>
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary }}>Horas de estudo por dia</p>
                <span style={{ fontSize: 24, fontWeight: 900, color: T.accent, fontFamily: "'JetBrains Mono',monospace" }}>{hours}h</span>
              </div>
              <input type="range" min={1} max={5} step={1} value={hours} onChange={e => setHours(Number(e.target.value))} style={{ width: "100%", accentColor: T.accent, background: "transparent", border: "none", padding: 0, cursor: "pointer" }} />
            </div>
            {err && <p style={{ color: T.red, fontSize: 13, marginTop: 8, marginBottom: -4 }}>{err}</p>}
          </>}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            {step > 0 && <button onClick={() => setStep(s => s - 1)} style={{ padding: "13px 18px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 12, color: T.textSecondary, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Source Serif 4',serif" }}>←</button>}
            <BtnPrimary T={T} disabled={step === 0 ? !goals.length : step === 1 ? !areas.length : step === 2 ? context.trim().length < 15 : step === 3 ? !level : false} style={{ flex: 1 }} onClick={step === 6 ? finish : () => setStep(s => s + 1)}>
              {step === 6 ? "✦ Gerar meu curso" : "Próximo →"}
            </BtnPrimary>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Explorar Tab ──────────────────────────────────────────────────────────
const EXPLORE_TRAILS = [
  {
    id: 1, title: "ChatGPT para Produtividade", desc: "Domine o modelo mais popular do mundo e automatize tarefas do dia a dia com prompts eficientes.", level: "Intermediário", icon: "🤖", category: "produtividade",
    modules: [
      {
        id: "m1", title: "Fundamentos do ChatGPT",
        lessons: [
          { id: "l1", title: "O que é o ChatGPT e como funciona", desc: "Entenda a arquitetura de transformers e como o modelo prevê tokens. Conheça os limites e capacidades reais do modelo.", tag: "teoria" },
          { id: "l2", title: "Anatomia de um bom prompt", desc: "Aprenda a estrutura papel + contexto + instrução + formato. Veja exemplos antes/depois de prompts reescritos.", tag: "prática" },
        ]
      },
      {
        id: "m2", title: "Prompts para o Trabalho",
        lessons: [
          { id: "l3", title: "Resumos e síntese de documentos", desc: "Técnicas para resumir PDFs, e-mails e reuniões longas. Use o modo de chunking para textos acima do limite de contexto.", tag: "prática" },
          { id: "l4", title: "Criação de e-mails e comunicações", desc: "Gere e-mails profissionais, respostas difíceis e comunicados internos. Defina tom, destinatário e objetivo em segundos.", tag: "prática" },
          { id: "l5", title: "Automatizando relatórios com GPT", desc: "Monte um fluxo de geração de relatórios semanais via ChatGPT + planilha. Integre com Zapier ou Make para zero esforço manual.", tag: "projeto" },
        ]
      },
      {
        id: "m3", title: "Usos Avançados",
        lessons: [
          { id: "l6", title: "Custom Instructions e memória", desc: "Configure instruções persistentes para personalizar o comportamento do modelo. Economize tempo eliminando contexto repetido.", tag: "prática" },
          { id: "l7", title: "GPTs personalizados (sem código)", desc: "Crie seu próprio GPT com instruções, tom e base de conhecimento. Publique e compartilhe com seu time.", tag: "projeto" },
          { id: "l8", title: "Avaliando e refinando respostas", desc: "Técnicas de follow-up, critiques e cadeia de raciocínio para melhorar outputs automaticamente.", tag: "teoria" },
        ]
      },
    ]
  },
  {
    id: 2, title: "Claude — O Assistente de Raciocínio", desc: "Explore o modelo da Anthropic, ideal para análises longas, redação e raciocínio passo a passo.", level: "Iniciante", icon: "⬡", category: "produtividade",
    modules: [
      {
        id: "m1", title: "Conhecendo o Claude",
        lessons: [
          { id: "l1", title: "Claude vs ChatGPT — diferenças reais", desc: "Compare janela de contexto, estilo de resposta e pontos fortes de cada modelo. Saiba quando usar cada um.", tag: "teoria" },
          { id: "l2", title: "Prompts para análise e crítica", desc: "Peça ao Claude para revisar textos, detectar inconsistências e sugerir melhorias argumentativas.", tag: "prática" },
        ]
      },
      {
        id: "m2", title: "Claude no Dia a Dia",
        lessons: [
          { id: "l3", title: "Leitura de documentos longos", desc: "Envie contratos, artigos científicos ou relatórios extensos e peça resumos estruturados com destaques.", tag: "prática" },
          { id: "l4", title: "Escrita colaborativa com Claude", desc: "Use o Claude como co-autor: defina estilo, faça iterações e peça variações de tom para o mesmo conteúdo.", tag: "projeto" },
        ]
      },
    ]
  },
  {
    id: 3, title: "Gemini — IA integrada ao Google", desc: "Use a IA do Google integrada ao Gmail, Docs e Drive para turbinar sua produtividade no ecossistema G Suite.", level: "Iniciante", icon: "🔵", category: "produtividade",
    modules: [
      {
        id: "m1", title: "Gemini no Google Workspace",
        lessons: [
          { id: "l1", title: "Gemini no Gmail — respostas inteligentes", desc: "Ative o Gemini no Gmail para gerar rascunhos automáticos com base no histórico do e-mail.", tag: "prática" },
          { id: "l2", title: "Gemini no Docs e Slides", desc: "Gere documentos completos, crie apresentações e melhore textos existentes diretamente no Google Docs.", tag: "prática" },
        ]
      },
      {
        id: "m2", title: "Gemini Avançado",
        lessons: [
          { id: "l3", title: "Multimodalidade — texto, imagem e áudio", desc: "Envie imagens e áudios para o Gemini e obtenha análises detalhadas. Ideal para revisão de layouts e transcrições.", tag: "teoria" },
          { id: "l4", title: "Projeto integrado: relatório com Gemini + Sheets", desc: "Monte um pipeline: colete dados no Sheets, processe com Gemini e exporte um relatório no Docs automaticamente.", tag: "projeto" },
        ]
      },
    ]
  },
  {
    id: 4, title: "IAs de Imagem — Midjourney e DALL-E", desc: "Crie ilustrações, logotipos e arte digital com prompts visuais. Do zero ao resultado profissional.", level: "Iniciante", icon: "🎨", category: "criatividade",
    modules: [
      {
        id: "m1", title: "Criando com Prompts Visuais",
        lessons: [
          { id: "l1", title: "Anatomia de um prompt visual", desc: "Aprenda os elementos: sujeito, estilo, iluminação, câmera, humor. Veja exemplos de prompts fracos vs. detalhados.", tag: "teoria" },
          { id: "l2", title: "Midjourney — primeiros passos", desc: "Configure o Discord, gere suas primeiras imagens com /imagine e navegue pelos parâmetros --ar, --v e --style.", tag: "prática" },
        ]
      },
      {
        id: "m2", title: "Uso Profissional",
        lessons: [
          { id: "l3", title: "DALL-E no ChatGPT — criação rápida", desc: "Use o DALL-E integrado ao ChatGPT para gerar mockups de produtos, thumbnails e posts para redes sociais.", tag: "prática" },
          { id: "l4", title: "Projeto: identidade visual com IA", desc: "Crie um conjunto coeso de imagens para uma marca fictícia: banner, avatar e post. Exporte em alta resolução.", tag: "projeto" },
          { id: "l5", title: "Direitos e ética em imagens geradas por IA", desc: "Entenda as regras de uso comercial, atribuição e os debates éticos sobre treinamento de modelos visuais.", tag: "teoria" },
        ]
      },
    ]
  },
  {
    id: 5, title: "Perplexity — Pesquisa com IA", desc: "Faça pesquisas profundas com fontes citadas, monitore tópicos e substitua horas de navegação por segundos.", level: "Iniciante", icon: "🔍", category: "produtividade",
    modules: [
      {
        id: "m1", title: "Pesquisa Inteligente",
        lessons: [
          { id: "l1", title: "Por que o Perplexity é diferente do Google", desc: "Compare buscas tradicionais com busca aumentada por IA. Entenda como o Perplexity cita fontes e evita alucinações.", tag: "teoria" },
          { id: "l2", title: "Técnicas de busca avançada", desc: "Use operadores, mode Focus e filtragem por fonte (acadêmica, YouTube, Reddit) para resultados precisos.", tag: "prática" },
        ]
      },
      {
        id: "m2", title: "Perplexity no Fluxo de Trabalho",
        lessons: [
          { id: "l3", title: "Monitoramento de tópicos e alertas", desc: "Configure Spaces para acompanhar temas específicos. Receba resumos automáticos de novidades no seu setor.", tag: "prática" },
          { id: "l4", title: "Projeto: relatório de pesquisa em 10 minutos", desc: "Use o Perplexity para compilar um relatório de mercado com fontes, dados e análise — exportado pronto para apresentar.", tag: "projeto" },
        ]
      },
    ]
  },
];

// Conteúdo real das aulas do Explorar — escrito uma única vez, compartilhado
// entre todos (não é gerado por IA por pessoa, já que aqui não é personalizado).
const EXPLORE_LESSON_CONTENT = {
  "2_l1": {
    cards: [
      { title: "Janela de contexto", body: "O Claude é conhecido por janelas de contexto bem grandes — muitas vezes 200 mil tokens ou mais. Na prática, isso significa colar um contrato de 80 páginas, uma base de código inteira ou uma reunião transcrita numa única conversa, sem precisar picar o texto em pedaços. O ChatGPT também evoluiu nisso, mas essa foi historicamente a diferença mais sentida no dia a dia com textos longos." },
      { title: "Estilo de resposta", body: "O Claude tende a ser mais cauteloso: quando falta informação, ele costuma sinalizar a incerteza ou pedir mais contexto em vez de inventar uma resposta confiante. Modelos como o ChatGPT (principalmente versões mais antigas) tendem a ser mais assertivos mesmo quando estão incertos. Isso muda como você deve conferir o que cada um te devolve." },
      { title: "Pontos fortes de cada um", body: "De forma geral: o Claude se destaca em redação cuidadosa, análise crítica de texto e raciocínio explicado passo a passo. O ChatGPT tem um ecossistema mais amplo de plugins e integrações, e costuma ser rápido em tarefas curtas e diretas. Na prática, muita gente boa usa os dois — cada um no que se sai melhor." },
    ],
    flashcards: [
      { front: "Qual modelo historicamente oferece janelas de contexto maiores?", back: "O Claude — permite colar documentos e códigos bem mais longos numa única conversa." },
      { front: "Como o Claude costuma reagir quando falta informação num prompt?", back: "Tende a sinalizar a incerteza ou pedir mais contexto, em vez de inventar uma resposta confiante." },
      { front: "Em que tipo de tarefa o Claude costuma se destacar?", back: "Redação cuidadosa, análise crítica de texto e raciocínio passo a passo." },
      { front: "Preciso escolher só um dos dois modelos pra sempre?", back: "Não — muita gente usa os dois, cada um no que se sai melhor." },
    ],
    exercise: { title: "Compare os dois na prática", instructions: "Pegue um texto longo que você tenha em mãos (um e-mail complicado, um contrato, um artigo) e peça a mesma tarefa — por exemplo 'resuma os 3 pontos principais e aponte riscos' — pro Claude e pro ChatGPT. Compare: qual foi mais precisa? Qual assumiu coisas que o texto não dizia?" },
  },
  "2_l2": {
    cards: [
      { title: "Peça pra ele discordar de você", body: "O Claude responde bem a pedidos explícitos de crítica honesta. Em vez de perguntar \"isso está bom?\", peça \"aponte os 3 maiores problemas deste texto, mesmo que pareçam pequenos\". Essa mudança de pergunta muda o modo de resposta — de \"concordar educadamente\" pra uma análise real." },
      { title: "Peça o contra-argumento", body: "Antes de uma decisão importante, peça ao Claude para defender o lado oposto do que você está pensando — \"argumente contra essa decisão como se fosse advogado do diabo\". Isso expõe pontos cegos antes de você se comprometer com algo." },
      { title: "Estrutura de crítica em camadas", body: "Um pedido de crítica eficaz segue uma ordem: (1) resumo do que foi entendido, (2) pontos fortes, (3) pontos fracos específicos com exemplos do próprio texto, (4) uma sugestão concreta de melhoria. Nessa ordem, evita respostas vagas do tipo \"está bom, só ajustar um pouco\"." },
    ],
    flashcards: [
      { front: "O que pedir em vez de 'isso está bom?'", back: "Peça para apontar os maiores problemas, mesmo que pareçam pequenos." },
      { front: "O que é o prompt de 'advogado do diabo'?", back: "Pedir ao modelo para argumentar contra sua ideia, expondo pontos cegos antes de decidir." },
      { front: "Qual é a ordem de uma boa crítica em camadas?", back: "Resumo → pontos fortes → pontos fracos específicos → sugestão concreta." },
      { front: "Por que evitar perguntas vagas tipo 'está bom?'", back: "Porque tendem a gerar respostas educadas e genéricas, não uma análise real." },
    ],
    exercise: { title: "Critique algo seu de verdade", instructions: "Cole um texto seu (um e-mail, uma proposta, um post) no Claude e peça a estrutura de 4 camadas: resumo, pontos fortes, pontos fracos específicos, sugestão concreta. Veja se a crítica aponta algo que você não tinha percebido." },
  },
  "2_l3": {
    cards: [
      { title: "Cole o documento inteiro, não resuma antes", body: "Por causa da janela de contexto grande, dá pra colar o documento inteiro — contrato, artigo científico, ata de reunião — sem resumir antes por conta própria. Resumir manualmente antes de perguntar já filtra informação que pode ser importante." },
      { title: "Peça resumo estruturado, não corrido", body: "Em vez de \"resuma isso\", peça algo como \"resuma em tópicos: decisões tomadas, pendências, prazos e riscos\". Isso força uma leitura mais completa e organizada, em vez de um parágrafo genérico que mistura tudo." },
      { title: "Peça pra citar a origem dentro do documento", body: "Peça para o Claude referenciar a seção, página ou trecho de onde tirou cada informação do resumo. Isso ajuda a conferir rapidamente se ele leu certo, sem precisar reler o documento inteiro você mesmo." },
    ],
    flashcards: [
      { front: "Por que colar o documento inteiro em vez de resumir antes?", back: "Resumir manualmente já filtra informação — o modelo deve trabalhar com o texto completo." },
      { front: "Como pedir um resumo mais útil que um parágrafo genérico?", back: "Peça por tópicos específicos: decisões, pendências, prazos, riscos." },
      { front: "Como conferir rapidamente se o resumo está certo?", back: "Peça para citar a seção ou página de onde tirou cada informação." },
      { front: "Que tipo de documento se beneficia dessa técnica?", back: "Contratos, artigos longos, atas de reunião — qualquer texto extenso que precise de leitura cuidadosa." },
    ],
    exercise: { title: "Processe um documento real", instructions: "Pegue o documento mais longo que você precisa ler essa semana (contrato, relatório, ata) e peça ao Claude um resumo estruturado em tópicos, com prazos e riscos, citando a seção de onde tirou cada ponto." },
  },
  "2_l4": {
    cards: [
      { title: "Defina o estilo antes de pedir o texto", body: "Antes de pedir o texto final, descreva o estilo desejado com exemplos: formal ou casual, frases curtas ou longas, com ou sem humor. Um prompt como \"escreva como um e-mail entre colegas próximos, frases curtas, sem formalidade excessiva\" gera um resultado bem diferente de um pedido genérico." },
      { title: "Trabalhe em rascunhos, não no texto final direto", body: "Peça uma primeira versão só com a estrutura em tópicos, depois peça pra desenvolver cada tópico, depois peça uma revisão de tom. Dividir em etapas dá bem mais controle do que pedir o texto pronto de uma vez." },
      { title: "Peça variações de tom pro mesmo conteúdo", body: "Com um rascunho bom em mãos, peça \"reescreva isso em 3 tons diferentes: mais formal, mais direto, mais caloroso\" e escolha o que combina com a situação — é mais rápido que tentar descrever o tom ideal do zero." },
    ],
    flashcards: [
      { front: "O que fazer antes de pedir o texto final?", back: "Definir o estilo desejado com exemplos concretos (formal/casual, frases curtas/longas)." },
      { front: "Por que trabalhar em etapas (estrutura → desenvolvimento → revisão)?", back: "Dá mais controle do que pedir o texto pronto de uma vez só." },
      { front: "Como escolher o tom certo mais rápido?", back: "Peça variações do mesmo texto em tons diferentes e compare, em vez de descrever o tom ideal do zero." },
      { front: "Que tipo de texto se beneficia da escrita em etapas?", back: "Textos mais longos ou importantes — e-mails delicados, propostas, comunicados." },
    ],
    exercise: { title: "Escreva algo em 3 etapas", instructions: "Escolha um texto que você precisa escrever essa semana (um e-mail difícil, um post, uma proposta). Peça ao Claude: 1) só a estrutura em tópicos, 2) desenvolva cada tópico, 3) 3 variações de tom. Escolha a que mais combina com quem vai ler." },
  },
  "1_l1": {
    cards: [
      { title: "Modelo de linguagem, não banco de dados", body: "O ChatGPT não \"procura\" respostas numa base — ele prevê, palavra por palavra, a continuação mais provável de um texto, com base em padrões aprendidos no treinamento. Isso explica tanto a fluência quanto os erros: ele pode soar muito confiante mesmo errado, porque seu trabalho é gerar texto plausível, não checar fatos." },
      { title: "A janela de contexto tem limite", body: "Cada conversa tem um limite de quanto texto o modelo consegue considerar ao mesmo tempo. Em conversas muito longas, informações do início podem ser \"esquecidas\". Se a conversa ficar longa demais, é melhor abrir uma nova e recolocar o essencial." },
      { title: "Alucinação é uma limitação real", body: "Alucinação é quando o modelo inventa uma informação com aparência de verdade — um dado, uma citação, uma fonte. Isso acontece porque ele prioriza fluência sobre precisão. Sempre confira fatos, números e citações antes de usar algo importante." },
    ],
    flashcards: [
      { front: "O ChatGPT busca respostas prontas num banco de dados?", back: "Não — ele prevê a continuação mais provável do texto, com base em padrões aprendidos." },
      { front: "O que é 'alucinação' num modelo de IA?", back: "Quando o modelo inventa uma informação com aparência de verdade, sem embasamento real." },
      { front: "Por que conversas muito longas podem 'esquecer' o início?", back: "Porque a janela de contexto tem um limite de quanto texto o modelo consegue considerar de uma vez." },
    ],
    exercise: { title: "Teste os limites", instructions: "Peça ao ChatGPT uma informação bem específica (uma data, uma citação, uma estatística) sobre um tema que você conhece bem. Confira se está correta — isso dá uma noção real de quando confiar e quando checar." },
  },
  "1_l2": {
    cards: [
      { title: "A estrutura papel + contexto + instrução + formato", body: "Um prompt eficaz define quem o modelo deve \"ser\" (papel), a situação (contexto), o que fazer exatamente (instrução) e como entregar (formato). Ex: \"Você é consultor de RH. Uma funcionária pediu demissão após 2 anos. Escreva 3 perguntas pra entender o motivo real, em tópicos curtos.\"" },
      { title: "Diga o que evitar também", body: "Prompts vagos como \"melhore este texto\" geram resultado genérico. Dizer o que evitar (\"sem jargão\", \"sem emojis\", \"sem passar de 100 palavras\") ajuda tanto quanto dizer o que incluir." },
      { title: "Prompt fraco vs. prompt forte", body: "Fraco: \"escreva sobre marketing digital\". Forte: \"escreva um post de LinkedIn de 150 palavras sobre por que pequenas empresas devem investir em marketing digital, tom direto, sem clichês.\" A diferença está na especificidade, não no tamanho." },
    ],
    flashcards: [
      { front: "Quais os 4 elementos de um prompt eficaz?", back: "Papel, contexto, instrução e formato." },
      { front: "Por que dizer o que evitar também ajuda?", back: "Reduz resultados genéricos e direciona melhor o que o modelo deve produzir." },
      { front: "O que torna um prompt 'forte' em vez de 'fraco'?", back: "Especificidade — detalhes concretos de situação, tom e formato, não apenas o tema." },
    ],
    exercise: { title: "Reescreva um prompt fraco", instructions: "Pegue algo que você já pediu de forma vaga (ex: 'me ajude com um e-mail') e reescreva usando papel + contexto + instrução + formato. Compare os dois resultados." },
  },
  "1_l3": {
    cards: [
      { title: "Cole o texto inteiro quando possível", body: "Para documentos que cabem na janela de contexto, colar o texto completo dá resultado mais confiável do que descrever de memória. Só resuma manualmente quando o documento for maior que o limite do modelo." },
      { title: "Peça resumo por categorias, não um parágrafo", body: "Em vez de \"resuma\", peça \"liste em tópicos: decisões, pendências, prazos e responsáveis\". Funciona bem pra atas de reunião e e-mails longos." },
      { title: "Chunking para textos muito grandes", body: "Quando o texto não cabe de uma vez, divida em partes, peça um resumo de cada parte e depois um resumo final combinando os resumos parciais. Mais trabalhoso, mas evita perder informação." },
    ],
    flashcards: [
      { front: "Por que colar o texto inteiro é melhor que descrevê-lo de memória?", back: "O modelo trabalha com o texto real, sem depender da sua lembrança ou interpretação." },
      { front: "O que é a técnica de chunking?", back: "Dividir um texto grande em partes, resumir cada uma e combinar num resumo final." },
      { front: "Como pedir um resumo mais útil que um parágrafo corrido?", back: "Por categorias específicas: decisões, pendências, prazos, responsáveis." },
    ],
    exercise: { title: "Resuma uma reunião real", instructions: "Pegue a ata da sua última reunião de trabalho e peça um resumo em tópicos: decisões, pendências e prazos." },
  },
  "1_l4": {
    cards: [
      { title: "Defina destinatário e objetivo antes do texto", body: "Um e-mail pra um cliente irritado precisa de tom diferente de um pra sua equipe. Diga quem vai ler e o que você quer alcançar antes de pedir o texto — muda o resultado mais que qualquer ajuste de estilo depois." },
      { title: "Peça variações curtas antes da versão longa", body: "Para comunicados sensíveis, peça primeiro \"resuma em 2 frases o que esse e-mail precisa dizer\" — isso ajuda a validar a mensagem central antes de gastar tempo no texto completo." },
      { title: "Revisão de tom antes de enviar", body: "Com um rascunho pronto, peça \"isso soa passivo-agressivo ou apenas direto?\" — textos escritos perdem nuance de voz, então uma segunda opinião sobre o tom evita mal-entendidos." },
    ],
    flashcards: [
      { front: "O que definir antes de pedir o texto de um e-mail?", back: "Quem vai ler (destinatário) e o que você quer alcançar (objetivo)." },
      { front: "Por que pedir um resumo de 2 frases antes do e-mail completo?", back: "Ajuda a validar a mensagem central antes de gastar tempo no texto todo." },
      { front: "Por que pedir uma checagem de tom antes de enviar?", back: "Textos escritos perdem nuance de voz — uma segunda opinião evita mal-entendidos." },
    ],
    exercise: { title: "Escreva um e-mail difícil", instructions: "Pense num e-mail que você está adiando (cobrar um prazo, dar um feedback difícil). Peça ao ChatGPT definindo destinatário e objetivo, depois peça uma checagem de tom." },
  },
  "1_l5": {
    cards: [
      { title: "O fluxo básico: dados → prompt → formato final", body: "Um relatório automatizado segue: extrair dados brutos (planilha, sistema, export), colar num prompt que já define a estrutura, e pedir a saída num formato pronto pra usar (texto, tabela, lista)." },
      { title: "Zapier e Make como ponte de automação", body: "Ferramentas como Zapier ou Make conectam o ChatGPT a outros apps (Sheets, Slack, e-mail) sem programar — um gatilho (nova linha na planilha) dispara uma ação (gerar resumo com IA e enviar por e-mail)." },
      { title: "Comece manual, automatize depois", body: "Antes de montar uma automação completa, faça o processo manualmente algumas vezes — isso revela se o prompt precisa de ajustes antes de investir tempo automatizando algo ainda desafinado." },
    ],
    flashcards: [
      { front: "Qual o fluxo básico de um relatório automatizado com IA?", back: "Dados brutos → prompt estruturado → formato final pronto pra usar." },
      { front: "O que ferramentas como Zapier ou Make permitem fazer?", back: "Conectar o ChatGPT a outros apps sem programar, usando gatilhos e ações." },
      { front: "Por que testar manualmente antes de automatizar?", back: "Pra garantir que o prompt já está afinado antes de investir tempo na automação." },
    ],
    exercise: { title: "Desenhe seu fluxo", instructions: "Escolha um relatório que você faz toda semana manualmente. Escreva os 3 passos que ele teria como automação: de onde vêm os dados, qual prompt resumiria, e onde o resultado chegaria." },
  },
  "1_l6": {
    cards: [
      { title: "O que são Custom Instructions", body: "Um espaço nas configurações do ChatGPT onde você descreve, uma única vez, quem você é e como prefere que ele responda (tom, nível técnico, formato). Elimina precisar repetir esse contexto em toda conversa nova." },
      { title: "O que colocar nesse espaço", body: "Informações estáveis — sua profissão, seu nível de conhecimento no assunto que mais usa, preferências de formato (\"sempre em tópicos\", \"sem emojis\", \"respostas objetivas\"). Evite coisas que mudam com frequência." },
      { title: "Memória de longo prazo é diferente", body: "Além das Custom Instructions, o ChatGPT também retém fatos mencionados ao longo de conversas normais. Dá pra revisar e apagar o que ele \"lembra\" nas configurações." },
    ],
    flashcards: [
      { front: "Pra que servem as Custom Instructions?", back: "Descrever, uma única vez, quem você é e como prefere que o modelo responda." },
      { front: "Que tipo de informação colocar nas Custom Instructions?", back: "Informações estáveis: profissão, nível de conhecimento, preferências de formato." },
      { front: "Dá pra apagar o que o ChatGPT 'lembrou' de você automaticamente?", back: "Sim, é possível revisar e apagar essas memórias nas configurações." },
    ],
    exercise: { title: "Configure suas instruções", instructions: "Escreva suas Custom Instructions: sua profissão, seu nível de conhecimento no assunto que mais usa IA, e como prefere receber respostas. Teste antes e depois de configurar." },
  },
  "1_l7": {
    cards: [
      { title: "O que é um GPT personalizado", body: "Uma versão configurada do ChatGPT com instruções, tom e, às vezes, uma base de conhecimento própria (documentos anexados), sem escrever nenhuma linha de código." },
      { title: "Quando vale a pena criar um", body: "Se você (ou sua equipe) faz o mesmo tipo de tarefa repetidamente — revisar contratos, responder dúvidas com base num manual, gerar posts no seu tom de marca — um GPT personalizado economiza reescrever o mesmo contexto toda vez." },
      { title: "Publicar e compartilhar", body: "Depois de criado, um GPT pode ficar privado ou ser compartilhado por link com sua equipe ou publicamente, permitindo que outras pessoas usem seu assistente configurado sem saber montar prompts." },
    ],
    flashcards: [
      { front: "O que é um GPT personalizado?", back: "Uma versão configurada do ChatGPT com instruções e base de conhecimento próprios, sem programar." },
      { front: "Quando vale a pena criar um GPT personalizado?", back: "Quando você repete o mesmo tipo de tarefa ou pergunta com frequência." },
      { front: "É possível compartilhar um GPT personalizado?", back: "Sim — por link, com sua equipe ou publicamente." },
    ],
    exercise: { title: "Planeje seu primeiro GPT", instructions: "Pense numa tarefa que você ou sua equipe repete toda semana. Escreva que instruções esse GPT precisaria ter e que documentos ele deveria conhecer." },
  },
  "1_l8": {
    cards: [
      { title: "Follow-up é mais eficiente que recomeçar", body: "Se a resposta não veio como esperado, é quase sempre melhor pedir um ajuste específico (\"deixe mais direto\", \"adicione um exemplo\") do que escrever um prompt novo do zero — o modelo mantém o contexto." },
      { title: "Peça pra ele mesmo se avaliar", body: "Um truque útil: pedir \"critique sua própria resposta — o que poderia estar mais claro ou correto?\" depois de receber algo. Frequentemente revela pontos fracos que passariam despercebidos." },
      { title: "Cadeia de raciocínio para problemas complexos", body: "Para tarefas com lógica ou decisão, peça \"pense passo a passo antes de responder\" — reduz erros em problemas com várias etapas, forçando o modelo a expor o raciocínio em vez de pular pra conclusão." },
    ],
    flashcards: [
      { front: "O que fazer quando a resposta não veio como esperado?", back: "Pedir um ajuste específico via follow-up, em vez de recomeçar do zero." },
      { front: "O que acontece quando você pede pro modelo criticar a própria resposta?", back: "Frequentemente revela pontos fracos que passariam despercebidos." },
      { front: "Por que pedir 'pense passo a passo' em problemas complexos?", back: "Reduz erros porque força o modelo a expor o raciocínio em vez de pular pra conclusão." },
    ],
    exercise: { title: "Refine em 3 rodadas", instructions: "Peça algo ao ChatGPT, depois peça pra ele mesmo criticar a resposta, depois peça uma versão final incorporando essa crítica." },
  },
  "3_l1": {
    cards: [
      { title: "Como ativar", body: "O Gemini for Gmail (\"Ajuda-me a escrever\") fica disponível dentro da caixa de composição, geralmente como um ícone de estrela. Ele lê o e-mail que você está respondendo pra sugerir rascunhos com base no contexto da conversa." },
      { title: "Refinar em vez de aceitar direto", body: "As primeiras sugestões costumam ser genéricas. Use os botões de refinamento (formalizar, encurtar, elaborar) em vez de aceitar a primeira versão — economiza mais tempo de edição do que reescrever manualmente." },
      { title: "Cuidado com informações sensíveis", body: "Como ele lê o conteúdo do e-mail pra gerar sugestões, evite usar em threads com dados extremamente sensíveis sem revisar a política de privacidade da sua organização." },
    ],
    flashcards: [
      { front: "Onde encontrar o 'Ajuda-me a escrever' no Gmail?", back: "Na caixa de composição de e-mail, geralmente como um ícone de estrela." },
      { front: "O que fazer quando a primeira sugestão do Gemini é genérica?", back: "Usar os botões de refinamento em vez de aceitar direto." },
      { front: "Por que ter cuidado ao usar em e-mails sensíveis?", back: "Porque o recurso lê o conteúdo do e-mail pra gerar as sugestões." },
    ],
    exercise: { title: "Responda um e-mail parado", instructions: "Pegue um e-mail que você está adiando responder. Use o 'Ajuda-me a escrever' do Gmail e refine a sugestão pelo menos uma vez antes de considerar pronta." },
  },
  "3_l2": {
    cards: [
      { title: "Gerar um documento do zero", body: "No Google Docs, dá pra pedir ao Gemini pra redigir um documento completo a partir de uma descrição breve — útil como ponto de partida, mas quase sempre precisa de edição depois." },
      { title: "Melhorar texto existente", body: "Selecione um trecho já escrito e peça pra reescrever, resumir ou ajustar o tom — mais rápido do que copiar pra outra ferramenta e trazer o resultado de volta." },
      { title: "Gerar apresentações a partir de texto", body: "No Slides, dá pra colar um esboço de tópicos e pedir uma estrutura de slides — o Gemini sugere a divisão de conteúdo, mas o design final ainda precisa de ajuste manual." },
    ],
    flashcards: [
      { front: "Pra que serve gerar um documento do zero com Gemini no Docs?", back: "Como ponto de partida rápido — quase sempre precisa de edição depois." },
      { front: "Como melhorar um texto já escrito no Docs?", back: "Selecionar o trecho e pedir pra reescrever, resumir ou ajustar o tom." },
      { front: "O que o Gemini faz ao gerar uma apresentação a partir de tópicos?", back: "Sugere a divisão de conteúdo por slide — o design final ainda precisa de ajuste manual." },
    ],
    exercise: { title: "Transforme notas em slides", instructions: "Pegue uma lista de tópicos sobre algum assunto de trabalho e use o Gemini no Slides pra gerar uma estrutura inicial de apresentação." },
  },
  "3_l3": {
    cards: [
      { title: "O que é multimodalidade", body: "Significa que o modelo processa mais de um tipo de informação ao mesmo tempo — texto, imagem e áudio — em vez de precisar de uma ferramenta separada pra cada tipo." },
      { title: "Análise de imagens na prática", body: "Dá pra enviar uma foto de um gráfico e pedir pra explicar a tendência, ou uma captura de tela de um erro e pedir ajuda pra resolver — o modelo \"lê\" a imagem como parte do contexto." },
      { title: "Transcrição e análise de áudio", body: "Em vez de só transcrever, dá pra pedir análise sobre o conteúdo — por exemplo, resumir os pontos principais de uma reunião gravada, não só gerar o texto bruto da fala." },
    ],
    flashcards: [
      { front: "O que significa 'multimodalidade' num modelo de IA?", back: "Processar mais de um tipo de informação (texto, imagem, áudio) na mesma conversa." },
      { front: "Dê um exemplo prático de análise de imagem.", back: "Enviar um gráfico ou captura de tela e pedir explicação ou ajuda pra resolver um problema." },
      { front: "Qual a diferença entre transcrever e analisar um áudio?", back: "Transcrever gera só o texto da fala; analisar também resume e interpreta o conteúdo." },
    ],
    exercise: { title: "Analise uma imagem sua", instructions: "Envie ao Gemini uma captura de tela ou foto de algo do seu trabalho (um gráfico, uma tela de erro) e peça uma análise ou explicação." },
  },
  "3_l4": {
    cards: [
      { title: "O pipeline completo", body: "Colete os dados brutos no Google Sheets, use o Gemini pra gerar interpretação e resumo, e exporte o resultado formatado no Google Docs — três ferramentas, um fluxo só." },
      { title: "Onde o Gemini agrega mais valor", body: "Ele é mais útil na etapa de interpretação — transformar números brutos em frases que explicam o que os dados significam — do que na coleta ou formatação, que continuam manuais." },
      { title: "Repita o processo, não reinvente toda vez", body: "Depois de montar esse fluxo uma vez, guarde o prompt que funcionou bem — reutilizá-lo economiza mais tempo do que escrever um novo prompt a cada relatório." },
    ],
    flashcards: [
      { front: "Quais as 3 etapas do pipeline de relatório com Gemini + Sheets?", back: "Coletar dados no Sheets → interpretar com Gemini → exportar formatado no Docs." },
      { front: "Em que etapa o Gemini agrega mais valor?", back: "Na interpretação — transformar números em explicações, não na coleta ou formatação." },
      { front: "Por que guardar o prompt que funcionou bem?", back: "Pra reutilizar e economizar tempo em vez de escrever um novo a cada relatório." },
    ],
    exercise: { title: "Monte seu pipeline", instructions: "Pegue uma planilha real que você atualiza com frequência. Peça ao Gemini uma interpretação dos números principais e leve o resumo pra um documento formatado." },
  },
  "4_l1": {
    cards: [
      { title: "Os elementos de um bom prompt visual", body: "Sujeito (o que aparece), estilo (fotografia, ilustração, 3D, aquarela), iluminação (natural, dramática, neon), composição/câmera (close-up, plano aberto) e humor/atmosfera. Quanto mais desses elementos você define, mais previsível o resultado." },
      { title: "Prompt fraco vs. forte", body: "Fraco: \"um café\". Forte: \"uma xícara de café fumegante numa mesa de madeira rústica, luz da manhã pela janela, estilo fotografia editorial, foco raso.\" A diferença não é o tamanho, é a especificidade visual." },
      { title: "Referências ajudam mais que adjetivos genéricos", body: "Em vez de \"bonito\" ou \"profissional\", cite referências concretas — \"estilo de revista de arquitetura\", \"paleta tipo Wes Anderson\". Modelos visuais respondem melhor a referências do que a elogios vagos." },
    ],
    flashcards: [
      { front: "Quais os 5 elementos de um prompt visual completo?", back: "Sujeito, estilo, iluminação, composição/câmera e humor/atmosfera." },
      { front: "O que torna um prompt visual 'forte'?", back: "Especificidade — detalhes concretos de cena, luz e estilo, não o tamanho do texto." },
      { front: "Por que citar referências específicas em vez de adjetivos como 'bonito'?", back: "Modelos visuais respondem melhor a referências concretas do que a elogios vagos." },
    ],
    exercise: { title: "Reescreva um prompt visual fraco", instructions: "Pense numa imagem simples que queira gerar (ex: 'um escritório'). Reescreva com os 5 elementos: sujeito, estilo, iluminação, composição e atmosfera." },
  },
  "4_l2": {
    cards: [
      { title: "Onde e como gerar", body: "O Midjourney funciona através de um servidor no Discord — você digita /imagine seguido do prompt, e o modelo gera 4 variações da imagem em poucos segundos." },
      { title: "Parâmetros úteis", body: "--ar define a proporção (ex: --ar 16:9), --v escolhe a versão do modelo, e --style ajusta o quão literal ou artístico é o resultado. Esses parâmetros vão no final do prompt." },
      { title: "Refinar em vez de gerar do zero de novo", body: "Depois das 4 variações, dá pra pedir upscale (U) ou variações (V) de uma específica em vez de escrever um prompt novo — itera mais rápido sobre uma ideia que já está no caminho certo." },
    ],
    flashcards: [
      { front: "Onde o Midjourney funciona?", back: "Através de um servidor no Discord, usando o comando /imagine." },
      { front: "Pra que serve o parâmetro --ar?", back: "Define a proporção da imagem, como 16:9 para formato widescreen." },
      { front: "Como iterar sobre uma imagem boa sem começar do zero?", back: "Usando as opções de upscale (U) ou variação (V) daquela imagem específica." },
    ],
    exercise: { title: "Gere sua primeira imagem", instructions: "Configure o Discord do Midjourney e gere uma imagem com /imagine, incluindo sujeito, estilo e iluminação no prompt. Experimente o --ar." },
  },
  "4_l3": {
    cards: [
      { title: "Geração direto na conversa", body: "Dentro do ChatGPT, basta descrever a imagem que você quer e ele gera usando o DALL-E integrado — sem precisar de outra ferramenta ou configuração separada." },
      { title: "Bom para iteração rápida", body: "Como está na mesma conversa, dá pra pedir ajustes em linguagem natural (\"deixe mais colorido\", \"tire o texto\") sem reescrever o prompt do zero — ótimo pra protótipos rápidos." },
      { title: "Limitações em relação a ferramentas dedicadas", body: "O controle fino de estilo e composição é mais limitado que em ferramentas especializadas como Midjourney — ótimo pra mockups, menos indicado quando o resultado final precisa de refinamento visual." },
    ],
    flashcards: [
      { front: "Como gerar imagens com DALL-E dentro do ChatGPT?", back: "Basta descrever a imagem na conversa — não precisa de ferramenta separada." },
      { front: "Qual a vantagem de gerar imagem direto no ChatGPT?", back: "Dá pra pedir ajustes em linguagem natural, sem reescrever o prompt do zero." },
      { front: "Quando vale mais usar uma ferramenta dedicada em vez do DALL-E no ChatGPT?", back: "Quando o resultado final precisa de controle fino de estilo e composição." },
    ],
    exercise: { title: "Gere um mockup rápido", instructions: "Peça ao ChatGPT pra gerar uma imagem de um produto ou post relacionado ao seu trabalho. Peça pelo menos um ajuste em linguagem natural." },
  },
  "4_l4": {
    cards: [
      { title: "Defina a paleta e o estilo antes de gerar tudo", body: "Antes de criar banner, avatar e post separadamente, gere primeiro uma imagem de referência de estilo e cor, e reutilize essa descrição nos prompts seguintes — mantém coerência visual." },
      { title: "Gere variações do mesmo prompt-base", body: "Para banner, avatar e post, use o mesmo prompt-base de estilo, mudando só o \"sujeito\" e a proporção — mais rápido e mais consistente do que criar cada peça com um prompt totalmente novo." },
      { title: "Exportação em alta resolução", body: "Para uso comercial (impressão, banners grandes), sempre gere ou faça upscale na maior resolução disponível antes de considerar o arquivo final pronto." },
    ],
    flashcards: [
      { front: "Por que gerar uma imagem de referência de estilo antes das outras peças?", back: "Pra manter coerência visual reutilizando a mesma descrição de estilo e cor." },
      { front: "Como manter consistência entre banner, avatar e post?", back: "Usar o mesmo prompt-base de estilo, mudando só o sujeito e a proporção." },
      { front: "O que verificar antes de considerar uma imagem pronta para uso comercial?", back: "Se está na maior resolução disponível, com upscale se necessário." },
    ],
    exercise: { title: "Crie um mini kit visual", instructions: "Escolha uma marca fictícia (ou a sua). Gere um prompt-base de estilo e cor, depois use variações dele pra criar um avatar e um post." },
  },
  "4_l5": {
    cards: [
      { title: "Uso comercial varia por ferramenta", body: "Cada ferramenta tem termos próprios sobre quem detém os direitos da imagem gerada e se pode ser usada comercialmente — vale checar os termos antes de usar em algo pago ou publicado profissionalmente." },
      { title: "Atribuição e originalidade", body: "Imagens geradas por IA não são \"cópias\" diretas de obras específicas, mas são criadas a partir de padrões aprendidos de milhões de imagens existentes — isso alimenta debates sobre originalidade e direitos dos artistas originais." },
      { title: "Transparência é uma boa prática", body: "Em contextos profissionais ou editoriais, é boa prática sinalizar quando uma imagem foi gerada por IA, especialmente se pode ser confundida com uma fotografia real." },
    ],
    flashcards: [
      { front: "O uso comercial de imagens geradas por IA é igual em todas as ferramentas?", back: "Não — cada ferramenta tem termos próprios, vale checar antes de usar comercialmente." },
      { front: "Por que existe debate sobre originalidade em imagens geradas por IA?", back: "Porque os modelos aprendem padrões de milhões de imagens existentes, levantando questões sobre os artistas originais." },
      { front: "O que é boa prática ao publicar uma imagem gerada por IA?", back: "Sinalizar que foi gerada por IA, especialmente se pode ser confundida com uma foto real." },
    ],
    exercise: { title: "Confira os termos", instructions: "Escolha a ferramenta de imagem que mais usa (ou pretende usar) e leia os termos de uso sobre direitos comerciais. Anote o que descobriu." },
  },
  "5_l1": {
    cards: [
      { title: "Busca aumentada por IA", body: "Em vez de devolver uma lista de links pra você investigar, o Perplexity lê várias fontes e devolve uma resposta direta, já sintetizada, com as fontes citadas ao lado de cada afirmação." },
      { title: "Citação de fontes reduz (mas não elimina) alucinação", body: "Como cada afirmação vem com a fonte de onde foi tirada, é mais fácil conferir se a informação é real — mas ainda vale checar a fonte original em decisões importantes." },
      { title: "Quando ainda prefira o Google", body: "Para navegação simples (achar o site de uma empresa) ou buscas muito recentes/locais, o Google tradicional pode ser mais rápido. O Perplexity brilha mais em perguntas que pedem síntese de várias fontes." },
    ],
    flashcards: [
      { front: "Qual a principal diferença entre Perplexity e busca tradicional do Google?", back: "O Perplexity sintetiza uma resposta direta a partir de várias fontes, em vez de só listar links." },
      { front: "Por que ainda vale checar a fonte original mesmo com a citação do Perplexity?", back: "Porque a síntese pode simplificar demais a informação original." },
      { front: "Quando o Google tradicional ainda pode ser melhor?", back: "Pra navegação simples ou buscas muito recentes/locais." },
    ],
    exercise: { title: "Compare os dois", instructions: "Faça a mesma pergunta de pesquisa no Google e no Perplexity. Compare: qual deu uma resposta mais rápida de usar? Qual você confiaria mais sem checar mais nada?" },
  },
  "5_l2": {
    cards: [
      { title: "Modo Focus", body: "O Perplexity permite restringir a busca a um tipo de fonte específico — acadêmico, YouTube, Reddit, ou web em geral. Usar o modo certo pra sua pergunta melhora muito a qualidade das fontes citadas." },
      { title: "Perguntas de acompanhamento mantêm o contexto", body: "Assim como num chat normal, dá pra fazer perguntas de acompanhamento que se baseiam na busca anterior, sem precisar reformular tudo do zero." },
      { title: "Peça pra comparar fontes divergentes", body: "Se um tema tem opiniões conflitantes, peça \"quais fontes discordam entre si e por quê?\" — isso expõe o debate em vez de esconder atrás de uma resposta única." },
    ],
    flashcards: [
      { front: "O que é o modo Focus no Perplexity?", back: "Uma forma de restringir a busca a um tipo específico de fonte, como acadêmico ou Reddit." },
      { front: "Dá pra fazer perguntas de acompanhamento no Perplexity?", back: "Sim, mantendo o contexto da busca anterior, sem reformular do zero." },
      { front: "Como expor um debate com opiniões divergentes?", back: "Perguntando explicitamente quais fontes discordam entre si e por quê." },
    ],
    exercise: { title: "Pesquise com Focus", instructions: "Escolha um tema técnico da sua área e pesquise no Perplexity usando o modo Focus acadêmico. Compare com uma busca no modo padrão." },
  },
  "5_l3": {
    cards: [
      { title: "O que são Spaces", body: "Spaces são espaços de trabalho dentro do Perplexity onde você organiza pesquisas por tema e, em alguns casos, configura atualizações contínuas sobre um assunto específico." },
      { title: "Bom para acompanhar concorrência ou setor", body: "Configurar um Space pra acompanhar notícias do seu setor ou concorrentes economiza a tarefa manual de checar múltiplos sites toda semana." },
      { title: "Combine com uma rotina, não substitua o julgamento", body: "Alertas automáticos trazem volume, mas cabe a você decidir o que é relevante — trate como uma triagem inicial, não como a análise final." },
    ],
    flashcards: [
      { front: "O que são Spaces no Perplexity?", back: "Espaços de trabalho pra organizar pesquisas por tema, com possibilidade de atualizações contínuas." },
      { front: "Pra que serve configurar um Space de monitoramento de concorrência?", back: "Pra economizar a tarefa manual de checar múltiplos sites toda semana." },
      { front: "Alertas automáticos substituem sua análise?", back: "Não — servem como triagem inicial, a decisão do que é relevante ainda é sua." },
    ],
    exercise: { title: "Configure um Space", instructions: "Crie um Space no Perplexity pra acompanhar um tema relevante pro seu trabalho e veja o que ele traz depois de alguns dias." },
  },
  "5_l4": {
    cards: [
      { title: "Defina a pergunta central primeiro", body: "Antes de pesquisar, escreva a pergunta exata que o relatório precisa responder — evita divagar em buscas amplas demais que geram informação difícil de organizar depois." },
      { title: "Peça a estrutura junto com a pesquisa", body: "Em vez de só pedir informações soltas, peça \"pesquise X e organize em: contexto, principais dados, riscos e recomendação\" — entrega algo perto do formato final." },
      { title: "Revise as fontes antes de apresentar", body: "Para um relatório que vai ser apresentado a outras pessoas, abra pelo menos as fontes principais citadas pra confirmar que o contexto bate com o que foi resumido." },
    ],
    flashcards: [
      { front: "Por que definir a pergunta central antes de pesquisar?", back: "Evita buscas amplas demais que geram informação difícil de organizar depois." },
      { front: "Como pedir um resultado já perto do formato final?", back: "Pedindo a pesquisa organizada em categorias: contexto, dados, riscos, recomendação." },
      { front: "Por que revisar as fontes citadas antes de apresentar?", back: "Pra confirmar que o contexto original bate com o que foi resumido." },
    ],
    exercise: { title: "Monte um relatório rápido", instructions: "Escolha uma pergunta de mercado relevante pro seu trabalho. Peça ao Perplexity uma pesquisa organizada em contexto, dados, riscos e recomendação." },
  },
};

const EXPLORE_CATEGORIES = [
  { id: "produtividade", label: "Produtividade", icon: "⚡" },
  { id: "automacao", label: "Automação", icon: "🔄" },
  { id: "carreira", label: "Carreira", icon: "🚀" },
  { id: "criatividade", label: "Criatividade", icon: "🎨" },
  { id: "dados", label: "Dados", icon: "📊" },
];

function ExploreTab({ T }) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedTrail, setSelectedTrail] = useState(null);
  const [openLesson, setOpenLesson] = useState(null); // { trailId, lesson } or null
  const [flipped, setFlipped] = useState(new Set());

  const totalLessons = (trail) => trail.modules.reduce((sum, m) => sum + m.lessons.length, 0);

  const filtered = EXPLORE_TRAILS.filter(t => {
    const q = query.toLowerCase();
    const matchesQuery = !q || t.title.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q) || t.level.toLowerCase().includes(q);
    const matchesCategory = !activeCategory || t.category === activeCategory;
    return matchesQuery && matchesCategory;
  });

  const tagStyles = {
    teoria: { bg: '#1e2a4a', color: '#60a5fa' },
    prática: { bg: '#1a3a2a', color: '#4ade80' },
    projeto: { bg: '#3a2a10', color: '#fbbf24' },
  };

  if (openLesson) {
    const content = EXPLORE_LESSON_CONTENT[`${openLesson.trailId}_${openLesson.lesson.id}`];
    return (
      <div style={{ animation: "fadeUp .4s ease" }}>
        <button onClick={() => { setOpenLesson(null); setFlipped(new Set()); }} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 9, padding: "7px 12px", cursor: "pointer", color: T.textSecondary, fontSize: 13, fontFamily: "'Source Serif 4',serif", marginBottom: 18 }}>← Voltar</button>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: T.textPrimary, marginBottom: 20 }}>{openLesson.lesson.title}</h2>
        {!content ? (
          <div style={{ padding: 20, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, textAlign: "center" }}>
            <p style={{ fontSize: 13, color: T.textSecondary }}>Estamos preparando o conteúdo completo desta aula. Volte em breve.</p>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
              {content.cards.map((card, i) => (
                <Card T={T} key={i}>
                  <p style={{ fontWeight: 700, fontSize: 14, color: T.textPrimary, marginBottom: 8 }}>{card.title}</p>
                  <p style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.8 }}>{card.body}</p>
                </Card>
              ))}
            </div>
            {content.flashcards?.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: T.textSecondary, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>Flashcards de revisão</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {content.flashcards.map((fc, i) => {
                    const isFlipped = flipped.has(i);
                    return (
                      <div key={i} onClick={() => setFlipped(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; })} style={{ background: isFlipped ? T.accentDim : T.card, border: `1px solid ${isFlipped ? T.accent + "44" : T.border}`, borderRadius: 12, padding: "14px 16px", cursor: "pointer" }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: isFlipped ? T.accent : T.textDim, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>{isFlipped ? "Resposta" : "Pergunta"}</p>
                        <p style={{ fontSize: 13, color: T.textPrimary, lineHeight: 1.6 }}>{isFlipped ? fc.back : fc.front}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {content.exercise && (
              <div style={{ background: T.accentDim, border: `1px solid ${T.accent}33`, borderRadius: 14, padding: "16px" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Exercício prático</p>
                <p style={{ fontWeight: 700, fontSize: 14, color: T.textPrimary, marginBottom: 6 }}>{content.exercise.title}</p>
                <p style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.7 }}>{content.exercise.instructions}</p>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  if (selectedTrail) {
    let lessonCounter = 0;
    return (
      <div style={{ animation: "fadeUp .4s ease", position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
        <img src="/bg-explorar.svg" alt="" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.08, pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <button onClick={() => setSelectedTrail(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: T.accent, fontFamily: "'Source Serif 4',serif", fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 18, padding: '4px 0' }}>
            ← Voltar
          </button>
          <Card T={T} style={{ padding: '20px 18px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: `linear-gradient(135deg,${T.accent},${T.accentLight || T.green})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>{selectedTrail.icon}</div>
              <div>
                <p style={{ fontWeight: 900, fontSize: 17, color: T.textPrimary, marginBottom: 4 }}>{selectedTrail.title}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: selectedTrail.level === 'Iniciante' ? T.greenDim : T.amberDim, color: selectedTrail.level === 'Iniciante' ? T.green : T.amber, fontFamily: "'JetBrains Mono',monospace" }}>{selectedTrail.level}</span>
                  <span style={{ fontSize: 11, color: T.textDim, fontFamily: "'JetBrains Mono',monospace" }}>📖 {totalLessons(selectedTrail)} aulas</span>
                </div>
              </div>
            </div>
            <p style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.6 }}>{selectedTrail.desc}</p>
          </Card>
          {selectedTrail.modules.map(mod => (
            <div key={mod.id} style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: T.textDim, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 10, fontFamily: "'JetBrains Mono',monospace" }}>{mod.title}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {mod.lessons.map(lesson => {
                  lessonCounter++;
                  const num = lessonCounter;
                  const ts = tagStyles[lesson.tag] || tagStyles.teoria;
                  return (
                    <Card T={T} key={lesson.id} onClick={() => setOpenLesson({ trailId: selectedTrail.id, lesson })} style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: T.accentDim, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: T.accent, flexShrink: 0, fontFamily: "'JetBrains Mono',monospace" }}>{num}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                            <p style={{ fontWeight: 800, fontSize: 14, color: T.textPrimary }}>{lesson.title}</p>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: ts.bg, color: ts.color, fontFamily: "'JetBrains Mono',monospace" }}>{lesson.tag}</span>
                          </div>
                          <p style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.6 }}>{lesson.desc}</p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeUp .4s ease", position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <img src="/bg-explorar.svg" alt="" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.08, pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
      {/* Search bar */}
      <div data-tour="explore-search" style={{ position: "relative", marginBottom: 22 }}>
        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 15, pointerEvents: "none" }}>🔍</span>
        <input
          placeholder="Buscar trilhas, temas ou aulas..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          style={{ width: "100%", background: T.surface, border: `1px solid ${searchFocused ? T.accent : T.border}`, borderRadius: 13, color: T.textPrimary, fontFamily: "'Source Serif 4',serif", fontSize: 14, padding: "13px 14px 13px 40px", outline: "none", transition: "border .2s", boxShadow: searchFocused ? `0 0 0 3px ${T.accentDim}` : "none", boxSizing: "border-box" }}
        />
      </div>

      {/* Categorias */}
      <p style={{ fontSize: 11, fontWeight: 800, color: T.textDim, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 10, fontFamily: "'JetBrains Mono',monospace" }}>Categorias</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
        {EXPLORE_CATEGORIES.map(cat => {
          const active = activeCategory === cat.id;
          return (
            <button key={cat.id} onClick={() => setActiveCategory(active ? null : cat.id)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 13px", border: `1.5px solid ${active ? T.accent : T.border}`, borderRadius: 20, background: active ? T.accentDim : "transparent", color: active ? T.accent : T.textSecondary, fontSize: 13, fontWeight: active ? 700 : 500, fontFamily: "'Source Serif 4',serif", cursor: "pointer", transition: "all .15s", boxShadow: active ? `0 0 0 1px ${T.accent}` : "none" }}>
              <span>{cat.icon}</span>{cat.label}
            </button>
          );
        })}
      </div>

      {/* Em destaque */}
      <p style={{ fontSize: 11, fontWeight: 800, color: T.textDim, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 12, fontFamily: "'JetBrains Mono',monospace" }}>Em destaque</p>
      {filtered.length === 0 ? (
        <Card T={T} style={{ textAlign: "center", padding: "32px 20px" }}>
          <div style={{ fontSize: 38, marginBottom: 10 }}>🔍</div>
          <p style={{ fontWeight: 800, fontSize: 15, color: T.textPrimary, marginBottom: 4 }}>Nenhum resultado</p>
          <p style={{ color: T.textSecondary, fontSize: 13 }}>Tente outro termo de busca.</p>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map(trail => (
            <Card T={T} key={trail.id} style={{ padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div style={{ width: 46, height: 46, borderRadius: 13, background: `linear-gradient(135deg,${T.accent},${T.accentLight || T.green})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{trail.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 900, fontSize: 15, color: T.textPrimary, marginBottom: 3 }}>{trail.title}</p>
                  <p style={{ fontSize: 13, color: T.textSecondary, marginBottom: 8, lineHeight: 1.5 }}>{trail.desc}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: trail.level === "Iniciante" ? T.greenDim : T.amberDim, color: trail.level === "Iniciante" ? T.green : T.amber, fontFamily: "'JetBrains Mono',monospace" }}>{trail.level}</span>
                    <span style={{ fontSize: 11, color: T.textDim, fontFamily: "'JetBrains Mono',monospace" }}>📖 {totalLessons(trail)} aulas</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedTrail(trail)} style={{ marginTop: 14, width: "100%", padding: "10px 0", background: T.accentDim, border: `1px solid ${T.accent}33`, borderRadius: 10, color: T.accent, fontSize: 13, fontWeight: 800, fontFamily: "'Source Serif 4',serif", cursor: "pointer", transition: "all .15s" }}
                onMouseEnter={e => { e.currentTarget.style.background = T.accent; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.background = T.accentDim; e.currentTarget.style.color = T.accent; }}>
                Ver trilha →
              </button>
            </Card>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

// ─── Dashboard ─────────────────────────────────────────────────────────────
function Dashboard({ T, user, updateUser, addXP, addToast, onLogout, onRestart, themeKey, toggleTheme }) {
  const [tab, setTab] = useState("home");
  const [showProfile, setShowProfile] = useState(false);
  const [showMiniMenu, setShowMiniMenu] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const navTo = useCallback(t => setTab(t), []);
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
    if (!getTutorialDone()) setShowTutorial(true);
  }, []);

  const completeMission = useCallback((mId) => {
    const key = mId + "_" + getTodayStr();
    const cur = userRef.current;
    const completed = cur.completedMissions || [];
    if (completed.includes(key)) return;
    const m = DAILY_MISSIONS.find(x => x.id === mId) || HOME_MISSIONS_DEF.find(x => x.id === mId);
    if (!m) return;
    updateUser({ ...cur, completedMissions: [...completed, key] });
    addXP(m.xp);
    addToast(`${m.icon ? m.icon + " " : "✓ "}Missão concluída! +${m.xp} XP`);
  }, [updateUser, addXP, addToast]);

  return (
    <div className="rv-shell-root" style={{ minHeight: "100vh", background: T.bg }}>
      {/* Navbar */}
      <div style={{ background: T.navBg, borderBottom: `1px solid ${T.border}`, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(16px)" }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: T.textPrimary, fontFamily: "'Source Serif 4', serif" }}>Riv<span style={{ color: T.accent, fontWeight: 900 }}>.IA</span></span>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={toggleTheme} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 9, padding: "5px 9px", cursor: "pointer", fontSize: 14 }}>{themeKey === "dark" ? "☀️" : "🌙"}</button>
          <button data-tour="profile-avatar" onClick={() => setShowMiniMenu(m => !m)} style={{ width: 32, height: 32, borderRadius: 10, background: T.accent, border: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: user.settings?.avatarType === "photo" || !user.settings?.avatar ? 13 : 17, fontWeight: 700, color: "#fff", cursor: "pointer", overflow: "hidden" }}>
            {user.settings?.avatarType === "photo" && getProfilePhoto()
              ? <img src={getProfilePhoto()} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
              : (user.settings?.avatarType === "emoji" ? user.settings.avatar : (user.settings?.avatar || (user.name || "?")[0].toUpperCase()))
            }
          </button>
        </div>
      </div>

      <div className="rv-shell-content" style={{ margin: "0 auto", padding: "18px 14px" }}>
        {tab === "home" && <HomeTab T={T} user={user} updateUser={updateUser} addXP={addXP} addToast={addToast} navTo={navTo} onProfileClick={() => setShowMiniMenu(m => !m)} />}
        {tab === "trail" && <TrailTab T={T} user={user} updateUser={updateUser} addXP={addXP} addToast={addToast} completeMission={completeMission} />}
        {tab === "explore" && <ExploreTab T={T} />}
        {tab === "notes" && <NotesTab T={T} user={user} updateUser={updateUser} addXP={addXP} addToast={addToast} completeMission={completeMission} />}
        {tab === "estudar" && <EstudarTab T={T} user={user} updateUser={updateUser} addXP={addXP} addToast={addToast} completeMission={completeMission} />}
        {tab === "tutor" && <TutorTab T={T} user={user} updateUser={updateUser} addXP={addXP} addToast={addToast} completeMission={completeMission} />}
        {tab === "rank" && <RankTab T={T} user={user} />}
      </div>

      {/* Sidebar nav (desktop) */}
      <div className="rv-sidebar" style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 196, background: T.surface, borderRight: `1px solid ${T.border}`, flexDirection: "column", padding: "18px 10px", zIndex: 90 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: T.textPrimary, padding: "0 8px", marginBottom: 22 }}>Riv<span style={{ color: T.accent }}>.IA</span></p>
        {NAV_ITEMS.map(item => (
          <button key={item.id} onClick={() => setTab(item.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, background: tab === item.id ? T.accentDim : "transparent", border: "none", cursor: "pointer", textAlign: "left", marginBottom: 2 }}>
            <span style={{ fontSize: 16, opacity: tab === item.id ? 1 : 0.55 }}>{item.icon}</span>
            <span style={{ fontSize: 13, fontWeight: tab === item.id ? 700 : 500, color: tab === item.id ? T.accent : T.textSecondary }}>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Bottom nav (mobile) */}
      <div className="rv-bottomnav" style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: themeKey === "dark" ? "#1B1B24" : T.navBg, borderTop: `1px solid ${T.border}`, zIndex: 100, backdropFilter: "blur(16px)" }}>
        {NAV_ITEMS.map(item => (
          <button key={item.id} onClick={() => setTab(item.id)} style={{ flex: 1, padding: "8px 0 9px", background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, fontFamily: "'Source Serif 4',serif" }}>
            <span style={{ fontSize: 18, filter: tab === item.id ? "none" : "grayscale(80%) opacity(.45)", transform: tab === item.id ? "scale(1.16)" : "scale(1)", transition: "all .15s", color: tab === item.id && item.id === "tutor" ? T.accent : undefined }}>{item.icon}</span>
            <span style={{ fontSize: 9, fontWeight: tab === item.id ? 800 : 500, color: tab === item.id ? (themeKey === "dark" ? "#6C4DFF" : T.accent) : (themeKey === "dark" ? "#9CA3AF" : T.textDim) }}>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Mini Profile Menu */}
      {showMiniMenu && (
        <MiniProfileMenu
          T={T}
          user={user}
          onEditPhoto={() => setShowPhotoModal(true)}
          onOpenProfile={() => setShowProfile(true)}
          onTutorial={() => setShowTutorial(true)}
          onOpenNotes={() => setTab("notes")}
          onLogout={() => { setShowMiniMenu(false); onLogout(); }}
          onClose={() => setShowMiniMenu(false)}
        />
      )}
      {/* Profile Photo Modal */}
      {showPhotoModal && <ProfilePhotoModal T={T} user={user} updateUser={updateUser} addToast={addToast} onClose={() => setShowPhotoModal(false)} />}
      {/* Profile Modal */}
      {showProfile && <ProfileModal T={T} user={user} updateUser={updateUser} onLogout={onLogout} onRestart={onRestart} addToast={addToast} onClose={() => setShowProfile(false)} />}
      {/* Tutorial */}
      {showTutorial && <GuidedTour T={T} setTab={setTab} onDone={() => { markTutorialDone(); setShowTutorial(false); setTab("home"); }} />}
    </div>
  );
}

// ─── Profile Modal ─────────────────────────────────────────────────────────
function StudyHeatmap({ T }) {
  const heatmap = getHeatmap();
  const today = new Date();
  const currentYear = today.getFullYear();

  const days = [];
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ key, mins: heatmap[key] || 0, date: d });
  }

  const studyDays = days.filter(d => d.mins > 0).length;

  const getColor = (mins) => {
    if (mins === 0) return '#1B1B24';
    if (mins <= 15) return '#3D2B6B';
    if (mins <= 30) return '#5B3D9E';
    if (mins <= 60) return '#7C4DFF';
    return '#A78BFA';
  };

  const startDow = days[0].date.getDay();
  const padded = [...Array(startDow).fill(null), ...days];

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <p style={{ fontSize: 11, fontWeight: 800, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: "'JetBrains Mono',monospace" }}>Sua consistência</p>
        <span style={{ fontSize: 11, fontWeight: 700, color: T.accent, fontFamily: "'JetBrains Mono',monospace" }}>{studyDays} dias em {currentYear}</span>
      </div>
      <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
        <div style={{ display: 'grid', gridTemplateRows: 'repeat(7, 10px)', gridAutoFlow: 'column', gap: 2, width: 'max-content' }}>
          {padded.map((day, i) => (
            <div
              key={i}
              title={day ? `${day.mins} min estudados em ${day.date.toLocaleDateString('pt-BR')}` : ''}
              style={{ width: 10, height: 10, borderRadius: 2, background: day ? getColor(day.mins) : 'transparent' }}
            />
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 10, color: T.textDim }}>Menos</span>
        {['#1B1B24', '#3D2B6B', '#5B3D9E', '#7C4DFF', '#A78BFA'].map(c => (
          <div key={c} style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
        ))}
        <span style={{ fontSize: 10, color: T.textDim }}>Mais</span>
      </div>
    </div>
  );
}

function ProfileModal({ T, user, updateUser, onLogout, onRestart, addToast, onClose }) {
  const [name, setName] = useState(user.name || "");
  const [nickname, setNickname] = useState(user.settings?.nickname || "");
  const [avatar, setAvatar] = useState(user.settings?.avatar || "");
  const [goal, setGoal] = useState(user.settings?.dailyGoal || 1);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const { lvl, title, pct } = getLevel(user.xp || 0);

  function save() {
    updateUser({ ...user, name, settings: { ...(user.settings || {}), dailyGoal: goal, nickname: nickname || null, avatar: avatar || null } });
    addToast("✓ Perfil atualizado!");
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ position: "absolute", inset: 0, background: "#000a", animation: "overlayIn .25s ease" }} onClick={onClose} />
      <div style={{ position: "relative", width: "100%", maxWidth: 520, background: T.card, border: `1px solid ${T.border}`, borderRadius: "20px 20px 0 0", padding: "24px 22px 32px", animation: "modalIn .3s ease", maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontWeight: 900, fontSize: 17, color: T.textPrimary }}>Meu Perfil</h3>
          <button onClick={onClose} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "5px 10px", cursor: "pointer", color: T.textSecondary, fontSize: 14, fontFamily: "'Source Serif 4',serif" }}>✕</button>
        </div>
        {/* Avatar + level */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, padding: "14px", background: T.surface, borderRadius: 14, border: `1px solid ${T.border}` }}>
          <div onClick={() => setShowAvatarPicker(p => !p)} style={{ width: 56, height: 56, borderRadius: 16, background: `linear-gradient(135deg,${T.accent},${T.accentLight||T.green})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: avatar ? 26 : 22, fontWeight: 900, color: "#fff", flexShrink: 0, cursor: "pointer", position: "relative" }}>
            {avatar || (user.name || "?")[0].toUpperCase()}
            <div style={{ position: "absolute", bottom: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: T.accent, border: `2px solid ${T.card}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>✏️</div>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 800, fontSize: 15, color: T.textPrimary }}>{nickname || user.name}</p>
            <p style={{ fontSize: 12, color: T.accent, fontWeight: 700 }}>Nível {lvl} — {title}</p>
            <div style={{ height: 4, background: T.border, borderRadius: 4, marginTop: 6, overflow: "hidden" }}>
              <div style={{ height: 4, background: `linear-gradient(90deg,${T.accent},${T.accentLight||T.green})`, width: pct + "%" }} />
            </div>
            <p style={{ fontSize: 11, color: T.textDim, marginTop: 3 }}>{user.xp || 0} XP · {500 - ((user.xp || 0) % 500)} para o próx. nível</p>
          </div>
        </div>
        {/* Avatar picker */}
        {showAvatarPicker && (
          <div style={{ marginBottom: 16, padding: 14, background: T.surface, borderRadius: 14, border: `1px solid ${T.border}` }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: T.textSecondary, marginBottom: 10 }}>Escolha seu avatar</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 6 }}>
              {AVATAR_OPTIONS.map(em => (
                <div key={em} onClick={() => { setAvatar(em); setShowAvatarPicker(false); }} style={{ width: "100%", aspectRatio: "1", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, cursor: "pointer", background: avatar === em ? T.accentDim : "transparent", border: `1.5px solid ${avatar === em ? T.accent : T.border}`, transition: "all .15s" }}>{em}</div>
              ))}
              <div onClick={() => { setAvatar(""); setShowAvatarPicker(false); }} style={{ width: "100%", aspectRatio: "1", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, cursor: "pointer", background: !avatar ? T.accentDim : "transparent", border: `1.5px solid ${!avatar ? T.accent : T.border}`, color: T.textDim, transition: "all .15s" }}>A</div>
            </div>
          </div>
        )}
        {/* Edit */}
        <p style={{ fontSize: 13, color: T.textSecondary, fontWeight: 700, marginBottom: 6 }}>Nome completo</p>
        <TInput T={T} placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} style={{ marginBottom: 10 }} />
        <p style={{ fontSize: 13, color: T.textSecondary, fontWeight: 700, marginBottom: 6 }}>Apelido <span style={{ color: T.textDim, fontWeight: 500, fontSize: 12 }}>(aparece no app)</span></p>
        <TInput T={T} placeholder="Como prefere ser chamado?" value={nickname} onChange={e => setNickname(e.target.value)} style={{ marginBottom: 14 }} />
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <p style={{ fontSize: 13, color: T.textSecondary, fontWeight: 700 }}>Meta diária</p>
          <span style={{ fontSize: 17, fontWeight: 900, color: T.accent, fontFamily: "'JetBrains Mono',monospace" }}>{goal}h</span>
        </div>
        <input type="range" min={1} max={5} step={1} value={goal} onChange={e => setGoal(Number(e.target.value))} style={{ width: "100%", accentColor: T.accent, background: "transparent", border: "none", padding: 0, cursor: "pointer", marginBottom: 18 }} />
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 18 }}>
          {[{ l: "Streak", v: `${user.streak||0}🔥` }, { l: "Conquistas", v: `${(user.achievements||[]).length}/${ACHIEVEMENTS.length}` }, { l: "Notas", v: (user.notes||[]).length }].map(s => (
            <div key={s.l} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
              <p style={{ fontSize: 18, fontWeight: 900, color: T.accent, fontFamily: "'JetBrains Mono',monospace" }}>{s.v}</p>
              <p style={{ fontSize: 10, color: T.textDim, marginTop: 2 }}>{s.l}</p>
            </div>
          ))}
        </div>
        <StudyHeatmap T={T} />
        <BtnPrimary T={T} onClick={save} style={{ marginBottom: 10 }}>Salvar alterações</BtnPrimary>
        <button onClick={onRestart} style={{ width: "100%", padding: "12px", background: T.accentDim, border: `1px solid ${T.accent}33`, borderRadius: 12, color: T.accent, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Source Serif 4',serif", marginBottom: 8 }}>🔄 Gerar novo curso</button>
        <button onClick={onLogout} style={{ width: "100%", padding: "12px", background: T.redDim, border: `1px solid ${T.red}33`, borderRadius: 12, color: T.red, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Source Serif 4',serif" }}>Sair da conta</button>
        {/* PWA hint */}
        <div style={{ marginTop: 14, padding: "12px 14px", background: T.accentDim, border: `1px solid ${T.accent}22`, borderRadius: 12, textAlign: "center" }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: T.accent, marginBottom: 3 }}>📱 Instalar como app</p>
          <p style={{ fontSize: 11, color: T.textSecondary, lineHeight: 1.5 }}>Android: menu ⋮ → "Adicionar à tela inicial" · iPhone: compartilhar → "Adicionar à Tela de Início"</p>
        </div>
      </div>
    </div>
  );
}

// ─── Home Tab ──────────────────────────────────────────────────────────────
function HomeTab({ T, user, updateUser, addXP, addToast, navTo, onProfileClick }) {
  const completedTopics = user.completedTopics || [];
  const displayName = user.settings?.nickname || user.name?.split(" ")[0] || "Estudante";

  const totalTopics = user.course?.phases?.reduce((s, p) => s + (p.days?.length || 0), 0) || 0;
  const progressPct = totalTopics > 0 ? Math.round((completedTopics.length / totalTopics) * 100) : 0;
  const allDone = totalTopics > 0 && completedTopics.length >= totalTopics;

  const hour = new Date().getHours();
  const subtitle = hour < 12 ? "Pronto para evoluir hoje?"
    : hour < 18 ? "Boa tarde! Vamos continuar?"
    : "Boa noite! Mais um dia de evolução.";

  const completedPhases = (user.course?.phases || []).filter((p, pi) =>
    (p.days || []).every((_, di) => completedTopics.includes(`${pi}_${di}`))
  ).length;

  const tutorQuestions = user.chatHistory?.filter(m => m.role === "user").length || 0;

  const phasesInProgress = (user.course?.phases || []).map((p, pi) => {
    const total = p.days?.length || 0;
    const done = (p.days || []).filter((_, di) => completedTopics.includes(`${pi}_${di}`)).length;
    return { phase: p, pi, done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  }).filter(p => p.done > 0 && p.done < p.total).reverse();

  const phasesToShow = phasesInProgress.length > 0 ? phasesInProgress
    : (user.course?.phases || []).map((p, pi) => ({
      phase: p, pi,
      done: (p.days || []).filter((_, di) => completedTopics.includes(`${pi}_${di}`)).length,
      total: p.days?.length || 0, pct: 0,
    }));

  return (
    <div style={{ animation: "fadeUp .4s ease", position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <img src="/bg-inicio.svg" alt="" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.08, pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 700, color: T.textPrimary, marginBottom: 3 }}>Olá, {displayName}</h1>
          <p style={{ fontSize: 13, color: T.textSecondary }}>{subtitle}</p>
        </div>
        <button onClick={onProfileClick} style={{ width: 40, height: 40, borderRadius: 10, background: T.surface, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: user.settings?.avatarType === "photo" || !user.settings?.avatar ? 14 : 18, fontWeight: 700, color: T.textPrimary, cursor: "pointer", flexShrink: 0, overflow: "hidden" }}>
          {user.settings?.avatarType === "photo" && getProfilePhoto()
            ? <img src={getProfilePhoto()} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
            : (user.settings?.avatarType === "emoji" ? user.settings.avatar : (user.settings?.avatar || (user.name || "?")[0].toUpperCase()))
          }
        </button>
      </div>

      {/* Card "Sua trilha" */}
      {user.course && (
        <Card T={T} data-tour="home-trail" style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: T.textSecondary, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>Sua trilha</p>
          <p style={{ fontWeight: 700, fontSize: 16, color: T.textPrimary, marginBottom: 12 }}>{user.course.headline || user.course.title || "Trilha atual"}</p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: T.textSecondary }}>{completedTopics.length} de {totalTopics} aulas</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, fontFamily: "'JetBrains Mono',monospace" }}>{progressPct}%</span>
          </div>
          <div style={{ height: 6, background: T.border, borderRadius: 4, overflow: "hidden", marginBottom: 14 }}>
            <div style={{ height: 6, background: allDone ? T.green : T.accent, width: progressPct + "%", borderRadius: 4, transition: "width .6s ease" }} />
          </div>
          <button onClick={() => navTo("trail")}
            style={{ width: "100%", padding: "12px 0", background: allDone ? T.green : T.accent, border: "none", borderRadius: 9, color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: "'Source Serif 4',serif", cursor: "pointer" }}>
            {allDone ? "Trilha concluída" : "Continuar trilha →"}
          </button>
        </Card>
      )}

      {/* Card "Seu progresso" */}
      <Card T={T} data-tour="home-progress" style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: T.textSecondary, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 12 }}>Seu progresso</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[
            { value: completedPhases, suffix: "", label: "Trilhas\nconcluídas" },
            { value: tutorQuestions, suffix: "", label: "Perguntas\nao tutor" },
            { value: completedTopics.length, suffix: "", label: "Aulas\nconcluídas" },
          ].map(m => (
            <div key={m.label} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "13px 8px", textAlign: "center" }}>
              <p style={{ fontSize: 18, fontWeight: 700, color: T.textPrimary, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1 }}>{m.value}{m.suffix}</p>
              <p style={{ fontSize: 10, color: T.textDim, marginTop: 6, lineHeight: 1.35, whiteSpace: "pre-line" }}>{m.label}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Continuar aprendendo */}
      {phasesToShow.length > 0 && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: T.textSecondary, textTransform: "uppercase", letterSpacing: ".08em" }}>Continuar aprendendo</p>
            <button onClick={() => navTo("trail")} style={{ background: "none", border: "none", color: T.accent, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Source Serif 4',serif" }}>Ver todas →</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {phasesToShow.map(({ phase, pi, pct }) => (
              <Card T={T} key={pi} style={{ padding: "13px 14px", cursor: "pointer" }} onClick={() => navTo("trail")}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: T.surface, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: T.textSecondary, flexShrink: 0, fontFamily: "'JetBrains Mono',monospace" }}>{String(pi + 1).padStart(2, "0")}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 13, color: T.textPrimary, marginBottom: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{phase.title}</p>
                    <div style={{ height: 4, background: T.border, borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: 4, background: T.accent, width: pct + "%", borderRadius: 4, transition: "width .6s ease" }} />
                    </div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: T.textSecondary, fontFamily: "'JetBrains Mono',monospace", flexShrink: 0, marginLeft: 6 }}>{pct}%</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

// ─── Estudar Tab ────────────────────────────────────────────────────────────
function EstudarTab({ T, user, updateUser, addXP, addToast, completeMission }) {
  const timerState = useRef(loadTimer());
  const [timerSec, setTimerSec] = useState(timerState.current.sec);
  const [running, setRunning] = useState(timerState.current.running);
  const startedAtRef = useRef(timerState.current.running ? Date.now() : null);
  const ivRef = useRef(null);
  const timerSecRef = useRef(timerSec);
  const goalSec = (user.settings?.dailyGoal || user.profile?.hours || 1) * 3600;
  const today = getTodayStr();
  const study30Done = (user.completedMissions || []).includes("study_30_" + today);
  const triggeredRef = useRef(study30Done);

  useEffect(() => { timerSecRef.current = timerSec; }, [timerSec]);

  useEffect(() => {
    if (running) {
      if (!startedAtRef.current) startedAtRef.current = Date.now();
      ivRef.current = setInterval(() => {
        setTimerSec(s => { const n = s + 1; saveTimer(n, true, startedAtRef.current); return n; });
      }, 1000);
    } else {
      clearInterval(ivRef.current);
      saveTimer(timerSecRef.current, false, null);
      startedAtRef.current = null;
    }
    return () => clearInterval(ivRef.current);
  }, [running]);

  useEffect(() => {
    if (timerSec >= 1800 && !triggeredRef.current) {
      triggeredRef.current = true;
      completeMission("study_30");
    }
  }, [timerSec, completeMission]);

  useEffect(() => {
    if (study30Done) triggeredRef.current = true;
  }, [study30Done]);

  function handleStart() {
    if (!running && timerSec === 0) {
      addXP(10, "first_study");
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
  const minStudied = Math.min(30, Math.floor(timerSec / 60));

  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      <h2 style={{ fontSize: 20, fontWeight: 900, color: T.textPrimary, marginBottom: 3 }}>Sessão de Estudo ⏱️</h2>
      <p style={{ color: T.textSecondary, fontSize: 13, marginBottom: 18 }}>Acompanhe seu tempo de estudo diário.</p>

      <Card T={T} style={{ marginBottom: 12, textAlign: "center", background: done ? T.greenDim : T.card, border: `1px solid ${done ? T.green + "44" : T.border}` }}>
        <p style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 8, fontFamily: "'JetBrains Mono',monospace" }}>sessão de hoje</p>
        <div style={{ fontSize: 48, fontWeight: 900, fontFamily: "'JetBrains Mono',monospace", color: done ? T.green : T.textPrimary, marginBottom: 6 }}>{pad(h)}:{pad(m)}:{pad(s)}</div>
        <div style={{ height: 6, background: T.border, borderRadius: 6, marginBottom: 6, overflow: "hidden" }}>
          <div style={{ height: 6, background: done ? `linear-gradient(90deg,${T.green},#00ffcc)` : `linear-gradient(90deg,${T.accent},${T.accentLight||T.green})`, width: pct + "%", borderRadius: 6, transition: "width 1s linear" }} />
        </div>
        <p style={{ fontSize: 12, color: T.textDim, marginBottom: 12 }}>{done ? "🎉 Meta diária concluída!" : `Meta: ${user.settings?.dailyGoal || 1}h — faltam ${Math.max(0, Math.floor((goalSec - timerSec) / 60))}min`}</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <BtnPrimary T={T} style={{ width: "auto", padding: "11px 24px" }} onClick={handleStart}>{running ? "⏸ Pausar" : "▶ Estudar agora"}</BtnPrimary>
          {timerSec > 0 && <button onClick={resetTimer} style={{ padding: "11px 14px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 12, color: T.textSecondary, fontSize: 15, cursor: "pointer", fontFamily: "'Source Serif 4',serif" }}>↺</button>}
        </div>
      </Card>

      <Card T={T}>
        <p style={{ fontSize: 12, fontWeight: 800, color: T.textSecondary, marginBottom: 10, textTransform: "uppercase", letterSpacing: ".06em" }}>Missão vinculada</p>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>⏱️</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, fontSize: 13, color: study30Done ? T.green : T.textPrimary, textDecoration: study30Done ? "line-through" : "none" }}>Sessão de 30min</p>
            <div style={{ marginTop: 5, height: 4, background: T.border, borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: 4, background: study30Done ? T.green : T.accent, width: `${(minStudied / 30) * 100}%`, borderRadius: 4, transition: "width 1s linear" }} />
            </div>
            <p style={{ fontSize: 11, color: T.textDim, marginTop: 3 }}>{study30Done ? "Concluída! 🎉" : `${minStudied}/30 min — ${running ? "cronômetro rodando" : "inicie para progredir"}`}</p>
          </div>
          <span style={{ fontSize: 11, fontWeight: 800, color: T.amber, fontFamily: "'JetBrains Mono',monospace" }}>+50 XP</span>
          <div style={{ width: 26, height: 26, borderRadius: 7, border: `2px solid ${study30Done ? T.green : T.border}`, background: study30Done ? T.green : "transparent", color: study30Done ? "#fff" : T.textDim, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{study30Done ? "✓" : "○"}</div>
        </div>
      </Card>
    </div>
  );
}

// ─── Trail Tab ─────────────────────────────────────────────────────────────
function TrailTab({ T, user, updateUser, addXP, addToast, completeMission }) {
  const [openPhase, setOpenPhase] = useState(-1);
  const [copied, setCopied] = useState(false);
  const [lessonView, setLessonView] = useState(null); // {phaseIdx, dayIdx} or null
  const [openPrompts, setOpenPrompts] = useState(new Set());
  const [showTrailTutor, setShowTrailTutor] = useState(false);
  const [tutorBtnMounted, setTutorBtnMounted] = useState(false);
  const studySecRef = useRef(0);
  if (studySecRef.current === 0) {
    try {
      const s = JSON.parse(localStorage.getItem(TRAIL_STUDY_KEY) || "{}");
      if (s.date === getTodayStr()) studySecRef.current = s.sec || 0;
    } catch {}
  }

  useEffect(() => {
    const iv = setInterval(() => {
      const next = studySecRef.current + 1;
      studySecRef.current = next;
      localStorage.setItem(TRAIL_STUDY_KEY, JSON.stringify({ date: getTodayStr(), sec: next }));
      if (next % 60 === 0) addHeatmapMinutes(1);
      if (next === 900) completeMission("home_study_15");
    }, 1000);
    return () => clearInterval(iv);
  }, [completeMission]);

  useEffect(() => {
    const t = setTimeout(() => setTutorBtnMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  function togglePrompt(key, e) {
    e.stopPropagation();
    setOpenPrompts(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }
  const course = user.course;
  const completedTopics = user.completedTopics || [];
  const tutorDock = (
    <div className="rv-tutor-dock" style={{ width: 320, flexShrink: 0, position: "sticky", top: 18, height: "calc(100vh - 110px)" }}>
      <TutorPanel T={T} user={user} updateUser={updateUser} addXP={addXP} addToast={addToast} completeMission={completeMission} lessonContext={null} dock />
    </div>
  );

  function concludeLesson(phaseIdx, dayIdx) {
    const key = `${phaseIdx}_${dayIdx}`;
    if (completedTopics.includes(key)) { setLessonView(null); return; }
    addHeatmapMinutes(10);
    const newCompleted = [...completedTopics, key];
    updateUser({ ...user, completedTopics: newCompleted });
    addXP(20); addToast("✓ Aula concluída! +20 XP");
    const totalTopics = course?.phases?.reduce((s, p) => s + (p.days?.length || 0), 0) || 1;
    if (newCompleted.length >= Math.floor(totalTopics / 2) && !(user.achievements || []).includes("progress_50")) addXP(300, "progress_50");
    setLessonView(null);
  }

  if (!course) return <div style={{ textAlign: "center", padding: 40, color: T.textSecondary }}>Nenhum curso encontrado.</div>;

  if (lessonView) {
    return (
      <LessonScreen
        T={T}
        phaseIdx={lessonView.phaseIdx}
        dayIdx={lessonView.dayIdx}
        course={course}
        completedTopics={completedTopics}
        onConclude={concludeLesson}
        onBack={() => setLessonView(null)}
        user={user}
        updateUser={updateUser}
        addXP={addXP}
        addToast={addToast}
        completeMission={completeMission}
      />
    );
  }

  // ─── Module page (literal "open notebook") ───────────────────────────────
  if (openPhase !== -1 && course.phases?.[openPhase]) {
    const pi = openPhase;
    const phase = course.phases[pi];
    const col = getPC(phase.color, T);
    const icon = pickModuleIcon(phase.title, pi);
    const days = phase.days || [];
    return (
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
      <div style={{ animation: "fadeUp .4s ease", flex: 1, minWidth: 0 }}>
        {showTrailTutor && <TutorPanel T={T} user={user} updateUser={updateUser} addXP={addXP} addToast={addToast} completeMission={completeMission} lessonContext={null} onClose={() => setShowTrailTutor(false)} />}
        <button onClick={() => setOpenPhase(-1)} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 9, padding: "7px 12px", cursor: "pointer", color: T.textSecondary, fontSize: 13, fontFamily: "'Source Serif 4',serif", marginBottom: 18 }}>← Voltar aos módulos</button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: col.bg, border: `1px solid ${col.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: col.text, flexShrink: 0 }}>
            <ModuleIcon name={icon} color={col.text} />
          </div>
          <div>
            <p style={{ fontSize: 17, fontWeight: 700, color: T.textPrimary, marginBottom: 2 }}>{phase.title}</p>
            <p style={{ fontSize: 12, color: T.textSecondary }}>{days.length} aula{days.length === 1 ? "" : "s"}</p>
          </div>
        </div>

        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
          {days.map((day, di) => {
            const key = `${pi}_${di}`;
            const lessonDone = completedTopics.includes(key);
            const isFirstLesson = pi === 0 && di === 0;
            return (
              <div key={di} onClick={() => setLessonView({ phaseIdx: pi, dayIdx: di })} style={{ display: "flex", gap: 12, padding: "14px 16px", borderTop: di === 0 ? "none" : `1px solid ${T.border}`, cursor: "pointer" }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 14, color: T.textPrimary, marginBottom: 3, textDecoration: lessonDone ? "line-through" : "none" }}>{day.title}</p>
                  <p style={{ fontSize: 13, color: T.textSecondary, marginBottom: 6, lineHeight: 1.5 }}>{day.description}</p>
                  <span style={{ fontSize: 10, background: col.bg, color: col.text, padding: "2px 8px", borderRadius: 5, border: `1px solid ${col.border}`, fontWeight: 600 }}>{day.tag}</span>
                  {isFirstLesson && course.first_prompt && (
                    <div onClick={e => e.stopPropagation()} style={{ marginTop: 10 }}>
                      {!openPrompts.has(key) ? (
                        <button onClick={e => togglePrompt(key, e)} style={{ padding: "5px 12px", background: T.accentDim, border: `1px solid ${T.accent}44`, borderRadius: 8, color: T.accent, fontSize: 12, fontWeight: 600, fontFamily: "'Source Serif 4',serif", cursor: "pointer" }}>Ver prompt</button>
                      ) : (
                        <div style={{ padding: "12px 14px", background: T.accentDim, border: `1px solid ${T.accent}33`, borderRadius: 10 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: ".06em" }}>Prompt inicial</p>
                            <button onClick={e => togglePrompt(key, e)} style={{ background: "none", border: "none", color: T.textDim, fontSize: 14, cursor: "pointer", lineHeight: 1 }}>✕</button>
                          </div>
                          <p style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.7, fontStyle: "italic", marginBottom: 10 }}>"{course.first_prompt}"</p>
                          <button onClick={e => { e.stopPropagation(); navigator.clipboard?.writeText(course.first_prompt); setCopied(true); addXP(5); setTimeout(() => setCopied(false), 2000); }} style={{ padding: "7px 14px", background: T.accent, border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: "'Source Serif 4',serif", cursor: "pointer" }}>{copied ? "Copiado!" : "Copiar prompt"}</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 7, border: `1.5px solid ${lessonDone ? T.green : T.border}`, background: lessonDone ? T.green : "transparent", color: lessonDone ? "#fff" : T.textDim, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>{lessonDone ? "✓" : "▶"}</div>
                </div>
              </div>
            );
          })}
          <div style={{ padding: "12px 16px", borderTop: `1px solid ${T.border}` }}>
            <button onClick={() => setShowTrailTutor(true)} style={{ width: "100%", padding: "11px 0", background: T.accentDim, border: `1px solid ${T.accent}33`, borderRadius: 9, color: T.accent, fontSize: 13, fontWeight: 600, fontFamily: "'Source Serif 4',serif", cursor: "pointer" }}>
              Revisar este módulo com o tutor
            </button>
          </div>
        </div>
      </div>
      {tutorDock}
      </div>
    );
  }

  const totalTopics = course.phases?.reduce((s, p) => s + (p.days?.length || 0), 0) || 1;
  const progressPct = Math.round((completedTopics.length / totalTopics) * 100);

  return (
    <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
    <div style={{ animation: "fadeUp .4s ease", position: 'relative', minHeight: '100vh', overflow: 'hidden', flex: 1, minWidth: 0 }}>
      <img src="/bg-trilhas.svg" alt="" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.08, pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
      {/* Floating tutor button (mobile only) — rendered via Portal directly in document.body */}
      {tutorBtnMounted && !showTrailTutor && ReactDOM.createPortal(
        <button className="rv-tutor-float-btn" onClick={() => setShowTrailTutor(true)} style={{ position: 'fixed', bottom: '90px', right: '20px', zIndex: 9999, background: T.accent, border: "none", borderRadius: 10, padding: "11px 18px", color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: "'Source Serif 4',serif", cursor: "pointer" }}>
          Tutor
        </button>,
        document.body
      )}
      {showTrailTutor && <TutorPanel T={T} user={user} updateUser={updateUser} addXP={addXP} addToast={addToast} completeMission={completeMission} lessonContext={null} onClose={() => setShowTrailTutor(false)} />}

      {/* Header */}
      <h2 style={{ fontSize: 19, fontWeight: 700, color: T.textPrimary, marginBottom: 4 }}>{course.headline || "Sua trilha"}</h2>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <p style={{ fontSize: 13, color: T.textSecondary }}>Seu progresso:</p>
        <span style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, fontFamily: "'JetBrains Mono',monospace" }}>{progressPct}%</span>
      </div>
      <div style={{ height: 6, background: T.border, borderRadius: 4, overflow: "hidden", marginBottom: 22 }}>
        <div style={{ height: 6, background: T.accent, width: progressPct + "%", borderRadius: 4, transition: "width .6s ease" }} />
      </div>

      {/* Módulos — capas de caderno */}
      <p style={{ fontSize: 11, fontWeight: 700, color: T.textSecondary, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 12 }}>Seus cadernos</p>
      <div className="rv-covers-grid" data-tour="trail-covers" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {course.phases?.map((phase, pi) => {
          const col = getPC(phase.color, T);
          const icon = pickModuleIcon(phase.title, pi);
          const total = phase.days?.length || 0;
          const done = (phase.days || []).filter((_, di) => completedTopics.includes(`${pi}_${di}`)).length;
          const prevAccessible = pi === 0 || completedTopics.some(k => k.startsWith(`${pi - 1}_`));
          const status = done === total && total > 0 ? "done" : done > 0 ? "inProgress" : prevAccessible ? "next" : "locked";
          const isAccessible = status !== "locked";
          const s = { done: { label: "Concluído", color: T.green }, inProgress: { label: `${done}/${total}`, color: T.amber }, next: { label: "Começar", color: T.textSecondary }, locked: { label: "Bloqueado", color: T.textDim } }[status];
          return (
            <div key={pi} onClick={() => isAccessible && setOpenPhase(pi)} style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${col.border}`, cursor: isAccessible ? "pointer" : "default", opacity: isAccessible ? 1 : 0.5 }}>
              <div style={{ height: 5, background: col.dot }} />
              <div style={{ background: col.bg, padding: "14px 12px" }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: T.card, border: `1px solid ${col.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: col.text, marginBottom: 10 }}>
                  <ModuleIcon name={icon} size={17} color={col.text} />
                </div>
                <p style={{ fontWeight: 600, fontSize: 13, color: status === "locked" ? T.textDim : T.textPrimary, marginBottom: 6, lineHeight: 1.35 }}>{phase.title}</p>
                <span style={{ fontSize: 11, fontWeight: 600, color: s.color }}>{s.label}</span>
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </div>
    {tutorDock}
    </div>
  );
}

// ─── Tutor Tab ─────────────────────────────────────────────────────────────
function TutorTab({ T, user, updateUser, addXP, addToast, completeMission }) {
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
      completeMission("ask_tutor");
      const count = final.filter(m => m.role === "user").length;
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
                {suggestions.map(s => <button key={s} onClick={() => send(s)} style={{ padding: "7px 12px", background: T.accentDim, border: `1px solid ${T.accent}33`, borderRadius: 18, color: T.accent, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Source Serif 4',serif" }}>{s}</button>)}
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
        <input placeholder="Pergunte ao seu tutor..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()} style={{ flex: 1, background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, color: T.textPrimary, fontFamily: "'Source Serif 4',serif", fontSize: 14, padding: "12px 14px", outline: "none" }} onFocus={e => e.target.style.borderColor = T.accent} onBlur={e => e.target.style.borderColor = T.border} />
        <BtnPrimary T={T} style={{ width: 48, padding: 0, fontSize: 17, borderRadius: 12, flexShrink: 0 }} onClick={() => send()} disabled={loading}>→</BtnPrimary>
      </div>
    </div>
  );
}

// ─── Notes Tab ─────────────────────────────────────────────────────────────
function NotesTab({ T, user, updateUser, addXP, addToast, completeMission }) {
  const [notes, setNotes] = useState(user.notes || []);
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [editing, setEditing] = useState(null);
  const [view, setView] = useState("list"); // list | new
  const [section, setSection] = useState("notes"); // notes | agenda

  const [agenda, setAgenda] = useState(() => {
    try { return JSON.parse(localStorage.getItem("rivai_agenda") || "[]"); } catch { return []; }
  });
  const [showAgendaForm, setShowAgendaForm] = useState(false);
  const [agendaTitle, setAgendaTitle] = useState("");
  const [agendaDate, setAgendaDate] = useState("");
  const [agendaTime, setAgendaTime] = useState("");

  function saveNote() {
    if (!text.trim()) return;
    const note = { id: Date.now(), title: title || "Sem título", text, date: new Date().toLocaleDateString("pt-BR"), time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) };
    let newNotes;
    if (editing !== null) {
      newNotes = notes.map(n => n.id === editing ? { ...n, title: note.title, text: note.text } : n);
    } else {
      newNotes = [note, ...notes];
      addXP(15); addToast("📓 Anotação salva! +15 XP");
      completeMission("take_note");
      if (newNotes.length >= 10) addXP(100, "notes_10");
    }
    setNotes(newNotes); updateUser({ ...user, notes: newNotes });
    setText(""); setTitle(""); setEditing(null); setView("list");
  }

  function deleteNote(id) { const n = notes.filter(x => x.id !== id); setNotes(n); updateUser({ ...user, notes: n }); }

  function saveAgendaItem() {
    if (!agendaTitle.trim()) return;
    const item = { id: Date.now(), title: agendaTitle, date: agendaDate, time: agendaTime };
    const newAgenda = [...agenda, item].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    setAgenda(newAgenda);
    localStorage.setItem("rivai_agenda", JSON.stringify(newAgenda));
    setAgendaTitle(""); setAgendaDate(""); setAgendaTime(""); setShowAgendaForm(false);
    addToast("📅 Compromisso adicionado!");
  }

  function deleteAgendaItem(id) {
    const newAgenda = agenda.filter(a => a.id !== id);
    setAgenda(newAgenda);
    localStorage.setItem("rivai_agenda", JSON.stringify(newAgenda));
  }

  function formatAgendaDate(iso) {
    if (!iso) return "—";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }

  if (view === "new" || editing !== null) {
    const editNote = editing !== null ? notes.find(n => n.id === editing) : null;
    return (
      <div style={{ animation: "fadeUp .4s ease" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <button onClick={() => { setView("list"); setEditing(null); setText(""); setTitle(""); }} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 9, padding: "7px 12px", cursor: "pointer", color: T.textSecondary, fontSize: 13, fontFamily: "'Source Serif 4',serif" }}>← Voltar</button>
          <h2 style={{ fontSize: 16, fontWeight: 900, color: T.textPrimary }}>{editing !== null ? "Editar nota" : "Nova anotação"}</h2>
        </div>
        <TInput T={T} placeholder="Título da anotação" value={title || (editNote?.title || "")} onChange={e => setTitle(e.target.value)} style={{ marginBottom: 10, fontSize: 15, fontWeight: 700 }} />
        <textarea value={text || (editNote?.text || "")} onChange={e => setText(e.target.value)} placeholder="Escreva o que você aprendeu hoje..." rows={10} style={{ width: "100%", background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, color: T.textPrimary, fontFamily: "'Source Serif 4',serif", fontSize: 14, padding: "14px 16px", outline: "none", resize: "none", lineHeight: 1.7, marginBottom: 12 }} onFocus={e => e.target.style.borderColor = T.accent} onBlur={e => e.target.style.borderColor = T.border} />
        <BtnPrimary T={T} onClick={saveNote}>Salvar anotação</BtnPrimary>
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeUp .4s ease", position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <img src="/bg-notas.svg" alt="" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.08, pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
      {/* Section tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, background: T.surface, borderRadius: 12, padding: 4, border: `1px solid ${T.border}` }}>
        {[{ id: "notes", label: "📓 Anotações" }, { id: "agenda", label: "📅 Agenda" }].map(s => (
          <button key={s.id} onClick={() => setSection(s.id)} style={{ flex: 1, padding: "9px 0", border: "none", borderRadius: 9, cursor: "pointer", fontFamily: "'Source Serif 4',serif", fontSize: 13, fontWeight: section === s.id ? 800 : 600, background: section === s.id ? `linear-gradient(135deg,${T.accent},${T.accentLight || T.green})` : "transparent", color: section === s.id ? "#fff" : T.textSecondary, transition: "all .18s" }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Anotações ── */}
      {section === "notes" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div><h2 style={{ fontSize: 18, fontWeight: 900, color: T.textPrimary }}>Anotações</h2><p style={{ fontSize: 12, color: T.textDim }}>{notes.length} nota{notes.length !== 1 ? "s" : ""}</p></div>
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
                      <button onClick={() => { setEditing(note.id); setText(note.text); setTitle(note.title); }} style={{ background: T.accentDim, border: `1px solid ${T.accent}22`, borderRadius: 7, padding: "4px 9px", cursor: "pointer", color: T.accent, fontSize: 12, fontFamily: "'Source Serif 4',serif" }}>✏️</button>
                      <button onClick={() => deleteNote(note.id)} style={{ background: T.redDim, border: `1px solid ${T.red}22`, borderRadius: 7, padding: "4px 9px", cursor: "pointer", color: T.red, fontSize: 12, fontFamily: "'Source Serif 4',serif" }}>🗑️</button>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.6, marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{note.text}</p>
                  <p style={{ fontSize: 10, color: T.textDim, fontFamily: "'JetBrains Mono',monospace" }}>{note.date} · {note.time}</p>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Agenda ── */}
      {section === "agenda" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div><h2 style={{ fontSize: 18, fontWeight: 900, color: T.textPrimary }}>Agenda de estudos</h2><p style={{ fontSize: 12, color: T.textDim }}>{agenda.length} compromisso{agenda.length !== 1 ? "s" : ""}</p></div>
            {!showAgendaForm && <BtnPrimary T={T} style={{ width: "auto", padding: "10px 18px", fontSize: 13 }} onClick={() => setShowAgendaForm(true)}>+ Adicionar</BtnPrimary>}
          </div>

          {showAgendaForm && (
            <Card T={T} style={{ marginBottom: 16, padding: "16px" }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: T.textPrimary, marginBottom: 12 }}>Novo compromisso</p>
              <TInput T={T} placeholder="Título (ex: Revisão de álgebra)" value={agendaTitle} onChange={e => setAgendaTitle(e.target.value)} />
              <div style={{ display: "flex", gap: 10 }}>
                <TInput T={T} type="date" placeholder="Data" value={agendaDate} onChange={e => setAgendaDate(e.target.value)} style={{ flex: 1 }} />
                <TInput T={T} type="time" placeholder="Horário" value={agendaTime} onChange={e => setAgendaTime(e.target.value)} style={{ flex: 1 }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <BtnPrimary T={T} onClick={saveAgendaItem} disabled={!agendaTitle.trim()}>Salvar</BtnPrimary>
                <button onClick={() => { setShowAgendaForm(false); setAgendaTitle(""); setAgendaDate(""); setAgendaTime(""); }} style={{ flex: 1, padding: "13px 0", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, cursor: "pointer", color: T.textSecondary, fontSize: 14, fontWeight: 700, fontFamily: "'Source Serif 4',serif" }}>Cancelar</button>
              </div>
            </Card>
          )}

          {agenda.length === 0 && !showAgendaForm ? (
            <Card T={T} style={{ textAlign: "center", padding: "36px 20px" }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>📅</div>
              <p style={{ fontWeight: 800, fontSize: 16, color: T.textPrimary, marginBottom: 6 }}>Nenhum compromisso ainda</p>
              <p style={{ color: T.textSecondary, fontSize: 13, marginBottom: 18 }}>Organize seus horários de estudo para manter a consistência.</p>
              <BtnPrimary T={T} style={{ width: "auto", padding: "11px 24px" }} onClick={() => setShowAgendaForm(true)}>Criar primeiro compromisso</BtnPrimary>
            </Card>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {agenda.map(item => (
                <Card T={T} key={item.id} style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ flex: 1, marginRight: 10 }}>
                      <p style={{ fontWeight: 800, fontSize: 14, color: T.textPrimary, marginBottom: 4 }}>{item.title}</p>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        {item.date && <span style={{ fontSize: 11, color: T.accent, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>📆 {formatAgendaDate(item.date)}</span>}
                        {item.time && <span style={{ fontSize: 11, color: T.textSecondary, fontFamily: "'JetBrains Mono',monospace" }}>⏰ {item.time}</span>}
                        {!item.date && !item.time && <span style={{ fontSize: 11, color: T.textDim }}>sem data/horário</span>}
                      </div>
                    </div>
                    <button onClick={() => deleteAgendaItem(item.id)} style={{ background: T.redDim, border: `1px solid ${T.red}22`, borderRadius: 7, padding: "5px 10px", cursor: "pointer", color: T.red, fontSize: 12, fontFamily: "'Source Serif 4',serif", flexShrink: 0 }}>🗑️</button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}

// ─── Rank Tab ──────────────────────────────────────────────────────────────
function RankTab({ T, user }) {
  const [allUsers, setAllUsers] = useState([]);
  useEffect(() => {
    supabase.from("users").select("name,xp,email").order("xp",{ascending:false}).then(({data})=>{ if(data) setAllUsers(data.map(dbToUser)); });
  }, []);

  const myRank = allUsers.findIndex(u => u.email === user.email) + 1;
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      <h2 style={{ fontSize: 20, fontWeight: 900, color: T.textPrimary, marginBottom: 4 }}>Ranking 🏆</h2>
      <p style={{ color: T.textSecondary, fontSize: 13, marginBottom: 18 }}>Entre todos os usuários deste dispositivo</p>

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
          <p style={{ fontWeight: 800, fontSize: 16, color: T.textPrimary, marginBottom: 6 }}>Você é o único aqui!</p>
          <p style={{ color: T.textSecondary, fontSize: 13 }}>Quando outras pessoas criarem contas neste dispositivo, elas aparecerão aqui. Compartilhe o app com amigos!</p>
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
