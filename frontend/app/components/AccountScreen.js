"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { navigateBackWithinApp } from "../../lib/navigation";
import {
  formatHandedness,
  getStoredHandedness,
  getStoredProfilePhoto,
  setStoredHandedness,
  setStoredProfilePhoto,
} from "../../lib/userPreferences";

const STATS = [
  { label: "Sessions", value: "24" },
  { label: "Machines", value: "7" },
  { label: "Reports", value: "12" },
];

const NAV_ITEMS = [
  { label: "Account", href: "/account" },
  { label: "Analytics", href: "/analytics" },
  { label: "PinMap", href: "/pinmap" },
  { label: "Home", href: "/" },
  { label: "Classroom", href: "/classroom" },
];

const CROP_SIZE = 280;
const OUTPUT_SIZE = 360;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getCoverScale(width, height) {
  if (!width || !height) {
    return 1;
  }

  return Math.max(CROP_SIZE / width, CROP_SIZE / height);
}

function clampCropOffset(offset, imageSize, zoom) {
  if (!imageSize.width || !imageSize.height) {
    return { x: 0, y: 0 };
  }

  const baseScale = getCoverScale(imageSize.width, imageSize.height);
  const renderedWidth = imageSize.width * baseScale * zoom;
  const renderedHeight = imageSize.height * baseScale * zoom;
  const limitX = Math.max(0, (renderedWidth - CROP_SIZE) / 2);
  const limitY = Math.max(0, (renderedHeight - CROP_SIZE) / 2);

  return {
    x: clamp(offset.x, -limitX, limitX),
    y: clamp(offset.y, -limitY, limitY),
  };
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read image."));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image."));
    image.src = src;
  });
}

async function buildCroppedAvatar(src, imageSize, zoom, offset) {
  const image = await loadImageElement(src);
  const baseScale = getCoverScale(imageSize.width, imageSize.height);
  const renderedWidth = imageSize.width * baseScale * zoom;
  const renderedHeight = imageSize.height * baseScale * zoom;
  const left = (CROP_SIZE - renderedWidth) / 2 + offset.x;
  const top = (CROP_SIZE - renderedHeight) / 2 + offset.y;
  const sourceX = ((0 - left) / renderedWidth) * imageSize.width;
  const sourceY = ((0 - top) / renderedHeight) * imageSize.height;
  const sourceWidth = (CROP_SIZE / renderedWidth) * imageSize.width;
  const sourceHeight = (CROP_SIZE / renderedHeight) * imageSize.height;

  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas is not available.");
  }

  context.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  context.save();
  context.beginPath();
  context.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
  context.closePath();
  context.clip();
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  context.restore();

  return canvas.toDataURL("image/png");
}

