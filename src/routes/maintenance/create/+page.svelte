<!-- src/routes/maintenance/create/+page.svelte -->
<script>
  import { page } from '$app/stores';
  import MaintenanceForm from '$lib/components/maintenance/MaintenanceForm.svelte';
  
  // Check if this is coming from tools page with pre-filled data
  $: hasPreFilledData = $page.url.searchParams.has('tool_id') || $page.url.searchParams.has('project_id');
  $: toolName = $page.url.searchParams.get('tool_name') || '';
  $: projectName = $page.url.searchParams.get('project_name') || '';
</script>

<div class="max-w-4xl mx-auto">
  <div class="mb-6">
      <div class="flex items-center">
          <h1 class="text-2xl font-bold text-gray-900">
              Tambah Maintenance Baru
          </h1>
          {#if hasPreFilledData}
              <span class="ml-3 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                  Pre-filled dari Tools
              </span>
          {/if}
      </div>
      <p class="mt-1 text-sm text-gray-600">
          {#if hasPreFilledData}
              Form telah diisi otomatis berdasarkan data alat yang dipilih
              {#if toolName}
                  - <span class="font-medium">{toolName}</span>
              {/if}
              {#if projectName}
                  di <span class="font-medium">{projectName}</span>
              {/if}
          {:else}
              Tambahkan data maintenance untuk alat yang memerlukan perbaikan
          {/if}
      </p>
  </div>

  <MaintenanceForm isEdit={false} />
</div>