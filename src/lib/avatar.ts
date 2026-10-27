const loadImage = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('That image could not be read.'))
    }
    image.src = url
  })

/**
 * Centre-crops an uploaded image to a square and returns a compact JPEG data URL
 * so avatars stay small enough to store on the account document.
 */
export const fileToAvatarDataUrl = async (file: File, size = 256, quality = 0.82): Promise<string> => {
  const image = await loadImage(file)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Could not process that image.')
  }

  const scale = Math.max(size / image.width, size / image.height)
  const width = image.width * scale
  const height = image.height * scale

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height)

  return canvas.toDataURL('image/jpeg', quality)
}
