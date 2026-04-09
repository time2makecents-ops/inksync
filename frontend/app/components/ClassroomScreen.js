"use client";

import { useRouter } from "next/navigation";
import { navigateBackWithinApp } from "../../lib/navigation";
import RoomShell from "./RoomShell";

const NAV_ITEMS = [
  { label: "Controller", href: "/controller" },
  { label: "Setup", href: "/prepare-session" },
  { label: "Calibration", href: "/calibration" },
  { label: "Overlay", href: "/overlay-calibration" },
  { label: "Reveal", href: "/signature-reveal-calibration" },
  { label: "Watch", href: "/watch" },
];

const LAB_CARDS = [
  {
    title: "General Calibration",
    subtitle: "Open baseline camera and setup calibration tools.",
    href: "/calibration",
    accent: "#4ca3ff",
    icon: "C",
  },
  {
    title: "Overlay Calibration",
    subtitle: "Tune overlay placement and card alignment.",
    href: "/overlay-calibration",
    accent: "#9d7dff",
    icon: "O",
  },
  {
    title: "Reveal Calibration",
    subtitle: "Fine-tune the signature reveal transfer stage.",
    href: "/signature-reveal-calibration",
    accent: "#42d392",
    icon: "R",
  },
  {
    title: "Watch / Playback",
    subtitle: "Launch and inspect prepared playback behavior.",
    href: "/watch",
    accent: "#f5a524",
    icon: "W",
  },
  {
    title: "Setup Screen",
    subtitle: "Review prechecks, notes, and performance readiness.",
    href: "/prepare-session",
    accent: "#ff7b72",
    icon: "S",
  },
  {
    title: "Controller",
    subtitle: "Return to the calculator lock and magician control UI.",
    href: "/controller",
    accent: "#7ee787",
    icon: "I",
  },
];

const QUICK_CHECKS = [
  "Confirm card framing under current lighting",
  "Verify signature visibility before capture",
  "Check bump trigger threshold in debug mode",
  "Test reveal sync against playback timing",
];

export default function ClassroomScreen() {
  const router = useRouter();

  function handleBack() {
    navigateBackWithinApp(router, "/controller");
  }

  return (
    <RoomShell
      title="InkSync Lab"
      onBack={handleBack}
      navItems={NAV_ITEMS}
      onNavigate={(href) => router.push(href)}
    >
      <div className="content">
        <section className="heroCard">
          <div className="heroKicker">InkSync</div>
          <h2>Tools, labs, and calibration access</h2>
          <p>
            Use this screen as a development and rehearsal hub. Open the specific
            lab you need, validate the environment, and return to the controller
            when the effect is ready to run.
          </p>
        </section>

        <section className="sectionCard">
          <div className="sectionHeader">
            <div className="sectionKicker">Lab Access</div>
            <h3>Open a work area</h3>
          </div>

          <div className="labGrid">
            {LAB_CARDS.map((card) => (
              <button
                key={card.title}
                type="button"
                className="labCard"
                onClick={() => router.push(card.href)}
              >
                <div
                  className="labIcon"
                  style={{
                    color: card.accent,
                    borderColor: card.accent,
                    background: `${card.accent}22`,
                  }}
                >
                  {card.icon}
                </div>

                <div className="labTitle">{card.title}</div>
                <div className="labSubtitle">{card.subtitle}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="sectionCard">
          <div className="sectionHeader">
            <div className="sectionKicker">Pre-Run Checklist</div>
            <h3>Quick rehearsal targets</h3>
          </div>

          <div className="checkList">
            {QUICK_CHECKS.map((item) => (
              <div key={item} className="checkItem">
                <span className="checkBullet">•</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="sectionCard">
          <div className="sectionHeader">
            <div className="sectionKicker">Workflow</div>
            <h3>Recommended order</h3>
          </div>

          <div className="workflowCard">
            <div className="workflowLine">
              Setup
              <span className="workflowArrow">→</span>
              Calibration
              <span className="workflowArrow">→</span>
              Overlay
              <span className="workflowArrow">→</span>
              Reveal
              <span className="workflowArrow">→</span>
              Watch
              <span className="workflowArrow">→</span>
              Controller
            </div>
          </div>
        </section>
      </div>

      <style jsx>{`
        .content {
          display: grid;
          gap: 14px;
          padding: 14px;
        }

        .heroCard,
        .sectionCard,
        .labCard {
          border-radius: 18px;
          border: 1px solid rgba(117, 148, 211, 0.2);
          background: linear-gradient(
            180deg,
            rgba(18, 34, 69, 0.96),
            rgba(9, 18, 38, 0.98)
          );
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.2);
        }

        .heroCard {
          padding: 16px;
        }

        .heroKicker,
        .sectionKicker {
          color: #9dc4ff;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .heroCard h2,
        .sectionHeader h3 {
          margin: 6px 0 0;
          font-size: 20px;
          font-weight: 800;
          color: #f7f4e6;
        }

        .heroCard p {
          margin: 10px 0 0;
          color: #d2dcee;
          font-size: 14px;
          line-height: 1.45;
        }

        .sectionCard {
          padding: 14px;
        }

        .sectionHeader {
          margin-bottom: 12px;
        }

        .labGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .labCard {
          padding: 12px;
          text-align: left;
          cursor: pointer;
          background: linear-gradient(
            180deg,
            rgba(33, 56, 96, 0.84),
            rgba(16, 30, 57, 0.96)
          );
        }

        .labIcon {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 800;
          margin-bottom: 10px;
        }

        .labTitle {
          color: #f7f4e6;
          font-size: 14px;
          font-weight: 800;
        }

        .labSubtitle {
          margin-top: 4px;
          color: #bfd0ea;
          font-size: 12px;
          line-height: 1.35;
        }

        .checkList {
          display: grid;
          gap: 10px;
        }

        .checkItem {
          display: grid;
          grid-template-columns: 12px 1fr;
          gap: 10px;
          padding: 12px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.05);
          color: #edf4ff;
          font-size: 13px;
          line-height: 1.4;
        }

        .checkBullet {
          color: #8fc0ff;
          font-weight: 800;
        }

        .workflowCard {
          padding: 14px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.05);
        }

        .workflowLine {
          color: #edf4ff;
          font-size: 13px;
          font-weight: 700;
          line-height: 1.6;
        }

        .workflowArrow {
          margin: 0 8px;
          color: #69a9ff;
        }

        @media (max-width: 520px) {
          .labGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </RoomShell>
  );
}
