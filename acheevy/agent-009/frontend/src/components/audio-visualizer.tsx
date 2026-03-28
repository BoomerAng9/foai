import { useEffect, useRef } from 'react'

interface AudioVisualizerProps {
	isActive: boolean
	mediaStream?: MediaStream
}

export function AudioVisualizer({ isActive, mediaStream }: AudioVisualizerProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const analyserRef = useRef<AnalyserNode | null>(null)
	const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null)
	const animationIdRef = useRef<number | null>(null)

	useEffect(() => {
		if (!isActive || !mediaStream || !canvasRef.current) {
			return
		}

		try {
			const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
			const analyser = audioContext.createAnalyser()
			analyser.fftSize = 256

			const source = audioContext.createMediaStreamSource(mediaStream)
			source.connect(analyser)

			analyserRef.current = analyser
			const bufferLength = analyser.frequencyBinCount
			dataArrayRef.current = new Uint8Array(new ArrayBuffer(bufferLength))

			const canvas = canvasRef.current
			const ctx = canvas.getContext('2d')
			if (!ctx) return

			const draw = () => {
				animationIdRef.current = requestAnimationFrame(draw)

				if (!analyserRef.current || !dataArrayRef.current) return

				analyserRef.current.getByteFrequencyData(dataArrayRef.current)

				ctx.fillStyle = 'rgb(0, 0, 0)'
				ctx.fillRect(0, 0, canvas.width, canvas.height)

				const barWidth = (canvas.width / dataArrayRef.current.length) * 2.5
				let barHeight
				let x = 0

				for (let i = 0; i < dataArrayRef.current.length; i++) {
					barHeight = (dataArrayRef.current[i] / 255) * canvas.height

					// Gradient color: cyan to blue
					const hue = 180 + (i / dataArrayRef.current.length) * 60
					ctx.fillStyle = `hsl(${hue}, 100%, 50%)`
					ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight)

					x += barWidth
				}
			}

			draw()

			return () => {
				if (animationIdRef.current) {
					cancelAnimationFrame(animationIdRef.current)
				}
				source.disconnect()
				analyser.disconnect()
				audioContext.close()
			}
		} catch (error) {
			console.error('Error setting up audio visualizer:', error)
		}
	}, [isActive, mediaStream])

	if (!isActive) return null

	return (
		<canvas
			ref={canvasRef}
			width={200}
			height={40}
			className="rounded border border-cyan-600/40 bg-black/50"
		/>
	)
}
