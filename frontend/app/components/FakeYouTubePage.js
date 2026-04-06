"use client";

import { useEffect, useRef, useState } from "react";

const SIGNATURE_CONFIG = {
  overlayStartTime: 3.0,
  startTime: 7.0,
  duration: 2.0,
  fallbackPose: {
    x: 45.75,
    y: 67.15,
    width: 18.4,
    height: 13.5,
    rotation: -11.5,
  },
  assetRotation: 90,
  opacity: 0.96,
  signatureImage: {
    offsetX: 0.8,
    offsetY: 6.8,
    scale: 0.88,
    rotation: -90,
  },
};

const RECOMMENDED_VIDEOS = [
  {
    title: "A Forgotten Close-Up Miracle From 2008",
    channel: "Magic Archive",
    views: "1.2M views",
    age: "8 years ago",
    duration: "14:18",
    accent: "linear-gradient(135deg, #311d1d, #111827 60%, #5b1f1f)",
  },
  {
    title: "The Most Impossible Signed Card Finish",
    channel: "Late Night Magic",
    views: "842K views",
    age: "3 years ago",
    duration: "9:42",
    accent: "linear-gradient(135deg, #1e293b, #3f2a56 58%, #7c2d12)",
  },
  {
    title: "He Shows Them Their Own Signature on Video",
    channel: "Sleight Sessions",
    views: "2.4M views",
    age: "1 year ago",
    duration: "12:06",
    accent: "linear-gradient(135deg, #18212d, #0f172a 55%, #374151)",
  },
  {
    title: "Classic TV Magician Reacts to Modern Card Magic",
    channel: "Prestige Rewind",
    views: "611K views",
    age: "6 months ago",
    duration: "17:54",
    accent: "linear-gradient(135deg, #3f1016, #111827 48%, #1d4ed8)",
  },
  {
    title: "Why This Old VHS Performance Still Breaks Brains",
    channel: "Mystery Cut",
    views: "390K views",
    age: "5 months ago",
    duration: "7:51",
    accent: "linear-gradient(135deg, #2b1f14, #0f172a 65%, #4b5563)",
  },
];

const COMMENTS = [
  {
    author: "Chris M",
    age: "2 years ago",
    text: "The timing on the reveal is unreal. Still one of the cleanest television performances I have seen.",
    likes: "1.8K",
  },
  {
    author: "DeckHandler",
    age: "11 months ago",
    text: "That ending lands because the card is shown so fairly before the reveal. Beautiful pacing.",
    likes: "942",
  },
  {
    author: "Mira",
    age: "4 months ago",
    text: "I paused frame by frame and still could not figure out where the turn happens.",
    likes: "603",
  },
];

function PlayGlyph({ small = false }) {
  return (
    <svg
      width={small ? 18 : 24}
      height={small ? 18 : 24}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path d="M8 6.5V17.5L18 12L8 6.5Z" fill="currentColor" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10.5 4.5a6 6 0 104.07 10.41l4.26 4.27 1.41-1.42-4.27-4.26A6 6 0 0010.5 4.5zm0 2a4 4 0 110 8 4 4 0 010-8z" fill="currentColor" />
    </svg>
  );
}

function IconMic() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 15a3 3 0 003-3V7a3 3 0 10-6 0v5a3 3 0 003 3zm5-3a5 5 0 11-10 0H5a7 7 0 006 6.92V22h2v-3.08A7 7 0 0019 12h-2z" fill="currentColor" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16v2H4V7zm0 5h16v2H4v-2zm0 5h16v2H4v-2z" fill="currentColor" />
    </svg>
  );
}

