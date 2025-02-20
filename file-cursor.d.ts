import type { FileHandle } from 'node:fs/promises'

export interface FileCursorOptions {
  /**
   * File descriptor got from [fs.open](https://nodejs.org/api/fs.html#fsopenpath-flags-mode-callback).
   */
  fileDescriptor?: number;
  /**
   * Instance of [FileHandle](https://nodejs.org/api/fs.html#class-filehandle) got from [fsPromises.open](https://nodejs.org/api/fs.html#fspromisesopenpath-flags-mode).
   */
  fileHandle?: FileHandle;
  /**
   * Internal buffer size in bytes, defaults to 16 KiB.
   * 
   * @default 16384
   */
  bufferSize?: number;
}

export declare class FileCursor implements AsyncIterableIterator<Buffer> {
  /**
   * Part of iterable protocol.
   */
  [Symbol.asyncIterator](): this;
  /**
   * Returns `true` when End Of File is reached.
   */
  get eof(): boolean;
  /**
   * Gets current cursor position (index).
   */
  get position(): number;
  /**
   * Sets current cursor position (index).
   */
  set position(value: number);
  /**
   * Internal buffer size in bytes.
   */
  readonly bufferSize: number;
  /**
   * Used file descriptor.
   */
  readonly fd: number;
  /**
   * @constructor
   */
  constructor(options: FileCursorOptions);
  /**
   * Part of iterable protocol.
   */
  next(): Promise<IteratorResult<Buffer>>;
  /**
   * Seeks bytes from the file and moves the cursor onward accordingly.
   * Guarantees at most a single `fs.read()`.
   */
  seek(length: number): Promise<Buffer>;
  /**
   * Alias for `position` setter.
   */
  set(position: number): this;
  /**
   * Skips a number of bytes from being read.
   */
  skip(offset: number): this;
}
