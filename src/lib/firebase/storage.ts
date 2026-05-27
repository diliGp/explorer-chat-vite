import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage'
import { storage } from './client'

export async function uploadImage(
  dmId: string,
  msgId: string,
  file: File
): Promise<{ path: string; downloadUrl: string; thumbnail: string }> {
  const path = `images/${dmId}/${msgId}`
  const storageRef = ref(storage, path)

  await uploadBytes(storageRef, file, {
    contentType: file.type,
    customMetadata: { dmId, msgId },
  })

  const downloadUrl = await getDownloadURL(storageRef)

  // Generate a low-res thumbnail via canvas (client-side)
  const thumbnail = await generateThumbnail(file)

  return { path, downloadUrl, thumbnail }
}

export async function deleteImage(path: string): Promise<void> {
  try {
    const storageRef = ref(storage, path)
    await deleteObject(storageRef)
  } catch {
    // Object may already be deleted — swallow error
  }
}

export async function getImageUrl(path: string): Promise<string> {
  const storageRef = ref(storage, path)
  return getDownloadURL(storageRef)
}

async function generateThumbnail(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX = 200
        const ratio = Math.min(MAX / img.width, MAX / img.height)
        canvas.width = img.width * ratio
        canvas.height = img.height * ratio
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.5))
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}
