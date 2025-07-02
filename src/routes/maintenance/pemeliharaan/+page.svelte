<script>
  import { pemeliharaanService } from '$lib/services/pemeliharaan.js';
  import { goto } from '$app/navigation';
  import AuthGuard from '$lib/components/common/AuthGuard.svelte';

  let alat = '';
  let interval = '';
  let nextScheduleDate = '';
  let lastMaintenanceDate = '';
  let assignedTo = '';
  let maintenanceType = 'Preventive'; // Default value
  let status = 'Terjadwal'; // Default value
  let kondisi = '';
  let beforephoto = null;
  let afterphoto = null;
  let petugasList = [
    'Budi', 'Siti', 'Andi', 'Rina', 'Joko'];
  let showPetugasSuggestions = false;
  let filteredPetugas = [];
  let isNewPetugas = false;
  let lokasi = '';
  let note = '';

  // Fungsi simpan data ke Directus
  async function handleSimpan() {
    try {
      // Validasi sederhana
      if (!alat) {
        alert('Alat wajib diisi!');
        return;
      }

      // Upload foto sebelum
      let beforephotoId = null;
      if (beforephoto) {
        const formData = new FormData();
        formData.append('file', beforephoto);
        const uploadRes = await pemeliharaanService.uploadFile(formData);
        beforephotoId = uploadRes.data?.id || uploadRes.id;
      }
      // Upload foto sesudah
      let afterphotoId = null;
      if (afterphoto) {
        const formData = new FormData();
        formData.append('file', afterphoto);
        const uploadRes = await pemeliharaanService.uploadFile(formData);
        afterphotoId = uploadRes.data?.id || uploadRes.id;
      }

      console.log('Data yang akan dikirim:', {
        tools: alat,
        interval: interval ? parseInt(interval) : null,
        maintenance_date: lastMaintenanceDate || null,
        completion_date: nextScheduleDate || null,
        assign_to: assignedTo || null,
        type: maintenanceType,
        status,
        kondisi: kondisi || null,
        beforephoto: beforephotoId,
        afterphoto: afterphotoId,
        note: note || null,
        lokasi: lokasi || null
      });

      // Kirim data ke Directus dengan field yang sesuai schema
      const result = await pemeliharaanService.create({
        tools: alat,
        interval: interval ? parseInt(interval) : null,
        maintenance_date: lastMaintenanceDate || null,
        completion_date: nextScheduleDate || null,
        assign_to: assignedTo || null,
        type: maintenanceType || null,
        status,
        kondisi: kondisi || null,
        beforephoto: beforephotoId,
        afterphoto: afterphotoId,
        note: note || null,
        lokasi: lokasi || null
      });

      console.log('Response dari Directus:', result);
      alert('Data pemeliharaan berhasil disimpan!');
      // Redirect ke halaman index
      goto('/maintenance/pemeliharaan/index');
      
      // Reset form
      alat = '';
      interval = '';
      lastMaintenanceDate = '';
      nextScheduleDate = '';
      assignedTo = '';
      maintenanceType = 'Preventive'; // Reset ke default
      status = 'Terjadwal'; // Reset ke default
      kondisi = ''; // Reset kondisi
      beforephoto = null;
      afterphoto = null;
      note = '';
      lokasi = '';
      
    } catch (err) {
      console.error('Directus error:', err);
      
      // Log error detail untuk debugging
      if (err.response) {
        console.error('Response data:', err.response.data);
        console.error('Response status:', err.response.status);
      }
      
      alert('Gagal menyimpan data: ' + (err.message || JSON.stringify(err)));
    }
  }

  $: filteredPetugas = assignedTo
    ? petugasList.filter(p => p.toLowerCase().includes(assignedTo.toLowerCase()))
    : petugasList;
  $: isNewPetugas = assignedTo && !petugasList.some(p => p.toLowerCase() === assignedTo.toLowerCase());

  function selectPetugas(name) {
    assignedTo = name;
    showPetugasSuggestions = false;
    if (isNewPetugas && !petugasList.includes(name)) {
      petugasList = [...petugasList, name];
    }
  }
</script>

