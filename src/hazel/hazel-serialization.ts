import { Exp, atom, comp } from "../syntax/Exp";

/**
 * Bidirectional serialization between Nool expressions and Hazel ADT format
 */

export type HazelADT = { t: string; v?: any };

/**
 * Convert Nool expression to Hazel ADT format
 */
export function expToHazel(exp: Exp): HazelADT {
  switch (exp.t) {
    case "Atom":
      return { t: "Atom", v: exp.sym };
    case "Comp":
      if (exp.kids.length === 0) {
        return { t: "Comp" }; // nullary - no v field
      }
      return { t: "Comp", v: exp.kids.map(expToHazel) };
  }
}

/**
 * Convert Hazel ADT format to Nool expression
 */
export function hazelToExp(hazel: HazelADT): Exp {
  switch (hazel.t) {
    case "Atom":
      return atom(hazel.v as string);
    case "Comp":
      return comp(hazel.v ? (hazel.v as any[]).map(hazelToExp) : []);
    default:
      // Fallback for unknown constructor types
      return atom("❓");
  }
}

/**
 * Serialize Nool expression to JSON string for Hazel
 */
export function serializeForHazel(exp: Exp): string {
  return JSON.stringify(expToHazel(exp));
}

/**
 * Deserialize Hazel JSON string to Nool expression
 */
export function deserializeFromHazel(json: string): Exp {
  try {
    const parsed = JSON.parse(json) as HazelADT;
    return hazelToExp(parsed);
  } catch (error) {
    console.warn("Failed to parse Hazel JSON, using fallback:", error);
    return atom("❓");
  }
}