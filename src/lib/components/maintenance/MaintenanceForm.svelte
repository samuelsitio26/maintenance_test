<!-- src/lib/components/maintenance/MaintenanceForm.svelte -->
<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { maintenanceStore } from '$lib/stores/maintenance.js';
  import { toolsService } from '$lib/services/tools.js';
  import { projectsService } from '$lib/services/projects.js';
  import ProgressChecklist from './ProgressChecklist.svelte';
  import Modal from '../common/Modal.svelte';
  
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
        toolsService.getAll({ filter: { is_active: { _eq: true } } }), // Load active tools for general selection
        projectsService.getActive() // Load active projects for general selection
      ]);
      
      tools = toolsResponse.data || [];
      projects = projectsResponse.data || [];
      
      // Check for pre-fill data from URL params and fetch specific items if not in active lists
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
    const toolIdStr = params.get('tool_id');
    const projectIdStr = params.get('project_id');
    const condition = params.get('condition');
    const notes = params.get('notes');
    
    let urlToolName = params.get('tool_name') || '';
    let urlProjectName = params.get('project_name') || '';
    let actualToolName = urlToolName;
    let actualProjectName = urlProjectName;

    let needsPreFillLogic = false;

    if (toolIdStr) {
      needsPreFillLogic = true;
      const toolId = parseInt(toolIdStr);
      formData.tool_id = toolId;

      let foundTool = tools.find(t => t.id === toolId);
      if (!foundTool) {
        try {
          console.log(`Tool ID ${toolId} not in active list, fetching directly...`);
          const toolResponse = await toolsService.getById(toolId);
          if (toolResponse && toolResponse.data) {
            foundTool = toolResponse.data;
            // Add to list if not already there (by ID) to ensure it's an option
            if (!tools.some(t => t.id === foundTool.id)) {
              tools = [...tools, foundTool].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            }
            console.log(`Ensured tool ${foundTool.name} is in dropdown list.`);
          } else {
            console.warn(`Pre-filled tool ID ${toolId} not found via getById.`);
          }
        } catch (err) {
          console.error(`Error fetching pre-filled tool ID ${toolId}:`, err);
        }
      }
      if (foundTool) {
        actualToolName = foundTool.name || urlToolName;
      } else {
        console.warn('Tool ID from URL could not be fully resolved to a tool object:', toolIdStr);
      }
    }

    if (projectIdStr) {
      needsPreFillLogic = true;
      const projectId = parseInt(projectIdStr);
      formData.project_id = projectId;

      let foundProject = projects.find(p => p.id === projectId);
      if (!foundProject) {
        try {
          console.log(`Project ID ${projectId} not in active list, fetching directly...`);
          const projectResponse = await projectsService.getById(projectId);
          if (projectResponse && projectResponse.data) {
            foundProject = projectResponse.data;
            // Add to list if not already there (by ID)
            if (!projects.some(p => p.id === foundProject.id)) {
              projects = [...projects, foundProject].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            }
            console.log(`Ensured project ${foundProject.name} is in dropdown list.`);
          } else {
            console.warn(`Pre-filled project ID ${projectId} not found via getById.`);
          }
        } catch (err) {
          console.error(`Error fetching pre-filled project ID ${projectId}:`, err);
        }
      }
      if (foundProject) {
        actualProjectName = foundProject.name || urlProjectName;
      } else {
        console.warn('Project ID from URL could not be fully resolved to a project object:', projectIdStr);
      }
    }

    if (needsPreFillLogic) {
      if (condition) {
        const conditionNote = `Kondisi alat: ${condition.toUpperCase()}`;
        const existingNotes = notes ? `. Catatan tambahan: ${notes}` : '';
        formData.notes = conditionNote + existingNotes;
      } else if (notes) {
        formData.notes = notes;
      }

      preFilledInfo = {
        tool_name: actualToolName,
        project_name: actualProjectName,
        condition: condition || '',
        isAutoFilled: true
      };

      if (condition === 'rusak') {
        formData.status = 'pending';
        formData.progress = '0%';
        formData.damage_date = new Date().toISOString().split('T')[0];
      } else if (condition === 'bermasalah') {
        formData.status = 'to_do';
        formData.progress = '0%';
        formData.damage_date = new Date().toISOString().split('T')[0];
      }
      // Force reactivity for formData if only sub-properties changed for complex objects
      formData = { ...formData }; 
      console.log('Pre-filled form data:', JSON.parse(JSON.stringify(formData)));
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
  
  // Image upload handling
  let damageImage = null;
  let damageImagePreview = '';
  let imageError = '';

  // New tool creation
  let showCreateToolModal = false;
  let createToolLoading = false;
  let createToolError = '';
  let newToolData = {
    name: '',
    description: '',
    serial_number: '',
    brand: '',
    type: '',
    purchase_date: '',
    is_active: true
  };

  function handleImageChange(e) {
    imageError = '';
    const file = e.target.files[0];
    if (!file) {
      damageImage = null;
      damageImagePreview = '';
      return;
    }
    if (!file.type.startsWith('image/')) {
      imageError = 'File harus berupa gambar (jpg/png)';
      damageImage = null;
      damageImagePreview = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      imageError = 'Ukuran gambar maksimal 2MB';
      damageImage = null;
      damageImagePreview = '';
      return;
    }
    damageImage = file;
    const reader = new FileReader();
    reader.onload = (event) => {
      damageImagePreview = event.target.result;
    };
    reader.readAsDataURL(file);
  }
  
  // Handle submit
  async function handleSubmit() {
    loading = true;
    error = null;
    imageError = '';
    try {
      const submitData = {
        ...formData,
        progress_items: JSON.stringify(progressItems)
      };
      if (damageImage) {
        // Upload image to Directus and save photo id
        await maintenanceStore.createMaintenanceWithPhoto(submitData, damageImage);
      } else {
        if (isEdit && maintenance?.id) {
          await maintenanceStore.updateMaintenance(maintenance.id, submitData);
        } else {
          await maintenanceStore.createMaintenance(submitData);
        }
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

  // Show create tool modal
  function showCreateTool() {
    newToolData = {
      name: '',
      description: '',
      serial_number: '',
      brand: '',
      type: '',
      purchase_date: '',
      is_active: true
    };
    createToolError = '';
    showCreateToolModal = true;
  }

  // Handle create new tool
  async function handleCreateTool() {
    if (!newToolData.name.trim()) {
      createToolError = 'Nama alat harus diisi';
      return;
    }

    createToolLoading = true;
    createToolError = '';

    try {
      const response = await toolsService.create(newToolData);
      const createdTool = response.data;

      // Add to tools list
      tools = [...tools, createdTool].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      // Select the newly created tool
      formData.tool_id = createdTool.id;

      // Close modal
      showCreateToolModal = false;

      // Show success message (optional)
      console.log('Tool created successfully:', createdTool.name);

    } catch (err) {
      createToolError = err.response?.data?.errors?.[0]?.message || err.message || 'Gagal membuat alat baru';
      console.error('Error creating tool:', err);
    } finally {
      createToolLoading = false;
    }
  }

  // Cancel create tool
  function cancelCreateTool() {
    showCreateToolModal = false;
    newToolData = {
      name: '',
      description: '',
      serial_number: '',
      brand: '',
      type: '',
      purchase_date: '',
      is_active: true
    };
    createToolError = '';
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
        <div class="mt-1 flex space-x-2">
          <select
            id="tool"
            bind:value={formData.tool_id}
            required
            disabled={preFilledInfo.isAutoFilled && formData.tool_id}
            class="flex-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md disabled:bg-gray-50 disabled:text-gray-500"
          >
            <option value={null}>Pilih Alat</option>
            {#each tools as tool}
              <option value={tool.id}>
                {tool.name} {tool.description ? `- ${tool.description}` : ''}
              </option>
            {/each}
          </select>
          <button
            type="button"
            on:click={showCreateTool}
            disabled={preFilledInfo.isAutoFilled && formData.tool_id}
            class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            title="Tambah Alat Baru"
            aria-label="Tambah Alat Baru"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
          </button>
        </div>
        {#if preFilledInfo.isAutoFilled && formData.tool_id}
          <p class="mt-1 text-xs text-gray-500">
            Alat dipilih otomatis dari tool bermasalah. 
            <button type="button" on:click={clearPreFill} class="text-blue-600 underline">
              Ubah manual
            </button>
          </p>
        {:else}
          <p class="mt-1 text-xs text-gray-500">
            Tidak menemukan alat yang dicari? 
            <button type="button" on:click={showCreateTool} class="text-blue-600 underline">
              Buat alat baru
            </button>
          </p>
        {/if}
      </div>
  
      <!-- Project Selection -->
      <div>
        <label for="project" class="block text-sm font-medium text-gray-700">
          Project
          {#if preFilledInfo.isAutoFilled && formData.project_id}
            <span class="ml-2 text-xs text-green-600">✓ Otomatis terpilih</span>
          {/if}
        </label>
        <select
          id="project"
          bind:value={formData.project_id}
          disabled={preFilledInfo.isAutoFilled && formData.project_id}
          class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md disabled:bg-gray-50 disabled:text-gray-500"
        >
          <option value={null}>Pilih Project (Opsional)</option>
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
        {:else}
          <!-- <p class="mt-1 text-xs text-gray-500">
            Project tidak wajib diisi. Kosongkan jika maintenance tidak terkait project tertentu.
          </p> -->
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
      <div class="block text-sm font-medium text-gray-700 mb-3">
        Progress Maintenance
        <span class="ml-2 text-xs text-blue-600">
          📊 Otomatis dihitung dari checklist
        </span>
      </div>
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

    <!-- Image Upload for Damage Photo -->
    <div class="mt-6">
      <label for="damage_image" class="block text-sm font-medium text-gray-700">
        Foto Kerusakan Alat
        <span class="ml-2 text-xs text-gray-400">(Opsional, max 2MB, jpg/png)</span>
      </label>
      <input
        type="file"
        id="damage_image"
        accept="image/*"
        on:change={(e) => handleImageChange(e)}
        class="mt-1 block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />
      {#if damageImagePreview}
        <div class="mt-2">
          <img src={damageImagePreview} alt="Preview Kerusakan" class="max-h-40 rounded border" />
        </div>
      {/if}
      {#if imageError}
        <p class="mt-1 text-xs text-red-600">{imageError}</p>
      {/if}
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

<!-- Modal for Creating New Tool -->
<Modal bind:open={showCreateToolModal} title="Tambah Alat Baru" size="medium">
  <form on:submit|preventDefault={handleCreateTool} class="space-y-4">
    {#if createToolError}
      <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
        <p class="text-sm">{createToolError}</p>
      </div>
    {/if}

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <!-- Tool Name -->
      <div class="sm:col-span-2">
        <label for="new_tool_name" class="block text-sm font-medium text-gray-700">
          Nama Alat <span class="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="new_tool_name"
          bind:value={newToolData.name}
          required
          placeholder="Contoh: Excavator PC200"
          class="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
        />
      </div>

      <!-- Description -->
      <div class="sm:col-span-2">
        <label for="new_tool_description" class="block text-sm font-medium text-gray-700">
          Deskripsi
        </label>
        <input
          type="text"
          id="new_tool_description"
          bind:value={newToolData.description}
          placeholder="Deskripsi singkat alat"
          class="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
        />
      </div>

      <!-- Serial Number -->
      <div>
        <label for="new_tool_serial" class="block text-sm font-medium text-gray-700">
          Nomor Seri
        </label>
        <input
          type="text"
          id="new_tool_serial"
          bind:value={newToolData.serial_number}
          placeholder="Serial number alat"
          class="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
        />
      </div>

      <!-- Brand -->
      <div>
        <label for="new_tool_brand" class="block text-sm font-medium text-gray-700">
          Merek
        </label>
        <input
          type="text"
          id="new_tool_brand"
          bind:value={newToolData.brand}
          placeholder="Merek alat"
          class="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
        />
      </div>

      <!-- Type -->
      <div>
        <label for="new_tool_type" class="block text-sm font-medium text-gray-700">
          Tipe
        </label>
        <input
          type="text"
          id="new_tool_type"
          bind:value={newToolData.type}
          placeholder="Tipe alat"
          class="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
        />
      </div>

      <!-- Purchase Date -->
      <div>
        <label for="new_tool_purchase_date" class="block text-sm font-medium text-gray-700">
          Tanggal Pembelian
        </label>
        <input
          type="date"
          id="new_tool_purchase_date"
          bind:value={newToolData.purchase_date}
          class="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
        />
      </div>
    </div>

    <!-- Status Active -->
    <div class="flex items-center">
      <input
        type="checkbox"
        id="new_tool_is_active"
        bind:checked={newToolData.is_active}
        class="focus:ring-primary h-4 w-4 text-primary border-gray-300 rounded"
      />
      <label for="new_tool_is_active" class="ml-2 block text-sm text-gray-900">
        Alat aktif (dapat digunakan)
      </label>
    </div>
  </form>

  <div slot="footer" class="flex space-x-3">
    <button
      type="button"
      on:click={cancelCreateTool}
      class="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
    >
      Batal
    </button>
    <button
      type="button"
      on:click={handleCreateTool}
      disabled={createToolLoading || !newToolData.name.trim()}
      class="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {#if createToolLoading}
        <div class="inline-flex items-center">
          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          Menyimpan...
        </div>
      {:else}
        Simpan Alat
      {/if}
    </button>
  </div>
</Modal>