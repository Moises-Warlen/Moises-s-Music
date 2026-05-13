import React from 'react'
import { Music, Headphones } from 'lucide-react'
import './Header.css'

function Header() {
  return (
    <header className="header">
      <div className="container header-content">
        <div className="logo">
          <Music size={32} color="#fff" />
          <h1>Moises S Music</h1>
        </div>
        <div className="tagline">
          <Headphones size={20} />
          <span>Sua música em qualquer lugar</span>
        </div>
      </div>
    </header>
  )
}

export default Header