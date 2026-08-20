import type { TicketCategory, TicketStatus } from "../api/help";

/*
  One vocabulary for support-ticket status, shared by the list and the detail
  page — both declared their own copy, and both had to be edited in step.

  Two of the labels were long enough to wrap the badge onto a second line
  ("Ընթացքի մեջ" measured 38px tall against 22px for the rest, on a row where
  every other badge was one line), which is the usual Armenian-expansion
  problem: the answer is a shorter true label, not a smaller font. "Քո հերթն
  է" is also plainer than "Սպասում է ձեզ" about what it is asking for.
*/
export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Բաց",
  waiting_for_you: "Քո հերթն է",
  in_progress: "Ընթացքում",
  resolved: "Լուծված",
  closed: "Փակված",
};

/** `incorrect` is deliberately absent: a ticket waiting on your reply is a
 *  prompt, not a failure, and it used to wear the product's error colour. */
export const TICKET_STATUS_TONE: Record<TicketStatus, "neutral" | "primary" | "accent" | "correct"> = {
  open: "primary",
  waiting_for_you: "accent",
  in_progress: "primary",
  resolved: "correct",
  closed: "neutral",
};

export const TICKET_CATEGORY_LABEL: Record<TicketCategory, string> = {
  account: "Հաշիվ",
  ai: "AI Օգնական",
  payment: "Վճարում",
  bug: "Սխալ հավելվածում",
  study_feature: "Ուսումնական գործիքներ",
  other: "Այլ",
};

export type TicketGroupKey = "waiting" | "active" | "done";

/** Which of the three list groups a status belongs to. */
export function ticketGroup(status: TicketStatus): TicketGroupKey {
  if (status === "waiting_for_you") return "waiting";
  if (status === "resolved" || status === "closed") return "done";
  return "active";
}

export const TICKET_GROUP_LABEL: Record<TicketGroupKey, string> = {
  waiting: "Սպասում է քեզ",
  active: "Ընթացքում",
  done: "Ավարտված",
};

export const TICKET_GROUP_ORDER: TicketGroupKey[] = ["waiting", "active", "done"];

/** A closed ticket accepts replies the backend files under a status nobody is
 *  watching, so the reply form is replaced with a new-ticket path instead. */
export function ticketAcceptsReply(status: TicketStatus): boolean {
  return status !== "closed";
}
