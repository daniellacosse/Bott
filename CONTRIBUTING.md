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

1. Copy `.env.example.yml` to `.env.local.yml`:

```sh
cp .env.example.yml .env.local.yml
```

2. Open the `.env.local.yml` file and add the relevant credentials.
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

1. Create a `.env.production.yml` file:

```sh
cp .env.example.yml .env.production.yml
```

2. Open the `.env.production.yml` file and add the relevant credentials.

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

---

## Architecture

Want to learn more about how Bott ticks? See
[ARCHITECTURE.md](./ARCHITECTURE.md).
