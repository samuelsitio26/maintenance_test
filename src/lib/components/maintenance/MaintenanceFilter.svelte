<!-- src/lib/components/maintenance/MaintenanceFilter.svelte -->
<script>
    import { onMount } from 'svelte';
    import { maintenanceStore } from '$lib/stores/maintenance.js';
    import { projectsService } from '$lib/services/projects.js';
    
    let projects = [];
    let filters = {
      status: 'all',
      project: null,
      dateFrom: null,
      dateTo: null
    };
    
    onMount(async () => {
      try {
        const response = await projectsService.getActive();
        projects = response.data || [];
      } catch (error) {
        console.error('Error loading projects:', error);
      }
    });
    
    // Apply filters
    async function applyFilters() {
      Object.entries(filters).forEach(([key, value]) => {
        maintenanceStore.setFilter(key, value);
      });
      await maintenanceStore.loadMaintenance();
    }
    
    // Clear filters
    async function clearFilters() {
      filters = {
        status: 'all',
        project: null,
        dateFrom: null,
        dateTo: null
      };
      maintenanceStore.clearFilters();
      await maintenanceStore.loadMaintenance();
    }
  </script>
  
  <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <!-- Status Filter -->
      <div>
        <label for="status" class="block text-sm font-medium text-gray-700">
          Status
        </label>
        <select
          id="status"
          bind:value={filters.status}
          class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
        >
          <option value="all">Semua Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">On Process</option>
          <option value="under_maintenance">Under Maintenance</option>
          <option value="to_do">To Do</option>
          <option value="completed">Completed</option>
        </select>
      </div>
  
      <!-- Project Filter -->
      <div>
        <label for="project" class="block text-sm font-medium text-gray-700">
          Project
        </label>
        <select
          id="project"
          bind:value={filters.project}
          class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
        >
          <option value={null}>Semua Project</option>
          {#each projects as project}
            <option value={project.id}>{project.name}</option>
          {/each}
        </select>
      </div>
  
      <!-- Date From -->
      <div>
        <label for="dateFrom" class="block text-sm font-medium text-gray-700">
          Dari Tanggal
        </label>
        <input
          type="date"
          id="dateFrom"
          bind:value={filters.dateFrom}
          class="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
        />
      </div>
  
      <!-- Date To -->
      <div>
        <label for="dateTo" class="block text-sm font-medium text-gray-700">
          Sampai Tanggal
        </label>
        <input
          type="date"
          id="dateTo"
          bind:value={filters.dateTo}
          class="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
        />
      </div>
  
      <!-- Action Buttons -->
      <div class="flex items-end space-x-2">
        <button
          on:click={applyFilters}
          class="flex-1 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          Filter
        </button>
        <button
          on:click={clearFilters}
          class="flex-1 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Reset
        </button>
      </div>
    </div>
  </div>