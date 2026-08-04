import { hashContent } from '@helpers/hash'

const hashPattern = /\[hash\]/g
const extPattern = /\[ext\]/g
const extnamePattern = /\[extname\]/g
const namePattern = /\[name\]/g

// Respect https://www.rollupjs.org/guide/en/#outputassetfilenames filename transformation
export function getFileName(fileName: string, name: string, content: string, ext: string): string {
  const hash = hashContent(content)
  fileName = fileName.replace(hashPattern, hash)
  fileName = fileName.replace(extPattern, ext)
  fileName = fileName.replace(extnamePattern, `.${ext}`)
  fileName = fileName.replace(namePattern, name)

  return fileName
}
