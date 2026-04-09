"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { navigateBackWithinApp } from "../../lib/navigation";

import { formatHandedness, getStoredHandedness } from "../../lib/userPreferences";
import PinballNameInput from "./PinballNameInput";
import ClassroomCameraCard from "./ClassroomCameraCard";
import RoomShell from "./RoomShell";
import styles from "./TiltLabScreen.module.css";

const NAV_ITEMS = [
  { label: "Account", href: "/account", icon: "O" },
  { label: "Analytics", href: "/analytics", icon: "|" },
  { label: "PinMap", href: "/pinmap", icon: "*" },
  { label: "Home", href: "/", icon: "#" },
  { label: "Classroom", href: "/classroom", icon: "=" },
];

const SKILL_LEVELS = [
  { label: "Beginner", subtitle: "New to tilt control" },
  { label: "Intermediate", subtitle: "Building consistency" },
  { label: "Advanced", subtitle: "Refining technique" },
  { label: "Tournament", subtitle: "High-level play" },
];

const LESSONS = [
  { id: 1, title: "What Causes Tilt", description: "Understand the leading causes of tilt.", tier: "Beginner", progress: 100 },
  { id: 2, title: "Reading Tilt Warnings", description: "Learn to recognize and react to warnings.", tier: "Beginner", progress: 100 },
  { id: 3, title: "Controlled Nudging", description: "Practice safe, effective nudging techniques.", tier: "Beginner", progress: 40 },
  { id: 4, title: "Basic Recovery", description: "Reset control after danger moments.", tier: "Beginner", progress: 0 },
  { id: 5, title: "Dead Bounce Training", description: "Improve outcomes on tricky danger saves.", tier: "Intermediate", progress: 0 },
  { id: 6, title: "Bounce Pass Timing", description: "Use soft movement to transfer the ball.", tier: "Intermediate", progress: 0 },
  { id: 7, title: "Warning Management", description: "Use warnings wisely during longer balls.", tier: "Intermediate", progress: 0 },
  { id: 8, title: "Advanced Nudging", description: "Stay calm and consistent under pressure.", tier: "Advanced", progress: 0 },
  { id: 9, title: "Live Catch Recovery", description: "Stabilize dangerous returns quickly.", tier: "Advanced", progress: 0 },
  { id: 10, title: "Outlane Save Planning", description: "Read the ball path before the save window closes.", tier: "Advanced", progress: 0 },
  { id: 11, title: "Tournament Tilt Strategy", description: "Manage risk in higher-stakes play.", tier: "Tournament", progress: 0 },
  { id: 12, title: "Pressure Ball Discipline", description: "Control decision-making when the match is tight.", tier: "Tournament", progress: 0 },
];

const RECENTLY_VIEWED_GAMES = [
  "Godzilla (Stern)",
  "Jurassic Park (Stern)",
  "JAWS (Stern)",
  "Foo Fighters (Stern)",
  "Venom (Stern)",
];

const RECENT_SESSION_GAMES = [
  "Deadpool (Stern)",
  "Iron Maiden (Stern)",
  "Attack From Mars (Remake)",
  "The Addams Family (Bally)",
  "Star Trek: The Next Generation (Williams)",
];

const DEFAULT_MOTION_SUPPORT = {
  checked: false,
  secureContext: false,
  motionAvailable: false,
  motionPermissionRequired: false,
};

const DISPLAY_ALPHA = 0.72;
const FILTER_ALPHA = 0.88;
function formatAxis(value) {
  return Number(value ?? 0).toFixed(2);
}

function smoothAxis(previous, next) {
  return DISPLAY_ALPHA * previous + (1 - DISPLAY_ALPHA) * next;
}

function getTrainerBand(magnitude) {
  if (magnitude < 0.45) {
    return {
      label: "Settled",
      cue: "Phone is steady. Start with a short sideways nudge.",
      tone: "idle",
      fillPercent: 10,
    };
  }

  if (magnitude < 1.4) {
    return {
      label: "Too light",
      cue: "Add a little more force. You want a clean, decisive shove.",
      tone: "light",
      fillPercent: 28 + magnitude * 12,
    };
  }

  if (magnitude < 3.2) {
    return {
      label: "Controlled",
      cue: "Good range. This is the kind of nudge you want to repeat.",
      tone: "controlled",
      fillPercent: 52 + (magnitude - 1.4) * 12,
    };
  }

  return {
    label: "Too hard",
    cue: "Back off. This would push you toward warnings too quickly.",
    tone: "hard",
    fillPercent: 82 + Math.min(18, (magnitude - 3.2) * 8),
  };
}

