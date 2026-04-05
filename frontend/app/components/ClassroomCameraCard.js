"use client";

import { useEffect, useRef, useState } from "react";

const MARKER_TOOLS = [
  { key: "start", label: "Green" },
  { key: "path", label: "Yellow" },
  { key: "error", label: "Red" },
  { key: "drain", label: "Drain" },
];

const DEFAULT_CAPTURE = {
  photo: "",
  drains: [],
  overlays: [],
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeMarkers(markers) {
  if (!Array.isArray(markers)) {
    return [];
  }

  return markers
    .filter((marker) => marker && typeof marker === "object")
    .map((marker) => ({
      id: typeof marker.id === "string" ? marker.id : `marker-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: marker.type === "start" || marker.type === "path" || marker.type === "error" || marker.type === "drain" ? marker.type : "path",
      x: clamp(Number(marker.x ?? 0.5), 0, 1),
      y: clamp(Number(marker.y ?? 0.5), 0, 1),
      createdAt: Number(marker.createdAt) || Date.now(),
    }));
}

function normalizeOverlays(overlays) {
  if (!Array.isArray(overlays)) {
    return [];
  }

  return overlays
    .filter((overlay) => overlay && typeof overlay === "object")
    .map((overlay, index) => ({
      id: typeof overlay.id === "string" ? overlay.id : `overlay-${Date.now()}-${index}`,
      name: typeof overlay.name === "string" && overlay.name ? overlay.name : `Path ${index + 1}`,
      drainId: typeof overlay.drainId === "string" ? overlay.drainId : "",
      markers: normalizeMarkers(overlay.markers).filter((marker) => marker.type !== "drain"),
      visible: overlay.visible !== false,
      gameNumber: Number.isFinite(Number(overlay.gameNumber)) ? Number(overlay.gameNumber) : null,
      ballNumber: Number.isFinite(Number(overlay.ballNumber)) ? Number(overlay.ballNumber) : null,
      createdAt: Number(overlay.createdAt) || Date.now(),
    }))
    .filter((overlay) => overlay.markers.length >= 2 && overlay.drainId);
}

function getStoredCapture(storageKey) {
  if (typeof window === "undefined") {
    return DEFAULT_CAPTURE;
  }

  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return DEFAULT_CAPTURE;
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      const legacyMarkers = normalizeMarkers(parsed.markers);
      const drains = normalizeMarkers(parsed.drains || legacyMarkers.filter((marker) => marker.type === "drain")).filter((marker) => marker.type === "drain");
      return {
        photo: typeof parsed.photo === "string" ? parsed.photo : "",
        drains,
        overlays: normalizeOverlays(parsed.overlays),
      };
    }
  } catch {
    return {
      photo: raw,
      drains: [],
      overlays: [],
    };
  }

  return DEFAULT_CAPTURE;
}

function setStoredCapture(storageKey, value) {
  if (typeof window === "undefined") {
    return;
  }

  if (!value.photo) {
    window.localStorage.removeItem(storageKey);
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify({
    photo: value.photo,
    drains: normalizeMarkers(value.drains).filter((marker) => marker.type === "drain"),
    overlays: normalizeOverlays(value.overlays),
    updatedAt: Date.now(),
  }));
}

function getMarkerAppearance(type) {
  switch (type) {
    case "start":
      return { className: "markerStart", aria: "Green start point" };
    case "path":
      return { className: "markerPath", aria: "Yellow path point" };
    case "error":
      return { className: "markerError", aria: "Red error point" };
    case "drain":
      return { className: "markerDrain", aria: "Drain point" };
    default:
      return { className: "markerPath", aria: "Point" };
    }
}

function getDistance(first, second) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function getCenter(first, second) {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  };
}

function clampOffset(offsetX, offsetY, scale, width, height) {
  const maxX = Math.max(0, ((width * scale) - width) / 2);
  const maxY = Math.max(0, ((height * scale) - height) / 2);
  return {
    x: clamp(offsetX, -maxX, maxX),
    y: clamp(offsetY, -maxY, maxY),
  };
}

function screenToImage(localX, localY, transform, width, height) {
  const centeredX = localX - (width / 2) - transform.offsetX;
  const centeredY = localY - (height / 2) - transform.offsetY;
  const imageX = (centeredX / transform.scale) + (width / 2);
  const imageY = (centeredY / transform.scale) + (height / 2);

  return {
    x: clamp(imageX / width, 0, 1),
    y: clamp(imageY / height, 0, 1),
  };
}

function overlaySummary(overlay) {
  return overlay.markers.map((marker) => (marker.type === "start" ? "G" : marker.type === "path" ? "Y" : "R")).join("-");
}

function renderPathLines(markers, drain, keyPrefix, tone = "saved") {
  const color = tone == "current" ? "rgba(255, 255, 255, 0.96)" : "rgba(108, 197, 255, 0.92)";
  const glow = tone == "current" ? "rgba(14, 22, 40, 0.92)" : "rgba(5, 14, 32, 0.86)";
  const lines = [];

  for (let index = 1; index < markers.length; index += 1) {
    const previousMarker = markers[index - 1];
    const marker = markers[index];
    lines.push(
      <line
        key={`${keyPrefix}-segment-${previousMarker.id}-${marker.id}`}
        x1={previousMarker.x * 1000}
        y1={previousMarker.y * 1000}
        x2={marker.x * 1000}
        y2={marker.y * 1000}
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        style={{ filter: `drop-shadow(0 0 2px ${glow})` }}
      />
    );
  }

  if (drain && markers.length >= 2) {
    const lastMarker = markers[markers.length - 1];
    lines.push(
      <line
        key={`${keyPrefix}-drain-${lastMarker.id}-${drain.id}`}
        x1={lastMarker.x * 1000}
        y1={lastMarker.y * 1000}
        x2={drain.x * 1000}
        y2={drain.y * 1000}
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        style={{ filter: `drop-shadow(0 0 2px ${glow})` }}
      />
    );
  }

  return lines;
}

export default function ClassroomCameraCard({ storageKey, title = "Photo Reference", hint = "Capture a machine, playfield, or setup detail for this classroom page.", enableMarkup = false, gameNumber = null, ballNumber = null, maxBallNumber = null, onGameNumberChange = null, onBallNumberChange = null }) {
  const [photo, setPhoto] = useState("");
  const [drains, setDrains] = useState([]);
  const [overlays, setOverlays] = useState([]);
  const [currentMarkers, setCurrentMarkers] = useState([]);
  const [selectedTool, setSelectedTool] = useState("");
  const [status, setStatus] = useState("No photo saved for this page yet.");
  const [showDrainInstructions, setShowDrainInstructions] = useState(false);
  const [drainsLocked, setDrainsLocked] = useState(false);
  const [pendingDrainId, setPendingDrainId] = useState("");
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [transform, setTransform] = useState({ scale: 1, offsetX: 0, offsetY: 0 });
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const viewportRef = useRef(null);
  const activePointersRef = useRef(new Map());
  const gestureRef = useRef(null);
  const markerDragRef = useRef(null);
  const zoomCooldownUntilRef = useRef(0);

  useEffect(() => {
    const stored = getStoredCapture(storageKey);
    setPhoto(stored.photo);
    setDrains(stored.drains);
    setOverlays(stored.overlays);
    setCurrentMarkers([]);
    setSelectedTool("");
    setPendingDrainId("");
    setShowSavePrompt(false);
    setDrainsLocked(stored.drains.length > 0);
    setShowDrainInstructions(false);
    setTransform({ scale: 1, offsetX: 0, offsetY: 0 });
    setStatus(stored.photo ? "Photo saved on this device for this page." : "No photo saved for this page yet.");
  }, [storageKey]);

  useEffect(() => {
    setStoredCapture(storageKey, { photo, drains, overlays });
  }, [drains, overlays, photo, storageKey]);

  function updatePhoto(nextPhoto) {
    setPhoto(nextPhoto);
    setDrains([]);
    setOverlays([]);
    setCurrentMarkers([]);
    setSelectedTool("");
    setPendingDrainId("");
    setShowSavePrompt(false);
    setShowDrainInstructions(Boolean(nextPhoto && enableMarkup));
    setDrainsLocked(false);
    setTransform({ scale: 1, offsetX: 0, offsetY: 0 });
    zoomCooldownUntilRef.current = 0;
    setStatus(nextPhoto ? (enableMarkup ? "Photo saved on this device. First mark the drain spots on the playfield, then press DONE." : "Photo saved on this device for this page.") : "No photo saved for this page yet.");
  }

  function readSelectedFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        updatePhoto(reader.result);
      }
    };
    reader.onerror = () => {
      setStatus("That photo could not be loaded.");
    };
    reader.readAsDataURL(file);
  }
  function addDrain(point) {
    const nextDrain = {
      id: `drain-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: "drain",
      x: point.x,
      y: point.y,
      createdAt: Date.now(),
    };
    setDrains((current) => [...current, nextDrain]);
    setStatus("Drain point placed.");
  }

  function addCurrentMarker(point, type) {
    const nextMarker = {
      id: `marker-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      x: point.x,
      y: point.y,
      createdAt: Date.now(),
    };
    setCurrentMarkers((current) => [...current, nextMarker]);
    setStatus(`${getMarkerAppearance(type).aria} placed.`);
  }

  function removeCurrentMarker(markerId) {
    setCurrentMarkers((current) => current.filter((marker) => marker.id !== markerId));
    setStatus("Marker removed.");
  }

  function moveCurrentMarker(markerId, point) {
    setCurrentMarkers((current) => current.map((marker) => (marker.id === markerId ? { ...marker, x: point.x, y: point.y } : marker)));
  }

  function moveDrainMarker(markerId, point) {
    setDrains((current) => current.map((marker) => (marker.id === markerId ? { ...marker, x: point.x, y: point.y } : marker)));
  }

  function removeDrainMarker(markerId) {
    setDrains((current) => current.filter((marker) => marker.id !== markerId));
    setStatus("Drain point removed.");
  }

  function undoLastMarker() {
    if (!drainsLocked) {
      setDrains((current) => {
        if (!current.length) {
          setStatus("No drain points to remove.");
          return current;
        }
        setStatus("Last drain point removed.");
        return current.slice(0, -1);
      });
      return;
    }

    setCurrentMarkers((current) => {
      if (!current.length) {
        setStatus("No current markers to remove.");
        return current;
      }
      setStatus("Last marker removed.");
      return current.slice(0, -1);
    });
  }

  function resetZoom() {
    setTransform({ scale: 1, offsetX: 0, offsetY: 0 });
  }

  function startPinch(rect, pointers) {
    zoomCooldownUntilRef.current = Date.now() + 750;
    const center = getCenter(pointers[0], pointers[1]);
    const viewportCenterX = center.x - rect.left;
    const viewportCenterY = center.y - rect.top;
    const anchor = screenToImage(viewportCenterX, viewportCenterY, transform, rect.width, rect.height);

    gestureRef.current = {
      mode: "pinch",
      initialDistance: getDistance(pointers[0], pointers[1]),
      initialScale: transform.scale,
      anchor,
      width: rect.width,
      height: rect.height,
    };
  }

  function handleViewportPointerDown(event) {
    if (!photo || !viewportRef.current) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const pointers = Array.from(activePointersRef.current.values());
    const rect = viewportRef.current.getBoundingClientRect();

    if (pointers.length === 1) {
      gestureRef.current = {
        mode: "single",
        startClientX: event.clientX,
        startClientY: event.clientY,
        startOffsetX: transform.offsetX,
        startOffsetY: transform.offsetY,
        moved: false,
        width: rect.width,
        height: rect.height,
      };
      return;
    }

    if (pointers.length === 2) {
      startPinch(rect, pointers);
    }
  }

  function handleViewportPointerMove(event) {
    if (!photo || !viewportRef.current || !activePointersRef.current.has(event.pointerId)) {
      return;
    }

    activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const pointers = Array.from(activePointersRef.current.values());
    const gesture = gestureRef.current;

    if (!gesture) {
      return;
    }

    if (pointers.length === 2) {
      zoomCooldownUntilRef.current = Date.now() + 750;
      const center = getCenter(pointers[0], pointers[1]);
      const nextScale = clamp(gesture.initialScale * (getDistance(pointers[0], pointers[1]) / Math.max(gesture.initialDistance, 1)), 1, 4);
      const rect = viewportRef.current.getBoundingClientRect();
      const localCenterX = center.x - rect.left;
      const localCenterY = center.y - rect.top;
      const rawOffsetX = localCenterX - (gesture.width / 2) - (((gesture.anchor.x * gesture.width) - (gesture.width / 2)) * nextScale);
      const rawOffsetY = localCenterY - (gesture.height / 2) - (((gesture.anchor.y * gesture.height) - (gesture.height / 2)) * nextScale);
      const clamped = clampOffset(rawOffsetX, rawOffsetY, nextScale, gesture.width, gesture.height);
      setTransform({ scale: nextScale, offsetX: clamped.x, offsetY: clamped.y });
      return;
    }

    if (pointers.length === 1 && gesture.mode === "single" && transform.scale > 1) {
      const deltaX = event.clientX - gesture.startClientX;
      const deltaY = event.clientY - gesture.startClientY;
      if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
        gestureRef.current = { ...gesture, moved: true };
      }
      const clamped = clampOffset(gesture.startOffsetX + deltaX, gesture.startOffsetY + deltaY, transform.scale, gesture.width, gesture.height);
      setTransform((current) => ({ ...current, offsetX: clamped.x, offsetY: clamped.y }));
    }
  }

  function handleViewportPointerUp(event) {
    if (!photo || !viewportRef.current) {
      return;
    }

    const gesture = gestureRef.current;
    const rect = viewportRef.current.getBoundingClientRect();
    const hadSingleTap = gesture && gesture.mode === "single" && !gesture.moved && activePointersRef.current.size === 1;

    activePointersRef.current.delete(event.pointerId);

    if (hadSingleTap) {
      if (Date.now() < zoomCooldownUntilRef.current) {
        setStatus("Wait a moment after zooming, then tap again to place a marker.");
        return;
      }

      if (!selectedTool) {
        setStatus(drainsLocked ? "Choose a color button, then tap the image to place one marker." : "Choose Drain, then tap the image to place one drain point.");
        return;
      }

      const localX = event.clientX - rect.left;
      const localY = event.clientY - rect.top;
      const point = screenToImage(localX, localY, transform, rect.width, rect.height);

      if (!drainsLocked) {
        if (selectedTool !== "drain") {
          setStatus("Only drain markers can be placed before you press DONE.");
          setSelectedTool("");
          return;
        }
        addDrain(point);
        setSelectedTool("");
      } else if (selectedTool === "drain") {
        setStatus("Drain markers are locked after DONE.");
        setSelectedTool("");
      } else {
        addCurrentMarker(point, selectedTool);
        setSelectedTool("");
      }
    }

    const pointers = Array.from(activePointersRef.current.values());
    if (pointers.length === 1) {
      gestureRef.current = {
        mode: "single",
        startClientX: pointers[0].x,
        startClientY: pointers[0].y,
        startOffsetX: transform.offsetX,
        startOffsetY: transform.offsetY,
        moved: false,
        width: rect.width,
        height: rect.height,
      };
    } else if (pointers.length === 2) {
      startPinch(rect, pointers);
    } else {
      gestureRef.current = null;
    }
  }

  function handleViewportPointerCancel(event) {
    activePointersRef.current.delete(event.pointerId);
    gestureRef.current = null;
  }
  function handleMarkerPointerDown(event, markerId, markerType) {
    if (!viewportRef.current) {
      return;
    }

    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    markerDragRef.current = {
      id: markerId,
      pointerId: event.pointerId,
      markerType,
      startClientX: event.clientX,
      startClientY: event.clientY,
      moved: false,
    };
  }

  function handleMarkerPointerMove(event, markerId, markerType) {
    if (!viewportRef.current || !markerDragRef.current || markerDragRef.current.id !== markerId || markerDragRef.current.pointerId !== event.pointerId) {
      return;
    }

    event.stopPropagation();

    if (markerType === "drain" && drainsLocked) {
      return;
    }

    const rect = viewportRef.current.getBoundingClientRect();
    const point = screenToImage(event.clientX - rect.left, event.clientY - rect.top, transform, rect.width, rect.height);
    if (Math.abs(event.clientX - markerDragRef.current.startClientX) > 3 || Math.abs(event.clientY - markerDragRef.current.startClientY) > 3) {
      markerDragRef.current = { ...markerDragRef.current, moved: true };
    }

    if (markerType === "drain") {
      moveDrainMarker(markerId, point);
      return;
    }

    moveCurrentMarker(markerId, point);
  }

  function handleMarkerPointerUp(event, markerId, markerType) {
    if (!markerDragRef.current || markerDragRef.current.id !== markerId || markerDragRef.current.pointerId !== event.pointerId) {
      return;
    }

    event.stopPropagation();
    const didMove = markerDragRef.current.moved;
    markerDragRef.current = null;

    if (!didMove) {
      if (markerType === "drain") {
        if (!drainsLocked) {
          removeDrainMarker(markerId);
          return;
        }

        if (currentMarkers.length < 2) {
          setStatus("Place at least two colored markers before tapping a drain to save a path.");
          return;
        }

        setPendingDrainId(markerId);
        setShowSavePrompt(true);
        setStatus("Review this path and save or cancel.");
        return;
      }

      removeCurrentMarker(markerId);
      return;
    }

    setStatus(markerType === "drain" ? "Drain point moved." : "Marker moved.");
  }

  function handleMarkerPointerCancel(event, markerId) {
    if (markerDragRef.current && markerDragRef.current.id === markerId && markerDragRef.current.pointerId === event.pointerId) {
      markerDragRef.current = null;
    }
  }

  function handleDone() {
    if (!drains.length) {
      setStatus("Place at least one drain point before pressing DONE.");
      return;
    }

    setShowDrainInstructions(false);
    setDrainsLocked(true);
    setSelectedTool("");
    setStatus("Drain spots locked. Choose a color button, then tap the image to build a path.");
  }

  function toggleOverlayVisibility(overlayId) {
    setOverlays((current) => current.map((overlay) => (overlay.id === overlayId ? { ...overlay, visible: !overlay.visible } : overlay)));
  }

  function setAllOverlayVisibility(visible) {
    setOverlays((current) => current.map((overlay) => ({ ...overlay, visible })));
  }

  function handleSaveOverlay() {
    const drain = drains.find((marker) => marker.id === pendingDrainId);
    if (!drain || currentMarkers.length < 2) {
      setShowSavePrompt(false);
      setPendingDrainId("");
      return;
    }

    const overlay = {
      id: `overlay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: `Path ${overlays.length + 1}`,
      drainId: drain.id,
      markers: currentMarkers,
      gameNumber: typeof gameNumber === "number" ? gameNumber : null,
      ballNumber: typeof ballNumber === "number" ? ballNumber : null,
      visible: false,
      createdAt: Date.now(),
    };

    setOverlays((current) => [...current, overlay]);
    setCurrentMarkers([]);
    setShowSavePrompt(false);
    setPendingDrainId("");
    setStatus("Path saved as a reusable layer on this image.");
  }

  function handleCancelOverlay() {
    setShowSavePrompt(false);
    setPendingDrainId("");
    setStatus("Path save canceled. Keep editing the current markers.");
  }

  const pendingDrain = drains.find((marker) => marker.id === pendingDrainId) || null;

  return (
    <section className="cameraCard">
      <div className="cameraKicker">Classroom Camera</div>
      <div className="cameraTitle">{title}</div>
      <div className="cameraHint">{hint}</div>

      <div className="cameraActions">
        <button type="button" className="cameraButton cameraButtonPrimary" onClick={() => cameraInputRef.current?.click()}>
          Take photo
        </button>
        <button type="button" className="cameraButton" onClick={() => galleryInputRef.current?.click()}>
          Choose photo
        </button>
        {photo ? (
          <button type="button" className="cameraButton cameraButtonGhost" onClick={() => updatePhoto("")}>
            Remove photo
          </button>
        ) : null}
      </div>

      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="cameraInput" onChange={readSelectedFile} />
      <input ref={galleryInputRef} type="file" accept="image/*" className="cameraInput" onChange={readSelectedFile} />

      {photo ? (
        enableMarkup ? (
          <>
            <div className="cameraPreviewWrap cameraPreviewWrapMarkup">
              <div
                ref={viewportRef}
                className="cameraViewport"
                onPointerDown={handleViewportPointerDown}
                onPointerMove={handleViewportPointerMove}
                onPointerUp={handleViewportPointerUp}
                onPointerCancel={handleViewportPointerCancel}
              >
                {showDrainInstructions ? (
                  <div className="instructionBubble">
                    <div className="instructionBubbleBody">First mark the drain spots on the playfield. Press DONE when finished.</div>
                  </div>
                ) : null}

                {showSavePrompt ? (
                  <div className="savePromptBackdrop">
                    <div className="savePromptCard">
                      <div className="savePromptTitle">Save this ball path?</div>
                      <div className="savePromptCopy">The current dots and the line to the selected drain will be saved as a layer on this image.</div>
                      <div className="savePromptActions">
                        <button type="button" className="cameraButton cameraButtonPrimary" onClick={handleSaveOverlay}>
                          Save
                        </button>
                        <button type="button" className="cameraButton" onClick={handleCancelOverlay}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div
                  className="cameraStage"
                  style={{
                    transform: `translate(${transform.offsetX}px, ${transform.offsetY}px) scale(${transform.scale})`,
                  }}
                >
                  <img src={photo} alt="Classroom reference" className="cameraPreview" draggable="false" />
                  <svg className="cameraLines" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
                    {overlays.filter((overlay) => overlay.visible).flatMap((overlay) => renderPathLines(overlay.markers, drains.find((marker) => marker.id === overlay.drainId), overlay.id, "saved"))}
                    {renderPathLines(currentMarkers, pendingDrain, "current", "current")}
                  </svg>
                  {drains.map((marker) => {
                    const appearance = getMarkerAppearance(marker.type);
                    return (
                      <button
                        key={marker.id}
                        type="button"
                        aria-label={appearance.aria}
                        className={`marker ${appearance.className} ${drainsLocked ? "markerLocked" : ""}`}
                        style={{ left: `${marker.x * 100}%`, top: `${marker.y * 100}%` }}
                        onPointerDown={(event) => handleMarkerPointerDown(event, marker.id, "drain")}
                        onPointerMove={(event) => handleMarkerPointerMove(event, marker.id, "drain")}
                        onPointerUp={(event) => handleMarkerPointerUp(event, marker.id, "drain")}
                        onPointerCancel={(event) => handleMarkerPointerCancel(event, marker.id)}
                      />
                    );
                  })}

                  {currentMarkers.map((marker) => {
                    const appearance = getMarkerAppearance(marker.type);
                    return (
                      <button
                        key={marker.id}
                        type="button"
                        aria-label={appearance.aria}
                        className={`marker ${appearance.className}`}
                        style={{ left: `${marker.x * 100}%`, top: `${marker.y * 100}%` }}
                        onPointerDown={(event) => handleMarkerPointerDown(event, marker.id, marker.type)}
                        onPointerMove={(event) => handleMarkerPointerMove(event, marker.id, marker.type)}
                        onPointerUp={(event) => handleMarkerPointerUp(event, marker.id, marker.type)}
                        onPointerCancel={(event) => handleMarkerPointerCancel(event, marker.id)}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="toolBar" role="toolbar" aria-label="Shot markup tools">
              {MARKER_TOOLS.filter((tool) => (drainsLocked ? tool.key !== "drain" : tool.key === "drain")).map((tool) => (
                <button
                  key={tool.key}
                  type="button"
                  className={`toolButton toolButton${tool.key[0].toUpperCase()}${tool.key.slice(1)} ${selectedTool === tool.key ? "toolButtonActive" : ""}`}
                  onClick={() => {
                    const nextTool = selectedTool === tool.key ? "" : tool.key;
                    setSelectedTool(nextTool);
                    setStatus(
                      nextTool
                        ? tool.key === "drain"
                          ? "Drain marker selected. Tap the image once to place one drain marker."
                          : `${tool.label} marker selected. Tap the image once to place one marker.`
                        : "No marker selected. Choose a button, then tap the image."
                    );
                  }}
                >
                  {tool.label}
                </button>
              ))}
            </div>

            {!drainsLocked ? (
              <button type="button" className="cameraButton cameraButtonPrimary cameraDoneButton" onClick={handleDone}>
                DONE
              </button>
            ) : null}

            <div className="selectionRow">
              <span>{drainsLocked ? `Drains: ${drains.length} | Current dots: ${currentMarkers.length}` : `Drains: ${drains.length}`}</span>
              <button type="button" className="cameraButton cameraButtonMini" onClick={undoLastMarker}>
                Undo last
              </button>
              <button type="button" className="cameraButton cameraButtonMini" onClick={resetZoom}>
                Reset zoom
              </button>
            </div>

            {typeof gameNumber === "number" && typeof ballNumber === "number" ? (
              <div className="testControls">
                <div className="testControlGroup">
                  <span className="testControlLabel">Game {gameNumber}</span>
                  <button type="button" className="cameraButton cameraButtonMini" onClick={() => onGameNumberChange?.(Math.max(1, gameNumber - 1))} disabled={!onGameNumberChange || gameNumber <= 1}>
                    -
                  </button>
                  <button type="button" className="cameraButton cameraButtonMini" onClick={() => onGameNumberChange?.(gameNumber + 1)} disabled={!onGameNumberChange}>
                    +
                  </button>
                </div>
                <div className="testControlGroup">
                  <span className="testControlLabel">Ball {ballNumber}</span>
                  <button type="button" className="cameraButton cameraButtonMini" onClick={() => onBallNumberChange?.(Math.max(1, ballNumber - 1))} disabled={!onBallNumberChange || ballNumber <= 1}>
                    -
                  </button>
                  <button type="button" className="cameraButton cameraButtonMini" onClick={() => onBallNumberChange?.(Math.min(maxBallNumber ?? ballNumber + 1, ballNumber + 1))} disabled={!onBallNumberChange || (typeof maxBallNumber === "number" && ballNumber >= maxBallNumber)}>
                    +
                  </button>
                </div>
              </div>
            ) : null}

            {drainsLocked && overlays.length ? (
              <div className="layerPanel">
                <div className="layerPanelHeader">
                  <div className="layerPanelTitle">Saved Ball Paths</div>
                  <div className="layerPanelActions">
                    <button type="button" className="cameraButton cameraButtonMini" onClick={() => setAllOverlayVisibility(true)}>
                      Show all
                    </button>
                    <button type="button" className="cameraButton cameraButtonMini" onClick={() => setAllOverlayVisibility(false)}>
                      Hide all
                    </button>
                  </div>
                </div>
                <div className="layerChips">
                  {overlays.map((overlay) => (
                    <button
                      key={overlay.id}
                      type="button"
                      className={`layerChip ${overlay.visible ? "layerChipActive" : ""}`}
                      onClick={() => toggleOverlayVisibility(overlay.id)}
                    >
                      {overlay.name}{overlay.gameNumber ? ` G${overlay.gameNumber}` : ""}{overlay.ballNumber ? ` B${overlay.ballNumber}` : ""} {overlaySummary(overlay)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="cameraPreviewWrap">
            <img src={photo} alt="Classroom reference" className="cameraPreviewStatic" />
          </div>
        )
      ) : null}

      <div className="cameraStatus">{status}</div>

      <style jsx>{`
        .cameraCard {
          padding: 14px;
          border-radius: 16px;
          border: 1px solid rgba(165, 190, 232, 0.18);
          background: linear-gradient(180deg, rgba(26, 47, 85, 0.88), rgba(12, 24, 46, 0.96));
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
        }

        .cameraKicker {
          color: #9dc4ff;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .cameraTitle {
          margin-top: 6px;
          color: #f7f4e6;
          font-size: 18px;
          font-weight: 800;
        }

        .cameraHint {
          margin-top: 8px;
          color: #c8d6ef;
          font-size: 13px;
          line-height: 1.5;
        }

        .cameraActions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 14px;
        }

        .cameraButton {
          min-height: 36px;
          padding: 0 14px;
          border-radius: 999px;
          border: 1px solid rgba(165, 190, 232, 0.22);
          background: rgba(255, 255, 255, 0.07);
          color: #d7e4ff;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }
        .cameraButtonPrimary {
          background: linear-gradient(180deg, rgba(76, 163, 255, 0.55), rgba(47, 121, 231, 0.4));
          border-color: rgba(143, 195, 255, 0.58);
          color: #ffffff;
        }

        .cameraButtonGhost {
          background: rgba(255, 255, 255, 0.03);
          color: #b8c8e6;
        }

        .cameraButtonMini {
          min-height: 32px;
          padding: 0 12px;
        }

        .cameraInput {
          display: none;
        }

        .cameraPreviewWrap {
          margin-top: 14px;
          border-radius: 16px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(165, 190, 232, 0.12);
        }

        .cameraPreviewWrapMarkup {
          width: min(100%, 94%);
          margin-left: auto;
          margin-right: auto;
        }

        .cameraViewport {
          position: relative;
          width: 100%;
          min-height: 440px;
          height: min(72vh, 680px);
          overflow: hidden;
          touch-action: none;
          background: rgba(4, 12, 26, 0.92);
        }

        .cameraStage {
          position: absolute;
          inset: 0;
          transform-origin: center center;
        }

        .cameraPreview {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain;
          user-select: none;
          pointer-events: none;
        }

        .cameraPreviewStatic {
          display: block;
          width: 100%;
          max-height: 420px;
          object-fit: contain;
          background: rgba(4, 12, 26, 0.92);
        }

        .cameraLines {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          overflow: visible;
        }

        .marker {
          position: absolute;
          width: 12px;
          height: 12px;
          margin-left: -6px;
          margin-top: -6px;
          border: 1px solid rgba(255, 255, 255, 0.82);
          border-radius: 50%;
          font-size: 0;
          display: block;
          box-shadow: inset -1px -2px 3px rgba(0, 0, 0, 0.28), inset 2px 2px 3px rgba(255, 255, 255, 0.34), 0 3px 8px rgba(0, 0, 0, 0.32);
          cursor: pointer;
          z-index: 2;
        }

        .marker::after {
          content: "";
          position: absolute;
          top: 1px;
          left: 2px;
          width: 4px;
          height: 3px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.62);
          transform: rotate(-28deg);
        }

        .markerStart {
          background: radial-gradient(circle at 30% 30%, #b8ffd0 0%, #45d26f 42%, #1d8f43 100%);
        }

        .markerPath {
          background: radial-gradient(circle at 30% 30%, #fff0a6 0%, #f7d445 44%, #b98a10 100%);
        }

        .markerError {
          background: radial-gradient(circle at 30% 30%, #ffc5bf 0%, #f06b63 42%, #9b2f28 100%);
        }

        .markerDrain {
          background: radial-gradient(circle at 30% 30%, #ffffff 0%, #dbe7ff 48%, #8ca4ca 100%);
          width: 8px;
          height: 8px;
          margin-left: -4px;
          margin-top: -4px;
          border-radius: 3px;
        }

        .markerLocked {
          box-shadow: inset -1px -2px 3px rgba(0, 0, 0, 0.32), inset 2px 2px 3px rgba(255, 255, 255, 0.34), 0 0 0 1px rgba(186, 212, 255, 0.3), 0 3px 8px rgba(0, 0, 0, 0.32);
        }

        .toolBar {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
          margin-top: 12px;
        }

        .toolButton {
          min-height: 34px;
          padding: 0 8px;
          border-radius: 12px;
          border: 1px solid rgba(165, 190, 232, 0.22);
          background: rgba(255, 255, 255, 0.06);
          color: #d7e4ff;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }
        .toolButtonStart.toolButtonActive {
          background: linear-gradient(180deg, rgba(84, 192, 118, 0.88), rgba(31, 132, 64, 0.88));
          border-color: rgba(162, 237, 183, 0.72);
          color: #ffffff;
        }

        .toolButtonPath.toolButtonActive {
          background: linear-gradient(180deg, rgba(247, 212, 69, 0.92), rgba(185, 138, 16, 0.88));
          border-color: rgba(255, 234, 150, 0.75);
          color: #1f1a07;
        }

        .toolButtonError.toolButtonActive {
          background: linear-gradient(180deg, rgba(240, 107, 99, 0.92), rgba(155, 47, 40, 0.9));
          border-color: rgba(255, 193, 186, 0.72);
          color: #ffffff;
        }

        .toolButtonDrain.toolButtonActive {
          background: linear-gradient(180deg, rgba(244, 247, 255, 0.96), rgba(167, 184, 214, 0.9));
          border-color: rgba(255, 255, 255, 0.88);
          color: #173052;
        }

        .cameraDoneButton {
          width: 100%;
          margin-top: 10px;
          min-height: 42px;
          font-size: 13px;
          letter-spacing: 0.06em;
        }

        .selectionRow {
          margin-top: 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          color: #bfd0ea;
          font-size: 12px;
          font-weight: 700;
        }

        .testControls {
          margin-top: 10px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .testControlGroup {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 12px;
          border: 1px solid rgba(165, 190, 232, 0.18);
          background: rgba(255, 255, 255, 0.05);
        }

        .testControlLabel {
          color: #e7efff;
          font-size: 12px;
          font-weight: 800;
          min-width: 48px;
        }

        .instructionBubble {
          position: absolute;
          top: 14px;
          left: 14px;
          right: 14px;
          z-index: 4;
          pointer-events: none;
        }

        .instructionBubbleBody {
          position: relative;
          padding: 14px 16px;
          border-radius: 16px;
          background: #ffffff;
          color: #0f2144;
          font-size: 13px;
          font-weight: 800;
          line-height: 1.45;
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.22);
        }

        .instructionBubbleBody::after {
          content: "";
          position: absolute;
          left: 22px;
          bottom: -10px;
          width: 18px;
          height: 18px;
          background: #ffffff;
          clip-path: polygon(0 0, 100% 0, 0 100%);
          transform: rotate(-18deg);
        }

        .savePromptBackdrop {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          background: rgba(3, 10, 24, 0.48);
          z-index: 6;
        }

        .savePromptCard {
          width: min(100%, 320px);
          padding: 18px;
          border-radius: 18px;
          border: 1px solid rgba(165, 190, 232, 0.18);
          background: rgba(14, 29, 56, 0.96);
          box-shadow: 0 18px 36px rgba(0, 0, 0, 0.28);
        }

        .savePromptTitle {
          color: #f7f4e6;
          font-size: 17px;
          font-weight: 800;
        }

        .savePromptCopy {
          margin-top: 8px;
          color: #d1def6;
          font-size: 13px;
          line-height: 1.5;
        }

        .savePromptActions {
          display: flex;
          gap: 8px;
          margin-top: 14px;
        }

        .layerPanel {
          margin-top: 12px;
          padding: 12px;
          border-radius: 14px;
          border: 1px solid rgba(165, 190, 232, 0.18);
          background: rgba(255, 255, 255, 0.05);
        }

        .layerPanelHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .layerPanelTitle {
          color: #eef4ff;
          font-size: 13px;
          font-weight: 800;
        }

        .layerPanelActions {
          display: flex;
          gap: 8px;
        }

        .layerChips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
        }

        .layerChip {
          min-height: 32px;
          padding: 0 12px;
          border-radius: 999px;
          border: 1px solid rgba(165, 190, 232, 0.18);
          background: rgba(255, 255, 255, 0.05);
          color: #cddbf6;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .layerChipActive {
          background: rgba(93, 161, 255, 0.24);
          border-color: rgba(143, 195, 255, 0.42);
          color: #ffffff;
        }

        .cameraStatus {
          margin-top: 12px;
          color: #aebfdc;
          font-size: 12px;
          line-height: 1.45;
        }
      `}</style>
    </section>
  );
}
