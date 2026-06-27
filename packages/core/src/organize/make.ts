import { createServer, IncomingMessage, ServerResponse } from 'http'
import { compose } from './compose'

type Composed = ReturnType<typeof compose>

async function toWebRequest(req: IncomingMessage): Promise<Request> {
	const url = `http://${req.headers.host}${req.url}`
	const headers = new Headers()

	for (const key in req.headers) {
		const value = req.headers[key]

		if (typeof value === 'string') {
			headers.set(key, value)
		}

		if (Array.isArray(value)) {
			headers.set(key, value.join(', '))
		}
	}

	if (req.method === 'GET' || req.method === 'HEAD') {
		return new Request(url, { method: req.method, headers })
	}

	const chunks: Buffer[] = []

	for await (const chunk of req) {
		chunks.push(chunk)
	}

	const body = Buffer.concat(chunks)
	return new Request(url, { method: req.method, headers, body })
}

async function writeWebResponse(webResponse: Response, res: ServerResponse): Promise<void> {
	res.statusCode = webResponse.status

	webResponse.headers.forEach((value, key) => {
		res.setHeader(key, value)
	})

	if (webResponse.body === null) {
		res.end()
		return
	}

	const reader = webResponse.body.getReader()

	while (true) {
		const next = await reader.read()

		if (next.done) {
			break
		}

		res.write(next.value)
	}

	res.end()
}
// Request in, Response out, nothing Node-specific — this is the part
// that ports to Bun/Deno/Workers unchanged when you need it later
async function handle(request: Request, composed: Composed): Promise<Response> {
	const url = new URL(request.url)

	if (url.pathname === '/meta') {
		return Response.json(composed.descriptor)
	}

	const route = request.headers.get('x-amx-id')

	if (route === null) {
		return Response.json({ data: null, errors: null })
	}

	let payload

	try {
		payload = await request.json()
	} catch {
		payload = undefined
	}

	try {
		const data = await composed.dispatch(route, payload)
		return Response.json({ data, errors: null })
	} catch (error) {
		let message = 'unknown error'

		if (error instanceof Error) {
			message = error.message
		}

		return Response.json({ data: null, errors: message }, { status: 400 })
	}
}

// export function make(composed: Composed) {
// 	return {
// 		listen(port: number) {
// 			const server = createServer((req, res) => {
// 				toWebRequest(req)
// 					.then((request) => handle(request, composed))
// 					.then((response) => writeWebResponse(response, res))
// 					.catch((error) => {
// 						res.statusCode = 500
// 						res.end('internal error')
// 					})
// 			})

// 			server.listen(port)
// 			return server
// 		},
// 	}
// }
