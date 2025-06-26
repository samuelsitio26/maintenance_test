<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let rentals = [];
	let filteredRentals = [];
	let selectedRental = null;
	let loading = true;
	let error = '';
	let searchTerm = '';
	let statusFilter = '';
	let statusPengembalianFilter = '';
	let kondisiFilter = '';
	let dateRangeFilter = 'all';
	let showReturnModal = false;
	let returnComment = '';
	let returnCondition = 'baik';
	let pendingApprovals = [];

	// Status options untuk filter
	const statusOptions = [
		{ value: '', label: 'Semua Status' },
		{ value: 'dipinjam', label: 'Dipinjam' },
		{ value: 'dikembalikan', label: 'Dikembalikan' }
	];

	// Status Pengembalian options
	const statusPengembalianOptions = [
		{ value: '', label: 'Semua Status Pengembalian' },
		{ value: 'tepat_waktu', label: 'Tepat Waktu' },
		{ value: 'terlambat', label: 'Terlambat' },
		{ value: 'belum_kembali', label: 'Belum Kembali' },
		{ value: 'pending_approval', label: 'Menunggu Approval' }
	];

	// Kondisi options
	const kondisiOptions = [
		{ value: '', label: 'Semua Kondisi' },
		{ value: 'baik', label: 'Baik' },
		{ value: 'rusak', label: 'Rusak' },
		{ value: 'tidak_lengkap', label: 'Tidak Lengkap' },
		{ value: 'hilang', label: 'Hilang' }
	];

	// Date range options
	const dateRangeOptions = [
		{ value: 'all', label: 'Semua Waktu' },
		{ value: 'today', label: 'Hari Ini' },
		{ value: 'week', label: '7 Hari Terakhir' },
		{ value: 'month', label: '30 Hari Terakhir' }
	];

	// Function untuk format tanggal DD-MM-YYYY
	function formatDate(dateStr) {
		if (!dateStr) return '-';
		const date = new Date(dateStr);
		const day = String(date.getDate()).padStart(2, '0');
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const year = date.getFullYear();
		return `${day}-${month}-${year}`;
	}

	// Function untuk mendapatkan status badge class
	function getStatusClass(status) {
		switch (status?.toLowerCase()) {
			case 'dipinjam':
				return 'bg-yellow-100 text-yellow-800 border-yellow-200';
			case 'dikembalikan':
				return 'bg-green-100 text-green-800 border-green-200';
			default:
				return 'bg-gray-100 text-gray-800 border-gray-200';
		}
	}

	// Function untuk mendapatkan icon status
	function getStatusIcon(status) {
		switch (status?.toLowerCase()) {
			case 'dipinjam':
				return '📤';
			case 'dikembalikan':
				return '📥';
			default:
				return '📋';
		}
	}

	// Function untuk mendapatkan status pengembalian badge class
	function getStatusPengembalianClass(status) {
		switch (status?.toLowerCase()) {
			case 'tepat_waktu':
				return 'bg-green-100 text-green-800 border-green-200';
			case 'terlambat':
				return 'bg-red-100 text-red-800 border-red-200';
			case 'belum_kembali':
				return 'bg-yellow-100 text-yellow-800 border-yellow-200';
			case 'pending_approval':
				return 'bg-blue-100 text-blue-800 border-blue-200';
			default:
				return 'bg-gray-100 text-gray-800 border-gray-200';
		}
	}

	// Function untuk mendapatkan icon status pengembalian
	function getStatusPengembalianIcon(status) {
		switch (status?.toLowerCase()) {
			case 'tepat_waktu':
				return '✅';
			case 'terlambat':
				return '❌';
			case 'belum_kembali':
				return '⏳';
			case 'pending_approval':
				return '⏰';
			default:
				return '❓';
		}
	}

	// Function untuk mendapatkan kondisi badge class
	function getKondisiClass(kondisi) {
		switch (kondisi?.toLowerCase()) {
			case 'baik':
				return 'bg-green-100 text-green-800 border-green-200';
			case 'rusak':
				return 'bg-red-100 text-red-800 border-red-200';
			case 'tidak_lengkap':
				return 'bg-yellow-100 text-yellow-800 border-yellow-200';
			case 'hilang':
				return 'bg-red-100 text-red-800 border-red-200';
			default:
				return 'bg-gray-100 text-gray-800 border-gray-200';
		}
	}

	// Function untuk mendapatkan icon kondisi
	function getKondisiIcon(kondisi) {
		switch (kondisi?.toLowerCase()) {
			case 'baik':
				return '✅';
			case 'rusak':
				return '❌';
			case 'tidak_lengkap':
				return '⚠️';
			case 'hilang':
				return '🔍';
			default:
				return '❓';
		}
	}

	// Function untuk menghitung durasi pinjam
	function calculateDuration(tanggalPinjam, tanggalKembali) {
		if (!tanggalPinjam) return '-';

		const startDate = new Date(tanggalPinjam);
		const endDate = tanggalKembali ? new Date(tanggalKembali) : new Date();
		const diffTime = Math.abs(endDate - startDate);
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

		return `${diffDays} hari`;
	}

	// Function untuk filter berdasarkan date range
	function filterByDateRange(rental) {
		if (dateRangeFilter === 'all') return true;

		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const rentalDate = new Date(rental.tanggal_pinjam);
		rentalDate.setHours(0, 0, 0, 0);

		switch (dateRangeFilter) {
			case 'today':
				return rentalDate.getTime() === today.getTime();
			case 'week':
				const weekAgo = new Date(today);
				weekAgo.setDate(today.getDate() - 7);
				return rentalDate >= weekAgo;
			case 'month':
				const monthAgo = new Date(today);
				monthAgo.setDate(today.getDate() - 30);
				return rentalDate >= monthAgo;
			default:
				return true;
		}
	}

	// Function untuk memfilter data rental
	function filterRentals() {
		filteredRentals = rentals.filter((rental) => {
			const matchesSearch =
				!searchTerm ||
				rental.nama_barang?.toLowerCase().includes(searchTerm.toLowerCase()) ||
				rental.kategori?.toLowerCase().includes(searchTerm.toLowerCase()) ||
				rental.peminjam?.toLowerCase().includes(searchTerm.toLowerCase());

			const matchesStatus =
				!statusFilter || rental.status?.toLowerCase() === statusFilter.toLowerCase();
			const matchesStatusPengembalian =
				!statusPengembalianFilter ||
				rental.status_pengembalian?.toLowerCase() === statusPengembalianFilter.toLowerCase();
			const matchesKondisi =
				!kondisiFilter || rental.kondisi?.toLowerCase() === kondisiFilter.toLowerCase();
			const matchesDateRange = filterByDateRange(rental);

			return (
				matchesSearch &&
				matchesStatus &&
				matchesStatusPengembalian &&
				matchesKondisi &&
				matchesDateRange
			);
		});
	}

	// Mock data untuk fallback
	const mockRentals = [
		{
			id: 1,
			nama_barang: 'Laptop Dell Inspiron',
			kategori: 'Elektronik',
			peminjam: 'Ahmad Rizki',
			qty: 1,
			tanggal_pinjam: '2024-01-15',
			jatuh_tempo: '2024-01-22',
			tanggal_kembali: null,
			status: 'dipinjam',
			status_pengembalian: 'belum_kembali',
			kondisi: 'baik',
			keterangan: 'Untuk project presentation',
			riwayat: [
				{ tanggal: '2024-01-15', aktivitas: 'Barang dipinjam', user: 'Ahmad Rizki' },
				{ tanggal: '2024-01-16', aktivitas: 'Reminder jatuh tempo', user: 'System' }
			]
		},
		{
			id: 2,
			nama_barang: 'Proyektor Epson',
			kategori: 'Elektronik',
			peminjam: 'Siti Nurhaliza',
			qty: 1,
			tanggal_pinjam: '2024-01-10',
			jatuh_tempo: '2024-01-17',
			tanggal_kembali: '2024-01-18',
			status: 'dikembalikan',
			status_pengembalian: 'terlambat',
			kondisi: 'baik',
			keterangan: 'Meeting room presentation',
			riwayat: [
				{ tanggal: '2024-01-10', aktivitas: 'Barang dipinjam', user: 'Siti Nurhaliza' },
				{ tanggal: '2024-01-17', aktivitas: 'Jatuh tempo terlewat', user: 'System' },
				{
					tanggal: '2024-01-18',
					aktivitas: 'Barang dikembalikan (terlambat)',
					user: 'Siti Nurhaliza'
				}
			]
		},
		{
			id: 3,
			nama_barang: 'Kamera Canon EOS',
			kategori: 'Elektronik',
			peminjam: 'Budi Santoso',
			qty: 1,
			tanggal_pinjam: '2024-01-20',
			jatuh_tempo: '2024-01-27',
			tanggal_kembali: '2024-01-26',
			status: 'dikembalikan',
			status_pengembalian: 'tepat_waktu',
			kondisi: 'baik',
			keterangan: 'Dokumentasi acara',
			riwayat: [
				{ tanggal: '2024-01-20', aktivitas: 'Barang dipinjam', user: 'Budi Santoso' },
				{
					tanggal: '2024-01-26',
					aktivitas: 'Barang dikembalikan tepat waktu',
					user: 'Budi Santoso'
				}
			]
		}
	];

	// Function untuk fetch data dari Directus
	async function fetchRentals() {
		try {
			loading = true;
			const response = await fetch('/api/rentals');

			if (response.ok) {
				const data = await response.json();
				rentals = data.data || [];
			} else {
				throw new Error('Failed to fetch from API');
			}
		} catch (err) {
			console.warn('API gagal, menggunakan mock data:', err);
			rentals = mockRentals;
		} finally {
			loading = false;
			filterRentals();
		}
	}

	// Function untuk ajukan pengembalian barang
	function submitReturnRequest() {
		if (!selectedRental) return;

		// Update status pengembalian menjadi pending approval
		const updatedRental = {
			...selectedRental,
			status_pengembalian: 'pending_approval',
			kondisi_pengembalian: returnCondition,
			keterangan_pengembalian: returnComment,
			tanggal_ajukan_pengembalian: new Date().toISOString()
		};

		// Update di array rentals
		const index = rentals.findIndex((r) => r.id === selectedRental.id);
		if (index !== -1) {
			rentals[index] = updatedRental;
			selectedRental = updatedRental;
		}

		// Add to pending approvals list
		pendingApprovals = [...pendingApprovals, updatedRental.id];

		// Add to riwayat
		if (!updatedRental.riwayat) updatedRental.riwayat = [];
		updatedRental.riwayat.push({
			tanggal: new Date().toISOString().split('T')[0],
			aktivitas: `Pengajuan pengembalian disubmit (Kondisi: ${returnCondition})`,
			user: 'Current User',
			keterangan: returnComment
		});

		filterRentals();
		showReturnModal = false;
		returnComment = '';
		returnCondition = 'baik';

		alert('Pengajuan pengembalian berhasil disubmit! Menunggu approval dari admin inventory.');
	}

	// Reactive statements
	$: if (
		searchTerm !== undefined ||
		statusFilter !== undefined ||
		statusPengembalianFilter !== undefined ||
		kondisiFilter !== undefined ||
		dateRangeFilter !== undefined
	) {
		filterRentals();
	}

	onMount(() => {
		fetchRentals();
	});
