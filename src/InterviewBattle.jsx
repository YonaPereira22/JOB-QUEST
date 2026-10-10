import React, { useEffect, useRef, useState } from "react";
import { INTERVIEW_WAVES } from "./interviewMissionData.js";

const ARENA_WIDTH = 900;
const ARENA_HEIGHT = 500;
const MISSIONS_SCORE_LIMIT = 300;
const CHARACTER_SPRITES_URL = `${import.meta.env.BASE_URL}final-mission/interview-battle-sprites.png`;
const BATTLE_BACKGROUND_URL = `${import.meta.env.BASE_URL}final-mission/interview-battle-background.png`;
const BATTLE_CHARACTERS = {
  blue: {
    labelEs: "Héroe azul",
    labelEn: "Blue hero",
    showcaseImage: `${import.meta.env.BASE_URL}final-mission/interview-character-blue.png`,
    idle: { x: 0, y: 0 },
    walking: [{ x: 210, y: 0 }, { x: 315, y: 0 }, { x: 415, y: 0 }, { x: 510, y: 0 }],
    shooting: [{ x: 420, y: 151 }, { x: 530, y: 151 }, { x: 640, y: 151 }],
    projectile: { x: 901, y: 151 },
  },
  purple: {
    labelEs: "Heroína violeta",
    labelEn: "Purple heroine",
    showcaseImage: `${import.meta.env.BASE_URL}final-mission/interview-character-purple.png`,
    idle: { x: 0, y: 411 },
    walking: [{ x: 215, y: 411 }, { x: 315, y: 411 }, { x: 420, y: 411 }, { x: 515, y: 411 }],
    shooting: [{ x: 0, y: 556 }, { x: 105, y: 556 }, { x: 210, y: 556 }, { x: 315, y: 556 }],
    projectile: { x: 898, y: 556 },
  },
};

function createCertificate(name, score, correctAnswers, date) {
  return new Promise((resolve, reject) => {
    const template = new Image();
    template.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = template.naturalWidth;
      canvas.height = template.naturalHeight + 96;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("This browser could not prepare the certificate."));
        return;
      }

      context.drawImage(template, 0, 0);
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = "#123b73";
      context.font = "700 34px Georgia, serif";
      const maxNameWidth = canvas.width * 0.54;
      while (context.measureText(name).width > maxNameWidth && parseInt(context.font, 10) > 20) {
        context.font = `700 ${parseInt(context.font, 10) - 1}px Georgia, serif`;
      }
      context.fillText(name, canvas.width / 2, template.naturalHeight * 0.435, maxNameWidth);

      const footerTop = template.naturalHeight;
      context.fillStyle = "#f4f8ff";
      context.fillRect(0, footerTop, canvas.width, 96);
      context.fillStyle = "#d7a52b";
      context.fillRect(0, footerTop, canvas.width, 5);
      context.strokeStyle = "#123b73";
      context.lineWidth = 3;
      context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
      context.fillStyle = "#123b73";
      context.font = "700 21px Arial, sans-serif";
      context.fillText("THE INTERVIEW BATTLE", canvas.width / 2, footerTop + 32);
      context.font = "18px Arial, sans-serif";
      context.fillText(
        `Final score: ${score} / 300  ·  Correct answers: ${correctAnswers} / 3  ·  Date: ${date.toLocaleDateString("en-US")}`,
        canvas.width / 2,
        footerTop + 66,
        canvas.width - 48,
      );
      resolve(canvas.toDataURL("image/png"));
    };
    template.onerror = () => reject(new Error("The JOB QUEST certificate template could not be loaded."));
    template.src = `${import.meta.env.BASE_URL}final-mission/interview-certificate-template.png`;
  });
}

function MissionButton({ children, onClick, disabled = false, color = "#C6F135" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        border: 0,
        borderRadius: 10,
        padding: "11px 20px",
        color: "#10163A",
        background: color,
        fontFamily: "'Baloo 2', sans-serif",
        fontSize: 16,
        fontWeight: 800,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {children}
    </button>
  );
}