function IconCast() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 18v3h3a3 3 0 00-3-3zm0-4v2a7 7 0 017 7h2c0-5-4-9-9-9zm0-4v2c7.18 0 13 5.82 13 13h2C18 16.72 11.28 10 3 10zm16-5H5a2 2 0 00-2 2v3h2V5h14v14h-5v2h5a2 2 0 002-2V7a2 2 0 00-2-2z" fill="currentColor" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M19.14 12.94a7.48 7.48 0 000-1.88l2.03-1.58-1.92-3.32-2.39.96a7.32 7.32 0 00-1.62-.94L14.87 2h-3.74l-.37 2.18c-.57.2-1.11.5-1.62.88l-2.4-.96-1.87 3.32 1.98 1.56a7.64 7.64 0 000 1.94L4.87 14.5l1.87 3.32 2.46-.98c.49.37 1.03.66 1.59.87l.38 2.29h3.74l.37-2.25c.58-.2 1.13-.5 1.62-.88l2.43.97 1.92-3.32-2.09-1.58zM13 15.5A3.5 3.5 0 1113 8.5a3.5 3.5 0 010 7z" fill="currentColor" />
    </svg>
  );
}

function RecommendationCard({ video }) {
  return (
    <article className="recCard">
      <div className="recThumb" style={{ background: video.accent }}>
        <div className="recOverlay" />
        <div className="recDuration">{video.duration}</div>
      </div>
      <div className="recMeta">
        <h3>{video.title}</h3>
        <p>{video.channel}</p>
        <p>{video.views} | {video.age}</p>
      </div>
      <style jsx>{`
        .recCard {
          display: grid;
          grid-template-columns: 168px 1fr;
          gap: 10px;
        }

        .recThumb {
          position: relative;
          aspect-ratio: 16 / 9;
          border-radius: 12px;
          overflow: hidden;
        }

        .recOverlay {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 30% 26%, rgba(255,255,255,0.18), transparent 24%),
            linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0.42));
        }

        .recDuration {
          position: absolute;
          right: 8px;
          bottom: 8px;
          padding: 2px 6px;
          border-radius: 6px;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          font-size: 12px;
          font-weight: 600;
        }

        .recMeta h3 {
          margin: 0 0 6px;
          font-size: 14px;
          line-height: 1.35;
          font-weight: 600;
          color: #0f0f0f;
        }

        .recMeta p {
          margin: 0;
          font-size: 12px;
          color: #606060;
          line-height: 1.35;
        }
      `}</style>
    </article>
  );
}

function frameIdToSeconds(frameId) {
  const match = /^frame_(\d+)_(\d+)$/.exec(frameId);
  if (!match) {
    return null;
  }

  return Number.parseInt(match[1], 10) + Number.parseInt(match[2], 10) / 10;
}

function normalizePose(pose) {
  if (!pose || typeof pose !== "object") {
    return null;
  }

  const x = Number.parseFloat(pose.x);
  const y = Number.parseFloat(pose.y);
  const width = Number.parseFloat(pose.width);
  const height = Number.parseFloat(pose.height);
  const rotation = Number.parseFloat(pose.rotation);

  if (![x, y, width, height, rotation].every(Number.isFinite)) {
    return null;
  }

  return { x, y, width, height, rotation };
}

function getPoseAtTime(points, timeSeconds) {
  if (!points.length) {
    return null;
  }

  if (timeSeconds <= points[0].time) {
    return points[0].pose;
  }

  if (timeSeconds >= points[points.length - 1].time) {
    return points[points.length - 1].pose;
  }

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    if (timeSeconds < current.time || timeSeconds > next.time) {
      continue;
    }

    const span = next.time - current.time;
    const progress = span > 0 ? (timeSeconds - current.time) / span : 0;
    return {
      x: current.pose.x + (next.pose.x - current.pose.x) * progress,
      y: current.pose.y + (next.pose.y - current.pose.y) * progress,
      width: current.pose.width + (next.pose.width - current.pose.width) * progress,
      height: current.pose.height + (next.pose.height - current.pose.height) * progress,
      rotation: current.pose.rotation + (next.pose.rotation - current.pose.rotation) * progress,
    };
  }

  return points[0].pose;
}

