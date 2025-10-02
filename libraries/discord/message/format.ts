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

import type { AnyBottEvent, BottUser } from "@bott/model";
import type { GuildTextBasedChannel } from "npm:discord.js";

/**
 * Formats outgoing message content by converting Bott's internal format
 * to platform-specific format (e.g., Discord mentions).
 *
 * Currently handles:
 * - User mentions: @DisplayName → <@USER_ID>
 *
 * @param content - The message content in Bott's internal format
 * @param channel - The Discord channel to send the message in
 * @returns The content formatted for Discord
 */
export const formatOutgoingContent = async (
  content: string,
  channel: GuildTextBasedChannel,
): Promise<string> => {
  return await formatOutgoingMentions(content, channel);
};

/**
 * Formats incoming message content by converting platform-specific format
 * to Bott's internal format (e.g., Discord mentions to display names).
 *
 * Currently handles:
 * - User mentions: <@USER_ID> → @DisplayName
 *
 * @param content - The message content in platform-specific format
 * @param users - Map of user IDs to user objects with display names
 * @returns The content formatted for Bott's internal use
 */
export const formatIncomingContent = (
  content: string,
  users: Map<string, BottUser> | BottUser[],
): string => {
  const userMap = Array.isArray(users)
    ? new Map(users.map((u) => [u.id, u]))
    : users;
  return formatIncomingMentions(content, userMap);
};

/**
 * Converts platform-specific user mentions to readable format using display names.
 *
 * Examples:
 * - <@123456789> → @MoofyBoy
 * - <@!123456789> → @MoofyBoy (nickname format)
 * - @everyone → @everyone (preserved)
 *
 * @param content - The message content containing platform-specific mentions
 * @param userMap - Map of user IDs to user objects
 * @returns The content with formatted mentions
 */
const formatIncomingMentions = (
  content: string,
  userMap: Map<string, BottUser>,
): string => {
  // Find all user mentions in the format <@USER_ID> or <@!USER_ID>
  const mentionPattern = /<@!?(\d+)>/g;

  return content.replace(mentionPattern, (match, userId) => {
    const user = userMap.get(userId);
    if (user) {
      return `@${user.displayName ?? user.name}`;
    }
    // If user not found, keep original format
    return match;
  });
};

/**
 * Converts readable mentions back to platform-specific format.
 *
 * Examples:
 * - @MoofyBoy → <@123456789>
 * - @everyone → @everyone (preserved)
 *
 * @param content - The message content with readable mentions
 * @param channel - The Discord channel to resolve users in
 * @returns The content with platform-specific mentions
 */
const formatOutgoingMentions = async (
  content: string,
  channel: GuildTextBasedChannel,
): Promise<string> => {
  // Special mentions are already in the correct format
  // @everyone and @here work as-is in Discord

  // Find all @ mentions that aren't special mentions
  // Pattern: @word (but not @everyone or @here)
  const mentionPattern = /@(\w+)/g;
  const matches = Array.from(content.matchAll(mentionPattern));

  if (matches.length === 0) {
    return content;
  }

  const guild = channel.guild;
  const displayNameToId: Map<string, string> = new Map();

  // Build a map of display names to user IDs
  for (const match of matches) {
    const displayName = match[1];

    // Skip special mentions
    if (displayName === "everyone" || displayName === "here") {
      continue;
    }

    if (displayNameToId.has(displayName)) {
      continue;
    }

    try {
      // Search for a member with this display name (nickname) or username
      const members = await guild.members.fetch({
        query: displayName,
        limit: 10,
      });

      // Try to find exact match first
      let foundMember = members.find(
        (m) => m.displayName === displayName || m.user.username === displayName,
      );

      // If no exact match, try case-insensitive
      if (!foundMember) {
        const lowerDisplayName = displayName.toLowerCase();
        foundMember = members.find(
          (m) =>
            m.displayName.toLowerCase() === lowerDisplayName ||
            m.user.username.toLowerCase() === lowerDisplayName,
        );
      }

      if (foundMember) {
        displayNameToId.set(displayName, foundMember.id);
      }
    } catch (_error) {
      // If we can't fetch members, skip this mention
      continue;
    }
  }

  // Replace formatted mentions with Discord mentions
  let formattedContent = content;
  for (const [displayName, userId] of displayNameToId.entries()) {
    // Use word boundaries to avoid partial replacements
    const mentionRegex = new RegExp(`@${displayName}\\b`, "g");
    formattedContent = formattedContent.replace(mentionRegex, `<@${userId}>`);
  }

  return formattedContent;
};

/**
 * Extracts all mentioned users from an event and its parent chain.
 *
 * @param event - The event to extract users from
 * @returns Array of unique users mentioned in the event chain
 */
export const extractMentionedUsers = (
  event: AnyBottEvent,
): BottUser[] => {
  const users = new Map<string, BottUser>();

  // Add user from current event
  if (event.user) {
    users.set(event.user.id, event.user);
  }

  // Add users from parent chain
  let current = event.parent;
  while (current) {
    if (current.user) {
      users.set(current.user.id, current.user);
    }
    current = current.parent;
  }

  return Array.from(users.values());
};
