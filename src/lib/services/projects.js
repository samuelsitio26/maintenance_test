
// src/lib/services/projects.js  
import api from '$lib/services/api.js';

export const projectsService = {
  async getAll(params = {}) {
    try {
      const response = await api.get('/items/projects', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw error;
    }
  },

  async getById(id) {
    try {
      const response = await api.get(`/items/projects/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching project by id:', error);
      throw error;
    }
  },

  // Get active projects
  async getActive() {
    try {
      const response = await api.get('/items/projects', {
        params: {
          filter: {
            status: {
              _neq: 'closed'
            }
          }
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching active projects:', error);
      throw error;
    }
  }
};