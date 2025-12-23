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

- Your container runtime of choice (Docker/Podman). For this guide, we'll use
  Docker.

#### Instructions

1. Copy `.env.example` to `.env.local`:

```sh
cp .env.example .env.local
```

2. Open the `.env.local` file and add the relevant credentials.
3. Run `./exec` to start the application.

### Pull Requests

There are numerous issues tracked in the
[issues tab](https://github.com/daniellacosse-code/Bott/issues) that need work!

In order to submit a pull request, you will need to sign the
[**Contributor License Agreement (CLA)**](./CONTRIBUTOR_AGREEMENT.md). By
signing a CLA, you (or your employer) grant us the rights necessary to use and
distribute your contributions under our [dual-licensing model](./LICENSE). This
helps protect both you as a contributor and the project.

### Deploying Bott

At present, we only support deploying Bott via Google Cloud Run.

1. Create a `.env.production` file:

```sh
cp .env.example .env.production
```

2. Open the `.env.production` file and add the relevant credentials.

3. Execute the deployment task:

```sh
ENV=production ./exec deno task deploy_gcp
```

> [!TIP]
> You can select your container runtime by setting the `RUNTIME` environment
> variable to `docker` or `podman`:
>
> ```sh
> RUNTIME=podman ./exec deno task deploy_gcp
> ```

4. Verify your new deployment by tailing the logs:

```sh
ENV=production ./exec deno task logs
```

### Releasing

To create a new release of Bott:

1. Navigate to the
   [Actions tab](https://github.com/daniellacosse/Bott/actions/workflows/release.yml)
   in the GitHub repository.

2. Click "Run workflow" and enter the version number following semantic
   versioning (e.g., `1.0.0`, `1.0.0-alpha`, `1.2.3-beta.1`).

3. The workflow will:
   - Update the version in `app/deno.jsonc`
   - Update the version badge in `README.md`
   - Create and push a git tag
   - Build and push a container image to GitHub Container Registry
   - Create a GitHub release

4. The container image will be available at:

```sh
docker pull ghcr.io/daniellacosse/bott:VERSION
```

> [!NOTE]
> Versions containing a hyphen (e.g., `-alpha`, `-beta`, `-rc.1`) will be marked
> as pre-releases.

## Architecture

Want to learn more about how Bott ticks? See
[ARCHITECTURE.md](./ARCHITECTURE.md).
