<script>
	import { onMount } from 'svelte';

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
	let reminders = [];
	let user = { email: '', role: '', name: '' };

	onMount(() => {
		const email = localStorage.getItem('user_email');
		if (email === 'managerdept@eltama.com') {
			user = { email, role: 'Manager Dept', name: 'Manager Dept' };
		} else if (email === 'inventoryadmin@eltama.com') {
			user = { email, role: 'Inventory Manager', name: 'Inventory Manager' };
		} else if (email === 'procurementmanager@eltama.com') {
			user = { email, role: 'Procurement Manager', name: 'Procurement Manager' };
		} else {
			user = { email: '', role: '', name: '' };
		}
		fetchRentals();
	});

	function selectRental(rental) {
		selectedRental = rental;
	}

	// Status options untuk filter
	const statusOptions = [
		{ value: '', label: 'Semua Statu						<div class="text-4xl mb-2">📦</div>' },
		{ value: 'dipinjam', label: 'Dipinjam' },
		{ value: 'dikembalikan', label: 'Dikembalikan' }
	];

	// Status Pengembalian options
	const statusPengembalianOptions = [
		{ value: '', label: 'Semua Status Pengembalian' },
		{ value: 'tepat_waktu', label: 'Tepat Waktu' },
		{ value: 'terlambat', label: 'Terlambat' },
		{ value: 'belum_kembali', label: 'Belum Kembali' }
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

	// Utility function untuk format tanggal DD-MM-YYYY
	function formatDate(dateStr) {
		if (!dateStr) return '-';
		const date = new Date(dateStr);
		const day = String(date.getDate()).padStart(2, '0');
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const year = date.getFullYear();
		return `${day}-${month}-${year}`;
	}

	// Utility function untuk hitung status pengembalian
	function calculateReturnStatus(borrowDate, duration, actualReturnDate, returned) {
		if (!returned) return '-';
		if (!actualReturnDate) return '-';

		const expectedDate = new Date(borrowDate);
		expectedDate.setDate(expectedDate.getDate() + duration);
		const actualDate = new Date(actualReturnDate);

		if (actualDate <= expectedDate) {
			return { status: 'Tepat Waktu', class: 'bg-green-100 text-green-800' };
		} else {
			const diffTime = actualDate - expectedDate;
			const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
			return {
				status: `Terlambat (${diffDays} hari)`,
				class: 'bg-red-100 text-red-800'
			};
		}
	}

	// Utility function untuk hitung tanggal jatuh tempo
	function calculateDueDate(borrowDate, duration) {
		if (!borrowDate || !duration) return '-';
		const date = new Date(borrowDate);
		date.setDate(date.getDate() + duration);
		return formatDate(date.toISOString());
	}

	// Reminder jatuh tempo besok
	function getReminders(rentals) {
		const today = new Date();
		const besok = new Date(today);
		besok.setDate(today.getDate() + 1);

		return rentals.filter((item) => {
			if (item.status !== 'Dipinjam') return false;
			const [day, month, year] = item.tanggalJatuhTempo.split('-');
			const dueDate = new Date(`${year}-${month}-${day}`);
			return (
				dueDate.getFullYear() === besok.getFullYear() &&
				dueDate.getMonth() === besok.getMonth() &&
				dueDate.getDate() === besok.getDate()
			);
		});
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
				rental.barang_nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
				rental.parent_category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
				rental.peminjam?.toLowerCase().includes(searchTerm.toLowerCase()) ||
				rental.departemen?.toLowerCase().includes(searchTerm.toLowerCase());

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

	// Function untuk fetch data dari Directus
	async function fetchRentals() {
		try {
			loading = true;
			const response = await fetch(
				'https://directus.eltamaprimaindo.com/items/rentals?fields=*,barang_id.id,barang_id.Nama,barang_id.StokIn,barang_id.parent_category.parent_category,barang_id.sub_category.nama_sub',
				{
					headers: {
						Authorization: 'Bearer JaXaSE93k24zq7T2-vZyu3lgNOUgP8fz'
					}
				}
			);
			if (!response.ok) throw new Error('Gagal mengambil data rental dari Directus');
			const result = await response.json();

			// Map data dan filter status
			const mapped = (result.data || []).map((item) => {
				const returnStatus = calculateReturnStatus(
					item.borrow_date || item.tanggal_pinjam,
					item.duration || 0,
					item.actual_return_date || item.tanggal_kembali,
					item.returned || item.status === 'dikembalikan'
				);
				return {
					id: item.id,
					nama: item.barang_id?.Nama || '-',
					kategori: item.barang_id?.parent_category?.parent_category || '-',
					subKategori: item.barang_id?.sub_category?.nama_sub || '-',
					qty: item.qty ?? '-',
					peminjam: item.borrower || item.peminjam || '-',
					tanggalPinjam: formatDate(item.borrow_date || item.tanggal_pinjam),
					tanggalJatuhTempo: calculateDueDate(
						item.borrow_date || item.tanggal_pinjam,
						item.duration || 0
					),
					durasiPinjam: item.duration ? `${item.duration} hari` : '-',
					tanggalKembaliAktual: item.actual_return_date
						? formatDate(item.actual_return_date)
						: item.tanggal_kembali
							? formatDate(item.tanggal_kembali)
							: '-',
					status: item.returned || item.status === 'dikembalikan' ? 'Dikembalikan' : 'Dipinjam',
					statusPengembalian: returnStatus,
					kondisiKembali: item.return_condition || item.kondisi || '-',
					keterangan: item.return_notes || item.keterangan || '-',
					// Untuk reminder
					rawBorrowDate: item.borrow_date || item.tanggal_pinjam,
					rawDuration: item.duration,
					rawActualReturnDate: item.actual_return_date || item.tanggal_kembali
				};
			});
			// Hanya status approved (dipinjam/dikembalikan)
			const filtered = mapped.filter(
				(item) => item.status === 'Dipinjam' || item.status === 'Dikembalikan'
			);
			// Update data dan reminder
			filteredRentals = rentals = filtered;
			reminders = getReminders(filtered);
		} catch (e) {
			error = e.message || 'Gagal mengambil data';
			rentals = [];
			filteredRentals = [];
		} finally {
			loading = false;
		}
	}

	// Function untuk mendapatkan label status pengembalian
	function getStatusPengembalianLabel(status) {
		switch (status?.toLowerCase()) {
			case 'tepat_waktu':
				return 'Tepat Waktu';
			case 'terlambat':
				return 'Terlambat';
			case 'belum_kembali':
				return 'Belum Kembali';
			default:
				return 'Belum Kembali';
		}
	}

	// Function untuk mengembalikan barang
	async function handleReturnItem() {
		if (!selectedRental) return;

		try {
			// Update data rental di Directus
			const response = await fetch(
				`https://directus.eltamaprimaindo.com/items/rentals/${selectedRental.id}`,
				{
					method: 'PATCH',
					headers: {
						Authorization: 'Bearer JaXaSE93k24zq7T2-vZyu3lgNOUgP8fz',
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						status: 'dikembalikan',
						tanggal_kembali: new Date().toISOString().split('T')[0],
						kondisi: returnCondition,
						keterangan_pengembalian: returnComment,
						status_pengembalian: calculateReturnStatus(selectedRental.jatuh_tempo)
					})
				}
			);

			if (!response.ok) {
				throw new Error('Gagal mengupdate data pengembalian');
			}

			// Refresh data
			await fetchRentals();
			selectedRental = null;
			showReturnModal = false;
			returnComment = '';
			returnCondition = 'baik';

			alert('Barang berhasil dikembalikan!');
		} catch (err) {
			console.error('Error returning item:', err);
			alert('Error: ' + err.message);
		}
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

	function openDetailModal(item) {
		selectedItem = item;
		showDetailModal = true;
	}

	function closeDetailModal() {
		showDetailModal = false;
		selectedItem = null;
	}
</script>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
	<!-- Header dengan Filter -->
	<div class="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
		<div class="p-6">
			<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
				<div>
					<h1 class="text-2xl font-bold text-gray-900">Monitoring Peminjaman Barang</h1>
					<p class="mt-1 text-sm text-gray-600">
						Status dan monitoring peminjaman serta pengembalian barang
					</p>
				</div>
				<div class="mt-4 sm:mt-0 flex items-center space-x-3">
					<span class="text-sm text-gray-500">Status:</span>
					<select
						class="border border-gray-300 rounded-md px-3 py-2 text-sm"
						bind:value={statusFilter}
					>
						<option value="">Semua Status</option>
						<option value="dipinjam">Dipinjam</option>
						<option value="dikembalikan">Dikembalikan</option>
					</select>
				</div>
			</div>
			<!-- Search Bar -->
			<div class="flex flex-col sm:flex-row gap-4">
				<div class="flex-1">
					<input
						type="text"
						placeholder="Cari barang, peminjam..."
						class="w-full border border-gray-300 rounded-md px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						bind:value={searchTerm}
					/>
				</div>
				<div class="flex space-x-2">
					<button
						class="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
						on:click={fetchRentals}
					>
						Refresh
					</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Error message -->
	{#if error}
		<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
			<p class="text-sm">{error}</p>
		</div>
	{/if}

	<!-- Reminder jatuh tempo besok -->
	{#if reminders.length > 0}
		<div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-md">
			<strong>Reminder:</strong> Ada {reminders.length} barang rental yang jatuh tempo besok!
			<ul class="list-disc ml-6 mt-2">
				{#each reminders as item}
					<li>{item.nama} ({item.qty}) - Peminjam: {item.peminjam}</li>
				{/each}
			</ul>
		</div>
	{/if}

	<!-- Split Layout: Sidebar + Detail -->
	<div class="flex flex-col md:flex-row gap-6">
		<!-- Sidebar: List Card Barang -->
		<div class="w-full md:w-1/3 max-h-[70vh] overflow-y-auto pr-2">
			{#if loading}
				<div class="flex justify-center items-center h-40">
					<div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
				</div>
			{:else if filteredRentals.length === 0}
				<div class="text-center text-gray-500 py-8">Tidak ada data rental</div>
			{:else}
				<div class="space-y-2">
					{#each filteredRentals as item (item.id)}
						<div
							class="cursor-pointer rounded-lg border px-4 py-3 bg-white shadow-sm flex flex-col gap-1 hover:bg-blue-50 transition {selectedRental &&
							selectedRental.id === item.id
								? 'ring-2 ring-blue-400 border-blue-400'
								: 'border-gray-200'}"
							on:click={() => selectRental(item)}
						>
							<div class="flex items-center justify-between">
								<span class="font-semibold text-base truncate">{item.nama}</span>
								<span
									class="px-2 py-1 rounded text-xs font-bold {item.status === 'Dipinjam'
										? 'bg-blue-100 text-blue-800'
										: 'bg-green-100 text-green-800'}">{item.status}</span
								>
							</div>
							<div class="text-xs text-gray-500 truncate">{item.kategori} | {item.peminjam}</div>
							<div class="flex gap-2 text-xs text-gray-600">
								<span>Qty: {item.qty}</span>
								<span>Pinjam: {item.tanggalPinjam}</span>
							</div>
							<div class="flex gap-2 text-xs text-gray-600">
								<span>Jatuh Tempo: {item.tanggalJatuhTempo}</span>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
		<!-- Panel Detail -->
		<div
			class="w-full md:w-2/3 bg-white rounded-lg shadow-sm border border-gray-200 p-6 min-h-[300px] flex flex-col justify-center"
		>
			{#if selectedRental}
				<div class="flex flex-col gap-2">
					<div class="flex items-center gap-3 mb-2">
						<h2 class="text-xl font-bold">{selectedRental.nama}</h2>
						<span
							class="px-2 py-1 rounded text-xs font-bold {selectedRental.status === 'Dipinjam'
								? 'bg-blue-100 text-blue-800'
								: 'bg-green-100 text-green-800'}">{selectedRental.status}</span
						>
						<span
							class="px-2 py-1 rounded text-xs font-bold {selectedRental.statusPengembalian?.class}"
							>{selectedRental.statusPengembalian?.status}</span
						>
						<span
							class="px-2 py-1 rounded text-xs font-bold {selectedRental.kondisiKembali === 'Baik'
								? 'bg-green-100 text-green-700'
								: selectedRental.kondisiKembali === 'Rusak'
									? 'bg-red-100 text-red-700'
									: 'bg-yellow-100 text-yellow-700'}">{selectedRental.kondisiKembali}</span
						>
					</div>
					<div class="grid grid-cols-2 gap-4 mb-2">
						<div>
							<span class="block text-xs text-gray-500">Peminjam</span>
							<span class="font-medium">{selectedRental.peminjam}</span>
						</div>
						<div>
							<span class="block text-xs text-gray-500">Qty</span>
							<span class="font-medium">{selectedRental.qty}</span>
						</div>
						<div>
							<span class="block text-xs text-gray-500">Tanggal Pinjam</span>
							<span class="font-medium">{selectedRental.tanggalPinjam}</span>
						</div>
						<div>
							<span class="block text-xs text-gray-500">Jatuh Tempo</span>
							<span class="font-medium">{selectedRental.tanggalJatuhTempo}</span>
						</div>
						<div>
							<span class="block text-xs text-gray-500">Tanggal Kembali</span>
							<span class="font-medium">{selectedRental.tanggalKembaliAktual}</span>
						</div>
					</div>
					{#if selectedRental.keterangan && selectedRental.keterangan !== '-'}
						<div class="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-2">
							<span class="block text-xs text-gray-500 mb-1">Keterangan</span>
							<span class="text-sm">{selectedRental.keterangan}</span>
						</div>
					{/if}
					<div class="flex gap-2 mt-4">
						{#if selectedRental.status === 'Dipinjam'}
							<button
								class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-semibold"
								on:click={() => (showReturnModal = true)}>Kembalikan</button
							>
						{/if}
					</div>
				</div>
			{:else}
				<div class="flex flex-col items-center justify-center h-full text-gray-400">
					<svg class="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
						/></svg
					>
					<p class="text-lg font-medium">Pilih salah satu barang rental untuk melihat detail</p>
				</div>
			{/if}
		</div>
	</div>

	<!-- Modal Konfirmasi Pengembalian -->
	{#if showReturnModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div class="bg-white rounded-lg shadow-lg w-full max-w-md">
				<div class="p-6">
					<h2 class="text-lg font-bold mb-4">Konfirmasi Pengembalian</h2>
					<p class="text-sm text-gray-700 mb-4">
						Anda akan mengembalikan barang <strong>{selectedRental.nama}</strong>.
					</p>
					<div class="mb-4">
						<label for="return-condition" class="block text-xs text-gray-500 mb-1"
							>Kondisi Barang</label
						>
						<select
							id="return-condition"
							bind:value={returnCondition}
							class="border border-gray-300 rounded-md px-3 py-2 text-sm"
						>
							<option value="baik">Baik</option>
							<option value="rusak">Rusak</option>
							<option value="tidak_lengkap">Tidak Lengkap</option>
							<option value="hilang">Hilang</option>
						</select>
					</div>
					<div class="mb-4">
						<label for="return-comment" class="block text-xs text-gray-500 mb-1"
							>Keterangan (opsional)</label
						>
						<textarea
							id="return-comment"
							rows="3"
							class="w-full border border-gray-300 rounded-md px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							bind:value={returnComment}
							placeholder="Masukkan keterangan pengembalian (jika ada)"
						></textarea>
					</div>
					<div class="flex justify-end gap-2">
						<button
							class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-400 transition-colors"
							on:click={() => (showReturnModal = false)}
						>
							Batal
						</button>
						<button
							class="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
							on:click={handleReturnItem}
						>
							Konfirmasi Pengembalian
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
