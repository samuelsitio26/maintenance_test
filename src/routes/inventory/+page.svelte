<script>
	import { onMount } from 'svelte';
	import StockStats from '$lib/components/inventory/StockStats.svelte';
	import { stockStore, stockStats } from '$lib/stores/inventory.js';

	let loading = false;
	let error = null;
	let toast = { show: false, message: '', type: 'success' };

	// State untuk data
	let stockedItems = [];
	let parentCategories = [];
	let subCategories = [];

	let searchTerm = '';

	// State paginasi untuk Barang di Stok
	let currentStockPage = 1;
	const stockItemsPerPage = 20;
	let paginatedStockedItems = [];

	async function loadData() {
		loading = true;
		try {
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

			const barangData = await barangResponse.json();
			console.log('Barang Data:', barangData.data); // Debug API response

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
						subCategories.find((cat) => cat.id === item.sub_category?.id)?.nama_sub || 'Unknown',
					// Tambahan: simpan ID kategori dan subkategori untuk kebutuhan edit
					parent_category_id: item.parent_category?.id || null,
					sub_category_id: item.sub_category?.id || null
				};
			});
			console.log('Stocked Items:', stockedItems); // Debug stockedItems

			// Update statistik dan status barang
			const readyThreshold = 5; // threshold stok minimum untuk status Ready

			// Update status pada setiap item
			stockedItems = stockedItems.map((item) => {
				let status = 'Ready';
				if (item.stockIn === 0) {
					status = 'Out of Stock';
				} else if (item.stockIn > 0 && item.stockIn <= readyThreshold) {
					status = 'Low Stock';
				}
				return { ...item, status };
			});

			const readyItems = stockedItems.filter((item) => item.status === 'Ready').length;
			const lowStockItems = stockedItems.filter((item) => item.status === 'Low Stock').length;
			const outOfStockItems = stockedItems.filter((item) => item.status === 'Out of Stock').length;

			stockStats.set({
				totalItems: stockedItems.length,
				readyItems,
				lowStockItems,
				outOfStockItems
			});

		} catch (err) {
			error = err.message;
			console.error('Load Data Error:', err);
		} finally {
			loading = false;
		}
	}

	// Clear search function
	function clearSearch() {
		searchTerm = '';
	}

	onMount(loadData);

	$: isLoading = loading;

	// Filter untuk Barang di Stok
	$: filteredStockedItems = stockedItems.filter((item) => {
		if (!searchTerm) return true;
		const search = searchTerm.toLowerCase();
		return (
			item.name?.toLowerCase().includes(search) ||
			item.parent_category?.toLowerCase().includes(search) ||
			item.sub_category?.toLowerCase().includes(search) ||
			item.description?.toLowerCase().includes(search) ||
			item.status?.toLowerCase().includes(search) ||
			item.stockIn?.toString().includes(search)
		);
	});

	function updatePaginatedStockedItems() {
		const start = (currentStockPage - 1) * stockItemsPerPage;
		const end = start + stockItemsPerPage;
		paginatedStockedItems = filteredStockedItems.slice(start, end);
	}

	function changeStockPage(page) {
		const totalPages = Math.ceil(filteredStockedItems.length / stockItemsPerPage);
		if (page < 1 || page > totalPages) return;
		currentStockPage = page;
		updatePaginatedStockedItems();
	}

	function getStockPageNumbers() {
		const totalPages = Math.ceil(filteredStockedItems.length / stockItemsPerPage);
		const maxPagesToShow = 10;
		let pages = [];
		if (totalPages <= maxPagesToShow) {
			for (let i = 1; i <= totalPages; i++) pages.push(i);
		} else {
			if (currentStockPage <= 6) {
				pages = [...Array(Math.min(maxPagesToShow, totalPages)).keys()].map((i) => i + 1);
			} else if (currentStockPage >= totalPages - 4) {
				pages = [...Array(maxPagesToShow).keys()].map((i) => totalPages - maxPagesToShow + i + 1);
			} else {
				pages = [
					1,
					2,
					'...',
					currentStockPage - 2,
					currentStockPage - 1,
					currentStockPage,
					currentStockPage + 1,
					currentStockPage + 2,
					'...',
					totalPages
				];
			}
		}
		return pages;
	}

	// Update paginatedStockedItems setiap filteredStockedItems berubah
	$: {
		updatePaginatedStockedItems();
		const maxPages = Math.ceil(filteredStockedItems.length / stockItemsPerPage);
		if (currentStockPage > maxPages && maxPages > 0) {
			currentStockPage = 1;
			updatePaginatedStockedItems();
		}
	}
