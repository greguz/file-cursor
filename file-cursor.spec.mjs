import test from 'ava'
import { open, unlink, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import * as path from 'path'

import { FileCursor } from './file-cursor.mjs'

let index = 0
async function writeAndOpen (t, buffer) {
  const file = path.join(tmpdir(), `file_cursor_${index++}.test`)
  let fileHandle = null
  await writeFile(file, buffer)
  t.teardown(async () => {
    if (fileHandle) {
      await fileHandle.close()
    }
    await unlink(file)
  })
  fileHandle = await open(file)
  return fileHandle
}

test('test', async t => {
  const fileHandle = await writeAndOpen(
    t,
    Buffer.from([
      0x48,
      0x65,
      0x6c,
      0x6c,
      0x6f,
      0x20,
      0x57,
      0x6f,
      0x72,
      0x6c,
      0x64
    ])
  )

  const cursor = new FileCursor({ fileHandle })
  t.is(cursor.position, 0)

  const a = await cursor.seek(1)
  t.true(Buffer.isBuffer(a))
  t.is(a.byteLength, 1)
  t.is(a[0], 0x48)
  t.is(cursor.position, 1)
  t.false(cursor.EOF)

  const b = await cursor.read(3)
  t.true(Buffer.isBuffer(b))
  t.is(b.byteLength, 3)
  t.is(b[0], 0x65)
  t.is(b[1], 0x6c)
  t.is(b[2], 0x6c)
  t.is(cursor.position, 4)
  t.false(cursor.EOF)

  await cursor.skip(1)
  t.false(cursor.EOF)

  const c = await cursor.seekUntil(byte => {
    t.is(byte, 0x20)
    return true
  })
  t.true(Buffer.isBuffer(c))
  t.is(c.byteLength, 1)
  t.is(c[0], 0x20)
  t.is(cursor.position, 6)
  t.false(cursor.EOF)

  await cursor.skip(42)
  t.true(cursor.EOF)

  await t.throwsAsync(cursor.read(1), { message: 'Truncated (EOF)' })
  await cursor.read(0)
})

test('throws', async t => {
  t.throws(() => new FileCursor())
  t.throws(() => new FileCursor({}))
  t.throws(
    () => new FileCursor({
      fileDescriptor: -1,
      bufferSize: 0
    })
  )
  t.throws(
    () => new FileCursor({
      fileDescriptor: -1,
      startFrom: -1
    })
  )
  t.throws(
    () => new FileCursor({
      fileDescriptor: -1,
      endAt: -1
    })
  )
  t.throws(
    () => new FileCursor({
      fileDescriptor: -1,
      endAt: 0.1
    })
  )
  const cursor = new FileCursor({
    bufferSize: 1,
    fileDescriptor: -1,
    startFrom: 1,
    endAt: 1
  })
  await t.throwsAsync(cursor.read(null), { message: 'Invalid length' })
  await t.throwsAsync(cursor.seek(null), { message: 'Invalid length' })
  await t.throwsAsync(cursor.set(null), { message: 'Invalid position' })
  await t.throwsAsync(cursor.skip(null), { message: 'Invalid length' })
})

test('virtual', async t => {
  const fileHandle = await writeAndOpen(
    t,
    Buffer.from([
      0x00,
      0x01,
      0x02, // < startFrom
      0x03,
      0x04,
      0x05,
      0x06,
      0x07,
      0x08,
      0x09, // < endAt
      0x10,
      0x11,
      0x12,
      0x13,
      0x14,
      0x15
    ])
  )
  t.teardown(() => fileHandle.close())

  const cursor = new FileCursor({
    fileHandle,
    bufferSize: 2,
    startFrom: 2,
    endAt: 9
  })

  const a = await cursor.read(1)
  t.is(a.byteLength, 1)
  t.is(a[0], 0x02)

  const b = await cursor.read(5)
  t.is(b.byteLength, 5)
  t.is(b[0], 0x03)
  t.is(b[1], 0x04)
  t.is(b[2], 0x05)
  t.is(b[3], 0x06)
  t.is(b[4], 0x07)

  const c = await cursor.seekUntil(() => false)
  t.is(c.byteLength, 2)
  t.true(cursor.EOF)
  t.is(c[0], 0x08)
  t.is(c[1], 0x09)

  await cursor.set(14)
  t.true(cursor.EOF)

  await cursor.set(0)
  t.false(cursor.EOF)

  const d = await cursor.read(2)
  t.is(d.byteLength, 2)
  t.false(cursor.EOF)
  t.is(d[0], 0x02)
  t.is(d[1], 0x03)
})
