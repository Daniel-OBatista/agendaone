'use client'

import Cropper from 'react-easy-crop'
import { useState } from 'react'
import getCroppedImg from '../utils/cropImage'

export default function ImageCropper({
  imageSrc,
  onCropComplete,
  onCancel
}: {
  imageSrc: string
  onCropComplete: (croppedFile: File, previewUrl: string) => void
  onCancel: () => void
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)

  const handleCrop = async () => {
    const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels)
    const previewUrl = URL.createObjectURL(croppedFile)
    onCropComplete(croppedFile, previewUrl)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
      <div className="bg-white rounded shadow-md w-[90vw] max-w-xl p-4">
        <h2 className="text-lg font-semibold mb-2 text-pink-600">Recorte a imagem</h2>
        <div className="relative w-full h-[300px] bg-zinc-200 rounded overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={320 / 130}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, area) => setCroppedAreaPixels(area)}
          />
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onCancel}
            className="bg-zinc-300 text-zinc-700 px-3 py-1 rounded hover:bg-zinc-400 text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleCrop}
            className="bg-pink-600 text-white px-3 py-1 rounded hover:bg-pink-700 text-sm"
          >
            Recortar imagem
          </button>
        </div>
        <p className="text-xs text-zinc-500 mt-2">Arraste para mover ou use a roda do mouse para aplicar zoom.</p>
      </div>
    </div>
  )
}
