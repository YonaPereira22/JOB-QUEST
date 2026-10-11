import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import projectEditorData from "./editorData.json";
import InterviewBattle from "./InterviewBattle.jsx";

const publicAsset = (path) => `${import.meta.env.BASE_URL}${path}`;
const npcImageAsset = (npc) => npc.imageUrl
  ? publicAsset(npc.imageUrl.replace(/^\/+/, ""))
  : null;

async function prepareNpcImage(file) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    throw new Error("Elegí una imagen PNG, JPG o WebP.");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("La imagen original no puede superar los 10 MB.");
  }

  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = sourceUrl;
    await image.decode();
    const scale = Math.min(1, 1024 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudo preparar la imagen en este navegador.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

/* ================================================================
   JOB QUEST: BUILD YOUR FUTURE
   Videojuego educativo 2D de exploración (React + Canvas)
   ================================================================
   Estructura del archivo (pensada para separarse en carpetas
   reales cuando se integre a la plataforma:

   - DATOS EDUCATIVOS  -> data/myths.js, data/trueFalse.js,
                          data/questions.js, data/its.js,
                          data/contraceptiveMethods.js,
                          data/scenarios.js, data/missions.js
   - CONFIG DE NIVELES -> scenes/level1.js, scenes/level2.js, ...
   - SISTEMAS          -> systems/collision.js, systems/camera.js
   - COMPONENTES       -> components/Player, NPC, Dialogue,
                          Interaction, Collectible, Star, HUD,
                          Map, LevelComplete, Feedback, PauseMenu...

   NOTA PARA LA DOCENTE:
   El contenido científico (mitos, verdadero/falso, ITS, métodos
   anticonceptivos, escenarios de decisión) se ubica todo en el
   bloque "DATOS EDUCATIVOS" de más abajo. Se puede reemplazar por
   el material real de cátedra sin tocar el resto del código: cada
   objeto tiene la misma forma (shape) para que el motor del juego
   siga funcionando igual.
   ================================================================ */

/* ================================================================
   DATOS EDUCATIVOS
   ================================================================ */

// data/myths.js — Nivel 1: professions and job clues
const MYTHS_DATA = [
  {
    id: "myth1",
    text: "A person who helps students learn in a classroom is a teacher.",
    answer: "realidad",
    explanation:
      "A teacher explains lessons, guides activities, and supports students in class.",
  },
  {
    id: "myth2",
    text: "A doctor works in a hospital and helps sick people.",
    answer: "realidad",
    explanation:
      "Doctors care for patients, diagnose problems, and suggest treatment plans.",
  },
  {
    id: "myth3",
    text: "A firefighter protects people during emergencies and works with fire safety.",
    answer: "realidad",
    explanation:
      "Firefighters respond to emergencies, protect communities, and help during dangerous situations.",
  },
  {
    id: "myth4",
    text: "A farmer works in a hospital taking care of patients.",
    answer: "mito",
    explanation:
      "A farmer works outdoors with crops and animals, while doctors and nurses work in health settings.",
  },
  {
    id: "myth5",
    text: "A pilot flies airplanes and travels to different places.",
    answer: "realidad",
    explanation:
      "Pilots operate aircraft and help people travel safely across cities or countries.",
  },
];

// data/trueFalse.js + data/questions.js — Nivel 2: workplace behavior
const TRUEFALSE_DATA = [
  {
    id: "tf1",
    npc: "Sofía",
    text: "You should speak politely to a customer at work.",
    answer: true,
    explanation:
      "Professional communication is respectful, clear, and helpful, especially with customers.",
  },
  {
    id: "tf2",
    npc: "Bruno",
    text: "Being late to an interview is a good idea because it makes you look relaxed.",
    answer: false,
    explanation:
      "Arriving on time shows responsibility and professionalism, which are important in any job interview.",
  },
  {
    id: "tf3",
    npc: "Facu",
    text: "Listening carefully during a job interview is a good habit.",
    answer: true,
    explanation:
      "Good listeners show respect, focus, and interest in the conversation.",
  },
];

const MC_QUESTIONS = [
  {
    id: "mc_teacher_clues",
    npc: "Seño Laura",
    text: "To check a poster about teachers and help Prof. Mateo, what information should you verify?",
    options: [
      "What teachers do and where they work, using a reliable source",
      "Only the poster's colors and pictures",
      "Any information, without checking it",
      "Whether the poster is the longest one",
    ],
    correctIndex: 0,
    explanation:
      "Teachers guide students and plan learning activities. Checking reliable information helps Mateo identify accurate posters.",
  },
  {
    id: "mc1",
    npc: "Male",
    text: "Which profession usually works with computers and creates technology solutions?",
    options: ["Teacher", "Engineer", "Waiter", "Farmer"],
    correctIndex: 1,
    explanation:
      "An engineer designs and develops systems, tools, and technical solutions for many industries.",
  },
  {
    id: "mc2",
    npc: "Ana",
    text: "Who is most likely to help patients in a clinic or hospital?",
    options: ["Nurse", "Photographer", "Architect", "Barber"],
    correctIndex: 0,
    explanation:
      "A nurse helps patients, takes care of them, and supports medical teams in health settings.",
  },
];

// data/its.js — Nivel 3, Sala 1
const ITS_DATA = [
  {
    id: "teacher",
    name: "Teacher",
    transmission: "Explains ideas, guides students, and organizes activities in class.",
    prevention: "Patience, clear communication, planning, and active listening.",
    note: "A good teacher helps different students grow and feel confident.",
  },
  {
    id: "doctor",
    name: "Doctor",
    transmission: "Examines patients, diagnoses problems, and plans treatment.",
    prevention: "Empathy, medical knowledge, careful observation, and teamwork.",
    note: "Doctors often work with nurses and specialists to support patients.",
  },
  {
    id: "nurse",
    name: "Nurse",
    transmission: "Cares for patients, takes vital signs, and supports medical care.",
    prevention: "Responsibility, compassion, organization, and communication.",
    note: "Nurses are essential in hospitals, clinics, and health centers.",
  },
  {
    id: "engineer",
    name: "Engineer",
    transmission: "Designs systems, solves technical problems, and improves processes.",
    prevention: "Creativity, logic, planning, and teamwork.",
    note: "Engineers create solutions in areas like transport, construction, and technology.",
  },
];

const ITS_QUIZ = [
  {
    id: "itsq1",
    text: "Why is it useful to prepare before a job interview?",
    options: [
      "Because you can answer questions more clearly and confidently",
      "Because interviews are always easy and require no preparation",
      "Because your answers should never be honest",
      "Because the interviewer does not need to understand you",
    ],
    correctIndex: 0,
    explanation:
      "Preparation helps you explain your skills and show professionalism during the interview.",
  },
  {
    id: "itsq2",
    text: "Which quality is most important when working with other people?",
    options: [
      "Being rude and impatient",
      "Listening and communicating respectfully",
      "Ignoring other people's opinions",
      "Working alone without asking for help",
    ],
    correctIndex: 1,
    explanation: "Respectful communication and listening are essential in every workplace.",
  },
];

// data/contraceptiveMethods.js — Nivel 3, Sala 2
const CONTRACEPTIVE_METHODS = [
  { id: "teacher", name: "Teacher", category: "education" },
  { id: "doctor", name: "Doctor", category: "health" },
  { id: "nurse", name: "Nurse", category: "health" },
  { id: "engineer", name: "Engineer", category: "technology" },
  { id: "architect", name: "Architect", category: "creative" },
  { id: "journalist", name: "Journalist", category: "communication" },
  { id: "chef", name: "Chef", category: "service" },
  { id: "photographer", name: "Photographer", category: "creative" },
];

const METHOD_CATEGORIES = [
  { id: "education", label: "Education" },
  { id: "health", label: "Health" },
  { id: "technology", label: "Technology" },
  { id: "creative", label: "Creative" },
  { id: "communication", label: "Communication" },
  { id: "service", label: "Service" },
];

// data/scenarios.js — Nivel 3, Sala 3 y decisiones de otros niveles
const SCENARIOS_DATA = [
  {
    id: "scen1",
    text: "A classmate is rude to a customer in a store. What is the best response?",
    options: [
      "Laugh with them and say nothing",
      "Stay calm, speak politely, and report the problem to a supervisor",
      "Ignore the situation completely",
      "Tell the customer they are wrong",
    ],
    correctIndex: 1,
    explanation:
      "Professional behavior includes staying respectful and helping solve problems calmly.",
  },
  {
    id: "scen2",
    text: "You are very nervous before a job interview. What should you do?",
    options: [
      "Cancel the interview without saying anything",
      "Practice your answers and arrive early",
      "Avoid all eye contact",
      "Say that you are not prepared at all",
    ],
    correctIndex: 1,
    explanation:
      "Being prepared and arriving on time helps you feel more confident and professional.",
  },
  {
    id: "scen_liceo",
    text: "Your teacher asks you to describe your strengths in a short sentence. What is a good answer?",
    options: [
      "I am not very good at anything",
      "I am organized, responsible, and ready to learn",
      "I do not like teamwork",
      "I only work when someone tells me exactly what to do",
    ],
    correctIndex: 1,
    explanation:
      "Positive, realistic answers about your strengths show confidence and readiness to grow.",
  },
  {
    id: "scen_red",
    text: "You receive a message saying a job offer is fake and suspicious. What is the best action?",
    options: [
      "Share it immediately with everyone",
      "Check the company details and trust official information before reacting",
      "Delete it without reading the message",
      "Reply with personal information right away",
    ],
    correctIndex: 1,
    explanation:
      "Verifying information before sharing or acting prevents mistakes and protects your safety.",
  },
];

// data/missions.js — Nivel 4: final mission fragments
const MISSIONS_DATA = [
  {
    id: "frag_its",
    label: "Jobs",
    emoji: "💼",
    challenge: {
      type: "mc",
      text: "Which profession usually helps people who are sick?",
      options: ["Teacher", "Doctor", "Pilot", "Chef"],
      correctIndex: 1,
      explanation: "Doctors help patients and work in hospitals or clinics.",
    },
  },
  {
    id: "frag_prevencion",
    label: "Respect",
    emoji: "🛡️",
    challenge: {
      type: "truefalse",
      text: "Being polite and respectful at work is part of professional behavior.",
      answer: true,
      explanation: "Respectful behavior helps people work together in a healthy environment.",
    },
  },
  {
    id: "frag_metodos",
    label: "Skills",
    emoji: "🧠",
    challenge: {
      type: "mc",
      text: "Which skill is especially important for a good interview?",
      options: ["Listening carefully", "Ignoring the questions", "Arriving late", "Talking loudly all the time"],
      correctIndex: 0,
      explanation: "Listening carefully helps you answer clearly and show interest in the conversation.",
    },
  },
  {
    id: "frag_mitos",
    label: "Job myths",
    emoji: "💭",
    challenge: {
      type: "mito",
      text: "It is enough to be friendly if you are late to a job interview.",
      answer: "mito",
      explanation: "Punctuality and preparation are more important than being only friendly.",
    },
  },
  {
    id: "frag_autocuidado",
    label: "Professional habits",
    emoji: "✅",
    challenge: {
      type: "mc",
      text: "Which action shows responsibility at work?",
      options: [
        "Completing tasks on time",
        "Leaving without telling anyone",
        "Ignoring deadlines",
        "Using your phone during a meeting without permission",
      ],
      correctIndex: 0,
      explanation: "Responsibility means meeting deadlines and acting professionally.",
    },
  },
];

const BONUS_FRAGMENT = {
  id: "frag_bonus",
  label: "Career tip",
  emoji: "✨",
  text: "Tip: preparation, respect, and clear communication help you succeed in the workplace.",
};

const FINAL_MISSION_TARGETS = [
  { id: "teacher", name: "Teacher", kind: "bacteria", icon: "📚", color: "#C6F135" },
  { id: "doctor", name: "Doctor", kind: "virus", icon: "🩺", color: "#8DB4FF" },
  { id: "nurse", name: "Nurse", kind: "bacteria", icon: "🩹", color: "#FFB347" },
  { id: "engineer", name: "Engineer", kind: "virus", icon: "🛠️", color: "#B78CFF" },
  { id: "architect", name: "Architect", kind: "bacteria", icon: "🏗️", color: "#FFB347" },
  { id: "journalist", name: "Journalist", kind: "virus", icon: "📰", color: "#8DB4FF" },
  { id: "chef", name: "Chef", kind: "bacteria", icon: "🍳", color: "#C6F135" },
];

/* ================================================================
   PERSONAJES SELECCIONABLES
   ================================================================ */
const CHARACTERS = [
  { id: "avatar_g1", emoji: "👧🏻", color: "#7CE0C6", skin: "#F6C9A7", hair: "#342B35", hairStyle: "long", gender: "girl" },
  { id: "avatar_g2", emoji: "👧🏽", color: "#FF8FB1", skin: "#B97850", hair: "#4A261D", hairStyle: "long", gender: "girl" },
  { id: "avatar_g3", emoji: "👧🏾", color: "#C6F135", skin: "#8D5524", hair: "#201A1C", hairStyle: "long", gender: "girl" },
  { id: "avatar_b1", emoji: "👦🏾", color: "#FFD166", skin: "#8D5524", hair: "#201A1C", hairStyle: "short", gender: "boy" },
  { id: "avatar_b2", emoji: "👦🏼", color: "#8DB4FF", skin: "#D39A73", hair: "#5A3A2E", hairStyle: "short", gender: "boy" },
  { id: "avatar_b3", emoji: "👦🏻", color: "#B78CFF", skin: "#F6C9A7", hair: "#342B35", hairStyle: "short", gender: "boy" },
];

/* ================================================================
   SISTEMAS: colisiones y utilidades
   ================================================================ */
function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function borderWalls(width, height, t = 24) {
  return [
    { x: 0, y: 0, w: width, h: t },
    { x: 0, y: height - t, w: width, h: t },
    { x: 0, y: 0, w: t, h: height },
    { x: width - t, y: 0, w: t, h: height },
  ];
}

function roomWalls(x, y, w, h, side, doorStart, doorSize, t = 18, bottomDoorStart = null, bottomDoorSize = 0) {
  const doorEnd = doorStart + doorSize;
  if (side === "right" || side === "left") {
    const wallX = side === "right" ? x + w - t : x;
    const wallW = t;
    return [
      { x, y, w, h: t },
      { x: wallX, y, w: wallW, h: Math.max(0, doorStart - y) },
      { x: wallX, y: doorEnd, w: wallW, h: Math.max(0, y + h - doorEnd) },
      { x, y: y + h - t, w: Math.max(0, bottomDoorStart === null ? w : bottomDoorStart - x), h: t },
      ...(bottomDoorStart === null
        ? []
        : [{
            x: bottomDoorStart + bottomDoorSize,
            y: y + h - t,
            w: Math.max(0, x + w - bottomDoorStart - bottomDoorSize),
            h: t,
          }]),
    ];
  }
  return [
    { x, y, w, h: t },
    { x, y, w: t, h },
    { x: x + w - t, y, w: t, h },
    { x, y: y + h - t, w: Math.max(0, doorStart - x), h: t },
    { x: doorEnd, y: y + h - t, w: Math.max(0, x + w - doorEnd), h: t },
  ];
}

function buildLiceoCollisionWalls(width, height) {
  const walls = [];
  const addHorizontal = (y, segments, h = 24) => segments.forEach(([x, w]) => walls.push({ x, y, w, h }));
  const addVertical = (x, segments, w = 24) => segments.forEach(([y, h]) => walls.push({ x, y, w, h }));

  // Contorno rojo del hall real: izquierda 420, derecha 1110, arriba 310 y abajo 610.
  // El hueco superior coincide con la escalera; el inferior, con la puerta principal.
  addHorizontal(310, [[420, 300], [850, 260]]);
  addVertical(420, [[310, 300]]);
  addVertical(1110, [[310, 300]]);
  addHorizontal(610, [[420, 220], [900, 210]]);

  // La galeria superior se alcanza unicamente por la escalera central.
  addHorizontal(270, [[420, 300], [850, 260]]);

  // Pared inferior de 1A-1D. Los cuatro huecos coinciden con las puertas visibles.
  addHorizontal(185, [[300, 95], [490, 130], [730, 130], [970, 130], [1210, 80]]);

  // Divisiones entre aulas superiores, sin cerrar la galeria inferior.
  addVertical(300, [[25, 160]]);
  addVertical(540, [[25, 160]]);
  addVertical(780, [[25, 160]]);
  addVertical(1020, [[25, 160]]);
  addVertical(1260, [[25, 160]]);
  return walls;
}

/* ================================================================
   AUDIO — placeholders sintetizados (sin archivos externos)
   ================================================================ */
function useSound() {
  const ctxRef = useRef(null);
  const play = useCallback((type) => {
    try {
      if (!ctxRef.current) {
        const AC = window.AudioContext || window.webkitAudioContext;
        ctxRef.current = new AC();
      }
      const ctx = ctxRef.current;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      const now = ctx.currentTime;
      const presets = {
        pickup: { freq: 660, dur: 0.12, type: "triangle" },
        correct: { freq: 880, dur: 0.18, type: "sine" },
        incorrect: { freq: 160, dur: 0.22, type: "sawtooth" },
        star: { freq: 1040, dur: 0.28, type: "sine" },
        unlock: { freq: 520, dur: 0.3, type: "square" },
        complete: { freq: 720, dur: 0.4, type: "sine" },
        step: { freq: 220, dur: 0.03, type: "square" },
      };
      const p = presets[type] || presets.pickup;
      o.type = p.type;
      o.frequency.setValueAtTime(p.freq, now);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.06, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + p.dur);
      o.start(now);
      o.stop(now + p.dur + 0.02);
    } catch (e) {
      /* audio no disponible: placeholder silencioso */
    }
  }, []);
  return play;
}

/* ================================================================
   CONFIGURACIÓN DE NIVELES (scenes/*)
   ================================================================ */
