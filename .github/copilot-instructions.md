# Bott - Discord AI Bot

Always reference these instructions first and fallback to search or bash
commands only when you encounter unexpected information that does not match the
info here.

Bott is a Discord bot powered by Gemini AI, built with Deno/TypeScript. It
features intelligent conversation, media processing (images, videos, audio), and
content generation capabilities.

## Working Effectively

### Initial Setup

- Copy configuration template: `cp .env.example.yml .env.devcontainer.yml`
- Configure settings in `.env.devcontainer.yml`:
  - `GCP_PROJECT` - GCP project ID
  - `GCP_REGION` - GCP region (e.g., us-central1)
  - `GEMINI_ACCESS_TOKEN` - GCP access token
  - `DISCORD_TOKEN` - Discord bot token

### Development Workflow

- The project uses a devcontainer for development
- Open the project in VS Code with the devcontainer extension
- The bot starts automatically when the devcontainer opens
- NEVER CANCEL initial startup - dependency downloads take 2-5 minutes
- The development server watches for changes in `app/`, `libraries/`, and
  `model/` directories

## Validation

### Manual Validation Steps

- Container builds successfully when opening the devcontainer
- Format check passes: `./exec fmt --check` reports "Checked X files" with exit
  code 0
- Application starts automatically in the devcontainer without TypeScript
  compilation errors
- The application requires valid Discord and GCP credentials to run completely
- Without credentials, the app will start but fail when attempting to connect to
  Discord or Gemini services
- Health endpoint responds: When running, http://localhost:8080 should return
  "OK"

### Testing Requirements

- ALWAYS run `./exec fmt --check` and `./exec lint` before committing changes
- ALWAYS run `./exec test --allow-all` to validate unit tests
- Test files are located in: `**/**.test.ts`

### CI/CD Validation

- Always run `./exec fmt --check && ./exec lint` before committing - this matches
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
├── Containerfile         # Container build instructions
├── Brewfile              # macOS dependencies via Homebrew
├── .env.example.yml      # Environment configuration template
├── .devcontainer/        # Devcontainer configuration
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

- Check logs in the VS Code terminal where the bot is running
- Verify configuration is set correctly in `.env.devcontainer.yml`
- Test network connectivity to Discord API and Google Cloud APIs
- Validate file permissions for `FILE_SYSTEM_ROOT` directory (default:
  `./.output/fs_root`)

### Configuration Options

Key environment variables are defined in [constants.ts](../constants.ts). See
that file for the full list and default values.