export default function AccountScreen() {
  const router = useRouter();
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [handedness, setHandedness] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [cropSource, setCropSource] = useState("");
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [cropImageSize, setCropImageSize] = useState({ width: 0, height: 0 });
  const [cropStatus, setCropStatus] = useState("");
  const [isSavingCrop, setIsSavingCrop] = useState(false);
  const toggleTouchStartX = useRef(null);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const dragStateRef = useRef(null);

  const accountSections = useMemo(
    () => [
      {
        title: "Profile",
        items: [
          ["Display Name", "JR Player"],
          ["Home Location", "Blairally"],
          ["Skill Focus", "Control and shot consistency"],
        ],
      },
      {
        title: "Membership",
        items: [
          ["Plan", "FlipperIQ V1 Demo"],
          ["Coach Persona", "PinCoach"],
          ["Last Sync", "Today at 6:42 PM"],
        ],
      },
      {
        title: "Preferences",
        items: [
          ["Default Session Type", "Practice"],
          ["Mistake Tracking", "Enabled"],
          ["Weekly Summary", "Sunday evening"],
          ["Handedness", formatHandedness(handedness)],
          ["Profile Photo", profilePhoto ? "Saved on this device" : "Not set"],
        ],
      },
    ],
    [handedness, profilePhoto]
  );

  function handleBack() {
    navigateBackWithinApp(router, "/");
  }

  useEffect(() => {
    setLocationEnabled(window.localStorage.getItem("flipperiq-location-enabled") === "true");
    setHandedness(getStoredHandedness());
    setProfilePhoto(getStoredProfilePhoto());
  }, []);

  function updateLocationSetting(next) {
    window.localStorage.setItem("flipperiq-location-enabled", String(next));
    setLocationEnabled(next);
  }

  function handleLocationToggle() {
    updateLocationSetting(!locationEnabled);
  }


  function updateHandedness(nextHandedness) {
    setStoredHandedness(nextHandedness);
    setHandedness(nextHandedness);
  }

  function updateProfilePhoto(nextPhoto) {
    setStoredProfilePhoto(nextPhoto);
    setProfilePhoto(nextPhoto);
  }

  function resetCropState() {
    setCropSource("");
    setCropZoom(1);
    setCropOffset({ x: 0, y: 0 });
    setCropImageSize({ width: 0, height: 0 });
    setCropStatus("");
    setIsSavingCrop(false);
    dragStateRef.current = null;
  }

  async function openCropperFromFile(file) {
    try {
      const dataUrl = await readFileAsDataUrl(file);
      if (!dataUrl) {
        return;
      }

      setCropSource(dataUrl);
      setCropZoom(1);
      setCropOffset({ x: 0, y: 0 });
      setCropImageSize({ width: 0, height: 0 });
      setCropStatus("Move and zoom your photo so your face sits well in the circle.");
    } catch {
      setCropStatus("This image could not be loaded.");
    }
  }

  function handleChoosePhoto() {
    galleryInputRef.current?.click();
  }

  function handleTakePhoto() {
    cameraInputRef.current?.click();
  }

  async function handlePhotoSelection(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    await openCropperFromFile(file);
  }

  function clearProfilePhoto() {
    updateProfilePhoto("");
  }

  function handleToggleTouchStart(event) {
    toggleTouchStartX.current = event.touches[0].clientX;
  }

  function handleToggleTouchEnd(event) {
    if (toggleTouchStartX.current == null) {
      return;
    }

    const deltaX = event.changedTouches[0].clientX - toggleTouchStartX.current;
    toggleTouchStartX.current = null;

    if (deltaX > 12) {
      updateLocationSetting(true);
      return;
    }

    if (deltaX < -12) {
      updateLocationSetting(false);
    }
  }


  function startCropDrag(clientX, clientY) {
    dragStateRef.current = {
      clientX,
      clientY,
      originX: cropOffset.x,
      originY: cropOffset.y,
    };
  }

  function moveCropDrag(clientX, clientY) {
    const dragState = dragStateRef.current;
    if (!dragState) {
      return;
    }

    const nextOffset = clampCropOffset(
      {
        x: dragState.originX + (clientX - dragState.clientX),
        y: dragState.originY + (clientY - dragState.clientY),
      },
      cropImageSize,
      cropZoom
    );
    setCropOffset(nextOffset);
  }

  function stopCropDrag() {
    dragStateRef.current = null;
  }

  function handleCropPointerDown(event) {
    event.preventDefault();
    startCropDrag(event.clientX, event.clientY);
  }

  function handleCropPointerMove(event) {
    if (!dragStateRef.current) {
      return;
    }

    event.preventDefault();
    moveCropDrag(event.clientX, event.clientY);
  }

  function handleCropTouchStart(event) {
    const touch = event.touches[0];
    if (!touch) {
      return;
    }

    startCropDrag(touch.clientX, touch.clientY);
  }

  function handleCropTouchMove(event) {
    const touch = event.touches[0];
    if (!touch || !dragStateRef.current) {
      return;
    }

    event.preventDefault();
    moveCropDrag(touch.clientX, touch.clientY);
  }

  function handleCropZoomChange(event) {
    const nextZoom = Number(event.target.value);
    setCropZoom(nextZoom);
    setCropOffset((currentOffset) => clampCropOffset(currentOffset, cropImageSize, nextZoom));
  }

  async function handleSaveCrop() {
    if (!cropSource || !cropImageSize.width || !cropImageSize.height) {
      return;
    }

    setIsSavingCrop(true);
    setCropStatus("Saving photo...");

    try {
      const nextPhoto = await buildCroppedAvatar(cropSource, cropImageSize, cropZoom, cropOffset);
      updateProfilePhoto(nextPhoto);
      resetCropState();
    } catch {
      setCropStatus("The crop could not be saved. Try another photo.");
      setIsSavingCrop(false);
    }
  }

  const baseScale = getCoverScale(cropImageSize.width, cropImageSize.height);
  const cropImageTransform = `translate(-50%, -50%) translate(${cropOffset.x}px, ${cropOffset.y}px) scale(${cropZoom})`;
  const cropImageStyle = cropImageSize.width
    ? {
        width: `${cropImageSize.width * baseScale}px`,
        height: `${cropImageSize.height * baseScale}px`,
        transform: cropImageTransform,
      }
    : undefined;

  return (
    <div className="screen">
      <div className="phoneShell">
        <header className="topBar">
          <button type="button" className="navArrow" aria-label="Back" onClick={handleBack}>
            &#8249;
          </button>
          <h1>Account</h1>
          <div className="spacer" />
        </header>

        <main className="content">
          <section className="heroCard">
            <div className="avatarWrap">
              <div className="avatar">
                {profilePhoto ? <img src={profilePhoto} alt="Profile" className="avatarImage" /> : "JR"}
              </div>
              <div className="avatarActions">
                <button type="button" className="avatarButton" onClick={handleTakePhoto}>
                  Take photo
                </button>
                <button type="button" className="avatarButton" onClick={handleChoosePhoto}>
                  Choose photo
                </button>
                {profilePhoto ? (
                  <button type="button" className="avatarButton avatarButtonGhost" onClick={clearProfilePhoto}>
                    Remove
                  </button>
                ) : null}
              </div>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="user"
                className="hiddenInput"
                onChange={handlePhotoSelection}
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="hiddenInput"
                onChange={handlePhotoSelection}
              />
            </div>
            <div className="heroCopy">
              <div className="heroName">JR Player</div>
              <div className="heroSubtitle">Pinball practice profile</div>
            </div>
          </section>

          <section className="statsGrid" aria-label="Account stats">
            {STATS.map((stat) => (
              <div key={stat.label} className="statCard">
                <div className="statValue">{stat.value}</div>
                <div className="statLabel">{stat.label}</div>
              </div>
            ))}
          </section>

          <section className="toggleCard">
            <div className="toggleText">
              <div className="toggleTitle">Allow app to use your location</div>
              <div className="toggleCopy">Let FlipperIQ use location-aware coaching, nearby machine context, and same-machine comparisons across venues.</div>
            </div>
            <div className="toggleControlWrap">
              <button
                type="button"
                className={locationEnabled ? "toggleButton toggleButtonOn" : "toggleButton"}
                aria-pressed={locationEnabled}
                onClick={handleLocationToggle}
                onTouchStart={handleToggleTouchStart}
                onTouchEnd={handleToggleTouchEnd}
              >
                <span className="toggleThumb" />
              </button>
            </div>
          </section>

          <section className="toggleCard">
            <div className="toggleText">
              <div className="toggleTitle">Handedness for coaching</div>
              <div className="toggleCopy">Let FlipCoach and PinCoach tune drills and side-to-side control work to your dominant hand.</div>
            </div>
            <div className="toggleControlWrap toggleControlWrapStacked">
              <div className="toggleModeLabels">
                <span className={handedness === "left" ? "toggleModeLabel toggleModeLabelActive" : "toggleModeLabel"}>Left</span>
                <span className={handedness === "right" ? "toggleModeLabel toggleModeLabelActive" : "toggleModeLabel"}>Right</span>
              </div>
              <div className="handednessButtonRow">
                <button type="button" className={handedness === "left" ? "handednessButton handednessButtonActive" : "handednessButton"} onClick={() => updateHandedness("left")}>Left</button>
                <button type="button" className={handedness === "right" ? "handednessButton handednessButtonActive" : "handednessButton"} onClick={() => updateHandedness("right")}>Right</button>
              </div>
            </div>
          </section>

          <section className="sectionList">
            {accountSections.map((section) => (
              <div key={section.title} className="sectionCard">
                <h2>{section.title}</h2>
                <div className="detailList">
                  {section.items.map(([label, value]) => (
                    <div key={label} className="detailRow">
                      <span className="detailLabel">{label}</span>
                      <span className="detailValue">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        </main>

        <nav className="bottomNav" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              type="button"
              className={item.label === "Account" ? "navItem navItemActive" : !item.href ? "navItem navItemDisabled" : "navItem"}
              onClick={() => {
                if (item.href) {
                  router.push(item.href);
                }
              }}
              disabled={!item.href}
            >
              <span className="navIcon" aria-hidden="true">
                {item.label === "Account" && "O"}
                {item.label === "Analytics" && "|"}
                {item.label === "PinMap" && "*"}
                {item.label === "Home" && "#"}
                {item.label === "Classroom" && "="}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {cropSource ? (
        <div className="cropOverlay" role="dialog" aria-modal="true" aria-label="Crop profile photo">
          <div className="cropCard">
            <div className="cropHeader">
              <div>
                <div className="cropTitle">Position your photo</div>
                <div className="cropCopy">Drag your face into the circle, then use zoom to size it for the avatar.</div>
              </div>
              <button type="button" className="cropCloseButton" onClick={resetCropState}>
                Close
              </button>
            </div>

            <div
              className="cropStage"
              onMouseDown={handleCropPointerDown}
              onMouseMove={handleCropPointerMove}
              onMouseUp={stopCropDrag}
              onMouseLeave={stopCropDrag}
              onTouchStart={handleCropTouchStart}
              onTouchMove={handleCropTouchMove}
              onTouchEnd={stopCropDrag}
            >
              <img
                src={cropSource}
                alt="Crop preview"
                className="cropPreviewImage"
                style={cropImageStyle}
                onLoad={(event) => {
                  const nextSize = {
                    width: event.currentTarget.naturalWidth,
                    height: event.currentTarget.naturalHeight,
                  };
                  setCropImageSize(nextSize);
                  setCropOffset(clampCropOffset({ x: 0, y: 0 }, nextSize, 1));
                }}
                draggable="false"
              />
              <div className="cropRing" />
            </div>

            <label className="cropSliderLabel">
              <span>Zoom</span>
              <input type="range" min="1" max="2.6" step="0.01" value={cropZoom} onChange={handleCropZoomChange} />
            </label>
            {cropStatus ? <div className="cropStatus">{cropStatus}</div> : null}

            <div className="cropActions">
              <button type="button" className="cropButton cropButtonGhost" onClick={resetCropState}>
                Cancel
              </button>
              <button type="button" className="cropButton" onClick={handleSaveCrop} disabled={isSavingCrop || !cropImageSize.width}>
                {isSavingCrop ? "Saving..." : "Use photo"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .handednessButtonRow {
          display: flex;
          gap: 8px;
        }

        .handednessButton {
          min-width: 60px;
          min-height: 34px;
          padding: 0 12px;
          border-radius: 999px;
          border: 1px solid rgba(165, 190, 232, 0.22);
          background: rgba(255, 255, 255, 0.06);
          color: #d7e4ff;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .handednessButtonActive {
          background: linear-gradient(180deg, rgba(76, 163, 255, 0.55), rgba(47, 121, 231, 0.4));
          border-color: rgba(143, 195, 255, 0.58);
          color: #ffffff;
        }

        .screen {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: #f3f5f8;
          font-family: "Segoe UI", Arial, sans-serif;
        }

        .phoneShell {
          width: 390px;
          max-width: 100%;
          min-height: 812px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border-radius: 34px;
          border: 8px solid #05070d;
          background:
            radial-gradient(circle at top, rgba(50, 87, 150, 0.34), rgba(16, 38, 73, 0) 32%),
            linear-gradient(180deg, #102649 0%, #08172d 100%);
          color: #f3f7ff;
          box-shadow: 0 28px 70px rgba(0, 0, 0, 0.28);
        }

        .topBar {
          min-height: 92px;
          display: grid;
          grid-template-columns: 40px 1fr 40px;
          align-items: center;
          padding: 28px 18px 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: linear-gradient(180deg, rgba(19, 43, 81, 0.92), rgba(16, 38, 73, 0.76));
        }

        h1 {
          margin: 0;
          text-align: center;
          align-self: center;
          font-size: 19px;
          font-weight: 700;
          letter-spacing: 0.01em;
        }

        .navArrow,
        .navItem {
          cursor: pointer;
        }

        .navArrow {
          width: 36px;
          height: 36px;
          align-self: center;
          border: 0;
          border-radius: 999px;
          background: transparent;
          color: #d7e4ff;
          font-size: 24px;
          line-height: 1;
        }

        .spacer {
          width: 40px;
        }

        .content {
          flex: 1;
          padding: 14px 16px 12px;
          overflow-y: auto;
        }

        .heroCard {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 16px;
          border-radius: 16px;
          border: 1px solid rgba(165, 190, 232, 0.24);
          background: linear-gradient(180deg, rgba(30, 55, 98, 0.86), rgba(12, 24, 46, 0.94));
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22);
          margin-bottom: 14px;
        }

        .avatarWrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          flex: 0 0 auto;
        }

        .avatar {
          width: 58px;
          height: 58px;
          flex: 0 0 58px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: linear-gradient(180deg, #69a9ff 0%, #2f6fe3 100%);
          color: #ffffff;
          font-size: 20px;
          font-weight: 800;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.22);
          overflow: hidden;
        }

        .avatarImage {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .avatarActions {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 100%;
        }

        .avatarButton {
          min-height: 28px;
          padding: 0 10px;
          border: 1px solid rgba(165, 190, 232, 0.22);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          color: #d7e4ff;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
          cursor: pointer;
        }

        .avatarButtonGhost {
          background: rgba(255, 255, 255, 0.03);
          color: #b8c8e6;
        }

        .hiddenInput {
          display: none;
        }

        .heroCopy {
          min-width: 0;
          padding-top: 2px;
        }

        .heroName {
          font-size: 20px;
          font-weight: 800;
          color: #f7f4e6;
        }

        .heroSubtitle {
          margin-top: 4px;
          font-size: 13px;
          color: #b8c8e6;
        }

        .statsGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 14px;
        }

        .statCard {
          padding: 14px 10px 12px;
          border-radius: 14px;
          border: 1px solid rgba(165, 190, 232, 0.18);
          background: linear-gradient(180deg, rgba(26, 47, 85, 0.86), rgba(12, 24, 46, 0.94));
          text-align: center;
        }

        .statValue {
          font-size: 24px;
          font-weight: 800;
          color: #69a9ff;
        }

        .statLabel {
          margin-top: 4px;
          font-size: 12px;
          font-weight: 700;
          color: #c8d6ef;
        }

        .toggleCard {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 14px;
          margin-bottom: 14px;
          border-radius: 16px;
          border: 1px solid rgba(165, 190, 232, 0.18);
          background: linear-gradient(180deg, rgba(26, 47, 85, 0.86), rgba(12, 24, 46, 0.94));
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);
        }

        .toggleText {
          flex: 1;
          min-width: 0;
        }

        .toggleControlWrap {
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
        }

        .toggleControlWrapStacked {
          flex-direction: column;
          gap: 6px;
        }

        .toggleModeLabels {
          display: flex;
          gap: 8px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .toggleModeLabel {
          color: #89a0c4;
        }

        .toggleModeLabelActive {
          color: #f0f5ff;
        }

        .toggleTitle {
          color: #f4f1e6;
          font-size: 14px;
          font-weight: 800;
        }

        .toggleCopy {
          margin-top: 5px;
          color: #b8c8e6;
          font-size: 12px;
          line-height: 1.4;
        }

        .toggleButton {
          position: relative;
          width: 54px;
          height: 30px;
          padding: 3px;
          border: 1px solid rgba(165, 190, 232, 0.22);
          border-radius: 999px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03));
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.26);
          display: flex;
          align-items: center;
          justify-content: flex-start;
          transition: background 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
          cursor: pointer;
        }

        .toggleButtonOn {
          background: linear-gradient(180deg, rgba(76, 163, 255, 0.55), rgba(47, 121, 231, 0.4));
          border-color: rgba(143, 195, 255, 0.58);
          box-shadow: inset 0 1px 2px rgba(12, 28, 52, 0.28), 0 0 0 1px rgba(76, 163, 255, 0.1);
        }

        .toggleThumb {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: linear-gradient(180deg, #ffffff 0%, #dce7f7 100%);
          border: 1px solid rgba(255, 255, 255, 0.85);
          box-shadow: 0 3px 8px rgba(0, 0, 0, 0.24);
          transition: transform 160ms ease;
        }

        .toggleButtonOn .toggleThumb {
          transform: translateX(24px);
          background: linear-gradient(180deg, #8fd0ff 0%, #4ca3ff 100%);
          border-color: rgba(173, 220, 255, 0.92);
        }

        .sectionList {
          display: grid;
          gap: 12px;
        }

        .sectionCard {
          padding: 14px 14px 12px;
          border-radius: 16px;
          border: 1px solid rgba(165, 190, 232, 0.18);
          background: linear-gradient(180deg, rgba(26, 47, 85, 0.86), rgba(12, 24, 46, 0.94));
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);
        }

        h2 {
          margin: 0 0 12px;
          font-size: 15px;
          font-weight: 800;
          color: #f4f1e6;
        }

        .detailList {
          display: grid;
          gap: 10px;
        }

        .detailRow {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          padding-top: 10px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .detailRow:first-child {
          padding-top: 0;
          border-top: 0;
        }

        .detailLabel {
          font-size: 12px;
          font-weight: 700;
          color: #aebfdc;
        }

        .detailValue {
          text-align: right;
          font-size: 13px;
          font-weight: 700;
          color: #f0f5ff;
        }

        .bottomNav {
          height: 74px;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          align-items: center;
          padding: 6px 6px 10px;
          background: linear-gradient(180deg, rgba(14, 30, 57, 0.95), rgba(9, 20, 39, 0.98));
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .navItem {
          width: 100%;
          min-height: 100%;
          padding: 0;
          border: 0;
          background: transparent;
          color: #b7bfd0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 600;
          appearance: none;
        }

        .navItemActive {
          color: #68a9ff;
        }

        .navItemDisabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .navIcon {
          font-size: 18px;
          line-height: 1;
        }

        .cropOverlay {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          background: rgba(4, 8, 16, 0.84);
          backdrop-filter: blur(10px);
          z-index: 50;
        }

        .cropCard {
          width: min(100%, 420px);
          padding: 18px;
          border-radius: 24px;
          border: 1px solid rgba(165, 190, 232, 0.18);
          background: linear-gradient(180deg, rgba(18, 36, 69, 0.98), rgba(8, 18, 36, 0.98));
          box-shadow: 0 28px 70px rgba(0, 0, 0, 0.46);
        }

        .cropHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .cropTitle {
          font-size: 18px;
          font-weight: 800;
          color: #f7f4e6;
        }

        .cropCopy {
          margin-top: 4px;
          font-size: 12px;
          line-height: 1.45;
          color: #b8c8e6;
        }

        .cropCloseButton,
        .cropButton {
          border: 1px solid rgba(165, 190, 232, 0.22);
          border-radius: 999px;
          cursor: pointer;
          font-weight: 800;
        }

        .cropCloseButton {
          min-height: 34px;
          padding: 0 14px;
          background: rgba(255, 255, 255, 0.05);
          color: #d7e4ff;
          font-size: 12px;
        }

        .cropStage {
          position: relative;
          width: 280px;
          height: 280px;
          margin: 18px auto 14px;
          overflow: hidden;
          border-radius: 24px;
          background: linear-gradient(180deg, #0e1d39 0%, #060d1b 100%);
          touch-action: none;
          user-select: none;
        }

        .cropPreviewImage {
          position: absolute;
          top: 50%;
          left: 50%;
          transform-origin: center center;
          will-change: transform;
          user-select: none;
          pointer-events: none;
        }

        .cropRing {
          position: absolute;
          inset: 0;
          border-radius: 24px;
          box-shadow: inset 0 0 0 999px rgba(3, 8, 17, 0.48);
          pointer-events: none;
        }

        .cropRing::after {
          content: "";
          position: absolute;
          inset: 18px;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.94);
          box-shadow: 0 0 0 999px rgba(3, 8, 17, 0.58);
        }

        .cropSliderLabel {
          display: grid;
          gap: 8px;
          color: #d7e4ff;
          font-size: 12px;
          font-weight: 800;
        }

        .cropSliderLabel input {
          width: 100%;
        }

        .cropStatus {
          min-height: 18px;
          margin-top: 10px;
          color: #b8c8e6;
          font-size: 12px;
        }

        .cropActions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 14px;
        }

        .cropButton {
          min-height: 38px;
          padding: 0 16px;
          background: linear-gradient(180deg, rgba(76, 163, 255, 0.55), rgba(47, 121, 231, 0.4));
          border-color: rgba(143, 195, 255, 0.58);
          color: #ffffff;
          font-size: 13px;
        }

        .cropButtonGhost {
          background: rgba(255, 255, 255, 0.05);
          color: #d7e4ff;
        }

        .cropButton:disabled {
          opacity: 0.6;
          cursor: default;
        }

        @media (max-width: 520px) {
          .screen {
            padding: 0;
            background: #08172d;
          }

          .phoneShell {
            width: 100%;
            min-height: 100vh;
            border: 0;
            border-radius: 0;
          }

          .heroCard {
            align-items: center;
          }

          .avatarWrap {
            width: 92px;
          }
        }
      `}</style>
    </div>
  );
}










