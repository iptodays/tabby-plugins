const expression = process.argv.slice(2).join(' ')
if (!expression) {
  console.error('Usage: node scripts/cdp-eval.mjs "<javascript expression>"')
  process.exit(2)
}

const targets = await (await fetch('http://127.0.0.1:9222/json/list')).json()
const target = targets.find(item => item.type === 'page')
if (!target) {
  console.error('No page target found')
  process.exit(3)
}

const socket = new WebSocket(target.webSocketDebuggerUrl)
let nextId = 1

function send (method, params) {
  return new Promise((resolve, reject) => {
    const id = nextId++
    const onMessage = event => {
      const message = JSON.parse(event.data)
      if (message.id !== id) {
        return
      }
      socket.removeEventListener('message', onMessage)
      if (message.error) {
        reject(new Error(JSON.stringify(message.error)))
      } else {
        resolve(message.result)
      }
    }
    socket.addEventListener('message', onMessage)
    socket.send(JSON.stringify({ id, method, params }))
  })
}

await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve)
  socket.addEventListener('error', reject)
})

const result = await send('Runtime.evaluate', {
  expression,
  awaitPromise: true,
  returnByValue: true,
  userGesture: true,
})
console.log(JSON.stringify(result.result?.value ?? result, null, 2))
socket.close()
