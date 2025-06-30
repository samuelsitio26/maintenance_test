<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { maintenanceStore } from '$lib/stores/maintenance.js';
  import { goto } from '$app/navigation';
  import ProgressChecklist from '$lib/components/maintenance/ProgressChecklist.svelte';

  let maintenance = null;
  let loading = true;
  let error = null;
  let successMessage = '';
  let progress = '';
  let progressInput = '';
  let progressItems = [];
  let progressPercentage = 0;
  let isDone = false;
  
  // Additional form fields
  let assignedTo = '';
  let targetDate = '';
  let notes = '';

  $: maintenanceId = $page.params.id;
  $: isDone = maintenance && (maintenance.status === 'completed' || progress === '100%');

  onMount(async () => {
    try {
      maintenance = await maintenanceStore.loadMaintenanceById(maintenanceId);
      progress = maintenance.progress || '0%';
      progressInput = progress.replace('%', '');
      
      // Load additional form data
      assignedTo = maintenance.assigned_to || '';
      targetDate = maintenance.completion_date || '';
      notes = maintenance.notes || '';
      
      // Ambil checklist jika ada
      if (maintenance.progress_items) {
        try {
          progressItems = typeof maintenance.progress_items === 'string'
            ? JSON.parse(maintenance.progress_items)
            : maintenance.progress_items;
        } catch (e) {
          progressItems = [];
        }
      }
    } catch (err) {
      error = err.message || 'Gagal memuat data';
    } finally {
      loading = false;
    }
  });

  function handleChecklistChange(e) {
    progressItems = e.detail.items;
    progressPercentage = e.detail.percentage;
    progressInput = progressPercentage;
  }

  async function updateProgress() {
    try {
      loading = true;
      const newProgress = `${progressInput}%`;
      await maintenanceStore.updateMaintenance(maintenanceId, {
        progress: newProgress,
        progress_items: JSON.stringify(progressItems),
        assigned_to: assignedTo,
        completion_date: targetDate,
        notes: notes
      });
      successMessage = 'Progress & data maintenance berhasil diupdate!';
      progress = newProgress;
    } catch (err) {
      error = err.message || 'Gagal update progress';
    } finally {
      loading = false;
    }
  }

  async function markAsDone() {
    try {
      loading = true;
      await maintenanceStore.updateMaintenance(maintenanceId, {
        progress: '100%',
        status: 'completed',
        progress_items: JSON.stringify(progressItems),
        assigned_to: assignedTo,
        completion_date: targetDate || new Date().toISOString().split('T')[0], // Set today if no target date
        notes: notes
      });
      successMessage = 'Maintenance telah selesai!';
      progress = '100%';
      if (maintenance) maintenance.status = 'completed';
    } catch (err) {
      error = err.message || 'Gagal menandai selesai';
    } finally {
      loading = false;
    }
  }
</script>

<div class="max-w-2xl mx-auto">
  <div class="mb-6">
    <h1 class="text-2xl font-bold text-gray-900">Update Data & Progress Maintenance</h1>
    <p class="mt-1 text-sm text-gray-600">
      Perbarui informasi maintenance, assignment, target selesai, dan progress.
    </p>
  </div>

  <div class="bg-white rounded-lg shadow p-6">
    {#if loading}
      <div>Loading...</div>
    {:else}
      {#if error}
        <div class="bg-red-100 text-red-700 p-2 rounded mb-4">{error}</div>
      {/if}
      {#if successMessage}
        <div class="bg-green-100 text-green-700 p-2 rounded mb-4">{successMessage}</div>
      {/if}
      {#if isDone}
        <div class="flex items-center space-x-2">
          <span class="bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold">Done</span>
          <button type="button" on:click={() => goto('/maintenance')} class="px-4 py-2 border rounded">Kembali</button>
        </div>
      {:else}
        <form on:submit|preventDefault={updateProgress} class="space-y-6">
          <!-- Basic Information Section -->
          <div class="border-b border-gray-200 pb-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Informasi Dasar</h3>
            <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <!-- Assigned To -->
              <div>
                <label for="assigned_to" class="block text-sm font-medium text-gray-700">
                  Ditugaskan Kepada
                </label>
                <input
                  type="text"
                  id="assigned_to"
                  bind:value={assignedTo}
                  placeholder="Nama mekanik/teknisi"
                  class="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                />
                <p class="mt-1 text-xs text-gray-500">
                  Nama teknisi atau tim yang bertanggung jawab
                </p>
              </div>

              <!-- Target Completion Date -->
              <div>
                <label for="target_date" class="block text-sm font-medium text-gray-700">
                  Target Selesai
                </label>
                <input
                  type="date"
                  id="target_date"
                  bind:value={targetDate}
                  class="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                />
                <p class="mt-1 text-xs text-gray-500">
                  Target tanggal penyelesaian maintenance
                </p>
              </div>
            </div>

            <!-- Notes Section -->
            <div class="mt-6">
              <label for="notes" class="block text-sm font-medium text-gray-700">
                Catatan Umum
              </label>
              <textarea
                id="notes"
                bind:value={notes}
                rows="3"
                placeholder="Catatan umum, masalah khusus, atau informasi tambahan..."
                class="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              ></textarea>
              <p class="mt-1 text-xs text-gray-500">
                Catatan detail untuk setiap pekerjaan bisa diisi di checklist progress di bawah
              </p>
            </div>
          </div>

          <!-- Progress Checklist Section -->
          <div>
            <h3 class="text-lg font-medium text-gray-900 mb-4">Progress Maintenance</h3>
            <div class="block text-sm font-medium text-gray-700 mb-3">
              <span class="ml-2 text-xs text-blue-600">
                📊 Otomatis dihitung dari checklist
              </span>
            </div>
            <ProgressChecklist bind:progressItems on:progress-change={handleChecklistChange} />
          </div>
          <div class="flex space-x-2">
            <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50" disabled={loading}>
              Update Data & Progress
            </button>
            <button type="button" class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50" on:click={markAsDone} disabled={loading || progress === '100%'}>
              Tandai Selesai
            </button>
            <button type="button" on:click={() => goto('/maintenance')} class="px-4 py-2 border rounded">Kembali</button>
          </div>
        </form>
      {/if}
    {/if}
  </div>
</div>
