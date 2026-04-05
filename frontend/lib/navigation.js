export function navigateBackWithinApp(router, fallbackHref) {
  if (typeof window === "undefined") {
    router.push(fallbackHref);
    return;
  }

  try {
    const currentUrl = new URL(window.location.href);
    const referrer = document.referrer ? new URL(document.referrer) : null;
    const hasInternalReferrer = Boolean(referrer && referrer.origin === currentUrl.origin);
    const currentPath = `${currentUrl.pathname}${currentUrl.search}`;
    const referrerPath = referrer ? `${referrer.pathname}${referrer.search}` : "";
    const shouldUseHistory = hasInternalReferrer && referrerPath !== currentPath && window.history.length > 1;

    if (shouldUseHistory) {
      router.back();
      return;
    }
  } catch {
  }

  router.push(fallbackHref);
}
