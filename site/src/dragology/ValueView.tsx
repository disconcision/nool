import React, { createContext, ReactNode, useContext } from "react";
import { elementName, Svgx } from "./svgx";

/**
 * A value Dragology shows in a debug view or error message, tagged with
 * what kind of value it is so a formatter can treat each kind its own way.
 *
 * - `"state"`: one of your draggable's states.
 * - `"svg"`: an element from a rendered SVG tree.
 */
export type ValueViewProps =
  | { kind: "state"; value: unknown }
  | { kind: "svg"; value: Svgx };

export type ValueViewComponent = React.ComponentType<ValueViewProps>;

/**
 * The formatter used when none is provided: JSON for states, a tag-like
 * outline for SVG elements. Deliberately plain, so the library doesn't
 * pull in a pretty-printer.
 */
export function DefaultValueView(props: ValueViewProps) {
  return (
    <pre
      style={{
        margin: 0,
        fontSize: "11px",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {props.kind === "state"
        ? stringifyState(props.value)
        : stringifySvg(props.value)}
    </pre>
  );
}

const ValueViewContext = createContext<ValueViewComponent>(DefaultValueView);

/**
 * Sets the component Dragology uses to show values (states, SVG elements)
 * in its debug views and error messages, for everything inside it.
 */
export function ValueViewProvider({
  component,
  children,
}: {
  component: ValueViewComponent;
  children?: ReactNode;
}) {
  return (
    <ValueViewContext.Provider value={component}>
      {children}
    </ValueViewContext.Provider>
  );
}

/** Shows a value with whatever `ValueViewProvider` set, or the default. */
export function ValueView(props: ValueViewProps) {
  const Component = useContext(ValueViewContext);
  return <Component {...props} />;
}

// # Default formatting

function stringifyState(value: unknown): string {
  // Ancestors of the value being replaced, to tell a cycle from a value
  // that's merely shared. JSON.stringify calls the replacer with `this`
  // set to the object holding the current key.
  const ancestors: unknown[] = [];
  try {
    return (
      JSON.stringify(
        value,
        function (this: unknown, _key, v: unknown) {
          while (ancestors.length > 0 && ancestors.at(-1) !== this) {
            ancestors.pop();
          }
          if (typeof v === "object" && v !== null) {
            if (ancestors.includes(v)) return "[Circular]";
            ancestors.push(v);
          }
          return jsonSafe(v);
        },
        2,
      ) ?? String(value)
    );
  } catch {
    return String(value);
  }
}

function jsonSafe(v: unknown): unknown {
  if (typeof v === "number" && !Number.isInteger(v)) {
    return Math.round(v * 100) / 100;
  }
  if (typeof v === "function") return `[Function ${v.name || "anonymous"}]`;
  if (typeof v === "bigint") return `${v}n`;
  if (typeof v === "symbol") return v.toString();
  if (v instanceof Map) return Object.fromEntries(v);
  if (v instanceof Set) return [...v];
  return v;
}

function stringifySvg(node: unknown, indent = ""): string {
  if (!React.isValidElement(node)) {
    return indent + (typeof node === "string" ? node : stringifyState(node));
  }
  const element = node as React.ReactElement<Record<string, unknown>>;
  // Fragments (whose type is a symbol) have no name: print `<>`.
  const name = elementName(element as Svgx) ?? "";
  const { children, ...props } = element.props;
  const attrs = Object.entries(props)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => ` ${k}=${attrValue(v)}`)
    .join("");
  const kids = React.Children.toArray(children as ReactNode);
  if (kids.length === 0) return `${indent}<${name}${attrs} />`;
  return [
    `${indent}<${name}${attrs}>`,
    ...kids.map((kid) => stringifySvg(kid, indent + "  ")),
    `${indent}</${name}>`,
  ].join("\n");
}

function attrValue(v: unknown): string {
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "function") return "{ƒ}";
  return `{${stringifyState(v).replace(/\s*\n\s*/g, " ")}}`;
}
