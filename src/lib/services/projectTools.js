// src/lib/services/projectTools.js
import api from '$lib/services/api.js';

export const projectToolsService = {
  // Get all project tools with condition
  async getAll(params = {}) {
    try {
      const response = await api.get('/items/project_tools', { 
        params: {
          fields: '*,project_id.*,tool_id.*',
          ...params
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching project tools:', error);
      throw error;
    }
  },

  // Get project tools by project ID
  async getByProject(projectId, params = {}) {
    try {
      const response = await api.get('/items/project_tools', {
        params: {
          filter: {
            project_id: { _eq: projectId }
          },
          fields: '*,project_id.*,tool_id.*',
          ...params
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching project tools by project:', error);
      throw error;
    }
  },

  // Get project tools by tool ID
  async getByTool(toolId, params = {}) {
    try {
      const response = await api.get('/items/project_tools', {
        params: {
          filter: {
            tool_id: { _eq: toolId }
          },
          fields: '*,project_id.*,tool_id.*',
          ...params
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching project tools by tool:', error);
      throw error;
    }
  },

  // Get problematic tools (bermasalah or rusak)
  async getProblematicTools(params = {}) {
    try {
      const response = await api.get('/items/project_tools', {
        params: {
          filter: {
            condition: {
              _in: ['bermasalah', 'rusak']
            }
          },
          fields: '*,project_id.*,tool_id.*',
          sort: '-date_updated',
          ...params
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching problematic tools:', error);
      throw error;
    }
  },

  // Get tools by condition
  async getByCondition(condition, params = {}) {
    try {
      const response = await api.get('/items/project_tools', {
        params: {
          filter: {
            condition: { _eq: condition }
          },
          fields: '*,project_id.*,tool_id.*',
          ...params
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching tools by condition:', error);
      throw error;
    }
  },

  // Update project tool condition - key method used in tools page
  async updateCondition(id, data) {
    try {
      const response = await api.patch(`/items/project_tools/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating project tool condition:', error);
      throw error;
    }
  },

  // Get condition summary - used in dashboard
  async getConditionSummary() {
    try {
      // Get all project tools and calculate summary manually
      const response = await api.get('/items/project_tools', {
        params: {
          fields: 'condition',
          limit: -1 // Get all records
        }
      });
      
      // Transform to more usable format
      const summary = {
        normal: 0,
        bermasalah: 0,
        rusak: 0,
        total: 0
      };

      if (response.data?.data) {
        response.data.data.forEach(item => {
          const condition = item.condition || 'normal';
          if (summary.hasOwnProperty(condition)) {
            summary[condition] += 1;
          } else {
            summary.normal += 1; // Default to normal if condition is unknown
          }
          summary.total += 1;
        });
      }

      return { data: summary };
    } catch (error) {
      console.error('Error fetching condition summary:', error);
      // Return empty summary on error instead of throwing
      return { 
        data: {
          normal: 0,
          bermasalah: 0,
          rusak: 0,
          total: 0
        }
      };
    }
  },

  // Create new project tool entry
  async create(data) {
    try {
      const response = await api.post('/items/project_tools', data);
      return response.data;
    } catch (error) {
      console.error('Error creating project tool:', error);
      throw error;
    }
  },

  // Update project tool
  async update(id, data) {
    try {
      const response = await api.patch(`/items/project_tools/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating project tool:', error);
      throw error;
    }
  },

  // Delete project tool
  async delete(id) {
    try {
      await api.delete(`/items/project_tools/${id}`);
      return true;
    } catch (error) {
      console.error('Error deleting project tool:', error);
      throw error;
    }
  }
};