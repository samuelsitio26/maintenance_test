<!-- src/lib/components/maintenance/ProblematicTools.svelte -->
<script>
    import { onMount } from 'svelte';
    import { projectToolsService } from '$lib/services/projectTools.js';
    import ConditionBadge from '$lib/components/common/ConditionBadge.svelte';
    import { fade, slide } from 'svelte/transition';
    import { goto } from '$app/navigation';
  
    // Props
    export let showFilters = true;
    export let maxItems = null;
    export let title = 'Alat dengan Kondisi Bermasalah';
  
    // Local state
    let problematicTools = [];
    let conditionSummary = { bermasalah: 0, rusak: 0, total: 0 };
    let loading = false;
    let error = null;
    let selectedCondition = 'all';
    let selectedProject = null;
    let showDetails = {};
  
    // Load data on mount
    onMount(async () => {
      await loadProblematicTools();
    });
  
    // Reactive statements
    $: filteredTools = filterTools(problematicTools, selectedCondition, selectedProject);
    $: displayedTools = maxItems ? filteredTools.slice(0, maxItems) : filteredTools;
  
    // Load problematic tools
    async function loadProblematicTools() {
      loading = true;
      error = null;
      
      try {
        const response = await projectToolsService.getProblematicTools();
        problematicTools = response.data || [];
        
        // Calculate summary
        conditionSummary = {
          bermasalah: problematicTools.filter(t => t.condition === 'bermasalah').length,
          rusak: problematicTools.filter(t => t.condition === 'rusak').length,
          total: problematicTools.length
        };
        
      } catch (err) {
        error = err.message || 'Gagal memuat data';
        console.error('Error loading problematic tools:', err);
      } finally {
        loading = false;
      }
    }
  
    // Filter tools based on selected filters
    function filterTools(tools, condition, project) {
      let filtered = tools;
  
      if (condition && condition !== 'all') {
        filtered = filtered.filter(tool => tool.condition === condition);
      }
  
      if (project) {
        filtered = filtered.filter(tool => tool.project_id?.id === project);
      }
  
      return filtered;
    }
  
    // Format date
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
  
    // Get condition badge class
    function getConditionBadgeClass(condition) {
      switch (condition) {
        case 'rusak':
          return 'bg-red-100 text-red-800 border-red-200';
        case 'bermasalah':
          return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        default:
          return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    }
  
    // Get condition icon
    function getConditionIcon(condition) {
      switch (condition) {
        case 'rusak':
          return '🔴';
        case 'bermasalah':
          return '🟡';
        default:
          return '⚪';
      }
    }
  
    // Toggle details
    function toggleDetails(toolId) {
      showDetails[toolId] = !showDetails[toolId];
      showDetails = { ...showDetails };
    }
  
    // Handle condition update
    async function updateCondition(tool, newCondition) {
      try {
        await projectToolsService.updateCondition(tool.id, {
          condition: newCondition,
          notes: tool.notes
        });
        
        // Reload data to refresh the list
        await loadProblematicTools();
      } catch (error) {
        console.error('Error updating condition:', error);
        error = 'Gagal mengupdate kondisi';
      }
    }
  
    // Refresh data
    async function refreshData() {
      await loadProblematicTools();
    }
  
    function handleCreateMaintenance(tool) {
      // Kirim data via query params sesuai kebutuhan MaintenanceForm
      const params = new URLSearchParams({
        tool_id: tool.tool_id?.id,
        tool_name: tool.tool_id?.name,
        project_id: tool.project_id?.id,
        project_name: tool.project_id?.name,
        condition: tool.condition
      });
      goto(`/maintenance/create?${params.toString()}`);
    }
  </script>
  
  <div class="bg-white border border-gray-200 rounded-lg p-4">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-gray-900">
        {title}
        {#if conditionSummary.total > 0}
          <span class="text-sm font-normal text-red-600 ml-2">
            ({conditionSummary.total} item)
          </span>
        {/if}
      </h2>
      
      <button
        on:click={refreshData}
        disabled={loading}
        class="text-sm text-blue-600 hover:text-blue-800 focus:outline-none disabled:opacity-50"
      >
        🔄 Refresh
      </button>
    </div>
  
    <!-- Quick Stats -->
    <div class="grid grid-cols-2 gap-4 mb-4">
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <div class="flex items-center">
          <span class="text-lg mr-2">🟡</span>
          <div>
            <p class="text-sm font-medium text-yellow-800">Bermasalah</p>
            <p class="text-lg font-bold text-yellow-900">{conditionSummary.bermasalah}</p>
          </div>
        </div>
      </div>
      
      <div class="bg-red-50 border border-red-200 rounded-lg p-3">
        <div class="flex items-center">
          <span class="text-lg mr-2">🔴</span>
          <div>
            <p class="text-sm font-medium text-red-800">Rusak</p>
            <p class="text-lg font-bold text-red-900">{conditionSummary.rusak}</p>
          </div>
        </div>
      </div>
    </div>
  
    <!-- Filters -->
    {#if showFilters}
      <div class="border-t border-gray-200 pt-4 mb-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="condition-filter" class="block text-sm font-medium text-gray-700 mb-1">
              Filter Kondisi
            </label>
            <select
              id="condition-filter"
              bind:value={selectedCondition}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Semua Kondisi</option>
              <option value="bermasalah">Bermasalah</option>
              <option value="rusak">Rusak</option>
            </select>
          </div>
        </div>
      </div>
    {/if}
  
    <!-- Loading State -->
    {#if loading}
      <div class="flex justify-center items-center py-8" transition:fade>
        <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <span class="ml-2 text-gray-600">Memuat data...</span>
      </div>
    
    <!-- Error State -->
    {:else if error}
      <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md" transition:fade>
        <p class="text-sm">{error}</p>
        <button
          on:click={refreshData}
          class="mt-2 text-sm text-red-700 underline focus:outline-none"
        >
          Coba lagi
        </button>
      </div>
    
    <!-- Empty State -->
    {:else if displayedTools.length === 0}
      <div class="text-center py-8" transition:fade>
        <div class="text-4xl mb-2">✅</div>
        <p class="text-gray-600 mb-2">Tidak ada alat dengan masalah</p>
        <p class="text-sm text-gray-500">Semua alat dalam kondisi normal</p>
      </div>
    
    <!-- Tools List -->
    {:else}
      <div class="space-y-3" transition:fade>
        {#each displayedTools as tool (tool.id)}
          <div 
            class="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
            transition:slide
          >
            <!-- Main Info -->
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center mb-2">
                  <span class="text-lg mr-2">{getConditionIcon(tool.condition)}</span>
                  <h3 class="font-medium text-gray-900">
                    {tool.tool_id?.name || 'Alat tidak terdefinisi'}
                  </h3>
                  <span class="ml-2">
                    <ConditionBadge condition={tool.condition} size="small" />
                  </span>
                </div>
                
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-gray-600">
                  <div>
                    <span class="font-medium">Project:</span>
                    {tool.project_id?.name || 'Tidak terdefinisi'}
                  </div>
                  <div>
                    <span class="font-medium">Jumlah:</span>
                    {tool.quantity} unit
                  </div>
                  <div>
                    <span class="font-medium">Update:</span>
                    {formatDate(tool.date_updated)}
                  </div>
                </div>
  
                <div class="mt-2 flex flex-col gap-2">
                  {#if tool.notes}
                    <div class="p-2 bg-gray-50 rounded text-sm text-gray-700">
                      <span class="font-medium">Catatan:</span> {tool.notes}
                    </div>
                  {/if}
                  <!-- <a href={`/maintenance/create?tool_id=${tool.tool_id?.id}&project_id=${tool.project_id?.id}`}
                    class="inline-flex items-center px-2.5 py-1 border border-red-700 rounded shadow-sm text-xs font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 min-w-0 w-fit">
                    <svg xmlns='http://www.w3.org/2000/svg' class='h-4 w-4 mr-1' fill='none' viewBox='0 0 24 24' stroke='currentColor' stroke-width='2' style='min-width:1rem;'>
                      <path stroke-linecap='round' stroke-linejoin='round' d='M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.94l-2.829.943.943-2.829a4 4 0 01.94-1.414z' />
                    </svg>
                    Buat Maintenance
                  </a> -->
                </div>
              </div>
  
              <button
                on:click={() => toggleDetails(tool.id)}
                class="ml-4 text-sm text-blue-600 hover:text-blue-800 focus:outline-none"
              >
                {showDetails[tool.id] ? 'Tutup' : 'Detail'}
              </button>
            </div>
  
            <!-- Expanded Details -->
            {#if showDetails[tool.id]}
              <div class="mt-4 pt-4 border-t border-gray-200" transition:slide>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h4 class="font-medium text-gray-900 mb-2">Informasi Alat</h4>
                    <div class="space-y-1 text-sm text-gray-600">
                      <div><span class="font-medium">ID Alat:</span> {tool.tool_id?.id || '-'}</div>
                      <div><span class="font-medium">Deskripsi:</span> {tool.tool_id?.description || '-'}</div>
                      <div><span class="font-medium">Kategori:</span> {tool.tool_id?.category || '-'}</div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 class="font-medium text-gray-900 mb-2">Update Kondisi</h4>
                    <select
                      value={tool.condition}
                      on:change={(e) => updateCondition(tool, e.target.value)}
                      class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="normal">Normal</option>
                      <option value="bermasalah">Bermasalah</option>
                      <option value="rusak">Rusak</option>
                    </select>
                  </div>
                </div>
              </div>
            {/if}
  
            <!-- Action Button -->
            <div class="mt-4">
              <button
                class="ml-2 text-xs px-2 py-1 rounded focus:outline-none transition-colors bg-red-600 text-white hover:bg-red-700"
                on:click={() => handleCreateMaintenance(tool)}
              >
                🛠️ Buat Maintenance
              </button>
            </div>
          </div>
        {/each}
  
        <!-- Show More Button -->
        {#if maxItems && filteredTools.length > maxItems}
          <div class="text-center pt-4">
            <button
              on:click={() => maxItems = null}
              class="text-sm text-blue-600 hover:text-blue-800 focus:outline-none"
            >
              Tampilkan semua ({filteredTools.length} item)
            </button>
          </div>
        {/if}
      </div>
    {/if}
  </div>
  
  <style>
    /* Custom animations */
    @keyframes pulse-subtle {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.8; }
    }
    
    .animate-pulse-subtle {
      animation: pulse-subtle 2s ease-in-out infinite;
    }
  </style>