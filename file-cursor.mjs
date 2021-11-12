import { read } from 'fs'
import { promisify } from 'util'

const readPromise = promisify(read)

export class FileCursor {
  /**
   * End Of (internal) Buffer.
   */
  get EOB () {
    return this.relIndex >= this.buffer.byteLength
  }

  /**
   * Is `true` when the End Of File (EOF) is reached.
   */
  get EOF () {
    return this.eofReached && this.EOB
  }

  /**
   * Current cursor position (index).
   */
  get position () {
    return this.absIndex + this.relIndex
  }

  /**
   * @constructor
   * @param {Object} options
   * @param {number} [options.fileDescriptor]
   * @param {FileHandle} [options.fileHandle]
   * @param {number} [options.bufferSize=16384]
   * @param {number} [options.startFrom=0]
   * @param {number} [options.endAt=Infinity]
   */
  constructor (options) {
    options = Object(options)

    if (options.fileHandle !== undefined) {
      this.fd = options.fileHandle.fd
    } else if (typeof options.fileDescriptor === 'number') {
      this.fd = options.fileDescriptor
    } else {
      throw new Error('Expected file descriptor')
    }

    const bufferSize = options.bufferSize === undefined
      ? 16384
      : options.bufferSize
    if (!Number.isInteger(bufferSize) || bufferSize <= 0) {
      throw new TypeError('Buffer size must be a positive integer')
    }

    const startFrom = options.startFrom === undefined ? 0 : options.startFrom
    if (!Number.isInteger(startFrom) || startFrom < 0) {
      throw new TypeError('Start index must be a positive integer or zero')
    }

    const endAt = options.endAt === undefined
      ? Number.POSITIVE_INFINITY
      : options.endAt
    if (endAt !== Number.POSITIVE_INFINITY && !Number.isInteger(endAt)) {
      throw new TypeError('End index must be an integer or positive infinity')
    }
    if (endAt < startFrom) {
      throw new Error('End index cannot be less than start index')
    }

    this.startFrom = startFrom
    this.endAt = endAt
    this.bufferSize = bufferSize
    this.absIndex = 0
    this.relIndex = 0
    this.buffer = Buffer.alloc(0)
    this.eofReached = false
  }

  /**
   * Seeks bytes from the file and moves the cursor onward accordingly. It throws an error if the EOF is reached before retrieving all requested bytes.
   * @param {number} length Number of bytes to read.
   * @returns {Promise} Fulfills with the read bytes.
   */
  async read (length) {
    const buffer = await this.seek(length)
    if (buffer.byteLength < length) {
      throw new Error('Truncated (EOF)')
    }
    return buffer
  }

  /**
   * Seeks bytes from the file and moves the cursor onward accordingly.
   * @param {number} length Number of bytes to seek.
   * @returns {Promise} Fulfills with the read bytes.
   */
  async seek (length) {
    if (!Number.isInteger(length) || length < 0) {
      throw new TypeError('Invalid length')
    }
    if (length === 0) {
      return Buffer.alloc(0)
    }
    const lastByteIndex = this.position + length - 1
    return this.seekUntil((byte, position) => position === lastByteIndex)
  }

  /**
   * Seeks bytes from the file until the `predicate` returns `true` and moves the cursor onward accordingly.
   * @param {Function} predicate Function that takes the current byte and position as arguments.
   * @returns {Promise} Fulfills with the read bytes.
   */
  async seekUntil (predicate) {
    if (this.EOF) {
      return Buffer.alloc(0)
    }

    const chunks = []

    let done = false
    let start = this.relIndex

    while (!done) {
      if (this.EOB) {
        chunks.push(this.buffer.slice(start))
        await this.set(this.absIndex + this.buffer.byteLength)
        start = this.relIndex
      }

      const position = this.position
      const byte = this.buffer[this.relIndex++]
      done = predicate(byte, position)

      if (this.EOF) {
        done = true
      }
      if (done) {
        chunks.push(this.buffer.slice(start, this.relIndex))
      }
    }

    return Buffer.concat(chunks)
  }

  /**
   * Sets cursor position.
   * @param {number} position Position index to jump on.
   * @returns {Promise}
   */
  async set (position) {
    if (!Number.isInteger(position) || position < 0) {
      throw new TypeError('Invalid position')
    }
    if (position >= this.absIndex && position < this.absIndex + this.buffer.byteLength) {
      this.relIndex = position - this.absIndex
      return
    }

    this.absIndex = position
    this.relIndex = 0

    const realPosition = this.startFrom + position
    if (realPosition >= this.endAt) {
      this.eofReached = true
      this.buffer = Buffer.alloc(0)
      return
    }

    const eofVirtual = realPosition + this.bufferSize >= this.endAt

    const buffer = Buffer.alloc(
      eofVirtual
        ? this.endAt + 1 - realPosition
        : this.bufferSize
    )

    const { bytesRead } = await readPromise(
      this.fd,
      buffer,
      0,
      buffer.byteLength,
      realPosition
    )

    const eofReal = bytesRead < buffer.byteLength

    this.eofReached = eofReal || eofVirtual
    this.buffer = eofReal ? buffer.slice(0, bytesRead) : buffer
  }

  /**
   * Moves the cursor's position onward by the specified bytes.
   * @param {number} length Number of bytes to skip.
   * @returns {Promise}
   */
  async skip (length) {
    if (!Number.isInteger(length) || length < 0) {
      throw new TypeError('Invalid length')
    }
    return this.set(this.position + length)
  }
}
