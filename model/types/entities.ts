/**
 * @license
 * This file is part of Bott.
 *
 * This project is dual-licensed:
 * - Non-commercial use: AGPLv3 (see LICENSE file for full text).
 * - Commercial use: Proprietary License (contact D@nielLaCos.se for details).
 *
 * Copyright (C) 2025 DanielLaCos.se
 */

/**
 * Defines the structure for a "Space" in Bott.
 * A Space is a top-level container, similar to a server or guild in Discord.
 */
export interface BottSpace {
  id: string;
  name: string;
  description?: string;
  channels?: BottChannel[];
}

/**
 * Defines the structure for a "Channel" in Bott.
 * A Channel is a specific communication context within a Space, like a text channel.
 */
export interface BottChannel {
  id: string;
  name: string;
  space: BottSpace;
  description?: string;
}

/**
 * Defines the structure for a "User" in Bott.
 * Represents an individual interacting with the bot.
 */
export interface BottUser {
  id: string;
  name: string;
  url?: string;
}
