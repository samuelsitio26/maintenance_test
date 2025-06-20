// src/lib/stores/projectTools.js
import { writable, derived } from 'svelte/store';
import { projectToolsService } from '$lib/services/projectTools.js';

// Main project tools store
function createProjectToolsStore() {
  const { subscribe, set, update } = writable({
    items: [],
    problematicTools: [],
    loading: false,
    error: null,
    filters: {
      condition: 'all',
      project: null,
      tool: null
    }
  });

  return {
    subscribe,
    
    // Load all project tools
    async loadProjectTools(params = {}) {
      update(state => ({ ...state, loading: true, error: null }));
      
      try {
        const response = await projectToolsService.getAll(params);
        
        update(state => ({
          ...state,
          items: response.data || [],
          loading: false
        }));
      } catch (error) {
        update(state => ({
          ...state,
          error: error.message,
          loading: false
        }));
      }
    },

    // Load problematic tools specifically
    async loadProblematicTools() {
      update(state => ({ ...state, loading: true, error: null }));
      
      try {
        const response = await projectToolsService.getProblematicTools();
        
        update(state => ({
          ...state,
          problematicTools: response.data || [],
          loading: false
        }));
      } catch (error) {
        update(state => ({
          ...state,
          error: error.message,
          loading: false
        }));
      }
    },

    // Load tools by project
    async loadByProject(projectId) {
      update(state => ({ ...state, loading: true, error: null }));
      
      try {
        const response = await projectToolsService.getByProject(projectId);
        
        update(state => ({
          ...state,
          items: response.data || [],
          loading: false
        }));
      } catch (error) {
        update(state => ({
          ...state,
          error: error.message,
          loading: false
        }));
      }
    },

    // Load tools by tool ID
    async loadByTool(toolId) {
      update(state => ({ ...state, loading: true, error: null }));
      
      try {
        const response = await projectToolsService.getByTool(toolId);
        
        update(state => ({
          ...state,
          items: response.data || [],
          loading: false
        }));
      } catch (error) {
        update(state => ({
          ...state,
          error: error.message,
          loading: false
        }));
      }
    },

    // Update condition
    async updateCondition(id, data) {
      try {
        const response = await projectToolsService.updateCondition(id, data);
        
        update(state => ({
          ...state,
          items: state.items.map(item => 
            item.id === id ? response.data : item
          ),
          problematicTools: state.problematicTools.map(item => 
            item.id === id ? response.data : item
          )
        }));
        
        return response.data;
      } catch (error) {
        update(state => ({ ...state, error: error.message }));
        throw error;
      }
    },

    // Create new project tool
    async createProjectTool(data) {
      try {
        const response = await projectToolsService.create(data);
        
        update(state => ({
          ...state,
          items: [response.data, ...state.items]
        }));
        
        return response.data;
      } catch (error) {
        update(state => ({ ...state, error: error.message }));
        throw error;
      }
    },

    // Update project tool
    async updateProjectTool(id, data) {
      try {
        const response = await projectToolsService.update(id, data);
        
        update(state => ({
          ...state,
          items: state.items.map(item => 
            item.id === id ? response.data : item
          )
        }));
        
        return response.data;
      } catch (error) {
        update(state => ({ ...state, error: error.message }));
        throw error;
      }
    },

    // Delete project tool
    async deleteProjectTool(id) {
      try {
        await projectToolsService.delete(id);
        
        update(state => ({
          ...state,
          items: state.items.filter(item => item.id !== id),
          problematicTools: state.problematicTools.filter(item => item.id !== id)
        }));
      } catch (error) {
        update(state => ({ ...state, error: error.message }));
        throw error;
      }
    },

    // Set filter
    setFilter(filterName, value) {
      update(state => ({
        ...state,
        filters: {
          ...state.filters,
          [filterName]: value
        }
      }));
    },

    // Clear filters
    clearFilters() {
      update(state => ({
        ...state,
        filters: {
          condition: 'all',
          project: null,
          tool: null
        }
      }));
    },

    // Clear error
    clearError() {
      update(state => ({ ...state, error: null }));
    }
  };
}

export const projectToolsStore = createProjectToolsStore();

// Derived store for problematic tools
export const problematicTools = derived(
  projectToolsStore,
  $store => $store.problematicTools
);

// Derived store for condition summary
export const conditionSummary = derived(
  projectToolsStore,
  $store => {
    const items = $store.items;
    
    return {
      total: items.length,
      normal: items.filter(item => item.condition === 'normal' || !item.condition).length,
      bermasalah: items.filter(item => item.condition === 'bermasalah').length,
      rusak: items.filter(item => item.condition === 'rusak').length
    };
  }
);

// Derived store for filtered tools
export const filteredProjectTools = derived(
  projectToolsStore,
  $store => {
    let filtered = $store.items;
    
    if ($store.filters.condition && $store.filters.condition !== 'all') {
      filtered = filtered.filter(item => item.condition === $store.filters.condition);
    }
    
    if ($store.filters.project) {
      filtered = filtered.filter(item => item.project_id === $store.filters.project);
    }
    
    if ($store.filters.tool) {
      filtered = filtered.filter(item => item.tool_id === $store.filters.tool);
    }
    
    return filtered;
  }
);