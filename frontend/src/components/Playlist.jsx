import React from 'react'
import { Play, Music as MusicIcon } from 'lucide-react'
import './Playlist.css'

function Playlist({ musics, onPlayMusic }) {
  return (
    <div className="playlist">
      <h2 className="playlist-title">🎵 Playlist</h2>
      <div className="musics-grid">
        {musics.map((music) => (
          <div key={music._id || music.id} className="music-card">
            <div className="music-icon">
              <MusicIcon size={40} />
            </div>
            <div className="music-info">
              <h3>{music.title}</h3>
              <p>{music.artist}</p>
              {music.duration && <span className="duration">{music.duration}</span>}
            </div>
            <button 
              className="play-button"
              onClick={() => onPlayMusic(music)}
            >
              <Play size={24} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Playlist