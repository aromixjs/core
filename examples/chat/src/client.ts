import { encode, decode } from '@msgpack/msgpack'

const WS_URL = process.env.WS_URL || 'ws://localhost:3030'
const USERNAME = process.env.USERNAME || `User_${Math.floor(Math.random() * 1000)}`

const ws = new WebSocket(WS_URL)
ws.binaryType = 'arraybuffer'

ws.onopen = () => {
    console.log(`Connected as ${USERNAME}`)
    ws.send(encode({ type: 'join', username: USERNAME, timestamp: Date.now() }))

    // Send a message after 1 second
    setTimeout(() => {
        ws.send(encode({ type: 'message', text: `Hello from ${USERNAME}!`, timestamp: Date.now() }))
    }, 1000)

    // Send another message after 2 seconds
    setTimeout(() => {
        ws.send(encode({ type: 'message', text: 'This is a real-time chat over msgpack!', timestamp: Date.now() }))
    }, 2000)

    // Close after 3 seconds
    setTimeout(() => {
        ws.close()
        console.log('\nChat test complete')
        process.exit(0)
    }, 3000)
}

ws.onmessage = (event) => {
    const msg = decode(new Uint8Array(event.data as ArrayBuffer)) as any
    const time = new Date(msg.timestamp).toLocaleTimeString()
    switch (msg.type) {
        case 'join':
            console.log(`[${time}] ${msg.username} joined (${msg.users} online)`)
            break
        case 'message':
            console.log(`[${time}] ${msg.username}: ${msg.text}`)
            break
        case 'leave':
            console.log(`[${time}] ${msg.username} left (${msg.users} online)`)
            break
    }
}

ws.onerror = (err) => console.error('WS error:', err)
ws.onclose = () => console.log('Disconnected')
