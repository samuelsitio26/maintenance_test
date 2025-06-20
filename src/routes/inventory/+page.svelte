<script>
	import { onMount } from 'svelte';
	import StockTable from '$lib/components/inventory/StockTable.svelte';
	import StockFilter from '$lib/components/inventory/StockFilter.svelte';
	import StockStats from '$lib/components/inventory/StockStats.svelte';
	import ConfirmDialog from '$lib/components/inventory/confirm/ConfirmDialog.svelte';
	import AddToStockDialog from '$lib/components/inventory/confirm/AddToStockDialog.svelte';
	import EditStockDialog from '$lib/components/inventory/confirm/EditStockDialog.svelte';
	import { stockStore, stockStats } from '$lib/stores/inventory.js';

	let loading = false;
	let error = null;
	let toast = { show: false, message: '', type: 'success' };
	let confirmDialog = { show: false, message: '', id: null, name: '' };
	let addToStockDialog = { show: false, selectedItem: null };
	let editStockDialog = { show: false, selectedItem: null };

	// State untuk data
	let stockedItems = [];
	let identitasBarangList = [];
	let parentCategories = [];
	let subCategories = [];

	// Paginasi untuk items
	let currentPage = 1;
	const itemsPerPage = 30;
	let totalItems = 0;
	let paginatedItems = [];

	// Barang yang sudah masuk stok tidak ditampilkan lagi
	let addedToStockIds = [];

	async function loadData() {
		loading = true;
		try {
			// Ambil data dari koleksi items (barang diterima)
			const itemsResponse = await fetch(
				'https://directus.eltamaprimaindo.com/items/items_pengajuan?fields=id,nama_barang,quantity,units,request_id.department&limit=-1',
				{
					headers: {
						Authorization: 'Bearer JaXaSE93k24zq7T2-vZyu3lgNOUgP8fz'
					}
				}
			);
			if (!itemsResponse.ok) throw new Error('Gagal mengambil data barang diterima dari Directus');

			// Ambil data dari koleksi Barang (barang di stok)
			const barangResponse = await fetch(
				'https://directus.eltamaprimaindo.com/items/Barang?fields=*,parent_category.id,parent_category.parent_category,sub_category.id,sub_category.nama_sub&limit=-1',
				{
					headers: {
						Authorization: 'Bearer JaXaSE93k24zq7T2-vZyu3lgNOUgP8fz'
					}
				}
			);
			if (!barangResponse.ok) throw new Error('Gagal mengambil data stok dari Directus');

			// Ambil data identitas barang
			const identitasRes = await fetch(
				'https://directus.eltamaprimaindo.com/items/identitas_barang?fields=id,nama_barang_lengkap,sub_category,parent_category&limit=-1',
				{
					headers: {
						Authorization: 'Bearer JaXaSE93k24zq7T2-vZyu3lgNOUgP8fz'
					}
				}
			);
			if (!identitasRes.ok) throw new Error('Gagal mengambil data identitas barang');
			const identitasData = await identitasRes.json();
			identitasBarangList = identitasData.data || [];

			// Ambil data kategori
			const parentResponse = await fetch(
				'https://directus.eltamaprimaindo.com/items/parent_category?fields=id,parent_category',
				{
					headers: {
						Authorization: 'Bearer JaXaSE93k24zq7T2-vZyu3lgNOUgP8fz'
					}
				}
			);
			if (!parentResponse.ok) throw new Error('Gagal mengambil parent categories');
			const parentData = await parentResponse.json();
			parentCategories = parentData.data;

			const subResponse = await fetch('https://directus.eltamaprimaindo.com/items/sub_category', {
				headers: {
					Authorization: 'Bearer JaXaSE93k24zq7T2-vZyu3lgNOUgP8fz'
				}
			});
			if (!subResponse.ok) throw new Error('Gagal mengambil subcategories');
			const subData = await subResponse.json();
			subCategories = subData.data;

			const itemsData = await itemsResponse.json();
			const barangData = await barangResponse.json();
			console.log('Barang Data:', barangData.data); // Debug API response

			// Mapping data items
			const mappedItems = itemsData.data.map((item) => ({
				id: item.id,
				name: item.nama_barang,
				quantity: parseInt(item.quantity) || 0,
				units: item.units || 'Unknown',
				department: item.request_id?.department || 'Inventory'
			}));

			// Simpan data items ke stockStore
			stockStore.set({ items: mappedItems, originalItems: mappedItems, loading: false });
			totalItems = mappedItems.length;

			// Simpan data Barang ke stockedItems dengan penanganan yang lebih baik
			stockedItems = barangData.data.map((item) => {
				console.log('Mapping item:', item); // Debug setiap item
				return {
					id: item.id,
					name: item.Nama || '-',
					description: item.Deskripsi || 'Tidak ada deskripsi',
					stockIn: item.StokIn || 0,
					status: item.Status?.value || item.Status || 'Unknown', // Handle Status sebagai object atau string
					parent_category:
						parentCategories.find((cat) => cat.id === item.parent_category?.id)?.parent_category ||
						'Unknown',
					sub_category:
						subCategories.find((cat) => cat.id === item.sub_category?.id)?.nama_sub || 'Unknown'
				};
			});
			console.log('Stocked Items:', stockedItems); // Debug stockedItems

			// Update statistik
			stockStats.set({
				totalItems: mappedItems.length,
				readyItems: mappedItems.length,
				lowStockItems: 0,
				outOfStockItems: 0
			});

			updatePaginatedItems(mappedItems);
		} catch (err) {
			error = err.message;
			console.error('Load Data Error:', err);
		} finally {
			loading = false;
		}
	}

	function updatePaginatedItems(items) {
		const start = (currentPage - 1) * itemsPerPage;
		const end = start + itemsPerPage;
		paginatedItems = items.slice(start, end);
	}

	function changePage(page) {
		if (page < 1 || page > Math.ceil(totalItems / itemsPerPage)) return;
		currentPage = page;
		updatePaginatedItems($stockStore.items);
	}

	function addToStock(item) {
		addToStockDialog = { show: true, selectedItem: item };
	}

	async function handleAddToStock({ detail }) {
		try {
			console.log('Detail received:', detail); // Debug data yang diterima
			console.log('Parent Categories:', parentCategories);
			console.log('Sub Categories:', subCategories);

			const parentCatId = detail.parent_category;
			const subCatId = detail.sub_category;

			if (!parentCatId || !subCatId) {
				throw new Error(`Kategori ID ${parentCatId} atau subkategori ID ${subCatId} tidak valid.`);
			}

			// Gunakan nama field sesuai Directus
			const payload = {
				Nama: detail.name || '-',
				Deskripsi: detail.detail || 'Tidak ada deskripsi',
				StokIn: detail.stockIn || 0,
				Status: detail.status || 'Unknown',
				parent_category: parentCatId,
				sub_category: subCatId
			};

			const response = await fetch('https://directus.eltamaprimaindo.com/items/Barang', {
				method: 'POST',
				headers: {
					Authorization: 'Bearer JaXaSE93k24zq7T2-vZyu3lgNOUgP8fz',
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payload)
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`Gagal menyimpan ke stok: ${errorText}`);
			}

			const newItem = await response.json();
			stockedItems = [
				{
					id: newItem.data.id,
					name: payload.Nama,
					description: payload.Deskripsi,
					stockIn: payload.StokIn,
					status: payload.Status,
					parent_category:
						parentCategories.find((cat) => cat.id === parentCatId)?.parent_category || 'Unknown',
					sub_category: subCategories.find((cat) => cat.id === subCatId)?.nama_sub || 'Unknown'
				},
				...stockedItems
			];

			addedToStockIds = [...addedToStockIds, detail.id];

			toast = { show: true, message: 'Barang berhasil dimasukkan ke stok!', type: 'success' };
			setTimeout(() => {
				toast.show = false;
			}, 2000);
		} catch (err) {
			toast = { show: true, message: 'Error: ' + err.message, type: 'error' };
			setTimeout(() => {
				toast.show = false;
			}, 3000);
			console.error('Error details:', err);
		} finally {
			addToStockDialog = { show: false, selectedItem: null };
		}
	}

	async function deleteItem(id, name) {
		confirmDialog = {
			show: true,
			message: `Apakah Anda yakin ingin menghapus "${name}"?`,
			id,
			name
		};
	}

	async function handleConfirmDelete() {
		const { id } = confirmDialog;

		stockStore.update((current) => {
			const updatedItems = current.items.filter((item) => item.id !== id);
			return {
				...current,
				items: updatedItems,
				originalItems: updatedItems
			};
		});

		totalItems = $stockStore.items.length;
		stockStats.set({
			totalItems: totalItems,
			readyItems: totalItems,
			lowStockItems: 0,
			outOfStockItems: 0
		});

		updatePaginatedItems($stockStore.items);

		toast = {
			show: true,
			message: 'Barang berhasil disembunyikan dari tampilan!',
			type: 'success'
		};
		setTimeout(() => {
			toast.show = false;
		}, 2000);

		confirmDialog.show = false;
	}

	function handleCancelDelete() {
		confirmDialog = { show: false, message: '', id: null, name: '' };
	}

	function editStock(item) {
		editStockDialog = { show: true, selectedItem: item };
	}

	async function handleEditStock({ detail }) {
		try {
			const parentCatId = parentCategories.find(
				(cat) => cat.parent_category === detail.parent_category
			)?.id;
			const subCatId = subCategories.find((cat) => cat.nama_sub === detail.sub_category)?.id;

			if (!parentCatId || !subCatId) {
				throw new Error('Kategori atau subkategori tidak valid');
			}

			const response = await fetch(
				`https://directus.eltamaprimaindo.com/items/Barang/${detail.id}`,
				{
					method: 'PATCH',
					headers: {
						Authorization: 'Bearer JaXaSE93k24zq7T2-vZyu3lgNOUgP8fz',
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						Nama: detail.name,
						Deskripsi: detail.description,
						StokIn: detail.stockIn,
						Status: detail.status,
						parent_category: parentCatId,
						sub_category: subCatId
					})
				}
			);

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`Gagal menyimpan perubahan: ${errorText}`);
			}

			stockedItems = stockedItems.map((item) =>
				item.id === detail.id
					? {
							...item,
							name: detail.name,
							description: detail.description,
							stockIn: detail.stockIn,
							status: detail.status,
							parent_category: detail.parent_category,
							sub_category: detail.sub_category
						}
					: item
			);

			toast = { show: true, message: 'Barang berhasil diperbarui!', type: 'success' };
			setTimeout(() => {
				toast.show = false;
			}, 2000);
		} catch (err) {
			toast = { show: true, message: 'Error: ' + err.message, type: 'error' };
			setTimeout(() => {
				toast.show = false;
			}, 3000);
			console.error('Error details:', err);
		} finally {
			editStockDialog = { show: false, selectedItem: null };
		}
	}

	function handleCancelEdit() {
		editStockDialog = { show: false, selectedItem: null };
	}

	onMount(loadData);

	$: ({ items, loading: storeLoading } = $stockStore);
	$: isLoading = loading || storeLoading;
	$: updatePaginatedItems(items);

	$: filteredPaginatedItems = paginatedItems.filter(
		(item) =>
			!stockedItems.some((stock) => stock.name === item.name) && !addedToStockIds.includes(item.id)
	);

	// Helper untuk paginasi dengan "..."
	function getPageNumbers() {
		const totalPages = Math.ceil(totalItems / itemsPerPage);
		const maxPagesToShow = 10;
		let pages = [];

		if (totalPages <= maxPagesToShow) {
			for (let i = 1; i <= totalPages; i++) pages.push(i);
		} else {
			if (currentPage <= 6) {
				pages = [...Array(maxPagesToShow).keys()].map((i) => i + 1);
			} else if (currentPage >= totalPages - 4) {
				pages = [...Array(maxPagesToShow).keys()].map((i) => totalPages - maxPagesToShow + i + 1);
			} else {
				pages = [
					1,
					2,
					'...',
					currentPage - 2,
					currentPage - 1,
					currentPage,
					currentPage + 1,
					currentPage + 2,
					'...',
					totalPages
				];
			}
		}
		return pages;
	}

	let showRentalDropdown = false;