export default function TiltLabScreen() {
  const router = useRouter();
  const lessonsListRef = useRef(null);
  const motionHandlerRef = useRef(null);
  const calibrationPeakRef = useRef({ x: 0, y: 0 });
  const calibrationTimerRef = useRef(null);
  const gravityRef = useRef({ x: 0, y: 0, z: 0 });
  const smoothedFilteredRef = useRef({ x: 0, y: 0, z: 0 });
  const peakResetRef = useRef(null);
  const [skillLevel, setSkillLevel] = useState("Beginner");
  const [gameName, setGameName] = useState("");
  const [gamePicker, setGamePicker] = useState("");
  const [handedness, setHandedness] = useState("");
  const [motionSupport, setMotionSupport] = useState(DEFAULT_MOTION_SUPPORT);
  const [motionPermission, setMotionPermission] = useState("not requested");
  const [motionStatus, setMotionStatus] = useState("Enable motion and rehearse short side nudges.");
  const [lateralAxis, setLateralAxis] = useState("x");
  const [calibrationStatus, setCalibrationStatus] = useState("Not calibrated.");
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [motionSignal, setMotionSignal] = useState({
    x: "0.00",
    y: "0.00",
    z: "0.00",
    peak: "0.00",
    strength: "0.00",
    direction: "centered",
    source: "none",
  });

  const progressPercent = 40;
  const unlockedTierIndex = useMemo(() => SKILL_LEVELS.findIndex((level) => level.label === skillLevel), [skillLevel]);
  const firstLessonForSkill = useMemo(() => LESSONS.find((lesson) => lesson.tier === skillLevel)?.id ?? 1, [skillLevel]);
  const visibleLessons = useMemo(() => {
    return LESSONS.map((lesson) => {
      const tierIndex = SKILL_LEVELS.findIndex((level) => level.label === lesson.tier);
      const isUnlocked = tierIndex <= unlockedTierIndex;
      if (lesson.progress >= 100) {
        return { ...lesson, state: "completed", statusLabel: "Completed" };
      }
      if (lesson.progress > 0) {
        return { ...lesson, state: "progress", statusLabel: `${lesson.progress}%` };
      }
      if (isUnlocked) {
        return { ...lesson, state: "available", statusLabel: "Ready" };
      }
      return { ...lesson, state: "locked", statusLabel: "Locked" };
    });
  }, [unlockedTierIndex]);
  const nextLessonNumber = useMemo(() => visibleLessons.find((lesson) => lesson.state === "progress" || lesson.state === "available")?.id ?? 1, [visibleLessons]);

  const currentMagnitude = Number(motionSignal.strength ?? "0.00");
  const trainerBand = getTrainerBand(currentMagnitude);
  const meterDirectionClass =
    motionSignal.direction === "left"
      ? styles.trainerMeterFillLeft
      : motionSignal.direction === "right"
        ? styles.trainerMeterFillRight
        : styles.trainerMeterFillCentered;

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const motionCtor = window.DeviceMotionEvent;
    const storedHandedness = getStoredHandedness();

    setHandedness(storedHandedness);
    setMotionSupport({
      checked: true,
      secureContext: window.isSecureContext,
      motionAvailable: typeof motionCtor !== "undefined" || "ondevicemotion" in window,
      motionPermissionRequired: typeof motionCtor?.requestPermission === "function",
    });

    return () => {
      if (motionHandlerRef.current) {
        window.removeEventListener("devicemotion", motionHandlerRef.current);
      }
      if (peakResetRef.current) {
        window.clearTimeout(peakResetRef.current);
      }
      if (calibrationTimerRef.current) {
        window.clearTimeout(calibrationTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!lessonsListRef.current) {
      return;
    }

    const list = lessonsListRef.current;
    const target = list.querySelector(`[data-lesson-id="${firstLessonForSkill}"]`);
    if (!target) {
      return;
    }

    list.scrollTop = Math.max(0, target.offsetTop - list.offsetTop);
  }, [firstLessonForSkill]);

  function handleBack() {
    navigateBackWithinApp(router, "/classroom");
  }

  function stopMotionTrainer() {
    if (typeof window !== "undefined" && motionHandlerRef.current) {
      window.removeEventListener("devicemotion", motionHandlerRef.current);
      motionHandlerRef.current = null;
    }
    if (typeof window !== "undefined" && peakResetRef.current) {
      window.clearTimeout(peakResetRef.current);
      peakResetRef.current = null;
    }
    gravityRef.current = { x: 0, y: 0, z: 0 };
    smoothedFilteredRef.current = { x: 0, y: 0, z: 0 };
    calibrationPeakRef.current = { x: 0, y: 0 };
    setIsCalibrating(false);
    setMotionSignal({
      x: "0.00",
      y: "0.00",
      z: "0.00",
      peak: "0.00",
      strength: "0.00",
      direction: "centered",
      source: "none",
    });
  }

  async function enableMotionTrainer() {
    if (typeof window === "undefined") {
      return;
    }

    if (!window.isSecureContext) {
      setMotionPermission("blocked by insecure context");
      setMotionStatus("Motion access requires https or localhost.");
      return;
    }

    const motionCtor = window.DeviceMotionEvent;
    if (!(typeof motionCtor !== "undefined" || "ondevicemotion" in window)) {
      setMotionStatus("This browser is not exposing motion data.");
      return;
    }

    try {
      if (typeof motionCtor?.requestPermission === "function") {
        setMotionPermission("requesting");
        const result = await motionCtor.requestPermission();
        setMotionPermission(result);
        if (result !== "granted") {
          setMotionStatus("Motion permission was denied.");
          return;
        }
      } else {
        setMotionPermission("not required");
      }

      if (motionHandlerRef.current) {
        setMotionStatus("Motion trainer already active. Practice another nudge.");
        return;
      }

      const handleMotion = (event) => {
        const rawAcc = event.accelerationIncludingGravity || event.acceleration || {};
        const linearAcc = event.acceleration;
        const rawX = Number(rawAcc.x ?? 0);
        const rawY = Number(rawAcc.y ?? 0);
        const rawZ = Number(rawAcc.z ?? 0);

        let filteredX = 0;
        let filteredY = 0;
        let filteredZ = 0;
        let source = "gravity filtered";

        if (
          linearAcc &&
          typeof linearAcc.x === "number" &&
          typeof linearAcc.y === "number" &&
          typeof linearAcc.z === "number"
        ) {
          filteredX = Number(linearAcc.x ?? 0);
          filteredY = Number(linearAcc.y ?? 0);
          filteredZ = Number(linearAcc.z ?? 0);
          source = "linear acceleration";
        } else {
          gravityRef.current = {
            x: FILTER_ALPHA * gravityRef.current.x + (1 - FILTER_ALPHA) * rawX,
            y: FILTER_ALPHA * gravityRef.current.y + (1 - FILTER_ALPHA) * rawY,
            z: FILTER_ALPHA * gravityRef.current.z + (1 - FILTER_ALPHA) * rawZ,
          };
          filteredX = rawX - gravityRef.current.x;
          filteredY = rawY - gravityRef.current.y;
          filteredZ = rawZ - gravityRef.current.z;
        }

        smoothedFilteredRef.current = {
          x: smoothAxis(smoothedFilteredRef.current.x, filteredX),
          y: smoothAxis(smoothedFilteredRef.current.y, filteredY),
          z: smoothAxis(smoothedFilteredRef.current.z, filteredZ),
        };

        if (isCalibrating) {
          calibrationPeakRef.current = {
            x: Math.max(calibrationPeakRef.current.x, Math.abs(smoothedFilteredRef.current.x)),
            y: Math.max(calibrationPeakRef.current.y, Math.abs(smoothedFilteredRef.current.y)),
          };
        }

        const lateral = lateralAxis === "y" ? smoothedFilteredRef.current.y : smoothedFilteredRef.current.x;
        const vertical = smoothedFilteredRef.current.z;
        const lateralMagnitude = Math.abs(lateral);
        const combinedStrength = Math.sqrt(lateralMagnitude ** 2 + Math.abs(vertical) ** 2);
        const direction = lateralMagnitude < 0.25 ? "centered" : lateral > 0 ? "right" : "left";

        setMotionSignal((current) => ({
          x: formatAxis(smoothedFilteredRef.current.x),
          y: formatAxis(smoothedFilteredRef.current.y),
          z: formatAxis(smoothedFilteredRef.current.z),
          peak: formatAxis(Math.max(Math.abs(Number(current.peak)), combinedStrength)),
          strength: formatAxis(combinedStrength),
          direction,
          source,
        }));

        setMotionStatus(
          lateralMagnitude < 0.25
            ? `Phone is settled. Rehearse a short sideways nudge on ${lateralAxis.toUpperCase()} with controlled Z movement.`
            : `Detected a ${direction} nudge on ${lateralAxis.toUpperCase()}. Side strength now includes Z movement.`
        );

        if (peakResetRef.current) {
          window.clearTimeout(peakResetRef.current);
        }
        peakResetRef.current = window.setTimeout(() => {
          setMotionSignal((current) => ({ ...current, peak: "0.00", strength: "0.00" }));
        }, 900);
      };

      motionHandlerRef.current = handleMotion;
      window.addEventListener("devicemotion", handleMotion);
      setMotionStatus("Motion trainer active. Give the phone a short left or right nudge.");
    } catch (error) {
      setMotionPermission("error");
      setMotionStatus(error instanceof Error ? error.message : "Unable to start motion trainer.");
    }
  }

  function calibratePlacement() {
    if (!motionHandlerRef.current) {
      setCalibrationStatus("Enable motion first.");
      return;
    }

    calibrationPeakRef.current = { x: 0, y: 0 };
    setIsCalibrating(true);
    setCalibrationStatus("Give one short left-right nudge now.");
    setMotionStatus("Calibration running. Give one short left-right nudge.");

    if (calibrationTimerRef.current) {
      window.clearTimeout(calibrationTimerRef.current);
    }

    calibrationTimerRef.current = window.setTimeout(() => {
      const nextAxis = calibrationPeakRef.current.y > calibrationPeakRef.current.x ? "y" : "x";
      setLateralAxis(nextAxis);
      setIsCalibrating(false);
      setCalibrationStatus(`Calibrated to ${nextAxis.toUpperCase()} using peaks X ${calibrationPeakRef.current.x.toFixed(2)} / Y ${calibrationPeakRef.current.y.toFixed(2)}.`);
      setMotionStatus(`Calibration complete. Tilt Lab is reading left-right nudges from ${nextAxis.toUpperCase()}.`);
    }, 2200);
  }

  return (
    <RoomShell
      title="Tilt Lab"
      onBack={handleBack}
      navItems={NAV_ITEMS}
      onNavigate={(href) => router.push(href)}
      activeNavLabel="Classroom"
      shellClassName={styles.phoneShell}
      topBarClassName={styles.topBar}
      backButtonClassName={styles.backButton}
      titleClassName={styles.headerTitle}
      bottomNavClassName={styles.bottomNav}
      navItemClassName={styles.navItem}
      navItemActiveClassName={styles.navItemActive}
      navIconClassName={styles.navIcon}
    >

        <main className={styles.content}>
          <section className={styles.heroCard}>
            <div className={styles.heroArt}>
              <Image src="/tilt-lab/flipcoach-hero.png" alt="Tilt Lab" fill sizes="120px" style={{ objectFit: "contain", objectPosition: "left top" }} />
            </div>

            <div className={styles.heroContent}>
              <div className={styles.heroTitle}>Tilt Lab</div>
              <div className={styles.heroSubtitle}>Control Training</div>
              <div className={styles.heroMessage}>Master tilt control, improve consistency, and rehearse legal nudging with live motion feedback.</div>
            </div>

            <div className={styles.heroBubble}>{handedness ? `Welcome back. ${formatHandedness(handedness)} profile loaded for training.` : "Set your handedness before training so the motion cues stay consistent."}</div>
            <div className={styles.lessonRow}>
              <span className={styles.lessonText}>Current Lesson: Controlled Nudging</span>
              <span className={styles.lessonPercent}>{progressPercent}% Complete</span>
            </div>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} />
            </div>
          </section>


          <section className={styles.sectionCard}>
            <div className={styles.sectionHeading}>Select Your Tilt Control Skill Level</div>
            <div className={styles.skillGrid}>
              {SKILL_LEVELS.map((level) => {
                const isActive = level.label === skillLevel;
                return (
                  <button
                    key={level.label}
                    type="button"
                    className={`${styles.skillCard} ${isActive ? styles.skillCardActive : ""}`}
                    onClick={() => setSkillLevel(level.label)}
                  >
                    <div className={styles.skillLabelRow}>
                      <span>{level.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className={styles.skillDescription}>
              {SKILL_LEVELS.find((level) => level.label === skillLevel)?.subtitle}
            </div>
          </section>

          <div><ClassroomCameraCard storageKey="flipperiq-classroom-camera-tilt-lab" title="Tilt Lab Photo Reference" hint="Capture phone placement, machine angle, or a tilt warning setup before you train." /></div>

          <section className={`${styles.sectionCard} ${styles.gameSection}`}>
            <div className={styles.sectionHeading}>Choose Your Game</div>
            <div className={styles.gameInputAreaFull}>
              <div className={styles.gameInputShell}>
                {!gameName.trim() ? (
                  <div className={styles.gameInputOverlay} aria-hidden="true">
                    <span>Enter Game Name <em>Optional</em></span>
                  </div>
                ) : null}
                <PinballNameInput
                  id="tilt-lab-game-name"
                  value={gameName}
                  onValueChange={setGameName}
                  placeholder=""
                  actionLabel="Use game name"
                  className={styles.gameNameField}
                />
              </div>
              <div className={styles.gameActionRow}>
                <button
                  type="button"
                  className={styles.gameActionButton}
                  onClick={() => setGamePicker((current) => current === "viewed" ? "" : "viewed")}
                >
                  Recently Viewed
                </button>
                <button
                  type="button"
                  className={styles.gameActionButton}
                  onClick={() => setGamePicker((current) => current === "sessions" ? "" : "sessions")}
                >
                  Sessions
                </button>
                <button
                  type="button"
                  className={styles.gameActionButton}
                  onClick={() => {
                    setGameName("");
                    setGamePicker("");
                  }}
                >
                  Clear
                </button>
              </div>
              {gamePicker ? (
                <div className={styles.gamePickerPopover}>
                  <div className={styles.gamePickerTitle}>
                    {gamePicker === "viewed" ? "Last 5 games viewed" : "Last 5 games played"}
                  </div>
                  <div className={styles.gamePickerList}>
                    {(gamePicker === "viewed" ? RECENTLY_VIEWED_GAMES : RECENT_SESSION_GAMES).map((name) => (
                      <button
                        key={name}
                        type="button"
                        className={styles.gamePickerItem}
                        onClick={() => {
                          setGameName(name);
                          setGamePicker("");
                        }}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <section className={`${styles.sectionCard} ${styles.infoSection}`}>
            <div className={styles.infoHeader}>
              <div className={styles.infoIcon}>
                <Image src="/tilt-lab/how-tilt-works-icon.png" alt="How Tilt Works" fill sizes="28px" style={{ objectFit: "contain" }} />
              </div>
              <div className={styles.sectionHeading}>How Tilt Works</div>
            </div>
            <div className={styles.infoText}>Learn how tilt mechanisms work, what causes tilt, and how to avoid costly mistakes.</div>
            <div className={styles.bulletGrid}>
              <div className={styles.bulletItem}>Tilt Bob & Warnings</div>
              <div className={styles.bulletItem}>Warning vs Tilt</div>
              <div className={styles.bulletItem}>Slam Tilt</div>
              <div className={styles.bulletItem}>Recovery Windows</div>
            </div>
          </section>

          <section className={`${styles.sectionCard} ${styles.trainerSection}`}>
            <div className={styles.trainerHeader}>
              <div>
                <div className={styles.sectionHeading}>Nudge Control Trainer</div>
                <div className={styles.trainerSubheading}>Train sideways nudges using live filtered acceleration, not tilt angle.</div>
              </div>
              <div className={`${styles.trainerBadge} ${motionSupport.secureContext && motionSupport.motionAvailable ? styles.trainerBadgeReady : styles.trainerBadgeBlocked}`}>
                {motionSupport.secureContext && motionSupport.motionAvailable ? "Live" : "Blocked"}
              </div>
            </div>

            <div className={styles.trainerControls}>
              <button type="button" className={styles.trainerButton} onClick={enableMotionTrainer}>Enable Motion</button>
              <button type="button" className={styles.trainerButtonSecondary} onClick={calibratePlacement}>Calibrate</button>
              <button type="button" className={styles.trainerButtonSecondary} onClick={stopMotionTrainer}>Reset</button>
            </div>

            <div className={styles.trainerStatusCard}>
              <div className={styles.trainerStatusLine}>{motionStatus}</div>
              <div className={styles.trainerMetaRow}>
                <span>Permission: {motionPermission}</span>
                <span>Secure: {motionSupport.secureContext ? "yes" : "no"}</span>
                <span>API: {motionSupport.checked ? (motionSupport.motionAvailable ? "available" : "missing") : "checking"}</span>
                <span>Axis: {lateralAxis.toUpperCase()}</span>
                <span>Signal: {motionSignal.source}</span>
                <span>{isCalibrating ? "Calibrating" : calibrationStatus}</span>
              </div>
            </div>

            <div className={styles.trainerMeterCard}>
              <div className={styles.trainerMeterLabels}>
                <span>Left</span>
                <span>Nudge Strength</span>
                <span>Right</span>
              </div>
              <div className={styles.trainerMeterTrack}>
                <div className={styles.trainerMeterCenterLine} />
                <div className={`${styles.trainerMeterFill} ${styles[`trainerMeterFill${trainerBand.tone[0].toUpperCase()}${trainerBand.tone.slice(1)}`]} ${meterDirectionClass}`} style={{ width: `${Math.min(100, Math.max(10, trainerBand.fillPercent))}%` }} />
              </div>
              <div className={styles.trainerReadoutRow}>
                <div className={styles.trainerReadout}>
                  <span className={styles.trainerLabel}>Direction</span>
                  <strong>{motionSignal.direction}</strong>
                </div>
                <div className={styles.trainerReadout}>
                  <span className={styles.trainerLabel}>Current {lateralAxis.toUpperCase()}</span>
                  <strong>{lateralAxis === "y" ? motionSignal.y : motionSignal.x}</strong>
                </div>
                <div className={styles.trainerReadout}>
                  <span className={styles.trainerLabel}>Side Strength</span>
                  <strong>{motionSignal.strength}</strong>
                </div>
                <div className={styles.trainerReadout}>
                  <span className={styles.trainerLabel}>Peak</span>
                  <strong>{motionSignal.peak}</strong>
                </div>
              </div>
            </div>

            <div className={styles.trainerFeedbackGrid}>
              <div className={styles.trainerFeedbackCard}>
                <span className={styles.trainerLabel}>Band</span>
                <strong>{trainerBand.label}</strong>
                <p>{trainerBand.cue}</p>
              </div>
              <div className={styles.trainerFeedbackCard}>
                <span className={styles.trainerLabel}>Filtered Axes</span>
                <strong>X {motionSignal.x}</strong>
                <p>Y {motionSignal.y} | Z {motionSignal.z}</p>
                <p>Side strength uses {lateralAxis.toUpperCase()} + Z.</p>
              </div>
            </div>
          </section>

          <section className={styles.lessonsSection}>
            <div className={styles.lessonsHeader}>
              <div className={styles.sectionHeading}>Tilt Lessons</div>
              <div className={styles.lessonCount}>{LESSONS.length} Lessons</div>
            </div>
            <div className={styles.lessonsList} ref={lessonsListRef}>
              {visibleLessons.map((lesson) => (
                <div key={lesson.id} className={styles.lessonItem} data-lesson-id={lesson.id}>
                  <div className={styles.lessonNumber}>{lesson.id}</div>
                  <div className={styles.lessonBody}>
                    <div className={styles.lessonTitle}>{lesson.title}</div>
                    <div className={styles.lessonDescription}>{lesson.description}</div>
                  </div>
                  <div className={`${styles.lessonStatus} ${styles[`lessonStatus${lesson.state[0].toUpperCase()}${lesson.state.slice(1)}`]}`}>
                    {lesson.state === "completed" ? "? " : lesson.state === "locked" ? "?? " : ""}
                    {lesson.statusLabel}
                    {lesson.state === "progress" ? " ›" : ""}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>

        <div className={styles.ctaDock}>
          <button type="button" className={styles.startButton}>
            <span className={styles.startTitle}>? Start Training</span>
            <span className={styles.startSubtitle}>Continue Lesson {nextLessonNumber} or Start a New Lesson</span>
          </button>
        </div>
    </RoomShell>
  );
}




