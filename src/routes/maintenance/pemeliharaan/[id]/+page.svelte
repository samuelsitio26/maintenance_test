<script>
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { pemeliharaanService } from '$lib/services/pemeliharaan.js';
  import jsPDF from 'jspdf';
  import autoTable from 'jspdf-autotable';

  let alat = null;
  let loading = true;
  let error = '';

  $: id = $page.params.id;

  onMount(async () => {
    try {
      const res = await pemeliharaanService.getById(id);
      alat = res.data || res;
    } catch (e) {
      error = e.message || 'Gagal mengambil data alat';
    } finally {
      loading = false;
    }
  });

  function formatDate(date) {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  // Ganti path logo sesuai lokasi logo di folder static
  const logoUrl = '/EPI.jpg';

  async function exportPDF() {
    const doc = new jsPDF();
    let y = 10;

    // Tambah logo
    const img = new window.Image();
    img.src = logoUrl;
    await new Promise((resolve) => { img.onload = resolve; });
    doc.addImage(img, 'JPEG', 10, y, 30, 20);

    // Header perusahaan
    doc.setFontSize(12);
    doc.text('PT. ELTAMA PRIMA INDO', 45, y + 6);
    doc.setFontSize(10);
    doc.text('Jl. Raya Parungpanjang Gunung Sindur, RT 02 RW. 03', 45, y + 12);
    doc.text('No 88 Kel. Bojong Koneng Kec. Gunung Putri', 45, y + 16);
    doc.text('Bogor, Ja-Bar 021-5274954', 45, y + 20);

    // Judul
    doc.setFontSize(14);
    doc.text('DETAIL JADWAL PEMELIHARAAN', 105, y + 30, { align: 'center' });

    // Info alat
    const info = [
      ['Nama Alat', alat.tools || '-'],
      ['Interval (hari)', alat.interval || '-'],
      ['Tanggal Terakhir', formatDate(alat.maintenance_date)],
      ['Tanggal Berikutnya', formatDate(alat.completion_date)],
      ['Ditugaskan Kepada', alat.assign_to || '-'],
      ['Status', alat.status || '-'],
      ['Kondisi', alat.kondisi || '-'],
      ['Detail Tugas', alat.note || '-'],
      ['Lokasi', alat.lokasi || '-'],
      ['Catatan', alat.notes || '-'],
    ];

    autoTable(doc, {
      startY: y + 36,
      head: [['Keterangan', 'Nilai']],
      body: info,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 10 },
      columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 120 } },
      margin: { left: 10, right: 10 },
    });

    // Kebutuhan Sparepart (5 baris kosong)
    let sparepartY = doc.lastAutoTable.finalY + 10;
    autoTable(doc, {
      startY: sparepartY,
      head: [['No', 'Nama Sparepart', 'Qty', 'Keterangan']],
      body: Array.from({ length: 5 }, (_, i) => [i + 1, '', '', '']),
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 10 },
      columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 60 }, 2: { cellWidth: 20 }, 3: { cellWidth: 80 } },
      margin: { left: 10, right: 10 },
    });

    // Progres Mekanik (5 baris kosong)
    let progresY = doc.lastAutoTable.finalY + 10;
    autoTable(doc, {
      startY: progresY,
      head: [['No', 'Progres Mekanik', 'Checklist/Paraf']],
      body: Array.from({ length: 5 }, (_, i) => [i + 1, '', '']),
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 10 },
      columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 100 }, 2: { cellWidth: 60 } },
      margin: { left: 10, right: 10 },
    });

    doc.save(`jadwal-pemeliharaan-${alat?.tools || 'alat'}.pdf`);
  }
</script>

<div class="max-w-xl mx-auto mt-8 p-6 bg-white rounded shadow">
  {#if loading}
    <div class="text-center py-8">Loading...</div>
  {:else if error}
    <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">{error}</div>
  {:else if alat}
    <h2 class="text-xl font-bold mb-4">Detail Jadwal Pemeliharaan</h2>
    <div class="space-y-2">
      <div><b>Alat:</b> {alat.tools}</div>
      <div><b>Interval (hari):</b> {alat.interval}</div>
      <div><b>Tanggal Terakhir:</b> {formatDate(alat.maintenance_date)}</div>
      <div><b>Tanggal Berikutnya:</b> {formatDate(alat.completion_date)}</div>
      <div><b>Ditugaskan Kepada:</b> {alat.assign_to || '-'}</div>
      <div><b>Status:</b> {alat.status}</div>
      <div><b>Kondisi:</b> {alat.kondisi || '-'}</div>
      <div><b>Detail Tugas:</b> {alat.note || '-'}</div>
      <div><b>Lokasi:</b> {alat.lokasi || '-'}</div>
      <div><b>Catatan:</b> {alat.notes || '-'}</div>
    </div>
    <div class="mt-6 flex gap-2">
      <a href="/maintenance/pemeliharaan" class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Kembali</a>
      <button on:click={exportPDF} class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Export PDF</button>
    </div>
  {:else}
    <div class="text-center py-8">Data tidak ditemukan.</div>
  {/if}
</div>
