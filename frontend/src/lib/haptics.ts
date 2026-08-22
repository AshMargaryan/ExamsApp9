import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { isNativeApp } from "./platform";

/*
  Thin wrapper over Capacitor's haptics so UI code can just say "this was a
  step forward" without caring about the platform. On the web every call is a
  no-op, and failures are swallowed: a device with haptics disabled (or an
  older simulator) must never turn a missing buzz into a broken button.
*/

function safe(run: () => Promise<unknown>) {
  if (!isNativeApp()) return;
  void run().catch(() => {});
}

/** A step advanced, a choice was committed — the standard "that worked" tap. */
export function hapticStep() {
  safe(() => Haptics.impact({ style: ImpactStyle.Light }));
}

/** A heavier confirmation for finishing a flow (account created, signed in). */
export function hapticSuccess() {
  safe(() => Haptics.notification({ type: NotificationType.Success }));
}

/** Validation failed or the server rejected the submission. */
export function hapticError() {
  safe(() => Haptics.notification({ type: NotificationType.Error }));
}