function buildLevels() {
  const W1 = 1536, H1 = 1024;
  const level1 = {
    id: "liceo",
    name: "Job Clues",
    subtitle: "Professions and careers",
    width: W1,
    height: H1,
    backgroundImage: publicAsset("liceo.png"),
    floorColor: "#EDE6D6",
    accent: "#C6F135",
    spawn: { x: 735, y: 780 },
    walls: [
      ...borderWalls(W1, H1),
      // frente de aulas superiores, con puertas entre el pasillo y cada salon
      { x: 28, y: 270, w: 150, h: 24 },
      { x: 250, y: 270, w: 70, h: 24 },
      { x: 380, y: 270, w: 50, h: 24 },
      { x: 500, y: 270, w: 70, h: 24 },
      { x: 630, y: 270, w: 50, h: 24 },
      { x: 750, y: 270, w: 70, h: 24 },
      { x: 880, y: 270, w: 50, h: 24 },
      { x: 1000, y: 270, w: 70, h: 24 },
      { x: 1130, y: 270, w: 50, h: 24 },
      { x: 1250, y: 270, w: 222, h: 24 },
      // divisiones de aulas, dejando un vano de puerta en cada acceso
      { x: 230, y: 28, w: 24, h: 105 },
      { x: 230, y: 190, w: 24, h: 80 },
      { x: 480, y: 28, w: 24, h: 105 },
      { x: 480, y: 190, w: 24, h: 80 },
      { x: 730, y: 28, w: 24, h: 105 },
      { x: 730, y: 190, w: 24, h: 80 },
      { x: 980, y: 28, w: 24, h: 105 },
      { x: 980, y: 190, w: 24, h: 80 },
      { x: 1230, y: 28, w: 24, h: 105 },
      { x: 1230, y: 190, w: 24, h: 80 },
      // aulas laterales del segundo piso
      { x: 28, y: 470, w: 65, h: 24 },
      { x: 145, y: 470, w: 93, h: 24 },
      { x: 28, y: 680, w: 65, h: 24 },
      { x: 145, y: 680, w: 93, h: 24 },
      { x: 1260, y: 470, w: 65, h: 24 },
      { x: 1377, y: 470, w: 95, h: 24 },
      { x: 1260, y: 680, w: 65, h: 24 },
      { x: 1377, y: 680, w: 95, h: 24 },
      { x: 238, y: 300, w: 24, h: 130 },
      { x: 238, y: 500, w: 24, h: 150 },
      { x: 1238, y: 300, w: 24, h: 130 },
      { x: 1238, y: 500, w: 24, h: 150 },
      // biblioteca, direccion y secretaria en los laterales inferiores
      { x: 28, y: 760, w: 210, h: 24 },
      { x: 1260, y: 760, w: 212, h: 24 },
      { x: 238, y: 710, w: 24, h: 150 },
      { x: 1238, y: 710, w: 24, h: 150 },
      // hall central y escalera
      { x: 330, y: 360, w: 380, h: 24 },
      { x: 790, y: 360, w: 380, h: 24 },
      { x: 330, y: 360, w: 24, h: 150 },
      { x: 1146, y: 360, w: 24, h: 150 },
    ],
    collisionWalls: [
      { x: 420, y: 310, w: 300, h: 24 },
      { x: 850, y: 310, w: 260, h: 24 },
      { x: 420, y: 310, w: 24, h: 300 },
      { x: 420, y: 610, w: 220, h: 24 },
      { x: 900, y: 610, w: 210, h: 24 },
      { x: 300, y: 185, w: 95, h: 24 },
      { x: 490, y: 185, w: 130, h: 24 },
      { x: 1210, y: 185, w: 80, h: 24 },
      { x: 300, y: 25, w: 24, h: 160 },
      { x: 75.94006238425663, y: 532.1354163805343, w: 238, h: 8 },
      { x: 70.60673413718632, y: 390.1354011217452, w: 9.333328247070312, h: 309.3333282470703 },
      { x: 75.27340589011601, y: 690.802103392253, w: 236, h: 8 },
      { x: 321.273405890116, y: 608.1354163805343, w: 111.33334350585938, h: 11.33331298828125 },
      { x: 298.6067493959754, y: 612.8020728746749, w: 14.666656494140625, h: 78.66665649414062 },
      { x: 73.94006238425663, y: 360.51472936881146, w: 228.66668701171875, h: 8.66668701171875 },
      { x: 307.273405890116, y: 367.18139063132367, w: 12, h: 48.66668701171875 },
      { x: 69.33334350585938, y: 195.3333282470703, w: 8.666656494140625, h: 168.66668701171875 },
      { x: 72, y: 186.6666717529297, w: 238.66668701171875, h: 12 },
      { x: 311.3333435058594, y: 204.87853881594475, w: 12.666656494140625, h: 48.666656494140625 },
      { x: 313.3333435058594, y: 4.6666717529296875, w: 446.6666564941406, h: 11.333328247070312 },
      { x: 518, y: 13.333328247070312, w: 8.66668701171875, h: 102 },
      { x: 758.2813119648073, y: 2.6666717529296875, w: 12.66668701171875, h: 171.33334350585938 },
      { x: 697.6146859882448, y: 172.00001525878906, w: 170, h: 20.666656494140625 },
      { x: 770.8830093017267, y: 0.6666717529296875, w: 455.33331298828136, h: 11.333328247070312 },
      { x: 1214.216322290008, y: 13.333328247070312, w: 14.66668701171875, h: 96 },
      { x: 993.5496963134455, y: 9.333328247070312, w: 24.6666259765625, h: 103.33334350585938 },
      { x: 934.8830093134455, y: 167.3333282470703, w: 130.66668701171886, h: 17.333343505859375 },
      { x: 1142.8830093012268, y: 168.00001525878906, w: 62, h: 15.33331298828125 },
      { x: 1207.3333740234375, y: 205.3973704504868, w: 22, h: 53.33332824707031 },
      { x: 1293.3333740234375, y: 193.3973704504868, w: 164, h: 14.666671752929688 },
      { x: 1216.6666870117188, y: 359.39738570927585, w: 238.66668701171875, h: 13.33331298828125 },
      { x: 1209.3333740234375, y: 335.39737070927585, w: 22.6666259765625, h: 92.66665649414062 },
      { x: 1450.6666870117188, y: 196.06404220341648, w: 20, h: 350.66665649414057 },
      { x: 1216.6666870117188, y: 530.0640727209945, w: 237.33331298828125, h: 15.33331298828125 },
      { x: 1212.6666870117188, y: 512.0640727209945, w: 16.66668701171875, h: 47.33331298828125 },
      { x: 1229.3333740234375, y: 9.93026885804312, w: 229.33331298828125, h: 16.666671752929688 },
      { x: 1452.6666870117188, y: 13.263597105113433, w: 16, h: 186 },
      { x: 1455.3333740234375, y: 547.85362285432, w: 20.6666259765625, h: 158 },
      { x: 1211.3333740234375, y: 686.5203098660387, w: 244, h: 14 },
      { x: 1121.3333740234375, y: 605.85362285432, w: 104.6666259765625, h: 16 },
      { x: 1208, y: 622.5202793484606, w: 29.3333740234375, h: 63.333343505859375 },
      { x: 1069.3333740234375, y: 335.5255237536139, w: 25.33331298828125, h: 274.6666717529297 },
    ],
    decorations: [
      { x: 55, y: 60, emoji: "📚", kind: "books", size: 34 },
      { x: 300, y: 60, emoji: "🪑", kind: "desk", size: 28 },
      { x: 550, y: 60, emoji: "🪑", kind: "desk", size: 28 },
      { x: 800, y: 60, emoji: "🪑", kind: "desk", size: 28 },
      { x: 1050, y: 60, emoji: "🪑", kind: "desk", size: 28 },
      { x: 1300, y: 60, emoji: "📚", kind: "books", size: 34 },
      { x: 70, y: 330, emoji: "🪑", kind: "desk", size: 28 },
      { x: 70, y: 530, emoji: "🪑", kind: "desk", size: 28 },
      { x: 1300, y: 330, emoji: "🪑", kind: "desk", size: 28 },
      { x: 1300, y: 530, emoji: "🪑", kind: "desk", size: 28 },
      { x: 420, y: 470, emoji: "🌳", kind: "tree", size: 38 },
      { x: 1080, y: 470, emoji: "🌳", kind: "tree", size: 38 },
      { x: 650, y: 580, emoji: "🪑", kind: "desk", size: 30 },
      { x: 820, y: 580, emoji: "🪑", kind: "desk", size: 30 },
      { x: 90, y: 800, emoji: "📚", kind: "books", size: 34 },
      { x: 1290, y: 800, emoji: "📚", kind: "books", size: 34 },
    ],
    labels: [
      { x: 55, y: 45, text: "BAÑOS" },
      { x: 285, y: 45, text: "1A" },
      { x: 535, y: 45, text: "1B" },
      { x: 785, y: 45, text: "1C" },
      { x: 1035, y: 45, text: "1D" },
      { x: 1290, y: 45, text: "SALA DOCENTE" },
      { x: 55, y: 315, text: "2A" },
      { x: 55, y: 515, text: "2B" },
      { x: 1290, y: 315, text: "2C" },
      { x: 1290, y: 515, text: "2D" },
      { x: 410, y: 345, text: "HALL CENTRAL" },
      { x: 55, y: 745, text: "DIRECCION" },
      { x: 1290, y: 745, text: "SECRETARIA" },
      { x: 55, y: H1 - 90, text: "ENTRADA" },
    ],
    npcs: [
      {
        id: "prof_ana",
        x: 735,
        y: 500,
        name: "Prof. Ariana",
        emoji: "👩🏽‍🏫",
        color: "#FFD166",
        dialogue: [
          "I need your help! Five posters about different professions have appeared at school, but some may contain false information.",
          "Explore the classrooms and check each poster: learn what each professional does and where they work. If something does not match, mark it as a myth.",
          "You can also talk to Laura to learn about teaching. When you finish checking the posters, talk to Cami to solve the situation and continue your journey.",
        ],
      },
      {
        id: "teacher_guide",
        x: 650,
        y: 780,
        name: "Laura",
        emoji: "👩🏻‍🏫",
        color: "#7CE0C6",
        dialogue: [
          "Being a teacher is about more than explaining topics: I also prepare activities, support my students, and help them learn.",
          "To help Professor Mateo, let's carefully review what each poster says about the professions.",
        ],
        challenge: { type: "mc", dataId: "mc_teacher_clues", starIndex: 1 },
      },
      {
        id: "cami_decision",
        x: 735,
        y: 560,
        name: "Cami",
        emoji: "🧑🏽",
        color: "#FF8FB1",
        dialogue: [
          "Hey, can I ask you something?",
        ],
        challenge: { type: "decision", scenarioId: "scen_liceo", starIndex: 3 },
      },
    ],
    objects: [
      { id: "msg1", x: 380, y: 90, type: "mito", emoji: "📄", label: "Classroom 1A poster", dataId: "myth1" },
      { id: "msg2", x: 610, y: 90, type: "mito", emoji: "📄", label: "Classroom 1B poster", dataId: "myth2" },
      { id: "msg3", x: 850, y: 90, type: "mito", emoji: "📄", label: "Classroom 1C poster", dataId: "myth3" },
      { id: "msg4", x: 1090, y: 90, type: "mito", emoji: "📄", label: "Classroom 1D poster", dataId: "myth4" },
      { id: "msg5", x: 1360, y: 500, type: "mito", emoji: "📄", label: "Classroom 2D poster", dataId: "myth5" },
      {
        id: "hidden_book",
        x: 1360,
        y: 590,
        type: "pista",
        emoji: "📖",
        label: "Book",
        text: "Secret clue: consent and open communication are also part of self-care.",
        starIndex: 2,
      },
    ],
    exit: { x: 640, y: 590, w: 260, h: 40, label: "MAIN EXIT" },
    objectivesRequired: ["msg1", "msg2", "msg3", "msg4", "msg5"],
  };

  const W2 = 1152, H2 = 768;
  const level2 = {
    id: "rumores",
    name: "Workplace Decisions",
    subtitle: "Professional behavior and workplace rules",
    width: W2,
    height: H2,
    backgroundImage: publicAsset("plaza.png"),
    floorColor: "#DCEFE3",
    accent: "#FF4D8D",
    spawn: { x: 540, y: 650 },
    walls: [
      { x: 0, y: 0, w: 1152, h: 24 },
      { x: 0, y: 744, w: 1152, h: 24 },
      { x: 0, y: 0, w: 24, h: 768 },
      { x: 1128, y: 0, w: 24, h: 768 },
      { x: 500, y: 285, w: 155, h: 150 },
      { x: 530, y: 82, w: 95, h: 125 },
      { x: 155, y: 115, w: 115, h: 135 },
      { x: 805, y: 130, w: 185, h: 155 },
      { x: 92, y: 365, w: 270, h: 205 },
      { x: 790, y: 365, w: 270, h: 205 },
      { x: 80, y: 610, w: 420, h: 26 },
      { x: 700, y: 610, w: 370, h: 26 },
      { x: 438.3333435058594, y: 482.0000190734863, w: 97.33334350585938, h: 86 },
      { x: 615, y: 478.66667556762695, w: 100, h: 91.33334350585938 },
    ],
    decorations: [],
    labels: [],
    npcs: [
      {
        id: "sofia",
        x: 220,
        y: 285,
        name: "Sofia",
        emoji: "🧑🏻",
        color: "#7CE0C6",
        skin: "#F6C9A7",
        hair: "#342B35",
        dialogue: ["Hey, is what they told me in the chat true?"],
        challenge: { type: "truefalse", dataId: "tf1", starIndex: 1 },
      },
      {
        id: "bruno",
        x: 680,
        y: 225,
        name: "Bruno",
        emoji: "🧑🏾",
        color: "#FFD166",
        skin: "#8D5524",
        hair: "#201A1C",
        dialogue: ["I have a question about something I read."],
        challenge: { type: "truefalse", dataId: "tf2", starIndex: 1 },
      },
      {
        id: "facu",
        x: 955,
        y: 300,
        name: "Facu",
        emoji: "🧑🏼",
        color: "#8DB4FF",
        skin: "#D39A73",
        hair: "#5A3A2E",
        dialogue: ["A friend told me how to stay safe, but I am not sure if that is right."],
        challenge: { type: "truefalse", dataId: "tf3", starIndex: 1 },
      },
      {
        id: "male",
        x: 345,
        y: 245,
        name: "Male",
        emoji: "🧑🏽",
        color: "#FF8FB1",
        skin: "#B97850",
        hair: "#342B35",
        dialogue: ["Do you know which prevention methods are effective?"],
        challenge: { type: "mc", dataId: "mc1", starIndex: 1 },
      },
      {
        id: "ana",
        x: 960,
        y: 535,
        name: "Ana",
        emoji: "🧑🏻",
        color: "#C6F135",
        skin: "#F6C9A7",
        hair: "#6B3F2A",
        dialogue: ["If you have questions, who should you ask?"],
        challenge: { type: "mc", dataId: "mc2", starIndex: 1 },
      },
      {
        id: "vero",
        x: 440,
        y: 430,
        name: "Vero",
        emoji: "🧑🏾",
        color: "#FF8FB1",
        skin: "#8D5524",
        hair: "#201A1C",
        dialogue: ["I received a message that really worried me, and I do not know what to do."],
        challenge: { type: "decision", scenarioId: "scen_red", starIndex: 3 },
      },
    ],
    objects: [
      {
        id: "hidden_phone",
        x: 285,
        y: 250,
        type: "pista",
        emoji: "📱",
        label: "Lost phone",
        text: "Secret clue: before forwarding a message, check whether it comes from a reliable source.",
        starIndex: 2,
      },
    ],
    exit: { x: 510, y: 650, w: 130, h: 40, label: "EXIT" },
    objectivesRequired: ["sofia", "bruno", "facu", "male", "ana"],
    objectivesAreNpcs: true,
  };

  const W3 = 1152, H3 = 768;
  const level3 = {
    id: "centro",
    name: "Career Center",
    subtitle: "Jobs, skills and interview preparation",
    width: W3,
    height: H3,
    backgroundImage: publicAsset("hospital.png"),
    floorColor: "#E4EEFB",
    accent: "#8DB4FF",
    spawn: { x: 535, y: 665 },
    walls: [
      { x: 0, y: 0, w: 1152, h: 24 },
      { x: 0, y: 744, w: 1152, h: 24 },
      { x: 0, y: 0, w: 24, h: 768 },
      { x: 1128, y: 0, w: 24, h: 768 },
      { x: 105, y: 18, w: 260, h: 18 },
      { x: 347, y: 18, w: 18, h: 70 },
      { x: 382, y: 18, w: 238, h: 18 },
      { x: 650, y: 18, w: 270, h: 18 },
      { x: 930, y: 100, w: 190, h: 18 },
      { x: 930, y: 100, w: 18, h: 70 },
      { x: 930, y: 265, w: 18, h: 165 },
      { x: 930, y: 412, w: 190, h: 18 },
      { x: 317, y: 180, w: 18, h: 40 },
      { x: 700, y: 180, w: 18, h: 40 },
      { x: 700, y: 432, w: 220, h: 18 },
      { x: 420, y: 190, w: 205, h: 18 },
      { x: 350, y: 410, w: 105, h: 28 },
      { x: 625, y: 410, w: 75, h: 28 },
      { x: 815, y: 475, w: 250, h: 24 },
      { x: 893.7866634437322, y: 38, w: 10.66668701171875, h: 107.33332824707031 },
      { x: 896.0898841402447, y: 320.1645558931794, w: 17.3333740234375, h: 104.66665649414062 },
      { x: 899.4232581636822, y: 198.1645558931794, w: 13.33331298828125, h: 96 },
      { x: 707.4232581636822, y: 284.83121238732, w: 196, h: 20 },
      { x: 702.7565711519635, y: 168.1645558931794, w: 210, h: 9.333343505859375 },
      { x: 896.0898841402447, y: 140.83121238732002, w: 18, h: 58.66668701171875 },
      { x: 633.7223344233155, y: 28.666671752929688, w: 20.6666259765625, h: 84.66665649414062 },
      { x: 599.0556474115967, y: 102.00001525878906, w: 48.66668701171875, h: 15.33331298828125 },
      { x: 483.72230390573736, y: 106.66667175292969, w: 66, h: 17.333343505859375 },
      { x: 483.72230390573736, y: 37.33332824707031, w: 60.666656494140625, h: 78 },
      { x: 364.8774665095533, y: 30, w: 28.666656494140625, h: 83.33332824707031 },
      { x: 102.8774665095533, y: 161.3333282470703, w: 228, h: 20 },
      { x: 110.66667175292969, y: 32.00000286102295, w: 14.666671752929688, h: 252.00000762939453 },
      { x: 116, y: 286.6666669845581, w: 212.66668701171875, h: 12.66668701171875 },
      { x: 319.3333435058594, y: 260.6666669845581, w: 12, h: 65.33334350585938 },
      { x: 324, y: 379.33335399627686, w: 16, h: 53.33331298828125 },
      { x: 109.33334350585938, y: 416.6666669845581, w: 212, h: 18 },
      { x: 107.33334350585938, y: 282.0000104904175, w: 12.666656494140625, h: 139.33334350585938 },
      { x: 492, y: 321.3333282470703, w: 60.66668701171875, h: 8 },
      { x: 610.6666870117188, y: 332.00001525878906, w: 42.66668701171875, h: 8 },
      { x: 403.3333435058594, y: 354.00001525878906, w: 35.333343505859375, h: 12.666656494140625 },
      { x: 408, y: 324.00001525878906, w: 35.333343505859375, h: 10 },
      { x: 612, y: 360.6666717529297, w: 34.66668701171875, h: 9.333343505859375 },
      { x: 459.53463874183467, y: 234.92057926467822, w: 118.00003051757812, h: 13.333343505859375 },
    ],
    decorations: [
      { x: 470, y: 315, emoji: "🪑", size: 30 },
      { x: 570, y: 315, emoji: "🪑", size: 30 },
      { x: 475, y: 350, emoji: "🪑", size: 30 },
      { x: 575, y: 350, emoji: "🪑", size: 30 },
    ],
    labels: [
      { x: 140, y: 45, text: "ROOM 1 · STIs" },
      { x: 735, y: 45, text: "ROOM 2 · METHODS" },
      { x: 385, y: 520, text: "ROOM 3 · DECISIONS" },
    ],
    npcs: [
      {
        id: "enfermera_rosa",
        x: 775,
        y: 235,
        name: "Enf. Rosa",
        emoji: "🧑🏽‍⚕️",
        color: "#8DB4FF",
        dialogue: [
          "Read the four STI information cards in the room, then let's talk.",
        ],
        challenge: { type: "quiz_multi", dataKey: "ITS_QUIZ", starIndex: 1, requires: ["its_vih", "its_sifilis", "its_gonorrea", "its_vph"] },
      },
      {
        id: "doctor_lucas",
        x: 500,
        y: 335,
        name: "Dr. Lucas",
        emoji: "🧑🏾‍⚕️",
        color: "#C6F135",
        dialogue: ["Let's think through a couple of real-life situations together."],
        challenge: { type: "scenarios_multi", scenarioIds: ["scen1", "scen2"], starIndex: 3 },
      },
    ],
    objects: [
      { id: "its_vih", x: 150, y: 70, type: "infocard", emoji: "🗂️", label: "Information card", dataId: "vih" },
      { id: "its_sifilis", x: 775, y: 70, type: "infocard", emoji: "🗂️", label: "Information card", dataId: "sifilis" },
      { id: "its_gonorrea", x: 150, y: 245, type: "infocard", emoji: "🗂️", label: "Information card", dataId: "gonorrea" },
      { id: "its_vph", x: 150, y: 385, type: "infocard", emoji: "🗂️", label: "Information card", dataId: "vph" },
      {
        id: "dragdrop_station",
        x: 790,
        y: 385,
        type: "dragdrop",
        emoji: "🗃️",
        label: "Classification table",
        starIndex: 2,
      },
    ],
    exit: { x: 510, y: 700, w: 130, h: 40, label: "EXIT" },
    objectivesRequired: ["enfermera_rosa_done", "dragdrop_done", "doctor_lucas_done"],
    customObjectives: true,
  };

  const W4 = 1500, H4 = 950;
  const level4 = {
    id: "mision",
    name: "Final Mission",
    subtitle: "Apply everything to get the job",
    width: W4,
    height: H4,
    floorColor: "#EAF7EC",
    accent: "#FFD166",
    spawn: { x: 120, y: H4 - 120 },
    walls: [...borderWalls(W4, H4), { x: 700, y: 350, w: 24, h: 300 }],
    decorations: [
      { x: 300, y: 200, emoji: "🌳", size: 36 },
      { x: 1200, y: 200, emoji: "🌳", size: 36 },
      { x: 300, y: 750, emoji: "🌳", size: 36 },
      { x: 1200, y: 750, emoji: "🌳", size: 36 },
    ],
    labels: [{ x: 40, y: 40, text: "SCHOOL COURTYARD" }],
    npcs: [
      {
        id: "marcos",
        x: 250,
        y: 250,
        name: "Coord. Marcos",
        emoji: "🧑🏻‍🏫",
        color: "#FFD166",
        dialogue: [
          "Hey, we need to put together reliable information to share at school.",
          "Explore the courtyard and collect the five fragments: STIs, prevention, methods, myths, and self-care.",
          "Each one is protected by a challenge. Good luck!",
        ],
      },
    ],
    objects: [
      { id: "frag_its", x: 300, y: 700, type: "fragment", missionId: "frag_its" },
      { id: "frag_prevencion", x: 1300, y: 300, type: "fragment", missionId: "frag_prevencion" },
      { id: "frag_metodos", x: 1300, y: 700, type: "fragment", missionId: "frag_metodos" },
      { id: "frag_mitos", x: 750, y: 150, type: "fragment", missionId: "frag_mitos" },
      { id: "frag_autocuidado", x: 750, y: 800, type: "fragment", missionId: "frag_autocuidado" },
      {
        id: "frag_bonus",
        x: 60,
        y: 60,
        type: "bonus",
        emoji: "✨",
        label: "???",
        starIndex: 2,
      },
    ],
    exit: { x: 1400, y: 40, w: 90, h: 40, label: "EXIT" },
    objectivesRequired: ["frag_its", "frag_prevencion", "frag_metodos", "frag_mitos", "frag_autocuidado"],
  };

  return { liceo: level1, rumores: level2, centro: level3, mision: level4 };
}