export default function FakeYouTubePage() {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [showOverlayGuide, setShowOverlayGuide] = useState(false);
  const [forceReveal, setForceReveal] = useState(false);
  const [calibrationPoints, setCalibrationPoints] = useState([]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return undefined;
    }

    const handleLoadedMetadata = () => {
      setDuration(Number.isFinite(video.duration) ? video.duration : 0);
      setIsReady(true);
    };
    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCalibration() {
      try {
        const response = await fetch("/api/overlay-calibration-backup", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const payload = await response.json();
        if (cancelled || !payload?.frames || typeof payload.frames !== "object") {
          return;
        }

        const points = Object.entries(payload.frames)
          .map(([frameId, pose]) => {
            const time = frameIdToSeconds(frameId);
            const normalized = normalizePose(pose);
            if (!Number.isFinite(time) || !normalized) {
              return null;
            }

            return { frameId, time, pose: normalized };
          })
          .filter(Boolean)
          .sort((left, right) => left.time - right.time);

        setCalibrationPoints(points);
      } catch {
        if (!cancelled) {
          setCalibrationPoints([]);
        }
      }
    }

    loadCalibration();
    return () => {
      cancelled = true;
    };
  }, []);

  function formatTime(totalSeconds) {
    const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  async function togglePlayback() {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (video.paused) {
      await video.play();
      return;
    }

    video.pause();
  }

  function handleTimelineChange(event) {
    const video = videoRef.current;
    if (!video || !duration) {
      return;
    }

    const nextTime = (Number(event.target.value) / 1000) * duration;
    video.currentTime = nextTime;
    setCurrentTime(nextTime);
  }

  const progress = duration > 0 ? currentTime / duration : 0;
  const revealProgress = forceReveal
    ? 1
    : Math.max(
        0,
        Math.min(1, (currentTime - SIGNATURE_CONFIG.startTime) / SIGNATURE_CONFIG.duration)
      );
  const signatureVisible = revealProgress > 0;
  const signatureMask = `linear-gradient(90deg, rgba(0, 0, 0, 1) ${Math.max(
    0,
    revealProgress * 100 - 12
  )}%, rgba(0, 0, 0, 0.88) ${Math.max(0, revealProgress * 100 - 3)}%, rgba(0, 0, 0, 0) ${Math.min(
    100,
    revealProgress * 100 + 8
  )}%)`;
  const pose = getPoseAtTime(calibrationPoints, currentTime) ?? SIGNATURE_CONFIG.fallbackPose;
  const overlayEnabled = currentTime >= SIGNATURE_CONFIG.overlayStartTime || forceReveal;

  return (
    <div className="watchPage">
      <header className="topbar">
        <div className="leftCluster">
          <button className="iconButton" type="button" aria-label="Open menu">
            <IconMenu />
          </button>
          <div className="brand">
            <div className="brandBadge">
              <PlayGlyph />
            </div>
            <div className="brandText">YouTube</div>
            <span className="brandCountry">US</span>
          </div>
        </div>

        <div className="searchWrap">
          <div className="searchField">
            <input value="classic magician signed card reveal" readOnly aria-label="Search" />
          </div>
          <button className="searchButton" type="button" aria-label="Search">
            <IconSearch />
          </button>
          <button className="micButton" type="button" aria-label="Voice search">
            <IconMic />
          </button>
        </div>

        <div className="rightCluster">
          <button className="createButton" type="button">+ Create</button>
          <button className="iconButton" type="button" aria-label="Cast">
            <IconCast />
          </button>
          <div className="avatar">M</div>
        </div>
      </header>

      <main className="contentShell">
        <section className="mainColumn">
          <div className="videoFrame">
            <video
              ref={videoRef}
              className="playerVideo"
              playsInline
              preload="auto"
              src="/api/fake-youtube-video"
            />
            <div className="playerBackdrop" />
            <div className="signatureStage" aria-hidden="true">
              {overlayEnabled ? (
                <div
                  className="signatureCardFrame"
                  style={{
                    left: `${pose.x}%`,
                    top: `${pose.y}%`,
                    width: `${pose.width}%`,
                    height: `${pose.height}%`,
                    transform: `translate(-50%, -50%) rotate(${pose.rotation}deg)`,
                  }}
                >
                  {showOverlayGuide ? <div className="signatureGuide" /> : null}
                  <img
                    className={`signatureOverlay ${signatureVisible ? "signatureOverlayVisible" : ""}`}
                    src="/api/fake-youtube-signature"
                    alt=""
                    style={{
                      opacity: SIGNATURE_CONFIG.opacity,
                      transform: `translate(${SIGNATURE_CONFIG.signatureImage.offsetX}%, ${SIGNATURE_CONFIG.signatureImage.offsetY}%) scale(${SIGNATURE_CONFIG.signatureImage.scale}) rotate(${SIGNATURE_CONFIG.assetRotation + SIGNATURE_CONFIG.signatureImage.rotation}deg)`,
                      WebkitMaskImage: signatureMask,
                      maskImage: signatureMask,
                    }}
                  />
                </div>
              ) : null}
            </div>
            {!isPlaying ? (
              <button className="playerCenterBadge" type="button" onClick={togglePlayback} aria-label="Play video">
                <div className="centerPlay">
                  <PlayGlyph />
                </div>
                <span>{isReady ? "Play performance" : "Loading performance video"}</span>
              </button>
            ) : null}
            <div className="playerTopFade" />
            <div className="playerBottomFade" />
            <div className="playerControls">
              <div className="controlLeft">
                <button
                  className="playerButton"
                  type="button"
                  aria-label={isPlaying ? "Pause" : "Play"}
                  onClick={togglePlayback}
                >
                  {isPlaying ? <span className="pauseGlyph">||</span> : <PlayGlyph small />}
                </button>
                <div className="timeReadout">{formatTime(currentTime)} / {formatTime(duration)}</div>
              </div>
              <label className="timeline" aria-label="Video progress">
                <div className="timelineTrack" />
                <div className="timelinePlayed" style={{ width: `${progress * 100}%` }} />
                <div className="timelineHandle" style={{ left: `calc(${progress * 100}% - 7px)` }} />
                <input
                  type="range"
                  min="0"
                  max="1000"
                  value={Math.round(progress * 1000)}
                  onChange={handleTimelineChange}
                />
              </label>
              <div className="controlRight">
                <button className="playerButton" type="button" aria-label="Settings">
                  <IconSettings />
                </button>
                <button className="playerButton" type="button" aria-label="Mini player">
                  <IconCast />
                </button>
                <button className="fullscreenButton" type="button">[]</button>
              </div>
            </div>
          </div>

          <div className="watchMeta">
            <div className="chips">
              <span className="watchChip watchChipActive">All</span>
              <span className="watchChip">From this channel</span>
              <span className="watchChip">Related</span>
            </div>

            <div className="overlayDebugRow">
              <button className="debugPill" type="button" onClick={() => setShowOverlayGuide((value) => !value)}>
                {showOverlayGuide ? "Hide card guide" : "Show card guide"}
              </button>
              <button className="debugPill" type="button" onClick={() => setForceReveal((value) => !value)}>
                {forceReveal ? "Use timed reveal" : "Show full signature"}
              </button>
              <div className="debugText">
                Overlay begins at {SIGNATURE_CONFIG.overlayStartTime.toFixed(1)}s |
              </div>
              <div className="debugText">
                Reveal starts at {SIGNATURE_CONFIG.startTime.toFixed(1)}s for {SIGNATURE_CONFIG.duration.toFixed(1)}s
              </div>
              <div className="debugText">
                Calibrated keyframes {calibrationPoints.length} |
                signature shift {SIGNATURE_CONFIG.signatureImage.offsetX}% / {SIGNATURE_CONFIG.signatureImage.offsetY}%
              </div>
            </div>

            <h1 className="title">
              Magician Reveals a Signed Card in the Most Impossible Way
            </h1>

            <div className="infoRow">
              <div className="channelBlock">
                <div className="channelAvatar">M</div>
                <div>
                  <div className="channelName">Mystery Broadcast</div>
                  <div className="channelSubs">642K subscribers</div>
                </div>
                <button className="subscribeButton" type="button">Subscribe</button>
              </div>

              <div className="actionRow">
                <button className="pillButton" type="button">Like 24K</button>
                <button className="pillButton" type="button">Share</button>
                <button className="pillButton" type="button">Download</button>
                <button className="pillButton" type="button">More</button>
              </div>
            </div>

            <div className="descriptionCard">
              <div className="descriptionStats">1,824,772 views | Premiered Jan 18, 2024</div>
              <p>
                A restored television performance with one of the cleanest signed-card endings ever aired.
                This local prototype screen is designed to look like a normal watch page while leaving the
                player area ready for a preloaded video asset.
              </p>
            </div>

            <section className="commentsBlock">
              <div className="commentsHeader">1,238 Comments</div>
              {COMMENTS.map((comment) => (
                <article key={comment.author} className="commentCard">
                  <div className="commentAvatar">{comment.author[0]}</div>
                  <div className="commentBody">
                    <div className="commentHead">
                      <strong>{comment.author}</strong>
                      <span>{comment.age}</span>
                    </div>
                    <p>{comment.text}</p>
                    <div className="commentFoot">Likes {comment.likes}</div>
                  </div>
                </article>
              ))}
            </section>
          </div>
        </section>

        <aside className="sideColumn">
          <div className="upNextHead">
            <span>Up next</span>
            <div className="autoplayTag">Autoplay</div>
          </div>
          <div className="recStack">
            {RECOMMENDED_VIDEOS.map((video) => (
              <RecommendationCard key={video.title} video={video} />
            ))}
          </div>
        </aside>
      </main>

      <style jsx>{`
        .watchPage {
          min-height: 100vh;
          background: #fff;
          color: #0f0f0f;
        }

        .topbar {
          position: sticky;
          top: 0;
          z-index: 30;
          display: grid;
          grid-template-columns: auto minmax(340px, 1fr) auto;
          gap: 16px;
          align-items: center;
          height: 56px;
          padding: 0 16px;
          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid rgba(15, 15, 15, 0.06);
        }

        .leftCluster,
        .rightCluster {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 8px;
          position: relative;
        }

        .brandBadge {
          width: 32px;
          height: 22px;
          display: grid;
          place-items: center;
          border-radius: 7px;
          background: #ff0033;
          color: white;
        }

        .brandText {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 21px;
          font-weight: 700;
          letter-spacing: -0.03em;
        }

        .brandCountry {
          margin-left: -2px;
          margin-top: -12px;
          font-size: 10px;
          color: #606060;
        }

        .iconButton,
        .micButton,
        .playerButton,
        .fullscreenButton {
          width: 40px;
          height: 40px;
          border: 0;
          border-radius: 999px;
          background: transparent;
          color: #0f0f0f;
          display: grid;
          place-items: center;
        }

        .searchWrap {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-width: 0;
        }

        .searchField {
          min-width: 0;
          flex: 1;
          max-width: 640px;
          height: 40px;
          border: 1px solid #c6c6c6;
          border-radius: 999px 0 0 999px;
          background: #fff;
          overflow: hidden;
        }

        .searchField input {
          height: 100%;
          padding: 0 18px;
          border: 0;
          background: transparent;
          font-size: 16px;
          color: #0f0f0f;
        }

        .searchButton {
          width: 64px;
          height: 40px;
          margin-left: -10px;
          border: 1px solid #d3d3d3;
          border-left: 0;
          border-radius: 0 999px 999px 0;
          background: #f8f8f8;
          display: grid;
          place-items: center;
          color: #0f0f0f;
        }

        .micButton {
          background: #f2f2f2;
        }

        .createButton,
        .subscribeButton,
        .pillButton {
          border: 0;
          border-radius: 999px;
          font-weight: 600;
        }

        .createButton {
          height: 36px;
          padding: 0 14px;
          background: #f2f2f2;
        }

        .avatar,
        .channelAvatar,
        .commentAvatar {
          display: grid;
          place-items: center;
          border-radius: 999px;
          font-weight: 700;
          color: white;
        }

        .avatar {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #6d28d9, #2563eb);
        }

        .contentShell {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 402px;
          gap: 24px;
          max-width: 1800px;
          margin: 0 auto;
          padding: 24px 24px 60px;
        }

        .videoFrame {
          position: relative;
          overflow: hidden;
          aspect-ratio: 16 / 9;
          border-radius: 20px;
          background:
            radial-gradient(circle at 50% 38%, rgba(255,255,255,0.06), transparent 22%),
            linear-gradient(180deg, #161616 0%, #050505 100%);
          box-shadow: 0 10px 40px rgba(0,0,0,0.22);
        }

        .playerVideo {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          background: #050505;
        }

        .playerBackdrop {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 50% 50%, rgba(255,255,255,0.05), transparent 24%),
            linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01) 40%, rgba(0,0,0,0.22));
        }

        .signatureStage {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .signatureCardFrame,
        .signatureGuide,
        .signatureOverlay {
          position: absolute;
          transform-origin: center;
        }

        .signatureCardFrame {
          aspect-ratio: 612 / 465;
        }

        .signatureGuide {
          inset: 0;
          aspect-ratio: 612 / 465;
          border: 2px dashed rgba(255, 215, 0, 0.95);
          border-radius: 14px;
          box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35) inset;
          background: linear-gradient(180deg, rgba(255, 215, 0, 0.14), rgba(255, 215, 0, 0.02));
        }

        .signatureOverlay {
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
          filter: saturate(1.08) contrast(1.08);
          opacity: 0;
          transition: opacity 160ms ease;
        }

        .signatureOverlayVisible {
          opacity: ${SIGNATURE_CONFIG.opacity};
        }

        .playerCenterBadge {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          gap: 14px;
          color: rgba(255, 255, 255, 0.84);
          font-size: 15px;
          text-align: center;
          background: transparent;
          border: 0;
          width: 100%;
        }

        .centerPlay {
          width: 76px;
          height: 76px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(8px);
          color: white;
        }

        .playerTopFade,
        .playerBottomFade {
          position: absolute;
          left: 0;
          right: 0;
          height: 110px;
          pointer-events: none;
        }

        .playerTopFade {
          top: 0;
          background: linear-gradient(180deg, rgba(0,0,0,0.45), transparent);
        }

        .playerBottomFade {
          bottom: 0;
          background: linear-gradient(0deg, rgba(0,0,0,0.62), transparent);
        }

        .playerControls {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 14px;
          padding: 18px 18px 16px;
          color: white;
        }

        .controlLeft,
        .controlRight {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .playerButton,
        .fullscreenButton {
          color: white;
          background: rgba(255, 255, 255, 0.08);
        }

        .timeReadout {
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
        }

        .timeline {
          position: relative;
          height: 20px;
          display: flex;
          align-items: center;
        }

        .timeline input {
          position: absolute;
          inset: 0;
          width: 100%;
          margin: 0;
          opacity: 0;
          cursor: pointer;
        }

        .timelineTrack {
          position: absolute;
          left: 0;
          right: 0;
          top: 50%;
          height: 4px;
          border-radius: 999px;
          transform: translateY(-50%);
          background: rgba(255, 255, 255, 0.24);
        }

        .timelinePlayed {
          position: absolute;
          left: 0;
          top: 50%;
          height: 4px;
          border-radius: 999px;
          transform: translateY(-50%);
          background: #ff0033;
        }

        .timelineHandle {
          position: absolute;
          top: 50%;
          width: 14px;
          height: 14px;
          border-radius: 999px;
          background: #ff0033;
          transform: translateY(-50%);
          box-shadow: 0 0 0 4px rgba(255, 0, 51, 0.12);
        }

        .pauseGlyph {
          font-size: 14px;
          font-weight: 700;
          letter-spacing: -0.1em;
        }

        .watchMeta {
          padding-top: 18px;
        }

        .overlayDebugRow {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 14px;
          align-items: center;
        }

        .debugPill {
          height: 34px;
          padding: 0 14px;
          border: 0;
          border-radius: 999px;
          background: #f2f2f2;
          color: #0f0f0f;
          font-size: 13px;
          font-weight: 600;
        }

        .debugText {
          color: #606060;
          font-size: 13px;
          font-weight: 500;
        }

        .chips {
          display: flex;
          gap: 10px;
          margin-bottom: 14px;
          overflow: auto;
        }

        .watchChip {
          padding: 8px 12px;
          border-radius: 10px;
          background: #f2f2f2;
          white-space: nowrap;
          font-size: 14px;
          font-weight: 500;
        }

        .watchChipActive {
          background: #0f0f0f;
          color: white;
        }

        .title {
          margin: 0 0 14px;
          font-size: 22px;
          line-height: 1.28;
          font-weight: 700;
        }

        .infoRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }

        .channelBlock {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .channelAvatar {
          width: 42px;
          height: 42px;
          background: linear-gradient(135deg, #ef4444, #111827);
        }

        .channelName {
          font-size: 16px;
          font-weight: 700;
        }

        .channelSubs,
        .descriptionStats,
        .commentHead span,
        .commentFoot {
          color: #606060;
          font-size: 13px;
        }

        .subscribeButton {
          height: 36px;
          padding: 0 16px;
          background: #0f0f0f;
          color: white;
        }

        .actionRow {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .pillButton {
          height: 36px;
          padding: 0 16px;
          background: #f2f2f2;
          color: #0f0f0f;
        }

        .descriptionCard {
          padding: 14px 16px;
          border-radius: 16px;
          background: #f2f2f2;
          margin-bottom: 24px;
        }

        .descriptionCard p {
          margin: 10px 0 0;
          font-size: 14px;
          line-height: 1.5;
        }

        .commentsHeader {
          margin-bottom: 18px;
          font-size: 20px;
          font-weight: 700;
        }

        .commentCard {
          display: grid;
          grid-template-columns: 40px 1fr;
          gap: 12px;
          margin-bottom: 20px;
        }

        .commentAvatar {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #14b8a6, #2563eb);
        }

        .commentHead {
          display: flex;
          gap: 8px;
          align-items: center;
          margin-bottom: 4px;
        }

        .commentBody p {
          margin: 0 0 8px;
          font-size: 14px;
          line-height: 1.45;
        }

        .upNextHead {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
          padding-top: 4px;
          font-size: 16px;
          font-weight: 700;
        }

        .autoplayTag {
          font-size: 12px;
          color: #606060;
          font-weight: 600;
        }

        .recStack {
          display: grid;
          gap: 12px;
        }

        @media (max-width: 1180px) {
          .contentShell {
            grid-template-columns: 1fr;
          }

          .sideColumn {
            order: -1;
          }

          .recStack {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 820px) {
          .topbar {
            grid-template-columns: auto 1fr auto;
          }

          .searchWrap {
            gap: 8px;
          }

          .micButton,
          .createButton {
            display: none;
          }

          .contentShell {
            padding: 12px 12px 36px;
          }

          .title {
            font-size: 20px;
          }

          .recStack {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .topbar {
            padding: 0 10px;
            gap: 8px;
          }

          .brandText {
            font-size: 18px;
          }

          .searchField {
            max-width: none;
          }

          .searchButton {
            width: 50px;
          }

          .rightCluster {
            gap: 6px;
          }

          .recCard {
            grid-template-columns: 140px 1fr;
          }

          .watchMeta {
            padding-top: 14px;
          }
        }
      `}</style>
    </div>
  );
}
