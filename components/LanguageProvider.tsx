"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type AppLanguage = "en" | "es" | "pt";

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  languageLabel: string;
  t: (key: string) => string;
};

const LABELS: Record<AppLanguage, string> = {
  en: "English",
  es: "Español",
  pt: "Português",
};

const TRANSLATIONS: Record<AppLanguage, Record<string, string>> = {
  en: {
    "common.logout": "Log out",
    "common.loading": "Working...",
    "common.continue": "Continue",
    "common.connected": "connected",
    "common.clearChat": "clear chat",
    "nav.overview": "Overview",
    "nav.metrics": "Metrics",
    "nav.logs": "Logs",
    "nav.problems": "Problems",
    "nav.builder": "DQL Builder",
    "nav.diff": "Log Diff",
    "nav.docs": "Docs",
    "nav.admin": "Admin",
    "brand.observability": "Observability",
    "top.env": "Env",
    "chat.title": "DQL Builder",
    "chat.emptyTitle": "Ask in plain English, Spanish, or Portuguese",
    "chat.emptyBody": "Describe what you need, paste a screenshot, or upload an image of your Dynatrace logs.",
    "chat.inputPlaceholder": "Describe what you need, or paste/upload a screenshot...",
    "chat.inputHelp": "Enter to send · Shift+Enter for new line · Paste or upload screenshots · Claude remembers context",
    "chat.screenshotReady": "Screenshot ready — add a message or just send",
    "chat.showMessage": "Show message",
    "chat.hideMessage": "Hide message",
    "chat.networkError": "Network error. Please try again.",
    "chat.runError": "Failed to execute DQL in FlowLog.",
    "chat.explainError": "Failed to explain query.",
    "dql.query": "DQL Query",
    "dql.copy": "copy",
    "dql.copied": "copied",
    "dql.placeholder": "DQL query will appear here...",
    "dql.run": "Run in FlowLog",
    "dql.running": "Running...",
    "dql.openDynatrace": "Open in Dynatrace",
    "dql.explain": "Explain",
    "dql.explaining": "Explaining...",
    "auth.requestAccess": "Request access",
    "auth.login": "Log in",
    "auth.name": "Name",
    "auth.company": "Company",
    "auth.email": "Email",
    "auth.adminPassword": "Admin password",
    "auth.adminPasswordPlaceholder": "Only required for admins",
    "auth.sendRequest": "Send request",
    "auth.loginHelp": "Approved customers sign in from the email link sent after approval. Admins can use the shared admin password.",
  },
  es: {
    "common.logout": "Cerrar sesión",
    "common.loading": "Procesando...",
    "common.continue": "Continuar",
    "common.connected": "conectado",
    "common.clearChat": "borrar chat",
    "nav.overview": "Resumen",
    "nav.metrics": "Métricas",
    "nav.logs": "Logs",
    "nav.problems": "Problemas",
    "nav.builder": "Constructor DQL",
    "nav.diff": "Comparador de logs",
    "nav.docs": "Docs",
    "nav.admin": "Admin",
    "brand.observability": "Observabilidad",
    "top.env": "Entorno",
    "chat.title": "Constructor DQL",
    "chat.emptyTitle": "Pregunta en inglés, español o portugués",
    "chat.emptyBody": "Describe lo que necesitas, pega una captura o sube una imagen de tus logs de Dynatrace.",
    "chat.inputPlaceholder": "Describe lo que necesitas, o pega/sube una captura...",
    "chat.inputHelp": "Enter para enviar · Shift+Enter para nueva línea · Pega o sube capturas · Claude recuerda el contexto",
    "chat.screenshotReady": "Captura lista — agrega un mensaje o envíala",
    "chat.showMessage": "Mostrar mensaje",
    "chat.hideMessage": "Ocultar mensaje",
    "chat.networkError": "Error de red. Inténtalo de nuevo.",
    "chat.runError": "No se pudo ejecutar DQL en FlowLog.",
    "chat.explainError": "No se pudo explicar la consulta.",
    "dql.query": "Consulta DQL",
    "dql.copy": "copiar",
    "dql.copied": "copiado",
    "dql.placeholder": "La consulta DQL aparecerá aquí...",
    "dql.run": "Ejecutar en FlowLog",
    "dql.running": "Ejecutando...",
    "dql.openDynatrace": "Abrir en Dynatrace",
    "dql.explain": "Explicar",
    "dql.explaining": "Explicando...",
    "auth.requestAccess": "Solicitar acceso",
    "auth.login": "Iniciar sesión",
    "auth.name": "Nombre",
    "auth.company": "Empresa",
    "auth.email": "Correo",
    "auth.adminPassword": "Contraseña de admin",
    "auth.adminPasswordPlaceholder": "Solo requerida para admins",
    "auth.sendRequest": "Enviar solicitud",
    "auth.loginHelp": "Los clientes aprobados entran desde el enlace enviado por email. Los admins pueden usar la contraseña compartida.",
  },
  pt: {
    "common.logout": "Sair",
    "common.loading": "Processando...",
    "common.continue": "Continuar",
    "common.connected": "conectado",
    "common.clearChat": "limpar chat",
    "nav.overview": "Visão geral",
    "nav.metrics": "Métricas",
    "nav.logs": "Logs",
    "nav.problems": "Problemas",
    "nav.builder": "Construtor DQL",
    "nav.diff": "Comparador de logs",
    "nav.docs": "Docs",
    "nav.admin": "Admin",
    "brand.observability": "Observabilidade",
    "top.env": "Ambiente",
    "chat.title": "Construtor DQL",
    "chat.emptyTitle": "Pergunte em inglês, espanhol ou português",
    "chat.emptyBody": "Descreva o que precisa, cole uma captura ou envie uma imagem dos logs do Dynatrace.",
    "chat.inputPlaceholder": "Descreva o que precisa, ou cole/envie uma captura...",
    "chat.inputHelp": "Enter para enviar · Shift+Enter para nova linha · Cole ou envie capturas · Claude lembra o contexto",
    "chat.screenshotReady": "Captura pronta — adicione uma mensagem ou envie",
    "chat.showMessage": "Mostrar mensagem",
    "chat.hideMessage": "Ocultar mensagem",
    "chat.networkError": "Erro de rede. Tente novamente.",
    "chat.runError": "Falha ao executar DQL no FlowLog.",
    "chat.explainError": "Falha ao explicar a consulta.",
    "dql.query": "Consulta DQL",
    "dql.copy": "copiar",
    "dql.copied": "copiado",
    "dql.placeholder": "A consulta DQL aparecerá aqui...",
    "dql.run": "Executar no FlowLog",
    "dql.running": "Executando...",
    "dql.openDynatrace": "Abrir no Dynatrace",
    "dql.explain": "Explicar",
    "dql.explaining": "Explicando...",
    "auth.requestAccess": "Solicitar acesso",
    "auth.login": "Entrar",
    "auth.name": "Nome",
    "auth.company": "Empresa",
    "auth.email": "Email",
    "auth.adminPassword": "Senha de admin",
    "auth.adminPasswordPlaceholder": "Necessária apenas para admins",
    "auth.sendRequest": "Enviar solicitação",
    "auth.loginHelp": "Clientes aprovados entram pelo link enviado por email. Admins podem usar a senha compartilhada.",
  },
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function detectLanguage(): AppLanguage {
  if (typeof window === "undefined") return "en";

  const stored = window.localStorage.getItem("flowlog-language");
  if (stored === "en" || stored === "es" || stored === "pt") return stored;

  const locale = (navigator.languages?.[0] ?? navigator.language ?? "").toLowerCase();
  if (locale.startsWith("pt")) return "pt";
  if (locale.startsWith("es")) return "es";

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone.toLowerCase();
  if (timeZone.includes("sao_paulo") || timeZone.includes("lisbon")) return "pt";
  if (
    timeZone.includes("mexico") ||
    timeZone.includes("bogota") ||
    timeZone.includes("buenos_aires") ||
    timeZone.includes("santiago") ||
    timeZone.includes("madrid")
  ) {
    return "es";
  }

  return "en";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>("en");

  useEffect(() => {
    setLanguageState(detectLanguage());
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem("flowlog-language", language);
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      languageLabel: LABELS[language],
      setLanguage: setLanguageState,
      t: (key) => TRANSLATIONS[language][key] ?? TRANSLATIONS.en[key] ?? key,
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage } = useLanguage();

  return (
    <label className="flex items-center gap-2 text-xs text-slate-400">
      {!compact && <span className="uppercase tracking-widest text-slate-600">Language</span>}
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value as AppLanguage)}
        className="rounded-lg border border-white/10 bg-[#0d1117] px-2 py-1.5 text-sm text-slate-200 outline-none transition hover:border-[#6366f1] focus:border-[#818cf8]"
      >
        <option value="en">English</option>
        <option value="es">Español</option>
        <option value="pt">Português</option>
      </select>
    </label>
  );
}
