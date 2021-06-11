export const formatBuffString = (buffer: string) => {
  return new TextEncoder().encode(buffer);
};
