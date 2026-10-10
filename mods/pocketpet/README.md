# pocketpet

A tamagotchi-style pet that lives in a band above the prompt. Click the buttons, or type `/pet <action>`.

| Action | Button / command | Effect |
|--------|------------------|--------|
| Meal | `/pet feed` | +1 hunger heart, +1 weight |
| Snack | `/pet snack` | +1 happy heart, +2 weight, small chance of sickness |
| Play | `/pet play`, then `left` / `right` | guess game, 5 rounds, win 3 for +1 happy |
| Medicine | `/pet medicine` | cures sickness (2 doses) |
| Clean | `/pet clean` | flushes the poop |
| Light | `/pet light` | lights off lets it sleep (bedtime 22:00-07:00) |
| Scold | `/pet scold` | answers a fake attention call, raises discipline |
| Status | `/pet status` | age, weight, discipline, care mistakes |
| | `/pet name <n>`, `/pet new [cat|dog|octopus|crab|dragon]`, `/pet hide`, `/pet show` | New egg (random species unless named) |

Life runs in real time and is saved between sessions: egg (3 min), baby (1 h), child (12 h), teen (2 d), adult (7 d), senior; max age 14 days. Ignored calls count as care mistakes and decide how it grows up. Starvation, loneliness, untreated sickness and old age end it. After the session has been closed, at most 5 hours of time are simulated.

Button hotkeys (when the band has focus): f s p m c o d t.

## Several terminals

All sessions share one saved pet. Every save bumps a revision number, and each session adopts the saved copy whenever it is newer than its own (checked every tick and before every action), so feeding in one terminal shows up in the others within a couple of seconds.
