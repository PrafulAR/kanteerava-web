import { useRef, useState } from 'react'
import type { PointerEvent } from 'react'

export type SignaturePayload = { data: string; name: string }

interface SignatureInputProps {
  id: string
  value: SignaturePayload | null
  onChange: (signature: SignaturePayload | null) => void
}

export function SignatureInput({ id, value, onChange }: SignatureInputProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const drawing = useRef(false)
  const [mode, setMode] = useState<'draw' | 'upload'>('draw')
  const [error, setError] = useState('')

  const point = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget
    const bounds = canvas.getBoundingClientRect()
    return { x: (event.clientX - bounds.left) * canvas.width / bounds.width, y: (event.clientY - bounds.top) * canvas.height / bounds.height }
  }

  const start = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget
    canvas.setPointerCapture(event.pointerId)
    const context = canvas.getContext('2d')
    if (!context) return
    const position = point(event)
    context.strokeStyle = '#172635'
    context.fillStyle = '#172635'
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.lineWidth = 3.5
    context.beginPath()
    context.arc(position.x, position.y, 1.8, 0, Math.PI * 2)
    context.fill()
    context.beginPath()
    context.moveTo(position.x, position.y)
    drawing.current = true
    setError('')
  }

  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    const context = event.currentTarget.getContext('2d')
    if (!context) return
    const position = point(event)
    context.lineTo(position.x, position.y)
    context.stroke()
  }

  const finish = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    drawing.current = false
    event.currentTarget.releasePointerCapture(event.pointerId)
    onChange({ data: event.currentTarget.toDataURL('image/png'), name: 'signature.png' })
  }

  const clear = () => {
    const canvas = canvasRef.current
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    if (fileRef.current) fileRef.current.value = ''
    onChange(null)
    setError('')
  }

  const switchMode = (next: 'draw' | 'upload') => {
    if (next === mode) return
    clear()
    setMode(next)
  }

  const upload = (file?: File) => {
    if (!file) return
    const extension = file.name.toLowerCase().split('.').pop()
    if (!['image/png', 'image/jpeg'].includes(file.type) || !['png', 'jpg', 'jpeg'].includes(extension ?? '') || file.size > 1_000_000) {
      setError('Choose a PNG or JPG signature under 1 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const data = String(reader.result ?? '')
      const image = new Image()
      image.onload = () => {
        if (image.width < 80 || image.height < 30 || image.width > 2400 || image.height > 1200) {
          setError('Signature image dimensions must be 80–2400 × 30–1200 pixels.')
          return
        }
        if (image.width / image.height < 1.5) {
          setError('Use a wide, closely cropped signature image rather than a portrait photo.')
          return
        }
        setError('')
        onChange({ data, name: file.name })
      }
      image.onerror = () => setError('This signature image could not be read.')
      image.src = data
    }
    reader.readAsDataURL(file)
  }

  return <div className="signature-input">
    <div className="signature-options" role="group" aria-label="Signature method">
      <button type="button" className={mode === 'draw' ? 'is-active' : ''} onClick={() => switchMode('draw')}>Draw Signature</button>
      <button type="button" className={mode === 'upload' ? 'is-active' : ''} onClick={() => switchMode('upload')}>Upload Signature</button>
    </div>
    {mode === 'draw' ? <canvas ref={canvasRef} width={900} height={270} onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} aria-label="Draw your signature using a mouse or finger" /> : <>
      <input ref={fileRef} id={id} type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" onChange={(event) => upload(event.target.files?.[0])} />
      {value && <img className="signature-preview" src={value.data} alt="Signature preview" />}
    </>}
    <button className="signature-clear" type="button" onClick={clear}>Clear</button>
    {error && <p className="signature-error" role="alert">{error}</p>}
  </div>
}
