export function pathToId(path: string): string {
  return path
    .replace("../demos/", "")
    .replace(/\/index\.tsx$/, "")
    .replace(".tsx", "")
    .replace(/\//g, "-");
}
