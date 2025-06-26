<script>
  import { onMount } from 'svelte';
  import { pemeliharaanService } from '$lib/services/pemeliharaan.js';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  let id = '';
  let item = null;
  let loading = true;
  let error = '';
    let tools = '';
  let interval = '';
  let maintenance_date = '';
  let completion_date = '';
  let assign_to = '';
  let type = '';
  let status = '';
  let kondisi = '';
  let afterphoto = null;
  let saving = false;
  let afterphotoPreview = '';

  $: id = $page.url.searchParams.get('id');

  onMount(async () => {
    if (!id) return;
    try {
      const res = await pemeliharaanService.getById(id);
      item = res.data || res;
      tools = item.tools || '';
      interval = item.interval || '';
      maintenance_date = item.maintenance_date ? item.maintenance_date.slice(0, 10) : '';
      completion_date = item.completion_date ? item.completion_date.slice(0, 10) : '';
      assign_to = item.assign_to || '';
      type = item.type || '';
      status = item.status || '';
      kondisi = item.kondisi || '';
      if (item.afterphoto) {
        afterphotoPreview = `https://directus.eltamaprimaindo.com/assets/${item.afterphoto}?key=thumb`;
      }
    } catch (e) {
      error = e.message || 'Gagal mengambil data';
    } finally {
      loading = false;
    }
  });

  function handleAfterPhotoChange(e) {
    const file = e.target.files[0];
    afterphoto = file;
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        afterphotoPreview = event.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      afterphotoPreview = '';
    }
  }

  async function handleSubmit() {
    saving = true;
    try {
      let afterphotoId = item.afterphoto;
      if (afterphoto) {
        const formData = new FormData();
        formData.append('file', afterphoto);
        const uploadRes = await pemeliharaanService.uploadFile(formData);
        afterphotoId = uploadRes.data?.id || uploadRes.id;
      }
      await pemeliharaanService.update(id, {
        tools,
        interval: interval ? parseInt(interval) : null,
        maintenance_date: maintenance_date || null,
        completion_date: completion_date || null,
        assign_to: assign_to || null,
        type: type || null,
        status: status || null,
        kondisi: kondisi || null,
        afterphoto: afterphotoId || null
      });
      goto('/maintenance/pemeliharaan/index');
    } catch (e) {
      error = e.message || 'Gagal menyimpan perubahan';
    } finally {
      saving = false;
    }
  }
</script>

<div class="max-w-6xl mx-auto mt-8 bg-white p-8 rounded shadow">
  <h1 class="text-2xl font-bold mb-6 text-center">Edit Jadwal Pemeliharaan</h1>
  {#if loading}
    <div class="text-center py-8">Loading...</div>
  {:else if error}
    <div class="bg-red-100 text-red-700 p-3 rounded mb-4 text-center">{error}</div>
  {:else if item}
    <form on:submit|preventDefault={handleSubmit} class="space-y-6">
      <!-- Grid layout untuk form yang lebih lebar -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div>
          <label class="block text-sm font-medium mb-2">Nama Alat</label>
          <input type="text" bind:value={tools} class="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500" required />
        </div>
        <div>
          <label class="block text-sm font-medium mb-2">Interval (bulan)</label>
          <input type="number" bind:value={interval} class="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500" min="1" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-2">Jenis Pemeliharaan</label>
          <input type="text" bind:value={type} class="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-2">Tanggal Pemeliharaan Terakhir</label>
          <input type="date" bind:value={maintenance_date} class="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-2">Tanggal Berikutnya</label>
          <input type="date" bind:value={completion_date} class="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500" required />
        </div>
        <div>
          <label class="block text-sm font-medium mb-2">Ditugaskan Kepada</label>
          <input type="text" bind:value={assign_to} class="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500" required />
        </div>
        <div>
          <label class="block text-sm font-medium mb-2">Status</label>
          <select bind:value={status} class="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500">
            <option value="">- Pilih Status -</option>
            <option value="Terjadwal">Terjadwal</option>
            <option value="Selesai">Selesai</option>
            <option value="Dibatalkan">Dibatalkan</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium mb-2">Kondisi Alat</label>
          <select bind:value={kondisi} class="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500">
            <option value="">- Pilih Kondisi -</option>
            <option value="Layak">Layak</option>
            <option value="Tidak Layak">Tidak Layak</option>
          </select>
        </div>
      </div>
      
      <!-- Section untuk foto dengan layout yang lebih baik -->
      <div class="border-t pt-6">
        <h3 class="text-lg font-medium mb-4">Foto Sesudah Pemeliharaan</h3>
        <div class="flex flex-col md:flex-row gap-6 items-start">
          <div class="flex-1">
            <input type="file" accept="image/*" on:change={handleAfterPhotoChange} class="w-full text-sm border rounded px-3 py-2" />
          </div>
          {#if afterphotoPreview}
            <div class="flex-shrink-0">
              <img src={afterphotoPreview} alt="Preview Foto Sesudah" class="h-32 w-auto rounded border shadow-sm" />
            </div>
          {/if}
        </div>
      </div>
      
      <!-- Button dengan posisi yang lebih baik -->
      <div class="flex justify-center pt-6 border-t">
        <button type="submit" class="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 font-medium" disabled={saving}>
          {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </div>
    </form>
  {/if}
</div>
