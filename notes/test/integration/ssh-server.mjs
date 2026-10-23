import ssh2 from 'ssh2'
import { generateKeyPairSync } from 'crypto'

const { Server } = ssh2

const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
  publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
})

const server = new Server({ hostKeys: [privateKey] }, client => {
  client.on('error', error => {
    console.error('SSH client error:', error.message)
  })

  client.on('authentication', context => {
    if (context.method === 'password' && context.username === 'test' && context.password === 'test') {
      context.accept()
      return
    }
    if (context.method === 'none') {
      context.reject(['password'])
      return
    }
    context.reject(['password'])
  })

  client.on('ready', () => {
    client.on('session', accept => {
      const session = accept()
      session.on('pty', (acceptPty) => acceptPty?.())
      session.on('window-change', (acceptWindowChange) => acceptWindowChange?.())
      session.on('shell', acceptShell => {
        const stream = acceptShell()
        stream.write('SSH Notes integration test server\r\n$ ')
        stream.on('data', data => {
          const text = data.toString()
          if (text.includes('osc')) {
            stream.write('\x1b]0;SERVER-OSC-TITLE\x07')
          }
          if (text.includes('exit')) {
            stream.exit(0)
            stream.end()
            return
          }
          stream.write(text)
        })
      })
    })
  })
})

server.listen(2222, '127.0.0.1', () => {
  console.log('SSH test server listening on 127.0.0.1:2222 (user test / password test)')
})
