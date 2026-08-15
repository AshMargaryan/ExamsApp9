// Collected client-side when a support ticket is opened, so staff can see
// the reporter's environment without asking. Deliberately limited to
// non-sensitive, non-identifying values — no IP, no stored tokens, no
// account data (see backend SupportTicket.diagnostic_info docstring).
export interface DiagnosticInfo {
  user_agent: string;
  page: string;
  viewport: string;
  language: string;
  timezone: string;
}

export function collectDiagnostics(): DiagnosticInfo {
  return {
    user_agent: navigator.userAgent,
    page: window.location.pathname,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}
