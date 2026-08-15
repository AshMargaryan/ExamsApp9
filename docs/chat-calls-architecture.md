# Voice/video calls — architecture (not implemented)

Gitus Chat does not have voice or video calling. This document exists so a
future implementation starts from a real plan instead of guessing, and so
nobody adds a 📞/🎥 button that doesn't work — a call button that fails
silently is worse than no button at all.

## Why it doesn't exist today

Calling needs a signaling channel (to exchange connection offers between two
browsers) plus, for most real-world networks, a relay server (TURN) because
direct peer-to-peer fails behind symmetric NATs and strict firewalls. Neither
exists in this codebase:

- The signaling channel could reuse the existing Django Channels setup
  (`apps.chat.consumers.ChatConsumer` already gives every conversation a
  WebSocket group), but no call-specific message types exist yet.
- `CHANNEL_LAYERS` is `InMemoryChannelLayer` (`backend/config/settings.py`,
  flagged in its own comment as single-process-only) — signaling would work
  for exactly as long as both call participants happen to land on the same
  backend worker, and silently break the moment there's more than one.
- No STUN/TURN server is configured or deployed anywhere. STUN alone (free,
  e.g. Google's public servers) is enough for direct connections on friendly
  networks; TURN (coturn self-hosted, or a managed service like Twilio/Xirsys)
  is what makes calls actually work on the networks where they'd otherwise
  fail, and it costs bandwidth/money proportional to relayed call minutes.
- No `CallSession` data model — nothing tracks that a call happened, who was
  in it, or how long it lasted, which the chat UI would want for a "Missed
  call" message and call history.

## What real support would need

**Signaling (WebRTC offer/answer/ICE exchange)**
- Extend `ChatConsumer` (or add a sibling consumer) with call-specific
  actions: `call_offer`, `call_answer`, `call_ice_candidate`, `call_end`,
  relayed via the conversation's existing channel group — the same
  `group_send` pattern `realtime.py` already uses for messages.
- Before that works across more than one backend process, swap
  `CHANNEL_LAYERS` to `channels_redis.RedisChannelLayer` (already flagged as
  the needed change in `settings.py`) — real-time features silently
  fragment across workers otherwise.

**Media relay**
- Add STUN servers to the frontend's `RTCPeerConnection` config (free, no
  infra to run).
- Stand up TURN (self-hosted coturn, or a managed provider) for calls to
  actually connect on restrictive networks. This is the one piece with
  ongoing operating cost and is worth sizing before committing to a launch
  date.

**Data model** (new `apps.chat` models)
- `CallSession`: conversation FK, initiator, call_type (voice/video), status
  (ringing/active/ended/missed/declined), started_at, ended_at.
- `CallParticipant`: call FK, user FK, joined_at, left_at — for group calls
  and for knowing who actually picked up.
- A `Message.message_type` addition (e.g. `call_log`) so "Missed call from
  X, 2m ago" renders as a normal chat message via the existing message list,
  the same way this codebase already renders context cards.

**Frontend**
- `getUserMedia` for local audio/video capture, `RTCPeerConnection` for the
  actual media path, a ringing/incoming-call UI (global, not just inside an
  open conversation — a call can come in while browsing elsewhere), and an
  active-call screen (mute, camera toggle, hang up, participant tiles for
  group calls).

**Rollout notes**
- Ship voice-only before video — smaller media/bandwidth surface, and the
  signaling+TURN plumbing is identical either way.
- Group calls (spec's "12 participants" example) are meaningfully harder
  than 1:1 (SFU/mesh topology decision, per-participant bandwidth) — worth
  treating as a distinct follow-up phase rather than day one.
