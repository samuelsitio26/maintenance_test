<!-- src/routes/tools/grid/+page.svelte -->
<script>
    import { onMount } from 'svelte';
    import { toolsService } from '$lib/services/tools.js';
    import { maintenanceService } from '$lib/services/maintenance.js';
    
    let tools = [];
    let maintenanceData = [];
    let loading = true;
    let error = null;
    let viewMode = 'grid'; // grid or list
    let searchQuery = '';
    
    // Get tools with maintenance status
    $: toolsWithStatus = tools.map(tool => {
      const maintenance = maintenanceData.find(m => 
        m.tool_id?.id === tool.id && 
        m.status !== 'completed'
      );
      
      return {
        ...tool,
        maintenanceStatus: maintenance?.status || 'available',
        maintenanceNotes: maintenance?.notes || null,
        maintenanceProgress: maintenance?.progress || null
      };
    });
    
    // Filter tools
    $: filteredTools = toolsWithStatus.filter(tool => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        tool.name?.toLowerCase().includes(query) ||
        tool.description?.toLowerCase().includes(query) ||
        tool.category?.toLowerCase().includes(query)
      );
    });
    
    // Group by category
    $: groupedTools = filteredTools.reduce((acc, tool) => {
      const category = tool.category || 'Tanpa Kategori';
      if (!acc[category]) acc[category] = [];
      acc[category].push(tool);
      return acc;
    }, {});
    
    onMount(async () => {
      await loadData();
    });
    
    async function loadData() {
      loading = true;
      error = null;
      
      try {
        const [toolsResponse, maintenanceResponse] = await Promise.all([
          toolsService.getAll({ sort: 'name' }),
          maintenanceService.getAll({
            filter: { status: { _neq: 'completed' } },
            fields: '*,tool_id.*'
          })
        ]);
        
        tools = toolsResponse.data || [];
        maintenanceData = maintenanceResponse.data || [];
      } catch (err) {
        error = err.message || 'Gagal memuat data';
        console.error('Error loading data:', err);
      } finally {
        loading = false;
      }
    }
    
    // Get status color
    function getStatusColor(status) {
      switch (status) {
        case 'available': return 'bg-green-100 text-green-800 border-green-200';
        case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'under_maintenance': return 'bg-orange-100 text-orange-800 border-orange-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    }
    
    // Get status label
    function getStatusLabel(status) {
      switch (status) {
        case 'available': return 'Tersedia';
        case 'pending': return 'Pending';
        case 'in_progress': return 'On Process';
        case 'under_maintenance': return 'Under Maintenance';
        case 'to_do': return 'To Do';
        default: return status;
      }
    }
    
    // Get category icon
    function getCategoryIcon(category) {
      const icons = {
        'Air Compressor': '🌬️',
        'Compressor': '🔧',
        'Generator': '⚡',
        'Mesin': '⚙️',
        'Alat Berat': '🚜',
        'Pompa': '💧',
        'Las': '🔥',
        'Graco': '🎨',
        'Airless': '🖌️'
      };
      
      for (const [key, icon] of Object.entries(icons)) {
        if (category?.toLowerCase().includes(key.toLowerCase())) {
          return icon;
        }
      }
      return '🔧';
    }
  </script>
  
  <div class="space-y-6">
    <!-- Header -->
    <div class="sm:flex sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Daftar Alat - View Grid</h1>
        <p class="mt-1 text-sm text-gray-600">
          Tampilan visual status alat dan maintenance
        </p>
      </div>
      <div class="mt-4 sm:mt-0 flex space-x-3">
        <!-- View Mode Toggle -->
        <div class="inline-flex rounded-md shadow-sm" role="group">
          <button
            on:click={() => viewMode = 'grid'}
            class="px-4 py-2 text-sm font-medium rounded-l-md border {viewMode === 'grid' 
              ? 'bg-primary text-white border-primary' 
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}"
          >
            Grid
          </button>
          <button
            on:click={() => viewMode = 'list'}
            class="px-4 py-2 text-sm font-medium rounded-r-md border-t border-b border-r {viewMode === 'list' 
              ? 'bg-primary text-white border-primary' 
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}"
          >
            List
          </button>
        </div>
        
        <button
          on:click={loadData}
          class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          🔄 Refresh
        </button>
      </div>
    </div>
  
    <!-- Search Bar -->
    <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div class="max-w-lg">
        <label for="search" class="block text-sm font-medium text-gray-700">
          Cari Alat
        </label>
        <div class="mt-1 relative rounded-md shadow-sm">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span class="text-gray-500 sm:text-sm">🔍</span>
          </div>
          <input
            type="text"
            id="search"
            bind:value={searchQuery}
            placeholder="Cari nama alat, deskripsi, atau kategori..."
            class="pl-10 block w-full pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
          />
        </div>
      </div>
    </div>
  
    <!-- Error -->
    {#if error}
      <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
        <p class="text-sm">{error}</p>
      </div>
    {/if}
  
    <!-- Loading -->
    {#if loading}
      <div class="flex justify-center items-center h-64">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    {:else if viewMode === 'grid'}
      <!-- Grid View -->
      <div class="space-y-8">
        {#each Object.entries(groupedTools) as [category, categoryTools]}
          <div>
            <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span class="text-2xl mr-2">{getCategoryIcon(category)}</span>
              {category}
              <span class="ml-2 text-sm font-normal text-gray-500">
                ({categoryTools.length} alat)
              </span>
            </h2>
            
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {#each categoryTools as tool}
                <div class="bg-white overflow-hidden shadow rounded-lg border-2 {getStatusColor(tool.maintenanceStatus)} hover:shadow-lg transition-shadow">
                  <div class="px-4 py-5 sm:p-6">
                    <div class="flex items-start justify-between">
                      <div class="flex-1">
                        <h3 class="text-lg font-medium text-gray-900">
                          {tool.name}
                        </h3>
                        {#if tool.description}
                          <p class="mt-1 text-sm text-gray-600">
                            No: {tool.description}
                          </p>
                        {/if}
                      </div>
                      <span class="text-2xl">{getCategoryIcon(tool.category)}</span>
                    </div>
                    
                    <div class="mt-4">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getStatusColor(tool.maintenanceStatus)}">
                        {getStatusLabel(tool.maintenanceStatus)}
                      </span>
                    </div>
                    
                    {#if tool.maintenanceProgress}
                      <div class="mt-3">
                        <div class="flex items-center justify-between text-sm">
                          <span class="text-gray-600">Progress</span>
                          <span class="font-medium">{tool.maintenanceProgress}</span>
                        </div>
                        <div class="mt-1 w-full bg-gray-200 rounded-full h-2">
                          <div 
                            class="h-2 rounded-full bg-blue-600"
                            style="width: {parseInt(tool.maintenanceProgress)}%"
                          ></div>
                        </div>
                      </div>
                    {/if}
                    
                    {#if tool.maintenanceNotes}
                      <p class="mt-3 text-sm text-gray-600 italic">
                        "{tool.maintenanceNotes}"
                      </p>
                    {/if}
                    
                    <div class="mt-4 pt-4 border-t border-gray-200">
                      <div class="flex items-center justify-between text-xs text-gray-500">
                        <span>ID: {tool.id}</span>
                        <span class={tool.is_active ? 'text-green-600' : 'text-red-600'}>
                          {tool.is_active ? 'Aktif' : 'Tidak Aktif'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <!-- List View -->
      <div class="bg-white shadow overflow-hidden sm:rounded-lg">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Alat
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kategori
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Progress
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Keterangan
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            {#each filteredTools as tool}
              <tr class="hover:bg-gray-50">
                <td class="px-6 py-4">
                  <div>
                    <div class="text-sm font-medium text-gray-900">
                      {tool.name}
                    </div>
                    {#if tool.description}
                      <div class="text-sm text-gray-500">
                        No: {tool.description}
                      </div>
                    {/if}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {tool.category || '-'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getStatusColor(tool.maintenanceStatus)}">
                    {getStatusLabel(tool.maintenanceStatus)}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  {#if tool.maintenanceProgress}
                    <div class="flex items-center">
                      <div class="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          class="h-2 rounded-full bg-blue-600"
                          style="width: {parseInt(tool.maintenanceProgress)}%"
                        ></div>
                      </div>
                      <span class="text-sm">{tool.maintenanceProgress}</span>
                    </div>
                  {:else}
                    -
                  {/if}
                </td>
                <td class="px-6 py-4 text-sm text-gray-900">
                  {tool.maintenanceNotes || '-'}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>