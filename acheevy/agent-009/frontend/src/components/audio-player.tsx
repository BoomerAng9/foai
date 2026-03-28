import { useEffect, useState } from 'react'
import { Button } from './ui/button'

interface AudioPlayerProps {
	audioRef: React.RefObject<HTMLAudioElement>
	isPlaying: boolean
	onPlayingChange: (isPlaying: boolean) => void
}

export function AudioPlayer({ audioRef, isPlaying, onPlayingChange }: AudioPlayerProps) {
	const [duration, setDuration] = useState(0)
	const [currentTime, setCurrentTime] = useState(0)
	const [volume, setVolume] = useState(1)

	useEffect(() => {
		const audio = audioRef.current
		if (!audio) return

		const handleLoadedMetadata = () => {
			setDuration(audio.duration)
		}

		const handleTimeUpdate = () => {
			setCurrentTime(audio.currentTime)
		}

		const handlePlay = () => {
			onPlayingChange(true)
		}

		const handlePause = () => {
			onPlayingChange(false)
		}

		const handleEnded = () => {
			onPlayingChange(false)
		}

		audio.addEventListener('loadedmetadata', handleLoadedMetadata)
		audio.addEventListener('timeupdate', handleTimeUpdate)
		audio.addEventListener('play', handlePlay)
		audio.addEventListener('pause', handlePause)
		audio.addEventListener('ended', handleEnded)

		return () => {
			audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
			audio.removeEventListener('timeupdate', handleTimeUpdate)
			audio.removeEventListener('play', handlePlay)
			audio.removeEventListener('pause', handlePause)
			audio.removeEventListener('ended', handleEnded)
		}
	}, [audioRef, onPlayingChange])

	useEffect(() => {
		if (audioRef.current) {
			audioRef.current.volume = volume
		}
	}, [volume, audioRef])

	const formatTime = (seconds: number) => {
		if (!Number.isFinite(seconds)) return '0:00'
		const mins = Math.floor(seconds / 60)
		const secs = Math.floor(seconds % 60)
		return `${mins}:${secs.toString().padStart(2, '0')}`
	}

	const handlePlayPause = () => {
		if (audioRef.current) {
			if (isPlaying) {
				audioRef.current.pause()
			} else {
				void audioRef.current.play()
			}
		}
	}

	const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newTime = parseFloat(e.target.value)
		if (audioRef.current) {
			audioRef.current.currentTime = newTime
			setCurrentTime(newTime)
		}
	}

	return (
		<div className="w-full bg-neutral-900/60 border border-neutral-700 rounded-lg p-3 space-y-2">
			<div className="flex items-center gap-3">
				<Button
					onClick={handlePlayPause}
					className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 type-btn-sm"
					title={isPlaying ? 'Pause' : 'Play'}
				>
					{isPlaying ? '⏸ Pause' : '▶ Play'}
				</Button>

				<div className="flex-1 flex items-center gap-2">
					<span className="type-body-xs text-neutral-400 min-w-10">
						{formatTime(currentTime)}
					</span>
					<input
						type="range"
						min="0"
						max={duration || 0}
						value={currentTime}
						onChange={handleProgressChange}
						className="flex-1 h-1 bg-neutral-700 rounded-lg cursor-pointer accent-cyan-600"
					/>
					<span className="type-body-xs text-neutral-400 min-w-10">
						{formatTime(duration)}
					</span>
				</div>
			</div>

			<div className="flex items-center gap-2">
				<span className="type-body-xs text-neutral-400">Volume:</span>
				<input
					type="range"
					min="0"
					max="1"
					step="0.1"
					value={volume}
					onChange={(e) => setVolume(parseFloat(e.target.value))}
					className="w-20 h-1 bg-neutral-700 rounded-lg cursor-pointer accent-cyan-600"
				/>
				<span className="type-body-xs text-neutral-400">{Math.round(volume * 100)}%</span>
			</div>
		</div>
	)
}
