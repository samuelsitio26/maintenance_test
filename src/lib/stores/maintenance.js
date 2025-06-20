import { writable, derived } from 'svelte/store';
import { maintenanceService } from '$lib/services/maintenance.js';

// Main maintenance store
function createMaintenanceStore() {
  const { subscribe, set, update } = writable({
    items: [],
    currentItem: null,
    loading: false,
    error: null,
    filters: {
      status: 'all',
      project: null,
      dateFrom: null,
      dateTo: null
    }
  });

  return {
    subscribe,
    
    async loadMaintenance() {
      update(state => ({ ...state, loading: true, error: null }));
      
      try {
        const filters = {};
        const currentState = get(maintenanceStore);
        
        if (currentState.filters.status !== 'all') {
          filters.status = { _eq: currentState.filters.status };
        }
        
        if (currentState.filters.project) {
          filters.project_id = { _eq: currentState.filters.project };
        }
        
        if (currentState.filters.dateFrom) {
          filters.damage_date = { _gte: currentState.filters.dateFrom };
        }
        
        if (currentState.filters.dateTo) {
          filters.damage_date = { _lte: currentState.filters.dateTo };
        }

        const response = await maintenanceService.getAll({
          filter: filters,
          fields: '*,tool_id.*,project_id.*',
          sort: '-damage_date'
        });
        
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

    // FIXED: Load single maintenance by ID with better error handling
    async loadMaintenanceById(id) {
      update(state => ({ ...state, loading: true, error: null }));
      
      try {
        const response = await maintenanceService.getById(id);
        console.log('Store received maintenance data:', response);
        
        // FIXED: Handle both direct data and wrapped response
        const maintenanceData = response.data || response;
        
        update(state => ({
          ...state,
          currentItem: maintenanceData,
          loading: false
        }));
        
        return maintenanceData;
      } catch (error) {
        console.error('Store error loading maintenance:', error);
        update(state => ({
          ...state,
          error: error.message,
          loading: false,
          currentItem: null
        }));
        throw error;
      }
    },

    async createMaintenance(data) {
      try {
        const response = await maintenanceService.create(data);
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

    async updateMaintenance(id, data) {
      try {
        const response = await maintenanceService.update(id, data);
        update(state => ({
          ...state,
          items: state.items.map(item => 
            item.id === id ? response.data : item
          ),
          currentItem: state.currentItem?.id === id ? response.data : state.currentItem
        }));
        return response.data;
      } catch (error) {
        update(state => ({ ...state, error: error.message }));
        throw error;
      }
    },

    async deleteMaintenance(id) {
      try {
        await maintenanceService.delete(id);
        update(state => ({
          ...state,
          items: state.items.filter(item => item.id !== id)
        }));
      } catch (error) {
        update(state => ({ ...state, error: error.message }));
        throw error;
      }
    },

    setFilter(filterName, value) {
      update(state => ({
        ...state,
        filters: {
          ...state.filters,
          [filterName]: value
        }
      }));
    },

    clearFilters() {
      update(state => ({
        ...state,
        filters: {
          status: 'all',
          project: null,
          dateFrom: null,
          dateTo: null
        }
      }));
    },

    // Clear current item
    clearCurrentItem() {
      update(state => ({ ...state, currentItem: null }));
    }
  };
}

export const maintenanceStore = createMaintenanceStore();

// Derived stores for statistics
export const maintenanceStats = derived(
  maintenanceStore,
  $maintenance => {
    const items = $maintenance.items;
    
    return {
      total: items.length,
      pending: items.filter(m => m.status === 'pending').length,
      inProgress: items.filter(m => m.status === 'in_progress').length,
      completed: items.filter(m => m.status === 'completed').length,
      underMaintenance: items.filter(m => m.status === 'under_maintenance').length
    };
  }
);

// Helper to get maintenance store value
function get(store) {
  let value;
  store.subscribe(v => value = v)();
  return value;
}