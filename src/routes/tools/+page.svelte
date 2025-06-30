<!-- src/routes/tools/+page.svelte -->
<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { toolsService } from '$lib/services/tools.js';
  import { projectToolsService } from '$lib/services/projectTools.js';
  import api from '$lib/services/api.js'; // Tambahkan import api
  import ConditionBadge from '$lib/components/common/ConditionBadge.svelte';
  import StatusBadge from '$lib/components/common/StatusBadge.svelte';
  import { fade, slide } from 'svelte/transition';
  
  // Data state
  let tools = [];
  let projectTools = [];
  let maintenances = []; // State untuk data maintenance
  let filteredData = [];
  let combinedData = [];
  let projects = [];
  let categories = [];
  
  // UI state
  let loading = true;
  let error = null;
  let updating = {};
  
  // Filter state
  let searchQuery = '';
  let categoryFilter = 'all';
  let conditionFilter = 'all';
  let projectFilter = 'all';
  let projectStatusFilter = 'all' // New filter for project status

  // Define project status options for the filter dropdown
  const projectStatusOptions = [
    { value: 'on_progress', label: 'On Progress' },
    { value: 'done', label: 'Done' },
    { value: 'prepare', label: 'Prepare' },
    { value: 'hold', label: 'Hold' },
    { value: 'closed', label: 'Closed' },
    { value: 'unknown', label: 'Unknown' } // Default option for unknown status
  ];

  // Struktur: [{ tool, projects: [{project, dataProjectTool}] }]
  let toolsWithProjects = [];
  let selectedProjects = {};

  // Reactive filter application
  $: {
    filteredData = combinedData.filter(item => {
      // Search filter - search across multiple fields, case-insensitive, trim
      const searchTerm = searchQuery.trim().toLowerCase();
      const toolName = (item.tool?.name || '').toLowerCase().trim();
      const toolDesc = (item.tool?.description || '').toLowerCase().trim();
      const toolCat = (item.tool?.category || '').toLowerCase().trim();
      const projectName = (item.project?.name || '').toLowerCase().trim();
      const notes = (item.notes || '').toLowerCase().trim();
      const matchesSearch = !searchTerm ||
        toolName.includes(searchTerm) ||
        toolDesc.includes(searchTerm) ||
        toolCat.includes(searchTerm) ||
        projectName.includes(searchTerm) ||
        notes.includes(searchTerm);
      
      // Category filter
      const matchesCategory = categoryFilter === 'all' || 
        item.tool?.category === categoryFilter;
      
      // Condition filter
      const matchesCondition = conditionFilter === 'all' || 
        (item.condition || 'normal') === conditionFilter;
      
      // Project filter
      const matchesProject = projectFilter === 'all' || 
        item.project?.id === parseInt(projectFilter);
      
      // Project Status filter
      const projectStatus = (item.project?.status || 'unknown').toLowerCase();
      const matchesProjectStatus = projectStatusFilter === 'all' ?
        (projectStatus !== 'done' && projectStatus !== 'closed') :
        projectStatus === projectStatusFilter.toLowerCase();
      
      return matchesSearch &&
        (categoryFilter === 'all' || toolCat === categoryFilter.toLowerCase()) &&
        (conditionFilter === 'all' || (item.condition || 'normal') === conditionFilter) &&
        (projectFilter === 'all' || (item.project?.id || '') === projectFilter) &&
        (projectStatusFilter === 'all' || (item.project?.status || 'unknown') === projectStatusFilter);
    });
  }

  // Build filteredToolsWithProjects from filteredData
  $: filteredToolsWithProjects = (() => {
    // Map: toolId -> { tool, projects: [{project, dataProjectTool}] }
    const map = new Map();
    for (const item of filteredData) {
      if (!item.tool?.id) continue; // Hapus syarat !item.project?.id agar alat tanpa project tetap masuk
      if (!map.has(item.tool.id)) {
        map.set(item.tool.id, {
          tool: item.tool,
          projects: [],
        });
      }
      if (item.project) {
        map.get(item.tool.id).projects.push({
          project: item.project,
          dataProjectTool: item
        });
      }
    }
    return Array.from(map.values());
  })();

  // Reactive stats calculation
  $: conditionStats = {
    total: combinedData.length,
    filtered: filteredData.length,
    normal: combinedData.filter(item => (item.condition || 'normal') === 'normal').length,
    bermasalah: combinedData.filter(item => item.condition === 'bermasalah').length,
    rusak: combinedData.filter(item => item.condition === 'rusak').length,
    projects: projects.length,
    categories: categories.length
  };
  
  // Load data on mount
  onMount(async () => {
    await loadAllData();
  });
  
  // Main data loading function
  async function loadAllData() {
    loading = true;
    error = null;
    
    try {
      // Ambil data tools dan project_tools langsung dari endpoint masing-masing
      const [toolsResponse, projectToolsResponse, projectsResponse, maintenanceResponse] = await Promise.all([
        toolsService.getAll({ 
          sort: 'name',
          fields: '*'
        }),
        projectToolsService.getAll({ 
          sort: '-date_updated',
          fields: '*,project_id.*,tool_id.*',
          limit: -1 // Ambil semua data tanpa limit
        }),
        api.get('/items/projects', { params: { fields: '*' } }),
        api.get('/items/maintenance', { params: { fields: '*,tool_id,project_id,date_created' } })
      ]);
      
      tools = toolsResponse.data || [];
      projectTools = projectToolsResponse.data || [];
      projects = projectsResponse.data?.data || [];
      maintenances = maintenanceResponse.data?.data || [];
      
      // Debug log setelah fetch
      console.log('tools sample:', tools.slice(0, 3));
      // Debug log setelah fetch tools
      console.log('tools:', tools.map(t => t.name));
      // Debug log seluruh nama alat
      console.log('Semua nama alat:', tools.map(t => t.name));
      console.log('projectTools sample:', projectTools.slice(0, 3));
      // Debug log seluruh projectTools untuk sepatu paku
      console.log('projectTools (semua):', projectTools);
      console.log('projectTools (sepatu paku):', projectTools.filter(pt => pt.tool_id && (pt.tool_id.name?.toLowerCase().includes('sepatu paku') || pt.tool_id === 25)));
      
      // Process and combine data
      processData();
      
    } catch (err) {
      error = err.message || 'Gagal memuat data alat';
      console.error('Error loading tools data:', err);
    } finally {
      loading = false;
    }
  }
  
  // Process and combine the loaded data
  // function processData() {
  function processData() {
    // Debug: log data projectTools tanpa tool_id atau project_id
    const noToolId = projectTools.filter(pt => !pt.tool_id);
    const noProjectId = projectTools.filter(pt => !pt.project_id);
    if (noToolId.length > 0) {
      console.warn('Data projectTools tanpa tool_id:', noToolId);
    }
    if (noProjectId.length > 0) {
      console.warn('Data projectTools tanpa project_id:', noProjectId);
    }
    // Filter hanya data yang punya tool_id dan project_id
    const validProjectTools = projectTools.filter(pt => pt.tool_id && pt.project_id);

    // Extract unique projects dari validProjectTools
    projects = [...new Map(
      projectTools
        .filter(pt => pt.project_id && pt.project_id.name)
        .map(pt => [pt.project_id.id, pt.project_id])
    ).values()].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    // Extract unique categories from tools
    categories = [...new Set(
      tools
        .map(t => t.category)
        .filter(Boolean)
    )].sort();

    // Gabungkan semua tools, baik yang punya relasi project_tools maupun tidak
    const toolIdToProjectTools = new Map();
    for (const pt of projectTools) {
      if (!pt.tool_id) continue;
      const toolId = typeof pt.tool_id === 'object' ? pt.tool_id.id : pt.tool_id;
      if (!toolIdToProjectTools.has(toolId)) {
        toolIdToProjectTools.set(toolId, []);
      }
      toolIdToProjectTools.get(toolId).push(pt);
    }

    combinedData = [];
    for (const tool of tools) {
      const pts = toolIdToProjectTools.get(tool.id);
      if (pts && pts.length > 0) {
        // Ada relasi project_tools, masukkan satu per satu
        for (const pt of pts) {
          // Pastikan project adalah objek
          let projectObj = pt.project_id;
          if (projectObj && typeof projectObj === 'string') {
            projectObj = projects.find(p => p.id === pt.project_id) || { id: pt.project_id, name: '-' };
          }
          // Cari maintenance yang cocok dengan tool_id & project_id
          const relatedMaint = maintenances.filter(m =>
            m.tool_id === tool.id && m.project_id === projectObj?.id
          );
          relatedMaint.sort((a, b) => new Date(b.date_created) - new Date(a.date_created));
          combinedData.push({
            id: pt.id,
            tool: tool,
            project: projectObj,
            quantity: pt.quantity || 0,
            condition: pt.condition || 'normal',
            notes: pt.notes,
            date_created: pt.date_created,
            date_updated: pt.date_updated,
            pemeliharaan: relatedMaint.length > 0
              ? `Total: ${relatedMaint.length}, Terakhir: ${relatedMaint[0]?.date_created ? new Date(relatedMaint[0].date_created).toLocaleDateString('id-ID') : '-'}`
              : (pt.pemeliharaan || null)
          });
        }
      } else {
        // Tidak ada relasi project_tools, tampilkan alat saja (data baru juga masuk)
        combinedData.push({
          id: tool.id,
          tool: tool,
          project: null,
          quantity: tool.quantity || 0,
          condition: tool.condition || 'normal',
          notes: tool.notes || '',
          date_created: tool.date_created,
          date_updated: tool.date_updated,
          pemeliharaan: null
        });
      }
    }

    // Sort by: condition priority (rusak > bermasalah > normal), then by name
    const conditionPriority = { 'rusak': 3, 'bermasalah': 2, 'normal': 1 };
    combinedData.sort((a, b) => {
      const aPriority = conditionPriority[a.condition] || 1;
      const bPriority = conditionPriority[b.condition] || 1;
      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }
      return (a.tool?.name || '').localeCompare(b.tool?.name || '');
    });

    // Kelompokkan projectTools berdasarkan alat
    const toolMap = new Map();
    for (const pt of projectTools) {
      if (!pt.tool_id) continue;
      const toolId = pt.tool_id.id;
      if (!toolMap.has(toolId)) {
        toolMap.set(toolId, {
          tool: pt.tool_id,
          projects: [],
        });
      }
      // Pastikan project adalah objek, bukan hanya ID
      let projectObj = pt.project_id;
      if (projectObj && typeof projectObj === 'string') {
        // Cari project dari daftar projects jika hanya ID
        projectObj = projects.find(p => p.id === pt.project_id) || { id: pt.project_id, name: '-' };
      }
      if (projectObj) {
        toolMap.get(toolId).projects.push({
          project: projectObj,
          dataProjectTool: pt
        });
      }
    }
    toolsWithProjects = Array.from(toolMap.values());
    // Set default project terpilih per alat
    for (const t of toolsWithProjects) {
      if (!selectedProjects[t.tool.id] && t.projects.length > 0) {
        selectedProjects[t.tool.id] = t.projects[0].project.id;
      }
    }
  }
  
  // Update condition for a specific tool
  async function updateCondition(item, newCondition) {
    if (updating[item.id]) return; // Prevent double-updates
    
    updating[item.id] = true;
    updating = { ...updating };
    
    try {
      await projectToolsService.updateCondition(item.id, {
        condition: newCondition,
        notes: item.notes
      });
      
      // Update local data immediately for better UX
      const index = combinedData.findIndex(d => d.id === item.id);
      if (index !== -1) {
        combinedData[index].condition = newCondition;
        combinedData[index].date_updated = new Date().toISOString();
        combinedData = [...combinedData]; // Trigger reactivity
      }
      
      // Show success feedback briefly
      setTimeout(() => {
        delete updating[item.id];
        updating = { ...updating };
      }, 1000);
      
    } catch (err) {
      error = err.message || 'Gagal mengupdate kondisi';
      console.error('Error updating condition:', err);
      
      delete updating[item.id];
      updating = { ...updating };
    }
  }
  
  // Create maintenance for a tool
  async function createMaintenance(item) {
    // Create URL with pre-filled data
    const params = new URLSearchParams({
      tool_id: item.tool?.id || '',
      project_id: item.project?.id || '',
      condition: item.condition || 'normal',
      notes: item.notes || '',
      tool_name: item.tool?.name || '',
      project_name: item.project?.name || ''
    });
    
    // Navigate to create maintenance page with pre-filled data
    goto(`/maintenance/create?${params.toString()}`);
  }
  
  // Format date for display
  function formatDate(date) {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // Reset all filters
  function resetFilters() {
    searchQuery = '';
    categoryFilter = 'all';
    conditionFilter = 'all';
    projectFilter = 'all';
    projectStatusFilter = 'all' // Reset project status filter
  }

  // Check if any filters are active
  $: hasActiveFilters = searchQuery || categoryFilter !== 'all' || 
                       conditionFilter !== 'all' || projectFilter !== 'all' ||
                       projectStatusFilter !== 'all'; // Include project status filter

  // Export data functionality (bonus feature)
  function exportData() {
    const csvData = filteredData.map(item => ({
      'Nama Alat': item.tool?.name || '',
      'Deskripsi': item.tool?.description || '',
      'Kategori': item.tool?.category || '',
      'Project': item.project?.name || '',
      'Jumlah': item.quantity,
      'Kondisi': item.condition || 'normal',
      'Catatan': item.notes || '',
      'Pemeliharaan': item.pemeliharaan || '',
      'Update Terakhir': formatDate(item.date_updated)
    }));
    
    console.log('Export data:', csvData);
    // Implementasi export CSV jika diperlukan
  }
  
  // Check if tool needs maintenance (bermasalah or rusak)
  function needsMaintenance(condition) {
    return condition === 'bermasalah' || condition === 'rusak';
  }

  // Get selected project object for a tool
  function getSelectedProjectObj(toolId) {
    const t = toolsWithProjects.find(t => t.tool.id === toolId);
    if (!t) return null;
    return t.projects.find(p => p.project.id === selectedProjects[toolId]) || t.projects[0] || null;
  }

  // Tambahkan log untuk melihat filter yang aktif dan hasil filter
  $: {
    console.log('FILTER STATE:', {
      searchQuery,
      categoryFilter,
      conditionFilter,
      projectFilter,
      projectStatusFilter
    });
    console.log('filteredData (alat sepatu paku):', filteredData.filter(item => item.tool?.name?.toLowerCase().includes('sepatu paku')));
  }
</script>

<div class="space-y-6">
  <!-- Header Section -->
  <div class="sm:flex sm:items-center sm:justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Tools & Kondisi</h1>
      <p class="mt-1 text-sm text-gray-600">
        Kelola kondisi alat dalam setiap proyek ({conditionStats.total} total items)
      </p>
    </div>
    
    <div class="mt-4 sm:mt-0 flex space-x-3">
      {#if hasActiveFilters}
        <button
          on:click={resetFilters}
          class="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          🗑️ Reset Filter
        </button>
      {/if}
      
      <!-- <button
        on:click={exportData}
        disabled={filteredData.length === 0}
        class="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
      >
        📊 Export Data
      </button> -->
      
      <button
        on:click={loadAllData}
        disabled={loading}
        class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
      >
        {#if loading}
          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
        {:else}
          🔄
        {/if}
        Refresh
      </button>
    </div>
  </div>

  <!-- Statistics Cards -->
  <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-6" transition:fade>
    <div class="bg-white overflow-hidden shadow rounded-lg">
      <div class="px-4 py-5 sm:p-6">
        <dt class="text-sm font-medium text-gray-500 truncate">Total Items</dt>
        <dd class="mt-1 text-3xl font-semibold text-gray-900">{conditionStats.total}</dd>
        {#if hasActiveFilters}
          <dd class="text-xs text-gray-500">({conditionStats.filtered} filtered)</dd>
        {/if}
      </div>
    </div>
    
    <div class="bg-green-50 overflow-hidden shadow rounded-lg">
      <div class="px-4 py-5 sm:p-6">
        <dt class="text-sm font-medium text-green-600 truncate">Normal</dt>
        <dd class="mt-1 text-3xl font-semibold text-green-900">{conditionStats.normal}</dd>
        <dd class="text-xs text-green-600">
          {conditionStats.total > 0 ? Math.round((conditionStats.normal / conditionStats.total) * 100) : 0}%
        </dd>
      </div>
    </div>
    
    <div class="bg-yellow-50 overflow-hidden shadow rounded-lg">
      <div class="px-4 py-5 sm:p-6">
        <dt class="text-sm font-medium text-yellow-600 truncate">Bermasalah</dt>
        <dd class="mt-1 text-3xl font-semibold text-yellow-900">{conditionStats.bermasalah}</dd>
        <dd class="text-xs text-yellow-600">
          {conditionStats.total > 0 ? Math.round((conditionStats.bermasalah / conditionStats.total) * 100) : 0}%
        </dd>
      </div>
    </div>
    
    <div class="bg-red-50 overflow-hidden shadow rounded-lg">
      <div class="px-4 py-5 sm:p-6">
        <dt class="text-sm font-medium text-red-600 truncate">Rusak</dt>
        <dd class="mt-1 text-3xl font-semibold text-red-900">{conditionStats.rusak}</dd>
        <dd class="text-xs text-red-600">
          {conditionStats.total > 0 ? Math.round((conditionStats.rusak / conditionStats.total) * 100) : 0}%
        </dd>
      </div>
    </div>
    
    <div class="bg-blue-50 overflow-hidden shadow rounded-lg">
      <div class="px-4 py-5 sm:p-6">
        <dt class="text-sm font-medium text-blue-600 truncate">Projects</dt>
        <dd class="mt-1 text-3xl font-semibold text-blue-900">{conditionStats.projects}</dd>
      </div>
    </div>
    
    <div class="bg-purple-50 overflow-hidden shadow rounded-lg">
      <div class="px-4 py-5 sm:p-6">
        <dt class="text-sm font-medium text-purple-600 truncate">Categories</dt>
        <dd class="mt-1 text-3xl font-semibold text-purple-900">{conditionStats.categories}</dd>
      </div>
    </div>
  </div>

  <!-- FILTERS SECTION -->
  <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200" transition:slide>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <!-- Cari Alat/Project Filter -->
      <div class="lg:col-span-1">
        <label for="search" class="block text-sm font-medium text-gray-700">
          Cari Alat/Project
        </label>
        <div class="mt-1 relative rounded-md shadow-sm">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span class="text-gray-500 sm:text-sm">🔍</span>
          </div>
          <input
            type="text"
            id="search"
            bind:value={searchQuery}
            placeholder="Cari nama, deskripsi, project..."
            class="pl-10 block w-full pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm rounded-md"
          />
        </div>
        {#if searchQuery}
          <div class="mt-1 text-xs text-gray-500">
            {filteredData.length} hasil ditemukan
          </div>
        {/if}
      </div>

      <!-- Kategori Filter -->
      <div>
        <label for="category" class="block text-sm font-medium text-gray-700">
          Kategori
        </label>
        <select
          id="category"
          bind:value={categoryFilter}
          class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm rounded-md"
        >
          <option value="all">Semua Kategori ({categories.length})</option>
          {#each categories as category}
            <option value={category}>{category}</option>
          {/each}
        </select>
      </div>
      
      <!-- Kondisi Filter -->
      <div>
        <label for="condition" class="block text-sm font-medium text-gray-700">
          Kondisi
        </label>
        <select
          id="condition"
          bind:value={conditionFilter}
          class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm rounded-md"
        >
          <option value="all">Semua Kondisi</option>
          <option value="normal">✅ Normal ({conditionStats.normal})</option>
          <option value="bermasalah">⚠️ Bermasalah ({conditionStats.bermasalah})</option>
          <option value="rusak">❌ Rusak ({conditionStats.rusak})</option>
        </select>
      </div>
      
      <!-- Project Filter -->
      <div>
        <label for="project" class="block text-sm font-medium text-gray-700">
          Project
        </label>
        <select
          id="project"
          bind:value={projectFilter}
          class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm rounded-md"
        >
          <option value="all">Semua Project ({projects.length})</option>
          {#each projects as project}
            <option value={project.id}>{project.name}</option>
          {/each}
        </select>
      </div>

      <!-- Status Project Filter -->
      <div>
        <label for="project-status" class="block text-sm font-medium text-gray-700">
          Status Project
        </label>
        <select
          id="project-status"
          bind:value={projectStatusFilter}
          class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm rounded-md"
        >
          <option value="all">Semua Status</option>
          {#each projectStatusOptions as statusOption}
            <option value={statusOption.value}>{statusOption.label}</option>
          {/each}
        </select>
      </div>
    </div>

    <!-- Filter Summary -->
    {#if hasActiveFilters}
      <div class="mt-4 pt-3 border-t border-gray-200" transition:slide>
        <div class="flex items-center justify-between text-sm text-gray-600">
          <span>
            Menampilkan <strong>{filteredData.length}</strong> dari <strong>{combinedData.length}</strong> item
          </span>
          <button
            on:click={resetFilters}
            class="text-primary hover:text-blue-700 font-medium"
          >
            Reset Semua Filter
          </button>
        </div>
      </div>
    {/if}
  </div>
  <!-- END FILTERS SECTION -->

  <!-- Error Message -->
  {#if error}
    <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md" transition:slide>
      <div class="flex">
        <div class="flex-shrink-0">
          <span class="text-red-400">⚠️</span>
        </div>
        <div class="ml-3">
          <p class="text-sm">{error}</p>
          <button
            on:click={loadAllData}
            class="mt-2 text-sm text-red-700 underline focus:outline-none"
          >
            Coba lagi
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Tools Table -->
  <div class="bg-white shadow overflow-hidden sm:rounded-lg">
    {#if loading}
      <div class="flex justify-center items-center h-64" transition:fade>
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p class="text-gray-600">Memuat data alat...</p>
        </div>
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nama Alat 
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kategori
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Project
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status Project
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Qty
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kondisi
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Update Terakhir
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Catatan
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pemeliharaan
              </th>
              <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            {#if filteredData.length === 0}
              <tr><td colspan="10" class="text-center py-8 text-gray-500">Tidak ada data alat</td></tr>
            {:else}
              {#each filteredToolsWithProjects as t}
                <tr>
                  <!-- Nama Alat -->
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">{t.tool.name}
                      {#if t.projects.length > 0}
                        <details class="relative inline-block ml-2 group">
                          <summary class="text-xs text-blue-600 hover:text-blue-800 cursor-pointer focus:outline-none">
                            (Lihat Riwayat Proyek)
                          </summary>
                          <ul class="absolute z-20 mt-1 w-64 bg-white shadow-xl rounded-md border border-gray-200 text-xs max-h-40 overflow-y-auto left-0">
                            {#each t.projects as p}
                              <li class="px-3 py-2 hover:bg-gray-100 text-gray-700">
                                {p.project.name}
                                {#if p.project.date_updated}
                                  <span class="text-gray-400 ml-1">
                                    ({new Date(p.project.date_updated).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })})
                                  </span>
                                {/if}
                              </li>
                            {:else}
                              <li class="px-3 py-2 text-gray-500">Tidak ada riwayat proyek.</li>
                            {/each}
                          </ul>
                        </details>
                      {/if}
                    </div>
                    {#if t.tool.description}
                      <div class="text-xs text-gray-500">{t.tool.description}</div>
                    {/if}
                  </td>
                  <!-- Kategori -->
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                      {t.tool.category || 'Uncategorized'}
                    </span>
                  </td>
                  <!-- Project Dropdown -->
                  <td class="px-6 py-4 whitespace-nowrap">
                    <select bind:value={selectedProjects[t.tool.id]} class="border rounded px-2 py-1 text-sm">
                      {#each t.projects as p}
                        <option value={p.project.id}>{p.project.name}</option>
                      {/each}
                    </select>
                    {#if getSelectedProjectObj(t.tool.id)?.project.lokasi}
                      <div class="text-xs text-gray-500 mt-1">📍 {getSelectedProjectObj(t.tool.id).project.lokasi}</div>
                    {/if}
                  </td>
                  <!-- Status Project -->
                  <td class="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={getSelectedProjectObj(t.tool.id)?.project.status || 'unknown'} />
                  </td>
                  <!-- Qty -->
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span class="font-mono">{getSelectedProjectObj(t.tool.id)?.dataProjectTool.quantity || 0}</span>
                    <span class="text-gray-500 text-xs ml-1">unit</span>
                  </td>
                  <!-- Kondisi -->
                  <td class="px-6 py-4 whitespace-nowrap">
                    <ConditionBadge condition={getSelectedProjectObj(t.tool.id)?.dataProjectTool.condition || 'normal'} />
                  </td>
                  <!-- Update Terakhir -->
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span>{formatDate(getSelectedProjectObj(t.tool.id)?.dataProjectTool.date_updated)}</span>
                  </td>
                  <!-- Catatan -->
                  <td class="px-6 py-4 max-w-xs">
                    <div class="text-sm text-gray-900 truncate" title={getSelectedProjectObj(t.tool.id)?.dataProjectTool.notes}>
                      {getSelectedProjectObj(t.tool.id)?.dataProjectTool.notes || '-'}
                    </div>
                  </td>
                  <!-- Pemeliharaan -->
                  <td class="px-6 py-4 whitespace-nowrap">
                    {#if getSelectedProjectObj(t.tool.id)?.dataProjectTool.pemeliharaan}
                      <div class="text-sm text-gray-900">
                        {getSelectedProjectObj(t.tool.id).dataProjectTool.pemeliharaan}
                      </div>
                    {:else}
                      <span class="text-xs text-gray-500">Tidak ada pemeliharaan</span>
                    {/if}
                  </td>
                  <!-- Aksi -->
                  <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <div class="flex flex-col space-y-1">
                      <select
                        value={getSelectedProjectObj(t.tool.id)?.dataProjectTool.condition || 'normal'}
                        on:change={(e) => updateCondition(getSelectedProjectObj(t.tool.id).dataProjectTool, e.target.value)}
                        disabled={updating[getSelectedProjectObj(t.tool.id)?.dataProjectTool.id]}
                        class="text-xs border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        class:animate-pulse={updating[getSelectedProjectObj(t.tool.id)?.dataProjectTool.id]}
                      >
                        <option value="normal">✅ Normal</option>
                        <option value="bermasalah">⚠️ Bermasalah</option>
                        <option value="rusak">❌ Rusak</option>
                      </select>
                      <button
                        on:click={() => createMaintenance({
                          tool: {
                            id: t.tool.id,
                            name: t.tool.name
                          },
                          project: {
                            id: getSelectedProjectObj(t.tool.id)?.project.id,
                            name: getSelectedProjectObj(t.tool.id)?.project.name
                          },
                          condition: getSelectedProjectObj(t.tool.id)?.dataProjectTool.condition,
                          notes: getSelectedProjectObj(t.tool.id)?.dataProjectTool.notes
                        })}
                        class="text-xs px-2 py-1 rounded focus:outline-none transition-colors"
                        class:bg-red-600={needsMaintenance(getSelectedProjectObj(t.tool.id)?.dataProjectTool.condition)}
                        class:text-white={needsMaintenance(getSelectedProjectObj(t.tool.id)?.dataProjectTool.condition)}
                        class:hover:bg-red-700={needsMaintenance(getSelectedProjectObj(t.tool.id)?.dataProjectTool.condition)}
                        class:bg-blue-100={!needsMaintenance(getSelectedProjectObj(t.tool.id)?.dataProjectTool.condition)}
                        class:text-blue-600={!needsMaintenance(getSelectedProjectObj(t.tool.id)?.dataProjectTool.condition)}
                        class:hover:bg-blue-200={!needsMaintenance(getSelectedProjectObj(t.tool.id)?.dataProjectTool.condition)}
                      >
                        {#if needsMaintenance(getSelectedProjectObj(t.tool.id)?.dataProjectTool.condition)}
                          🛠️ Buat Maintenance
                        {:else}
                          ➕ Buat Maintenance
                        {/if}
                      </button>
                    </div>
                  </td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>
      
      <!-- Table Footer with Summary -->
      {#if filteredData.length > 0}
        <div class="bg-gray-50 px-6 py-3 border-t border-gray-200">
          <div class="flex items-center justify-between text-sm text-gray-700">
            <div>
              Menampilkan <span class="font-medium">{filteredData.length}</span> 
              {#if hasActiveFilters}dari {combinedData.length}{/if} item
              {#if conditionStats.bermasalah + conditionStats.rusak > 0}
                <span class="ml-2 text-red-600 font-medium">
                  ({conditionStats.bermasalah + conditionStats.rusak} perlu maintenance)
                </span>
              {/if}
            </div>
            <div class="flex items-center space-x-4">
              <span class="text-green-600">✅ {conditionStats.normal}</span>
              <span class="text-yellow-600">⚠️ {conditionStats.bermasalah}</span>
              <span class="text-red-600">❌ {conditionStats.rusak}</span>
            </div>
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  /* Custom row background colors for conditions */
  .bg-red-25 {
    background-color: rgba(254, 242, 242, 0.5);
  }
  .bg-yellow-25 {
    background-color: rgba(255, 251, 235, 0.5);
  }
  
  /* Smooth transitions */
  .transition-colors {
    transition: background-color 0.2s ease-in-out;
  }
  
  /* Custom scrollbar for table */
  .overflow-x-auto::-webkit-scrollbar {
    height: 6px;
  }
  .overflow-x-auto::-webkit-scrollbar-track {
    background: #f1f1f1;
  }
  .overflow-x-auto::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
  }
  .overflow-x-auto::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
</style>