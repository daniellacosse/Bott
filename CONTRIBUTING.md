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

- Homebrew ([https://brew.sh/](https://brew.sh/))
- A GCP Project
  ([https://developers.google.com/workspace/guides/create-project](https://developers.google.com/workspace/guides/create-project))
- A Registered Discord Application
  ([https://discord.com/developers/applications](https://discord.com/developers/applications))

#### Instructions

1. Copy `.env.example` to `.env.test`:

```sh
cp .env.example .env.test
```

3. Get your GCP information and add it to `.env.test`.
4. Get your Discord information and add it to `.env.test`.
5. Set up the environment with `deno task setup`.
6. Start the bot with `deno task runApp test`.

### Pull Requests

There are numerous issues tracked in the
[issues tab](https://github.com/daniellacosse-code/Bott/issues) that need work!

In order to submit a pull request, you will need to sign the
[**Contributor License Agreement (CLA)**](./CONTRIBUTOR_AGREEMENT.md). By
signing a CLA, you (or your employer) grant us the rights necessary to use and
distribute your contributions under our [dual-licensing model](./LICENSE). This
helps protect both you as a contributor and the project.

### Deploying Bott

Deploying Bott to Google Cloud Run is fully automated. The deployment script
will handle authentication, project setup, API enablement, service account
configuration, and deployment.

1. **Install Google Cloud SDK**: First, ensure you have the Google Cloud SDK
   installed. (e.g. via `brew install google-cloud-sdk`)

```sh
which gcloud
```

2. **Create a `.env.production` file**: Create a `.env.production` file from the
   provided `.env.example` file and fill in your configuration values.

```sh
cp .env.example .env.production
# Edit .env.production with your configuration
```

3. **Deploy**: Run the deployment script. It will guide you through any
   remaining setup steps.

```sh
./scripts/deploy
```

The script will automatically:
- Authenticate with Google Cloud (if needed)
- Create or verify your GCP project
- Enable required APIs (Vertex AI, Cloud Storage, Cloud Run, etc.)
- Configure service account permissions
- Deploy your application to Cloud Run
- Provide you with the service URL

4. **View Logs**: After deployment, you can view your application logs:

```sh
./scripts/logs
```