</script>

<div class="h-screen bg-gray-50 flex flex-col">
	<!-- Header -->
	<div class="bg-white border-b border-gray-200 px-6 py-4">
		<div class="flex justify-between items-center">
			<div>
				<h1 class="text-2xl font-bold text-gray-900">Pengajuan Barang</h1>
				<p class="mt-1 text-sm text-gray-600">
					Kelola pengajuan peminjaman dan pengembalian barang
				</p>
			</div>
			<div class="flex space-x-3">
				<div class="relative group">
					<button
						type="button"
						class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
					>
						📋 Pengajuan Barang
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
						<a
							href="/inventory/pengembalian"
							class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Pengembalian Barang</a
						>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Error message -->
	{#if error}
		<div class="bg-red-50 border border-red-200 text-red-700 px-6 py-3">
			<p class="text-sm">{error}</p>
		</div>
	{/if}

	<div class="flex flex-1 overflow-hidden">
		<!-- Left Panel - Rental List -->
		<div class="w-1/2 bg-white border-r border-gray-200 flex flex-col">
			<!-- Filters -->
			<div class="p-4 border-b border-gray-200 space-y-4">
				<!-- Search -->
				<div>
					<input
						type="text"
						placeholder="Cari nomor rental, nama barang, peminjam..."
						class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
						bind:value={searchTerm}
					/>
				</div>

				<!-- Filter Row -->
				<div class="grid grid-cols-2 gap-3">
					<select
						class="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
						bind:value={statusFilter}
					>
						{#each statusOptions as status}
							<option value={status.value}>{status.label}</option>
						{/each}
					</select>

					<select
						class="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
						bind:value={dateRangeFilter}
					>
						{#each dateRangeOptions as dateRange}
							<option value={dateRange.value}>{dateRange.label}</option>
						{/each}
					</select>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<select
						class="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
						bind:value={statusPengembalianFilter}
					>
						{#each statusPengembalianOptions as statusPengembalian}
							<option value={statusPengembalian.value}>{statusPengembalian.label}</option>
						{/each}
					</select>

					<select
						class="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
						bind:value={kondisiFilter}
					>
						{#each kondisiOptions as kondisi}
							<option value={kondisi.value}>{kondisi.label}</option>
						{/each}
					</select>
				</div>
			</div>

			<!-- Table Header -->
			<div class="border-b border-gray-200 bg-gray-50">
				<div
					class="grid grid-cols-12 gap-1 p-2 text-xs font-medium text-gray-600 uppercase tracking-wide"
				>
					<div class="col-span-2">Nama Barang</div>
					<div class="col-span-1">Kategori</div>
					<div class="col-span-1">Peminjam</div>
					<div class="col-span-1">Qty</div>
					<div class="col-span-1">Tgl Pinjam</div>
					<div class="col-span-1">Jatuh Tempo</div>
					<div class="col-span-1">Durasi</div>
					<div class="col-span-1">Tgl Kembali</div>
					<div class="col-span-1">Status</div>
					<div class="col-span-1">Status Kembali</div>
					<div class="col-span-1">Kondisi</div>
				</div>
			</div>

			<!-- Rental List -->
			<div class="flex-1 overflow-y-auto">
				{#if loading}
					<div class="flex justify-center items-center h-64">
						<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
					</div>
				{:else if filteredRentals.length === 0}
					<div class="flex flex-col items-center justify-center py-12">
						<div class="text-4xl mb-2">�</div>
						<p class="font-medium text-gray-900">Tidak ada data rental</p>
						<p class="text-sm text-gray-500 mt-1">Belum ada rental barang yang sesuai filter</p>
					</div>
				{:else}
					{#each filteredRentals as rental}
						<div
							class="grid grid-cols-12 gap-1 p-2 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors duration-150 text-xs {selectedRental?.id ===
							rental.id
								? 'bg-blue-50 border-blue-200'
								: ''}"
							on:click={() => selectRental(rental)}
							role="button"
							tabindex="0"
							on:keydown={(e) => e.key === 'Enter' && selectRental(rental)}
						>
							<div class="col-span-2 text-gray-900 font-medium truncate" title={rental.namaBarang}>
								{rental.namaBarang}
							</div>
							<div class="col-span-1 text-gray-600 truncate" title={rental.kategori}>
								{rental.kategori}
							</div>
							<div class="col-span-1 text-gray-600 truncate" title={rental.peminjam}>
								{rental.peminjam}
							</div>
							<div class="col-span-1 text-gray-600 text-center">
								{rental.qty}
							</div>
							<div class="col-span-1 text-gray-600 text-center">
								{rental.tanggalPinjam}
							</div>
							<div class="col-span-1 text-gray-600 text-center">
								{rental.jatuhTempo}
							</div>
							<div class="col-span-1 text-gray-600 text-center">
								{rental.durasi}
							</div>
							<div class="col-span-1 text-gray-600 text-center">
								{rental.tanggalKembali}
							</div>
							<div class="col-span-1 flex justify-center">
								<span
									class="px-1 py-0.5 rounded text-xs font-medium border {getStatusClass(
										rental.status
									)}"
								>
									{rental.status === 'dipinjam' ? '📤' : '📥'}
								</span>
							</div>
							<div class="col-span-1 flex justify-center">
								<span
									class="px-1 py-0.5 rounded text-xs font-medium border {getStatusPengembalianClass(
										rental.statusPengembalian
									)}"
									title={rental.statusPengembalianLabel}
								>
									{rental.statusPengembalian === 'tepat_waktu'
										? '✅'
										: rental.statusPengembalian === 'terlambat'
											? '⏰'
											: '⏳'}
								</span>
							</div>
							<div class="col-span-1 flex justify-center">
								<span
									class="px-1 py-0.5 rounded text-xs font-medium border {getKondisiClass(
										rental.kondisi
									)}"
								>
									{rental.kondisi === 'baik'
										? '✅'
										: rental.kondisi === 'rusak'
											? '🔧'
											: rental.kondisi === 'hilang'
												? '❌'
												: '⚠️'}
								</span>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>

		<!-- Right Panel - Detail Rental -->
		<div class="w-1/2 bg-white flex flex-col">
			{#if selectedRental}
				<!-- Detail Header -->
				<div class="p-6 border-b border-gray-200">
					<div class="flex justify-between items-start mb-4">
						<div>
							<h2 class="text-xl font-bold text-gray-900">{selectedRental.nomorRental}</h2>
							<p class="text-gray-600 mt-1">{selectedRental.namaBarang}</p>
						</div>
						<div class="text-right">
							<span
								class="inline-block px-3 py-1 rounded-full text-sm font-medium border {getStatusClass(
									selectedRental.status
								)}"
							>
								{getStatusIcon(selectedRental.status)}
								{selectedRental.status.replace('_', ' ').toUpperCase()}
							</span>
							<div class="mt-2">
								<span
									class="inline-block px-2 py-1 rounded-full text-xs font-medium border {getStatusPengembalianClass(
										selectedRental.statusPengembalian
									)}"
								>
									{selectedRental.statusPengembalianLabel}
								</span>
							</div>
							{#if selectedRental.kondisi !== '-'}
								<div class="mt-2">
									<span
										class="inline-block px-2 py-1 rounded-full text-xs font-medium border {getKondisiClass(
											selectedRental.kondisi
										)}"
									>
										{selectedRental.kondisi.toUpperCase()}
									</span>
								</div>
							{/if}
						</div>
					</div>

					<!-- Action Buttons -->
					<div class="flex space-x-3">
						<button
							class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium transition-colors"
							on:click={() => goto(`/inventory/rental/edit/${selectedRental.id}`)}
						>
							📝 Edit
						</button>
						{#if selectedRental.status === 'dipinjam'}
							<button
								class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium transition-colors"
							>
								📥 Terima Pengembalian
							</button>
						{/if}
						<button
							class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium transition-colors"
						>
							� Cetak Laporan
						</button>
					</div>
				</div>

				<div class="flex-1 overflow-y-auto">
					<!-- Detail Information -->
					<div class="p-6 border-b border-gray-200">
						<h3 class="text-lg font-semibold text-gray-900 mb-4">Informasi Rental</h3>
						<div class="grid grid-cols-2 gap-4">
							<div>
								<div class="text-sm font-medium text-gray-600">Peminjam</div>
								<div class="text-sm text-gray-900 mt-1">{selectedRental.peminjam}</div>
							</div>
							<div>
								<div class="text-sm font-medium text-gray-600">Departemen</div>
								<div class="text-sm text-gray-900 mt-1">{selectedRental.departemen}</div>
							</div>
							<div>
								<div class="text-sm font-medium text-gray-600">Project</div>
								<div class="text-sm text-gray-900 mt-1">{selectedRental.project}</div>
							</div>
							<div>
								<div class="text-sm font-medium text-gray-600">Tanggal Pinjam</div>
								<div class="text-sm text-gray-900 mt-1">{selectedRental.tanggalPinjam}</div>
							</div>
							<div>
								<div class="text-sm font-medium text-gray-600">Jatuh Tempo</div>
								<div class="text-sm text-gray-900 mt-1">{selectedRental.jatuhTempo}</div>
							</div>
							<div>
								<div class="text-sm font-medium text-gray-600">Durasi</div>
								<div class="text-sm text-gray-900 mt-1">{selectedRental.durasi}</div>
							</div>
							<div>
								<div class="text-sm font-medium text-gray-600">Tanggal Kembali</div>
								<div class="text-sm text-gray-900 mt-1">{selectedRental.tanggalKembali}</div>
							</div>
							<div>
								<div class="text-sm font-medium text-gray-600">Kategori</div>
								<div class="text-sm text-gray-900 mt-1">{selectedRental.kategori}</div>
							</div>
							<div>
								<div class="text-sm font-medium text-gray-600">Sub Kategori</div>
								<div class="text-sm text-gray-900 mt-1">{selectedRental.subKategori}</div>
							</div>
							<div>
								<div class="text-sm font-medium text-gray-600">Jumlah</div>
								<div class="text-sm text-gray-900 mt-1">
									{selectedRental.qty}
									{selectedRental.satuan}
								</div>
							</div>
							<div>
								<div class="text-sm font-medium text-gray-600">Status</div>
								<div class="text-sm text-gray-900 mt-1">
									<span
										class="inline-block px-2 py-1 rounded-full text-xs font-medium border {getStatusClass(
											selectedRental.status
										)}"
									>
										{selectedRental.status.toUpperCase()}
									</span>
								</div>
							</div>
							<div>
								<div class="text-sm font-medium text-gray-600">Kondisi</div>
								<div class="text-sm text-gray-900 mt-1">
									{#if selectedRental.kondisi !== '-'}
										<span
											class="inline-block px-2 py-1 rounded-full text-xs font-medium border {getKondisiClass(
												selectedRental.kondisi
											)}"
										>
											{selectedRental.kondisi.toUpperCase()}
										</span>
									{:else}
										-
									{/if}
								</div>
							</div>
						</div>
						{#if selectedRental.keterangan !== '-'}
							<div class="mt-4">
								<div class="text-sm font-medium text-gray-600">Keterangan</div>
								<div class="text-sm text-gray-900 mt-1 bg-gray-50 p-3 rounded-lg">
									{selectedRental.keterangan}
								</div>
							</div>
						{/if}
					</div>

					<!-- Status Summary -->
					<div class="p-6 border-b border-gray-200">
						<h3 class="text-lg font-semibold text-gray-900 mb-4">Ringkasan Status</h3>
						<div class="grid grid-cols-3 gap-4">
							<div class="bg-blue-50 p-4 rounded-lg">
								<div class="text-sm font-medium text-blue-600">Status Rental</div>
								<div class="text-lg font-bold text-blue-900 mt-1">
									{selectedRental.status.toUpperCase()}
								</div>
							</div>
							<div
								class="p-4 rounded-lg {selectedRental.statusPengembalian === 'tepat_waktu'
									? 'bg-green-50'
									: selectedRental.statusPengembalian === 'terlambat'
										? 'bg-red-50'
										: 'bg-gray-50'}"
							>
								<div
									class="text-sm font-medium {selectedRental.statusPengembalian === 'tepat_waktu'
										? 'text-green-600'
										: selectedRental.statusPengembalian === 'terlambat'
											? 'text-red-600'
											: 'text-gray-600'}"
								>
									Status Pengembalian
								</div>
								<div
									class="text-lg font-bold mt-1 {selectedRental.statusPengembalian === 'tepat_waktu'
										? 'text-green-900'
										: selectedRental.statusPengembalian === 'terlambat'
											? 'text-red-900'
											: 'text-gray-900'}"
								>
									{selectedRental.statusPengembalianLabel}
								</div>
							</div>
							<div
								class="p-4 rounded-lg {selectedRental.kondisi === 'baik'
									? 'bg-green-50'
									: selectedRental.kondisi === 'rusak' || selectedRental.kondisi === 'hilang'
										? 'bg-red-50'
										: 'bg-orange-50'}"
							>
								<div
									class="text-sm font-medium {selectedRental.kondisi === 'baik'
										? 'text-green-600'
										: selectedRental.kondisi === 'rusak' || selectedRental.kondisi === 'hilang'
											? 'text-red-600'
											: 'text-orange-600'}"
								>
									Kondisi
								</div>
								<div
									class="text-lg font-bold mt-1 {selectedRental.kondisi === 'baik'
										? 'text-green-900'
										: selectedRental.kondisi === 'rusak' || selectedRental.kondisi === 'hilang'
											? 'text-red-900'
											: 'text-orange-900'}"
								>
									{selectedRental.kondisi === '-'
										? 'Belum Dinilai'
										: selectedRental.kondisi.toUpperCase()}
								</div>
							</div>
						</div>
					</div>

					<!-- Activity Timeline -->
					<div class="p-6">
						<h3 class="text-lg font-semibold text-gray-900 mb-4">Riwayat Aktivitas</h3>
						<div class="space-y-4">
							{#each selectedRental.activities as activity}
								<div class="flex">
									<div class="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
									<div class="ml-4 flex-1">
										<div class="text-sm font-medium text-gray-900">{activity.action}</div>
										<div class="text-sm text-gray-500">{activity.user} • {activity.date}</div>
										{#if activity.comment}
											<div class="text-sm text-gray-700 mt-1 bg-gray-50 p-2 rounded">
												{activity.comment}
											</div>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</div>
				</div>
			{:else}
				<div class="flex flex-col items-center justify-center h-full">
					<div class="text-4xl mb-4">�</div>
					<p class="text-lg font-medium text-gray-900">Pilih Rental</p>
					<p class="text-sm text-gray-500 mt-1">
						Pilih data rental dari tabel di sebelah kiri untuk melihat detail
					</p>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	/* Custom styles for rental system */
	.rental-item:hover {
		background-color: #f8fafc;
	}

	.rental-item.selected {
		background-color: #dbeafe;
		border-color: #3b82f6;
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.flex {
			flex-direction: column;
		}

		.w-1\/2 {
			width: 100%;
		}

		.grid-cols-12 {
			grid-template-columns: 1fr;
		}

		.grid-cols-2 {
			grid-template-columns: 1fr;
		}
	}

	/* Smooth transitions */
	.transition-colors {
		transition:
			background-color 0.15s ease-in-out,
			border-color 0.15s ease-in-out,
			color 0.15s ease-in-out;
	}

	/* Table styling */
	.table-header {
		position: sticky;
		top: 0;
		z-index: 10;
	}
</style>
