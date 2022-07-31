import hash_sum from 'hash-sum'

// Respect https://www.rollupjs.org/guide/en/#outputassetfilenames filename transformation
export const getFileName = (
	fileName: string,
	name: string,
	content: string,
	ext: string
) => {
	const hash = hash_sum(content)
	fileName = fileName.replace(/\[hash\]/g, hash)
	fileName = fileName.replace(/\[ext\]/g, ext)
	fileName = fileName.replace(/\[extname\]/g, '.' + ext)
	fileName = fileName.replace(/\[name\]/g, name)

	return fileName
}
