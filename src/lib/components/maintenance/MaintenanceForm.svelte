<!-- src/lib/components/maintenance/MaintenanceForm.svelte -->
<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { maintenanceStore } from '$lib/stores/maintenance.js';
  import { toolsService } from '$lib/services/tools.js';
  import { projectsService } from '$lib/services/projects.js';
  import ProgressChecklist from './ProgressChecklist.svelte';
  
  export let maintenance = null;
  export let isEdit = false;
  
  let tools = [];
  let projects = [];
  let loading = false;
  let error = null;
  let formReady = false;
  let progressItems = [];
  
  // Form data with pre-fill support
  let formData = {
    tool_id: maintenance?.tool_id?.id || null,
    project_id: maintenance?.project_id?.id || null,
    status: maintenance?.status || 'pending',
    progress: maintenance?.progress || '0%',
    progress_items: maintenance?.progress_items || [],
    damage_date: maintenance?.damage_date || new Date().toISOString().split('T')[0],
    completion_date: maintenance?.completion_date || null,
    notes: maintenance?.notes || '',
    assigned_to: maintenance?.assigned_to || ''
  };
  
  // Initialize progress items
  if (formData.progress_items && formData.progress_items.length > 0) {
      progressItems = formData.progress_items;
  }
  
  // Pre-filled data info for display
  let preFilledInfo = {
    tool_name: '',
    project_name: '',
    condition: '',
    isAutoFilled: false
  };
  
  onMount(async () => {
    try {
      // Load tools and projects
      const [toolsResponse, projectsResponse] = await Promise.all([
        toolsService.getAll({ filter: { is_active: { _eq: true } } }),
        projectsService.getActive()
      ]);
      
      tools = toolsResponse.data || [];
      projects = projectsResponse.data || [];
      
      // Check for pre-fill data from URL params
      await handlePreFillData();
      
      formReady = true;
      
    } catch (err) {
      error = 'Gagal memuat data';
      console.error(err);
    }
  });
  
  // Handle pre-fill data from URL parameters
  async function handlePreFillData() {
    const params = $page.url.searchParams;
    
    // Get pre-fill data from URL
    const toolId = params.get('tool_id');
    const projectId = params.get('project_id');
    const condition = params.get('condition');
    const notes = params.get('notes');
    const toolName = params.get('tool_name');
    const projectName = params.get('project_name');
    
    if (toolId || projectId) {
      // Set form data
      if (toolId) {
        formData.tool_id = parseInt(toolId);
        // Find and auto-select the tool
        const selectedTool = tools.find(t => t.id === parseInt(toolId));
        if (selectedTool) {
          console.log('Auto-selected tool:', selectedTool.name);
        }
      }
      
      if (projectId) {
        formData.project_id = parseInt(projectId);
        // Find and auto-select the project
        const selectedProject = projects.find(p => p.id === parseInt(projectId));
        if (selectedProject) {
          console.log('Auto-selected project:', selectedProject.name);
        }
      }
      
      // Set notes with condition info
      if (condition) {
        const conditionNote = `Kondisi alat: ${condition.toUpperCase()}`;
        const existingNotes = notes ? `. Catatan: ${notes}` : '';
        formData.notes = conditionNote + existingNotes;
      }
      
      // Set display info
      preFilledInfo = {
        tool_name: toolName || '',
        project_name: projectName || '',
        condition: condition || '',
        isAutoFilled: true
      };
      
      // Auto-set status and priority based on condition
      if (condition === 'rusak') {
        formData.status = 'pending';
        formData.progress = '0%';
        // Set urgent damage date (today)
        formData.damage_date = new Date().toISOString().split('T')[0];
      } else if (condition === 'bermasalah') {
        formData.status = 'to_do';
        formData.progress = '0%';
        // Set damage date (today)  
        formData.damage_date = new Date().toISOString().split('T')[0];
      }
      
      console.log('Pre-filled form data:', formData);
    }
  }
  
  // Handle progress change from checklist
  function handleProgressChange(event) {
      const { items, percentage } = event.detail;
      progressItems = items;
      formData.progress_items = items;
      formData.progress = `${percentage}%`;
      
      // Auto-update status based on progress
      if (percentage === 100) {
          formData.status = 'completed';
          if (!formData.completion_date) {
              formData.completion_date = new Date().toISOString().split('T')[0];
          }
      } else if (percentage > 0 && formData.status === 'pending') {
          formData.status = 'in_progress';
      }
  }
  
  // Handle submit
  async function handleSubmit() {
    loading = true;
    error = null;
    
    try {
      // Prepare data for submission
      const submitData = {
        ...formData,
        progress_items: JSON.stringify(progressItems) // Store as JSON string
      };
      
      if (isEdit && maintenance?.id) {
        await maintenanceStore.updateMaintenance(maintenance.id, submitData);
      } else {
        await maintenanceStore.createMaintenance(submitData);
      }
      
      goto('/maintenance');
    } catch (err) {
      error = err.message || 'Terjadi kesalahan';
    } finally {
      loading = false;
    }
  }
  
  // Handle cancel
  function handleCancel() {
    goto('/maintenance');
  }
  
  // Clear pre-fill data
  function clearPreFill() {
    formData.tool_id = null;
    formData.project_id = null;
    formData.notes = '';
    formData.status = 'pending';
    formData.progress = '0%';
    progressItems = [];
    formData.progress_items = [];
    preFilledInfo = { tool_name: '', project_name: '', condition: '', isAutoFilled: false };
  }
  
  // Get condition badge class
  function getConditionClass(condition) {
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
        return '❌';
      case 'bermasalah':
        return '⚠️';
      default:
        return '⚪';
    }
  }
  
  // Get selected tool name for display
  $: selectedTool = tools.find(t => t.id === formData.tool_id);
  $: actualToolName = selectedTool?.name || preFilledInfo.tool_name;
  
  // Get selected project name for display  
  $: selectedProject = projects.find(p => p.id === formData.project_id);
  $: actualProjectName = selectedProject?.name || preFilledInfo.project_name;
  
  // Parse progress percentage for display
  $: progressPercentage = parseInt(formData.progress?.replace('%', '') || '0');
