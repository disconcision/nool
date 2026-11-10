/**
 * The demos page, in order. A plain id is a demo; a section groups
 * demos under a heading. Sections don't nest.
 */
export type DemoListEntry = string | DemoListSection;
export type DemoListSection = { section: string; demos: string[] };

// nool edit: only the algebra studies (upstream lists every demo here).
export const demoList: DemoListEntry[] = [
  "tiny-nool",
  "whiteboard",
  "animate-algebra-tree",
  "animate-algebra-stage-builder",
  "animate-algebra-tree-macro",
];

/** Every listed demo id, in page order, with sections flattened. */
export const listedDemoIds: string[] = demoList.flatMap((entry) =>
  typeof entry === "string" ? [entry] : entry.demos,
);
