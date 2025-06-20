<script>
  import { pemeliharaanService } from '$lib/services/pemeliharaan.js';
  import { goto } from '$app/navigation';

  let alat = '';
  let interval = '';
  let nextScheduleDate = '';
  let lastMaintenanceDate = '';
  let assignedTo = '';
  let maintenanceType = 'Preventive'; // Default value

  let petugasList = [
    'Budi', 'Siti', 'Andi', 'Rina', 'Joko'
  ];
  let showPetugasSuggestions = false;
  let filteredPetugas = [];
  let isNewPetugas = false;

  // Fungsi simpan data ke Directus
  async function handleSimpan() {
    try {
      // Validasi sederhana
      if (!alat) {
        alert('Alat wajib diisi!');
        return;
      }

      console.log('Data yang akan dikirim:', {
        tools: alat,
        interval: interval ? parseInt(interval) : null,
        maintenance_date: lastMaintenanceDate || null,
        completion_date: nextScheduleDate || null,
        assign_to: assignedTo || null,
        type: maintenanceType
      });

      // Kirim data ke Directus dengan field yang sesuai schema
      const result = await pemeliharaanService.create({
        tools: alat,
        interval: interval ? parseInt(interval) : null,
        maintenance_date: lastMaintenanceDate || null,
        completion_date: nextScheduleDate || null,
        assign_to: assignedTo || null,
        type: maintenanceType || null,
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

<div class="p-6 bg-white rounded shadow-md max-w-3xl mx-auto mt-8">
  <h2 class="text-xl font-bold mb-2">Tambah Jadwal Pemeliharaan</h2>
  <p class="text-sm text-gray-600 mb-6">Tambahkan data pemeliharaan alat terjadwal</p>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label class="block text-sm font-medium text-gray-700">Alat *</label>
      <input 
        type="text" 
        bind:value={alat} 
        class="mt-1 block w-full border rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" 
        placeholder="Nama alat" 
        required
      />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700">Interval (hari)</label>
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
      <label class="block text-sm font-medium text-gray-700">Jenis Maintenance *</label>
      <select bind:value={maintenanceType} class="mt-1 block w-full border rounded px-3 py-2 text-sm">
        <option value="Preventive">Preventive</option>
        <option value="Corrective">Corrective</option>
        <option value="Routine">Routine</option>
      </select>
    </div>


    <!-- Hapus field "Ditugaskan Kepada" karena tidak ada di schema Directus -->
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