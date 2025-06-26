// src/lib/services/pemeliharaan.js
import api from '$lib/services/api.js';

export const pemeliharaanService = {
  // Get all pemeliharaan records
  async getAll(params = {}) {
    try {
      const response = await api.get('/items/pemeliharaan', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching pemeliharaan:', error);
      throw error;
    }
  },

  // Get single pemeliharaan record
  async getById(id) {
    try {
      const response = await api.get(`/items/pemeliharaan/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching pemeliharaan by id:', error);
      throw error;
    }
  },

  // Create new pemeliharaan record
  async create(data) {
    try {
      const response = await api.post('/items/pemeliharaan', data);
      return response.data;
    } catch (error) {
      console.error('Error creating pemeliharaan:', error);
      throw error;
    }
  },

  // Update pemeliharaan record
  async update(id, data) {
    try {
      const response = await api.patch(`/items/pemeliharaan/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating pemeliharaan:', error);
      throw error;
    }
  },

  // Delete pemeliharaan record
  async delete(id) {
    try {
      await api.delete(`/items/pemeliharaan/${id}`);
      return true;
    } catch (error) {
      console.error('Error deleting pemeliharaan:', error);
      throw error;
    }
  },

  // Upload file ke Directus
  async uploadFile(formData) {
    try {
      // Perlu header multipart/form-data, jangan pakai default api.js
      const response = await fetch('https://directus.eltamaprimaindo.com/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer JaXaSE93k24zq7T2-vZyu3lgNOUgP8fz`
        },
        body: formData
      });
      if (!response.ok) throw new Error('Gagal upload file');
      return await response.json();
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }
};