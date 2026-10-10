# claude-mods

A collection of personal Claude Code mods. Each mod lives in `mods/<name>/` and is listed in `.claude-plugin/marketplace.json`.

## Install on another machine

```
/plugin marketplace add crisguitar/claude-mods
/plugin install <mod-name>@claude-mods
```

## Mods

| Mod | Description |
|-----|-------------|
| [myusage](mods/myusage) | Context and rate-limit usage bars above the prompt |
| [pocketpet](mods/pocketpet) | Tamagotchi-style virtual pet (cat, dog, octopus, crab or dragon) above the prompt, driven by buttons or `/pet` |

## Adding a new mod

1. Create `mods/<name>/` with `.claude-plugin/plugin.json` and its `hooks/`.
2. Add an entry to `.claude-plugin/marketplace.json` (`"source": "./mods/<name>"`).
3. Add a row to the table above.
