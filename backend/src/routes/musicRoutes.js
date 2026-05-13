const express = require('express')
const router = express.Router()
const {
  getMusics,
  getMusicById,
  createMusic,
  updateMusic,
  deleteMusic,
  searchMusics
} = require('../controllers/musicController')

// Rotas públicas
router.get('/', getMusics)
router.get('/search', searchMusics)
router.get('/:id', getMusicById)

// Rotas administrativas (proteger com autenticação em produção)
router.post('/', createMusic)
router.put('/:id', updateMusic)
router.delete('/:id', deleteMusic)

module.exports = router