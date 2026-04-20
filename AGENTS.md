# Agent Guidelines: homebridge-tapo-p100

Homebridge platform plugin for TP-Link Tapo smart devices (P100/P105/P110 plugs, L510E/L530E bulbs).

## Essential Commands

| Command | Purpose |
|---------|---------|
| `npm run build` | Clean build: rimraf dist + tsc |
| `npm run lint` | ESLint check (zero warnings enforced) |
| `npm run watch` | Dev mode: build + npm link + nodemon |
| `npm run prepublishOnly` | Lint + build (runs before publish) |

**Command order matters**: CI runs `lint → build`. Build artifacts go to `dist/` (not committed).

## Technology Stack

- **Runtime**: Node.js 18.20.4+ || 20.16.0+ || 22.6.0+
- **Platform**: Homebridge 1.8.0+ || 2.0.0-beta.0+
- **Language**: TypeScript 5.5.4, ES2022 modules
- **Build**: tsc → `dist/` (main entry: `dist/index.js`)
- **Lint**: ESLint 9 + typescript-eslint (flat config)
- **Dev server**: nodemon watching `src/**/*.ts`, auto-rebuilds + runs `homebridge -I -D`

## Project Structure

```
src/
├── index.ts              # Plugin entrypoint - registers platform
├── settings.ts           # PLATFORM_NAME ('TapoP100'), PLUGIN_NAME constants
├── platform.ts           # Main TapoPlatform class - device discovery & registration
├── config.ts             # Config validation (parseConfig function)
├── platform*.ts          # Accessory handlers per device type:
│   ├── platformP100Accessory.ts    # P100/P105 plugs
│   ├── platformP110Accessory.ts    # P110 (adds power consumption)
│   ├── platformL510EAccessory.ts   # L510E (adds brightness)
│   ├── platformL520EAccessory.ts   # L520E white light variant
│   └── platformL530Accessory.ts    # L530E (color + adaptive lighting)
├── platformTPLinkAccessory.ts      # Base class for accessories
├── utils/                # Device protocol implementations
│   ├── p100.ts          # Core P100 protocol + encryption
│   ├── p110.ts          # P110 power monitoring
│   ├── l510e.ts, l520e.ts, l530.ts  # Light variants
│   ├── newTpLinkCipher.ts, tpLinkCipher.ts  # Encryption layers
│   └── energyUsage.ts, powerUsage.ts        # Consumption types
├── custom-characteristics/  # Eve app custom characteristics
│   ├── currentConsumptionCharacteristic.ts
│   ├── totalConsumptionCharacteristic.ts
│   └── resetConsumptionCharacteristic.ts
└── homekit-device/types.ts  # Device info type definitions
```

## Architecture Patterns

**Platform Plugin Pattern**: This is a Homebridge DynamicPlatformPlugin.
- `index.ts` → registers `TapoPlatform` with `PLATFORM_NAME`
- `platform.ts` → handles `didFinishLaunching` event to discover devices
- Accessories cached; restored via `configureAccessory()`, new ones via `discoverDevices()`

**Device Type Mapping** (config.schema.json):
- `"Plug"` → P100/P105
- `"PowerPlug"` → P110 (adds Eve power consumption)
- `"Light"` → L510E (brightness)
- `"WhiteLight"` → L520E (brightness, no color temp)
- `"Colorlight"` → L530E (brightness + hue/saturation + color temp)

**Protocol Stack**: All devices use local HTTP polling to `http://[host]/app?token` with custom encryption handshake (see `utils/p100.ts`, `utils/newTpLinkCipher.ts`).

## Style & Lint Rules

- **Quotes**: single (`'string'`)
- **Indent**: 2 spaces (SwitchCase: 0)
- **Line endings**: LF (unix)
- **Semicolons**: required
- **Comma-dangle**: always-multiline
- **Max line length**: 160 (warning)
- **Braces**: all + same-line style
- **TypeScript**: strict mode, `no-unused-vars` catches errors

## Dev Workflow

**Watch mode**: `npm run watch`
- Watches `src/**/*.ts`
- On change: `tsc && homebridge -I -D`
- Requires global homebridge install or `npm link` during dev

**Testing locally**:
1. `npm run build` → compiles to `dist/`
2. `npm link` → links globally for homebridge to pick up
3. Configure homebridge with platform `"TapoP100"` + device array

## CI/CD

GitHub Actions runs on push/PR:
- Matrix: Node 18.x, 20.x, 22.x
- Steps: install → lint → build → audit outdated → rebuild
- Build must pass on all Node versions

## Key Constraints

**No tests in this repo** - there is no test runner configured.

**Device requirements** (user-facing constraints worth knowing):
- Tapo account email = username (not username from app)
- Password: exactly 8 chars, alphanumeric only (no specials)
- Latest firmware: must enable "Third-Party Compatibility" in Tapo App
- Devices poll via local HTTP; internet blocking supported

**Dependencies**:
- `axios` - HTTP requests to devices
- `fakegato-history` - Eve app history (power consumption)
- `lodash.defaults`, `utf8`, `uuid` - utilities

## Common Pitfalls

1. **Module type**: This is `"type": "module"` (ESM) - use `.js` extensions in imports
2. **Import extensions**: TypeScript compiles to ESM; all internal imports use `.js` (e.g., `from './platform.js'`)
3. **fakegato**: Has `// @ts-ignore` comment - upstream types are incomplete
4. **No dist in git**: `dist/` is build output (see .gitignore) - never commit it
5. **Lint zero warnings**: CI enforces `--max-warnings=0` - fix all lint issues

## References

- Config schema: `config.schema.json` (Homebridge UI form generation)
- Python port source: https://github.com/fishbigger/TapoP100
