const mongoose = require('mongoose')

const musicSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Título é obrigatório'],
    trim: true,
    maxlength: [100, 'Título não pode ter mais de 100 caracteres']
  },
  artist: {
    type: String,
    required: [true, 'Artista é obrigatório'],
    trim: true,
    maxlength: [100, 'Artista não pode ter mais de 100 caracteres']
  },
  album: {
    type: String,
    trim: true,
    default: 'Single'
  },
  genre: {
    type: String,
    enum: ['Rock', 'Pop', 'Eletrônica', 'MPB', 'Sertanejo', 'Funk', 'Jazz', 'Clássica', 'Outro'],
    default: 'Outro'
  },
  duration: {
    type: String,
    match: [/^([0-9]{1,2}:)?[0-5][0-9]:[0-5][0-9]$/, 'Formato inválido (use MM:SS ou HH:MM:SS)'],
    default: '03:30'
  },
  audioUrl: {
    type: String,
    required: [true, 'URL do áudio é obrigatório'],
    trim: true
  },
  coverImage: {
    type: String,
    default: 'https://via.placeholder.com/300x300?text=Music+Cover'
  },
  plays: {
    type: Number,
    default: 0
  },
  releaseDate: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
})

// Índices para busca
musicSchema.index({ title: 'text', artist: 'text' })

module.exports = mongoose.model('Music', musicSchema)