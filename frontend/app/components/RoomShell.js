"use client";

import styles from "./RoomShell.module.css";

function joinClassNames(...parts) {
  return parts.filter(Boolean).join(" ");
}

function getDefaultIcon(label) {
  switch (label) {
    case "Account":
      return "O";
    case "Analytics":
      return "|";
    case "PinMap":
      return "*";
    case "Home":
      return "#";
    case "Classroom":
      return "=";
    default:
      return "•";
  }
}

export default function RoomShell({
  title,
  onBack,
  navItems,
  onNavigate,
  children,
  shellId,
  activeNavLabel,
  screenClassName,
  shellClassName,
  topBarClassName,
  backButtonClassName,
  titleClassName,
  bottomNavClassName,
  navItemClassName,
  navItemDisabledClassName,
  navItemActiveClassName,
  navIconClassName,
}) {
  return (
    <div className={joinClassNames(styles.screen, screenClassName)}>
      <div className={joinClassNames(styles.phoneShell, shellClassName)} id={shellId}>
        <header className={joinClassNames(styles.topBar, topBarClassName)}>
          <button type="button" className={joinClassNames(styles.backButton, backButtonClassName)} aria-label="Back" onClick={onBack}>
            &#8249;
          </button>
          <h1 className={joinClassNames(styles.title, titleClassName)}>{title}</h1>
          <div className={styles.headerSpacer} />
        </header>

        {children}

        <nav className={joinClassNames(styles.bottomNav, bottomNavClassName)} aria-label="Primary">
          {navItems.map((item) => {
            const isActive = item.label === activeNavLabel;
            return (
              <button
                key={item.label}
                type="button"
                className={joinClassNames(
                  styles.navItem,
                  navItemClassName,
                  isActive && navItemActiveClassName,
                  !item.href && styles.navItemDisabled,
                  !item.href && navItemDisabledClassName,
                )}
                onClick={() => {
                  if (item.href) {
                    onNavigate(item.href);
                  }
                }}
                disabled={!item.href}
              >
                <span className={joinClassNames(styles.navIcon, navIconClassName)} aria-hidden="true">
                  {item.icon ?? getDefaultIcon(item.label)}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
