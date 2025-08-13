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
 * Represents scores assigned to incoming events during evaluation.
 * All scores use a 1-5 scale for consistency.
 */
export interface GeminiInputEventScores {
  /** How serious vs sarcastic the message is (1=very sarcastic, 5=very serious) */
  seriousness?: number;
  /** How important/urgent the message is (1=low priority, 5=high priority) */
  importance?: number;
  /** How directly the message is targeted at Bott (1=not directed, 5=directly addressed) */
  directedAtBott?: number;
  /** How much the message needs fact checking (1=no fact checking needed, 5=needs verification) */
  factCheckingNeed?: number;
  /** How much the user needs conversational support (1=no support needed, 5=needs help) */
  supportNeed?: number;
}

/**
 * Represents scores assigned to outgoing events during evaluation.
 * All scores use a 1-5 scale for consistency.
 */
export interface GeminiOutputEventScores {
  /** How relevant the message is to the conversation (1=irrelevant, 5=highly relevant) */
  relevance?: number;
  /** How redundant the message is vs what others have said (1=very redundant, 5=very novel) */
  redundancy?: number;
  /** How wordy/verbose the message is (1=very wordy, 5=very concise) */
  wordiness?: number;
  /** How necessary the message is to conversation flow (1=unnecessary, 5=essential) */
  necessity?: number;
}

/**
 * Combined scores interface for compatibility
 */
export interface GeminiEventScores
  extends GeminiInputEventScores, GeminiOutputEventScores {}
