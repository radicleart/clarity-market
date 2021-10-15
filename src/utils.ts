export const formatBuffString = (buffer: string): ArrayBuffer => {
  return new TextEncoder().encode(buffer);
};
