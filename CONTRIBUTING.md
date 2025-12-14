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

1. Copy `config.example.yml` to `config.dev.yml`:

```sh
cp config.example.yml config.dev.yml
```

2. Get your GCP information and add it to `config.dev.yml`.
3. Get your Discord information and add it to `config.dev.yml`.
4. Set up the environment with `deno task setup`.
5. Open the project in VS Code with the devcontainer. The bot will start
   automatically.

### Pull Requests

There are numerous issues tracked in the
[issues tab](https://github.com/daniellacosse-code/Bott/issues) that need work!

In order to submit a pull request, you will need to sign the
[**Contributor License Agreement (CLA)**](./CONTRIBUTOR_AGREEMENT.md). By
signing a CLA, you (or your employer) grant us the rights necessary to use and
distribute your contributions under our [dual-licensing model](./LICENSE). This
helps protect both you as a contributor and the project.

### Deploying Bott

Deploying Bott to Google Cloud Run can be done entirely from your command line
using the `gcloud` CLI.

1. **Install Google Cloud SDK**: First, ensure you have the Google Cloud SDK
   installed. (e.g. via `brew install google-cloud-sdk`)

```sh
which gcloud
```

2. **Authenticate and Set Project**: Log in to your Google Cloud account and set
   your active project.

```sh
gcloud auth application-default login
gcloud config set project <YOUR_PROJECT_ID>
```

> [!TIP]
> If you don't have a project, you can create one with
> `gcloud projects create <YOUR_PROJECT_ID>`.

3. **Enable Required APIs**: Enable the necessary APIs for Vertex AI, Cloud
   Storage, and Cloud Run.

```sh
gcloud services enable \
  aiplatform.googleapis.com \
  storage.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com
```

4. **Configure Service Account Permissions**: Find the default service account.

```sh
gcloud builds get-default-service-account
```

Then, add the `Vertex AI User` and `Storage Object Admin` roles.

```sh
gcloud projects add-iam-policy-binding <YOUR_PROJECT_ID> \
  --member="serviceAccount:<YOUR_SERVICE_ACCOUNT>" \
  --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding <YOUR_PROJECT_ID> \
  --member="serviceAccount:<YOUR_SERVICE_ACCOUNT>" \
  --role="roles/storage.objectAdmin"
```

5. **Create a `.env.production` file**: As [above](#instructions), create an
   `.env.production` file from the provided `.env.example` file and fill it out.

```sh
cp .env.example .env.production
```

6. **Deploy the Service**: Deploy the application to Cloud Run from the source
   repository. You will be prompted to set the region.

```sh
gcloud run deploy bott-service \
  --source . \
  --allow-unauthenticated \
  --region <YOUR_REGION> \
  --env-file .env.production
```

9. **Verify Deployment**: Bott should now be running correctly.

```sh
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=bott-service" --limit 50
```
