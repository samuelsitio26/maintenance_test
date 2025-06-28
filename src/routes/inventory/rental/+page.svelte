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
	let undoTimeouts = {};
	let undoTimers = {};
	const UNDO_DURATION = 300000; // 5 menit dalam ms
	let showDetailModal = false;
	let detailItem = null;

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
		{ value: '', label: 'Semua Status' },
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

	// Function untuk mendapatkan label status
	function getStatusLabel(rental) {
		// Jika status sudah dikembalikan, return status tersebut
		if (rental.status === 'Dikembalikan') return 'Dikembalikan';
		if (rental.status === 'Dipinjam') return 'Dipinjam';

		// Jika masih proses approval, return status approval
		const stage = getApprovalStage(rental);
		if (stage === 'dept') return 'Pending';
		if (stage === 'inventory') return 'Dept Approved';
		if (stage === 'procurement') return 'Inventory Approved';
		if (stage === 'done') return 'Approved';

		return rental.status || 'Pending';
	}

	// Function untuk mendapatkan status badge class
	function getStatusBadgeClass(status) {
		switch (status?.toLowerCase()) {
			case 'pending':
				return 'bg-yellow-100 text-yellow-800 border-yellow-300';
			case 'dept approved':
				return 'bg-purple-100 text-purple-800 border-purple-300';
			case 'inventory approved':
				return 'bg-indigo-100 text-indigo-800 border-indigo-300';
			case 'approved':
				return 'bg-green-100 text-green-800 border-green-300';
			case 'dipinjam':
				return 'bg-blue-100 text-blue-800 border-blue-300';
			case 'dikembalikan':
				return 'bg-gray-100 text-gray-700 border-gray-300';
			default:
				return 'bg-gray-100 text-gray-800 border-gray-200';
		}
	}

	// Function untuk mendapatkan stage approval
	function getApprovalStage(rental) {
		if (!rental.approvals) return 'none';

		if (rental.approvals.procurement) return 'done';
		if (rental.approvals.inventory) return 'procurement';
		if (rental.approvals.dept) return 'inventory';
		return 'dept';
	}

	// Function untuk check apakah user bisa approve
	function canApprove(user, rental) {
		if (!user || !user.role) return false;

		const stage = getApprovalStage(rental);

		if (user.role === 'Manager Dept' && stage === 'dept') return true;
		if (user.role === 'Inventory Manager' && stage === 'inventory') return true;
		if (user.role === 'Procurement Manager' && stage === 'procurement') return true;

		return false;
	}

	// Function untuk check apakah bisa undo
	function canUndo(rental) {
		return rental.undoUntil && new Date() < rental.undoUntil;
	}

	// Function untuk get countdown undo
	function getUndoCountdown(rental) {
		if (!rental.undoUntil) return '';

		const now = new Date();
		const timeLeft = rental.undoUntil - now;

		if (timeLeft <= 0) return '';

		const minutes = Math.floor(timeLeft / 60000);
		const seconds = Math.floor((timeLeft % 60000) / 1000);

		return `(${minutes}:${seconds.toString().padStart(2, '0')})`;
	}

	// Function untuk close detail modal
	function closeDetailModal() {
		showDetailModal = false;
		detailItem = null;
	}

	// Function untuk memfilter data rental
	function filterRentals() {
		filteredRentals = rentals.filter((rental) => {
			const matchesSearch =
				!searchTerm ||
				rental.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
				rental.kategori?.toLowerCase().includes(searchTerm.toLowerCase()) ||
				rental.peminjam?.toLowerCase().includes(searchTerm.toLowerCase()) ||
				rental.departemen?.toLowerCase().includes(searchTerm.toLowerCase());

			const matchesStatus =
				!statusFilter || getStatusLabel(rental).toLowerCase() === statusFilter.toLowerCase();
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
			// Mapping data dari API agar ada approvals dan status approval
			const mapped = (result.data || []).map((item, index) => {
				const returnStatus = calculateReturnStatus(
					item.borrow_date || item.tanggal_pinjam,
					item.duration || 0,
					item.actual_return_date || item.tanggal_kembali,
					item.returned || item.status === 'dikembalikan'
				);

				// Simulasi data approval untuk demo - dalam implementasi nyata, ini akan dari API
				// Buat lebih realistis: sebagian besar masih pending approval
				let approvals = {};
				if (index % 5 === 0) {
					// Fully approved - hanya 20% data
					approvals = {
						dept: {
							by: 'managerdept@eltama.com',
							name: 'Manager Dept',
							at: '2025-06-25T08:00:00Z'
						},
						inventory: {
							by: 'inventoryadmin@eltama.com',
							name: 'Inventory Manager',
							at: '2025-06-25T10:30:00Z'
						},
						procurement: {
							by: 'procurementmanager@eltama.com',
							name: 'Procurement Manager',
							at: '2025-06-25T14:15:00Z'
						}
					};
				} else if (index % 5 === 1) {
					// Partially approved sampai inventory - 20% data
					approvals = {
						dept: {
							by: 'managerdept@eltama.com',
							name: 'Manager Dept',
							at: '2025-06-26T09:15:00Z'
						},
						inventory: {
							by: 'inventoryadmin@eltama.com',
							name: 'Inventory Manager',
							at: '2025-06-26T11:45:00Z'
						}
					};
				} else if (index % 5 === 2) {
					// Hanya dept approval - 20% data
					approvals = {
						dept: {
							by: 'managerdept@eltama.com',
							name: 'Manager Dept',
							at: '2025-06-27T07:30:00Z'
						}
					};
				}
				// 40% sisanya tidak ada approval sama sekali (pending)

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
					status:
						item.returned || item.status === 'dikembalikan'
							? 'Dikembalikan'
							: item.status || 'Dipinjam',
					statusPengembalian: returnStatus,
					kondisiKembali: item.return_condition || item.kondisi || '-',
					keterangan: item.return_notes || item.keterangan || '-',
					approvals: approvals, // Menggunakan data approval yang sudah disimulasi
					undoUntil: null,
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

	function handleUndo(item) {
		// Batalkan pengembalian
		const idx = rentals.findIndex((d) => d.id === item.id);
		if (idx !== -1) {
			rentals[idx].status = 'Dipinjam';
			delete rentals[idx].undoUntil;
			if (undoTimers[item.id]) clearTimeout(undoTimers[item.id]);
			filterRentals();
		}
	}

	function handleReturnWithUndo(item) {
		selectedRental = item;
		showReturnModal = true;
	}

	async function confirmReturnWithUndo() {
		if (!selectedRental) return;
		try {
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
						keterangan_pengembalian: returnComment
					})
				}
			);
			if (!response.ok) throw new Error('Gagal mengupdate data pengembalian');
			// Set undo timer
			const idx = rentals.findIndex((d) => d.id === selectedRental.id);
			if (idx !== -1) {
				rentals[idx].status = 'Dikembalikan';
				rentals[idx].undoUntil = Date.now() + UNDO_DURATION;
				if (undoTimers[selectedRental.id]) clearTimeout(undoTimers[selectedRental.id]);
				undoTimers[selectedRental.id] = setTimeout(() => {
					const i = rentals.findIndex((d) => d.id === selectedRental.id);
					if (i !== -1) {
						delete rentals[i].undoUntil;
						filterRentals();
					}
				}, UNDO_DURATION);
			}
			await fetchRentals();
			showReturnModal = false;
			returnComment = '';
			returnCondition = 'baik';
			alert('Barang berhasil dikembalikan!');
		} catch (err) {
			console.error('Error returning item:', err);
			alert('Error: ' + err.message);
		}
	}

	function handleViewDetail(item) {
		detailItem = item;
		showDetailModal = true;
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

<div
	class="mx-auto px-4 py-8"
	style="max-width:1600px; font-size:1.1rem; margin-left:-50px; margin-right:-50px;"
>
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
		<div>
			<h1 class="text-3xl font-extrabold text-gray-900 tracking-tight">
				Monitoring Pengembalian Barang
			</h1>
			<p class="mt-1 text-sm text-gray-500">Status dan monitoring pengembalian barang rental</p>
		</div>
		<div class="flex gap-2 mt-4 sm:mt-0">
			<button
				class="px-5 py-3 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow"
				on:click={fetchRentals}>Refresh</button
			>
		</div>
	</div>

	<div
		class="bg-white rounded-2xl shadow border border-gray-200 px-4 py-8 min-h-[520px] max-h-[800px]"
		style="margin-left:-20px; margin-right:-20px;"
	>
		<div class="flex flex-row gap-8 xl:gap-12">
			<!-- Panel Kiri: Daftar Peminjaman -->
			<div
				class="flex flex-col h-full min-h-0"
				style="width:38%; min-width:420px; max-width:520px;"
			>
				<!-- Filter & Search -->
				<div
					class="flex flex-col gap-3 mb-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm"
				>
					<div class="flex flex-wrap gap-2 items-center">
						<input
							type="date"
							class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
							placeholder="Dari"
							style="width: 150px;"
						/>
						<span class="text-gray-400 text-sm">sampai</span>
						<input
							type="date"
							class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
							placeholder="Sampai"
							style="width: 150px;"
						/>
					</div>
					<div class="flex flex-wrap gap-2 items-center">
						<select
							bind:value={statusFilter}
							class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
							style="min-width: 140px;"
						>
							<option value="">Semua Status</option>
							<option value="Pending">Pending</option>
							<option value="Dept Approved">Dept Approved</option>
							<option value="Inventory Approved">Inventory Approved</option>
							<option value="Approved">Approved</option>
							<option value="Dipinjam">Dipinjam</option>
							<option value="Dikembalikan">Dikembalikan</option>
						</select>
						<input
							type="text"
							bind:value={searchTerm}
							placeholder="Cari barang/peminjam..."
							class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
							style="min-width: 200px;"
						/>
					</div>
				</div>
				<!-- List Card -->
				<div
					class="flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar max-h-[480px] border border-gray-300 rounded-lg p-2 bg-gradient-to-b from-gray-50 to-white shadow-inner"
				>
					<div class="space-y-1.5 pb-2">
						{#each filteredRentals as item, i (item.id)}
							<button
								type="button"
								class="flex items-center bg-white shadow-sm rounded-lg border border-gray-200 px-4 py-2.5 gap-3 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all duration-200 procurement-card w-full {selectedRental &&
								selectedRental.id === item.id
									? 'ring-2 ring-blue-500 border-blue-400 shadow-md bg-blue-50'
									: 'hover:bg-gray-50'}"
								on:click={() => selectRental(item)}
							>
								<div
									class="w-8 h-8 flex items-center justify-center rounded-full font-bold text-xs bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm flex-shrink-0"
								>
									#{i + 1}
								</div>
								<div class="flex-1 min-w-0">
									<div class="font-semibold text-gray-900 truncate text-sm">{item.nama}</div>
									<div class="text-xs text-gray-500 truncate">
										{item.kategori} • Peminjam: {item.peminjam}
									</div>
								</div>
								<span
									class="ml-auto px-2.5 py-1 rounded-full text-xs font-semibold border status-badge flex-shrink-0 {getStatusBadgeClass(
										getStatusLabel(item)
									)}">{getStatusLabel(item)}</span
								>
							</button>
						{/each}
					</div>
				</div>
			</div>
			<!-- Panel Kanan: Detail -->
			<div
				class="flex-1 min-h-0 flex flex-col overflow-y-auto"
				style="min-width:420px; max-width:900px; width:100%; min-height:400px; max-height:calc(100vh - 120px);"
			>
				<div class="flex-1 min-h-0 flex flex-col h-full">
					{#if selectedRental}
						<!-- Area scroll dengan custom scrollbar -->
						<div
							class="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-0"
							style="height:100%; max-height:100%;"
						>
							<div
								class="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl shadow-lg border border-blue-200 p-8 flex flex-col gap-6 h-full min-h-[400px] overflow-y-auto max-h-full"
							>
								<div class="flex items-center justify-between mb-6">
									<div class="flex items-center gap-4">
										<div
											class="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg"
										>
											<svg
												class="w-6 h-6 text-white"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
												><path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
												/></svg
											>
										</div>
										<div>
											<h2 class="text-2xl font-bold text-gray-900">Detail Barang</h2>
											<p class="text-sm text-gray-600">Informasi lengkap pengembalian</p>
										</div>
									</div>
									<span
										class="px-4 py-2 rounded-full text-sm font-bold border shadow-sm {getStatusBadgeClass(
											getStatusLabel(selectedRental)
										)}">{getStatusLabel(selectedRental)}</span
									>
								</div>
								<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
									<!-- Card Informasi Barang -->
									<div
										class="bg-white rounded-2xl p-6 shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-300"
									>
										<div class="flex items-center gap-3 mb-4">
											<div
												class="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-sm"
											>
												<svg
													class="w-5 h-5 text-white"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
													><path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
													/></svg
												>
											</div>
											<div>
												<h3 class="text-lg font-bold text-gray-900">Informasi Barang</h3>
												<p class="text-xs text-gray-500">Detail produk</p>
											</div>
										</div>
										<div class="space-y-4">
											<div class="p-3 bg-gray-50 rounded-xl">
												<div class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
													Nama Barang
												</div>
												<div class="font-bold text-gray-900 text-lg">{selectedRental.nama}</div>
											</div>
											<div class="grid grid-cols-1 gap-3">
												<div class="p-3 bg-blue-50 rounded-xl border border-blue-100">
													<div
														class="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1"
													>
														Kategori
													</div>
													<div class="text-sm text-gray-900 font-semibold">
														{selectedRental.kategori} - {selectedRental.subKategori}
													</div>
												</div>
												<div class="grid grid-cols-2 gap-3">
													<div class="p-3 bg-purple-50 rounded-xl border border-purple-100">
														<div
															class="text-xs font-medium text-purple-600 uppercase tracking-wide mb-1"
														>
															Peminjam
														</div>
														<div class="text-sm text-gray-900 font-semibold">
															{selectedRental.peminjam}
														</div>
													</div>
													<div class="p-3 bg-orange-50 rounded-xl border border-orange-100">
														<div
															class="text-xs font-medium text-orange-600 uppercase tracking-wide mb-1"
														>
															Jumlah
														</div>
														<div class="text-sm font-bold text-orange-700">
															{selectedRental.qty} Unit
														</div>
													</div>
												</div>
											</div>
										</div>
									</div>
									<!-- Card Timeline -->
									<div
										class="bg-white rounded-2xl p-6 shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-300"
									>
										<div class="flex items-center gap-3 mb-4">
											<div
												class="w-10 h-10 bg-gradient-to-r from-rose-500 to-pink-600 rounded-lg flex items-center justify-center shadow-sm"
											>
												<svg
													class="w-5 h-5 text-white"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
													><path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
													/></svg
												>
											</div>
											<div>
												<h3 class="text-lg font-bold text-gray-900">Timeline</h3>
												<p class="text-xs text-gray-500">Jadwal peminjaman</p>
											</div>
										</div>
										<div class="space-y-4">
											<div class="p-3 bg-gray-50 rounded-xl">
												<div class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
													Tanggal Pinjam
												</div>
												<div class="text-lg text-gray-900 font-bold">
													{selectedRental.tanggalPinjam}
												</div>
											</div>
											<div class="p-3 bg-red-50 rounded-xl border border-red-100">
												<div class="text-xs font-medium text-red-600 uppercase tracking-wide mb-1">
													Jatuh Tempo
												</div>
												<div class="text-sm font-bold text-red-700">
													{selectedRental.tanggalJatuhTempo}
												</div>
											</div>
											<div class="grid grid-cols-2 gap-3">
												<div class="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
													<div
														class="text-xs font-medium text-indigo-600 uppercase tracking-wide mb-1"
													>
														Durasi
													</div>
													<div class="text-sm text-gray-900 font-semibold">
														{selectedRental.durasiPinjam}
													</div>
												</div>
												{#if selectedRental.tanggalKembaliAktual !== '-'}
													<div class="p-3 bg-green-50 rounded-xl border border-green-100">
														<div
															class="text-xs font-medium text-green-600 uppercase tracking-wide mb-1"
														>
															Tgl Kembali
														</div>
														<div class="text-sm text-gray-900 font-semibold">
															{selectedRental.tanggalKembaliAktual}
														</div>
													</div>
												{:else}
													<div class="p-3 bg-gray-100 rounded-xl border border-gray-200">
														<div
															class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1"
														>
															Tgl Kembali
														</div>
														<div class="text-sm text-gray-400">Belum dikembalikan</div>
													</div>
												{/if}
											</div>
										</div>
									</div>
								</div>
								<!-- Status dan Kondisi Barang -->
								{#if (selectedRental.statusPengembalian && selectedRental.statusPengembalian.status !== '-') || selectedRental.kondisiKembali !== '-' || (selectedRental.keterangan && selectedRental.keterangan !== '-')}
									<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
										{#if selectedRental.statusPengembalian && selectedRental.statusPengembalian.status !== '-'}
											<div
												class="p-4 bg-green-50 rounded-xl border border-green-200 flex flex-col gap-1"
											>
												<div
													class="text-xs font-medium text-green-700 uppercase tracking-wide mb-1"
												>
													Status Pengembalian
												</div>
												<div class="font-bold text-green-900 text-lg">
													{selectedRental.statusPengembalian.status}
												</div>
											</div>
										{/if}
										{#if selectedRental.kondisiKembali !== '-'}
											<div
												class="p-4 bg-blue-50 rounded-xl border border-blue-200 flex flex-col gap-1"
											>
												<div class="text-xs font-medium text-blue-700 uppercase tracking-wide mb-1">
													Kondisi Barang
												</div>
												<div class="font-bold text-blue-900 text-lg">
													{selectedRental.kondisiKembali}
												</div>
											</div>
										{/if}
										{#if selectedRental.keterangan && selectedRental.keterangan !== '-'}
											<div
												class="p-4 bg-yellow-50 rounded-xl border border-yellow-200 flex flex-col gap-1 md:col-span-2"
											>
												<div
													class="text-xs font-medium text-yellow-700 uppercase tracking-wide mb-1"
												>
													Keterangan
												</div>
												<div class="text-gray-900 text-base">{selectedRental.keterangan}</div>
											</div>
										{/if}
									</div>
								{/if}

								<!-- Approval Progress -->
								<div class="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mt-4">
									<span
										class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 block"
										>Alur Persetujuan</span
									>
									<!-- Horizontal Approval Flow -->
									<div class="flex items-center justify-between relative">
										<!-- Progress Line Background -->
										<div
											class="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-300 transform -translate-y-1/2 z-0"
										></div>
										<!-- Progress Line Active -->
										<div
											class="absolute top-1/2 left-0 h-0.5 bg-green-500 transform -translate-y-1/2 z-0 transition-all duration-500"
											style="width: {selectedRental.approvals?.dept
												? selectedRental.approvals?.inventory
													? selectedRental.approvals?.procurement
														? '100%'
														: '66%'
													: '33%'
												: '0%'}"
										></div>

										<!-- Step 1: Manager Dept -->
										<div
											class="flex flex-col items-center relative z-10 bg-blue-50 px-3 py-2 rounded-lg"
										>
											<div
												class="w-8 h-8 rounded-full flex items-center justify-center {selectedRental
													.approvals?.dept
													? 'bg-green-500 text-white'
													: 'bg-gray-300 text-gray-500'} font-bold text-sm shadow-sm mb-2 transition-colors duration-300"
											>
												1
											</div>
											<span class="text-xs font-medium text-center text-gray-700">Manager Dept</span
											>
											{#if selectedRental.approvals?.dept}
												<span class="text-xs text-green-600 text-center mt-1"
													>{formatDate(selectedRental.approvals.dept.at)}</span
												>
											{:else}
												<span class="text-xs text-gray-400 text-center mt-1">Pending</span>
											{/if}
										</div>

										<!-- Arrow 1 -->
										<div class="flex-1 flex justify-center">
											<svg class="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
												<path
													fill-rule="evenodd"
													d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
													clip-rule="evenodd"
												></path>
											</svg>
										</div>

										<!-- Step 2: Inventory Manager -->
										<div
											class="flex flex-col items-center relative z-10 bg-blue-50 px-3 py-2 rounded-lg"
										>
											<div
												class="w-8 h-8 rounded-full flex items-center justify-center {selectedRental
													.approvals?.inventory
													? 'bg-green-500 text-white'
													: 'bg-gray-300 text-gray-500'} font-bold text-sm shadow-sm mb-2 transition-colors duration-300"
											>
												2
											</div>
											<span class="text-xs font-medium text-center text-gray-700"
												>Inventory Manager</span
											>
											{#if selectedRental.approvals?.inventory}
												<span class="text-xs text-green-600 text-center mt-1"
													>{formatDate(selectedRental.approvals.inventory.at)}</span
												>
											{:else}
												<span class="text-xs text-gray-400 text-center mt-1">Pending</span>
											{/if}
										</div>

										<!-- Arrow 2 -->
										<div class="flex-1 flex justify-center">
											<svg class="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
												<path
													fill-rule="evenodd"
													d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
													clip-rule="evenodd"
												></path>
											</svg>
										</div>

										<!-- Step 3: Procurement Manager -->
										<div
											class="flex flex-col items-center relative z-10 bg-blue-50 px-3 py-2 rounded-lg"
										>
											<div
												class="w-8 h-8 rounded-full flex items-center justify-center {selectedRental
													.approvals?.procurement
													? 'bg-green-500 text-white'
													: 'bg-gray-300 text-gray-500'} font-bold text-sm shadow-sm mb-2 transition-colors duration-300"
											>
												3
											</div>
											<span class="text-xs font-medium text-center text-gray-700"
												>Procurement Manager</span
											>
											{#if selectedRental.approvals?.procurement}
												<span class="text-xs text-green-600 text-center mt-1"
													>{formatDate(selectedRental.approvals.procurement.at)}</span
												>
											{:else}
												<span class="text-xs text-gray-400 text-center mt-1">Pending</span>
											{/if}
										</div>
									</div>
								</div>

								<!-- Approval Workflow & Aksi -->
								<div class="mt-8 flex flex-col gap-4">
									<!-- Approval Status Badge -->
									<div class="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mb-4">
										<div class="flex flex-wrap gap-2 items-center mb-3">
											<span
												class="px-4 py-2 rounded-full text-sm font-bold border shadow-sm {getStatusBadgeClass(
													getStatusLabel(selectedRental)
												)}">{getStatusLabel(selectedRental)}</span
											>

											{#if getApprovalStage(selectedRental) === 'done'}
												<span
													class="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-300"
												>
													✅ Fully Approved
												</span>
											{:else}
												<span
													class="px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-300"
												>
													⏳ Pending Approval
												</span>
											{/if}
										</div>

										<div class="text-sm text-gray-600 mb-3">
											<strong>Riwayat Persetujuan:</strong>
										</div>

										<div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
											{#if selectedRental.approvals?.dept}
												<div class="bg-green-50 border border-green-200 rounded-lg p-3">
													<div class="text-xs font-medium text-green-800 mb-1">Manager Dept</div>
													<div class="text-xs text-green-700">
														{selectedRental.approvals.dept.name}
													</div>
													<div class="text-xs text-green-600 mt-1">
														{formatDate(selectedRental.approvals.dept.at)}
													</div>
												</div>
											{:else}
												<div class="bg-gray-50 border border-gray-200 rounded-lg p-3">
													<div class="text-xs font-medium text-gray-500 mb-1">Manager Dept</div>
													<div class="text-xs text-gray-400">Menunggu persetujuan</div>
												</div>
											{/if}

											{#if selectedRental.approvals?.inventory}
												<div class="bg-green-50 border border-green-200 rounded-lg p-3">
													<div class="text-xs font-medium text-green-800 mb-1">
														Inventory Manager
													</div>
													<div class="text-xs text-green-700">
														{selectedRental.approvals.inventory.name}
													</div>
													<div class="text-xs text-green-600 mt-1">
														{formatDate(selectedRental.approvals.inventory.at)}
													</div>
												</div>
											{:else}
												<div class="bg-gray-50 border border-gray-200 rounded-lg p-3">
													<div class="text-xs font-medium text-gray-500 mb-1">
														Inventory Manager
													</div>
													<div class="text-xs text-gray-400">Menunggu persetujuan</div>
												</div>
											{/if}

											{#if selectedRental.approvals?.procurement}
												<div class="bg-green-50 border border-green-200 rounded-lg p-3">
													<div class="text-xs font-medium text-green-800 mb-1">
														Procurement Manager
													</div>
													<div class="text-xs text-green-700">
														{selectedRental.approvals.procurement.name}
													</div>
													<div class="text-xs text-green-600 mt-1">
														{formatDate(selectedRental.approvals.procurement.at)}
													</div>
												</div>
											{:else}
												<div class="bg-gray-50 border border-gray-200 rounded-lg p-3">
													<div class="text-xs font-medium text-gray-500 mb-1">
														Procurement Manager
													</div>
													<div class="text-xs text-gray-400">Menunggu persetujuan</div>
												</div>
											{/if}
										</div>
									</div>
									<!-- Tombol Approval/Aksi -->
									<div class="flex flex-col gap-3 mt-2">
										{#if canApprove(user, selectedRental) && getApprovalStage(selectedRental) !== 'done'}
											<button
												class="w-full px-5 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors shadow text-center"
												on:click={() => {
													/* handleApprove(selectedRental) */ alert(
														'Approve logic belum diimplementasi di file ini!'
													);
												}}
											>
												✅ Approve Peminjaman
											</button>
										{/if}

										{#if selectedRental.status === 'Dipinjam' && getApprovalStage(selectedRental) === 'done'}
											<div class="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
												<div class="flex items-center gap-2 mb-2">
													<div
														class="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"
													>
														<svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
															<path
																fill-rule="evenodd"
																d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
																clip-rule="evenodd"
															/>
														</svg>
													</div>
													<span class="text-sm font-semibold text-green-800"
														>Peminjaman Telah Disetujui</span
													>
												</div>
												<div class="text-xs text-green-700">
													✓ Barang ini telah melalui proses approval lengkap dan dapat dikembalikan
												</div>
											</div>
											<button
												class="w-full px-5 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow text-center"
												on:click={() => handleReturnWithUndo(selectedRental)}
											>
												📦 Kembalikan Barang
											</button>
										{/if}

										{#if canUndo(selectedRental)}
											<button
												class="w-full px-5 py-3 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 transition-colors shadow text-center"
												on:click={() => handleUndo(selectedRental)}
											>
												↩️ Undo Pengembalian {getUndoCountdown(selectedRental)}
											</button>
										{/if}

										{#if selectedRental.status === 'Dikembalikan' && !canUndo(selectedRental)}
											<div class="bg-gray-50 border border-gray-200 rounded-lg p-3">
												<div class="flex items-center gap-2 mb-2">
													<div
														class="w-5 h-5 bg-gray-500 rounded-full flex items-center justify-center"
													>
														<svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
															<path
																fill-rule="evenodd"
																d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
																clip-rule="evenodd"
															/>
														</svg>
													</div>
													<span class="text-sm font-semibold text-gray-800"
														>Pengembalian Selesai</span
													>
												</div>
												<div class="text-xs text-gray-700">
													✓ Barang telah dikembalikan dengan status: {selectedRental.kondisiKembali}
												</div>
											</div>
										{/if}
										{#if getApprovalStage(selectedRental) !== 'done' && selectedRental.status === 'Dipinjam'}
											<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
												<div class="flex items-center gap-2 mb-2">
													<div
														class="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center"
													>
														<svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
															<path
																d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
															/>
														</svg>
													</div>
													<span class="text-sm font-semibold text-yellow-800"
														>Menunggu Persetujuan</span
													>
												</div>
												<div class="text-xs text-yellow-700">
													⚠️ Barang belum dapat dikembalikan karena masih dalam proses approval
												</div>
											</div>
										{/if}
									</div>
								</div>
							</div>
						</div>
					{:else}
						<div class="flex items-center justify-center h-full">
							<div class="text-center">
								<div
									class="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4"
								>
									<svg
										class="w-8 h-8 text-gray-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
										/>
									</svg>
								</div>
								<h3 class="text-lg font-semibold text-gray-600 mb-2">Pilih Barang</h3>
								<p class="text-sm text-gray-500">Pilih barang dari daftar untuk melihat detail</p>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>

<!-- Modal Pengembalian -->
{#if showReturnModal && selectedRental}
	<div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
		<div class="bg-white rounded-2xl shadow-xl max-w-md w-full relative">
			<div class="p-6">
				<div class="flex items-center gap-3 mb-4">
					<div class="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
						<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					</div>
					<div>
						<h3 class="text-lg font-bold text-gray-900">Konfirmasi Pengembalian</h3>
						<p class="text-sm text-gray-600">Kembalikan barang dengan detail berikut</p>
					</div>
				</div>

				<div class="bg-gray-50 rounded-xl p-4 mb-4">
					<div class="text-sm font-medium text-gray-700 mb-2">
						Barang: <span class="font-bold">{selectedRental.nama}</span>
					</div>
					<div class="text-sm text-gray-600">Peminjam: {selectedRental.peminjam}</div>
				</div>

				<div class="space-y-4">
					<div>
						<label for="return-condition" class="block text-sm font-medium text-gray-700 mb-2"
							>Kondisi Barang</label
						>
						<select
							id="return-condition"
							bind:value={returnCondition}
							class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						>
							<option value="baik">Baik</option>
							<option value="rusak">Rusak</option>
							<option value="tidak_lengkap">Tidak Lengkap</option>
							<option value="hilang">Hilang</option>
						</select>
					</div>

					<div>
						<label for="return-comment" class="block text-sm font-medium text-gray-700 mb-2"
							>Keterangan (Opsional)</label
						>
						<textarea
							id="return-comment"
							bind:value={returnComment}
							placeholder="Tambahkan catatan pengembalian..."
							class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							rows="3"
						></textarea>
					</div>
				</div>
			</div>

			<div
				class="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-2xl flex justify-end gap-3"
			>
				<button
					class="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
					on:click={() => (showReturnModal = false)}
				>
					Batal
				</button>
				<button
					class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
					on:click={confirmReturnWithUndo}
				>
					Kembalikan
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Modal Detail (jika diperlukan) -->
{#if showDetailModal && detailItem}
	<div class="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
		<div class="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full relative">
			<button
				class="absolute top-3 right-3 text-gray-400 hover:text-gray-700"
				on:click={closeDetailModal}>&times;</button
			>
			<h2 class="text-xl font-bold mb-4">Detail Barang</h2>
			<div class="mb-2"><b>Nama:</b> {detailItem.nama}</div>
			<div class="mb-2"><b>Kategori:</b> {detailItem.kategori} - {detailItem.subKategori}</div>
			<div class="mb-2"><b>Peminjam:</b> {detailItem.peminjam}</div>
			<div class="mb-2"><b>Jumlah:</b> {detailItem.qty}</div>
			<div class="mb-2"><b>Tanggal Pinjam:</b> {detailItem.tanggalPinjam}</div>
			<div class="mb-2"><b>Jatuh Tempo:</b> {detailItem.tanggalJatuhTempo}</div>
			<div class="mb-2"><b>Status:</b> {getStatusLabel(detailItem)}</div>
		</div>
	</div>
{/if}

{#if loading}
	<div class="fixed inset-0 bg-white bg-opacity-75 z-50 flex items-center justify-center">
		<div class="loader"></div>
	</div>
{/if}

{#if error}
	<div class="fixed inset-0 bg-red-100 z-50 p-4 flex items-center justify-center">
		<div class="bg-red-500 text-white rounded-lg px-4 py-2 shadow-md">
			{error}
		</div>
	</div>
{/if}

<style>
	.loader {
		border: 4px solid rgba(0, 0, 0, 0.1);
		border-top: 4px solid rgba(0, 0, 0, 0.3);
		border-radius: 50%;
		width: 40px;
		height: 40px;
		animation: spin 0.6s linear infinite;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	/* Custom Scrollbar */
	.custom-scrollbar::-webkit-scrollbar {
		width: 8px;
	}

	.custom-scrollbar::-webkit-scrollbar-track {
		background: #f1f5f9;
		border-radius: 10px;
	}

	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: #cbd5e1;
		border-radius: 10px;
		border: 2px solid #f1f5f9;
	}

	.custom-scrollbar::-webkit-scrollbar-thumb:hover {
		background: #94a3b8;
	}

	/* Procurement Card Animation */
	.procurement-card {
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.procurement-card:hover {
		transform: translateY(-2px);
	}

	/* Status Badge Animation */
	.status-badge {
		transition: all 0.2s ease-in-out;
	}

	.status-badge:hover {
		transform: scale(1.05);
	}
</style>