const LEVEL_ORDER = ["liceo", "rumores", "centro", "mision"];

/* ================================================================
   CONSTANTES DE MOTOR
   ================================================================ */
const VIEW_W = 900;
const VIEW_H = 540;
const PLAYER_SIZE = 34;
const PLAYER_SPEED = 230;
const INTERACT_RADIUS = 60;

function areLevelObjectivesComplete(levelConfig, runtime) {
  const required = levelConfig.objectivesRequired;
  return levelConfig.customObjectives
    ? required.every((key) => runtime.doneObjects[key] || runtime.doneNpcs[key])
    : levelConfig.objectivesAreNpcs
    ? required.every((id) => runtime.doneNpcs[id])
    : required.every((id) => runtime.doneObjects[id] || runtime.doneNpcs[id]);
}

const EMPTY_EDITOR_CONTENT = {
  npcs: [],
  objects: [],
  npcOverrides: {},
  objectOverrides: {},
  removedNpcIds: [],
  removedObjectIds: [],
  removedChallengeIds: [],
  challengeOverrides: {},
};

function normalizeEditorContent(content = {}) {
  return {
    ...EMPTY_EDITOR_CONTENT,
    ...content,
    npcs: Array.isArray(content.npcs) ? content.npcs : [],
    objects: Array.isArray(content.objects) ? content.objects : [],
    npcOverrides: content.npcOverrides || {},
    objectOverrides: content.objectOverrides || {},
    removedNpcIds: Array.isArray(content.removedNpcIds) ? content.removedNpcIds : [],
    removedObjectIds: Array.isArray(content.removedObjectIds) ? content.removedObjectIds : [],
    removedChallengeIds: Array.isArray(content.removedChallengeIds) ? content.removedChallengeIds : [],
    challengeOverrides: content.challengeOverrides || {},
  };
}

function challengeQuestionsForNpc(npc) {
  const challenge = npc.challenge;
  if (!challenge) return [];
  if (challenge.type === "editor") return challenge.questions || [];

  if (challenge.type === "truefalse") {
    const data = TRUEFALSE_DATA.find((item) => item.id === challenge.dataId);
    return data ? [{
      text: data.text,
      options: ["Verdadero", "Falso"],
      correctIndex: data.answer ? 0 : 1,
      explanation: data.explanation,
    }] : [];
  }
  if (challenge.type === "mc") {
    const data = MC_QUESTIONS.find((item) => item.id === challenge.dataId);
    return data ? [{ text: data.text, options: data.options, correctIndex: data.correctIndex, explanation: data.explanation }] : [];
  }
  if (challenge.type === "decision") {
    const data = SCENARIOS_DATA.find((item) => item.id === challenge.scenarioId);
    return data ? [{ text: data.text, options: data.options, correctIndex: data.correctIndex, explanation: data.explanation }] : [];
  }
  if (challenge.type === "quiz_multi") {
    return (challenge.dataKey === "ITS_QUIZ" ? ITS_QUIZ : []).map((item) => ({
      text: item.text,
      options: item.options,
      correctIndex: item.correctIndex,
      explanation: item.explanation,
    }));
  }
  if (challenge.type === "scenarios_multi") {
    return challenge.scenarioIds
      .map((id) => SCENARIOS_DATA.find((item) => item.id === id))
      .filter(Boolean)
      .map((item) => ({ text: item.text, options: item.options, correctIndex: item.correctIndex, explanation: item.explanation }));
  }
  return [];
}

/* ================================================================
   COMPONENTES DE UI
   ================================================================ */

function StarRow({ count, size = 18 }) {
  return (
    <span style={{ letterSpacing: 2 }}>
      {[1, 2, 3].map((i) => (
        <span key={i} style={{ fontSize: size, opacity: i <= count ? 1 : 0.28 }}>
          {i <= count ? "⭐" : "☆"}
        </span>
      ))}
    </span>
  );
}

function PixelPanel({ children, role, style }) {
  return (
    <div
      role={role}
      style={{
        background: "rgba(16, 22, 58, 0.92)",
        border: "3px solid #C6F135",
        borderRadius: 14,
        boxShadow: "0 8px 0 rgba(0,0,0,0.35)",
        color: "#F5F5F5",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

const editorInputStyle = {
  display: "block",
  width: "100%",
  marginTop: 3,
  padding: "6px 7px",
  borderRadius: 5,
  border: "1px solid #8DB4FF",
  background: "#10163A",
  color: "#F5F5F5",
  font: "inherit",
};

const editorActionButtonStyle = {
  border: "1px solid #617098",
  borderRadius: 5,
  padding: "4px 6px",
  background: "#26344A",
  color: "#F5F5F5",
  cursor: "pointer",
};

function BigButton({ children, onClick, color = "#C6F135", dark = false, disabled = false, style }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.65 : 1,
        fontFamily: "'Baloo 2', sans-serif",
        fontWeight: 700,
        fontSize: 16,
        padding: "10px 22px",
        borderRadius: 10,
        border: "none",
        background: color,
        color: dark ? "#F5F5F5" : "#10163A",
        boxShadow: "0 4px 0 rgba(0,0,0,0.35)",
        transition: "transform 0.08s ease",
        ...style,
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = "translateY(2px)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
    >
      {children}
    </button>
  );
}

const UI_TEXT = {
  es: {
    introLine: "Explora. Descubrí. Decidí.",
    writeName: "Escribí tu nombre y elegí un avatar:",
    placeholder: "Tu nombre",
    startAs: "Comenzar como",
    player: "jugador",
    mapTitle: "MAPA DE JOB QUEST",
    playingAs: "Jugando como",
    locked: "Bloqueado",
    quickTooltip: "Cada mapa se desbloquea al completar todos sus desafíos y objetivos. Las respuestas incorrectas descuentan estrellas del resultado.",
    instructions: "¿Cómo se juega?",
    closeInstructions: "Entendido",
    labelCareerClues: "Career Clues",
    labelSignals: "Workplace Signals",
    labelCareerCenter: "Career Center",
    labelFinalMission: "Final Mission",
    labelStart: "Comenzar",
  },
  en: {
    introLine: "Explore. Discover. Decide.",
    writeName: "Write your name and choose an avatar:",
    placeholder: "Your name",
    startAs: "Start as",
    player: "player",
    mapTitle: "JOB QUEST MAP",
    playingAs: "Playing as",
    locked: "Locked",
    quickTooltip: "Each map unlocks after completing all of its challenges and objectives. Incorrect answers reduce the stars earned.",
    instructions: "How to play",
    closeInstructions: "Got it",
    labelCareerClues: "Career Clues",
    labelSignals: "Workplace Signals",
    labelCareerCenter: "Career Center",
    labelFinalMission: "Final Mission",
    labelStart: "Start",
  },
};

/* ---------- Pantalla de selección de personaje ---------- */
function CharacterSelectScreen({ onSelect, language = "en" }) {
  const [hover, setHover] = useState(null);
  const [selectedAvatar, setSelectedAvatar] = useState(CHARACTERS[0]);
  const [playerName, setPlayerName] = useState("");
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  function startGame() {
    const name = playerName.trim();
    if (!name) return;
    onSelect({ ...selectedAvatar, name });
  }

  const text = UI_TEXT[language] || UI_TEXT.en;

  return (
    <div style={styles.centerScreen}>
      <h1 style={styles.title}>JOB QUEST</h1>
      <p style={styles.subtitle}>— BUILD YOUR FUTURE —</p>
      <p style={{ color: "#C9CFEA", marginBottom: 28, fontFamily: "'Inter', sans-serif" }}>
        {text.introLine}
      </p>
      <BigButton onClick={() => setInstructionsOpen(true)} color="#8DB4FF" style={{ marginBottom: 18 }}>
        {text.instructions}
      </BigButton>
      <PixelPanel style={{ padding: 28, maxWidth: 560 }}>
        <p style={{ marginTop: 0, marginBottom: 18, fontFamily: "'Inter', sans-serif" }}>
          {text.writeName}
        </p>
        <input
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && startGame()}
          placeholder={text.placeholder}
          maxLength={24}
          aria-label={text.placeholder}
          style={{
            width: "100%",
            padding: "10px 12px",
            marginBottom: 18,
            borderRadius: 8,
            border: "2px solid #8DB4FF",
            background: "rgba(255,255,255,0.08)",
            color: "#F5F5F5",
            fontFamily: "'Inter', sans-serif",
            fontSize: 15,
          }}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 12,
            width: "100%",
            maxWidth: 430,
            margin: "0 auto",
          }}
        >
          {CHARACTERS.map((c) => (
            <div
              key={c.id}
              onClick={() => setSelectedAvatar(c)}
              onMouseEnter={() => setHover(c.id)}
              onMouseLeave={() => setHover(null)}
              style={{
                cursor: "pointer",
                width: "100%",
                padding: "16px 8px",
                borderRadius: 12,
                background: hover === c.id ? c.color : "rgba(255,255,255,0.06)",
                border: `3px solid ${selectedAvatar.id === c.id ? "#C6F135" : c.color}`,
                textAlign: "center",
                transform: hover === c.id || selectedAvatar.id === c.id ? "translateY(-4px)" : "none",
                transition: "all 0.12s ease",
              }}
            >
              <div style={{ fontSize: 44 }}>{c.emoji}</div>
              <div
                style={{
                  margin: "10px auto 0",
                  width: 28,
                  height: 6,
                  borderRadius: 4,
                  background: c.color,
                }}
              />
            </div>
          ))}
        </div>
        <BigButton
          onClick={startGame}
          color={playerName.trim() ? "#C6F135" : "#788594"}
          style={{ marginTop: 24, cursor: playerName.trim() ? "pointer" : "not-allowed" }}
        >
          {text.startAs} {playerName.trim() || text.player}
        </BigButton>
      </PixelPanel>
      {instructionsOpen && <InstructionsModal language={language} onClose={() => setInstructionsOpen(false)} />}
    </div>
  );
}

function InstructionsModal({ language, onClose }) {
  const isSpanish = language !== "en";
  const instructions = isSpanish
    ? [
        ["1. Elegí tu personaje", "Escribí tu nombre y seleccioná un avatar para comenzar."],
        ["2. Explorá cada mapa", "Movete con WASD o las flechas. Acercate a los personajes y objetos y presioná E para interactuar."],
        ["3. Resolvé los desafíos", "Hablá con los NPCs y revisá las pistas. Completá los desafíos requeridos para habilitar la salida."],
        ["4. Avanzá por la ruta", "Los mapas se desbloquean en orden al completar el anterior. El mapa 4 es la misión final."],
        ["5. Batalla de entrevistas", "En el mapa 4, movete con WASD o las flechas, apuntá con el mouse y dispará con clic izquierdo."],
      ]
    : [
        ["1. Choose your character", "Enter your name and select an avatar to begin."],
        ["2. Explore each map", "Move with WASD or the arrow keys. Approach characters and objects, then press E to interact."],
        ["3. Complete the challenges", "Talk to NPCs and inspect clues. Finish the required challenges to open the exit."],
        ["4. Progress through the route", "Maps unlock in order when you complete the previous one. Map 4 is the final mission."],
        ["5. Interview battle", "In map 4, move with WASD or the arrow keys, aim with the mouse, and shoot with the left mouse button."],
      ];
  const text = UI_TEXT[language] || UI_TEXT.en;

  return (
    <div style={{ ...styles.modalOverlay, position: "fixed", zIndex: 100, padding: 16 }}>
      <PixelPanel style={{ maxWidth: 560, width: "100%", maxHeight: "90vh", overflowY: "auto", padding: 24 }}>
        <h2 style={{ marginTop: 0, color: "#C6F135", fontFamily: "'Baloo 2', sans-serif" }}>
          {text.instructions}
        </h2>
        <div style={{ display: "grid", gap: 14 }}>
          {instructions.map(([title, description]) => (
            <div key={title}>
              <strong style={{ color: "#8DB4FF" }}>{title}</strong>
              <div style={{ color: "#C9CFEA", lineHeight: 1.5, marginTop: 3 }}>{description}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "right", marginTop: 20 }}>
          <BigButton onClick={onClose}>{text.closeInstructions}</BigButton>
        </div>
      </PixelPanel>
    </div>
  );
}

/* ---------- Pantalla de mapa general ---------- */
function MapScreen({ progress, onEnterLevel, character, language = "en" }) {
  const text = UI_TEXT[language] || UI_TEXT.en;
  const nodes = [
    { id: "liceo", icon: "🏫", label: text.labelCareerClues },
    { id: "rumores", icon: "🗣️", label: text.labelSignals },
    { id: "centro", icon: "🏢", label: text.labelCareerCenter },
    { id: "mision", icon: "🎯", label: text.labelFinalMission },
  ];
  return (
    <div style={styles.centerScreen}>
      <h1 style={{ ...styles.title, fontSize: 40 }}>{text.mapTitle}</h1>
      <p style={{ color: "#C9CFEA", marginBottom: 24, fontFamily: "'Inter', sans-serif" }}>
        {text.playingAs} {character.emoji} {character.name}
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 220px)",
          gap: 22,
        }}
      >
        {nodes.map((n) => {
          const p = progress[n.id];
          const locked = !p.unlocked;
          return (
            <div
              key={n.id}
              onClick={() => !locked && onEnterLevel(n.id)}
              style={{
                cursor: locked ? "not-allowed" : "pointer",
                background: locked ? "rgba(255,255,255,0.05)" : "rgba(198,241,53,0.12)",
                border: `3px solid ${locked ? "#3A4270" : "#C6F135"}`,
                borderRadius: 16,
                padding: "20px 14px",
                textAlign: "center",
                opacity: locked ? 0.55 : 1,
                transition: "transform 0.12s ease",
              }}
              onMouseEnter={(e) => !locked && (e.currentTarget.style.transform = "scale(1.04)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              <div style={{ fontSize: 40 }}>{locked ? "🔒" : n.icon}</div>
              <div style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, marginTop: 6, color: "#F5F5F5" }}>
                {n.label}
              </div>
              <div style={{ marginTop: 6 }}>
                {locked ? (
                  <span style={{ fontSize: 12, color: "#8891C4" }}>{text.locked}</span>
                ) : (
                  <StarRow count={p.stars} size={16} />
                )}
              </div>
            </div>
          );
        })}
      </div>
      {/* Test-mode buttons are intentionally disabled. Remove this JSX comment to re-enable them.
      <PixelPanel style={{ marginTop: 26, padding: "14px 18px", borderColor: "#FFB347", textAlign: "center" }}>
        <div style={{ color: "#FFB347", fontWeight: 700, marginBottom: 8 }}>Test mode</div>
        <div style={{ color: "#C9CFEA", fontSize: 12, marginBottom: 10 }}>
          Skip map unlock requirements and open any map directly for testing.
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {nodes.map((n) => (
            <BigButton
              key={`test-${n.id}`}
              onClick={() => onEnterLevel(n.id)}
              color="#FFB347"
              style={{ fontSize: 13, padding: "7px 12px" }}
            >
              Test {n.label}
            </BigButton>
          ))}
        </div>
      </PixelPanel>
      */}
      <p style={{ marginTop: 28, color: "#8891C4", fontFamily: "'Inter', sans-serif", fontSize: 13, maxWidth: 480, textAlign: "center" }}>
        {text.quickTooltip}
      </p>
    </div>
  );
}

/* ---------- HUD ---------- */
function HUD({ level, stars, missionText, inventoryCount, onOpenInventory, onPause }) {
  return (
    <div style={styles.hudBar}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <PixelPanel style={{ padding: "6px 14px" }}>
          <span style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 700 }}>{level.name}</span>
        </PixelPanel>
        <PixelPanel style={{ padding: "6px 14px" }}>🎯 {missionText}</PixelPanel>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <PixelPanel style={{ padding: "6px 14px" }}>
          <StarRow count={stars} size={16} />
        </PixelPanel>
        <button onClick={onOpenInventory} style={styles.iconButton}>
          🎒 {inventoryCount}
        </button>
        <button onClick={onPause} style={styles.iconButton}>
          ⏸
        </button>
      </div>
    </div>
  );
}

/* ---------- Prompt de interacción ---------- */
function InteractPrompt({ label }) {
  if (!label) return null;
  return (
    <div style={styles.interactPrompt}>
      <span style={{ background: "#C6F135", color: "#10163A", borderRadius: 6, padding: "2px 8px", fontWeight: 800, marginRight: 8 }}>
        E
      </span>
      {label}
    </div>
  );
}

/* ---------- Toast de feedback rápido (pickup, etc) ---------- */
function Toast({ text }) {
  if (!text) return null;
  return <div style={styles.toast}>{text}</div>;
}

/* ---------- Modal genérico ---------- */
function ModalShell({ title, children, accent = "#C6F135" }) {
  return (
    <div style={styles.modalOverlay}>
      <PixelPanel style={{ maxWidth: 520, width: "92%", padding: 22, borderColor: accent }}>
        {title && (
          <h3 style={{ marginTop: 0, fontFamily: "'Baloo 2', sans-serif", color: accent }}>{title}</h3>
        )}
        {children}
      </PixelPanel>
    </div>
  );
}

/* ---------- Modal de diálogo NPC (secuencial) ---------- */
function DialogueModal({ npc, lineIndex, onNext }) {
  const line = npc.dialogue[lineIndex];
  const isLast = lineIndex >= npc.dialogue.length - 1;
  const imageUrl = npcImageAsset(npc);
  return (
    <ModalShell accent={npc.color}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            style={{ width: 90, height: 90, flex: "0 0 90px", objectFit: "contain" }}
          />
        ) : (
          <div
            aria-hidden="true"
            style={{
              position: "relative",
              width: 40,
              height: 40,
              flex: "0 0 40px",
              borderRadius: "50%",
              background: `${npc.color}33`,
              border: `2px solid ${npc.color}`,
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 6,
                left: 13,
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: npc.color,
              }}
            />
            <span
              style={{
                position: "absolute",
                bottom: 5,
                left: 8,
                width: 20,
                height: 11,
                borderRadius: "10px 10px 7px 7px",
                background: npc.color,
              }}
            />
          </div>
        )}
        <div>
          <div style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, marginBottom: 6 }}>
            {npc.name}
          </div>
          <div style={{ fontFamily: "'Inter', sans-serif", lineHeight: 1.5 }}>{line}</div>
        </div>
      </div>
      <div style={{ textAlign: "right", marginTop: 18 }}>
        <BigButton onClick={onNext} color={npc.color}>
          {isLast ? "Continue" : "Next"}
        </BigButton>
      </div>
    </ModalShell>
  );
}

/* ---------- Modal de desafío MITO/REALIDAD ---------- */
function MitoModal({ data, onAnswer, feedback, onRetry, onClose }) {
  return (
    <ModalShell title="MYTH OR FACT?" accent="#FFD166">
      <p style={{ fontFamily: "'Inter', sans-serif", lineHeight: 1.5 }}>{data.text}</p>
      {!feedback ? (
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 14 }}>
          <BigButton color="#FF4D8D" onClick={() => onAnswer("mito")}>
            MYTH
          </BigButton>
          <BigButton color="#8DB4FF" onClick={() => onAnswer("realidad")}>
            FACT
          </BigButton>
        </div>
      ) : (
        <FeedbackBlock feedback={feedback} onRetry={onRetry} onClose={onClose} />
      )}
    </ModalShell>
  );
}

/* ---------- Modal Verdadero/Falso ---------- */
function TrueFalseModal({ data, onAnswer, feedback, onRetry, onClose }) {
  return (
    <ModalShell title="TRUE OR FALSE" accent="#8DB4FF">
      <p style={{ fontFamily: "'Inter', sans-serif", lineHeight: 1.5 }}>{data.text}</p>
      {!feedback ? (
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 14 }}>
          <BigButton color="#8DB4FF" onClick={() => onAnswer(true)}>
            TRUE
          </BigButton>
          <BigButton color="#FF4D8D" onClick={() => onAnswer(false)}>
            FALSE
          </BigButton>
        </div>
      ) : (
        <FeedbackBlock feedback={feedback} onRetry={onRetry} onClose={onClose} />
      )}
    </ModalShell>
  );
}

