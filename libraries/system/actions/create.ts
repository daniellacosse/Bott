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

import type { BottEventActionParameterEntry } from "@bott/events";
import type {
  BottAction,
  BottActionContext,
  BottActionFunction,
  BottActionHandler,
  BottActionSettings,
} from "@bott/actions";

export function createAction(
  fn: BottActionHandler,
  settings: BottActionSettings,
): BottAction {
  const wrapper: BottActionFunction = async function* (
    this: BottActionContext,
    parameters: BottEventActionParameterEntry[],
  ) {
    const paramsObject = parameters.reduce(
      (acc, p) => ({ ...acc, [p.name]: p.value }),
      {},
    );
    // @ts-ignore: Bind context
    const boundFn = fn.bind(this);
    // @ts-ignore: Call generator
    const generator = boundFn(paramsObject);

    // Yield all events and capture return value
    return yield* generator;
  };

  const action = wrapper as unknown as BottAction;
  const { name, ...otherSettings } = settings;

  Object.defineProperty(action, "name", { value: name });
  Object.assign(action, otherSettings);

  return action;
}
