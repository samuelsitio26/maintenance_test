<script>
  import { onMount } from 'svelte';
  import { pemeliharaanService } from '$lib/services/pemeliharaan.js';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  let id = '';
  let item = null;
  let loading = true;
  let error = '';
  let completion_date = '';
  let assign_to = '';
  let saving = false;

  $: id = $page.url.searchParams.get('id');

  onMount(async () => {
    if (!id) return;
    try {
      const res = await pemeliharaanService.getById(id);
      item = res.data || res;
      completion_date = item.completion_date ? item.completion_date.slice(0, 10) : '';
      assign_to = item.assign_to || '';
    } catch (e) {
      error = e.message || 'Gagal mengambil data';
    } finally {
      loading = false;
    }
  });

  async function handleSubmit() {
    saving = true;
    try {
      await pemeliharaanService.update(id, {
        completion_date,
        assign_to
      });
      goto('/maintenance/pemeliharaan/index');
    } catch (e) {
      error = e.message || 'Gagal menyimpan perubahan';
    } finally {
      saving = false;
    }
  }
</script>

<div class="max-w-lg mx-auto mt-8 bg-white p-6 rounded shadow">
  <h1 class="text-xl font-bold mb-4">Edit Jadwal Pemeliharaan</h1>
  {#if loading}
    <div>Loading...</div>
  {:else if error}
    <div class="bg-red-100 text-red-700 p-2 rounded mb-2">{error}</div>
  {:else if item}
    <form on:submit|preventDefault={handleSubmit} class="space-y-4">
      <div>
        <label class="block text-sm font-medium mb-1">Tanggal Berikutnya</label>
        <input type="date" bind:value={completion_date} class="w-full border rounded px-3 py-2" required />
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">Ditugaskan Kepada</label>
        <input type="text" bind:value={assign_to} class="w-full border rounded px-3 py-2" required />
      </div>
      <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" disabled={saving}>
        {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
      </button>
    </form>
  {/if}
</div>
