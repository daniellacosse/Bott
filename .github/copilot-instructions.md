# Bott - Discord AI Bot

Always reference these instructions first and fallback to search or bash
commands only when you encounter unexpected information that does not match the
info here.

Bott is a Discord bot powered by Gemini AI, built with Deno/TypeScript. It
features intelligent conversation, media processing (images, videos, audio), and
content generation capabilities.

## Working Effectively

### Initial Setup

- Install Deno runtime:
  `curl -Lo deno.zip https://github.com/denoland/deno/releases/latest/download/deno-x86_64-unknown-linux-gnu.zip && unzip deno.zip && sudo mv deno /usr/local/bin/`
- Install dependencies: `sudo apt-get install -y ffmpeg docker.io`
- Copy environment template: `cp .env.example .env.test`
- Configure environment variables in `.env.test`:
  - `GOOGLE_PROJECT_ID` - GCP project ID
  - `GOOGLE_PROJECT_LOCATION` - GCP region (e.g., us-central1)
  - `GOOGLE_ACCESS_TOKEN` - GCP access token
  - `DISCORD_TOKEN` - Discord bot token

### Initial Setup

- Install Deno runtime:
  `curl -Lo deno.zip https://github.com/denoland/deno/releases/latest/download/deno-x86_64-unknown-linux-gnu.zip && unzip deno.zip && sudo mv deno /usr/local/bin/`
- Install dependencies: `sudo apt-get install -y ffmpeg docker.io`
- Copy configuration template: `cp config.example.yml config.test.yml`
- Configure settings in `config.test.yml`:
  - `GOOGLE_PROJECT_ID` - GCP project ID
  - `GOOGLE_PROJECT_LOCATION` - GCP region (e.g., us-central1)
  - `GOOGLE_ACCESS_TOKEN` - GCP access token
  - `DISCORD_TOKEN` - Discord bot token

### Development Workflow

- Start development server: `deno task runApp test` -- requires configured
  settings. NEVER CANCEL initial startup - dependency downloads take 2-5
  minutes.
- Start production server: `deno task runApp prod`
- Build and run with Docker: `deno task runApp` -- combines Docker build and run

## Validation

### Manual Validation Steps

- Build succeeds: `docker build -t bott .` completes successfully
- Format check passes: `deno fmt --check` reports "Checked X files" with exit
  code 0
- Application starts: `deno task runApp test` begins without TypeScript
  compilation errors
- The application requires valid Discord and GCP credentials to run completely
- Without credentials, the app will start but fail when attempting to connect to
  Discord or Gemini services
- Health endpoint responds: When running, http://localhost:8080 should return
  "OK"

### Testing Requirements

- ALWAYS run `deno fmt --check` and `deno lint` before committing changes
- ALWAYS run `deno test --allow-all` to validate unit tests
- Test files are located in: `**/**.test.ts`

### CI/CD Validation

- Always run `deno fmt --check && deno lint` before committing - this matches
  the GitHub Actions workflow
- License header check: All `.ts` and `.sql` files must contain "This project is
  dual-licensed:" in their header
- The CI workflow in `.github/workflows/qualityChecks.yml` runs: lint, unit
  tests, and license header validation

### Network Dependencies

- First-time runs require downloading 200+ npm packages and JSR modules
- Downloads can take 2-5 minutes depending on network speed
- Certificate or network issues may prevent package downloads in restricted
  environments
- If downloads fail, the application cannot start but builds will still succeed

## Project Structure

```
.
├── README.md              # Project documentation
├── constants.ts          # Global configuration and constants
├── deno.json             # Deno configuration and tasks
├── Dockerfile            # Container build instructions
├── Brewfile              # macOS dependencies via Homebrew
├── config.example.yml    # Configuration template
├── app/                  # Main application
│   ├── README.md        # Application layer documentation
│   ├── main.ts          # Entry point
│   ├── tasks.ts         # Task management
│   └── actions/         # Bot tool/action handlers
├── libraries/           # Modular libraries
│   ├── discord/        # Discord integration
│   ├── gemini/         # AI integration
│   ├── logger/         # Logging
│   ├── storage/        # Data persistence
│   │   └── README.md   # Storage documentation
│   └── task/           # Task queue
├── model/              # Type definitions
│   └── README.md       # Data model documentation
└── .github/            # CI/CD workflows
```

## Common Tasks

### Adding New Features

- Bot commands: Add handlers in `app/actions/`
- New AI capabilities: Extend `libraries/gemini/`
- Data models: Update `model/types.ts`
- Storage functionality: Modify `libraries/storage/`

### Debugging

- Check logs via console output when running `deno task runApp test`
- Verify configuration is set correctly in `config.test.yml`
- Test network connectivity to Discord API and Google Cloud APIs
- Validate file permissions for `FILE_SYSTEM_ROOT` directory (default:
  `./fs_root`)

### Configuration Options

Key environment variables are defined in [constants.ts](../constants.ts). See
that file for the full list and default values.
