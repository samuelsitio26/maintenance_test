<!-- src/routes/maintenance/+page.svelte -->
<script>
    import { onMount } from 'svelte';
    import { maintenanceStore, maintenanceStats } from '$lib/stores/maintenance.js';
    import MaintenanceTable from '$lib/components/maintenance/MaintenanceTable.svelte';
    import MaintenanceFilter from '$lib/components/maintenance/MaintenanceFilter.svelte';
    import MaintenanceStats from '$lib/components/maintenance/MaintenanceStats.svelte';
    
    let loading = false;
    let error = null;
    
    onMount(async () => {
      loading = true;
      try {
        await maintenanceStore.loadMaintenance();
      } catch (err) {
        error = err.message;
      } finally {
        loading = false;
      }
    });
    
    // Subscribe to store
    $: ({ items, loading: storeLoading } = $maintenanceStore);
    $: isLoading = loading || storeLoading;
    
    // Generate daily report
    function generateReport() {
      const today = new Date().toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      
      let report = `DAILY REPORT MAINTENANCE\n`;
      report += `Date: ${today}\n\n`;
      
      // Under maintenance items
      const underMaintenance = items.filter(m => m.status === 'under_maintenance' || m.status === 'in_progress');
      if (underMaintenance.length > 0) {
        report += `Under maintenance\n`;
        underMaintenance.forEach(item => {
          report += `- ${item.tool_id?.name} ${item.tool_id?.description}: ${item.notes || item.status}\n`;
        });
      }
      
      // Download report
      const blob = new Blob([report], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `maintenance-report-${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
    }
  </script>
  
  <div class="space-y-6">
    <!-- Header -->
    <div class="sm:flex sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Maintenance Alat</h1>
        <p class="mt-1 text-sm text-gray-600">
          Kelola dan monitor status maintenance alat-alat proyek
        </p>
      </div>
      <div class="mt-4 sm:mt-0 flex space-x-3">
        <button
          on:click={generateReport}
          class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          📄 Generate Report
        </button>
        <a
          href="/maintenance/create"
          class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          ➕ Tambah Maintenance
        </a>
      </div>
    </div>
  
    <!-- Stats -->
    <MaintenanceStats stats={$maintenanceStats} />
  
    <!-- Filters -->
    <MaintenanceFilter />
  
    <!-- Error message -->
    {#if error}
      <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
        <p class="text-sm">{error}</p>
      </div>
    {/if}
  
    <!-- Table -->
    {#if isLoading}
      <div class="flex justify-center items-center h-64">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    {:else}
      <MaintenanceTable maintenance={items} />
    {/if}
  </div>