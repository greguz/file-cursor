# file-cursor

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![Coverage Status](https://coveralls.io/repos/github/greguz/file-cursor/badge.svg?branch=master)](https://coveralls.io/github/greguz/file-cursor?branch=master)
[![npm](https://img.shields.io/npm/v/file-cursor)](https://www.npmjs.com/package/file-cursor)
![npm bundle size](https://img.shields.io/bundlephobia/minzip/file-cursor)

Node.js has a nice FS implementation in place. But there are no simple methods to open a file cursor and jump forward or backward through bytes easily (as far as I know). This library should be an optimized way to handle gigantic files and hops back and forth between bytes without too many problems.

## Why and how does It work

The goal is to read a sequence of bytes from a file's random place without allocating everything in memory.

Node.js uses native code to do that, but It needs to be used from the JavaScript side (our side). This transition will add some wait time to the execution. To be more efficient, components like FS streams fetch larger chunks of memory (16 KiB by default) from the C++ side.

The cursor mimics that mechanism and locally cache a proper size of data in memory to be consumed when required. The cache size is still configurable.

## Features

- **Zero dependencies**: small footprint.
- **Configurable internal buffer size**: memory allocation fine tuning.
- **AsyncIterator**: implements the `async` version of the iterable protocol.
- **ESM**: this project is written in pure ESM syntax.
- **CommonJS support**: classic runtimes are still supported.
- **TypeScript support**

## Example

```javascript
// Message we will print: Hello Cursor

import { open } from 'fs/promises'
import { FileCursor } from 'file-cursor'
import { fileURLToPath } from 'url'

// Open this file
const fileHandle = await open(fileURLToPath(import.meta.url))

try {
  // Create the cursor
  const cursor = new FileCursor({ fileHandle })

  // Skip first 26 bytes
  cursor.skip(26)

  // Seek for the next 12 bytes
  const buffer = await cursor.seek(12)

  // Logs "Hello Cursor"
  console.log(buffer.toString())
} finally {
  // Close the file descriptor when done
  await fileHandle.close()
}
```

## API

### `new FileCursor(options)`

Either `fd` or `fileHandle` option must be provided.

- `options` `<Object>`
  - `[fd]`: File descriptor got from [fs.open](https://nodejs.org/api/fs.html#fsopenpath-flags-mode-callback).
  - `[fileHandle]`: Instance of [FileHandle](https://nodejs.org/api/fs.html#class-filehandle) got from [fsPromises.open](https://nodejs.org/api/fs.html#fspromisesopenpath-flags-mode).
  - `[bufferSize]` `<Number>`: Internal buffer size in bytes, defaults to 16 KiB.
  - `[position]` `<Number>`: Initial cursor position (index), defaults to `0`.

### `FileCursor::fd`

Used file descriptor.

### `FileCursor::bufferSize`

Internal buffer size in bytes.

### `FileCursor::position`

Gets or sets current cursor position (index).

### `FileCursor::eof`

Returns `true` (getter) when End Of File is reached.

### `FileCursor::seek(size)`

Seeks bytes from the file and moves the cursor onward accordingly.
Guarantees at most a single `fs.read()`.

- `length` `<Number>` Number of bytes to seek.
- Returns: `<Promise>` Fulfills with the read bytes.

### `FileCursor::set(position)`

Alias for `position` setter.

- `position` `<Number>` Position (index) to jump on.
- Returns: `<FileCursor>`

### `FileCursor::skip(offset)`

Skips a number of bytes from being read.

- `offset` `<Number>` Number of bytes to skip.
- Returns: `<FileCursor>`

### `FileCursor::Symbol.AsyncIterable`

`FileCursor` class also implements the `async` version of the [iteration protocol](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols#the_async_iterator_and_async_iterable_protocols).

```javascript
for await (const buffer of cursor) {
  console.log(`read ${buffer.bytesLength} bytes`)
  console.log(`new position: ${cursor.position}`)
}

console.log(buffer.eof) // true
```