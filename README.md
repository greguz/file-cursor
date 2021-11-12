# file-cursor

Node.js has a nice FS implementation in place. But there are no simple methods to open a file cursor and jump forward or backward through bytes easily (as far as I know). This library should be an optimized way to handle gigantic files and hops back and forth between bytes without too many problems.

## Why and how does It work

The goal is to read a sequence of bytes from a file's random place without allocating everything in memory.

Node.js uses native code to do that, but It needs to be used from the JavaScript side (our side). This transition will add some wait time to the execution. To be more efficient, components like FS streams fetch larger chunks of memory (16 KiB by default) from the C++ side.

The cursor mimics that mechanism and locally cache a proper size of data in memory to be consumed when required. The cache size is still configurable.

## Features

- **Zero dependencies**: small footprint.
- **ES modules support**: you can jump on the "new era" wagon right now.
- **CommonJS modules support**: classic runtimes are still supported.
- **Configurable internal buffer size**: memory allocation fine tuning.
- **Virtual limits**: declares file limits for the cursor.
- **TypeScript support**

## Example

```javascript
// Hello Cursor

import { open } from 'fs/promises'
import { FileCursor } from 'file-cursor'
import { fileURLToPath } from 'url'

async function foo () {
  // Open this file
  const fileHandle = await open(fileURLToPath(import.meta.url))

  // Create the cursor
  const cursor = new FileCursor({ fileHandle })

  // Skip first 3 bytes (comment and single space at the beginning of this file)
  await cursor.skip(3)

  // Seek for the next 12 bytes
  const buffer = await cursor.seek(12)

  // Print the result as UTF-8 string (will log "Hello Cursor")
  console.log(buffer.toString())

  // Close the file descriptor when done
  await fileHandle.close()
}

foo()
```

## API

### **new FileCursor(options)**

Either `fileDescriptor` or `fileHandle` option must be provided.

- `options` `<Object>`
  - `[fileDescriptor]` `<Number>`
  - `[fileHandle]` [`<FileHandle>`](https://nodejs.org/api/fs.html#class-filehandle)
  - `[bufferSize]` `<Number>` Defaults to `16384`.
  - `[startFrom]` `<Number>` Inclusive virtual upper limit (index). Default to `0`.
  - `[endAt]` `<Number>` Inclusive virtual lower limit (index). Defaults to `Infinity`.

### **FileCursor#fd**

The numeric file descriptor managed by the [`<FileHandle>`](https://nodejs.org/api/fs.html#class-filehandle) object.

### **FileCursor#position**

Current cursor position (index).

### **FileCursor#EOF**

Is `true` when the End Of File (EOF) is reached.

### **FileCursor#seek(length)**

Seeks bytes from the file and moves the cursor onward accordingly.

- `length` `<Number>` Number of bytes to seek.
- Returns: `<Promise>` Fulfills with the read bytes.

### **FileCursor#seekUntil(predicate)**

Seeks bytes from the file until the `predicate` returns `true` and moves the cursor onward accordingly.

- `predicate` `<Function>`
  - `byte` `<Number>` Current read byte.
  - `position` `<Number>` Current cursor position.
- Returns: `<Promise>` Fulfills with the read bytes.

### **FileCursor#read(length)**

Seeks bytes from the file and moves the cursor onward accordingly. It throws an error if the EOF is reached before retrieving all requested bytes.

- `length` `<Number>` Number of bytes to read.
- Returns: `<Promise>` Fulfills with the read bytes.

### **FileCursor#skip(length)**

Moves the cursor's position onward by the specified bytes.

- `length` `<Number>` Number of bytes to skip.
- Returns: `<Promise>`

### **FileCursor#set(position)**

Sets cursor position.

- `position` `<Number>` Position index to jump on.
- Returns: `<Promise>`