</script>

<div class="space-y-6 p-6 bg-white-100 min-h-screen">
	<!-- Toast Notification -->
	{#if toast.show}
		<div
			class="fixed top-4 right-4 p-4 rounded-lg shadow-lg transition-opacity duration-300"
			class:bg-green-500={toast.type === 'success'}
			class:bg-red-500={toast.type === 'error'}
			class:text-white={true}
			class:opacity-100={toast.show}
			class:opacity-0={!toast.show}
		>
			{toast.message}
		</div>
	{/if}

	<!-- Confirm Dialog -->
	<ConfirmDialog
		bind:show={confirmDialog.show}
		message={confirmDialog.message}
		onConfirm={handleConfirmDelete}
		on:cancel={handleCancelDelete}
	/>

	<!-- Add to Stock Dialog -->
	<AddToStockDialog
		bind:show={addToStockDialog.show}
		stockItems={items}
		selectedItem={addToStockDialog.selectedItem}
		{identitasBarangList}
		{parentCategories}
		{subCategories}
		on:confirm={handleAddToStock}
		on:cancel={() => (addToStockDialog = { show: false, selectedItem: null })}
	/>

	<!-- Edit Stock Dialog -->
	<EditStockDialog
		bind:show={editStockDialog.show}
		selectedItem={editStockDialog.selectedItem}
		{parentCategories}
		{subCategories}
		on:confirm={handleEditStock}
		on:cancel={handleCancelEdit}
	/>

	<!-- Header -->
	<div class="sm:flex sm:items-center sm:justify-between">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">
				Manajemen Stok Barang (Inventory - Barang Diterima Terbaru)
			</h1>
			<p class="mt-1 text-sm text-gray-600">
				Kelola dan monitor stok barang terbaru (berdasarkan ID) yang sudah diterima dari departemen
				Inventory
			</p>
		</div>
		<div class="mt-4 sm:mt-0 flex space-x-3">
			<a
				href="/inventory/create"
				class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
			>
				➕ Tambah Barang
			</a>
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

	<!-- Stats -->
	<StockStats stats={$stockStats} />

	<!-- Filters -->
	<StockFilter />

	<!-- Error message -->
	{#if error}
		<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
			<p class="text-sm">{error}</p>
		</div>
	{/if}

	<!-- Loading State -->
	{#if isLoading}
		<div class="flex justify-center items-center h-64">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
		</div>
	{:else}
		<!-- Tabel Barang di Stok -->
		<h2 class="text-xl font-bold text-gray-900 mt-6">Barang di Stok</h2>
		{#if stockedItems.length > 0}
			<div class="bg-white rounded-lg shadow p-6 overflow-x-auto">
				<table class="w-full border-collapse">
					<thead>
						<tr class="bg-gray-100">
							<th class="p-3 text-left">Nama</th>
							<th class="p-3 text-left">Kategori</th>
							<th class="p-3 text-left">Sub Kategori</th>
							<th class="p-3 text-left">Deskripsi</th>
							<th class="p-3 text-left">Stok</th>
							<th class="p-3 text-left">Status</th>
							<th class="p-3 text-left">Aksi</th>
						</tr>
					</thead>
					<tbody>
						{#each stockedItems as item}
							<tr class="border-b hover:bg-gray-50">
								<td class="p-3">{item.name}</td>
								<td class="p-3">{item.parent_category}</td>
								<td class="p-3">{item.sub_category}</td>
								<td class="p-3">{item.description}</td>
								<td class="p-3">{item.stockIn}</td>
								<td class="p-3">
									{#if item.status === 'Ready'}
										<span class="px-2 py-1 rounded text-sm bg-green-100 text-green-800">Ready</span>
									{:else if item.status === 'Low Stock'}
										<span class="px-2 py-1 rounded text-sm bg-yellow-100 text-yellow-800"
											>Low Stock</span
										>
									{:else if item.status === 'Out of Stock'}
										<span class="px-2 py-1 rounded text-sm bg-gray-200 text-gray-800"
											>Out of Stock</span
										>
									{:else}
										<span class="px-2 py-1 rounded text-sm bg-red-100 text-red-800"
											>{item.status}</span
										>
									{/if}
								</td>
								<td class="p-3 space-x-2">
									<button
										on:click={() => editStock(item)}
										class="inline-flex items-center px-3 py-1 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
									>
										Edit
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<div class="bg-white rounded-lg shadow p-6 text-center text-gray-600">
				Tidak ada barang di stok.
			</div>
		{/if}

		<!-- Tabel Barang Diterima -->
		<h2 class="text-xl font-bold text-gray-900 mt-6">Barang Diterima</h2>
		<StockTable stock={filteredPaginatedItems} {deleteItem} {addToStock} {addedToStockIds} />

		<!-- Paginasi untuk Barang Diterima -->
		{#if totalItems > 0}
			<div class="flex justify-between items-center mt-4">
				<div class="text-sm text-gray-600">
					Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(
						currentPage * itemsPerPage,
						totalItems
					)} dari {totalItems} barang
				</div>
				<div class="flex space-x-2">
					<button
						on:click={() => changePage(currentPage - 1)}
						disabled={currentPage === 1}
						class="px-3 py-1 border rounded-md {currentPage === 1
							? 'bg-gray-200 text-gray-400'
							: 'bg-white text-gray-700 hover:bg-gray-50'}"
					>
						Previous
					</button>
					{#each getPageNumbers() as pageNum, i}
						{#if pageNum === '...'}
							<span class="px-3 py-1">...</span>
						{:else}
							<button
								on:click={() => changePage(pageNum)}
								class="px-3 py-1 border rounded-md {currentPage === pageNum
									? 'bg-blue-600 text-white'
									: 'bg-white text-gray-700 hover:bg-gray-50'}"
								disabled={currentPage === pageNum}
							>
								{pageNum}
							</button>
						{/if}
					{/each}
					<button
						on:click={() => changePage(currentPage + 1)}
						disabled={currentPage === Math.ceil(totalItems / itemsPerPage)}
						class="px-3 py-1 border rounded-md {currentPage === Math.ceil(totalItems / itemsPerPage)
							? 'bg-gray-200 text-gray-400'
							: 'bg-white text-gray-700 hover:bg-gray-50'}"
					>
						Next
					</button>
				</div>
			</div>
		{/if}
	{/if}
</div>

<style>
	.bg-green-500 {
		background-color: #10b981;
	}
	.bg-red-500 {
		background-color: #ef4444;
	}
	.text-white {
		color: white;
	}
	.opacity-0 {
		opacity: 0;
	}
	.opacity-100 {
		opacity: 1;
	}
	.group:hover .group-hover\:opacity-100,
	.group:focus .group-hover\:opacity-100 {
		opacity: 1;
	}
</style>
