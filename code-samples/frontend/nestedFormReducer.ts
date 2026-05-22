/*
 * ILLUSTRATIVE / REWRITTEN SAMPLE — not production source.
 *
 * The Kidney Transplant assessment forms have 80+ fields across deeply nested
 * sections. Instead of a setter per field (or a heavier form library), I drive
 * the whole form with one reducer that addresses any nested leaf by a dot-path
 * string and updates it immutably.
 *
 *   dispatch({ type: "UPDATE_FIELD",
 *     payload: { form: "donor",
 *                field: "immunologicalDetails.crossMatch.tCell",
 *                value: "negative" } });
 */

export type FormState = Record<string, any>;

export type FormAction =
  | { type: "UPDATE_FIELD"; payload: { form: string; field: string; value: unknown } }
  | { type: "SET_FORM_DATA"; payload: { form: string; data: Record<string, unknown> } };

/** Immutably set a value at a dot-path within an object, cloning only the touched path. */
function setAtPath(target: Record<string, any>, path: string[], value: unknown): Record<string, any> {
  const [head, ...rest] = path;
  const clone = { ...target };
  if (rest.length === 0) {
    clone[head] = value;
  } else {
    clone[head] = setAtPath(target[head] ?? {}, rest, value);
  }
  return clone;
}

export function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "UPDATE_FIELD": {
      const { form, field, value } = action.payload;
      const section = state[form];
      if (!section) return state; // unknown form section — ignore safely
      return { ...state, [form]: setAtPath(section, field.split("."), value) };
    }
    case "SET_FORM_DATA": {
      const { form, data } = action.payload;
      return { ...state, [form]: { ...state[form], ...data } };
    }
    default:
      return state;
  }
}

/*
 * Why this shape:
 *  - One predictable update path for the entire form tree — no bespoke setter
 *    per section, so adding a new field/section is zero new wiring.
 *  - Structural sharing: only nodes along the changed path are re-created, so
 *    React re-renders just the affected subtree.
 *  - Tiny and pure → trivially unit-testable, and reused across the donor,
 *    recipient, and surgery forms.
 *
 * Example test:
 *   const s = { donor: { immunologicalDetails: { crossMatch: { tCell: "" } } } };
 *   const next = formReducer(s, { type: "UPDATE_FIELD",
 *     payload: { form: "donor", field: "immunologicalDetails.crossMatch.tCell", value: "neg" } });
 *   // next.donor.immunologicalDetails.crossMatch.tCell === "neg"
 *   // s is unchanged (immutability preserved)
 */
