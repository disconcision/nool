// Necessary to quiet TypeScript errors about m4a audio assets
declare module "*.m4a" {
  const src: string;
  export default src;
}