function BattleCharacterSprite({ characterId, action, frame, name, width = 104, height = 140, style = {} }) {
  const character = BATTLE_CHARACTERS[characterId];
  const poses = action === "shooting"
    ? character.shooting
    : action === "walking"
      ? character.walking
      : [character.idle];
  const pose = poses[frame % poses.length];

  return (
    <div
      aria-label={name}
      role="img"
      style={{
        width,
        height,
        flex: "0 0 auto",
        backgroundImage: `url("${CHARACTER_SPRITES_URL}")`,
        backgroundPosition: `-${pose.x}px -${pose.y}px`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "1536px 768px",
        pointerEvents: "none",
        ...style,
      }}
    />
  );
}

function TargetCard({ target }) {
  return (
    <div
      aria-label={`Answer ${target.id}: ${target.text}`}
      style={{
        position: "absolute",
        left: `${(target.x / ARENA_WIDTH) * 100}%`,
        top: `${(target.y / ARENA_HEIGHT) * 100}%`,
        transform: "translate(-50%, -50%)",
        width: "min(31%, 260px)",
        minWidth: 150,
        minHeight: 100,
        padding: "10px 12px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 5,
        border: "2px solid #8DB4FF",
        borderRadius: 12,
        background: "rgba(16,22,58,.96)",
        color: "#F5F5F5",
        textAlign: "center",
        pointerEvents: "none",
        boxShadow: "0 5px 14px rgba(0,0,0,.35)",
      }}
    >
      <strong style={{ color: "#C6F135", fontSize: 13 }}>{target.id}</strong>
      <span style={{ fontSize: "clamp(12px, 1.3vw, 16px)", lineHeight: 1.25 }}>{target.text}</span>
    </div>
  );
}

