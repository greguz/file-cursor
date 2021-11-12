export interface FileCursorOptions {
  /**
   * File descriptor got from [fs.open](https://nodejs.org/api/fs.html#fsopenpath-flags-mode-callback).
   */
  fileDescriptor?: number;
  /**
   * Instance of [FileHandle](https://nodejs.org/api/fs.html#class-filehandle) got from [fsPromises.open](https://nodejs.org/api/fs.html#fspromisesopenpath-flags-mode).
   */
  fileHandle?: any;
  /**
   * Internal buffer size in bytes. Defaults to 16 KiB (Node.js default).
   * @default 16384
   */
  bufferSize?: number;
  /**
   * Inclusive start index number. If specified, the file will be virtually read from that index.
   * @default 0
   */
  startFrom?: number
  /**
   * Inclusive EOF index number. If specified, the EOF will be virtually reached at that index.
   * @default Infinity
   */
  endAt?: number
}

export declare class FileCursor {
  /**
   * Is `true` when the End Of File (EOF) is reached.
   */
  get EOF(): number;
  /**
   * Current cursor position (index).
   */
  get position(): number;
  /**
   * The numeric file descriptor managed by the [`<FileHandle>`](https://nodejs.org/api/fs.html#class-filehandle) object.
   */
  fd: number;
  /**
   * @constructor
   */
  constructor(options: FileCursorOptions);
  /**
   * Seeks bytes from the file and moves the cursor onward accordingly. It throws an error if the EOF is reached before retrieving all requested bytes.
   */
  read(length: number): Promise<Buffer>;
  /**
   * Seeks bytes from the file and moves the cursor onward accordingly.
   */
  seek(length: number): Promise<Buffer>;
  /**
   * Seeks bytes from the file until the `predicate` returns `true` and moves the cursor onward accordingly.
   */
  seekUntil(
    predicate: (byte: number, position: number) => boolean
  ): Promise<Buffer>;
  /**
   * Sets cursor position.
   */
  set(position: number): Promise<void>;
  /**
   * Moves the cursor's position onward by the specified bytes.
   */
  skip(length: number): Promise<void>;
}
