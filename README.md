<img width="480" alt="Screenshot 2025-04-26 at 12 19 21" src="https://github.com/user-attachments/assets/71c13505-5758-4202-8612-8a7f79f4fba0" />

# 🤖 `@Bott`

![in progress](https://img.shields.io/badge/in%20progress-blue)
![github checks](https://github.com/daniellacosse-code/Bott/actions/workflows/qualityChecks.yml/badge.svg)
![discord](https://img.shields.io/discord/1294993662534483978)

A Discord Bot, powered by Gemini.

## Getting started

Duplicate `.env.example` to `.env.development` and fill it out.

Then run:

```sh
brew bundle
gcloud auth login
deno task start:app
```

[![Run on Google Cloud](https://deploy.cloud.run/button.svg)](https://deploy.cloud.run?git_repo=https://github.com/daniellacosse-code/Bott.git)

---

## Licensing

This project is **dual-licensed** (pending legal review):

- **For Non-Commercial Use:** This software is free and open-source under the
  terms of the **GNU Affero General Public License v3.0 (AGPLv3)**. This license
  ensures that if you use, modify, or distribute this software (especially in a
  network-accessible service), you must also make the corresponding source code
  available under the AGPLv3.
  - Read the full AGPLv3 license details in the [LICENSE file](./LICENSE).

- **For Commercial Use:** If you intend to use this software for commercial
  purposes (any use directly or indirectly intended for commercial advantage or
  monetary compensation), you are required to obtain a **Proprietary Commercial
  License**. This license provides terms that allow you to use and adapt the
  software without the AGPLv3's copyleft obligations for your proprietary
  modifications.
  - **Contact us for commercial licensing inquiries:**
    - **Website:** [Your Website URL, e.g.,
      `https://your-company.com/licensing`]
    - **Email:** [Your Email Address, e.g., `sales@your-company.com`]

### Third-Party Dependencies

This project uses FFmpeg, which is installed and utilized as a command-line
tool. While our project's licensing is as described above, you must also comply
with the respective licenses of these third-party components when distributing
our Docker image or deriving works from it.

For details on FFmpeg's licensing and to obtain its source code, please refer to
the [FFmpeg website](https://ffmpeg.org/download.html) and your Docker image's
installed package information (e.g., `ffmpeg -version` inside the container).

---

**Copyright (C) 2025 DanielLaCos.se**