/* ---------- Modal Opción múltiple ---------- */
function MCModal({ data, onAnswer, feedback, onRetry, onClose }) {
  return (
    <ModalShell title="YOUR ANSWER" accent="#C6F135">
      <p style={{ fontFamily: "'Inter', sans-serif", lineHeight: 1.5 }}>{data.text}</p>
      {!feedback ? (
        <div style={{
          display: "grid",
          gridTemplateColumns: presentation === "cards" ? "repeat(auto-fit, minmax(140px, 1fr))" : "1fr",
          gap: 8,
          marginTop: 12,
        }}>
          {data.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => onAnswer(i)}
              style={{
                textAlign: "left",
                padding: presentation === "cards" ? "18px 14px" : "10px 14px",
                borderRadius: 8,
                border: `2px solid ${presentation === "cards" ? "#8DB4FF" : "#C6F135"}`,
                background: presentation === "cards" ? "#232B5E" : "rgba(255,255,255,0.06)",
                color: "#F5F5F5",
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                minHeight: presentation === "cards" ? 88 : undefined,
                boxShadow: presentation === "cards" ? "0 4px 0 #151B40" : undefined,
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      ) : (
        <FeedbackBlock feedback={feedback} onRetry={onRetry} onClose={onClose} />
      )}
    </ModalShell>
  );
}

/* ---------- Bloque de feedback compartido ---------- */
function FeedbackBlock({ feedback, onRetry, onClose }) {
  const ok = feedback.correct;
  return (
    <div style={{ marginTop: 14 }}>
      <div
        style={{
          padding: "10px 14px",
          borderRadius: 8,
          background: ok ? "rgba(198,241,53,0.15)" : "rgba(255,77,141,0.15)",
          border: `2px solid ${ok ? "#C6F135" : "#FF4D8D"}`,
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <strong>{ok ? "Excellent!" : "Take another look."}</strong>
        <div style={{ marginTop: 6, lineHeight: 1.5 }}>{feedback.explanation}</div>
      </div>
      <div style={{ textAlign: "right", marginTop: 14 }}>
        {ok ? (
          <BigButton onClick={onClose}>Continue</BigButton>
        ) : (
          <BigButton color="#8DB4FF" onClick={onRetry}>
            Try again
          </BigButton>
        )}
      </div>
    </div>
  );
}

/* ---------- Modal ficha informativa (ITS) ---------- */
function InfoCardModal({ data, onClose }) {
  return (
    <ModalShell title={`INFO CARD · ${data.name}`} accent="#8DB4FF">
      <div style={{ fontFamily: "'Inter', sans-serif", lineHeight: 1.6 }}>
        <p>
          <strong>Transmission:</strong> {data.transmission}
        </p>
        <p>
          <strong>Prevention:</strong> {data.prevention}
        </p>
        <p style={{ color: "#C9CFEA" }}>{data.note}</p>
      </div>
      <div style={{ textAlign: "right", marginTop: 10 }}>
        <BigButton onClick={onClose}>Close</BigButton>
      </div>
    </ModalShell>
  );
}

/* ---------- Modal quiz múltiple (varias preguntas seguidas) ---------- */
function MultiQuizModal({ questions, onFinish, onIncorrectAnswer }) {
  const [idx, setIdx] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const q = questions[idx];
  const answer = (i) => {
    const correct = i === q.correctIndex;
    if (!correct) onIncorrectAnswer();
    setFeedback({ correct, explanation: q.explanation });
  };
  const next = () => {
    setFeedback(null);
    if (idx + 1 >= questions.length) onFinish();
    else setIdx(idx + 1);
  };
  return (
    <MCModal
      data={{ text: `(${idx + 1}/${questions.length}) ${q.text}`, options: q.options }}
      onAnswer={answer}
      feedback={feedback}
      onRetry={() => setFeedback(null)}
      onClose={next}
    />
  );
}

function EditableChallengeModal({ questions, title, presentation = "multiple", onFinish, onIncorrectAnswer }) {
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const question = questions[index];

  if (!question) return null;
  const continueChallenge = () => {
    if (index + 1 === questions.length) onFinish();
    else {
      setIndex((current) => current + 1);
      setFeedback(null);
      setSelectedAnswers([]);
    }
  };
  const correctAnswers = question.correctIndexes?.length
    ? question.correctIndexes
    : [question.correctIndex];
  const answerOption = (optionIndex) => {
    if (question.multiSelect) {
      setSelectedAnswers((selected) => selected.includes(optionIndex)
        ? selected.filter((answer) => answer !== optionIndex)
        : [...selected, optionIndex]);
      return;
    }
    const correct = correctAnswers.includes(optionIndex);
    if (!correct) onIncorrectAnswer();
    setFeedback({
      correct,
      explanation: correct
        ? question.correctExplanation || question.explanation
        : question.retryExplanation || "That is not the correct answer. Try again!",
    });
  };
  const checkSelectedAnswers = () => {
    const selected = [...selectedAnswers].sort((a, b) => a - b);
    const correct = [...correctAnswers].sort((a, b) => a - b);
    const isCorrect = selected.length === correct.length && selected.every((answer, answerIndex) => answer === correct[answerIndex]);
    if (!isCorrect) onIncorrectAnswer();
    setFeedback({
      correct: isCorrect,
      explanation: isCorrect
        ? question.correctExplanation || question.explanation
        : question.retryExplanation || "That is not the correct answer. Try again!",
    });
  };

  return (
    <ModalShell title={title || "DESAFÍO"} accent="#C6F135">
      <p style={{ color: "#C9CFEA", fontFamily: "'Inter', sans-serif" }}>
        {index + 1} / {questions.length}
      </p>
      <p style={{ fontFamily: "'Inter', sans-serif", lineHeight: 1.5 }}>{question.text}</p>
      {!feedback ? (
        <>
        {question.multiSelect && (
          <p style={{ color: "#C9CFEA", fontSize: 13, margin: "8px 0" }}>
            Seleccioná todas las respuestas correctas y después comprobá.
          </p>
        )}
        <div style={{
          display: "grid",
          gridTemplateColumns: presentation === "cards" ? "repeat(auto-fit, minmax(140px, 1fr))" : "1fr",
          gap: 8,
          marginTop: 12,
        }}>
          {question.options.map((option, optionIndex) => (
            <button
              key={`${index}-${optionIndex}`}
              onClick={() => answerOption(optionIndex)}
              style={{
                textAlign: "left",
                padding: presentation === "cards" ? "18px 14px" : "10px 14px",
                borderRadius: 8,
                border: `2px solid ${question.multiSelect && selectedAnswers.includes(optionIndex) ? "#C6F135" : presentation === "cards" ? "#8DB4FF" : "#C6F135"}`,
                background: question.multiSelect && selectedAnswers.includes(optionIndex)
                  ? "#40532B"
                  : presentation === "cards" ? "#232B5E" : "rgba(255,255,255,0.06)",
                color: "#F5F5F5",
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                minHeight: presentation === "cards" ? 88 : undefined,
                boxShadow: presentation === "cards" ? "0 4px 0 #151B40" : undefined,
              }}
            >
              {question.multiSelect && selectedAnswers.includes(optionIndex) ? "✓ " : ""}{option}
            </button>
          ))}
          {question.multiSelect && (
            <BigButton
              onClick={checkSelectedAnswers}
              disabled={!selectedAnswers.length}
              style={{ marginTop: 6, opacity: selectedAnswers.length ? 1 : 0.55 }}
            >
              Comprobar respuestas
            </BigButton>
          )}
        </div>
        </>
      ) : (
        <FeedbackBlock
          feedback={feedback}
          onRetry={() => {
            setFeedback(null);
            setSelectedAnswers([]);
          }}
          onClose={continueChallenge}
        />
      )}
    </ModalShell>
  );
}

/* ---------- Modal de escenarios de decisión (uno o varios) ---------- */
function ScenarioModal({ scenarios, onFinish, onIncorrectAnswer }) {
  const [idx, setIdx] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const s = scenarios[idx];
  const answer = (i) => {
    const correct = i === s.correctIndex;
    if (!correct) onIncorrectAnswer();
    setFeedback({ correct, explanation: s.explanation });
  };
  const next = () => {
    setFeedback(null);
    if (idx + 1 >= scenarios.length) onFinish();
    else setIdx(idx + 1);
  };
  return (
    <ModalShell title="SITUACIÓN" accent="#FF8FB1">
      <p style={{ fontFamily: "'Inter', sans-serif", lineHeight: 1.5 }}>{s.text}</p>
      {!feedback ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {s.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => answer(i)}
              style={{
                textAlign: "left",
                padding: "10px 14px",
                borderRadius: 8,
                border: "2px solid #FF8FB1",
                background: "rgba(255,255,255,0.06)",
                color: "#F5F5F5",
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      ) : (
        <FeedbackBlock feedback={feedback} onRetry={() => setFeedback(null)} onClose={next} />
      )}
    </ModalShell>
  );
}

/* ---------- Modal Drag & Drop (clasificación de métodos) ---------- */
function DragDropModal({ onFinish, onIncorrectAnswer }) {
  const [placed, setPlaced] = useState({}); // methodId -> categoryId
  const [checked, setChecked] = useState(false);
  const [dragId, setDragId] = useState(null);

  const remaining = CONTRACEPTIVE_METHODS.filter((m) => !(m.id in placed));

  const handleDrop = (categoryId) => {
    if (!dragId) return;
    setPlaced((p) => ({ ...p, [dragId]: categoryId }));
    setDragId(null);
    setChecked(false);
  };

  const correctCount = CONTRACEPTIVE_METHODS.filter((m) => placed[m.id] === m.category).length;
  const allPlaced = Object.keys(placed).length === CONTRACEPTIVE_METHODS.length;
  const allCorrect = checked && correctCount === CONTRACEPTIVE_METHODS.length;

  return (
    <div style={styles.modalOverlay}>
      <PixelPanel style={{ maxWidth: 720, width: "94%", padding: 20, borderColor: "#8DB4FF" }}>
        <h3 style={{ marginTop: 0, fontFamily: "'Baloo 2', sans-serif", color: "#8DB4FF" }}>
          CLASIFICÁ LOS MÉTODOS
        </h3>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#C9CFEA" }}>
          Arrastrá cada tarjeta a la categoría que corresponda.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, minHeight: 40, marginBottom: 14 }}>
          {remaining.map((m) => (
            <div
              key={m.id}
              draggable
              onDragStart={() => setDragId(m.id)}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                background: "#232B5E",
                border: "2px solid #C6F135",
                cursor: "grab",
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
              }}
            >
              {m.name}
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 10 }}>
          {METHOD_CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(cat.id)}
              style={{
                minHeight: 100,
                border: "2px dashed #8DB4FF",
                borderRadius: 10,
                padding: 8,
                background: "rgba(141,180,255,0.08)",
              }}
            >
              <div style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: 13, marginBottom: 6 }}>
                {cat.label}
              </div>
              {CONTRACEPTIVE_METHODS.filter((m) => placed[m.id] === cat.id).map((m) => {
                const isCorrect = checked ? m.category === cat.id : null;
                return (
                  <div
                    key={m.id}
                    style={{
                      fontSize: 12,
                      padding: "4px 8px",
                      marginBottom: 4,
                      borderRadius: 6,
                      background:
                        isCorrect === null ? "#10163A" : isCorrect ? "rgba(198,241,53,0.25)" : "rgba(255,77,141,0.25)",
                      border: `1px solid ${isCorrect === null ? "#3A4270" : isCorrect ? "#C6F135" : "#FF4D8D"}`,
                    }}
                  >
                    {m.name}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div style={{ textAlign: "right", marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 10 }}>
          {!allCorrect && (
            <BigButton
              color="#8DB4FF"
              onClick={() => {
                if (correctCount !== CONTRACEPTIVE_METHODS.length) onIncorrectAnswer();
                setChecked(true);
              }}
              style={{ opacity: allPlaced ? 1 : 0.5, pointerEvents: allPlaced ? "auto" : "none" }}
            >
              Verificar
            </BigButton>
          )}
          {checked && !allCorrect && (
            <BigButton
              color="#FF4D8D"
              onClick={() => {
                setPlaced({});
                setChecked(false);
              }}
            >
              Reintentar
            </BigButton>
          )}
          {allCorrect && <BigButton onClick={onFinish}>Done! Continue</BigButton>}
        </div>
      </PixelPanel>
    </div>
  );
}

/* ---------- Modal de fragmento (misión final) ---------- */
function FragmentModal({ mission, onFinish, onIncorrectAnswer }) {
  const c = mission.challenge;
  const [feedback, setFeedback] = useState(null);

  const finishWithResult = (correct, explanation) => {
    if (!correct) onIncorrectAnswer();
    setFeedback({ correct, explanation });
  };

  if (c.type === "mito") {
    return (
      <MitoModal
        data={c}
        feedback={feedback}
        onAnswer={(a) => finishWithResult(a === c.answer, c.explanation)}
        onRetry={() => setFeedback(null)}
        onClose={() => onFinish(feedback.correct)}
      />
    );
  }
  if (c.type === "truefalse") {
    return (
      <TrueFalseModal
        data={c}
        feedback={feedback}
        onAnswer={(a) => finishWithResult(a === c.answer, c.explanation)}
        onRetry={() => setFeedback(null)}
        onClose={() => onFinish(feedback.correct)}
      />
    );
  }
  return (
    <MCModal
      data={c}
      feedback={feedback}
      onAnswer={(i) => finishWithResult(i === c.correctIndex, c.explanation)}
      onRetry={() => setFeedback(null)}
      onClose={() => onFinish(feedback.correct)}
    />
  );
}

/* ---------- Pantalla de pausa ---------- */
function PauseMenu({ onResume, onMap }) {
  return (
    <div style={styles.modalOverlay}>
      <PixelPanel style={{ padding: 28, width: 300, textAlign: "center" }}>
        <h3 style={{ fontFamily: "'Baloo 2', sans-serif", marginTop: 0 }}>PAUSED</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 18 }}>
          <BigButton onClick={onResume}>Resume</BigButton>
          <BigButton color="#8DB4FF" onClick={onMap}>
            Back to map
          </BigButton>
        </div>
      </PixelPanel>
    </div>
  );
}

/* ---------- Panel de inventario ---------- */
function InventoryPanel({ items, onClose }) {
  return (
    <div style={styles.modalOverlay}>
      <PixelPanel style={{ padding: 22, width: 360, maxHeight: "70vh", overflowY: "auto" }}>
        <h3 style={{ fontFamily: "'Baloo 2', sans-serif", marginTop: 0 }}>🎒 INVENTORY</h3>
        {items.length === 0 && (
          <p style={{ color: "#8891C4", fontFamily: "'Inter', sans-serif" }}>
            You have not found any items yet. Keep exploring!
          </p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((it, i) => (
            <div
              key={i}
              style={{
                border: "1px solid #3A4270",
                borderRadius: 8,
                padding: "8px 10px",
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
              }}
            >
              <strong>{it.emoji} {it.label}</strong>
              <div style={{ color: "#C9CFEA", marginTop: 4 }}>{it.text}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "right", marginTop: 16 }}>
          <BigButton onClick={onClose}>Close</BigButton>
        </div>
      </PixelPanel>
    </div>
  );
}

/* ---------- Pantalla de nivel completado ---------- */
function LevelCompleteScreen({ levelName, stars, onContinue, justUnlocked }) {
  return (
    <div style={styles.centerScreen}>
      <PixelPanel style={{ padding: 32, textAlign: "center", maxWidth: 420 }}>
        <div style={{ fontSize: 44 }}>🏁</div>
        <h2 style={{ fontFamily: "'Baloo 2', sans-serif", margin: "8px 0" }}>LEVEL COMPLETED!</h2>
        <p style={{ color: "#C9CFEA", fontFamily: "'Inter', sans-serif" }}>{levelName}</p>
        <div style={{ margin: "18px 0" }}>
          <StarRow count={stars} size={40} />
        </div>
        {justUnlocked && (
          <p style={{ color: "#C6F135", fontFamily: "'Inter', sans-serif", fontSize: 13 }}>
            🔓 "{justUnlocked}" is unlocked!
          </p>
        )}
        <BigButton onClick={onContinue}>Back to map</BigButton>
      </PixelPanel>
    </div>
  );
}

/* ================================================================
   PANTALLA DE JUEGO (canvas + lógica de exploración)
   ================================================================ */
function GameScreen({ levelConfig, character, onExitToMap, onLevelFinished, playSound }) {
  const canvasRef = useRef(null);
  const keysRef = useRef(new Set());
  const playerRef = useRef({ x: levelConfig.spawn.x, y: levelConfig.spawn.y, dir: "down", moving: false });
  const cameraRef = useRef({ x: 0, y: 0 });
  const runtimeRef = useRef({
    doneObjects: {}, // id -> true
    doneNpcs: {}, // id -> true
    stars: { 1: false, 2: false, 3: false },
    incorrectAnswers: 0,
  });
  const pausedRef = useRef(false);
  const modalOpenRef = useRef(false);

  const [, forceTick] = useState(0);
  const [paused, setPaused] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [nearby, setNearby] = useState(null); // {label, ref}
  const [modal, setModal] = useState(null); // {kind, payload}
  const [toast, setToast] = useState("");
  const [levelDone, setLevelDone] = useState(false);
  const [editorMode, setEditorMode] = useState(false);
  const [editorWalls, setEditorWalls] = useState(() => {
    const savedWalls = projectEditorData.levels?.[levelConfig.id]?.walls;
    return [...(savedWalls || levelConfig.collisionWalls || levelConfig.walls)];
  });
  const [editorContent, setEditorContent] = useState(() => {
    return normalizeEditorContent(projectEditorData.levels?.[levelConfig.id]?.content);
  });
  const [projectDataReady, setProjectDataReady] = useState(false);
  const [projectDataError, setProjectDataError] = useState("");
  const [projectSaveStatus, setProjectSaveStatus] = useState("");
  const projectDataRef = useRef({ levels: {} });
  const projectSaveQueue = useRef(Promise.resolve());
  const [entityEditorMode, setEntityEditorMode] = useState(false);
  const [entityEditorMinimized, setEntityEditorMinimized] = useState(false);
  const [entityTool, setEntityTool] = useState("select");
  const [entityDraft, setEntityDraft] = useState(null);
  const [entityEditorError, setEntityEditorError] = useState("");
  const [entityImageUploading, setEntityImageUploading] = useState(false);
  const [challengeDraft, setChallengeDraft] = useState(null);
  const toastTimer = useRef(null);
  const initialGuideDialogShown = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function loadProjectData() {
      if (!import.meta.env.DEV) {
        setProjectDataError("La edición que guarda cambios en los archivos del proyecto está disponible al ejecutar npm run dev.");
        setProjectDataReady(true);
        return;
      }
      try {
        const response = await fetch("/__job-quest/editor-data");
        if (!response.ok) throw new Error(`El servidor respondió ${response.status}.`);
        const data = await response.json();
        if (!data.levels || typeof data.levels !== "object") {
          throw new Error("El archivo src/editorData.json no tiene un formato válido.");
        }
        if (cancelled) return;
        projectDataRef.current = data;
        const savedLevel = data.levels[levelConfig.id];
        setEditorWalls(savedLevel?.walls || levelConfig.collisionWalls || levelConfig.walls);
        setEditorContent(normalizeEditorContent(savedLevel?.content));
        if (savedLevel) {
          setEditorContent(normalizeEditorContent(savedLevel.content));
        }
        setProjectDataError("");
      } catch (error) {
        if (!cancelled) {
          setProjectDataError(`No se pudieron cargar los datos del proyecto: ${error.message}`);
        }
      } finally {
        if (!cancelled) setProjectDataReady(true);
      }
    }
    loadProjectData();
    return () => {
      cancelled = true;
    };
  }, [levelConfig.id, levelConfig.collisionWalls, levelConfig.walls]);

  const editableLevelConfig = useMemo(() => {
    const visibleNpcs = levelConfig.npcs
      .filter((npc) => !editorContent.removedNpcIds.includes(npc.id))
      .map((npc) => ({ ...npc, ...(editorContent.npcOverrides[npc.id] || {}) }));
    const visibleObjects = levelConfig.objects
      .filter((object) => !editorContent.removedObjectIds.includes(object.id))
      .map((object) => ({ ...object, ...(editorContent.objectOverrides[object.id] || {}) }));
    const editableNpcs = editorContent.npcs;
    const editableObjects = editorContent.objects;
    const allNpcs = [...visibleNpcs, ...editableNpcs];
    const allObjects = [...visibleObjects, ...editableObjects];
    const challengeNpcObjectives = allNpcs
      .filter((npc) => npc.challenge)
      .map((npc) => npc.id);
    const challengeObjectObjectives = allObjects
      .filter((object) => {
        const key = object.type === "mito"
          ? `myth:${object.dataId}`
          : object.type === "fragment"
            ? `mission:${object.missionId}`
            : `object:${object.id}`;
        return editorContent.challengeOverrides[key]?.questions?.length &&
          !editorContent.removedChallengeIds.includes(key);
      })
      .map((object) => object.id);
    const objectivesRequired = levelConfig.id === "centro"
      ? challengeObjectObjectives
      : [
          ...(levelConfig.objectivesRequired || []).filter((id) =>
            !editorContent.removedObjectIds.includes(id) && !editorContent.removedNpcIds.includes(id)
          ),
          ...editableNpcs.map((npc) => npc.id),
          ...editableObjects.map((object) => object.id),
          ...challengeNpcObjectives,
          ...challengeObjectObjectives,
        ];
    return {
      ...levelConfig,
      npcs: allNpcs,
      objects: allObjects,
      exit: editorContent.exit || levelConfig.exit,
      customObjectives: true,
      objectivesRequired: [...new Set(objectivesRequired)],
    };
  }, [levelConfig, editorContent]);

  useEffect(() => {
    if (levelConfig.id !== "liceo" || !projectDataReady || initialGuideDialogShown.current) return;
    initialGuideDialogShown.current = true;
    const guide = editableLevelConfig.npcs.find((npc) => npc.id === "prof_ana");
    if (guide) setModal({ kind: "dialogue", npc: guide, lineIndex: 0 });
  }, [levelConfig.id, projectDataReady, editableLevelConfig]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useEffect(() => {
    modalOpenRef.current = !!modal || inventoryOpen;
  }, [modal, inventoryOpen]);

  const showToast = useCallback((text) => {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 1800);
  }, []);

  // --- keyboard ---
  useEffect(() => {
    const down = (e) => {
      const k = e.key.toLowerCase();
      const target = e.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) return;
      if (editorMode || entityEditorMode) {
        if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(k)) {
          keysRef.current.add(k);
          e.preventDefault();
        }
        return;
      }
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(k)) {
        keysRef.current.add(k);
        e.preventDefault();
      }
      if (k === "e") handleInteractKey();
      if (k === "escape") setPaused((p) => !p);
      if (k === "i") setInventoryOpen((o) => !o);
    };
    const up = (e) => {
      keysRef.current.delete(e.key.toLowerCase());
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearby, modal, editorMode, entityEditorMode]);

  useEffect(() => {
    if (editorMode || entityEditorMode) keysRef.current.clear();
  }, [editorMode, entityEditorMode]);

  const nearbyRef = useRef(null);
  useEffect(() => {
    nearbyRef.current = nearby;
  }, [nearby]);

  function handleInteractKey() {
    if (modalOpenRef.current || pausedRef.current || entityEditorMode) return;
    const n = nearbyRef.current;
    if (!n) return;
    openInteraction(n.target);
  }

  function collectInventoryItem(item) {
    setInventory((inv) => [...inv, item]);
  }

  function markStar(idx) {
    if (!runtimeRef.current.stars[idx]) {
      runtimeRef.current.stars[idx] = true;
      playSound("star");
      showToast(`⭐ Star ${idx} earned!`);
    }
  }

  function registerIncorrectAnswer() {
    const mistakes = runtimeRef.current.incorrectAnswers + 1;
    runtimeRef.current.incorrectAnswers = mistakes;
    forceTick((tick) => tick + 1);
    if (mistakes === 1) {
      showToast("One incorrect answer: 1 star will be deducted from your score.");
    } else if (mistakes === 6) {
      showToast("Six incorrect answers: 2 stars will be deducted from your score.");
    }
  }

  function currentStarCount() {
    const s = runtimeRef.current.stars;
    const earned = (s[1] ? 1 : 0) + (s[2] ? 1 : 0) + (s[3] ? 1 : 0);
    const mistakes = runtimeRef.current.incorrectAnswers;
    const penalty = mistakes === 0 ? 0 : mistakes <= 5 ? 1 : 2;
    return Math.max(0, earned - penalty);
  }

  function checkExit() {
    if (!areLevelObjectivesComplete(editableLevelConfig, runtimeRef.current)) {
      showToast("There are still things to complete in this level 🔎");
      return;
    }
    markStar(1);
    playSound("complete");
    setLevelDone(true);
  }

  function updateEditorWalls(nextWalls) {
    setEditorWalls(nextWalls);
  }

  function resetEditorWalls() {
    updateEditorWalls([...(levelConfig.collisionWalls || levelConfig.walls)]);
  }

  function saveEditorContent(nextContent) {
    setEditorContent(nextContent);
    setProjectSaveStatus("Guardando cambios en src/editorData.json...");
    setEntityEditorError("");
    return persistEditorProject(nextContent)
      .then(() => true)
      .catch((error) => {
        setProjectSaveStatus("");
        setEntityEditorError(`No se pudieron guardar los cambios del lápiz: ${error.message}`);
        return false;
      });
  }

  async function persistEditorProject(contentToSave = editorContent) {
    const saveTask = projectSaveQueue.current.catch(() => {}).then(async () => {
      if (!projectDataReady || projectDataError) {
        throw new Error(projectDataError || "Todavía se están cargando los datos del proyecto.");
      }
      const nextProjectData = {
        ...projectDataRef.current,
        levels: {
          ...projectDataRef.current.levels,
          [levelConfig.id]: {
            walls: editorWalls,
            content: contentToSave,
          },
        },
      };
      let response;
      try {
        response = await fetch("/__job-quest/editor-data", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(nextProjectData),
        });
      } catch {
        throw new Error(
          "Could not connect to the project save server. Run `npm run dev` in the project folder, leave it running, and click Save again. Your changes are still in the editor."
        );
      }
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || `El servidor respondió ${response.status}.`);
      }
      projectDataRef.current = nextProjectData;
      setProjectSaveStatus("Guardado en src/editorData.json");
      window.setTimeout(() => setProjectSaveStatus(""), 1800);
    });
    projectSaveQueue.current = saveTask;
    await saveTask;
  }

  async function closeEditor(editor) {
    if (editor === "entities" && entityDraft) {
      setEntityEditorError("Save or cancel the element you are editing before closing the editor.");
      return;
    }
    if (editor === "entities" && challengeDraft) {
      setEntityEditorError("Save or cancel the challenge you are editing before closing the editor.");
      return;
    }
    setProjectSaveStatus("Guardando en el proyecto...");
    setEntityEditorError("");
    try {
      await persistEditorProject();
      if (editor === "walls") setEditorMode(false);
      if (editor === "entities") {
        setEntityEditorMode(false);
        setEntityDraft(null);
        setChallengeDraft(null);
      }
    } catch (error) {
      setProjectSaveStatus("");
      setEntityEditorError(`No se pudo guardar en el proyecto: ${error.message}`);
    }
  }

  function startEntityPlacement(type) {
    setEntityTool(type);
    setEntityDraft(null);
    setChallengeDraft(null);
    setEntityEditorError("");
    showToast(type === "exit" ? "Click the EXIT sign to position the map exit." : "Click the map to place the element.");
  }

  function startEntityEdit(type, item) {
    setEntityTool("select");
    setChallengeDraft(null);
    setEntityDraft({
      id: item.id,
      type,
      original: !item.editorCreated,
      objectType: item.type,
      x: item.x,
      y: item.y,
      ...(type === "npc" ? { imageUrl: item.imageUrl || "", imagePreview: "" } : {}),
      name: type === "npc" ? item.name : "",
      label: type === "npc" ? "" : item.label || item.name || item.id,
      ...(type === "npc" ? {} : { emoji: item.emoji || "📌" }),
      color: item.color,
      gender: item.gender || "neutral",
      skin: item.skin,
      hair: item.hair,
      hairStyle: item.hairStyle || (item.gender === "female" ? "long" : "short"),
      content: type === "npc"
        ? (item.dialogue || []).join("\n")
        : item.type === "mito"
          ? MYTHS_DATA.find((myth) => myth.id === item.dataId)?.text || ""
          : item.text || "",
    });
    setEntityEditorError("");
  }

  function handleEntityPlacement(position) {
    if (entityTool === "exit") {
      try {
        saveEditorContent({
          ...editorContent,
          exit: { x: position.x - 50, y: position.y - 30, w: 100, h: 60, label: "EXIT →" },
        });
        showToast("Salida ubicada y guardada.");
      } catch (error) {
        setEntityEditorError(`No se pudo guardar la salida: ${error.message}`);
      }
      return;
    }
    const id = `editor-${entityTool}-${Date.now()}`;
    setEntityDraft({
      id,
      type: entityTool,
      x: position.x,
      y: position.y,
      ...(entityTool === "npc" ? { imageUrl: "", imagePreview: "" } : {}),
      name: "",
      label: "",
      ...(entityTool === "npc" ? {} : { emoji: "📌" }),
      color: "#FFB347",
      gender: "neutral",
      skin: "#F6C9A7",
      hair: "#342B35",
      hairStyle: "short",
      content: "",
      original: false,
      objectType: "pista",
    });
    setEntityEditorError("");
  }

  async function handleNpcImageChange(event) {
    const file = event.target.files?.[0];
    if (!file || !entityDraft || entityDraft.type !== "npc") return;

    const draftId = entityDraft.id;
    setEntityImageUploading(true);
    setEntityEditorError("");
    try {
      const image = await prepareNpcImage(file);
      const response = await fetch("/__job-quest/npc-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: draftId, image }),
      });
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || `El servidor respondió ${response.status}.`);
      }
      const result = await response.json();
      setEntityDraft((current) => current?.id === draftId
        ? { ...current, imageUrl: result.imageUrl, imagePreview: image }
        : current);
    } catch (error) {
      setEntityEditorError(`No se pudo guardar la foto del NPC: ${error.message}`);
    } finally {
      setEntityImageUploading(false);
      event.target.value = "";
    }
  }

  async function saveEntityDraft(event) {
    event.preventDefault();
    if (!entityDraft) return;
    const content = entityDraft.content.trim();
    const title = (entityDraft.type === "npc" ? entityDraft.name : entityDraft.label).trim();
    const needsContent = entityDraft.type === "npc" ||
      entityDraft.objectType === "pista" || entityDraft.objectType === "mito";
    if (!title || (needsContent && !content)) {
      setEntityEditorError("Enter a name or title and the required content before saving.");
      return;
    }
    const entry = entityDraft.type === "npc"
      ? {
          id: entityDraft.id,
          x: entityDraft.x,
          y: entityDraft.y,
          name: title,
          imageUrl: entityDraft.imageUrl || null,
          color: entityDraft.color || "#FFB347",
          gender: entityDraft.gender || "neutral",
          skin: entityDraft.skin || "#F6C9A7",
          hair: entityDraft.hair || "#342B35",
          hairStyle: entityDraft.hairStyle || "short",
          dialogue: content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
          editorCreated: !entityDraft.original,
        }
      : {
          id: entityDraft.id,
          x: entityDraft.x,
          y: entityDraft.y,
          type: entityDraft.objectType || "pista",
          label: title,
          emoji: entityDraft.emoji || "📌",
          text: content,
          editorCreated: !entityDraft.original,
        };
    const key = entityDraft.type === "npc" ? "npcs" : "objects";
    try {
      let nextContent = editorContent;
      if (entityDraft.original && entityDraft.type === "npc") {
        nextContent = {
          ...editorContent,
          npcOverrides: {
            ...editorContent.npcOverrides,
            [entry.id]: {
              ...editorContent.npcOverrides[entry.id],
              ...entry,
            },
          },
        };
      } else if (entityDraft.original) {
        const original = levelConfig.objects.find((item) => item.id === entry.id);
        const objectOverride = {
          ...editorContent.objectOverrides[entry.id],
          x: entry.x,
          y: entry.y,
          label: entry.label,
          emoji: entry.emoji,
          ...(original?.type === "pista" ? { text: entry.text } : {}),
        };
        const updatedContent = {
          ...editorContent,
          objectOverrides: {
            ...editorContent.objectOverrides,
            [entry.id]: objectOverride,
          },
        };
        if (original?.type === "mito" && original.dataId) {
          const myth = MYTHS_DATA.find((item) => item.id === original.dataId);
          if (myth) {
            const challengeKey = `myth:${original.dataId}`;
            const previous = editorContent.challengeOverrides[challengeKey];
            const question = previous?.questions?.[0] || {
              text: myth.text,
              options: ["Mito", "Realidad"],
              correctIndex: myth.answer === "mito" ? 0 : 1,
              explanation: myth.explanation,
            };
            updatedContent.challengeOverrides = {
              ...editorContent.challengeOverrides,
              [challengeKey]: {
                ...(previous || {}),
                questions: [{ ...question, text: entry.text }],
              },
            };
          }
        }
        nextContent = updatedContent;
      } else {
        const entries = editorContent[key];
        const exists = entries.some((item) => item.id === entry.id);
        nextContent = {
          ...editorContent,
          [key]: exists
            ? entries.map((item) => item.id === entry.id ? { ...item, ...entry, challenge: item.challenge } : item)
            : [...entries, entry],
        };
      }
      const saved = await saveEditorContent(nextContent);
      if (!saved) return;
      setEntityEditorError("");
      setEntityDraft(null);
      setEntityEditorError("");
      showToast("Cambio guardado en src/editorData.json.");
    } catch (error) {
      setProjectSaveStatus("");
      setEntityEditorError(`No se pudo guardar el elemento: ${error.message}`);
    }
  }

  function removeEntity(type, id) {
    const key = type === "npc" ? "npcs" : "objects";
    const customItems = editorContent[key];
    const isCustomItem = customItems.some((item) => item.id === id);
    const removedKey = type === "npc" ? "removedNpcIds" : "removedObjectIds";
    try {
      const originalObject = type === "pista" ? levelConfig.objects.find((item) => item.id === id) : null;
      const challengeKeysToRemove = type === "npc"
        ? [`npc:${id}`]
        : originalObject?.type === "mito"
          ? [`myth:${originalObject.dataId}`]
          : originalObject?.type === "fragment"
            ? [`mission:${originalObject.missionId}`]
            : [];
      const challengeOverrides = Object.fromEntries(
        Object.entries(editorContent.challengeOverrides).filter(([challengeKey]) =>
          !challengeKeysToRemove.includes(challengeKey)
        )
      );
      saveEditorContent({
        ...editorContent,
        [key]: customItems.filter((item) => item.id !== id),
        [removedKey]: isCustomItem
          ? editorContent[removedKey]
          : [...new Set([...editorContent[removedKey], id])],
        npcOverrides: type === "npc"
          ? Object.fromEntries(Object.entries(editorContent.npcOverrides).filter(([itemId]) => itemId !== id))
          : editorContent.npcOverrides,
        objectOverrides: type === "pista"
          ? Object.fromEntries(Object.entries(editorContent.objectOverrides).filter(([itemId]) => itemId !== id))
          : editorContent.objectOverrides,
        challengeOverrides,
        removedChallengeIds: type === "pista" && challengeKeysToRemove.length
          ? [...new Set([...editorContent.removedChallengeIds, ...challengeKeysToRemove])]
          : editorContent.removedChallengeIds,
      });
      if (entityDraft?.id === id) setEntityDraft(null);
      setEntityEditorError("");
    } catch (error) {
      setEntityEditorError(`No se pudo eliminar el elemento: ${error.message}`);
    }
  }

  function updateEntityPosition(type, id, x, y) {
    const key = type === "npc" ? "npcs" : "objects";
    if (editorContent[key].some((item) => item.id === id)) {
      saveEditorContent({
        ...editorContent,
        [key]: editorContent[key].map((item) => item.id === id ? { ...item, x, y } : item),
      });
      return;
    }
    const overridesKey = type === "npc" ? "npcOverrides" : "objectOverrides";
    saveEditorContent({
      ...editorContent,
      [overridesKey]: {
        ...editorContent[overridesKey],
        [id]: { ...editorContent[overridesKey][id], x, y },
      },
    });
  }

  function challengeQuestionsForObject(item) {
    if (item.type === "mito") {
      const myth = MYTHS_DATA.find((entry) => entry.id === item.dataId);
      return myth ? [{
        text: myth.text,
        options: ["Mito", "Realidad"],
        correctIndex: myth.answer === "mito" ? 0 : 1,
        explanation: myth.explanation,
      }] : [];
    }
    if (item.type === "fragment") {
      const mission = MISSIONS_DATA.find((entry) => entry.id === item.missionId);
      const challenge = mission?.challenge;
      if (!challenge) return [];
      if (challenge.type === "mito") {
        return [{
          text: challenge.text,
          options: ["Mito", "Realidad"],
          correctIndex: challenge.answer === "mito" ? 0 : 1,
          explanation: challenge.explanation,
        }];
      }
      if (challenge.type === "truefalse") {
        return [{
          text: challenge.text,
          options: ["Verdadero", "Falso"],
          correctIndex: challenge.answer ? 0 : 1,
          explanation: challenge.explanation,
        }];
      }
      return [{
        text: challenge.text,
        options: challenge.options,
        correctIndex: challenge.correctIndex,
        explanation: challenge.explanation,
      }];
    }
    return [];
  }

  function openChallengeEditor(kind, item) {
    setEntityDraft(null);
    const challengeKey = kind === "npc"
      ? `npc:${item.id}`
      : item.type === "mito"
        ? `myth:${item.dataId}`
        : item.type === "fragment"
          ? `mission:${item.missionId}`
          : `object:${item.id}`;
    const saved = editorContent.challengeOverrides[challengeKey];
    const questions = saved?.questions ||
      (kind === "npc" ? challengeQuestionsForNpc(item) : challengeQuestionsForObject(item));
    setChallengeDraft({
      challengeKey,
      kind,
      entityId: item.id,
      assignedNpcId: kind === "npc" ? item.id : "",
      title: kind === "npc" ? `Challenge for ${item.name}` : item.label || "Challenge",
      presentation: saved?.presentation || "multiple",
      questions: questions.length
        ? questions.map((question) => ({
          ...question,
          options: [...question.options],
          correctExplanation: question.correctExplanation || question.explanation || "",
          retryExplanation: question.retryExplanation || "That is not the correct answer. Try again!",
          multiSelect: question.multiSelect || (question.correctIndexes?.length || 0) > 1,
          correctIndexes: question.correctIndexes?.length
            ? [...question.correctIndexes]
            : [question.correctIndex || 0],
        }))
        : [{
            text: "",
            options: ["", ""],
            correctIndex: 0,
            correctIndexes: [0],
            multiSelect: false,
            correctExplanation: "",
            retryExplanation: "",
          }],
    });
  }

  function updateChallengeQuestion(index, changes) {
    setChallengeDraft((draft) => ({
      ...draft,
      questions: draft.questions.map((question, questionIndex) =>
        questionIndex === index ? { ...question, ...changes } : question
      ),
    }));
  }

  async function saveChallengeDraft(event) {
    event.preventDefault();
    if (!challengeDraft) return;
    const questions = challengeDraft.questions.map((question) => ({
      ...question,
      text: question.text.trim(),
      options: question.options.map((option) => option.trim()),
      correctExplanation: (question.correctExplanation || question.explanation || "").trim(),
      retryExplanation: question.retryExplanation.trim(),
      correctIndexes: question.multiSelect
        ? (question.correctIndexes?.length ? question.correctIndexes : [question.correctIndex])
        : [question.correctIndex],
    }));
    if (!challengeDraft.title.trim() || questions.length > 100 || questions.some((question) =>
      !question.text || !question.correctExplanation || !question.retryExplanation || question.options.length < 2 ||
      question.options.length > 10 || question.options.some((option) => !option) ||
      !question.correctIndexes.length ||
      question.correctIndexes.some((answer) => !Number.isInteger(answer) || answer < 0 || answer >= question.options.length) ||
      new Set(question.correctIndexes).size !== question.correctIndexes.length ||
      (!question.multiSelect && question.correctIndexes.length !== 1)
    )) {
      setEntityEditorError("Complete each question, its options, one correct answer, and both feedback messages.");
      return;
    }
    if (challengeDraft.kind === "npc" && !challengeDraft.assignedNpcId) {
      setEntityEditorError("Choose the NPC this challenge will be assigned to.");
      return;
    }
    const nextOverrides = { ...editorContent.challengeOverrides };
    if (challengeDraft.assignedNpcId) {
      const npc = editableLevelConfig.npcs.find((entry) => entry.id === challengeDraft.assignedNpcId);
      if (!npc) {
        setEntityEditorError("El NPC seleccionado ya no existe en este nivel.");
        return;
      }
      const key = `npc:${npc.id}`;
      const sourceNpc = challengeDraft.kind === "npc"
        ? editableLevelConfig.npcs.find((entry) => entry.id === challengeDraft.entityId)
        : null;
      if (challengeDraft.kind !== "npc" && challengeDraft.challengeKey !== key) {
        delete nextOverrides[challengeDraft.challengeKey];
      }
      if (sourceNpc && sourceNpc.id !== npc.id) {
        delete nextOverrides[`npc:${sourceNpc.id}`];
      }
      nextOverrides[key] = {
        id: key,
        title: challengeDraft.title.trim(),
        presentation: challengeDraft.presentation,
        questions,
      };
      const updatedContent = {
        ...editorContent,
        challengeOverrides: nextOverrides,
      };
      if (challengeDraft.kind !== "npc" && challengeDraft.challengeKey !== key) {
        updatedContent.removedChallengeIds = [
          ...new Set([...editorContent.removedChallengeIds, challengeDraft.challengeKey]),
        ];
      }
      const npcOverrides = { ...editorContent.npcOverrides };
      if (!npc.editorCreated) {
        npcOverrides[npc.id] = {
          ...npcOverrides[npc.id],
          challenge: {
            type: "editor",
            challengeId: key,
            starIndex: npc.challenge?.starIndex || 1,
            ...(npc.challenge?.requires ? { requires: npc.challenge.requires } : {}),
          },
        };
      }
      if (sourceNpc && sourceNpc.id !== npc.id && !sourceNpc.editorCreated) {
        npcOverrides[sourceNpc.id] = { ...npcOverrides[sourceNpc.id], challenge: null };
      }
      updatedContent.npcOverrides = npcOverrides;
      updatedContent.npcs = editorContent.npcs.map((entry) => {
        if (entry.id === npc.id) {
          return {
            ...entry,
            challenge: {
              type: "editor",
              challengeId: key,
              starIndex: npc.challenge?.starIndex || 1,
              ...(npc.challenge?.requires ? { requires: npc.challenge.requires } : {}),
            },
          };
        }
        if (sourceNpc && sourceNpc.id !== npc.id && entry.id === sourceNpc.id) {
          return { ...entry, challenge: null };
        }
        return entry;
      });
      const saved = await saveEditorContent(updatedContent);
      if (!saved) return;
    } else {
      nextOverrides[challengeDraft.challengeKey] = {
        id: challengeDraft.challengeKey,
        title: challengeDraft.title.trim(),
        presentation: challengeDraft.presentation,
        questions,
      };
      const saved = await saveEditorContent({ ...editorContent, challengeOverrides: nextOverrides });
      if (!saved) return;
    }
    setChallengeDraft(null);
    setEntityEditorError("");
    showToast("Challenge saved to src/editorData.json.");
  }

  function deleteNpcChallenge(npc) {
    const key = `npc:${npc.id}`;
    const challengeOverrides = { ...editorContent.challengeOverrides };
    delete challengeOverrides[key];
    if (npc.editorCreated) {
      saveEditorContent({
        ...editorContent,
        challengeOverrides,
        npcs: editorContent.npcs.map((entry) =>
          entry.id === npc.id ? { ...entry, challenge: null } : entry
        ),
      });
    } else {
      saveEditorContent({
        ...editorContent,
        challengeOverrides,
        npcOverrides: {
          ...editorContent.npcOverrides,
          [npc.id]: { ...editorContent.npcOverrides[npc.id], challenge: null },
        },
      });
    }
    setChallengeDraft(null);
  }

  function deleteCurrentChallenge() {
    if (!challengeDraft) return;
    if (challengeDraft.assignedNpcId) {
      const npc = editableLevelConfig.npcs.find((entry) => entry.id === challengeDraft.assignedNpcId);
      if (npc) deleteNpcChallenge(npc);
      return;
    }
    const challengeOverrides = { ...editorContent.challengeOverrides };
    delete challengeOverrides[challengeDraft.challengeKey];
    saveEditorContent({
      ...editorContent,
      challengeOverrides,
      removedChallengeIds: [
        ...new Set([...editorContent.removedChallengeIds, challengeDraft.challengeKey]),
      ],
    });
    setChallengeDraft(null);
  }

  function removeEntityAt(position) {
    const candidates = [
      ...editableLevelConfig.npcs.map((item) => ({ type: "npc", item })),
      ...editableLevelConfig.objects.map((item) => ({ type: "pista", item })),
    ];
    const nearest = candidates
      .map((candidate) => ({
        ...candidate,
        distance: distance(position.x, position.y, candidate.item.x + 18, candidate.item.y + 18),
      }))
      .filter((candidate) => candidate.distance < 48)
      .sort((a, b) => a.distance - b.distance)[0];
    if (nearest) removeEntity(nearest.type, nearest.item.id);
  }

  /* ---------- abrir interacción según tipo de entidad ---------- */
  function openInteraction(target) {
    if (target.kind === "npc") {
      const npc = target.data;
      if (npc.dialogue && !runtimeRef.current.doneNpcs[npc.id + "_talked"]) {
        setModal({ kind: "dialogue", npc, lineIndex: 0 });
      } else if (npc.challenge) {
        openChallengeForNpc(npc);
      }
      return;
    }
    if (target.kind === "exit") {
      checkExit();
      return;
    }
    const obj = target.data;
    if (runtimeRef.current.doneObjects[obj.id] && obj.type !== "infocard") return;

    switch (obj.type) {
      case "mito": {
        const challengeKey = `myth:${obj.dataId}`;
        if (editorContent.removedChallengeIds.includes(challengeKey)) {
          runtimeRef.current.doneObjects[obj.id] = true;
          showToast("Poster checked; no challenge is assigned to it.");
          forceTick((t) => t + 1);
          break;
        }
        const challenge = editorContent.challengeOverrides[challengeKey];
        if (challenge?.questions?.length) {
          setModal({
            kind: "editable_challenge",
            obj,
            title: challenge.title,
            presentation: challenge.presentation || "multiple",
            questions: challenge.questions,
            target: "object",
          });
          break;
        }
        const data = MYTHS_DATA.find((m) => m.id === obj.dataId);
        setModal({ kind: "mito", obj, data, feedback: null });
        break;
      }
      case "pista": {
        const challengeKey = `object:${obj.id}`;
        const challenge = editorContent.challengeOverrides[challengeKey];
        if (challenge?.questions?.length) {
          setModal({
            kind: "editable_challenge",
            obj,
            title: challenge.title,
            presentation: challenge.presentation || "multiple",
            questions: challenge.questions,
          });
          break;
        }
        runtimeRef.current.doneObjects[obj.id] = true;
        collectInventoryItem({ emoji: obj.emoji, label: obj.label, text: obj.text });
        playSound("pickup");
        showToast(`📌 Pista encontrada: ${obj.label}`);
        if (obj.starIndex) markStar(obj.starIndex);
        forceTick((t) => t + 1);
        break;
      }
      case "bonus": {
        runtimeRef.current.doneObjects[obj.id] = true;
        collectInventoryItem({ emoji: BONUS_FRAGMENT.emoji, label: BONUS_FRAGMENT.label, text: BONUS_FRAGMENT.text });
        playSound("pickup");
        showToast("✨ You found a bonus item!");
        if (obj.starIndex) markStar(obj.starIndex);
        forceTick((t) => t + 1);
        break;
      }
      case "infocard": {
        const data = ITS_DATA.find((d) => d.id === obj.dataId);
        runtimeRef.current.doneObjects[obj.id] = true;
        setModal({ kind: "infocard", data });
        forceTick((t) => t + 1);
        break;
      }
      case "dragdrop": {
        setModal({ kind: "dragdrop" });
        break;
      }
      case "fragment": {
        const mission = MISSIONS_DATA.find((m) => m.id === obj.missionId);
        const challengeKey = `mission:${obj.missionId}`;
        if (editorContent.removedChallengeIds.includes(challengeKey)) {
          runtimeRef.current.doneObjects[obj.id] = true;
          collectInventoryItem({ emoji: mission.emoji, label: mission.label, text: "Fragment collected." });
          showToast(`${mission.emoji} Fragment "${mission.label}" collected`);
          playSound("pickup");
          forceTick((t) => t + 1);
          break;
        }
        const challenge = editorContent.challengeOverrides[challengeKey];
        if (challenge?.questions?.length) {
          setModal({
            kind: "editable_fragment",
            obj,
            mission,
            title: challenge.title,
            presentation: challenge.presentation || "multiple",
            questions: challenge.questions,
          });
          break;
        }
        setModal({ kind: "fragment", obj, mission });
        break;
      }
      default:
        break;
    }
  }

  function openChallengeForNpc(npc) {
    const ch = npc.challenge;
    const savedChallenge = editorContent.challengeOverrides[`npc:${npc.id}`];
    if (ch?.requires?.some((id) => !runtimeRef.current.doneObjects[id])) {
      showToast("Check all the required items before starting this challenge.");
      return;
    }
    const savedQuestions = savedChallenge?.questions;
    const questions = savedQuestions || (ch?.type === "editor" ? ch.questions : null);
    if (questions?.length) {
      setModal({
        kind: "editable_challenge",
        npc,
        title: savedChallenge?.title || `DESAFÍO · ${npc.name}`,
        presentation: savedChallenge?.presentation || "multiple",
        questions,
        target: "npc",
      });
      return;
    }
    if (ch?.type === "truefalse") {
      const data = TRUEFALSE_DATA.find((d) => d.id === ch.dataId);
      setModal({ kind: "truefalse", npc, data, feedback: null });
    } else if (ch?.type === "mc") {
      const data = MC_QUESTIONS.find((d) => d.id === ch.dataId);
      setModal({ kind: "mc", npc, data, feedback: null });
    } else if (ch?.type === "decision") {
      const scenario = SCENARIOS_DATA.find((s) => s.id === ch.scenarioId);
      setModal({ kind: "scenario_single", npc, scenario, ch });
    } else if (ch?.type === "quiz_multi") {
      setModal({ kind: "quiz_multi", npc, ch });
    } else if (ch?.type === "scenarios_multi") {
      setModal({ kind: "scenarios_multi", npc, ch });
    }
  }

  function closeModal() {
    setModal(null);
    forceTick((t) => t + 1);
  }

  function resolveMitoOrTF(correct) {
    if (!correct) registerIncorrectAnswer();
    setModal((m) => ({ ...m, feedback: { correct, explanation: m.data.explanation } }));
    playSound(correct ? "correct" : "incorrect");
  }

  function finalizeSimpleObjective(obj, npc) {
    if (obj) {
      runtimeRef.current.doneObjects[obj.id] = true;
    }
    if (npc) {
      runtimeRef.current.doneNpcs[npc.id] = true;
      if (npc.challenge && npc.challenge.starIndex) markStar(npc.challenge.starIndex);
    }
    closeModal();
  }

  return (
    <div style={{ position: "relative", width: VIEW_W, height: VIEW_H, margin: "0 auto" }}>
      <HUD
        level={levelConfig}
        stars={currentStarCount()}
        missionText={levelConfig.subtitle}
        inventoryCount={inventory.length}
        onOpenInventory={() => setInventoryOpen(true)}
        onPause={() => setPaused(true)}
      />
      <div
        style={{
          position: "absolute",
          top: 48,
          left: 12,
          zIndex: 50,
          pointerEvents: "auto",
        }}
      >
        <BigButton
          onClick={() => {
            if (editorMode) closeEditor("walls");
            else setEditorMode(true);
          }}
          color={editorMode ? "#FFB347" : "#8DB4FF"}
          style={{ fontSize: 12, padding: "6px 10px" }}
          disabled={!projectDataReady || !!projectDataError || !!projectSaveStatus}
        >
          {!projectDataReady ? "Loading editor..." : editorMode ? "Save and close walls" : "✏ Edit walls"}
        </BigButton>
        {editorMode && (
          <PixelPanel style={{ marginTop: 8, padding: 10, width: 235, borderColor: "#FFB347", fontSize: 11 }}>
            Drag to draw a wall. Right-click to erase it; use WASD to move around the map without moving the character.
            <br />
            When you close the editor, walls are saved to src/editorData.json in the project.
            {projectDataError && <p role="alert" style={{ color: "#FF8FB1" }}>{projectDataError}</p>}
            {projectSaveStatus && <p role="status" style={{ color: "#C6F135" }}>{projectSaveStatus}</p>}
            <button
              onClick={resetEditorWalls}
              style={{ marginTop: 8, padding: "5px 8px", cursor: "pointer", borderRadius: 6, border: 0 }}
            >
              Restaurar muros originales
            </button>
          </PixelPanel>
        )}
      </div>
      <div style={{ position: "absolute", top: 48, right: 12, zIndex: 50 }}>
          <BigButton
            onClick={() => {
              if (entityEditorMode) {
                closeEditor("entities");
              } else {
                setEntityEditorMode(true);
                setEntityEditorMinimized(false);
                setEntityDraft(null);
                setEntityEditorError("");
              }
            }}
            color={entityEditorMode ? "#FFB347" : "#C6F135"}
            style={{ fontSize: 12, padding: "6px 10px" }}
            disabled={!projectDataReady || !!projectDataError || !!projectSaveStatus}
          >
            {!projectDataReady ? "Loading editor..." : entityEditorMode ? "Save and close editor" : "✏ NPCs and clues"}
          </BigButton>
          {entityEditorMode && (
            entityEditorMinimized ? (
              <button
                type="button"
                onClick={() => setEntityEditorMinimized(false)}
                style={{ marginTop: 8, padding: "7px 10px", borderRadius: 6, border: "1px solid #C6F135", background: "#151B40", color: "#F5F5F5", cursor: "pointer" }}
              >
                Show NPC and clue editor
              </button>
            ) : (
            <PixelPanel style={{ marginTop: 8, padding: 12, width: 300, maxHeight: 560, overflowY: "auto", borderColor: "#C6F135", fontSize: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <strong>Edit map</strong>
              <button
                type="button"
                onClick={() => setEntityEditorMinimized(true)}
                aria-label="Minimize NPC and clue editor"
                title="Minimize to clear the map"
                style={{ padding: "3px 8px", borderRadius: 6, border: "1px solid #3A4270", background: "#151B40", color: "#F5F5F5", cursor: "pointer" }}
              >
                − Minimize
              </button>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {[
                  ["select", "↖ Mover/editar"],
                  ["npc", "👤 NPC"],
                  ["pista", "📌 Clue"],
                  ["exit", "🚪 Exit"],
                  ["borrar", "⌫ Delete"],
                ].map(([tool, label]) => (
                  <button
                    key={tool}
                    type="button"
                    onClick={() => startEntityPlacement(tool)}
                    style={{
                      padding: "6px 8px",
                      borderRadius: 6,
                      border: entityTool === tool ? "2px solid #C6F135" : "1px solid #3A4270",
                      background: entityTool === tool ? "#26344A" : "#151B40",
                      color: "#F5F5F5",
                      cursor: "pointer",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p style={{ color: "#C9CFEA", margin: "8px 0" }}>
                Choose “Move/edit” and drag existing elements. Click an element to edit it; use WASD to move around the map without moving the character.
              </p>
              {entityDraft && (
                <form onSubmit={saveEntityDraft} style={{ display: "grid", gap: 7, marginTop: 10 }}>
                  <strong>{entityDraft.original ? "Edit existing element" : "New element"}</strong>
                  <label>
                    {entityDraft.type === "npc" ? "Name" : "Title"}
                    <input
                      value={entityDraft.type === "npc" ? entityDraft.name : entityDraft.label}
                      onChange={(event) => setEntityDraft({
                        ...entityDraft,
                        [entityDraft.type === "npc" ? "name" : "label"]: event.target.value,
                      })}
                      maxLength={40}
                      required
                      style={editorInputStyle}
                    />
                  </label>
                  {entityDraft.type !== "npc" && (
                    <label>
                      Emoji
                      <input
                        value={entityDraft.emoji}
                        onChange={(event) => setEntityDraft({ ...entityDraft, emoji: event.target.value })}
                        maxLength={8}
                        style={editorInputStyle}
                      />
                    </label>
                  )}
                  {entityDraft.type === "npc" && (
                    <>
                      <label>
                        NPC image (optional)
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleNpcImageChange}
                          disabled={entityImageUploading}
                          style={{ ...editorInputStyle, padding: 7 }}
                        />
                      </label>
                      <span style={{ color: "#C9CFEA", fontSize: 12 }}>
                        PNG, JPG, or WebP. Saved without quality loss (up to 1024 px).
                      </span>
                      {(entityDraft.imagePreview || entityDraft.imageUrl) && (
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <img
                            src={entityDraft.imagePreview || npcImageAsset(entityDraft)}
                            alt="NPC preview"
                            style={{
                              width: 64,
                              height: 64,
                              objectFit: "cover",
                              borderRadius: "50%",
                              border: "2px solid #8DB4FF",
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setEntityDraft({ ...entityDraft, imageUrl: "", imagePreview: "" })}
                            style={editorActionButtonStyle}
                          >
                            Remove image
                          </button>
                        </div>
                      )}
                      <strong style={{ marginTop: 3 }}>Character appearance</strong>
                      <label>
                        Presentation
                        <select
                          value={entityDraft.gender || "neutral"}
                          onChange={(event) => setEntityDraft({
                            ...entityDraft,
                            gender: event.target.value,
                            hairStyle: event.target.value === "female" ? "long" : event.target.value === "male" ? "short" : entityDraft.hairStyle,
                          })}
                          style={editorInputStyle}
                        >
                          <option value="female">Feminine</option>
                          <option value="male">Masculine</option>
                          <option value="neutral">Neutral</option>
                        </select>
                      </label>
                      <label>
                        Skin tone
                        <input
                          type="color"
                          value={entityDraft.skin || "#F6C9A7"}
                          onChange={(event) => setEntityDraft({ ...entityDraft, skin: event.target.value })}
                          aria-label="Choose NPC skin tone"
                          style={{ ...editorInputStyle, height: 34, padding: 3 }}
                        />
                      </label>
                      <label>
                        Hairstyle
                        <select
                          value={entityDraft.hairStyle || "short"}
                          onChange={(event) => setEntityDraft({ ...entityDraft, hairStyle: event.target.value })}
                          style={editorInputStyle}
                        >
                          <option value="short">Short</option>
                          <option value="long">Long</option>
                        </select>
                      </label>
                      <label>
                        Hair color
                        <input
                          type="color"
                          value={entityDraft.hair || "#342B35"}
                          onChange={(event) => setEntityDraft({ ...entityDraft, hair: event.target.value })}
                          aria-label="Choose NPC hair color"
                          style={{ ...editorInputStyle, height: 34, padding: 3 }}
                        />
                      </label>
                      <label>
                        Clothing color
                        <input
                          type="color"
                          value={entityDraft.color || "#FFB347"}
                          onChange={(event) => setEntityDraft({ ...entityDraft, color: event.target.value })}
                          aria-label="Choose NPC clothing color"
                          style={{ ...editorInputStyle, height: 34, padding: 3 }}
                        />
                      </label>
                    </>
                  )}
                  <label>
                    {entityDraft.type === "npc" ? "Dialogue (one line per message)" : "Poster or clue text"}
                    <textarea
                      value={entityDraft.content}
                      onChange={(event) => setEntityDraft({ ...entityDraft, content: event.target.value })}
                      rows={4}
                      maxLength={600}
                      required={entityDraft.type === "npc" || entityDraft.objectType === "pista" || entityDraft.objectType === "mito"}
                      style={{ ...editorInputStyle, resize: "vertical" }}
                    />
                  </label>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button type="submit" disabled={entityImageUploading} style={editorActionButtonStyle}>
                      {entityImageUploading ? "Saving image..." : "Save"}
                    </button>
                    <button type="button" onClick={() => setEntityDraft(null)} style={editorActionButtonStyle}>Cancel</button>
                  </div>
                </form>
              )}
              {challengeDraft && (
                <form onSubmit={saveChallengeDraft} style={{ display: "grid", gap: 8, marginTop: 12, borderTop: "1px solid #3A4270", paddingTop: 10 }}>
                  <strong>Edit / create challenge</strong>
                  <label>
                    Título
                    <input
                      value={challengeDraft.title}
                      onChange={(event) => setChallengeDraft({ ...challengeDraft, title: event.target.value })}
                      maxLength={60}
                      required
                      style={editorInputStyle}
                    />
                  </label>
                  <label>
                    Challenge format
                    <select
                      value={challengeDraft.presentation}
                      onChange={(event) => setChallengeDraft({ ...challengeDraft, presentation: event.target.value })}
                      style={editorInputStyle}
                    >
                      <option value="multiple">Multiple choice</option>
                      <option value="cards">Tarjetas de respuesta</option>
                    </select>
                  </label>
                  <p style={{ color: "#C9CFEA", margin: "-3px 0 2px", fontSize: 11 }}>
                    {challengeDraft.presentation === "cards"
                      ? "Options will appear as large cards. Enter each card and mark the correct one with its circle."
                      : "Enter the options and mark the correct answer with its circle."}
                  </p>
                  <label>
                    {challengeDraft.kind === "npc" ? "Assign challenge to NPC" : "Assign this challenge to an NPC (optional)"}
                    <select
                      value={challengeDraft.assignedNpcId}
                      onChange={(event) => setChallengeDraft({ ...challengeDraft, assignedNpcId: event.target.value })}
                      style={editorInputStyle}
                    >
                      {challengeDraft.kind !== "npc" && (
                        <option value="">
                          {challengeDraft.entityId && editableLevelConfig.objects.find((item) => item.id === challengeDraft.entityId)?.type === "pista"
                            ? "Keep the challenge on the clue"
                            : "Keep the challenge on the poster / fragment"}
                        </option>
                      )}
                      {editableLevelConfig.npcs.map((npc) => (
                        <option key={npc.id} value={npc.id}>{npc.name}</option>
                      ))}
                    </select>
                  </label>
                  {challengeDraft.questions.map((question, questionIndex) => (
                    <div key={questionIndex} style={{ display: "grid", gap: 6, padding: 8, border: "1px solid #3A4270", borderRadius: 6 }}>
                      <strong>Pregunta {questionIndex + 1}</strong>
                      <label style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <input
                          type="checkbox"
                          checked={!!question.multiSelect}
                          onChange={(event) => {
                            const multiSelect = event.target.checked;
                            const correctIndexes = question.correctIndexes?.length
                              ? question.correctIndexes
                              : [question.correctIndex || 0];
                            updateChallengeQuestion(questionIndex, {
                              multiSelect,
                              correctIndexes: multiSelect ? correctIndexes : [correctIndexes[0]],
                              correctIndex: correctIndexes[0],
                            });
                          }}
                        />
                        Permitir varias respuestas correctas
                      </label>
                      {question.multiSelect && (
                        <p style={{ color: "#C9CFEA", margin: 0, fontSize: 11 }}>
                          Marcá todas las respuestas correctas. En el juego, se deben elegir todas y comprobar juntas.
                        </p>
                      )}
                      <textarea
                        aria-label={`Consigna ${questionIndex + 1}`}
                        value={question.text}
                        onChange={(event) => updateChallengeQuestion(questionIndex, { text: event.target.value })}
                        maxLength={600}
                        rows={2}
                        required
                        placeholder="Consigna"
                        style={{ ...editorInputStyle, resize: "vertical" }}
                      />
                      <p style={{ color: "#C9CFEA", margin: 0, fontSize: 11 }}>
                        {challengeDraft.presentation === "cards"
                          ? "Card content (choose one as correct):"
                          : "Answer options (choose one as correct):"}
                      </p>
                      {question.options.map((option, optionIndex) => (
                        <div key={optionIndex} style={{ display: "flex", gap: 5, alignItems: "center" }}>
                          <input
                            type={question.multiSelect ? "checkbox" : "radio"}
                            name={`correct-${questionIndex}`}
                            checked={question.multiSelect
                              ? (question.correctIndexes || [question.correctIndex || 0]).includes(optionIndex)
                              : question.correctIndex === optionIndex}
                            onChange={(event) => {
                              if (!question.multiSelect) {
                                updateChallengeQuestion(questionIndex, {
                                  correctIndex: optionIndex,
                                  correctIndexes: [optionIndex],
                                });
                                return;
                              }
                              const selected = question.correctIndexes || [question.correctIndex || 0];
                              const correctIndexes = event.target.checked
                                ? [...selected, optionIndex]
                                : selected.filter((answer) => answer !== optionIndex);
                              updateChallengeQuestion(questionIndex, {
                                correctIndexes,
                                correctIndex: correctIndexes[0] ?? 0,
                              });
                            }}
                            aria-label={`Mark ${challengeDraft.presentation === "cards" ? "card" : "option"} ${optionIndex + 1} as the correct answer`}
                          />
                          <input
                            value={option}
                            onChange={(event) => updateChallengeQuestion(questionIndex, {
                              options: question.options.map((value, index) => index === optionIndex ? event.target.value : value),
                            })}
                            maxLength={240}
                            required
                            aria-label={`Opción ${optionIndex + 1}`}
                            placeholder={`${challengeDraft.presentation === "cards" ? "Card" : "Option"} ${optionIndex + 1}`}
                            style={{ ...editorInputStyle, flex: 1 }}
                          />
                          {question.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => {
                                const options = question.options.filter((_, index) => index !== optionIndex);
                                const correctIndexes = (question.correctIndexes || [question.correctIndex || 0])
                                  .filter((answer) => answer !== optionIndex)
                                  .map((answer) => answer > optionIndex ? answer - 1 : answer);
                                const nextCorrectIndexes = correctIndexes.length
                                  ? correctIndexes
                                  : [Math.min(optionIndex, options.length - 1)];
                                updateChallengeQuestion(questionIndex, {
                                  options,
                                  correctIndexes: nextCorrectIndexes,
                                  correctIndex: nextCorrectIndexes[0],
                                });
                              }}
                              style={editorActionButtonStyle}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                      {question.options.length < 10 && <button
                        type="button"
                        onClick={() => updateChallengeQuestion(questionIndex, { options: [...question.options, ""] })}
                        style={editorActionButtonStyle}
                      >
                        {challengeDraft.presentation === "cards" ? "Add card" : "Add option"}
                      </button>}
                      <label>
                        Explanation when answered correctly
                        <textarea
                          aria-label={`Explanation for correct answer ${questionIndex + 1}`}
                          value={question.correctExplanation}
                          onChange={(event) => updateChallengeQuestion(questionIndex, { correctExplanation: event.target.value })}
                          maxLength={600}
                          rows={2}
                          required
                          placeholder="Explain why the answer is correct"
                          style={{ ...editorInputStyle, resize: "vertical" }}
                        />
                      </label>
                      <label>
                        Mensaje si responde incorrectamente (para volver a intentar)
                        <textarea
                          aria-label={`Mensaje para volver a intentar ${questionIndex + 1}`}
                          value={question.retryExplanation}
                          onChange={(event) => updateChallengeQuestion(questionIndex, { retryExplanation: event.target.value })}
                          maxLength={600}
                          rows={2}
                          required
                          placeholder="Give a hint or encourage the player to try again"
                          style={{ ...editorInputStyle, resize: "vertical" }}
                        />
                      </label>
                      {challengeDraft.questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setChallengeDraft({
                            ...challengeDraft,
                            questions: challengeDraft.questions.filter((_, index) => index !== questionIndex),
                          })}
                          style={editorActionButtonStyle}
                        >
                          Delete question
                        </button>
                      )}
                    </div>
                  ))}
                  {challengeDraft.questions.length < 100 && <button
                    type="button"
                    onClick={() => setChallengeDraft({
                      ...challengeDraft,
                      questions: [...challengeDraft.questions, {
                        text: "",
                        options: ["", ""],
                        correctIndex: 0,
                        correctIndexes: [0],
                        multiSelect: false,
                        correctExplanation: "",
                        retryExplanation: "",
                      }],
                    })}
                    style={editorActionButtonStyle}
                  >
                    Add question
                  </button>}
                  <div style={{ display: "flex", gap: 6 }}>
                    <button type="submit" style={editorActionButtonStyle}>Save challenge</button>
                    <button type="button" onClick={deleteCurrentChallenge} style={editorActionButtonStyle}>
                      Delete challenge
                    </button>
                    <button type="button" onClick={() => setChallengeDraft(null)} style={editorActionButtonStyle}>Cancelar</button>
                  </div>
                </form>
              )}
              {entityEditorError && <p role="alert" style={{ color: "#FF8FB1" }}>{entityEditorError}</p>}
              {projectDataError && <p role="alert" style={{ color: "#FF8FB1" }}>{projectDataError}</p>}
              {projectSaveStatus && <p role="status" style={{ color: "#C6F135" }}>{projectSaveStatus}</p>}
              <strong style={{ display: "block", marginTop: 10 }}>Elementos colocados</strong>
              {[
                ...editableLevelConfig.npcs.map((item) => ({ item, type: "npc" })),
                ...editableLevelConfig.objects.map((item) => ({ item, type: "pista" })),
              ].map(({ item, type }) => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6 }}>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.emoji} {type === "npc" ? item.name : item.label}</span>
                  <button type="button" onClick={() => startEntityEdit(type, item)} style={editorActionButtonStyle}>Editar</button>
                  {type === "npc" && (
                    <button type="button" onClick={() => openChallengeEditor(type, item)} style={editorActionButtonStyle}>Challenge</button>
                  )}
                  {type === "pista" && ["mito", "fragment", "pista"].includes(item.type) && (
                    <button type="button" onClick={() => openChallengeEditor(type, item)} style={editorActionButtonStyle}>Challenge</button>
                  )}
                  <button type="button" onClick={() => removeEntity(type, item.id)} style={editorActionButtonStyle}>×</button>
                </div>
              ))}
            </PixelPanel>
            )
          )}
        </div>
      {(projectDataError || entityEditorError || projectSaveStatus) && (
        <PixelPanel
          role={projectDataError || entityEditorError ? "alert" : "status"}
          style={{
            position: "absolute",
            top: 88,
            left: 12,
            zIndex: 49,
            maxWidth: 300,
            padding: 10,
            borderColor: projectDataError || entityEditorError ? "#FF8FB1" : "#C6F135",
            fontSize: 12,
          }}
        >
          {projectDataError || entityEditorError || projectSaveStatus}
        </PixelPanel>
      )}
      <GameCanvas
        canvasRef={canvasRef}
        levelConfig={editableLevelConfig}
        character={character}
        playerRef={playerRef}
        cameraRef={cameraRef}
        keysRef={keysRef}
        runtimeRef={runtimeRef}
        pausedRef={pausedRef}
        modalOpenRef={modalOpenRef}
        setNearby={setNearby}
        playSound={playSound}
        editorMode={editorMode}
        editorWalls={editorWalls}
        onEditorWallsChange={updateEditorWalls}
        entityEditorMode={entityEditorMode}
        entityTool={entityTool}
        onEntityPlace={handleEntityPlacement}
        onEntityRemoveAt={removeEntityAt}
        onEntityMove={updateEntityPosition}
        onEntityEdit={startEntityEdit}
      />
      <InteractPrompt label={nearby ? nearby.label : null} />
      <Toast text={toast} />

      {paused && !modal && (
        <PauseMenu onResume={() => setPaused(false)} onMap={() => onExitToMap(runtimeRef.current)} />
      )}
      {inventoryOpen && <InventoryPanel items={inventory} onClose={() => setInventoryOpen(false)} />}

      {modal && modal.kind === "dialogue" && (
        <DialogueModal
          npc={modal.npc}
          lineIndex={modal.lineIndex}
          onNext={() => {
            if (modal.lineIndex + 1 >= modal.npc.dialogue.length) {
              runtimeRef.current.doneNpcs[modal.npc.id + "_talked"] = true;
              if (modal.npc.editorCreated) {
                runtimeRef.current.doneNpcs[modal.npc.id] = true;
                runtimeRef.current.doneObjects[modal.npc.id] = true;
              }
              if (modal.npc.challenge) {
                openChallengeForNpc(modal.npc);
              } else {
                runtimeRef.current.doneNpcs[modal.npc.id] = true;
                runtimeRef.current.doneObjects[modal.npc.id] = true;
                runtimeRef.current.doneObjects[`${modal.npc.id}_done`] = true;
                closeModal();
              }
            } else {
              setModal({ ...modal, lineIndex: modal.lineIndex + 1 });
            }
          }}
        />
      )}

      {modal && modal.kind === "mito" && (
        <MitoModal
          data={modal.data}
          feedback={modal.feedback}
          onAnswer={(a) => resolveMitoOrTF(a === modal.data.answer)}
          onRetry={() => setModal((m) => ({ ...m, feedback: null }))}
          onClose={() => finalizeSimpleObjective(modal.obj, null)}
        />
      )}

      {modal && modal.kind === "truefalse" && (
        <TrueFalseModal
          data={modal.data}
          feedback={modal.feedback}
          onAnswer={(a) => resolveMitoOrTF(a === modal.data.answer)}
          onRetry={() => setModal((m) => ({ ...m, feedback: null }))}
          onClose={() => finalizeSimpleObjective(null, modal.npc)}
        />
      )}

      {modal && modal.kind === "mc" && (
        <MCModal
          data={modal.data}
          feedback={modal.feedback}
          onAnswer={(i) => resolveMitoOrTF(i === modal.data.correctIndex)}
          onRetry={() => setModal((m) => ({ ...m, feedback: null }))}
          onClose={() => finalizeSimpleObjective(null, modal.npc)}
        />
      )}

      {modal && modal.kind === "editable_challenge" && (
        <EditableChallengeModal
          questions={modal.questions}
          title={modal.title || (modal.npc?.name ? `DESAFÍO · ${modal.npc.name}` : "MITO O REALIDAD")}
          presentation={modal.presentation}
          onIncorrectAnswer={registerIncorrectAnswer}
          onFinish={() => {
            if (modal.npc) {
              runtimeRef.current.doneNpcs[modal.npc.id] = true;
              runtimeRef.current.doneObjects[modal.npc.id] = true;
              runtimeRef.current.doneObjects[`${modal.npc.id}_done`] = true;
              if (modal.npc.challenge?.starIndex) markStar(modal.npc.challenge.starIndex);
            }
            if (modal.obj) {
              runtimeRef.current.doneObjects[modal.obj.id] = true;
              if (modal.obj.type === "pista") {
                collectInventoryItem({
                  emoji: modal.obj.emoji,
                  label: modal.obj.label,
                  text: modal.obj.text,
                });
                playSound("pickup");
                showToast(`📌 Pista encontrada: ${modal.obj.label}`);
              }
              if (modal.obj.starIndex) markStar(modal.obj.starIndex);
            }
            playSound("correct");
            closeModal();
          }}
        />
      )}

      {modal && modal.kind === "infocard" && <InfoCardModal data={modal.data} onClose={closeModal} />}

      {modal && modal.kind === "dragdrop" && (
        <DragDropModal
          onIncorrectAnswer={registerIncorrectAnswer}
          onFinish={() => {
            runtimeRef.current.doneObjects["dragdrop_done"] = true;
            markStar(2);
            playSound("correct");
            closeModal();
          }}
        />
      )}

      {modal && modal.kind === "quiz_multi" && (
        <MultiQuizModal
          questions={ITS_QUIZ}
          onIncorrectAnswer={registerIncorrectAnswer}
          onFinish={() => {
            runtimeRef.current.doneObjects["enfermera_rosa_done"] = true;
            runtimeRef.current.doneNpcs[modal.npc.id] = true;
            markStar(1);
            playSound("correct");
            closeModal();
          }}
        />
      )}

      {modal && modal.kind === "scenarios_multi" && (
        <ScenarioModal
          scenarios={modal.ch.scenarioIds.map((id) => SCENARIOS_DATA.find((s) => s.id === id))}
          onIncorrectAnswer={registerIncorrectAnswer}
          onFinish={() => {
            runtimeRef.current.doneObjects["doctor_lucas_done"] = true;
            runtimeRef.current.doneNpcs[modal.npc.id] = true;
            markStar(3);
            playSound("correct");
            closeModal();
          }}
        />
      )}

      {modal && modal.kind === "scenario_single" && (
        <ScenarioModal
          scenarios={[modal.scenario]}
          onIncorrectAnswer={registerIncorrectAnswer}
          onFinish={() => {
            runtimeRef.current.doneNpcs[modal.npc.id] = true;
            if (modal.ch.starIndex) markStar(modal.ch.starIndex);
            playSound("correct");
            closeModal();
          }}
        />
      )}

      {modal && modal.kind === "fragment" && (
        <FragmentModal
          mission={modal.mission}
          onIncorrectAnswer={registerIncorrectAnswer}
          onFinish={(correct) => {
            if (correct) {
              runtimeRef.current.doneObjects[modal.obj.id] = true;
              collectInventoryItem({ emoji: modal.mission.emoji, label: modal.mission.label, text: "Fragmento conseguido." });
              showToast(`${modal.mission.emoji} Fragmento "${modal.mission.label}" conseguido`);
              playSound("pickup");
            }
            closeModal();
          }}
        />
      )}

      {modal && modal.kind === "editable_fragment" && (
        <EditableChallengeModal
          questions={modal.questions}
          title={modal.title || modal.mission?.label || "FRAGMENTO"}
          presentation={modal.presentation || "multiple"}
          onIncorrectAnswer={registerIncorrectAnswer}
          onFinish={() => {
            runtimeRef.current.doneObjects[modal.obj.id] = true;
            collectInventoryItem({
              emoji: modal.mission.emoji,
              label: modal.mission.label,
              text: "Fragmento conseguido.",
            });
            showToast(`${modal.mission.emoji} Fragmento "${modal.mission.label}" conseguido`);
            playSound("pickup");
            closeModal();
          }}
        />
      )}

      {levelDone && (
        <LevelDoneOverlay
          levelConfig={editableLevelConfig}
          stars={currentStarCount()}
          onContinue={() => onLevelFinished(levelConfig.id, currentStarCount())}
        />
      )}
    </div>
  );
}

function LevelDoneOverlay({ levelConfig, stars, onContinue }) {
  return (
    <div style={styles.modalOverlay}>
      <LevelCompleteScreen levelName={levelConfig.name} stars={stars} onContinue={onContinue} />
    </div>
  );
}

/* ================================================================
   CANVAS DE JUEGO: render + loop + colisiones + cámara
   ================================================================ */
function GameCanvas({
  canvasRef,
  levelConfig,
  character,
  playerRef,
  cameraRef,
  keysRef,
  runtimeRef,
  pausedRef,
  modalOpenRef,
  setNearby,
  playSound,
  editorMode,
  editorWalls,
  onEditorWallsChange,
  entityEditorMode,
  entityTool,
  onEntityPlace,
  onEntityRemoveAt,
  onEntityMove,
  onEntityEdit,
}) {
  const lastNearbyId = useRef(null);
  const stepSoundTimer = useRef(0);
  const editorDragRef = useRef(null);
  const entityDragRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const backgroundImage = levelConfig.backgroundImage ? new Image() : null;
    const npcImages = new Map();
    if (backgroundImage) backgroundImage.src = levelConfig.backgroundImage;
    let raf;
    let lastTime = performance.now();

    function getInteractables() {
      const list = [];
      const exitReady = areLevelObjectivesComplete(levelConfig, runtimeRef.current);
      levelConfig.npcs.forEach((npc) => {
        list.push({ kind: "npc", x: npc.x, y: npc.y, w: 40, h: 40, data: npc, label: `HABLAR CON ${npc.name.toUpperCase()}` });
      });
      levelConfig.objects.forEach((obj) => {
        if (runtimeRef.current.doneObjects[obj.id] && obj.type !== "infocard" && obj.type !== "dragdrop") return;
        const labelMap = {
          mito: "INVESTIGAR CARTEL",
          pista: "RECOGER PISTA",
          bonus: "INVESTIGAR",
          infocard: "LEER FICHA",
          dragdrop: "USAR MESA",
          fragment: "INVESTIGAR",
        };
        list.push({ kind: "object", x: obj.x, y: obj.y, w: 36, h: 36, data: obj, label: labelMap[obj.type] || "INTERACTUAR" });
      });
      const ex = levelConfig.exit;
      list.push({
        kind: "exit",
        x: ex.x,
        y: ex.y,
        w: ex.w,
        h: ex.h,
        data: ex,
        label: exitReady ? "EXIT / SUBMIT" : "EXIT LOCKED",
      });
      return list;
    }

    function update(dt) {
      const keys = keysRef.current;
      let dx = 0,
        dy = 0;
      if (keys.has("arrowup") || keys.has("w")) dy -= 1;
      if (keys.has("arrowdown") || keys.has("s")) dy += 1;
      if (keys.has("arrowleft") || keys.has("a")) dx -= 1;
      if (keys.has("arrowright") || keys.has("d")) dx += 1;

      const moving = dx !== 0 || dy !== 0;
      const player = playerRef.current;
      player.moving = moving;

      if (moving) {
        const len = Math.hypot(dx, dy) || 1;
        dx = (dx / len) * PLAYER_SPEED * dt;
        dy = (dy / len) * PLAYER_SPEED * dt;
        if (Math.abs(dx) > Math.abs(dy)) player.dir = dx > 0 ? "right" : "left";
        else if (dy !== 0) player.dir = dy > 0 ? "down" : "up";

        const walls = editorWalls;
        const box = () => ({ x: player.x, y: player.y, w: PLAYER_SIZE, h: PLAYER_SIZE });

        player.x += dx;
        let b = box();
        for (const w of walls) {
          if (rectsOverlap(b, w)) {
            player.x -= dx;
            break;
          }
        }
        player.y += dy;
        b = box();
        for (const w of walls) {
          if (rectsOverlap(b, w)) {
            player.y -= dy;
            break;
          }
        }
        player.x = Math.max(4, Math.min(levelConfig.width - PLAYER_SIZE - 4, player.x));
        player.y = Math.max(4, Math.min(levelConfig.height - PLAYER_SIZE - 4, player.y));

        stepSoundTimer.current += dt;
        if (stepSoundTimer.current > 0.28) {
          stepSoundTimer.current = 0;
        }
      }

      // camara
      const cam = cameraRef.current;
      cam.x = Math.max(0, Math.min(levelConfig.width - VIEW_W, player.x + PLAYER_SIZE / 2 - VIEW_W / 2));
      cam.y = Math.max(0, Math.min(levelConfig.height - VIEW_H, player.y + PLAYER_SIZE / 2 - VIEW_H / 2));

      // proximidad
      const interactables = getInteractables();
      const pcx = player.x + PLAYER_SIZE / 2;
      const pcy = player.y + PLAYER_SIZE / 2;
      let best = null;
      let bestDist = INTERACT_RADIUS;
      for (const it of interactables) {
        const cx = it.x + it.w / 2;
        const cy = it.y + it.h / 2;
        const d = distance(pcx, pcy, cx, cy);
        if (d < bestDist) {
          bestDist = d;
          best = it;
        }
      }
      const bestId = best ? (best.data.id || "exit") : null;
      if (bestId !== lastNearbyId.current) {
        lastNearbyId.current = bestId;
        setNearby(best ? { label: best.label, target: best } : null);
      } else if (best) {
        // actualizar referencia target por si cambió estado interno
        setNearby((prev) => (prev ? { ...prev, target: best } : prev));
      }
    }

    function draw() {
      const cam = cameraRef.current;
      const player = playerRef.current;
      ctx.clearRect(0, 0, VIEW_W, VIEW_H);
      ctx.save();
      ctx.translate(-cam.x, -cam.y);

      if (backgroundImage) {
        if (backgroundImage.complete && backgroundImage.naturalWidth > 0) {
          ctx.drawImage(backgroundImage, 0, 0, levelConfig.width, levelConfig.height);
        } else {
          ctx.fillStyle = levelConfig.floorColor;
          ctx.fillRect(0, 0, levelConfig.width, levelConfig.height);
        }
      } else {
        // piso
        ctx.fillStyle = levelConfig.floorColor;
        ctx.fillRect(0, 0, levelConfig.width, levelConfig.height);
        // grilla suave
        ctx.strokeStyle = "rgba(0,0,0,0.04)";
        for (let gx = 0; gx < levelConfig.width; gx += 40) {
          ctx.beginPath();
          ctx.moveTo(gx, 0);
          ctx.lineTo(gx, levelConfig.height);
          ctx.stroke();
        }
        for (let gy = 0; gy < levelConfig.height; gy += 40) {
          ctx.beginPath();
          ctx.moveTo(0, gy);
          ctx.lineTo(levelConfig.width, gy);
          ctx.stroke();
        }
        ctx.fillStyle = "rgba(16,22,58,0.35)";
        ctx.font = "700 13px 'Baloo 2', sans-serif";
        (levelConfig.labels || []).forEach((l) => ctx.fillText(l.text, l.x, l.y));
        (levelConfig.decorations || []).forEach((d) => drawDecoration(ctx, d));
        ctx.fillStyle = "#788594";
        levelConfig.walls.forEach((w) => {
          ctx.fillRect(w.x, w.y, w.w, w.h);
          ctx.strokeStyle = "#26344A";
          ctx.strokeRect(w.x, w.y, w.w, w.h);
        });
      }

      // objetos
      levelConfig.objects.forEach((obj) => {
        const done = runtimeRef.current.doneObjects[obj.id];
        if (done && obj.type !== "infocard" && obj.type !== "dragdrop") return;
        drawInteractable(ctx, obj, levelConfig.accent, done);
      });

      // NPCs
      levelConfig.npcs.forEach((npc) => {
        const imageUrl = npcImageAsset(npc);
        let image = imageUrl ? npcImages.get(imageUrl) : null;
        if (imageUrl && !image) {
          image = new Image();
          image.src = imageUrl;
          npcImages.set(imageUrl, image);
        }
        drawNpc(ctx, npc, image);
      });

      // salida
      const ex = levelConfig.exit;
      const exitReady = areLevelObjectivesComplete(levelConfig, runtimeRef.current);
      ctx.fillStyle = exitReady ? "rgba(198,241,53,0.25)" : "rgba(120,133,148,0.2)";
      ctx.fillRect(ex.x, ex.y, ex.w, ex.h);
      ctx.strokeStyle = exitReady ? "#C6F135" : "#788594";
      ctx.lineWidth = 2;
      ctx.strokeRect(ex.x, ex.y, ex.w, ex.h);
      ctx.fillStyle = exitReady ? "#10163A" : "#4D5866";
      ctx.font = "700 11px 'Inter', sans-serif";
      ctx.fillText(exitReady ? ex.label : "EXIT LOCKED", ex.x + 4, ex.y + ex.h + 14);

      if (editorMode) {
        ctx.save();
        ctx.fillStyle = "rgba(255,179,71,0.38)";
        ctx.strokeStyle = "#FFB347";
        ctx.lineWidth = 2;
        editorWalls.forEach((wall) => {
          ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
          ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);
        });
        ctx.restore();
      }

      // jugador
      const bob = player.moving ? Math.sin(performance.now() / 90) * 3 : 0;
      drawPlayer(ctx, player.x, player.y - bob, character.color, character.id, character);

      ctx.restore();
    }

    function loop(time) {
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      if (editorMode || entityEditorMode) {
        const keys = keysRef.current;
        const camera = cameraRef.current;
        const panSpeed = 300 * dt;
        if (keys.has("arrowup") || keys.has("w")) camera.y -= panSpeed;
        if (keys.has("arrowdown") || keys.has("s")) camera.y += panSpeed;
        if (keys.has("arrowleft") || keys.has("a")) camera.x -= panSpeed;
        if (keys.has("arrowright") || keys.has("d")) camera.x += panSpeed;
        camera.x = Math.max(0, Math.min(levelConfig.width - VIEW_W, camera.x));
        camera.y = Math.max(0, Math.min(levelConfig.height - VIEW_H, camera.y));
      } else if (!pausedRef.current && !modalOpenRef.current) {
        update(dt);
      }
      draw();
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelConfig, editorMode, editorWalls, entityEditorMode]);

  return (
    <canvas
      ref={canvasRef}
      width={VIEW_W}
      height={VIEW_H}
      style={{
        display: "block",
        borderRadius: "0 0 14px 14px",
        boxShadow: "0 10px 0 rgba(0,0,0,0.35)",
        cursor: editorMode || entityEditorMode ? "crosshair" : "default",
      }}
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        if (!editorMode && !entityEditorMode) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const scaleX = VIEW_W / rect.width;
        const scaleY = VIEW_H / rect.height;
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const worldX = x * scaleX + cameraRef.current.x;
        const worldY = y * scaleY + cameraRef.current.y;
        if (entityEditorMode) {
          if (entityTool === "borrar") {
            onEntityRemoveAt({ x: worldX, y: worldY });
            return;
          }
          if (entityTool === "npc" || entityTool === "pista" || entityTool === "exit") {
            onEntityPlace({ x: worldX, y: worldY });
            return;
          }
          const candidates = [
            ...levelConfig.npcs.map((item) => ({ type: "npc", item })),
            ...levelConfig.objects.map((item) => ({ type: "pista", item })),
          ];
          const selected = candidates.find(({ type, item }) => {
            const size = type === "npc" ? 40 : 36;
            return worldX >= item.x && worldX <= item.x + size &&
              worldY >= item.y - 8 && worldY <= item.y + size;
          });
          if (selected) {
            entityDragRef.current = {
              ...selected,
              startX: worldX,
              startY: worldY,
              offsetX: worldX - selected.item.x,
              offsetY: worldY - selected.item.y,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }
          return;
        }
        if (!editorMode) return;
        if (event.button === 2) {
          const index = editorWalls.findIndex((wall) => rectsOverlap({ x: worldX, y: worldY, w: 1, h: 1 }, wall));
          if (index >= 0) onEditorWallsChange(editorWalls.filter((_, wallIndex) => wallIndex !== index));
          return;
        }
        editorDragRef.current = { x: worldX, y: worldY };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerUp={(event) => {
        if (entityEditorMode && entityDragRef.current) {
          const rect = event.currentTarget.getBoundingClientRect();
          const scaleX = VIEW_W / rect.width;
          const scaleY = VIEW_H / rect.height;
          const endX = (event.clientX - rect.left) * scaleX + cameraRef.current.x;
          const endY = (event.clientY - rect.top) * scaleY + cameraRef.current.y;
          const drag = entityDragRef.current;
          entityDragRef.current = null;
          if (distance(drag.startX, drag.startY, endX, endY) < 6) {
            onEntityEdit(drag.type, drag.item);
          } else {
            const size = drag.type === "npc" ? 40 : 36;
            onEntityMove(
              drag.type,
              drag.item.id,
              Math.max(0, Math.min(levelConfig.width - size, endX - drag.offsetX)),
              Math.max(0, Math.min(levelConfig.height - size, endY - drag.offsetY)),
            );
          }
          return;
        }
        if (!editorMode || !editorDragRef.current) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const scaleX = VIEW_W / rect.width;
        const scaleY = VIEW_H / rect.height;
        const endX = (event.clientX - rect.left) * scaleX + cameraRef.current.x;
        const endY = (event.clientY - rect.top) * scaleY + cameraRef.current.y;
        const start = editorDragRef.current;
        editorDragRef.current = null;
        const wall = {
          x: Math.max(0, Math.min(start.x, endX)),
          y: Math.max(0, Math.min(start.y, endY)),
          w: Math.min(levelConfig.width, Math.abs(endX - start.x)),
          h: Math.min(levelConfig.height, Math.abs(endY - start.y)),
        };
        if (wall.w >= 8 && wall.h >= 8) {
          onEditorWallsChange([...editorWalls, wall]);
        }
      }}
    />
  );
}

function drawDecoration(ctx, decoration) {
  const { x, y, emoji, size = 28 } = decoration;
  const kind = decoration.kind || emoji;
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(16,22,58,0.22)";
  ctx.fillStyle = "rgba(16,22,58,0.12)";
  ctx.beginPath();
  ctx.ellipse(x + size / 2, y + size + 5, size / 2, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  if (kind === "tree" || kind === "🌳") {
    ctx.fillStyle = "#6B4F3A";
    ctx.fillRect(x + size * 0.4, y + size * 0.48, size * 0.2, size * 0.46);
    ctx.fillStyle = "#4E9B70";
    ctx.beginPath();
    ctx.arc(x + size * 0.5, y + size * 0.3, size * 0.33, 0, Math.PI * 2);
    ctx.arc(x + size * 0.28, y + size * 0.48, size * 0.23, 0, Math.PI * 2);
    ctx.arc(x + size * 0.72, y + size * 0.48, size * 0.23, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "desk" || kind === "🪑") {
    ctx.fillStyle = "#B9794D";
    ctx.fillRect(x + 3, y + 8, size - 6, size * 0.35);
    ctx.fillRect(x + 6, y + size * 0.43, 4, size * 0.5);
    ctx.fillRect(x + size - 10, y + size * 0.43, 4, size * 0.5);
    ctx.strokeRect(x + 3, y + 8, size - 6, size * 0.35);
  } else if (kind === "books" || kind === "📚") {
    ["#FF8FB1", "#8DB4FF", "#C6F135"].forEach((color, index) => {
      ctx.fillStyle = color;
      ctx.fillRect(x + index * (size * 0.25), y + size * (0.55 - index * 0.08), size * 0.22, size * (0.35 + index * 0.08));
    });
  } else if (kind === "fountain" || kind === "⛲") {
    ctx.fillStyle = "#8DB4FF";
    ctx.beginPath();
    ctx.ellipse(x + size / 2, y + size * 0.72, size * 0.43, size * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x + size * 0.4, y + size * 0.38, size * 0.2, size * 0.32);
    ctx.strokeStyle = "#E4EEFB";
    ctx.beginPath();
    ctx.moveTo(x + size * 0.5, y + size * 0.38);
    ctx.quadraticCurveTo(x + size * 0.32, y + size * 0.1, x + size * 0.2, y + size * 0.3);
    ctx.moveTo(x + size * 0.5, y + size * 0.38);
    ctx.quadraticCurveTo(x + size * 0.68, y + size * 0.1, x + size * 0.8, y + size * 0.3);
    ctx.stroke();
  } else {
    ctx.fillStyle = "#FFD166";
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size * 0.36, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawInteractable(ctx, obj, accent, done) {
  const x = obj.x;
  const y = obj.y;
  const size = 36;
  const color = done ? "#8891C4" : accent;
  ctx.save();
  ctx.globalAlpha = done ? 0.45 : 1;
  ctx.fillStyle = "rgba(16,22,58,0.18)";
  ctx.beginPath();
  ctx.ellipse(x + size / 2, y + size + 5, size / 2.3, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.strokeStyle = "#10163A";
  ctx.lineWidth = 2;
  if (obj.type === "mito") {
    ctx.fillRect(x + 5, y + 3, size - 10, size - 4);
    ctx.strokeRect(x + 5, y + 3, size - 10, size - 4);
    ctx.fillStyle = "#10163A";
    ctx.fillRect(x + 11, y + 11, size - 22, 2);
    ctx.fillRect(x + 11, y + 18, size - 16, 2);
  } else if (obj.type === "infocard") {
    ctx.fillRect(x + 3, y + 5, size - 6, size - 7);
    ctx.strokeRect(x + 3, y + 5, size - 6, size - 7);
    ctx.fillStyle = "#F5F5F5";
    ctx.fillRect(x + 9, y + 12, size - 18, 3);
    ctx.fillRect(x + 9, y + 19, size - 13, 3);
  } else if (obj.type === "fragment") {
    ctx.translate(x + size / 2, y + size / 2);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-11, -11, 22, 22);
    ctx.strokeRect(-11, -11, 22, 22);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = "#10163A";
    ctx.font = "700 18px sans-serif";
    ctx.fillText("+", -5, 6);
  } else {
    ctx.fillRect(x + 5, y + 8, size - 10, size - 12);
    ctx.strokeRect(x + 5, y + 8, size - 10, size - 12);
    ctx.fillStyle = "#F5F5F5";
    ctx.fillRect(x + 11, y + 14, size - 22, 3);
    ctx.fillRect(x + 11, y + 21, size - 16, 3);
  }
  ctx.restore();
}

function drawNpc(ctx, npc, image) {
  if (image?.complete && image.naturalWidth > 0) {
    const size = 72;
    const x = npc.x + 20;
    const y = npc.y + 40 - size / 2;
    const scale = Math.min(size / image.naturalWidth, size / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "rgba(16,22,58,0.18)";
    ctx.beginPath();
    ctx.ellipse(x, npc.y + 42, 20, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(image, x - width / 2, y - height / 2, width, height);
    ctx.restore();
  } else {
    drawPlayer(ctx, npc.x, npc.y, npc.color, npc.id, npc);
  }
  ctx.save();
  ctx.font = "700 11px 'Inter', sans-serif";
  ctx.textAlign = "center";
  const nameY = npc.y - (image?.complete && image.naturalWidth > 0 ? 46 : 23);
  const nameWidth = ctx.measureText(npc.name).width;
  const labelX = npc.x + 20;
  ctx.fillStyle = "rgba(16,22,58,0.82)";
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 2;
  ctx.beginPath();
  ctx.roundRect(labelX - nameWidth / 2 - 7, nameY - 12, nameWidth + 14, 18, 6);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = "#FFFFFF";
  ctx.strokeStyle = "rgba(16,22,58,0.9)";
  ctx.lineWidth = 2;
  ctx.strokeText(npc.name, labelX, nameY);
  ctx.fillText(npc.name, labelX, nameY);
  ctx.restore();
}

function drawPlayer(ctx, x, y, color, id, appearance = {}) {
  ctx.save();
  ctx.fillStyle = "rgba(16,22,58,0.18)";
  ctx.beginPath();
  ctx.ellipse(x + 17, y + 39, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color || "#C6F135";
  ctx.beginPath();
  ctx.roundRect(x + 7, y + 18, 20, 18, 6);
  ctx.fill();
  ctx.fillStyle = appearance.skin || "#F6C9A7";
  ctx.beginPath();
  ctx.arc(x + 17, y + 12, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = appearance.hair || (id.includes("cami") ? "#4C315E" : "#342B35");
  ctx.beginPath();
  ctx.arc(
    x + 17,
    y + 9,
    appearance.hairStyle === "long" ? 11 : 9,
    Math.PI,
    Math.PI * 2,
  );
  ctx.fill();
  if (appearance.hairStyle === "long") {
    ctx.fillRect(x + 7, y + 9, 5, 16);
    ctx.fillRect(x + 22, y + 9, 5, 16);
  }
  ctx.fillStyle = "#10163A";
  ctx.fillRect(x + 10, y + 36, 5, 5);
  ctx.fillRect(x + 19, y + 36, 5, 5);
  ctx.restore();
}

/* ================================================================
   COMPONENTE PRINCIPAL
   ================================================================ */
const LEVELS = buildLevels();

export default function JobQuestGame() {
  const [screen, setScreen] = useState("select"); // select | map | game
  const language = "en";
  const [character, setCharacter] = useState(null);
  const [currentLevelId, setCurrentLevelId] = useState(null);
  const [lastResult, setLastResult] = useState(null); // {levelId, stars}
  const playSound = useSound();

  const [progress, setProgress] = useState({
    liceo: { unlocked: true, stars: 0, completed: false },
    rumores: { unlocked: false, stars: 0, completed: false },
    centro: { unlocked: false, stars: 0, completed: false },
    mision: { unlocked: false, stars: 0, completed: false },
  });

  function computeUnlocks(p) {
    const np = { ...p, liceo: { ...p.liceo, unlocked: true } };
    np.rumores = { ...np.rumores, unlocked: np.liceo.completed };
    np.centro = { ...np.centro, unlocked: np.rumores.completed };
    np.mision = { ...np.mision, unlocked: np.centro.completed };
    return np;
  }

  function handleSelectCharacter(c) {
    setCharacter(c);
    setScreen("map");
  }

  function handleEnterLevel(levelId) {
    setCurrentLevelId(levelId);
    setScreen("game");
  }

  function handleExitToMap() {
    setScreen("map");
    setCurrentLevelId(null);
  }

  function handleLevelFinished(levelId, stars) {
    setProgress((p) => {
      const updated = {
        ...p,
        [levelId]: { ...p[levelId], stars: Math.max(p[levelId].stars, stars), completed: true },
      };
      return computeUnlocks(updated);
    });
    setLastResult({ levelId, stars });
    playSound("unlock");
    setScreen("map");
    setCurrentLevelId(null);
  }

  return (
    <div style={styles.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
      `}</style>

      {screen === "select" && <CharacterSelectScreen onSelect={handleSelectCharacter} language={language} />}

      {screen === "map" && character && (
        <MapScreen progress={progress} onEnterLevel={handleEnterLevel} character={character} language={language} />
      )}

      {screen === "game" && currentLevelId && (
        currentLevelId === "mision" ? (
          <InterviewBattle
            character={character}
            language={language}
            onComplete={(stars) => handleLevelFinished("mision", stars)}
          />
        ) : (
          <GameScreen
            key={currentLevelId}
            levelConfig={LEVELS[currentLevelId]}
            character={character}
            onExitToMap={handleExitToMap}
            onLevelFinished={handleLevelFinished}
            playSound={playSound}
          />
        )
      )}
    </div>
  );
}

/* ================================================================
   ESTILOS BASE
   ================================================================ */
const styles = {
  app: {
    minHeight: "100vh",
    width: "100%",
    overflowY: "auto",
    background: "radial-gradient(circle at 20% 20%, #1A2258 0%, #10163A 60%, #0B0F2A 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    boxSizing: "border-box",
    fontFamily: "'Inter', sans-serif",
    color: "#F5F5F5",
  },
  centerScreen: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px 10px",
  },
  title: {
    fontFamily: "'Baloo 2', sans-serif",
    fontWeight: 800,
    fontSize: 56,
    margin: 0,
    letterSpacing: 2,
    color: "#C6F135",
    textShadow: "0 4px 0 rgba(0,0,0,0.4)",
  },
  subtitle: {
    fontFamily: "'Baloo 2', sans-serif",
    color: "#FF8FB1",
    marginTop: 4,
    letterSpacing: 3,
    fontSize: 14,
  },
  hudBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 10px",
    fontFamily: "'Inter', sans-serif",
    fontSize: 13,
    gap: 8,
  },
  iconButton: {
    background: "rgba(16,22,58,0.92)",
    border: "2px solid #C6F135",
    borderRadius: 10,
    color: "#F5F5F5",
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: 13,
  },
  interactPrompt: {
    position: "absolute",
    bottom: 18,
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(16,22,58,0.92)",
    border: "2px solid #C6F135",
    borderRadius: 10,
    padding: "6px 14px",
    fontFamily: "'Inter', sans-serif",
    fontSize: 13,
    display: "flex",
    alignItems: "center",
  },
  toast: {
    position: "absolute",
    top: 60,
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(198,241,53,0.95)",
    color: "#10163A",
    borderRadius: 10,
    padding: "8px 16px",
    fontFamily: "'Inter', sans-serif",
    fontWeight: 600,
    fontSize: 13,
    boxShadow: "0 4px 0 rgba(0,0,0,0.3)",
  },
  modalOverlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(5,8,26,0.72)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    zIndex: 20,
    padding: 14,
  },
};
