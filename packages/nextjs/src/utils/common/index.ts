/**
 * Splits a string into chunks of a specified size.
 * @param {string} str - The string to be chunked.
 * @param {number} chunkSize - The maximum size of each chunk.
 * @returns {string[]} An array of chunks of the specified size.
 */
function chunkString(str: string, chunkSize: number) {
  const numChunks = Math.ceil(str.length / chunkSize);
  const chunks: string[] = [];
  for (let i = 0; i < numChunks; i++) {
    const start = i * chunkSize;
    const end = start + chunkSize;
    chunks.push(str.substring(start, end < str.length ? end : str.length));
  }
  return chunks;
}

export { chunkString };
