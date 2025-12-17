<img src="./gallery/avatar.jpg" width="128" />

# `@Bott`

![GitHub Checks](https://github.com/daniellacosse-code/Bott/actions/workflows/qualityChecks.yml/badge.svg)
[![Maintainability](https://qlty.sh/gh/daniellacosse/projects/Bott/maintainability.svg)](https://qlty.sh/gh/daniellacosse/projects/Bott)
[![Code Coverage](https://qlty.sh/gh/daniellacosse/projects/Bott/coverage.svg)](https://qlty.sh/gh/daniellacosse/projects/Bott)
[![Discord](https://img.shields.io/discord/1294993662534483978)](https://DanielLaCos.se)

Bott: the autonomous groupchat agent!

> [!CAUTION]
>
> 🛑 ![in development](https://img.shields.io/badge/in%20development-red) 🛑
>
> **Currently in development:** see the
> [alpha release milestone](https://github.com/daniellacosse-code/Bott/milestone/2).
> Use at your own risk.

## Current Features

- Bott uses a pre-configured [`Identity`](./app/settings/identity.md.ejs) and
  [`Reasons`](./app/settings/reasons.ts) to determine when to engage with server
  members.
- They view and can discuss most types of media posted in chat. _(See:
  [Supported Attachment Types](./model/types/events.ts))_
- They asynchronously perform tasks as requested:
  - Generates photos, movies, songs and essays as requested.
  - _(TBD)_

### Supported Integrations

#### AI Models

- [Gemini](./libraries/aiModels/gemini)

#### Chat Spaces

- [Discord](./libraries/chatSpaces/discord)

## Contributing

**Interested in contributing?** See our [Contribution Guide](./CONTRIBUTING.md)!

## Gallery

<table>
  <tr>
    <td>
      <figure>
        <img width="360" alt="origin_of_bott" src="./gallery/origin.png" />
        <br />
        <figcaption><i>Bott's origin</i></figcaption>
      </figure>
    </td>
    <td>
      <figure>
        <img width="360" src="./gallery/concept.png" alt="concept" />
        <br />
        <figcaption><i>Concept art by <a href="https://DanielLaCos.se">DanielLaCos.se</a></i></figcaption>
      </figure>
    </td>
  </tr>
</table>

## Licensing

This project is **dual-licensed**. This model allows for free, open-source use
for non-commercial purposes while requiring a separate license for commercial
applications.

- **For Non-Commercial Use:** This software is free and open-source under the
  terms of the **GNU Affero General Public License v3.0 (AGPLv3)**.
  - Read the full AGPLv3 license details in the [LICENSE file](./LICENSE).

- **For Commercial Use:** Use of this software for any purpose that is intended
  for commercial advantage or monetary compensation requires a **Proprietary
  Commercial License**. Please contact [D@nielLaCos.se](mailto:d@niellacos.se)
  to discuss licensing terms.

**Copyright (C) 2025 DanielLaCos.se**
