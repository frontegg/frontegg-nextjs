import { chunkString } from '../../../src/common/utils';

describe('utils', () => {
  it('chunkString should return array of strings with the right chunk size', () => {
    const chunkSize = 3;
    const chunks = chunkString('123456', chunkSize);
    expect(chunks.length).toEqual(2);
    expect(chunks[0].length).toEqual(chunkSize);
    expect(chunks[1].length).toEqual(chunkSize);
  });

  it('chunkString should return array of one string if chunk size is bigger then string size', () => {
    const chunkSize = 9;
    const string = '123456';
    const chunks = chunkString(string, chunkSize);
    expect(chunks.length).toEqual(1);
    expect(chunks[0].length).toEqual(string.length);
  });

  it('chunkString should return array of strings with the right chunk size and also last item if his size is not equal to chunk size', () => {
    const chunkSize = 3;
    const string = '12345678';
    const chunks = chunkString(string, chunkSize);
    expect(chunks.length).toEqual(3);
    expect(chunks[0].length).toEqual(chunkSize);
    expect(chunks[1].length).toEqual(chunkSize);
    expect(chunks[2].length).not.toEqual(chunkSize);
  });
});
