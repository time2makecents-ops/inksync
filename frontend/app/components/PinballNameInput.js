"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const OPDB_TYPEAHEAD_URL = "https://opdb.org/api/search/typeahead";

async function fetchSuggestions(query, signal) {
  const params = new URLSearchParams({
    q: query,
    include_groups: "1",
    include_aliases: "1",
  });

  const response = await fetch(`${OPDB_TYPEAHEAD_URL}?${params.toString()}`, {
    signal,
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Could not load machine suggestions.");
  }

  return response.json();
}

export default function PinballNameInput({
  id,
  value,
  onValueChange,
  onSuggestionSelect,
  placeholder = "Enter machine name",
  actionLabel = "Use machine name",
  onAction,
  disabled = false,
  className = "",
  inputClassName = "",
  actionClassName = "",
  dropdownClassName = "",
  suggestionButtonClassName = "",
  statusClassName = "",
  leadingIcon = null,
  wrapClassName = "",
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);

  const trimmedValue = value.trim();
  const shouldSuggest = trimmedValue.length >= 2;

  useEffect(() => {
    function handlePointerDown(event) {
      if (!wrapperRef.current?.contains(event.target)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    if (!shouldSuggest) {
      setSuggestions([]);
      setLoading(false);
      setError("");
      return undefined;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError("");
        const results = await fetchSuggestions(trimmedValue, controller.signal);
        setSuggestions(Array.isArray(results) ? results.slice(0, 8) : []);
      } catch (fetchError) {
        if (fetchError.name !== "AbortError") {
          setSuggestions([]);
          setError(fetchError.message || "Could not load machine suggestions.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [trimmedValue, shouldSuggest]);

  const showDropdown =
    showSuggestions &&
    shouldSuggest &&
    !disabled &&
    (loading || error || suggestions.length > 0);

  const statusText = useMemo(() => {
    if (!shouldSuggest || !showSuggestions) {
      return "";
    }
    if (loading) {
      return "Searching OPDB...";
    }
    if (error) {
      return error;
    }
    if (!suggestions.length) {
      return "No exact machine suggestions found yet.";
    }
    return "";
  }, [error, loading, shouldSuggest, showSuggestions, suggestions.length]);

  function handleSuggestionClick(suggestion) {
    onValueChange(suggestion.text ?? suggestion.name ?? "");
    onSuggestionSelect?.(suggestion);
    setShowSuggestions(false);
  }

  return (
    <div className={`pinballNameInput ${className}`.trim()} ref={wrapperRef}>
      <div className={`machineInputWrap ${wrapClassName}`.trim()}>
        {leadingIcon ? (
          <span className="machineInputIcon" aria-hidden="true">
            {leadingIcon}
          </span>
        ) : null}
        <input
          id={id}
          type="text"
          value={value}
          onChange={(event) => {
            onValueChange(event.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => {
            if (shouldSuggest) {
              setShowSuggestions(true);
            }
          }}
          placeholder={placeholder}
          className={inputClassName || "machineInput"}
          autoComplete="off"
          disabled={disabled}
        />
        <button
          type="button"
          className={actionClassName || "machineInputAction"}
          aria-label={actionLabel}
          onClick={onAction}
          disabled={disabled}
        >
          &#10148;
        </button>
      </div>

      {showDropdown ? (
        <div className={dropdownClassName || "machineSuggestionDropdown"}>
          {statusText ? (
            <div className={statusClassName || "machineSuggestionStatus"}>{statusText}</div>
          ) : null}

          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              className={suggestionButtonClassName || "machineSuggestionButton"}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <span className="machineSuggestionName">
                {suggestion.text ?? suggestion.name}
              </span>
              {suggestion.supplementary ? (
                <span className="machineSuggestionMeta">{suggestion.supplementary}</span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      <style jsx>{`
        .pinballNameInput {
          position: relative;
        }

        .machineInputWrap {
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 42px;
          padding: 0 6px 0 12px;
          border-radius: 12px;
          border: 1px solid rgba(138, 173, 232, 0.24);
          background: rgba(41, 72, 118, 0.42);
        }

        .machineInputIcon {
          font-size: 14px;
          opacity: 0.88;
          flex: 0 0 auto;
        }

        .machineInput {
          width: 100%;
          min-width: 0;
          min-height: 42px;
          border: 0;
          outline: 0;
          background: transparent;
          color: #f3f7ff;
          font-size: 14px;
        }

        .machineInput::placeholder {
          color: #9db1d1;
        }

        .machineInputAction {
          width: 34px;
          height: 34px;
          flex: 0 0 34px;
          border: 0;
          border-radius: 8px;
          background: linear-gradient(180deg, #4ca3ff 0%, #2f79e7 100%);
          color: #ffffff;
          font-size: 16px;
          font-weight: 700;
          line-height: 1;
          cursor: pointer;
        }

        .machineInputAction:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .machineSuggestionDropdown {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          z-index: 10;
          display: grid;
          gap: 6px;
          padding: 8px;
          max-height: 240px;
          overflow-y: auto;
          border-radius: 14px;
          background: rgba(10, 21, 41, 0.98);
          border: 1px solid rgba(165, 190, 232, 0.2);
          box-shadow: 0 16px 28px rgba(0, 0, 0, 0.28);
          scrollbar-width: thin;
        }

        .machineSuggestionStatus {
          padding: 8px 10px;
          border-radius: 10px;
          color: #a9bddf;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.4;
          background: rgba(255, 255, 255, 0.04);
        }

        .machineSuggestionButton {
          padding: 10px 12px;
          border: 1px solid rgba(165, 190, 232, 0.16);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.05);
          color: #f3f7ff;
          text-align: left;
          display: grid;
          gap: 3px;
          cursor: pointer;
        }

        .machineSuggestionName {
          font-size: 13px;
          font-weight: 800;
          color: #f0f5ff;
        }

        .machineSuggestionMeta {
          font-size: 11px;
          font-weight: 700;
          color: #9dc4ff;
        }
      `}</style>
    </div>
  );
}
