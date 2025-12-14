# Contributing to Bott

Thinking about contributing to Bott? There are a number of ways you can help!

## Reporting Issues

### Unexpected Behavior

If you find a bug, please open an issue! Include as much detail as possible in
the form. Screenshots, logs, and video captures are super helpful!

> [!WARNING]
> **Security Vulnerabilities** are different. Please see
> [./SECURITY.md](./SECURITY.md).

### Feature Requests

If you have an idea for a new feature or an improvement to an existing one,
please open an issue to discuss it!

## Submitting Code

### Getting started

#### Prerequisites

- A Registered Discord Application
  ([https://discord.com/developers/applications](https://discord.com/developers/applications))

Note: The setup script will automatically install all required dependencies (Homebrew on macOS, gcloud SDK, Deno) and help you create a GCP project if needed.

#### Instructions

1. **Run Setup**: The setup script will install dependencies and authenticate:

```sh
./scripts/setup
# Or using deno task
deno task setup
```

The setup script will:
- Install Homebrew (on macOS, with your permission)
- Install dependencies via Homebrew (on macOS) or guide you through manual installation (on Linux)
- Authenticate with Google Cloud
- Create `.env.devcontainer` from `.env.example`
- Optionally open the env file in your editor

2. **Configure Environment**: Edit `.env.devcontainer` with your configuration:
   - Get your GCP information and add it to the file
   - Get your Discord information and add it to the file

3. **Start the bot**:

```sh
deno task runApp test
```

#### Deploying

To deploy Bott to Google Cloud Run:

1. **Create production environment file**:

```sh
ENV=production ./scripts/setup
```

This will create `.env.production` from `.env.example`.

2. **Deploy**:

```sh
ENV=production ./scripts/deploy_gcp
# Or using deno task
deno task deploy:gcp
```

The deployment script will automatically:
- Create or verify your GCP project (with auto-generated project ID if needed)
- Enable required APIs (Vertex AI, Cloud Storage, Cloud Run, etc.)
- Configure service account permissions
- Deploy your application to Cloud Run
- Provide you with the service URL

3. **View Logs**:

```sh
ENV=production ./scripts/logs
# Or using deno task
deno task logs
```

### Pull Requests

There are numerous issues tracked in the
[issues tab](https://github.com/daniellacosse-code/Bott/issues) that need work!

In order to submit a pull request, you will need to sign the
[**Contributor License Agreement (CLA)**](./CONTRIBUTOR_AGREEMENT.md). By
signing a CLA, you (or your employer) grant us the rights necessary to use and
distribute your contributions under our [dual-licensing model](./LICENSE). This
helps protect both you as a contributor and the project.


