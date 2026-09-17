// Genera docs/aviso-legal/index.html y docs/privacidad/index.html.

import { SITE_URL, SITE_NAME, LEGAL_NAME, CONTACT_EMAIL } from "../config.mjs";
import { fill } from "./template.mjs";
import { renderAnalyticsScript, renderCookieBanner } from "./legal.mjs";

function commonVars(updatedAt, plausibleDomain) {
  return {
    SITE_NAME,
    SITE_URL,
    LEGAL_NAME,
    CONTACT_EMAIL,
    UPDATED_AT: updatedAt,
    HOME_URL: "../",
    PLAUSIBLE_SCRIPT: renderAnalyticsScript(plausibleDomain),
    COOKIE_BANNER: renderCookieBanner("../privacidad/")
  };
}

export function renderAvisoLegal(template, { updatedAt, plausibleDomain }) {
  const canonicalUrl = `${SITE_URL}/aviso-legal/`;
  const html = fill(template, {
    ...commonVars(updatedAt, plausibleDomain),
    CANONICAL_URL: canonicalUrl,
    PRIVACY_URL: "../privacidad/"
  });
  return { html, canonicalUrl };
}

export function renderPrivacidad(template, { updatedAt, plausibleDomain }) {
  const canonicalUrl = `${SITE_URL}/privacidad/`;
  const html = fill(template, {
    ...commonVars(updatedAt, plausibleDomain),
    CANONICAL_URL: canonicalUrl
  });
  return { html, canonicalUrl };
}
