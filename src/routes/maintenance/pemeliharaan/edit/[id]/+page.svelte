<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { pemeliharaanService } from '$lib/services/pemeliharaan.js';
  import { page } from '$app/stores';

  let loading = true;
  let error = '';
  let successMessage = '';
  let id = '';
  let completion_date = '';
  let assign_to = '';

  $: id = $page.params.id;

  onMount(async () => {
    try {
      const res = await pemeliharaanService.getById(id);
      const data = res.data || res;
      completion_date = data.completion_date ? data.completion_date.split('T')[0] : '';
      assign_to = data.assign_to || '';
    } catch (e) {
      error = e.message || 'Gagal mengambil data';
    } finally {
      loading = false;
    }
  });

  async function handleUpdate() {
    loading = true;
    error = '';
    successMessage = '';
    try {
      await pemeliharaanService.update(id, {
        completion_date,
        assign_to
      });
      successMessage = 'Data berhasil diupdate!';
      setTimeout(() => goto('/maintenance/pemeliharaan/index'), 1000);
    } catch (e) {
      error = e.message || 'Gagal update data';
    } finally {
      loading = false;
    }
  }
</script>

<div class="max-w-lg mx-auto mt-10 p-6 bg-white rounded shadow">
  <h1 class="text-xl font-bold mb-4">Edit Pemeliharaan</h1>
  {#if loading}
    <div>Loading...</div>
  {:else}
    {#if error}
      <div class="bg-red-100 text-red-700 p-2 rounded mb-2">{error}</div>
    {/if}
    {#if successMessage}
      <div class="bg-green-100 text-green-700 p-2 rounded mb-2">{successMessage}</div>
    {/if}
    <form on:submit|preventDefault={handleUpdate} class="space-y-6">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Tanggal Berikutnya</label>
        <input type="date" bind:value={completion_date} class="border px-2 py-1 rounded w-full" required />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Ditugaskan Kepada</label>
        <input type="text" bind:value={assign_to} class="border px-2 py-1 rounded w-full" placeholder="Nama teknisi" required />
      </div>
      <div class="flex space-x-2">
        <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50" disabled={loading}>
          Simpan
        </button>
        <button type="button" on:click={() => goto('/maintenance/pemeliharaan/index')} class="px-4 py-2 border rounded">Kembali</button>
      </div>
    </form>
  {/if}
</div>
