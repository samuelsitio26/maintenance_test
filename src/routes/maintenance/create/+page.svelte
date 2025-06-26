<!-- src/routes/maintenance/create/+page.svelte -->
<script>
  import { page } from '$app/stores';
  import MaintenanceForm from '$lib/components/maintenance/MaintenanceForm.svelte';
  import { jsPDF } from 'jspdf';
  import 'jspdf-autotable';
  
  // Check if this is coming from tools page with pre-filled data
  $: hasPreFilledData = $page.url.searchParams.has('tool_id') || $page.url.searchParams.has('project_id');
  $: toolName = $page.url.searchParams.get('tool_name') || '';
  $: projectName = $page.url.searchParams.get('project_name') || '';

  // Ganti path logo sesuai lokasi logo di folder static
  const logoUrl = '/EPI.jpg';

  async function exportBlankProgressSheet() {
    const doc = new jsPDF();
    let y = 10;
    // Tambah logo dari URL
    try {
      const img = new window.Image();
      img.src = logoUrl;
      await new Promise((resolve) => { img.onload = resolve; });
      doc.addImage(img, 'JPEG', 10, y, 28, 28);
    } catch (e) {
      alert('Logo gagal dimuat, export tetap dilanjutkan tanpa logo.');
    }
    // Nama perusahaan dan alamat
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('PT. ELTAMA PRIMA INDO', 42, 15);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Jl. Raya Parungpanjang Gunung Sindur, RT 02 RW 03', 42, 20);
    doc.text('No 88 Kel. Bojong Koneng Kec. Gunung Putri', 42, 25);
    doc.text('Bogor, Ja-Bar 021-5274954', 42, 30);
    // Garis bawah header
    doc.setLineWidth(0.5);
    doc.line(10, 36, 200, 36);
    // Judul
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('DAFTAR PROGRES MAINTENANCE', 105, 44, { align: 'center' });
    y = 52;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Nama Teknisi: __________________________', 10, y);
    y += 8;
    doc.text('Tanggal Selesai: ________________________', 10, y);
    y += 10;
    doc.text('List Progres:', 10, y);
    y += 6;
    let alat = toolName ? `${toolName}` : 'Alat';
    if (projectName) alat += ` (${projectName})`;
    doc.text(`1. ${alat}`, 14, y);
    y += 6;
    const progresTitles = [
      'Inspeksi awal kondisi alat',
      'Pembersihan alat',
      'Penggantian/Perbaikan komponen',
      'Pengujian fungsi alat',
      'Finalisasi & dokumentasi'
    ];
    progresTitles.forEach((title, i) => {
      doc.text(`[  ] Progres ${i + 1}: ${title}`, 18, y);
      y += 6;
    });
    y += 8;
    doc.text('Tanda Tangan Mekanik: __________________________', 10, y);
    doc.save(`blank-progress-sheet-${new Date().toISOString().split('T')[0]}.pdf`);
  }
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
      <button
        on:click={exportBlankProgressSheet}
        class="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
      >
        📝 Export Blank Progress Sheet
      </button>
  </div>

  <MaintenanceForm isEdit={false} />
</div>