</script>

<form on:submit|preventDefault={handleSubmit} class="space-y-6">
  <!-- Pre-filled Data Info -->
  {#if preFilledInfo.isAutoFilled}
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div class="flex items-start">
        <div class="flex-shrink-0">
          <span class="text-blue-400 text-lg">🤖</span>
        </div>
        <div class="ml-3 flex-1">
          <h3 class="text-sm font-medium text-blue-800">
            Data Otomatis dari Tool Bermasalah
          </h3>
          <div class="mt-2 text-sm text-blue-700">
            <div class="bg-white border border-blue-200 rounded p-3 space-y-2">
              {#if actualToolName}
                <div class="flex items-center">
                  <span class="font-medium text-blue-900">🔧 Alat:</span>
                  <span class="ml-2 px-2 py-1 bg-blue-100 text-blue-900 rounded text-xs font-medium">
                    {actualToolName}
                  </span>
                </div>
              {/if}
              {#if actualProjectName}
                <div class="flex items-center">
                  <span class="font-medium text-blue-900">📍 Project:</span>
                  <span class="ml-2 px-2 py-1 bg-green-100 text-green-900 rounded text-xs font-medium">
                    {actualProjectName}
                  </span>
                </div>
              {/if}
              {#if preFilledInfo.condition}
                <div class="flex items-center">
                  <span class="font-medium text-blue-900">⚠️ Kondisi:</span>
                  <span class="ml-2 px-2 py-1 text-xs font-medium border rounded {getConditionClass(preFilledInfo.condition)}">
                    {getConditionIcon(preFilledInfo.condition)} {preFilledInfo.condition.toUpperCase()}
                  </span>
                </div>
              {/if}
            </div>
          </div>
          <div class="mt-3 flex items-center space-x-3">
            <div class="flex items-center text-xs text-blue-600">
              <span class="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
              Project dan Tool otomatis terpilih
            </div>
            <button
              type="button"
              on:click={clearPreFill}
              class="text-sm text-blue-700 hover:text-blue-900 underline focus:outline-none"
            >
              Reset form
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
  
  <!-- Main Form -->
  <div class="bg-white p-6 rounded-lg shadow">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-lg font-medium text-gray-900">
        {isEdit ? 'Edit' : 'Tambah'} Maintenance
      </h2>
      <div class="flex items-center space-x-2">
        {#if preFilledInfo.isAutoFilled}
          <span class="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
            ✨ Auto-filled
          </span>
        {/if}
        {#if progressPercentage > 0}
          <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
            📊 {progressPercentage}% Progress
          </span>
        {/if}
      </div>
    </div>
  
    {#if error}
      <div class="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
        <p class="text-sm">{error}</p>
      </div>
    {/if}
  
    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <!-- Tool Selection -->
      <div>
        <label for="tool" class="block text-sm font-medium text-gray-700">
          Alat <span class="text-red-500">*</span>
          {#if preFilledInfo.isAutoFilled && formData.tool_id}
            <span class="ml-2 text-xs text-green-600">✓ Otomatis terpilih</span>
          {/if}
        </label>
        <select
          id="tool"
          bind:value={formData.tool_id}
          required
          disabled={preFilledInfo.isAutoFilled && formData.tool_id}
          class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md disabled:bg-gray-50 disabled:text-gray-500"
        >
          <option value={null}>Pilih Alat</option>
          {#each tools as tool}
            <option value={tool.id}>
              {tool.name} {tool.description ? `- ${tool.description}` : ''}
            </option>
          {/each}
        </select>
        {#if preFilledInfo.isAutoFilled && formData.tool_id}
          <p class="mt-1 text-xs text-gray-500">
            Alat dipilih otomatis dari tool bermasalah. 
            <button type="button" on:click={clearPreFill} class="text-blue-600 underline">
              Ubah manual
            </button>
          </p>
        {/if}
      </div>
  
      <!-- Project Selection -->
      <div>
        <label for="project" class="block text-sm font-medium text-gray-700">
          Project <span class="text-red-500">*</span>
          {#if preFilledInfo.isAutoFilled && formData.project_id}
            <span class="ml-2 text-xs text-green-600">✓ Otomatis terpilih</span>
          {/if}
        </label>
        <select
          id="project"
          bind:value={formData.project_id}
          required
          disabled={preFilledInfo.isAutoFilled && formData.project_id}
          class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md disabled:bg-gray-50 disabled:text-gray-500"
        >
          <option value={null}>Pilih Project</option>
          {#each projects as project}
            <option value={project.id}>
              {project.name} {project.lokasi ? `- ${project.lokasi}` : ''}
            </option>
          {/each}
        </select>
        {#if preFilledInfo.isAutoFilled && formData.project_id}
          <p class="mt-1 text-xs text-gray-500">
            Project dipilih otomatis dari data tool bermasalah.
            <button type="button" on:click={clearPreFill} class="text-blue-600 underline">
              Ubah manual
            </button>
          </p>
        {/if}
      </div>
  
      <!-- Status -->
      <div>
        <label for="status" class="block text-sm font-medium text-gray-700">
          Status <span class="text-red-500">*</span>
          {#if preFilledInfo.condition}
            <span class="ml-2 text-xs text-orange-600">
              ⚡ Auto-set berdasarkan kondisi
            </span>
          {/if}
        </label>
        <select
          id="status"
          bind:value={formData.status}
          required
          class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
        >
          <option value="pending">Pending</option>
          <option value="to_do">To Do</option>
          <option value="in_progress">On Process</option>
          <option value="under_maintenance">Under Maintenance</option>
          <option value="completed">Completed</option>
        </select>
        {#if preFilledInfo.condition === 'rusak'}
          <p class="mt-1 text-xs text-red-600">Status "Pending" karena alat dalam kondisi rusak</p>
        {:else if preFilledInfo.condition === 'bermasalah'}
          <p class="mt-1 text-xs text-yellow-600">Status "To Do" karena alat bermasalah</p>
        {:else if progressPercentage === 100}
          <p class="mt-1 text-xs text-green-600">Status otomatis "Completed" karena progress 100%</p>
        {:else if progressPercentage > 0 && formData.status === 'pending'}
          <p class="mt-1 text-xs text-blue-600">Status berubah "On Process" karena ada progress</p>
        {/if}
      </div>
  
      <!-- Damage Date -->
      <div>
        <label for="damage_date" class="block text-sm font-medium text-gray-700">
          Tanggal Kerusakan <span class="text-red-500">*</span>
          {#if preFilledInfo.isAutoFilled}
            <span class="ml-2 text-xs text-blue-600">📅 Auto-set hari ini</span>
          {/if}
        </label>
        <input
          type="date"
          id="damage_date"
          bind:value={formData.damage_date}
          required
          class="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
        />
      </div>
  
      <!-- Completion Date -->
      <div>
        <label for="completion_date" class="block text-sm font-medium text-gray-700">
          Tanggal Selesai
          {#if progressPercentage === 100}
            <span class="ml-2 text-xs text-green-600">✓ Auto-set karena progress 100%</span>
          {/if}
        </label>
        <input
          type="date"
          id="completion_date"
          bind:value={formData.completion_date}
          class="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
        />
      </div>
  
      <!-- Assigned To -->
      <div>
        <label for="assigned_to" class="block text-sm font-medium text-gray-700">
          Ditugaskan Kepada
        </label>
        <input
          type="text"
          id="assigned_to"
          bind:value={formData.assigned_to}
          placeholder="Nama mekanik/teknisi"
          class="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
        />
      </div>
    </div>
    
    <!-- Progress Checklist - Full Width -->
    <div class="mt-6">
      <label class="block text-sm font-medium text-gray-700 mb-3">
        Progress Maintenance
        <span class="ml-2 text-xs text-blue-600">
          📊 Otomatis dihitung dari checklist
        </span>
      </label>
      <ProgressChecklist 
        bind:progressItems={progressItems}
        on:progress-change={handleProgressChange}
        readonly={false}
      />
    </div>
  
    <!-- Notes -->
    <div class="mt-6">
      <label for="notes" class="block text-sm font-medium text-gray-700">
        Keterangan Umum
        {#if preFilledInfo.condition}
          <span class="ml-2 text-xs text-green-600">✓ Termasuk info kondisi</span>
        {/if}
      </label>
      <textarea
        id="notes"
        bind:value={formData.notes}
        rows="4"
        placeholder="Catatan umum, masalah khusus, atau informasi tambahan..."
        class="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
      ></textarea>
      <p class="mt-1 text-xs text-gray-500">
        Catatan detail untuk setiap pekerjaan bisa diisi di checklist progress di atas
      </p>
    </div>
  
    <!-- Action Buttons -->
    <div class="mt-6 flex justify-end space-x-3">
      <button
        type="button"
        on:click={handleCancel}
        class="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
      >
        Batal
      </button>
      <button
        type="submit"
        disabled={loading}
        class="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
      >
        {#if loading}
          <div class="inline-flex items-center">
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Menyimpan...
          </div>
        {:else}
          {isEdit ? 'Update' : 'Simpan'} Maintenance
        {/if}
      </button>
    </div>
  </div>
</form>