export default function InterviewBattle({ character, language = "es", onComplete }) {
  const arenaRef = useRef(null);
  const audioRef = useRef(null);
  const keysRef = useRef(new Set());
  const gameRef = useRef({
    player: { x: 75, y: ARENA_HEIGHT / 2 },
    targets: [],
    projectiles: [],
    effects: [],
    waveIndex: 0,
    score: 0,
    correctAnswers: 0,
    errors: 0,
    waveErrors: 0,
    nextShotId: 0,
    lastShotAt: 0,
    attackAnimationUntil: 0,
  });
  const stageRef = useRef("character-select");
  const [stage, setStage] = useState("character-select");
  const [battleCharacter, setBattleCharacter] = useState("blue");
  const [playerAction, setPlayerAction] = useState("idle");
  const [playerFacing, setPlayerFacing] = useState("right");
  const [spriteFrame, setSpriteFrame] = useState(0);
  const [waveIndex, setWaveIndex] = useState(0);
  const [player, setPlayer] = useState({ x: 75, y: ARENA_HEIGHT / 2 });
  const [targets, setTargets] = useState([]);
  const [projectiles, setProjectiles] = useState([]);
  const [effects, setEffects] = useState([]);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [errors, setErrors] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [completionDate, setCompletionDate] = useState(null);
  const [certificateUrl, setCertificateUrl] = useState("");
  const [certificateError, setCertificateError] = useState("");
  const [audioError, setAudioError] = useState("");
  const spanish = language === "es";
  const wave = INTERVIEW_WAVES[waveIndex];

  function changeStage(nextStage) {
    stageRef.current = nextStage;
    setStage(nextStage);
    if (nextStage === "paused" || nextStage === "completed") {
      audioRef.current?.pause();
    } else if (nextStage === "active") {
      audioRef.current?.play().catch((error) => {
        setAudioError(`No se pudo reproducir la música: ${error.message}`);
      });
    }
  }

  function resetMission(showCharacterSelect = false) {
    keysRef.current.clear();
    gameRef.current = {
      player: { x: 75, y: ARENA_HEIGHT / 2 },
      targets: [],
      projectiles: [],
      effects: [],
      waveIndex: 0,
      score: 0,
      correctAnswers: 0,
      errors: 0,
      waveErrors: 0,
      nextShotId: 0,
      lastShotAt: 0,
      attackAnimationUntil: 0,
    };
    setWaveIndex(0);
    setPlayer({ x: 75, y: ARENA_HEIGHT / 2 });
    setTargets([]);
    setProjectiles([]);
    setEffects([]);
    setPlayerAction("idle");
    setPlayerFacing("right");
    setSpriteFrame(0);
    setScore(0);
    setCorrectAnswers(0);
    setErrors(0);
    setFeedback(null);
    setCompletionDate(null);
    setCertificateUrl("");
    setCertificateError("");
    setAudioError("");
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    changeStage(showCharacterSelect ? "character-select" : "briefing");
  }

  function beginWave() {
    const current = gameRef.current;
    const xPositions = [155, 450, 745];
    const yPositions = [140, 250, 360];
    const xDirections = [1, -1, 1];
    const yDirections = [1, -1, 1];
    current.targets = wave.answers.map((answer, index) => ({
      ...answer,
      x: xPositions[index],
      y: yPositions[index],
      vx: xDirections[index] * (24 + waveIndex * 5 + index * 3),
      vy: yDirections[index] * (7 + waveIndex * 2 + index),
      xMin: [140, 435, 730][index],
      xMax: [170, 465, 760][index],
      yMin: yPositions[index] - 8,
      yMax: yPositions[index] + 8,
      resolved: false,
    }));
    current.projectiles = [];
    current.effects = [];
    current.waveErrors = 0;
    setTargets(current.targets.map((target) => ({ ...target })));
    setProjectiles([]);
    setEffects([]);
    setFeedback(null);
    changeStage("active");
  }

  function advanceWave() {
    if (waveIndex === INTERVIEW_WAVES.length - 1) {
      setCompletionDate(new Date());
      changeStage("completed");
      return;
    }
    const nextIndex = waveIndex + 1;
    gameRef.current.waveIndex = nextIndex;
    setWaveIndex(nextIndex);
    setFeedback(null);
    setTargets([]);
    setProjectiles([]);
    changeStage("briefing");
  }

  useEffect(() => {
    if (stage !== "completed" || !completionDate) return;
    let cancelled = false;
    createCertificate(
        character.name.trim(),
        gameRef.current.score,
        gameRef.current.correctAnswers,
        completionDate,
      ).then((url) => {
        if (cancelled) return;
        setCertificateUrl(url);
        setCertificateError("");
      }).catch((error) => {
        if (!cancelled) setCertificateError(`Could not generate the certificate: ${error.message}`);
      });
    return () => {
      cancelled = true;
    };
  }, [stage, completionDate, character.name]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = 0.35;
    return () => audioRef.current?.pause();
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      const key = event.key.toLowerCase();
      if (key === "escape" && stageRef.current === "active") {
        keysRef.current.clear();
        changeStage("paused");
        return;
      }
      if (key === "escape" && stageRef.current === "paused") {
        changeStage("active");
        return;
      }
      if (stageRef.current !== "active") return;
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) {
        keysRef.current.add(key);
        event.preventDefault();
      }
    };
    const onKeyUp = (event) => keysRef.current.delete(event.key.toLowerCase());
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    keysRef.current.clear();
  }, [stage]);

  useEffect(() => {
    if (playerAction === "idle") {
      setSpriteFrame(0);
      return undefined;
    }
    const timer = window.setInterval(() => {
      setSpriteFrame((frame) => frame + 1);
    }, 110);
    return () => window.clearInterval(timer);
  }, [playerAction]);

  useEffect(() => {
    if (stage !== "active") return undefined;
    let animationFrame;
    let previousTime = performance.now();
    const tick = (time) => {
      if (stageRef.current !== "active") return;
      const deltaTime = Math.min((time - previousTime) / 1000, 0.04);
      previousTime = time;
      const current = gameRef.current;
      const keys = keysRef.current;
      const directionX = Number(keys.has("d") || keys.has("arrowright")) -
        Number(keys.has("a") || keys.has("arrowleft"));
      const directionY = Number(keys.has("s") || keys.has("arrowdown")) -
        Number(keys.has("w") || keys.has("arrowup"));
      if (directionX !== 0 && time >= current.attackAnimationUntil) {
        setPlayerFacing(directionX > 0 ? "right" : "left");
      }
      const nextAction = time < current.attackAnimationUntil
        ? "shooting"
        : directionX || directionY
          ? "walking"
          : "idle";
      setPlayerAction((action) => (action === nextAction ? action : nextAction));
      const magnitude = Math.hypot(directionX, directionY) || 1;
      current.player.x = Math.max(24, Math.min(876, current.player.x + directionX / magnitude * 250 * deltaTime));
      current.player.y = Math.max(28, Math.min(472, current.player.y + directionY / magnitude * 250 * deltaTime));

      current.targets.forEach((target) => {
        if (target.resolved) return;
        target.x += target.vx * deltaTime;
        target.y += target.vy * deltaTime;
        if (target.x < target.xMin || target.x > target.xMax) {
          target.x = Math.max(target.xMin, Math.min(target.xMax, target.x));
          target.vx *= -1;
        }
        if (target.y < target.yMin || target.y > target.yMax) {
          target.y = Math.max(target.yMin, Math.min(target.yMax, target.y));
          target.vy *= -1;
        }
      });

      let waveFinished = false;
      for (let shotIndex = current.projectiles.length - 1; shotIndex >= 0; shotIndex -= 1) {
        const shot = current.projectiles[shotIndex];
        shot.x += shot.vx * deltaTime;
        shot.y += shot.vy * deltaTime;
        if (shot.x < 0 || shot.x > ARENA_WIDTH || shot.y < 0 || shot.y > ARENA_HEIGHT) {
          current.projectiles.splice(shotIndex, 1);
          continue;
        }

        for (const target of current.targets) {
          if (target.resolved || Math.abs(shot.x - target.x) > 136 || Math.abs(shot.y - target.y) > 74) continue;
          target.resolved = true;
          current.projectiles.splice(shotIndex, 1);
          current.effects.push({
            id: `${time}-${shot.id}`,
            x: target.x,
            y: target.y,
            correct: target.correct,
            expiresAt: time + 520,
          });
          if (target.correct) {
            current.score = Math.min(MISSIONS_SCORE_LIMIT, current.score + 100);
            current.correctAnswers = Math.min(INTERVIEW_WAVES.length, current.correctAnswers + 1);
            setScore(current.score);
            setCorrectAnswers(current.correctAnswers);
            setTargets(current.targets.map((entry) => ({ ...entry })));
            setFeedback({
              correct: true,
              explanation: INTERVIEW_WAVES[current.waveIndex].explanation,
              explanationEs: INTERVIEW_WAVES[current.waveIndex].explanationEs,
              waveScore: current.score,
              waveErrors: current.waveErrors,
            });
            changeStage("wave-feedback");
            waveFinished = true;
          } else {
            current.score = Math.max(0, current.score - 25);
            current.errors += 1;
            current.waveErrors += 1;
            setScore(current.score);
            setErrors(current.errors);
            setFeedback({
              correct: false,
              answer: target.id,
              explanation: target.feedback,
              explanationEs: target.feedbackEs,
            });
            current.targets = current.targets.filter((entry) => entry.id !== target.id);
          }
          break;
        }
        if (waveFinished) break;
      }

      current.effects = current.effects.filter((effect) => effect.expiresAt > time);
      setPlayer({ ...current.player });
      setTargets(current.targets.map((target) => ({ ...target })));
      setProjectiles(current.projectiles.map((shot) => ({ ...shot })));
      setEffects(current.effects.map((effect) => ({ ...effect })));
      if (stageRef.current === "active") animationFrame = requestAnimationFrame(tick);
    };
    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [stage]);

  function updateAim(event) {
    const arena = arenaRef.current;
    if (!arena) return null;
    const rect = arena.getBoundingClientRect();
    const position = {
      x: Math.max(0, Math.min(ARENA_WIDTH, ((event.clientX - rect.left) / rect.width) * ARENA_WIDTH)),
      y: Math.max(0, Math.min(ARENA_HEIGHT, ((event.clientY - rect.top) / rect.height) * ARENA_HEIGHT)),
    };
    const horizontalAim = position.x - gameRef.current.player.x;
    if (horizontalAim !== 0) setPlayerFacing(horizontalAim > 0 ? "right" : "left");
    return position;
  }

  function shoot(event) {
    if (event.button !== 0 || stageRef.current !== "active") return;
    const target = updateAim(event);
    if (!target) return;
    const current = gameRef.current;
    const now = performance.now();
    if (now - current.lastShotAt < 140) return;
    current.lastShotAt = now;
    current.attackAnimationUntil = now + 440;
    const dx = target.x - current.player.x;
    const dy = target.y - current.player.y;
    const length = Math.hypot(dx, dy);
    if (!length) return;
    current.projectiles.push({
      id: current.nextShotId++,
      x: current.player.x,
      y: current.player.y,
      vx: dx / length * 760,
      vy: dy / length * 760,
    });
  }

  const projectileSprite = BATTLE_CHARACTERS[battleCharacter].projectile;

  function downloadCertificate() {
    if (!certificateUrl || stage !== "completed") return;
    const link = document.createElement("a");
    const safeName = character.name.trim().replace(/[^\w-]+/g, "-").replace(/^-|-$/g, "") || "player";
    link.download = `job-quest-interview-battle-certificate-${safeName}.png`;
    link.href = certificateUrl;
    link.click();
  }

  const cardStyle = {
    width: "min(980px, 100%)",
    padding: "clamp(18px, 4vw, 36px)",
    border: "2px solid #8DB4FF",
    borderRadius: 18,
    background: "rgba(10,20,42,.96)",
    boxShadow: "0 12px 32px rgba(0,0,0,.34)",
  };
  const instructionText = spanish
    ? "Movete con WASD o las flechas, apuntá con el mouse y hacé clic para disparar. Alcanzá la respuesta correcta para avanzar. Las opciones incorrectas restan 25 puntos, pero la oleada continúa."
    : "Move with WASD or the arrow keys, aim with the mouse, and click to shoot. Hit the correct answer to advance. Incorrect options subtract 25 points, but the wave continues.";

  return (
    <main style={{
      width: "min(1220px, calc(100vw - 24px))",
      margin: "16px auto",
      padding: "clamp(14px, 3vw, 28px)",
      borderRadius: 20,
      color: "#F5F5F5",
      background: "linear-gradient(145deg, #10163A, #17254a 55%, #0d1832)",
      boxShadow: "0 14px 38px rgba(0,0,0,.35)",
      fontFamily: "'Inter', sans-serif",
    }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
        <div>
          <strong style={{ color: "#C6F135", letterSpacing: 1 }}>JOB QUEST · MAP 4</strong>
          <h1 style={{ margin: "4px 0", fontFamily: "'Baloo 2', sans-serif", fontSize: "clamp(22px, 4vw, 34px)" }}>
            FINAL MISSION — THE INTERVIEW BATTLE
          </h1>
        </div>
        <span style={{ fontSize: 36 }} aria-hidden="true">💼</span>
      </header>
      <audio
        ref={audioRef}
        src={`${import.meta.env.BASE_URL}final-mission/interview-battle-theme.mp3`}
        loop
        preload="auto"
      />
      {audioError && <p role="alert" style={{ color: "#FF8FB1" }}>{audioError}</p>}

      {(stage === "character-select" || stage === "intro" || stage === "briefing") && (
        <section style={{ ...cardStyle, margin: "auto" }}>
          {stage === "character-select" ? (
            <>
              <h2 style={{ color: "#C6F135", textAlign: "center" }}>
                {spanish ? "Elegí tu personaje para la batalla" : "Choose your battle character"}
              </h2>
              <p style={{ textAlign: "center", color: "#C9CFEA" }}>
                {spanish
                  ? `Elegí quién te va a representar en la misión, ${character.name}.`
                  : `Choose who will represent you in the mission, ${character.name}.`}
              </p>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 250px), 1fr))",
                gap: 16,
                maxWidth: 720,
                margin: "20px auto",
              }}>
                {Object.entries(BATTLE_CHARACTERS).map(([id, option]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={battleCharacter === id}
                    onClick={() => setBattleCharacter(id)}
                    style={{
                      overflow: "hidden",
                      padding: 8,
                      border: `3px solid ${battleCharacter === id ? "#C6F135" : "#8DB4FF"}`,
                      borderRadius: 16,
                      background: battleCharacter === id ? "rgba(198,241,53,.1)" : "rgba(141,180,255,.08)",
                      color: "#F5F5F5",
                      fontFamily: "'Baloo 2', sans-serif",
                      fontSize: 20,
                      fontWeight: 800,
                      cursor: "pointer",
                      boxShadow: battleCharacter === id ? "0 0 20px rgba(198,241,53,.25)" : "none",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        display: "block",
                        width: "min(100%, 250px)",
                        height: 300,
                        margin: "0 auto",
                        borderRadius: 10,
                        backgroundImage: `url("${option.showcaseImage}")`,
                        backgroundRepeat: "no-repeat",
                        backgroundSize: "contain",
                        backgroundPosition: "center",
                      }}
                    />
                    <span style={{ display: "block", padding: "8px 4px 4px" }}>
                      {spanish ? option.labelEs : option.labelEn}
                    </span>
                  </button>
                ))}
              </div>
              <div style={{ textAlign: "center" }}>
                <MissionButton onClick={() => changeStage("intro")}>
                  {spanish ? "Confirmar personaje" : "Confirm character"}
                </MissionButton>
              </div>
            </>
          ) : stage === "intro" ? (
            <>
              <h2 style={{ color: "#C6F135" }}>{spanish ? "¡La entrevista final!" : "The final interview!"}</h2>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
                <BattleCharacterSprite
                  characterId={battleCharacter}
                  action="idle"
                  frame={0}
                  name={spanish ? BATTLE_CHARACTERS[battleCharacter].labelEs : BATTLE_CHARACTERS[battleCharacter].labelEn}
                  width={78}
                  height={112}
                />
                <p style={{ lineHeight: 1.6, flex: "1 1 260px" }}>{character.name}, {instructionText}</p>
              </div>
              <MissionButton color="#8DB4FF" onClick={() => changeStage("character-select")}>
                {spanish ? "Cambiar personaje" : "Change character"}
              </MissionButton>
              <p style={{ lineHeight: 1.6 }}>
                {spanish
                  ? "Superá tres oleadas. Cada una presenta una pregunta en inglés y en español, con tres respuestas móviles."
                  : "Complete three waves. Each one presents a question in English and Spanish, with three moving answers."}
              </p>
              <p style={{ color: "#C9CFEA" }}>
                {spanish
                  ? "Cada acierto suma 100 puntos. Cada respuesta equivocada alcanzada resta 25. Puntaje máximo: 300."
                  : "Each correct answer adds 100 points. Each incorrect answer hit subtracts 25. Maximum score: 300."}
              </p>
              <MissionButton onClick={() => resetMission()}>{spanish ? "Comenzar misión" : "Start mission"}</MissionButton>
            </>
          ) : (
            <>
              <p style={{ color: "#C9CFEA", fontWeight: 700 }}>
                {spanish ? "👩‍💼 ENTREVISTADORA" : "👩‍💼 INTERVIEWER"}
              </p>
              <p style={{ color: "#8DB4FF", fontWeight: 700 }}>
                {spanish ? `OLEADA ${waveIndex + 1} DE 3 · ${wave.title}` : `WAVE ${waveIndex + 1} OF 3 · ${wave.title}`}
              </p>
              <h2 style={{ color: "#C6F135" }}>{wave.question}</h2>
              <p style={{ fontSize: 18 }}>{wave.questionEs}</p>
              <p style={{ color: "#C9CFEA" }}>
                {spanish ? "Leé la pregunta y su traducción antes de iniciar la oleada." : "Read the question and its translation before starting the wave."}
              </p>
              <MissionButton onClick={beginWave}>{spanish ? "Comenzar oleada" : "Start wave"}</MissionButton>
            </>
          )}
        </section>
      )}

      {(stage === "active" || stage === "paused" || stage === "wave-feedback") && (
        <>
          <section style={{ ...cardStyle, width: "100%", padding: 16, marginBottom: 14 }}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8, color: "#C9CFEA" }}>
              <strong>{spanish ? `OLEADA ${waveIndex + 1} / 3` : `WAVE ${waveIndex + 1} / 3`}</strong>
              <strong>{spanish ? `PUNTAJE ${score} / 300` : `SCORE ${score} / 300`}</strong>
              <strong>{spanish ? `ACIERTOS ${correctAnswers} / 3` : `CORRECT ${correctAnswers} / 3`}</strong>
              <span>{spanish ? `ERRORES ${errors}` : `INCORRECT ${errors}`}</span>
            </div>
            <p style={{ margin: "12px 0 0", color: "#8DB4FF", fontWeight: 700 }}>
              {spanish ? "👩‍💼 ENTREVISTADORA · " : "👩‍💼 INTERVIEWER · "}{wave.title}
            </p>
            <h2 style={{ margin: "4px 0", color: "#F5F5F5", fontSize: "clamp(17px, 2.4vw, 24px)" }}>{wave.question}</h2>
            <p style={{ margin: 0, color: "#C9CFEA" }}>{wave.questionEs}</p>
          </section>

          {stage === "active" && feedback && !feedback.correct && (
            <div role="status" aria-live="polite" style={{ ...cardStyle, width: "100%", padding: 13, marginBottom: 12, borderColor: "#FF8FB1" }}>
              <strong>Not quite! Think carefully and try again.</strong>
              <div>¡No del todo! Pensá con atención e intentá de nuevo.</div>
              <div style={{ marginTop: 5 }}>{feedback.explanation}</div>
              <div>{feedback.explanationEs}</div>
            </div>
          )}

          <div
            ref={arenaRef}
            onPointerMove={updateAim}
            onPointerDown={shoot}
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "16 / 9",
              minHeight: 300,
              maxHeight: 560,
              overflow: "hidden",
              border: "2px solid #8DB4FF",
              borderRadius: 16,
              backgroundImage: `url("${BATTLE_BACKGROUND_URL}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              cursor: stage === "active" ? "crosshair" : "default",
              touchAction: "none",
              userSelect: "none",
            }}
          >
            {[1, 2].map((index) => (
              <div key={index} style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: `${index * 33.33}%`,
                borderTop: "1px dashed rgba(141,180,255,.2)",
              }} />
            ))}
            {targets.filter((target) => !target.resolved).map((target) => (
              <TargetCard key={target.id} target={target} />
            ))}
            {projectiles.map((shot) => (
              <span key={shot.id} aria-hidden="true" style={{
                position: "absolute",
                left: `${(shot.x / ARENA_WIDTH) * 100}%`,
                top: `${(shot.y / ARENA_HEIGHT) * 100}%`,
                width: 100,
                height: 124,
                transform: `translate(-50%, -50%) rotate(${Math.atan2(shot.vy, shot.vx)}rad)`,
                zIndex: 4,
                backgroundImage: `url("${CHARACTER_SPRITES_URL}")`,
                backgroundPosition: `-${projectileSprite.x}px -${projectileSprite.y}px`,
                backgroundRepeat: "no-repeat",
                pointerEvents: "none",
              }} />
            ))}
            {effects.map((effect) => (
              <span key={effect.id} aria-hidden="true" style={{
                position: "absolute",
                left: `${(effect.x / ARENA_WIDTH) * 100}%`,
                top: `${(effect.y / ARENA_HEIGHT) * 100}%`,
                transform: "translate(-50%, -50%)",
                width: 76,
                height: 76,
                border: `4px solid ${effect.correct ? "#C6F135" : "#FF8FB1"}`,
                borderRadius: "50%",
                boxShadow: `0 0 22px ${effect.correct ? "#C6F135" : "#FF8FB1"}`,
                pointerEvents: "none",
              }} />
            ))}
            <BattleCharacterSprite
              characterId={battleCharacter}
              action={playerAction}
              frame={spriteFrame}
              name={`${character.name} · ${spanish ? BATTLE_CHARACTERS[battleCharacter].labelEs : BATTLE_CHARACTERS[battleCharacter].labelEn}`}
              width={104}
              height={140}
              style={{
                position: "absolute",
                left: `${(player.x / ARENA_WIDTH) * 100}%`,
                top: `${(player.y / ARENA_HEIGHT) * 100}%`,
                transform: `translate(-50%, -50%) scaleX(${playerFacing === "left" ? -1 : 1})`,
                zIndex: 5,
              }}
            />
            {stage === "paused" && (
              <div style={{ position: "absolute", inset: 0, zIndex: 10, display: "grid", placeItems: "center", background: "rgba(5,10,28,.8)" }}>
                <MissionButton onClick={() => changeStage("active")}>{spanish ? "Reanudar" : "Resume"}</MissionButton>
              </div>
            )}
            {stage === "wave-feedback" && feedback?.correct && (
              <div role="status" style={{ position: "absolute", inset: 0, zIndex: 10, display: "grid", placeItems: "center", padding: 18, background: "rgba(5,10,28,.88)" }}>
                <div style={{ ...cardStyle, maxWidth: 650, textAlign: "center" }}>
                  <h2 style={{ color: "#C6F135" }}>Excellent! That's the right answer!</h2>
                  <h3>¡Excelente! ¡Esa es la respuesta correcta!</h3>
                  <p>{feedback.explanation}</p>
                  <p>{feedback.explanationEs}</p>
                  <p style={{ color: "#C9CFEA" }}>
                    {spanish
                      ? `Resumen de oleada: +100 puntos · ${feedback.waveErrors} respuestas incorrectas · total ${feedback.waveScore} / 300`
                      : `Wave summary: +100 points · ${feedback.waveErrors} incorrect answers · total ${feedback.waveScore} / 300`}
                  </p>
                  <MissionButton onClick={advanceWave}>
                    {waveIndex === 2
                      ? (spanish ? "Ver resultados y certificado" : "View results and certificate")
                      : (spanish ? "Continuar a la siguiente oleada" : "Continue to next wave")}
                  </MissionButton>
                </div>
              </div>
            )}
          </div>
          {stage === "active" && audioError && (
            <p role="alert" style={{ color: "#FF8FB1" }}>{audioError}</p>
          )}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
            <span style={{ color: "#C9CFEA", fontSize: 13 }}>
              {spanish ? "WASD / flechas: moverse · Mouse: apuntar · Clic izquierdo: disparar · Esc: pausar" : "WASD / arrows: move · Mouse: aim · Left click: shoot · Esc: pause"}
            </span>
            {stage === "active" && (
              <MissionButton color="#8DB4FF" onClick={() => changeStage("paused")}>
                {spanish ? "Pausar" : "Pause"}
              </MissionButton>
            )}
          </div>
        </>
      )}

      {stage === "completed" && (
        <section style={{ ...cardStyle, margin: "auto", textAlign: "center" }}>
          <h2 style={{ color: "#C6F135" }}>{spanish ? "¡MISIÓN COMPLETADA!" : "MISSION COMPLETED!"}</h2>
          <p>
            Congratulations! You completed the interview challenges and demonstrated your knowledge of professional behavior and workplace responsibility.
          </p>
          <p>
            ¡Felicitaciones! Completaste los desafíos de la entrevista y demostraste tus conocimientos sobre el comportamiento profesional y la responsabilidad laboral.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap", margin: "18px 0", fontSize: 20 }}>
            <strong>{spanish ? `Puntaje final: ${score} / 300` : `Final score: ${score} / 300`}</strong>
            <strong>{spanish ? `Respuestas correctas: ${correctAnswers} / 3` : `Correct answers: ${correctAnswers} / 3`}</strong>
          </div>
          {certificateUrl ? (
            <img
              src={certificateUrl}
              alt="JOB QUEST Certificate of Achievement — The Interview Battle"
              style={{ display: "block", width: "100%", height: "auto", borderRadius: 10, margin: "16px auto", boxShadow: "0 8px 24px rgba(0,0,0,.3)" }}
            />
          ) : (
            <p role="status">{spanish ? "Preparando certificado..." : "Preparing certificate..."}</p>
          )}
          {certificateError && <p role="alert" style={{ color: "#FF8FB1" }}>{certificateError}</p>}
          <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
            <MissionButton disabled={!certificateUrl} onClick={downloadCertificate}>
              {spanish ? "Descargar certificado PNG" : "Download certificate PNG"}
            </MissionButton>
            <MissionButton color="#8DB4FF" onClick={() => resetMission()}>
              {spanish ? "Jugar de nuevo" : "Play again"}
            </MissionButton>
            <MissionButton color="#8DB4FF" onClick={() => resetMission(true)}>
              {spanish ? "Elegir otro personaje" : "Choose another character"}
            </MissionButton>
            <MissionButton color="#8DB4FF" onClick={() => onComplete(3)}>
              {spanish ? "Volver al mapa" : "Return to map"}
            </MissionButton>
          </div>
        </section>
      )}
    </main>
  );
}
