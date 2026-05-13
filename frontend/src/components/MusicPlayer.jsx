import React, { useRef, useEffect } from 'react'
import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react'
import './MusicPlayer.css'

function MusicPlayer({ music, isPlaying, setIsPlaying }) {
  const audioRef = useRef(null)

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play()
      } else {
        audioRef.current.pause()
      }
    }
  }, [isPlaying, music])

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  return (
    <div className="music-player">
      <div className="player-content">
        <div className="player-info">
          <h3>{music.title}</h3>
          <p>{music.artist}</p>
        </div>
        
        <div className="player-controls">
          <button className="control-btn">
            <SkipBack size={24} />
          </button>
          <button className="control-btn play-pause" onClick={togglePlay}>
            {isPlaying ? <Pause size={32} /> : <Play size={32} />}
          </button>
          <button className="control-btn">
            <SkipForward size={24} />
          </button>
        </div>

        <div className="volume-control">
          <Volume2 size={20} />
          <input type="range" min="0" max="100" defaultValue="70" />
        </div>
      </div>
      
      <audio 
        ref={audioRef} 
        src={music.audioUrl}
        onEnded={() => setIsPlaying(false)}
      />
    </div>
  )
}

export default MusicPlayer