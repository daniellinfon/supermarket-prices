import { useState, useEffect, useCallback } from 'react'

// Generar o recuperar device_id único del localStorage
function getDeviceId() {
  let id = localStorage.getItem('pm_device_id')
  if (!id) {
    id = 'dev_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem('pm_device_id', id)
  }
  return id
}

const DEVICE_ID = getDeviceId()

function apiHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-device-id': DEVICE_ID,
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState([])

  const fetchFavorites = useCallback(async () => {
    try {
      const res = await fetch('/api/favorites', { headers: { 'x-device-id': DEVICE_ID } })
      const data = await res.json()
      setFavorites(data.favorites || [])
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => { fetchFavorites() }, [fetchFavorites])

  const addFavorite = useCallback(async (product) => {
    try {
      await fetch('/api/favorites', {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify(product),
      })
      await fetchFavorites()
    } catch (e) { console.error(e) }
  }, [fetchFavorites])

  const removeFavorite = useCallback(async (id) => {
    try {
      await fetch(`/api/favorites/${id}`, {
        method: 'DELETE',
        headers: { 'x-device-id': DEVICE_ID },
      })
      setFavorites(prev => prev.filter(f => f.id !== id))
    } catch (e) { console.error(e) }
  }, [])

  const isFavorite = useCallback((name, supermarket) => {
    return favorites.find(f => f.name === name && f.supermarket === supermarket)
  }, [favorites])

  return { favorites, addFavorite, removeFavorite, isFavorite, fetchFavorites }
}
