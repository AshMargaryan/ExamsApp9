/*
  What the support-ticket endpoints actually accept, stated on the frontend so
  a student is told before the upload rather than after.

  These mirror `apps/helpcenter/validators.py` — the server sniffs the real
  mime type from the bytes and rejects anything outside the list, at a size
  cap of HELPCENTER_MAX_ATTACHMENT_SIZE_MB. The frontend previously stated
  neither, so attaching a 40MB screen recording meant writing the whole
  ticket, submitting, and getting a raw API error back. This is a courtesy
  copy of the rules, never the enforcement: the server still validates.
*/
export const ATTACHMENT_MAX_MB = 20;

export const ATTACHMENT_ACCEPT = ".png,.jpg,.jpeg,.webp,.gif,.pdf,.docx,.xlsx,.txt,.md,.csv";

export const ATTACHMENT_ACCEPT_HINT = `Նկար, PDF, փաստաթուղթ կամ աղյուսակ, մինչև ${ATTACHMENT_MAX_MB}ՄԲ։`;