</script>

<div class="space-y-6 p-6 bg-white-100 min-h-screen">
	<!-- Search Filter - Diperbaiki dengan clear button -->
	<div class="mb-4">
		<label for="search-input" class="block text-sm font-medium text-gray-700 mb-2">Pencarian Barang</label>
		<div class="relative">
			<input
				id="search-input"
				type="text"
				bind:value={searchTerm}
				placeholder="Cari di semua tabel: nama barang, kategori, departemen, status, deskripsi..."
				class="w-full p-3 pl-10 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
			/>
			<!-- Search Icon -->
			<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
				<svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
					/>
				</svg>
			</div>
			<!-- Clear Button -->
			{#if searchTerm}
				<button
					on:click={clearSearch}
					aria-label="Hapus pencarian"
					class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			{/if}
		</div>
		{#if searchTerm}
			<div class="mt-2 text-sm text-gray-600">
				Hasil pencarian untuk: "<span class="font-semibold">{searchTerm}</span>" - Barang di Stok: {filteredStockedItems.length}
			</div>
		{/if}
	</div>

	<!-- Toast Notification -->
	{#if toast.show}
		<div
			class="fixed top-4 right-4 p-4 rounded-lg shadow-lg transition-opacity duration-300 z-50"
			class:bg-green-500={toast.type === 'success'}
			class:bg-red-500={toast.type === 'error'}
			class:text-white={true}
			class:opacity-100={toast.show}
			class:opacity-0={!toast.show}
		>
			{toast.message}
		</div>
	{/if}

	<!-- Header -->
	<div class="sm:flex sm:items-center sm:justify-between">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">
				Monitoring Stok Barang
			</h1>
			<p class="mt-1 text-sm text-gray-600">
				Monitor dan lihat status stok barang yang tersedia
			</p>
		</div>
		<div class="mt-4 sm:mt-0 flex space-x-3">
			<div class="relative group">
				<button
					type="button"
					class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
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
					<a href="/inventory/pengembalian" class="block px-4 py-2 text-gray-700 hover:bg-gray-100"
						>Pengembalian Barang</a
					>
				</div>
			</div>
		</div>
	</div>

	<!-- Stats -->
	<StockStats stats={$stockStats} />

	<!-- Hapus Filters (StockFilter) -->

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
		<div class="mt-6">
			<div class="flex justify-between items-center mb-4">
				<h2 class="text-xl font-bold text-gray-900">Barang di Stok</h2>
				<div class="text-sm text-gray-600">
					{filteredStockedItems.length} dari {stockedItems.length} barang
				</div>
			</div>
			{#if filteredStockedItems.length > 0}
				<div class="bg-white rounded-lg shadow overflow-hidden">
					<div class="overflow-x-auto">
						<table class="w-full border-collapse">
							<thead>
								<tr class="bg-gray-50 border-b border-gray-200">
									<th
										class="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
										>Nama</th
									>
									<th
										class="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
										>Kategori</th
									>
									<th
										class="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
										>Sub Kategori</th
									>
									<th
										class="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
										>Deskripsi</th
									>
									<th
										class="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
										>Stok</th
									>
									<th
										class="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
										>Status</th
									>
								</tr>
							</thead>
							<tbody class="bg-white divide-y divide-gray-200">
								{#each paginatedStockedItems as item, index}
									<tr class="hover:bg-gray-50 transition-colors">
										<td class="p-4 whitespace-nowrap text-sm font-medium text-gray-900"
											>{item.name}</td
										>
										<td class="p-4 whitespace-nowrap text-sm text-gray-700"
											>{item.parent_category}</td
										>
										<td class="p-4 whitespace-nowrap text-sm text-gray-700">{item.sub_category}</td>
										<td class="p-4 text-sm text-gray-700 max-w-xs truncate" title={item.description}
											>{item.description}</td
										>
										<td class="p-4 whitespace-nowrap text-sm text-gray-900 font-semibold"
											>{item.stockIn}</td
										>
										<td class="p-4 whitespace-nowrap">
											{#if item.status === 'Ready'}
												<span
													class="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
													>Ready</span
												>
											{:else if item.status === 'Low Stock'}
												<span
													class="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
													>Low Stock</span
												>
											{:else if item.status === 'Out of Stock'}
												<span
													class="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
													>Out of Stock</span
												>
											{:else}
												<span
													class="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"
													>{item.status}</span
												>
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
				<!-- Paginasi untuk Barang di Stok -->
				{#if filteredStockedItems.length > 0}
					<div class="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
						<div class="text-sm text-gray-600">
							Menampilkan {Math.min(
								(currentStockPage - 1) * stockItemsPerPage + 1,
								filteredStockedItems.length
							)} - {Math.min(currentStockPage * stockItemsPerPage, filteredStockedItems.length)} dari
							{filteredStockedItems.length} barang
							{#if searchTerm}
								<span class="text-blue-600">(hasil pencarian)</span>
							{/if}
						</div>
						<div class="flex flex-wrap justify-center gap-1">
							<button
								on:click={() => changeStockPage(currentStockPage - 1)}
								disabled={currentStockPage === 1}
								class="px-3 py-2 text-sm font-medium rounded-md border transition-colors {currentStockPage ===
								1
									? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
									: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'}"
							>
								← Previous
							</button>
							{#each getStockPageNumbers() as pageNum, i}
								{#if pageNum === '...'}
									<span class="px-3 py-2 text-sm text-gray-500">...</span>
								{:else}
									<button
										on:click={() => changeStockPage(pageNum)}
										class="px-3 py-2 text-sm font-medium rounded-md border transition-colors {currentStockPage ===
										pageNum
											? 'bg-blue-600 text-white border-blue-600'
											: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'}"
										disabled={currentStockPage === pageNum}
									>
										{pageNum}
									</button>
								{/if}
							{/each}
							<button
								on:click={() => changeStockPage(currentStockPage + 1)}
								disabled={currentStockPage ===
									Math.ceil(filteredStockedItems.length / stockItemsPerPage)}
								class="px-3 py-2 text-sm font-medium rounded-md border transition-colors {currentStockPage ===
								Math.ceil(filteredStockedItems.length / stockItemsPerPage)
									? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
									: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'}"
							>
								Next →
							</button>
						</div>
					</div>
				{/if}
			{:else}
				<div class="bg-white rounded-lg shadow p-8 text-center">
					<div class="text-gray-400 mb-4">
						<svg class="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
							/>
						</svg>
					</div>
					<p class="text-gray-600">
						{searchTerm
							? `Tidak ada barang di stok yang cocok dengan pencarian "${searchTerm}"`
							: 'Tidak ada barang di stok.'}
					</p>
				</div>
			{/if}
		</div>
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

	/* Custom scrollbar untuk tabel */
	.overflow-x-auto::-webkit-scrollbar {
		height: 8px;
	}

	.overflow-x-auto::-webkit-scrollbar-track {
		background: #f1f5f9;
		border-radius: 4px;
	}

	.overflow-x-auto::-webkit-scrollbar-thumb {
		background: #cbd5e1;
		border-radius: 4px;
	}

	.overflow-x-auto::-webkit-scrollbar-thumb:hover {
		background: #94a3b8;
	}

	/* Animasi untuk transisi */
	.transition-colors {
		transition:
			background-color 0.15s ease-in-out,
			border-color 0.15s ease-in-out,
			color 0.15s ease-in-out;
	}
</style>