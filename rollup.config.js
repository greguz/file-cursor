export default {
  input: 'file-cursor.mjs',
  output: {
    file: 'file-cursor.cjs',
    format: 'cjs'
  },
  external: ['fs', 'util']
}
