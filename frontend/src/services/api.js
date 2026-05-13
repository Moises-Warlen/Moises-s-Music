import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
})

export const api = {
  getMusics: async () => {
    const response = await apiClient.get('/musics')
    return response.data
  },
  
  getMusicById: async (id) => {
    const response = await apiClient.get(`/musics/${id}`)
    return response.data
  },
  
  createMusic: async (musicData) => {
    const response = await apiClient.post('/musics', musicData)
    return response.data
  },
  
  updateMusic: async (id, musicData) => {
    const response = await apiClient.put(`/musics/${id}`, musicData)
    return response.data
  },
  
  deleteMusic: async (id) => {
    const response = await apiClient.delete(`/musics/${id}`)
    return response.data
  }
}