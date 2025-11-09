declare module 'file-saver' {
  export function saveAs(data: Blob | File, filename?: string): void;
  const _default: { saveAs: typeof saveAs };
  export default _default;
}
