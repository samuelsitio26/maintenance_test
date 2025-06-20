<!-- src/routes/+page.svelte (Simple Version) -->
<script>
  import { onMount } from 'svelte';
  import { projectToolsService } from '$lib/services/projectTools.js';
  import ProblematicTools from '$lib/components/maintenance/ProblematicTools.svelte';
  import ConditionBadge from '$lib/components/common/ConditionBadge.svelte';
  
  let conditionSummary = {
      total: 0,
      normal: 0,
      bermasalah: 0,
      rusak: 0
  };
  
  let recentUpdates = [];
  let loading = true;
  let error = null;
  let hasMaintenanceAccess = true;
  
  onMount(async () => {
      await loadDashboardData();
  });
  
  async function loadDashboardData() {
      loading = true;
      error = null;
      
      try {
          await loadConditionSummary();
          await loadRecentUpdates();
      } catch (err) {
          error = err.message || 'Gagal memuat data dashboard';
          console.error('Dashboard error:', err);
      } finally {
          loading = false;
      }
  }
  
  async function loadConditionSummary() {
      try {
          const response = await projectToolsService.getConditionSummary();
          conditionSummary = response.data || {
              total: 0,
              normal: 0,
              bermasalah: 0,
              rusak: 0
          };
      } catch (error) {
          console.error('Error loading condition summary:', error);
          // Keep default values
      }
  }
  
  async function loadRecentUpdates() {
      try {
          const response = await projectToolsService.getAll({
              sort: '-date_updated',
              limit: 10,
              filter: {
                  condition: {
                      _in: ['bermasalah', 'rusak']
                  }
              }
          });
          
          recentUpdates = response.data || [];
      } catch (error) {
          console.error('Error loading recent updates:', error);
          recentUpdates = [];
      }
  }
  
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
  
  function getConditionPercentage(count, total) {
      return total > 0 ? Math.round((count / total) * 100) : 0;
  }
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="md:flex md:items-center md:justify-between">
      <div>
          <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p class="mt-1 text-sm text-gray-600">
              Ringkasan kondisi alat PT Eltama Prima Indo
          </p>
      </div>
      
      <div class="mt-4 md:mt-0">
          <button
              on:click={loadDashboardData}
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

  {#if error}
      <div class="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md">
          <div class="flex">
              <div class="flex-shrink-0">
                  <span class="text-yellow-400">⚠️</span>
              </div>
              <div class="ml-3">
                  <p class="text-sm">Beberapa data mungkin tidak tersedia karena keterbatasan akses.</p>
                  <button
                      on:click={loadDashboardData}
                      class="mt-2 text-sm text-yellow-700 underline focus:outline-none"
                  >
                      Coba lagi
                  </button>
              </div>
          </div>
      </div>
  {/if}

  <!-- Tools Condition Overview -->
  <div class="bg-white rounded-lg shadow">
      <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-lg font-medium text-gray-900">Kondisi Alat</h2>
      </div>
      
      <div class="p-6">
          <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <!-- Total -->
              <div class="bg-gray-50 rounded-lg p-4">
                  <div class="flex items-center">
                      <div class="flex-shrink-0">
                          <span class="text-2xl">📊</span>
                      </div>
                      <div class="ml-4 w-0 flex-1">
                          <dt class="text-sm font-medium text-gray-500 truncate">
                              Total Items
                          </dt>
                          <dd class="mt-1 text-2xl font-semibold text-gray-900">
                              {conditionSummary.total}
                          </dd>
                      </div>
                  </div>
              </div>

              <!-- Normal -->
              <div class="bg-green-50 rounded-lg p-4">
                  <div class="flex items-center">
                      <div class="flex-shrink-0">
                          <span class="text-2xl">✅</span>
                      </div>
                      <div class="ml-4 w-0 flex-1">
                          <dt class="text-sm font-medium text-green-600 truncate">
                              Normal
                          </dt>
                          <dd class="mt-1 text-2xl font-semibold text-green-900">
                              {conditionSummary.normal}
                          </dd>
                          <dd class="text-sm text-green-600">
                              {getConditionPercentage(conditionSummary.normal, conditionSummary.total)}%
                          </dd>
                      </div>
                  </div>
              </div>

              <!-- Bermasalah -->
              <div class="bg-yellow-50 rounded-lg p-4">
                  <div class="flex items-center">
                      <div class="flex-shrink-0">
                          <span class="text-2xl">⚠️</span>
                      </div>
                      <div class="ml-4 w-0 flex-1">
                          <dt class="text-sm font-medium text-yellow-600 truncate">
                              Bermasalah
                          </dt>
                          <dd class="mt-1 text-2xl font-semibold text-yellow-900">
                              {conditionSummary.bermasalah}
                          </dd>
                          <dd class="text-sm text-yellow-600">
                              {getConditionPercentage(conditionSummary.bermasalah, conditionSummary.total)}%
                          </dd>
                      </div>
                  </div>
              </div>

              <!-- Rusak -->
              <div class="bg-red-50 rounded-lg p-4">
                  <div class="flex items-center">
                      <div class="flex-shrink-0">
                          <span class="text-2xl">❌</span>
                      </div>
                      <div class="ml-4 w-0 flex-1">
                          <dt class="text-sm font-medium text-red-600 truncate">
                              Rusak
                          </dt>
                          <dd class="mt-1 text-2xl font-semibold text-red-900">
                              {conditionSummary.rusak}
                          </dd>
                          <dd class="text-sm text-red-600">
                              {getConditionPercentage(conditionSummary.rusak, conditionSummary.total)}%
                          </dd>
                      </div>
                  </div>
              </div>
          </div>
      </div>
  </div>

  <!-- Two column layout for recent updates and problematic tools -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Recent Updates -->
      <div class="bg-white rounded-lg shadow">
          <div class="px-6 py-4 border-b border-gray-200">
              <h2 class="text-lg font-medium text-gray-900">Update Kondisi Terbaru</h2>
          </div>
          
          <div class="p-6">
              {#if loading}
                  <div class="flex justify-center items-center py-8">
                      <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      <span class="ml-2 text-gray-600">Memuat...</span>
                  </div>
              {:else if recentUpdates.length === 0}
                  <div class="text-center py-4">
                      <p class="text-gray-500 text-sm">Tidak ada update terbaru</p>
                  </div>
              {:else}
                  <div class="flow-root">
                      <ul class="-mb-8">
                          {#each recentUpdates.slice(0, 5) as update, i}
                              <li>
                                  <div class="relative pb-8">
                                      {#if i !== recentUpdates.slice(0, 5).length - 1}
                                          <span class="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                                      {/if}
                                      
                                      <div class="relative flex space-x-3">
                                          <div class="flex h-8 w-8 items-center justify-center rounded-full {update.condition === 'rusak' ? 'bg-red-100' : 'bg-yellow-100'}">
                                              <span class="text-sm">
                                                  {update.condition === 'rusak' ? '❌' : '⚠️'}
                                              </span>
                                          </div>
                                          
                                          <div class="min-w-0 flex-1">
                                              <div class="text-sm">
                                                  <span class="font-medium text-gray-900">
                                                      {update.tool_id?.name || 'Unknown Tool'}
                                                  </span>
                                                  <span class="text-gray-500">
                                                      di {update.project_id?.name || 'Unknown Project'}
                                                  </span>
                                              </div>
                                              
                                              <div class="mt-1 flex items-center space-x-2">
                                                  <ConditionBadge condition={update.condition} size="small" />
                                                  <span class="text-xs text-gray-500">
                                                      {formatDate(update.date_updated)}
                                                  </span>
                                              </div>
                                              
                                              {#if update.notes}
                                                  <p class="mt-1 text-xs text-gray-600 truncate">
                                                      {update.notes}
                                                  </p>
                                              {/if}
                                          </div>
                                      </div>
                                  </div>
                              </li>
                          {/each}
                      </ul>
                  </div>
                  
                  <div class="mt-4 text-center">
                      <a href="/tools" class="text-sm text-blue-600 hover:text-blue-800">
                          Lihat semua →
                      </a>
                  </div>
              {/if}
          </div>
      </div>

      <!-- Problematic Tools Summary -->
      <ProblematicTools 
          maxItems={5} 
          showFilters={false}
          title="Tools Bermasalah (Top 5)"
      />
  </div>

  <!-- Quick Actions -->
  <div class="bg-white rounded-lg shadow">
      <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-lg font-medium text-gray-900">Aksi Cepat</h2>
      </div>
      
      <div class="p-6">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <a
                  href="/tools"
                  class="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                  <div class="flex items-center">
                      <span class="text-2xl mr-3">🔧</span>
                      <div>
                          <h3 class="text-sm font-medium text-gray-900">Kelola Tools</h3>
                          <p class="text-xs text-gray-500">Lihat & update kondisi</p>
                      </div>
                  </div>
              </a>
              
              <a
                  href="/maintenance/create"
                  class="block p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
              >
                  <div class="flex items-center">
                      <span class="text-2xl mr-3">➕</span>
                      <div>
                          <h3 class="text-sm font-medium text-gray-900">Tambah Maintenance</h3>
                          <p class="text-xs text-gray-500">Buat jadwal baru</p>
                      </div>
                  </div>
              </a>
              
              <a
                  href="/maintenance"
                  class="block p-4 border border-gray-200 rounded-lg hover:border-yellow-300 hover:bg-yellow-50 transition-colors"
              >
                  <div class="flex items-center">
                      <span class="text-2xl mr-3">🛠️</span>
                      <div>
                          <h3 class="text-sm font-medium text-gray-900">Daftar Maintenance</h3>
                          <p class="text-xs text-gray-500">Monitor progress</p>
                      </div>
                  </div>
              </a>

              <!-- Pemeliharaan -->
               <a
                    href="/maintenance/pemeliharaan/index"
                    class="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors">

                    <div class="flex items-center">
                        <span class="text-2xl mr-3">🔍</span>
                        <div>
                            <h3 class="text-sm font-medium text-gray-900">Pemeliharaan</h3>
                            <p class="text-xs text-gray-500">Lihat daftar pemeliharaan</p>
                        </div>
                    </div>
                </a>

                              <a
                  href="/maintenance/pemeliharaan"
                  class="block p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
              >
                  <div class="flex items-center">
                      <span class="text-2xl mr-3">➕</span>
                      <div>
                          <h3 class="text-sm font-medium text-gray-900">Tambah Pemeliharaan</h3>
                          <p class="text-xs text-gray-500">Buat jadwal baru</p>
                      </div>
                  </div>
              </a>
              
              <a
                  href="/tools/grid"
                  class="block p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors"
              >
                  <div class="flex items-center">
                      <span class="text-2xl mr-3">📊</span>
                      <div>
                          <h3 class="text-sm font-medium text-gray-900">View Grid</h3>
                          <p class="text-xs text-gray-500">Tampilan grid tools</p>
                      </div>
                  </div>
              </a>
          </div>
      </div>
  </div>
</div>