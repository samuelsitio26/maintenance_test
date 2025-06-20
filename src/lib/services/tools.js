// src/lib/services/tools.js
import api from '$lib/services/api.js';

export const toolsService = {
  async getAll(params = {}) {
    try {
      const response = await api.get('/items/tools', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching tools:', error);
      throw error;
    }
  },

  async getById(id) {
    try {
      const response = await api.get(`/items/tools/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching tool by id:', error);
      throw error;
    }
  },

  // Get tools with maintenance status
  async getWithMaintenanceStatus() {
    try {
      const response = await api.get('/items/tools', {
        params: {
          fields: '*,maintenance.*',
          filter: {
            is_active: {
              _eq: true
            }
          }
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching tools with status:', error);
      throw error;
    }
  },

  // Get tools with their conditions from project_tools
  async getWithConditions(params = {}) {
    try {
      const response = await api.get('/items/tools', {
        params: {
          fields: '*,project_tools.*,project_tools.project_id.*',
          ...params
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching tools with conditions:', error);
      throw error;
    }
  },

  // Get active tools only
  async getActive(params = {}) {
    try {
      const response = await api.get('/items/tools', {
        params: {
          filter: {
            is_active: { _eq: true }
          },
          ...params
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching active tools:', error);
      throw error;
    }
  },

  // Create new tool
  async create(data) {
    try {
      const response = await api.post('/items/tools', data);
      return response.data;
    } catch (error) {
      console.error('Error creating tool:', error);
      throw error;
    }
  },

  // Update tool
  async update(id, data) {
    try {
      const response = await api.patch(`/items/tools/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating tool:', error);
      throw error;
    }
  },

  // Delete tool
  async delete(id) {
    try {
      await api.delete(`/items/tools/${id}`);
      return true;
    } catch (error) {
      console.error('Error deleting tool:', error);
      throw error;
    }
  }
};