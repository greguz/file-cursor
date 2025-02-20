import tap from 'tap'

tap.test('constructor', async t => {
  t.plan(4)

  const { FileCursor } = await import('./file-cursor.mjs')

  t.throws(() => new FileCursor(), { message: 'Expected options object' })
  t.throws(() => new FileCursor({}), { message: 'Expected file descriptor' })
  t.ok(new FileCursor({ fd: -1 }))
  t.ok(new FileCursor({ fileHandle: {} }))
})

function fromString (data, ...notifiers) {
  return function readMock (fd, buffer, offset, length, position, callback) {
    const notify = notifiers.shift()
    if (notify) {
      notify(fd, length, position)
    }

    process.nextTick(() => {
      const chunk = data.substring(position, position + length)
      const bytesRead = chunk.length
      if (bytesRead) {
        buffer.write(chunk, offset)
      }
      callback(null, bytesRead)
    })
  }
}

tap.test('happy path', async t => {
  t.plan(10)

  const { FileCursor } = await t.mockImport('./file-cursor.mjs', {
    'node:fs': {
      read: fromString(
        'qwertyuiop',
        (fd, length, position) => {
          t.equal(fd, 'Bit Butler')
          t.equal(length, 128)
          t.equal(position, 0)
        },
        () => {
          t.fail()
        }
      )
    }
  })

  const cursor = new FileCursor({
    fd: 'Bit Butler',
    bufferSize: 128
  })
  t.match(cursor, {
    bufferSize: 128,
    fd: 'Bit Butler',
    position: 0
  })

  const a = await cursor.seek(4)
  t.match(cursor, { position: 4 })
  t.equal(a.toString(), 'qwer')

  const b = await cursor.seek(4)
  t.match(cursor, { position: 8 })
  t.equal(b.toString(), 'tyui')

  const c = await cursor.seek(4)
  t.match(cursor, { position: 10 })
  t.equal(c.toString(), 'op')
})

tap.test('iterable', async t => {
  t.plan(19)

  const { FileCursor } = await t.mockImport('./file-cursor.mjs', {
    'node:fs': {
      read: fromString(
        '1234567890qwertyuiopasdfghjklzxcvbnm',
        (fd, length, position) => {
          t.equal(fd, 'Bytey McBytes')
          t.equal(length, 8)
          t.equal(position, 0)
        },
        (fd, length, position) => {
          t.equal(fd, 'Bytey McBytes')
          t.equal(length, 8)
          t.equal(position, 8)
        },
        (fd, length, position) => {
          t.equal(fd, 'Bytey McBytes')
          t.equal(length, 8)
          t.equal(position, 16)
        },
        (fd, length, position) => {
          t.equal(fd, 'Bytey McBytes')
          t.equal(length, 8)
          t.equal(position, 24)
        },
        (fd, length, position) => {
          t.equal(fd, 'Bytey McBytes')
          t.equal(length, 8)
          t.equal(position, 32)
        },
        () => {
          t.fail()
        }
      )
    }
  })

  const cursor = new FileCursor({
    fd: 'Bytey McBytes',
    bufferSize: 8
  })
  t.match(cursor, {
    bufferSize: 8,
    fd: 'Bytey McBytes',
    position: 0
  })

  const chunks = []
  for await (const chunk of cursor) {
    chunks.push(chunk)
  }

  t.equal(chunks.length, 5)
  t.equal(
    Buffer.concat(chunks).toString(),
    '1234567890qwertyuiopasdfghjklzxcvbnm'
  )

  t.equal(cursor.position, 36)
})

tap.test('skip from cache', async t => {
  t.plan(9)

  const { FileCursor } = await t.mockImport('./file-cursor.mjs', {
    'node:fs': {
      read: fromString(
        'qwertyuiop',
        (fd, length, position) => {
          t.equal(fd, 'The Unflushable')
          t.equal(length, 128)
          t.equal(position, 0)
        },
        () => {
          t.fail()
        }
      )
    }
  })

  const cursor = new FileCursor({
    fd: 'The Unflushable',
    bufferSize: 128
  })
  t.match(cursor, {
    bufferSize: 128,
    eof: false,
    fd: 'The Unflushable',
    position: 0
  })

  const a = await cursor.seek(4)
  t.match(cursor, {
    eof: false,
    position: 4
  })
  t.equal(a.toString(), 'qwer')

  cursor.skip(4)
  t.match(cursor, {
    eof: false,
    position: 8
  })

  const b = await cursor.seek(2)
  t.match(cursor, {
    eof: false,
    position: 10
  })
  t.equal(b.toString(), 'op')
})

tap.test('validation', async t => {
  const { FileCursor } = await t.mockImport('./file-cursor.mjs', {
    'node:fs': {
      read () {
        t.fail()
      }
    }
  })

  t.throws(() => new FileCursor())
  t.throws(() => new FileCursor(null))
  t.throws(() => new FileCursor({}))
  t.ok(new FileCursor({ fileHandle: {} }))
  t.throws(() => new FileCursor({ bufferSize: '42', fileHandle: {} }))
  t.throws(() => new FileCursor({ position: '42', fileHandle: {} }))

  const cursor = new FileCursor({ fd: 'Open Sesame' })

  t.throws(() => { cursor.position = '0' })
  t.throws(() => { cursor.set('0') })
  t.throws(() => { cursor.skip('0') })
  await t.rejects(cursor.seek('0'))
  await cursor.seek(0)
})

tap.test('initial position', async t => {
  t.plan(5)

  const { FileCursor } = await t.mockImport('./file-cursor.mjs', {
    'node:fs': {
      read: fromString(
        '1.21 gigawatts?!',
        (fd, length, position) => {
          t.equal(fd, 'Descripto Patronum')
          t.equal(length, 42)
          t.equal(position, 5)
        },
        () => {
          t.fail()
        }
      )
    }
  })

  const cursor = new FileCursor({
    fd: 'Descripto Patronum',
    bufferSize: 42,
    position: 5
  })
  t.match(cursor, {
    position: 5
  })

  const buffer = await cursor.seek(9)
  t.equal(buffer.toString(), 'gigawatts')
})
