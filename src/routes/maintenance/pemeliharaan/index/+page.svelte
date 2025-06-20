<script>
  import { onMount } from 'svelte';
  import { pemeliharaanService } from '$lib/services/pemeliharaan.js';

  let data = [];
  let loading = true;
  let error = '';
  let reminders = [];

  onMount(async () => {
    try {
      const res = await pemeliharaanService.getAll();
      data = res.data || res;
    } catch (e) {
      error = e.message || 'Gagal mengambil data';
    } finally {
      loading = false;
    }
  });

  $: if (!loading && data.length > 0) {
    const today = new Date();
    reminders = data.filter(item => item.completion_date && new Date(item.completion_date) >= today);
  }

  function formatDate(date) {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  function handleDelete(id) {
    if (confirm('Yakin ingin menghapus jadwal pemeliharaan ini?')) {
      pemeliharaanService.delete(id).then(() => {
        data = data.filter(item => item.id !== id);
      }).catch(e => {
        alert('Gagal menghapus data: ' + (e.message || e));
      });
    }
  }
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="sm:flex sm:items-center sm:justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Jadwal Pemeliharaan Alat</h1>
      <p class="mt-1 text-sm text-gray-600">
        Kelola dan monitor jadwal pemeliharaan alat-alat proyek
      </p>
    </div>
    <div class="mt-4 sm:mt-0 flex space-x-3">
      <a
        href="/maintenance/pemeliharaan"
        class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
      >
        ➕ Tambah Jadwal
      </a>
    </div>
  </div>

  <!-- Error message -->
  {#if error}
    <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
      <p class="text-sm">{error}</p>
    </div>
  {/if}

  <!-- Notifikasi Pengingat -->
  {#if reminders.length > 0}
    <div class="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md mb-4">
      <strong>Pengingat:</strong> Segera lakukan pemeliharaan untuk alat berikut:
      <ul class="list-disc ml-6 mt-1">
        {#each reminders as reminder}
          <li>
            <b>{reminder.tools}</b> dijadwalkan pada <b>{formatDate(reminder.completion_date)}</b>
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  <!-- Table -->
  {#if loading}
    <div class="flex justify-center items-center h-64">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  {:else if data.length === 0}
    <div class="flex flex-col items-center py-12">
      <div class="text-4xl mb-2">📋</div>
      <p class="font-medium">Tidak ada data pemeliharaan</p>
      <p class="text-xs mt-1">Belum ada jadwal pemeliharaan yang dibuat</p>
    </div>
  {:else}
    <div class="overflow-hidden shadow-sm rounded-lg border border-gray-200">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Alat</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interval (hari)</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal Terakhir</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal Berikutnya</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ditugaskan Kepada</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {#each data as item, i}
            <tr class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{i + 1}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.tools}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.interval}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(item.maintenance_date)}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(item.completion_date)}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.assign_to || '-'}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 flex gap-2">
                <a href={`/maintenance/pemeliharaan/edit?id=${item.id}`} class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">Edit</a>
                <button class="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600" on:click={() => handleDelete(item.id)}>Hapus</button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
