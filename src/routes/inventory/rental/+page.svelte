<script>
	import { onMount } from 'svelte';
	import { pemeliharaanService } from '$lib/services/pemeliharaan.js';
	import { goto } from '$app/navigation';

	let data = [];
	let loading = true;
	let error = '';
	let undoTimeouts = {};
	let undoTimers = {};
	let showConfirm = false;
	let confirmAction = null;
	let selectedItem = null;
	const UNDO_DURATION = 300000; // 5 menit dalam ms

	// Simulasi data barang rental
	async function fetchRentalData() {
		// Ganti dengan API Anda jika sudah ada
		return [
			{
				id: 1,
				nama: 'Hammer Drill',
				kategori: 'Alat Berat',
				subKategori: 'Bor',
				stok: 2,
				status: 'Dipinjam'
			},
			{
				id: 2,
				nama: 'Concrete Mixer',
				kategori: 'Alat Berat',
				subKategori: 'Mixer',
				stok: 1,
				status: 'Dikembalikan',
				undoUntil: Date.now() + 60000 // contoh: masih bisa undo 1 menit
			}
		];
	}

	onMount(async () => {
		try {
			data = await fetchRentalData();
		} catch (e) {
			error = e.message || 'Gagal mengambil data';
		} finally {
			loading = false;
		}
	});

	function openConfirm(item, action) {
		selectedItem = item;
		confirmAction = action;
		showConfirm = true;
	}

	function closeConfirm() {
		showConfirm = false;
		selectedItem = null;
		confirmAction = null;
	}

	function handleReturn(item) {
		openConfirm(item, 'return');
	}

	function handleUndo(item) {
		openConfirm(item, 'undo');
	}

	function confirmHandler() {
		if (confirmAction === 'return') {
			// Ubah status jadi Dikembalikan, aktifkan undo
			const idx = data.findIndex((d) => d.id === selectedItem.id);
			if (idx !== -1) {
				data[idx].status = 'Dikembalikan';
				data[idx].undoUntil = Date.now() + UNDO_DURATION;
				// Set timer untuk hapus undo
				if (undoTimers[selectedItem.id]) clearTimeout(undoTimers[selectedItem.id]);
				undoTimers[selectedItem.id] = setTimeout(() => {
					const i = data.findIndex((d) => d.id === selectedItem.id);
					if (i !== -1) {
						delete data[i].undoUntil;
					}
				}, UNDO_DURATION);
			}
		} else if (confirmAction === 'undo') {
			// Batalkan pengembalian
			const idx = data.findIndex((d) => d.id === selectedItem.id);
			if (idx !== -1) {
				data[idx].status = 'Dipinjam';
				delete data[idx].undoUntil;
				if (undoTimers[selectedItem.id]) clearTimeout(undoTimers[selectedItem.id]);
			}
		}
		closeConfirm();
	}

	function getStatusLabel(status) {
		return status === 'Dipinjam' ? 'Dipinjam' : 'Dikembalikan';
	}

	function canUndo(item) {
		return item.status === 'Dikembalikan' && item.undoUntil && item.undoUntil > Date.now();
	}

	function getUndoCountdown(item) {
		if (!item.undoUntil) return '';
		const ms = item.undoUntil - Date.now();
		if (ms <= 0) return '';
		const min = Math.floor(ms / 60000);
		const sec = Math.floor((ms % 60000) / 1000);
		return `(${min}:${sec.toString().padStart(2, '0')})`;
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="sm:flex sm:items-center sm:justify-between">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Daftar Rental Alat</h1>
			<p class="mt-1 text-sm text-gray-600">
				Kelola dan monitor proses peminjaman serta pengembalian alat-alat proyek
			</p>
		</div>
		<div class="mt-4 sm:mt-0 flex space-x-3">
			<div class="relative group">
				<button
					type="button"
					class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
				>
					📋 Rental Barang
					<svg
						class="ml-2 w-4 h-4"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						viewBox="0 0 24 24"
						><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg
					>
				</button>
				<div
					class="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity z-10"
				>
					<a href="/inventory/peminjaman" class="block px-4 py-2 text-gray-700 hover:bg-gray-100"
						>Pinjam Barang</a
					>
					<a href="/inventory/pengembalian" class="block px-4 py-2 text-gray-700 hover:bg-gray-100"
						>Pengembalian Barang</a
					>
				</div>
			</div>
		</div>
	</div>

	<!-- Error message -->
	{#if error}
		<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
			<p class="text-sm">{error}</p>
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
			<p class="font-medium">Tidak ada data rental</p>
			<p class="text-xs mt-1">Belum ada data rental yang dibuat</p>
		</div>
	{:else}
		<div class="overflow-hidden shadow-sm rounded-lg border border-gray-200">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						<th
							class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
							>No</th
						>
						<th
							class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
							>Nama</th
						>
						<th
							class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
							>Kategori</th
						>
						<th
							class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
							>Sub Kategori</th
						>
						<th
							class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
							>Stok</th
						>
						<th
							class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
							>Status</th
						>
						<th
							class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
							>Aksi</th
						>
					</tr>
				</thead>
				<tbody class="bg-white divide-y divide-gray-200">
					{#each data as item, i}
						<tr class="hover:bg-gray-50">
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{i + 1}</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.nama}</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.kategori}</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.subKategori}</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.stok}</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
								<span
									class="px-2 py-1 rounded text-xs font-semibold {item.status === 'Dipinjam'
										? 'bg-yellow-100 text-yellow-800'
										: 'bg-green-100 text-green-800'}"
								>
									{getStatusLabel(item.status)}
								</span>
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 flex gap-2">
								{#if item.status === 'Dipinjam'}
									<button
										class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
										on:click={() => handleReturn(item)}
									>
										Kembalikan
									</button>
								{:else if canUndo(item)}
									<button
										class="px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
										on:click={() => handleUndo(item)}
									>
										Batalkan Pengembalian {getUndoCountdown(item)}
									</button>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<!-- Dialog Konfirmasi -->
	{#if showConfirm}
		<div class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
			<div class="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
				<h2 class="text-lg font-bold mb-2">Konfirmasi</h2>
				<p class="mb-4">
					{#if confirmAction === 'return'}
						Yakin ingin mengubah status menjadi <b>Dikembalikan</b> untuk
						<b>{selectedItem.nama}</b>?
					{:else if confirmAction === 'undo'}
						Yakin ingin <b>membatalkan pengembalian</b> untuk <b>{selectedItem.nama}</b>?
					{/if}
				</p>
				<div class="flex justify-end gap-2">
					<button class="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300" on:click={closeConfirm}
						>Batal</button
					>
					<button
						class="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
						on:click={confirmHandler}>Ya</button
					>
				</div>
			</div>
		</div>
	{/if}
</div>
