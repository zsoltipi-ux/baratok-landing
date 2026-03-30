/*
Design reminder for this file:
- Vizuális filozófia: szerkesztői brutalizmus emberi hanggal
- Papírrétegek, meleg fehér felületek, mély tintakék akcentusok, kézzel jelölt részletek
- Aszimmetrikus ritmus, sok negatív tér, személyes és nem corporate tónus
- Minden döntésnél ezt kérdezzük: erősíti vagy hígítja a személyes, gondosan összerakott jegyzetoldal-hangulatot?
*/

import { useEffect, useMemo, useRef, useState } from "react";

type IntakeMode = "voice" | "text";
type HoursBucket = "<1h" | "1-3h" | "3-8h" | "8h+" | "";

type Submission = {
  id: string;
  createdAt: string;
  mode: IntakeMode;
  name: string;
  contact: string;
  job: string;
  pain: string;
  idea: string;
  hours: HoursBucket;
  transcriptHint: string;
  audioDataUrl?: string;
  audioMimeType?: string;
};

declare global {
  interface Window {
    emailjs?: {
      init: (options: { publicKey: string }) => void;
      send: (
        serviceId: string,
        templateId: string,
        templateParams: Record<string, string>,
      ) => Promise<unknown>;
    };
  }
}

// === SZEMÉLYRE SZABÁS — CSERÉLD KI EZEKET ===
const EMAILJS_SERVICE_ID = "service_XXXXXX";
const EMAILJS_TEMPLATE_ID = "template_XXXXXX";
const EMAILJS_PUBLIC_KEY = "XXXXXXXXXXXXXX";
const ZSOLT_EMAIL = "zsolti@smilestone.hu";
const ZSOLT_PHONE = "+36 XX XXX XXXX";
const SITE_URL = "https://your-site.netlify.app";
// =============================================

const ADMIN_PASSWORD = "baratok2026";
const STORAGE_KEY = "baratok-landing-submissions";
const MAX_RECORDING_MS = 5 * 60 * 1000;

const HERO_IMAGE =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663490042748/FLZt3e4uvVSgSYCcAX9XVM/baratok-hero-editorial-blue-8YANxSGFkCfkuz7JP7H3tx.webp";
const INTAKE_IMAGE =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663490042748/FLZt3e4uvVSgSYCcAX9XVM/baratok-intake-paper-ui-GohPkibGpiWAuFRVkgRqmy.webp";
const CARDS_IMAGE =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663490042748/FLZt3e4uvVSgSYCcAX9XVM/baratok-cards-paper-tiles-5E6je6JMvHacWgrAJndadw.webp";
const THANKYOU_IMAGE =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663490042748/FLZt3e4uvVSgSYCcAX9XVM/baratok-thankyou-share-note-iSqfbzroGLADv6vxbuMo8K.webp";

const steps = [
  {
    index: "01",
    title: "Elmondod mi idegesít",
    body: "5 perc az egész. Leírhatod vagy felmondhatsz egy hangüzenetet. Nem kell tudnod mi az AI — az a mi dolgunk.",
  },
  {
    index: "02",
    title: "Visszaírok 24 órán belül",
    body: "Megnézem mi automatizálható belőle. Ha nem találok megoldást, megmondom őszintén — nem fogok eladni neked olyat ami nem kell.",
  },
  {
    index: "03",
    title: "Megcsinálom, kipróbálod",
    body: "Ha van értelme, 3–5 nap alatt kapsz egy működő eszközt. Mobilon is megy, azonnal használhatod.",
  },
];

const examples = [
  {
    emoji: "📋",
    title: "Ajánlatkészítés ami 30 perc volt → 2 perc",
    body: "Egy ablakos havernak csináltam. Kitölt egy formot, kijön belőle a kész email amit másolhat az ügyfélnek.",
  },
  {
    emoji: "📅",
    title: "Munkaszervezés ami fejben volt → egy oldalon",
    body: "Ki, mikor, hol dolgozik, mennyit kap. Nem kell Excelben turkálni.",
  },
  {
    emoji: "✉️",
    title: "Emailek amiket mindig ugyanúgy írt → egy gomb",
    body: "Visszaigazolás, időpont-egyeztetés, státusz-frissítés. Ugyanaz a szöveg kicsit másképp — ezt AI csinálja.",
  },
  {
    emoji: "📊",
    title: "Havi riport ami fél nap volt → automatikus",
    body: "Beírja az adatokat menet közben, hó végén kijön az összesítő.",
  },
];

