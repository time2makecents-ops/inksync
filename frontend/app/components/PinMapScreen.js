"use client";

import { useRouter } from "next/navigation";
import { navigateBackWithinApp } from "../../lib/navigation";
import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "../../lib/api";

const NAV_ITEMS = [
  { label: "Account", href: "/account" },
  { label: "Analytics", href: "/analytics" },
  { label: "PinMap", href: "/pinmap" },
  { label: "Home", href: "/" },
  { label: "Classroom", href: "/classroom" },
];
const DEFAULT_QUERY = "97402";
const QUICK_SEARCHES = ["97402", "Eugene", "Portland", "Seattle"];

function LoadingLabel({ label }) {
  return (
    <span className="loadingLabel">
      {label}
      <span className="loadingDots" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
    </span>
  );
}

function buildMeta(location) {
  return [location.city, location.state || location.country].filter(Boolean).join(", ");
}

function buildDirectionsUrl(location) {
  const parts = [location.name, location.street, location.city, location.state, location.zip_code].filter(Boolean);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(", "))}`;
}

export default function PinMapScreen() {
  const router = useRouter();

  function handleBack() {
    navigateBackWithinApp(router, "/");
  }

  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("Searching nearby locations...");
  const [banner, setBanner] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [submittedQuery, setSubmittedQuery] = useState(DEFAULT_QUERY);
  const [expandedLocationId, setExpandedLocationId] = useState(null);
  const [machineMap, setMachineMap] = useState({});
  const [loadingLocationId, setLoadingLocationId] = useState(null);

  useEffect(() => {
    searchLocations(DEFAULT_QUERY);
  }, []);

  async function searchLocations(nextQuery) {
    const cleaned = nextQuery.trim();
    if (!cleaned) {
      setBanner({ type: "error", message: "Enter a ZIP code, city, or place name." });
      return;
    }

    setIsLoading(true);
    setBanner(null);

    try {
      const data = await apiFetch(`/pinmap/search?q=${encodeURIComponent(cleaned)}`);
      const nextResults = data.locations ?? [];
      setResults(nextResults);
      setExpandedLocationId(null);
      setMachineMap({});
      setSubmittedQuery(cleaned);
      setStatus(nextResults.length ? "" : `No public pinball locations found for ${cleaned}.`);
    } catch (error) {
      setResults([]);
      setExpandedLocationId(null);
      setStatus("");
      setBanner({ type: "error", message: error.message });
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    searchLocations(query);
  }

  function handleQuickSearch(nextQuery) {
    setQuery(nextQuery);
    searchLocations(nextQuery);
  }

  async function handleMachineListToggle(location) {
    const isExpanded = expandedLocationId === location.id;
    if (isExpanded) {
      setExpandedLocationId(null);
      return;
    }

    if (!machineMap[location.id]) {
      setLoadingLocationId(location.id);
      try {
        const data = await apiFetch(`/pinmap/locations/${location.id}/machines`);
        setMachineMap((current) => ({
          ...current,
          [location.id]: data.machines ?? [],
        }));
      } catch (error) {
        setBanner({ type: "error", message: error.message });
        setLoadingLocationId(null);
        return;
      }
      setLoadingLocationId(null);
    }

    setExpandedLocationId(location.id);
  }

  const summary = useMemo(() => {
    if (!results.length) {
      return "";
    }

    const totalMachines = results.reduce((count, location) => count + location.machine_count, 0);
    return `${results.length} locations | ${totalMachines} machines for ${submittedQuery}`;
  }, [results, submittedQuery]);

  return (
    <div className="screen">
      <div className="phoneShell">
        <header className="topBar">
          <button type="button" className="navArrow" aria-label="Back" onClick={handleBack}>
            &#8249;
          </button>
          <h1>PinMap</h1>
          <div className="spacer" />
        </header>

        <main className="content">
          <section className="heroCard">
            <div className="heroTitle">Find public machines nearby</div>
            <div className="heroSubtitle">Pinball Map powered search for ZIP codes, cities, and place names.</div>
          </section>

          {banner ? (
            <div className={`feedbackBanner ${banner.type}`}>{banner.message}</div>
          ) : null}

          <section className="sectionCard">
            <div className="sectionHeader">
              <div>
                <div className="sectionKicker">Search</div>
                <h2>Where to play</h2>
              </div>
            </div>

            <form className="searchForm" onSubmit={handleSubmit}>
              <label htmlFor="pinmap-query">ZIP code, city, or place</label>
              <div className="searchRow">
                <input
                  id="pinmap-query"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="97402"
                />
                <button type="submit" className="searchButton" disabled={isLoading}>
                  {isLoading ? <LoadingLabel label="Searching" /> : "Search"}
                </button>
              </div>
            </form>

            <div className="quickSearchRow" aria-label="Quick searches">
              {QUICK_SEARCHES.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`quickSearchButton ${submittedQuery === item ? "quickSearchButtonActive" : ""}`}
                  onClick={() => handleQuickSearch(item)}
                  disabled={isLoading}
                >
                  {item}
                </button>
              ))}
            </div>

            {summary ? <div className="summaryPill">{summary}</div> : null}
            {status ? <div className="emptyState">{status}</div> : null}
          </section>

          <section className="resultsList">
            {results.map((location) => {
              const isExpanded = expandedLocationId === location.id;
              const fetchedMachines = machineMap[location.id] ?? [];
              const fallbackMachines = location.machine_names.map((name) => ({ name, manufacturer: null, year: null }));
              const machines = fetchedMachines.length ? fetchedMachines : fallbackMachines;
              const visibleMachines = isExpanded ? machines : [];
              const isLoadingMachines = loadingLocationId === location.id;

              return (
                <article key={location.id} className="locationCard">
                  <div className="locationTop">
                    <div>
                      <h3>{location.name}</h3>
                      <p className="locationMeta">{buildMeta(location) || "Location details unavailable"}</p>
                    </div>
                    <div className="machineBadge">{location.machine_count}</div>
                  </div>

                  <div className="locationInfo">
                    {location.street ? <p>{location.street}</p> : null}
                    {location.zip_code ? <p>ZIP {location.zip_code}</p> : null}
                    {location.region ? <p>Region: {location.region}</p> : null}
                  </div>

                  <div className="locationActions">
                    <a className="actionChip" href={buildDirectionsUrl(location)} target="_blank" rel="noreferrer">
                      Directions
                    </a>
                    {location.website ? (
                      <a className="actionChip" href={location.website} target="_blank" rel="noreferrer">
                        Website
                      </a>
                    ) : null}
                    <button
                      type="button"
                      className="actionChip"
                      onClick={() => handleMachineListToggle(location)}
                    >
                      {isLoadingMachines
                        ? "Loading games..."
                        : isExpanded
                          ? "Hide games"
                          : `Show games${location.machine_count ? ` (${location.machine_count})` : ""}`}
                    </button>
                  </div>

                  <div className={`machineList ${isExpanded ? "machineListExpanded" : ""}`}>
                    {visibleMachines.length ? (
                      visibleMachines.map((machine) => (
                        <span key={`${location.id}-${machine.name}`} className="machineChip">
                          {machine.name}
                          {machine.year ? ` (${machine.year})` : ""}
                        </span>
                      ))
                    ) : isLoadingMachines ? (
                      <span className="machineChip machineChipMuted">Loading machine list...</span>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </section>
        </main>

        <nav className="bottomNav" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`navItem ${item.label === "PinMap" ? "navItemActive" : ""} ${!item.href ? "navItemDisabled" : ""}`}
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

      <style jsx>{`
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

        h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 800;
          color: #f7f4e6;
        }

        .navArrow,
        .navItem,
        .searchButton,
        .quickSearchButton,
        .actionChip {
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
          display: grid;
          align-content: start;
          gap: 12px;
        }

        .heroCard,
        .sectionCard,
        .locationCard {
          padding: 14px;
          border-radius: 16px;
          border: 1px solid rgba(165, 190, 232, 0.18);
          background: linear-gradient(180deg, rgba(26, 47, 85, 0.86), rgba(12, 24, 46, 0.94));
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);
        }

        .heroTitle {
          font-size: 18px;
          font-weight: 800;
          color: #f7f4e6;
        }

        .heroSubtitle {
          margin-top: 6px;
          font-size: 13px;
          line-height: 1.45;
          color: #bfd0eb;
        }

        .feedbackBanner {
          padding: 12px 14px;
          border-radius: 14px;
          font-size: 13px;
          font-weight: 700;
        }

        .feedbackBanner.error {
          background: rgba(136, 32, 50, 0.32);
          color: #ffd8dd;
          border: 1px solid rgba(255, 148, 166, 0.28);
        }

        .sectionHeader {
          margin-bottom: 12px;
        }

        .sectionKicker {
          margin-bottom: 4px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #8fb7ff;
        }

        .searchForm label {
          display: block;
          margin-bottom: 8px;
          font-size: 12px;
          font-weight: 700;
          color: #c9d8f0;
        }

        .searchRow {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
        }

        input {
          width: 100%;
          height: 42px;
          padding: 0 12px;
          border-radius: 10px;
          border: 1px solid rgba(165, 190, 232, 0.2);
          background: rgba(13, 25, 47, 0.68);
          color: #f3f7ff;
          font-size: 14px;
          outline: none;
        }

        input::placeholder {
          color: #8ba4cb;
        }

        input:focus {
          border-color: rgba(105, 169, 255, 0.6);
          box-shadow: 0 0 0 3px rgba(105, 169, 255, 0.14);
        }

        .searchButton {
          min-width: 104px;
          height: 42px;
          padding: 0 14px;
          border: 0;
          border-radius: 10px;
          background: linear-gradient(180deg, #69a9ff 0%, #2f6fe3 100%);
          color: #fff;
          font-size: 13px;
          font-weight: 800;
        }

        .searchButton:disabled,
        .quickSearchButton:disabled {
          opacity: 0.66;
          cursor: wait;
        }

        .quickSearchRow {
          margin-top: 12px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .quickSearchButton,
        .actionChip {
          min-height: 34px;
          padding: 0 12px;
          border-radius: 999px;
          border: 1px solid rgba(165, 190, 232, 0.18);
          background: rgba(16, 31, 58, 0.72);
          color: #dce8fb;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .quickSearchButtonActive {
          background: linear-gradient(180deg, #69a9ff 0%, #2f6fe3 100%);
          border-color: rgba(147, 190, 255, 0.56);
          color: #fff;
        }

        .summaryPill {
          margin-top: 12px;
          display: inline-flex;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(105, 169, 255, 0.16);
          color: #dce8fb;
          font-size: 12px;
          font-weight: 700;
        }

        .emptyState {
          margin-top: 12px;
          font-size: 13px;
          line-height: 1.45;
          color: #bfd0eb;
        }

        .resultsList {
          display: grid;
          gap: 12px;
        }

        .locationTop {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 12px;
          align-items: start;
        }

        h3 {
          margin: 0;
          font-size: 17px;
          font-weight: 800;
          color: #f7f4e6;
        }

        .locationMeta {
          margin: 4px 0 0;
          font-size: 12px;
          color: #8fb7ff;
        }

        .machineBadge {
          min-width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: linear-gradient(180deg, #42d392 0%, #1e9e66 100%);
          color: #fff;
          font-size: 15px;
          font-weight: 800;
        }

        .locationInfo {
          margin-top: 10px;
          display: grid;
          gap: 4px;
          font-size: 12px;
          color: #c6d5ee;
        }

        .locationInfo p {
          margin: 0;
        }

        .locationActions {
          margin-top: 12px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .machineList {
          margin-top: 12px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .machineListExpanded {
          display: grid;
          gap: 8px;
        }

        .machineChip {
          padding: 7px 10px;
          border-radius: 999px;
          background: rgba(16, 31, 58, 0.72);
          border: 1px solid rgba(165, 190, 232, 0.16);
          color: #dbe6f9;
          font-size: 12px;
          font-weight: 700;
        }

        .machineListExpanded .machineChip {
          width: 100%;
          justify-content: flex-start;
          border-radius: 12px;
          display: flex;
        }

        .machineChipMuted {
          color: #9fb3d7;
        }

        .loadingLabel {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .loadingDots {
          display: inline-flex;
          gap: 3px;
        }

        .loadingDots span {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: currentColor;
          animation: pulse 1.2s infinite ease-in-out;
        }

        .loadingDots span:nth-child(2) {
          animation-delay: 0.15s;
        }

        .loadingDots span:nth-child(3) {
          animation-delay: 0.3s;
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
        @media (max-width: 520px) {
          .screen {
            padding: 0;
            background:
              radial-gradient(circle at top, rgba(50, 87, 150, 0.34), rgba(16, 38, 73, 0) 32%),
              linear-gradient(180deg, #102649 0%, #08172d 100%);
          }

          .phoneShell {
            width: 100vw;
            max-width: 100vw;
            min-height: 100vh;
            border: 0;
            border-radius: 0;
            box-shadow: none;
          }
        }

        @keyframes pulse {
          0%, 80%, 100% {
            opacity: 0.4;
            transform: translateY(0);
          }

          40% {
            opacity: 1;
            transform: translateY(-1px);
          }
        }
      `}</style>
    </div>
  );
}



