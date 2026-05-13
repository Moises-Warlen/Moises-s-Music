const Music = require('../models/Music')

// @desc    Obter todas as músicas
// @route   GET /api/musics
// @access  Public
const getMusics = async (req, res) => {
  try {
    const musics = await Music.find({ isActive: true }).sort('-createdAt')
    res.status(200).json(musics)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// @desc    Obter uma música específica
// @route   GET /api/musics/:id
// @access  Public
const getMusicById = async (req, res) => {
  try {
    const music = await Music.findById(req.params.id)
    
    if (!music) {
      return res.status(404).json({ error: 'Música não encontrada' })
    }
    
    // Incrementar contagem de plays
    music.plays += 1
    await music.save()
    
    res.status(200).json(music)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// @desc    Criar nova música
// @route   POST /api/musics
// @access  Private (Admin)
const createMusic = async (req, res) => {
  try {
    const music = await Music.create(req.body)
    res.status(201).json(music)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

// @desc    Atualizar música
// @route   PUT /api/musics/:id
// @access  Private (Admin)
const updateMusic = async (req, res) => {
  try {
    const music = await Music.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    
    if (!music) {
      return res.status(404).json({ error: 'Música não encontrada' })
    }
    
    res.status(200).json(music)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

// @desc    Deletar música (soft delete)
// @route   DELETE /api/musics/:id
// @access  Private (Admin)
const deleteMusic = async (req, res) => {
  try {
    const music = await Music.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    )
    
    if (!music) {
      return res.status(404).json({ error: 'Música não encontrada' })
    }
    
    res.status(200).json({ message: 'Música removida com sucesso' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// @desc    Buscar músicas
// @route   GET /api/musics/search?q=termo
// @access  Public
const searchMusics = async (req, res) => {
  try {
    const { q } = req.query
    const musics = await Music.find({
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { artist: { $regex: q, $options: 'i' } }
      ],
      isActive: true
    })
    
    res.status(200).json(musics)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

module.exports = {
  getMusics,
  getMusicById,
  createMusic,
  updateMusic,
  deleteMusic,
  searchMusics
}