// src/routes/maintenance/+page.server.js
import { maintenanceService } from '$lib/services/maintenance.js';
import { toolsService } from '$lib/services/tools.js';
import { projectsService } from '$lib/services/projects.js';

export async function load({ url }) {
  try {
    // Get query parameters for filtering
    const status = url.searchParams.get('status');
    const projectId = url.searchParams.get('project');
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');
    
    // Build filter object
    const filters = {};
    if (status && status !== 'all') {
      filters.status = { _eq: status };
    }
    if (projectId) {
      filters.project_id = { _eq: projectId };
    }
    if (dateFrom) {
      filters.damage_date = { ...filters.damage_date, _gte: dateFrom };
    }
    if (dateTo) {
      filters.damage_date = { ...filters.damage_date, _lte: dateTo };
    }
    
    // Fetch maintenance data with relations
    const maintenanceResponse = await maintenanceService.getAll({
      filter: filters,
      fields: '*,tool_id.*,project_id.*',
      sort: '-damage_date'
    });
    
    // Fetch tools and projects for filters
    const [toolsResponse, projectsResponse] = await Promise.all([
      toolsService.getAll({ filter: { is_active: { _eq: true } } }),
      projectsService.getActive()
    ]);
    
    return {
      maintenance: maintenanceResponse.data || [],
      tools: toolsResponse.data || [],
      projects: projectsResponse.data || [],
      filters: {
        status: status || 'all',
        project: projectId || null,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null
      }
    };
  } catch (error) {
    console.error('Error loading maintenance data:', error);
    return {
      maintenance: [],
      tools: [],
      projects: [],
      filters: {
        status: 'all',
        project: null,
        dateFrom: null,
        dateTo: null
      },
      error: error.message
    };
  }
}

// Handle form actions
export const actions = {
  delete: async ({ request }) => {
    const formData = await request.formData();
    const id = formData.get('id');
    
    try {
      await maintenanceService.delete(id);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};