<AuthGuard requireMaintenanceAccess={true}>
  <div class="p-6 bg-white rounded shadow-md max-w-3xl mx-auto mt-8">
    <h2 class="text-xl font-bold mb-2">Tambah Jadwal Pemeliharaan</h2>
    <p class="text-sm text-gray-600 mb-6">Tambahkan data pemeliharaan alat terjadwal</p>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label for="tool" class="block text-sm font-medium text-gray-700">Alat <span class="text-red-500">*</span> <!----></label>
      <input 
        type="text" 
        bind:value={alat} 
        class="mt-1 block w-full border rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" 
        placeholder="Nama alat" 
        required
      />
    </div>

    <div>
      <label for="tool" class="block text-sm font-medium text-gray-700">Interval <span class="text-red-500">*</span> <!----></label>
      <input 
        type="number" 
        bind:value={interval} 
        class="mt-1 block w-full border rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" 
        placeholder="Contoh: 30" 
        min="1"
      />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700">Tanggal Pemeliharaan Terakhir</label>
      <input 
        type="date" 
        bind:value={lastMaintenanceDate} 
        class="mt-1 block w-full border rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" 
      />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700">Tanggal Pemeliharaan Berikutnya</label>
      <input 
        type="date" 
        bind:value={nextScheduleDate} 
        class="mt-1 block w-full border rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" 
      />
    </div>

    <div class="relative">
      <label class="block text-sm font-medium text-gray-700">Ditugaskan Kepada</label>
      <input
        type="text"
        bind:value={assignedTo}
        class="mt-1 block w-full border rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        placeholder="Nama petugas"
        on:input={() => showPetugasSuggestions = true}
        on:focus={() => showPetugasSuggestions = true}
        on:blur={() => setTimeout(() => showPetugasSuggestions = false, 150)}
      />
      {#if showPetugasSuggestions && assignedTo}
        <ul class="absolute z-10 bg-white border w-full mt-1 rounded shadow max-h-40 overflow-auto">
          {#each filteredPetugas as p}
            <li class="px-3 py-2 hover:bg-blue-100 cursor-pointer" on:mousedown={() => selectPetugas(p)}>{p}</li>
          {/each}
          {#if isNewPetugas}
            <li class="px-3 py-2 bg-green-100 text-green-700 cursor-pointer" on:mousedown={() => selectPetugas(assignedTo)}>
              + Tambah "{assignedTo}"
            </li>
          {/if}
        </ul>
      {/if}
    </div>

    <div>
        <label for="tool" class="block text-sm font-medium text-gray-700">Jenis Maintenance <span class="text-red-500">*</span> <!----></label>      <select bind:value={maintenanceType} class="mt-1 block w-full border rounded px-3 py-2 text-sm">
        <option value="Preventive">Preventive</option>
        <option value="Corrective">Corrective</option>
        <option value="Routine">Routine</option>
      </select>
    </div>

    <div>
      <label for="tool" class="block text-sm font-medium text-gray-700">Status <span class="text-red-500">*</span> <!----></label>
      <select bind:value={status} class="mt-1 block w-full border rounded px-3 py-2 text-sm">
        <option value="Terjadwal">Terjadwal</option>
        <option value="Selesai">Selesai</option>
        <option value="Dibatalkan">Dibatalkan</option>
      </select>
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700">Kondisi Alat</label>
      <select bind:value={kondisi} class="mt-1 block w-full border rounded px-3 py-2 text-sm">
        <option value="">- Pilih kondisi (opsional) -</option>
        <option value="Layak">Layak</option>
        <option value="Tidak Layak">Tidak Layak</option>
      </select>
    </div>

    <div>
    <label for="tool" class="block text-sm font-medium text-gray-700">Foto Sebelum Pemeliharaan <span class="text-red-500">*</span> <!----></label>      <input type="file" accept="image/*" on:change={e => beforephoto = e.target.files[0]} class="mt-1 block w-full text-sm" />
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700">Foto Sesudah Pemeliharaan</label>
      <input type="file" accept="image/*" on:change={e => afterphoto = e.target.files[0]} class="mt-1 block w-full text-sm" />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700">Detail Tugas</label>
      <textarea
        bind:value={note}
        class="mt-1 block w-full border rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        placeholder="Detail tugas pemeliharaan (opsional)"
        rows="3"
      ></textarea>
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700">Lokasi</label>
      <input
        type="text"
        bind:value={lokasi}
        class="mt-1 block w-full border rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        placeholder="Lokasi alat (opsional)"
      />
    </div>
  </div>

  <div class="mt-6">
    <button 
      class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm transition-colors disabled:bg-gray-400" 
      on:click={handleSimpan}
      disabled={!alat}
    >
      Simpan
    </button>
  </div>
</div>
</AuthGuard>