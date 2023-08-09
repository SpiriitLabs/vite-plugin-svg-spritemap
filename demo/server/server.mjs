// basic http server
import { readFileSync } from 'node:fs'
import http from 'node:http'

const host = 'localhost'
const port = 8000
const html = readFileSync('./index.html', { encoding: 'utf-8' })

const requestListener = function (req, res) {
  res.setHeader('Content-Type', 'text/html')
  res.writeHead(200)
  res.end(html)
}

const server = http.createServer(requestListener)
server.listen(port, host, () => {
  // eslint-disable-next-line no-console
  console.log(`Server is running on http://${host}:${port}`)
})