const pricing = [
  {
    badge: "BARÁTI ÁR",
    subtitle: "első 10 ember",
    price: "50 000 Ft",
    body: "Ezért kapsz egy működő eszközt ami megoldja a legnagyobb fejfájásodat. Normál ár később 150–250 ezer lesz — de az első 10 ember akinek csinálom, baráti áron kapja. Cserébe kérek egy 2–3 mondatos véleményt ha bevált.",
    featured: true,
  },
  {
    badge: "HA CSAK KÍVÁNCSI VAGY",
    subtitle: "nincs kockázat",
    price: "Ingyenes",
    body: "Írsz nekem, elmondod mi bosszant, én visszaírok hogy van-e megoldás. Ha nincs — nem történik semmi. Ha van — eldöntöd mit csinálsz.",
    featured: false,
  },
];

function readSubmissions(): Submission[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSubmission(item: Submission) {
  const items = readSubmissions();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([item, ...items]));
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("hu-HU", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function toCsv(items: Submission[]) {
  const headers = [
    "dátum",
    "mód",
    "név",
    "kapcsolat",
    "munka",
    "fájdalom",
    "heti idő",
    "ötlet",
    "hangüzenet_leírás",
    "hangfájl_elérhető",
  ];

  const rows = items.map((item) => [
    item.createdAt,
    item.mode,
    item.name,
    item.contact,
    item.job,
    item.pain,
    item.hours,
    item.idea,
    item.transcriptHint,
    item.audioDataUrl ? "igen" : "nem",
  ]);

  return [headers, ...rows]
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\n");
}

export default function Home() {
  const intakeRef = useRef<HTMLElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const maxLimitRef = useRef<number | null>(null);

  const [mode, setMode] = useState<IntakeMode>("voice");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [fallbackMessage, setFallbackMessage] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [adminMode, setAdminMode] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);
  const [adminItems, setAdminItems] = useState<Submission[]>([]);

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [job, setJob] = useState("");
  const [pain, setPain] = useState("");
  const [idea, setIdea] = useState("");
  const [hours, setHours] = useState<HoursBucket>("");
  const [voiceNotes, setVoiceNotes] = useState("");

  const pageUrl = useMemo(() => {
    if (typeof window !== "undefined") return window.location.href.split("?")[0];
    return SITE_URL;
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("admin")) {
      setAdminChecked(true);
      return;
    }

    const password = window.prompt("Admin jelszó:");
    if (password === ADMIN_PASSWORD) {
      setAdminMode(true);
      setAdminItems(readSubmissions());
    } else {
      window.alert("Hibás jelszó.");
      params.delete("admin");
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
      window.history.replaceState({}, "", next);
    }
    setAdminChecked(true);
  }, []);

  useEffect(() => {
    const scriptId = "emailjs-browser-sdk";
    if (document.getElementById(scriptId)) return;

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";
    script.async = true;
    script.onload = () => {
      if (
        window.emailjs &&
        !EMAILJS_PUBLIC_KEY.includes("XXXX") &&
        EMAILJS_PUBLIC_KEY.trim().length > 0
      ) {
        window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
      }
    };
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (maxLimitRef.current) window.clearTimeout(maxLimitRef.current);
    };
  }, [audioUrl]);

  function resetRecorderState() {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (maxLimitRef.current) window.clearTimeout(maxLimitRef.current);
    timerRef.current = null;
    maxLimitRef.current = null;
    setIsRecording(false);
  }

  async function handleRecordToggle() {
    if (isRecording && recorderRef.current) {
      recorderRef.current.stop();
      resetRecorderState();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];
      setAudioBlob(null);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl("");
      setRecordingTime(0);
      setFallbackMessage("");

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
        resetRecorderState();
      };

      recorder.start();
      setIsRecording(true);
      timerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
      maxLimitRef.current = window.setTimeout(() => {
        if (recorder.state !== "inactive") {
          recorder.stop();
          window.alert("Letelt az 5 perces maximum, ezért megállítottam a felvételt.");
        }
      }, MAX_RECORDING_MS);
    } catch {
      setMode("text");
      setFallbackMessage("A böngésződ nem enged hangfelvételt — írd le inkább.");
    }
  }

  function formatTimer(totalSeconds: number) {
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  async function blobToDataUrl(blob: Blob) {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function sendEmailNotification(entry: Submission) {
    if (
      !window.emailjs ||
      EMAILJS_SERVICE_ID.includes("XXXX") ||
      EMAILJS_TEMPLATE_ID.includes("XXXX") ||
      EMAILJS_PUBLIC_KEY.includes("XXXX")
    ) {
      return false;
    }

    await window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_email: ZSOLT_EMAIL,
      site_url: pageUrl,
      name: entry.name || "Nincs megadva",
      contact: entry.contact || "Nincs megadva",
      mode: entry.mode === "voice" ? "Hangüzenet" : "Leírom",
      job: entry.job || "Nincs megadva",
      pain: entry.pain || "Nincs megadva",
      idea: entry.idea || "Nincs megadva",
      hours: entry.hours || "Nincs megadva",
      transcript_hint: entry.transcriptHint || "Nincs megadva",
      audio_available: entry.audioDataUrl ? "Igen — localStorage-ban mentve" : "Nem",
      reply_to: entry.contact || ZSOLT_EMAIL,
      zsolt_phone: ZSOLT_PHONE,
    });
    return true;
  }

  function clearForm() {
    setName("");
    setContact("");
    setJob("");
    setPain("");
    setIdea("");
    setHours("");
    setVoiceNotes("");
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl("");
    setRecordingTime(0);
    setMode("voice");
  }

  async function handleSubmit() {
    if (!(job.trim() || pain.trim() || voiceNotes.trim() || audioBlob)) {
      window.alert("Elég ha a munkád vagy az idegesítő rész ki van töltve — kérlek írj legalább ennyit.");
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage("");

    try {
      const audioDataUrl = audioBlob ? await blobToDataUrl(audioBlob) : undefined;
      const entry: Submission = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        mode,
        name: name.trim(),
        contact: contact.trim(),
        job: job.trim(),
        pain: pain.trim(),
        idea: idea.trim(),
        hours,
        transcriptHint: voiceNotes.trim(),
        audioDataUrl,
        audioMimeType: audioBlob?.type,
      };

      saveSubmission(entry);
      setAdminItems(readSubmissions());

      let sent = false;
      try {
        sent = await sendEmailNotification(entry);
      } catch {
        sent = false;
      }

      setSubmitSuccess(true);
      setSubmitMessage(
        sent
          ? "Megvan — az üzenet mentve lett és az email értesítés is elment."
          : entry.mode === "voice" && entry.audioDataUrl
            ? "Megvan — az üzenet mentve lett. Ha az emailes csatolás nincs bekötve, a hangfájlt az admin nézetben is eléred, vagy külön is el tudod küldeni."
            : "Megvan — az üzenet mentve lett. Az email küldéshez majd cseréld ki felül az EmailJS azonosítókat." ,
      );
      clearForm();
    } finally {
      setIsSubmitting(false);
    }
  }

  function copyLink() {
    navigator.clipboard
      .writeText(pageUrl)
      .then(() => window.alert("A linket kimásoltam."))
      .catch(() => window.prompt("Másold ki innen:", pageUrl));
  }

  function exportCsv() {
    const csv = toCsv(adminItems);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "baratok-landing-valaszok.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!adminChecked) {
    return <div className="min-h-screen bg-[#f7f3ea]" />;
  }

  if (adminMode) {
    return (
      <main className="min-h-screen bg-[#f5f1e8] px-4 py-8 text-[#1a1a1a] sm:px-6 lg:px-10">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="flex flex-col gap-4 rounded-[28px] border border-[#d7d2c7] bg-white px-6 py-6 shadow-[0_20px_70px_rgba(26,26,26,0.08)] sm:flex-row sm:items-end sm:justify-between sm:px-8">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#274c77]">
                Rejtett admin nézet
              </p>
              <h1 className="mt-3 font-[&quot;Space_Grotesk&quot;] text-3xl font-bold tracking-[-0.04em] sm:text-5xl">
                Beérkezett válaszok
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#4f4b45] sm:text-base">
                Itt látod a helyben mentett jelentkezéseket. GitHub Pages alatt ez böngészőnként külön localStorage,
                tehát ez MVP admin nézetként működik.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={exportCsv}
                className="rounded-full border border-[#1a1a1a] px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5 hover:bg-[#1a1a1a] hover:text-white"
              >
                CSV export
              </button>
              <button
                onClick={() => {
                  setAdminMode(false);
                  const params = new URLSearchParams(window.location.search);
                  params.delete("admin");
                  window.history.replaceState({}, "", `${window.location.pathname}${params.toString() ? `?${params}` : ""}`);
                }}
                className="rounded-full bg-[#274c77] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#17304d]"
              >
                Vissza az oldalra
              </button>
            </div>
          </div>

          <div className="grid gap-4">
            {adminItems.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[#c9c3b6] bg-white/70 px-6 py-10 text-center text-[#5e5a54] shadow-[0_10px_30px_rgba(26,26,26,0.05)]">
                Még nincs mentett válasz ebben a böngészőben.
              </div>
            ) : (
              adminItems.map((item) => (
                <article
                  key={item.id}
                  className="grid gap-5 rounded-[24px] border border-[#ddd7cb] bg-white p-6 shadow-[0_16px_40px_rgba(26,26,26,0.06)] lg:grid-cols-[1.1fr_1.2fr]"
                >
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#edf3ff] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-[#274c77]">
                        {item.mode === "voice" ? "Hangüzenet" : "Leírom"}
                      </span>
                      <span className="text-sm text-[#6a665f]">{formatDate(item.createdAt)}</span>
                    </div>
                    <div className="space-y-2 text-sm leading-7 text-[#2d2a26]">
                      <p><strong>Név:</strong> {item.name || "—"}</p>
                      <p><strong>Telefon vagy email:</strong> {item.contact || "—"}</p>
                      <p><strong>Mi a munkád:</strong> {item.job || "—"}</p>
                      <p><strong>Mi idegesít:</strong> {item.pain || "—"}</p>
                      <p><strong>Heti idő:</strong> {item.hours || "—"}</p>
                      <p><strong>Van ötlet:</strong> {item.idea || "—"}</p>
                      <p><strong>Hangos leírás:</strong> {item.transcriptHint || "—"}</p>
                    </div>
                  </div>

                  <div className="rounded-[20px] bg-[#f6f2ea] p-5">
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#274c77]">
                      Hangfájl
                    </p>
                    {item.audioDataUrl ? (
                      <div className="mt-4 space-y-4">
                        <audio controls className="w-full">
                          <source src={item.audioDataUrl} type={item.audioMimeType || "audio/webm"} />
                        </audio>
                        <a
                          href={item.audioDataUrl}
                          download={`hanguzenet-${item.name || item.id}.webm`}
                          className="inline-flex rounded-full border border-[#1a1a1a] px-4 py-2 text-sm font-semibold transition hover:bg-[#1a1a1a] hover:text-white"
                        >
                          Hangfájl letöltése
                        </a>
                      </div>
                    ) : (
                      <p className="mt-4 text-sm leading-7 text-[#5f5b55]">Ehhez a bejegyzéshez nincs hangfájl mentve.</p>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f5f1e8] text-[#1a1a1a] selection:bg-[#274c77] selection:text-white">
      <section className="relative overflow-hidden border-b border-[#ddd6ca]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(39,76,119,0.1),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(39,76,119,0.08),transparent_32%)]" />
        <div className="container relative py-6 sm:py-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-[#274c77]">
                Zsolt / AI automatizálás
              </p>
            </div>
            <a
              href={`mailto:${ZSOLT_EMAIL}`}
              className="rounded-full border border-[#d0c8ba] bg-white/80 px-4 py-2 text-sm font-medium text-[#1a1a1a] backdrop-blur transition hover:-translate-y-0.5 hover:border-[#1a1a1a]"
            >
              {ZSOLT_EMAIL}
            </a>
          </div>

          <div className="mt-10 grid items-end gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 xl:gap-16">
            <div className="relative">
              <div className="absolute -left-5 top-2 hidden h-24 w-24 rounded-full border border-[#cfd8e3] lg:block" />
              <p className="mb-5 inline-flex rounded-full border border-[#cdd7e5] bg-white/70 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.24em] text-[#274c77] shadow-[0_8px_20px_rgba(39,76,119,0.08)] backdrop-blur">
                Nem corporate. Nem körítés. Hanem hasznos.
              </p>
              <h1 className="max-w-3xl font-[&quot;Space_Grotesk&quot;] text-[clamp(2.8rem,7vw,6rem)] font-bold leading-[0.92] tracking-[-0.06em] text-[#171717]">
                Van a munkádban valami amit utálsz csinálni?
                <span className="mt-3 block text-[#274c77]">Megcsinálom helyetted — AI-jal.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-[#4d4a45] sm:text-lg">
                Zsolt vagyok. AI automatizálással foglalkozom. Az elmúlt hetekben barátoknak csináltam olyan kis eszközöket amik
                átvették a legidegesítőbb feladataikat. Most keresek még pár embert akinek tudok segíteni.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                <button
                  onClick={() => intakeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  className="inline-flex min-h-14 items-center justify-center rounded-full bg-[#274c77] px-7 text-base font-semibold text-white shadow-[0_16px_30px_rgba(39,76,119,0.28)] transition hover:-translate-y-1 hover:bg-[#183553]"
                >
                  Mesélj róla →
                </button>
                <p className="text-sm leading-7 text-[#5c5851]">
                  5 perc. Ha van rá jó megoldás, megmondom. Ha nincs, azt is.
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -right-4 -top-4 hidden rounded-full border border-[#d8d1c5] bg-white px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[#274c77] shadow-[0_10px_30px_rgba(26,26,26,0.08)] lg:block">
                személyes / gyors / őszinte
              </div>
              <div className="relative overflow-hidden rounded-[32px] border border-[#d8d1c5] bg-[#f8f5ee] p-3 shadow-[0_30px_80px_rgba(26,26,26,0.12)]">
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.34),transparent_45%,rgba(39,76,119,0.06))]" />
                <img
                  src={HERO_IMAGE}
                  alt="Papírréteges, jegyzetszerű hero illusztráció"
                  className="relative h-[360px] w-full rounded-[24px] object-cover object-center sm:h-[460px]"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-18 sm:py-24">
        <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:gap-12">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#274c77]">Hogyan működik ez?</p>
            <h2 className="mt-4 max-w-md font-[&quot;Space_Grotesk&quot;] text-3xl font-bold tracking-[-0.05em] sm:text-5xl">
              Röviden ennyi.
            </h2>
            <p className="mt-5 max-w-md text-base leading-8 text-[#57534d]">
              Nem kell briefet írni, nem kell kitalálni a technológiát, és nem kell úgy tenni, mintha ez egy nagy digitális transzformáció lenne.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {steps.map((step, index) => (
              <article
                key={step.title}
                className={`group relative overflow-hidden rounded-[26px] border border-[#ddd6ca] bg-white px-6 py-7 shadow-[0_18px_50px_rgba(26,26,26,0.06)] transition hover:-translate-y-1 ${
                  index === 1 ? "md:translate-y-8" : ""
                }`}
              >
                <div className="absolute right-4 top-4 font-mono text-[11px] tracking-[0.24em] text-[#9c978e]">{step.index}</div>
                <h3 className="max-w-[12ch] font-[&quot;Space_Grotesk&quot;] text-2xl font-bold tracking-[-0.04em] text-[#1c1b1a]">
                  {step.title}
                </h3>
                <p className="mt-5 text-sm leading-7 text-[#57534d] sm:text-base">{step.body}</p>
                <div className="mt-8 h-[3px] w-24 rounded-full bg-[#274c77] transition group-hover:w-36" />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#ddd6ca] bg-white/65">
        <div className="container py-18 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#274c77]">Ilyen dolgokat csinálok</p>
              <h2 className="mt-4 max-w-2xl font-[&quot;Space_Grotesk&quot;] text-3xl font-bold tracking-[-0.05em] sm:text-5xl">
                Nem varázslat. Inkább jól összerakott, hasznos mini eszközök.
              </h2>
              <div className="mt-10 grid gap-5 md:grid-cols-2">
                {examples.map((item) => (
                  <article
                    key={item.title}
                    className="rounded-[24px] border border-[#e2dbcf] bg-white px-6 py-6 shadow-[0_16px_40px_rgba(26,26,26,0.05)]"
                  >
                    <div className="text-2xl">{item.emoji}</div>
                    <h3 className="mt-4 font-[&quot;Space_Grotesk&quot;] text-2xl font-bold leading-tight tracking-[-0.04em] text-[#1d1d1b]">
                      {item.title}
                    </h3>
                    <p className="mt-4 text-sm leading-7 text-[#57534d] sm:text-base">{item.body}</p>
                  </article>
                ))}
              </div>
              <p className="mt-8 max-w-3xl text-base leading-8 text-[#57534d]">
                Minden iparágban van ilyen. Könyvelő, fogorvos, szerviz, bolt — mindegy. Ha van ismétlődő feladat, van rá megoldás.
              </p>
            </div>

            <div className="relative lg:pl-6">
              <div className="sticky top-8 overflow-hidden rounded-[32px] border border-[#ddd6ca] bg-[#f8f5ee] p-3 shadow-[0_24px_70px_rgba(26,26,26,0.1)]">
                <img
                  src={CARDS_IMAGE}
                  alt="Papírkártyákba rendezett automatizálási példák"
                  className="h-[360px] w-full rounded-[24px] object-cover sm:h-[420px]"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-18 sm:py-24">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#274c77]">Mennyibe kerül?</p>
            <h2 className="mt-4 font-[&quot;Space_Grotesk&quot;] text-3xl font-bold tracking-[-0.05em] sm:text-5xl">
              Egyszerűen, őszintén.
            </h2>
            <p className="mt-5 max-w-md text-base leading-8 text-[#57534d]">
              Árak nettóban, +ÁFA. De komolyan — ha ez megspórol neked heti 3 órát, az évi 150 óra. Számold ki mennyit ér az neked.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {pricing.map((item) => (
              <article
                key={item.badge}
                className={`rounded-[28px] border px-6 py-7 shadow-[0_20px_50px_rgba(26,26,26,0.06)] ${
                  item.featured
                    ? "border-[#274c77] bg-[#274c77] text-white"
                    : "border-[#ddd6ca] bg-white text-[#1a1a1a]"
                }`}
              >
                <p className={`font-mono text-xs uppercase tracking-[0.28em] ${item.featured ? "text-white/72" : "text-[#274c77]"}`}>
                  {item.badge}
                </p>
                <p className={`mt-2 text-sm ${item.featured ? "text-white/72" : "text-[#6b665f]"}`}>{item.subtitle}</p>
                <div className="mt-8 font-[&quot;Space_Grotesk&quot;] text-4xl font-bold tracking-[-0.05em]">{item.price}</div>
                <p className={`mt-6 text-sm leading-7 sm:text-base ${item.featured ? "text-white/88" : "text-[#57534d]"}`}>
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section ref={intakeRef} className="border-y border-[#ddd6ca] bg-white">
        <div className="container py-18 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-12">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#274c77]">Oké, mesélj.</p>
              <h2 className="mt-4 font-[&quot;Space_Grotesk&quot;] text-3xl font-bold tracking-[-0.05em] sm:text-5xl">
                Ahogy kényelmes — hangban vagy írásban.
              </h2>
              <p className="mt-5 max-w-lg text-base leading-8 text-[#57534d]">
                Mondd el mit csinálsz, mi viszi el az idődet, és ha van ötleted, azt is. Nem kell tökéletesen megfogalmazni.
              </p>

              <div className="mt-8 overflow-hidden rounded-[30px] border border-[#ddd6ca] bg-[#f8f5ee] p-3 shadow-[0_24px_70px_rgba(26,26,26,0.08)]">
                <img
                  src={INTAKE_IMAGE}
                  alt="Absztrakt illusztráció a hangfelvételes űrlaphoz"
                  className="h-[300px] w-full rounded-[22px] object-cover sm:h-[380px]"
                />
              </div>
            </div>

            <div className="relative rounded-[32px] border border-[#ddd6ca] bg-[#f7f3ec] p-4 shadow-[0_28px_80px_rgba(26,26,26,0.08)] sm:p-6 lg:p-8">
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setMode("voice")}
                  className={`min-h-14 rounded-full px-5 text-sm font-semibold transition sm:text-base ${
                    mode === "voice"
                      ? "bg-[#1a1a1a] text-white shadow-[0_16px_30px_rgba(26,26,26,0.18)]"
                      : "bg-white text-[#1a1a1a] hover:bg-[#efebe3]"
                  }`}
                >
                  🎤 Hangüzenet
                </button>
                <button
                  type="button"
                  onClick={() => setMode("text")}
                  className={`min-h-14 rounded-full px-5 text-sm font-semibold transition sm:text-base ${
                    mode === "text"
                      ? "bg-[#1a1a1a] text-white shadow-[0_16px_30px_rgba(26,26,26,0.18)]"
                      : "bg-white text-[#1a1a1a] hover:bg-[#efebe3]"
                  }`}
                >
                  ✍️ Leírom
                </button>
              </div>

              {fallbackMessage ? (
                <div className="mt-4 rounded-[20px] border border-[#ead8d8] bg-[#fff5f5] px-4 py-3 text-sm leading-7 text-[#7a4f4f]">
                  {fallbackMessage}
                </div>
              ) : null}

              {mode === "voice" ? (
                <div className="mt-8 space-y-6">
                  <div>
                    <p className="text-base leading-8 text-[#57534d]">
                      Nyomd meg a gombot és mondj el annyit amennyit akarsz. Ami segít: mit csinálsz, mi veszi el az idődet, és van-e ötleted.
                    </p>
                  </div>

                  <div className="rounded-[28px] border border-[#e3dbcf] bg-white px-5 py-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:px-8">
                    <button
                      type="button"
                      onClick={handleRecordToggle}
                      className={`mx-auto flex h-32 w-32 items-center justify-center rounded-full text-5xl text-white transition duration-300 sm:h-36 sm:w-36 ${
                        isRecording
                          ? "bg-[#d95757] shadow-[0_0_0_12px_rgba(217,87,87,0.14),0_0_0_28px_rgba(217,87,87,0.08),0_25px_40px_rgba(217,87,87,0.25)]"
                          : "bg-[#cc5b5b] shadow-[0_22px_40px_rgba(204,91,91,0.24)] hover:-translate-y-1 hover:bg-[#b94a4a]"
                      }`}
                      aria-label={isRecording ? "Felvétel leállítása" : "Felvétel indítása"}
                    >
                      ⏺
                    </button>
                    <p className="mt-5 font-mono text-xs uppercase tracking-[0.24em] text-[#8d877f]">
                      {isRecording ? "Felvétel fut" : "Nyomd meg a felvételhez"}
                    </p>
                    <p className="mt-2 font-[&quot;Space_Grotesk&quot;] text-3xl font-bold tracking-[-0.05em] text-[#1a1a1a]">
                      {formatTimer(recordingTime)}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[#6a665f]">Max 5 perc. Új kattintásra megáll.</p>
                  </div>

                  {audioUrl ? (
                    <div className="rounded-[24px] border border-[#ddd6ca] bg-white px-5 py-5 shadow-[0_14px_30px_rgba(26,26,26,0.05)]">
                      <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#274c77]">Felvétel kész</p>
                      <audio controls className="mt-4 w-full">
                        <source src={audioUrl} type={audioBlob?.type || "audio/webm"} />
                      </audio>
                      <p className="mt-4 text-sm leading-7 text-[#5d5953]">
                        Ha nincs bekötve emailes csatolás, az üzenet helyben akkor is elmentődik, és az admin nézetből később letölthető.
                      </p>
                    </div>
                  ) : null}

                  <div className="grid gap-4">
                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-[#302d29]">Pár szóban: mit csinálsz és mi fáj most a legjobban?</span>
                      <textarea
                        value={voiceNotes}
                        onChange={(event) => setVoiceNotes(event.target.value)}
                        placeholder="Pl: villanyszerelő vagyok, az ajánlatírás és az időpontok viszik el a fél napomat..."
                        className="min-h-32 rounded-[22px] border border-[#dad4c8] bg-white px-4 py-4 text-base outline-none transition placeholder:text-[#9a948b] focus:border-[#274c77] focus:ring-4 focus:ring-[#274c77]/10"
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-[#302d29]">Név</span>
                      <input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        className="min-h-14 rounded-[18px] border border-[#dad4c8] bg-white px-4 text-base outline-none transition focus:border-[#274c77] focus:ring-4 focus:ring-[#274c77]/10"
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-[#302d29]">Telefon vagy email</span>
                      <input
                        value={contact}
                        onChange={(event) => setContact(event.target.value)}
                        className="min-h-14 rounded-[18px] border border-[#dad4c8] bg-white px-4 text-base outline-none transition focus:border-[#274c77] focus:ring-4 focus:ring-[#274c77]/10"
                      />
                      <span className="text-sm leading-6 text-[#6a665f]">Hogy tudjak visszaírni. Nem spammellek, ígérem.</span>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="mt-8 grid gap-4">
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-[#302d29]">Mi a munkád?</span>
                    <textarea
                      value={job}
                      onChange={(event) => setJob(event.target.value)}
                      placeholder="Pl: villanyszerelő, könyvelő, rendelő asszisztens, bolt..."
                      className="min-h-28 rounded-[22px] border border-[#dad4c8] bg-white px-4 py-4 text-base outline-none transition placeholder:text-[#9a948b] focus:border-[#274c77] focus:ring-4 focus:ring-[#274c77]/10"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-[#302d29]">Mi az ami a legjobban idegesít / legtöbb időt vesz el?</span>
                    <textarea
                      value={pain}
                      onChange={(event) => setPain(event.target.value)}
                      placeholder="Pl: kézzel írom az ajánlatokat, mindig ugyanazt az emailt küldöm ki..."
                      className="min-h-32 rounded-[22px] border border-[#dad4c8] bg-white px-4 py-4 text-base outline-none transition placeholder:text-[#9a948b] focus:border-[#274c77] focus:ring-4 focus:ring-[#274c77]/10"
                    />
                  </label>
                  <div className="grid gap-2">
                    <span className="text-sm font-semibold text-[#302d29]">Kb. hány órát vesz el hetente?</span>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {(["<1h", "1-3h", "3-8h", "8h+"] as HoursBucket[]).map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setHours(option)}
                          className={`min-h-12 rounded-full border px-4 text-sm font-semibold transition ${
                            hours === option
                              ? "border-[#274c77] bg-[#274c77] text-white"
                              : "border-[#d7d0c4] bg-white text-[#1a1a1a] hover:border-[#1a1a1a]"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-[#302d29]">Van ötleted hogyan lehetne megoldani?</span>
                    <textarea
                      value={idea}
                      onChange={(event) => setIdea(event.target.value)}
                      placeholder="Nem baj ha nincs. Ha van, írd le nyugodtan."
                      className="min-h-28 rounded-[22px] border border-[#dad4c8] bg-white px-4 py-4 text-base outline-none transition placeholder:text-[#9a948b] focus:border-[#274c77] focus:ring-4 focus:ring-[#274c77]/10"
                    />
                    <span className="text-sm leading-6 text-[#6a665f]">Ez opcionális.</span>
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-[#302d29]">Név</span>
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="min-h-14 rounded-[18px] border border-[#dad4c8] bg-white px-4 text-base outline-none transition focus:border-[#274c77] focus:ring-4 focus:ring-[#274c77]/10"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-[#302d29]">Telefon vagy email</span>
                    <input
                      value={contact}
                      onChange={(event) => setContact(event.target.value)}
                      className="min-h-14 rounded-[18px] border border-[#dad4c8] bg-white px-4 text-base outline-none transition focus:border-[#274c77] focus:ring-4 focus:ring-[#274c77]/10"
                    />
                  </label>
                </div>
              )}

              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="inline-flex min-h-14 items-center justify-center rounded-full bg-[#274c77] px-7 text-base font-semibold text-white shadow-[0_18px_30px_rgba(39,76,119,0.24)] transition hover:-translate-y-1 hover:bg-[#17304d] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Küldés..." : "Elküldöm →"}
                </button>
                <p className="max-w-md text-sm leading-7 text-[#6a665f]">
                  Elég ha a munkakör vagy a fájdalom ki van töltve. Nem kell hosszúra írni.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-18 sm:py-24">
        <div className="grid gap-8 rounded-[36px] border border-[#ddd6ca] bg-white px-5 py-5 shadow-[0_30px_80px_rgba(26,26,26,0.08)] sm:px-8 sm:py-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-10">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#274c77]">Submit után</p>
            <h2 className="mt-4 font-[&quot;Space_Grotesk&quot;] text-3xl font-bold tracking-[-0.05em] sm:text-5xl">
              Köszi! Megkaptam.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[#57534d]">
              24 órán belül visszaírok — ha találtam valamit, megmutatom. Ha nem, azt is megmondom.
            </p>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[#57534d]">
              Ha eszedbe jut valaki akinek ez hasznos lehet — küldd tovább a linket.
            </p>
            <p className="mt-6 text-base font-medium text-[#1a1a1a]">— Zsolt</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={copyLink}
                className="inline-flex min-h-14 items-center justify-center rounded-full border border-[#1a1a1a] px-6 text-base font-semibold transition hover:-translate-y-1 hover:bg-[#1a1a1a] hover:text-white"
              >
                Link másolása
              </button>
              {submitMessage ? (
                <p className="max-w-xl text-sm leading-7 text-[#5e5a54]">{submitMessage}</p>
              ) : null}
            </div>
            {submitSuccess ? (
              <div className="mt-6 rounded-[22px] border border-[#d9e2ee] bg-[#eef4fb] px-4 py-4 text-sm leading-7 text-[#24405d]">
                Az utolsó beküldés mentve lett ezen az eszközön.
              </div>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-[30px] border border-[#ddd6ca] bg-[#f8f5ee] p-3">
            <img
              src={THANKYOU_IMAGE}
              alt="Továbbküldést és visszajelzést jelképező absztrakt papírjegyzet"
              className="h-[300px] w-full rounded-[22px] object-cover sm:h-[360px]"
            />
          </div>
        </div>
      </section>

      <footer className="border-t border-[#ddd6ca] bg-[#f5f1e8]">
        <div className="container flex flex-col gap-3 py-8 text-sm text-[#5d5953] sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Zsolt</p>
          <div className="flex flex-wrap gap-4">
            <a href={`mailto:${ZSOLT_EMAIL}`} className="transition hover:text-[#1a1a1a]">
              {ZSOLT_EMAIL}
            </a>
            <a href={`tel:${ZSOLT_PHONE.replaceAll(" ", "")}`} className="transition hover:text-[#1a1a1a]">
              {ZSOLT_PHONE}
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
