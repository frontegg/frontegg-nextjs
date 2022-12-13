import { createFilter } from '@rollup/pluginutils';

export default function clientComponentPlugin(options= {}) {
  const filter = createFilter(options.include, options.exclude);
  const clientFiles = []

  return {
    name: 'client component',
    transform(code, map) {
      if (!filter(map)) return;
      if(map.includes('src/client')) {
        const relativeFilePath = map.split('src').pop().split('.')[0]
        const finalPath = relativeFilePath.includes('index') ? relativeFilePath : relativeFilePath.split('/').pop()
        clientFiles.push(finalPath);
      }
    },
    renderChunk(code, { fileName }) {
      if (fileName.includes('client') || clientFiles.some(file=>fileName.includes(file))) {
        return `'use client'; \n ${code}`;
      } else {
        return code;
      }
    },
  };
}
