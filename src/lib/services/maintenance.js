
// src/lib/services/maintenance.js
import api from '$lib/services/api.js';

export const maintenanceService = {
  // Get all maintenance records
  async getAll(params = {}) {
    try {
      const response = await api.get('/items/maintenance', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching maintenance:', error);
      throw error;
    }
  },

  // Get single maintenance record - FIXED: Better field selection
  async getById(id) {
    try {
      const response = await api.get(`/items/maintenance/${id}`, {
        params: {
          fields: '*,tool_id.*,project_id.*,assigned_to.*'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching maintenance by id:', error);
      throw error;
    }
  },

  // Create new maintenance record
  async create(data) {
    try {
      const response = await api.post('/items/maintenance', data);
      return response.data;
    } catch (error) {
      console.error('Error creating maintenance:', error);
      throw error;
    }
  },

  // Update maintenance record - ENHANCED
  async update(id, data) {
    try {
      const response = await api.patch(`/items/maintenance/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating maintenance:', error);
      throw error;
    }
  },

  // Delete maintenance record
  async delete(id) {
    try {
      await api.delete(`/items/maintenance/${id}`);
      return true;
    } catch (error) {
      console.error('Error deleting maintenance:', error);
      throw error;
    }
  },

  // Get maintenance report
  async getReport(date) {
    try {
      const response = await api.get('/items/maintenance', {
        params: {
          filter: {
            report_date: {
              _eq: date
            }
          },
          fields: '*,tool_id.*,project_id.*,assigned_to.*'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching maintenance report:', error);
      throw error;
    }
  }
};