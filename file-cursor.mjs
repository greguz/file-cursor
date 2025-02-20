import { read } from 'node:fs'

/**
 * Customized `fs.read`.
 */
function readPromise (fd, length, position) {
  return new Promise((resolve, reject) => {
    const buffer = Buffer.alloc(length)

    read(
      fd,
      buffer,
      0,
      length,
      position,
      (err, bytesRead) => {
        if (err) {
          reject(err)
        } else if (bytesRead < length) {
          resolve(buffer.subarray(0, bytesRead))
        } else {
          resolve(buffer)
        }
      }
    )
  })
}

/**
 * Shorter than `Number.isInteger` :)
 */
function isInteger (value) {
  return typeof value === 'number' && Number.isInteger(value)
}

export class FileCursor {
  /**
   * Part of iterable protocol.
   */
  [Symbol.asyncIterator] () {
    return this
  }

  /**
   * Returns `true` when End Of File is reached.
   */
  get eof () {
    return this._eof === true && this._index >= this._buffer.byteLength
  }

  /**
   * Gets current cursor position (index).
   */
  get position () {
    return this._position + this._index
  }

  /**
   * Sets current cursor position (index).
   */
  set position (value) {
    if (!isInteger(value) || value < 0) {
      throw new TypeError('Expected positive integer or zero')
    }

    this._eof = false
    if (
      value >= this._position &&
      value < this._position + this._buffer.byteLength
    ) {
      // Use cached buffer
      this._index = value - this._position
    } else {
      // Reset status
      this._buffer = Buffer.alloc(0)
      this._index = 0
      this._position = value
    }
  }

  /**
   * @constructor
   * @param {Object} options
   * @param {number} [options.fd] File descriptor got from `fs.open`.
   * @param {FileHandle} [options.fileHandle] Instance of `FileHandle` got from `fsPromises.open`.
   * @param {number} [options.bufferSize=16384] Internal buffer size in bytes, defaults to 16 KiB.
   * @param {number} [options.position=0] Initial cursor position (index), defaults to `0`.
   */
  constructor (options) {
    if (typeof options !== 'object' || options === null) {
      throw new TypeError('Expected options object')
    }

    if (options.fd !== undefined) {
      this.fd = options.fd
    } else if (options.fileHandle !== undefined) {
      this.fd = options.fileHandle.fd
    } else {
      throw new Error('Expected file descriptor')
    }

    const bufferSize = options.bufferSize || 16384
    if (!isInteger(bufferSize) || bufferSize <= 0) {
      throw new TypeError('Buffer size must be a positive integer')
    }

    const position = options.position || 0
    if (!isInteger(position) || position < 0) {
      throw new TypeError('Initial position a positive integer or zero')
    }

    // Buffer allocation
    this.bufferSize = bufferSize

    // Current read section
    this._buffer = Buffer.alloc(0)

    // Buffer's index
    this._index = 0

    // File position (index) from which the Buffer was read
    this._position = position

    // Status flag
    this._eof = false
  }

  /**
   * Part of iterable protocol.
   */
  async next () {
    if (this.eof) {
      return { done: true }
    }

    const buffer = await this.seek(this.bufferSize)
    if (!buffer.byteLength) {
      return { done: true }
    }
    return {
      done: false,
      value: buffer
    }
  }

  /**
   * Seeks bytes from the file and moves the cursor onward accordingly.
   * Guarantees at most a single `fs.read()`.
   */
  async seek (length) {
    if (!isInteger(length) || length < 0) {
      throw new TypeError('Expected positive integer or zero')
    }
    if (length === 0) {
      return Buffer.alloc(0)
    }

    // Heading buffer (from cache, if any)
    let head

    if (this._index < this._buffer.byteLength) {
      const offset = Math.min(
        this._buffer.byteLength - this._index,
        length
      )

      head = this._buffer.subarray(
        this._index,
        this._index + offset
      )

      this._index += offset

      if (head.byteLength >= length) {
        return head
      }

      length -= head.byteLength
    }

    if (this._eof) {
      return head || Buffer.alloc(0)
    }

    const readSize = Math.max(this.bufferSize, length)
    this._buffer = await readPromise(
      this.fd,
      readSize,
      this.position
    )

    this._eof = this._buffer.byteLength < readSize

    // Move absolute position
    this._position = this.position

    // Set buffer index accordingly (needs to be after position getter)
    this._index = Math.min(length, this._buffer.byteLength)

    const tail = this._buffer.subarray(0, this._index)
    return head
      ? Buffer.concat([head, tail])
      : tail
  }

  /**
   * Alias for `position` setter.
   */
  set (position) {
    this.position = position
    return this
  }

  /**
   * Skips a number of bytes from being read.
   */
  skip (offset) {
    if (!isInteger(offset) || offset < 0) {
      throw new TypeError('Expected positive integer or zero')
    }
    if (offset > 0) {
      this.set(this.position + offset)
    }
    return this
  }
}
