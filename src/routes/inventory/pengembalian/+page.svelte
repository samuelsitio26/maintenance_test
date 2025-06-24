<script>
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';

	let form = {
		rentalId: '',
		name: '',
		borrower: '',
		borrowDate: '',
		duration: 1,
		qty: 1 // jumlah yang dikembalikan
	};
	let rentals = [];
	let loading = false;
	let error = null;
	let selectedRental = null;
	let showDropdown = false;
	let filteredRentals = [];
	let dropdownRef;

	function filterRentals() {
		if (!form.name) {
			filteredRentals = rentals;
			return;
		}
		filteredRentals = rentals.filter((rental) =>
			rental.barang?.name?.toLowerCase().includes(form.name.toLowerCase())
		);
	}

	function selectRental(rental) {
		selectedRental = rental;
		form.rentalId = rental.id;
		form.name = rental.barang?.name || '';
		form.borrower = rental.borrower || '';
		form.borrowDate = rental.borrow_date || '';
		form.duration = rental.duration || 1;
		form.qty = rental.qty || 1;
		showDropdown = false;
	}

	async function loadData() {
		loading = true;
		try {
			const response = await fetch(
				'https://directus.eltamaprimaindo.com/items/rentals?fields=*,barang_id.id,barang_id.name&filter[returned][_eq]=false',
				{
					headers: {
						Authorization: 'Bearer JaXaSE93k24zq7T2-vZyu3lgNOUgP8fz'
					}
				}
			);
			if (!response.ok) throw new Error('Gagal mengambil data rental');
			const data = await response.json();
			rentals = data.data.map((r) => ({
				...r,
				barang: r.barang_id
			}));
			filteredRentals = rentals;
		} catch (err) {
			error = err.message;
			console.error('Error loading data:', err);
		} finally {
			loading = false;
		}
	}

	async function handleSubmit() {
		if (!selectedRental) return;
		try {
			// Update status returned
			const response = await fetch(
				`https://directus.eltamaprimaindo.com/items/rentals/${form.rentalId}`,
				{
					method: 'PATCH',
					headers: {
						Authorization: 'Bearer JaXaSE93k24zq7T2-vZyu3lgNOUgP8fz',
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ returned: true })
				}
			);
			if (!response.ok) {
				let errorText = await response.text();
				throw new Error('Gagal mengembalikan: ' + errorText);
			}
			alert('Barang berhasil dikembalikan!');
			await new Promise((resolve) => setTimeout(resolve, 1000));
			await loadData();
			resetForm();
		} catch (err) {
			alert('Error: ' + err.message);
			console.error('Error details:', err);
		}
	}

	function resetForm() {
		form = {
			rentalId: '',
			name: '',
			borrower: '',
			borrowDate: '',
			duration: 1,
			qty: 1
		};
		selectedRental = null;
	}

	function handleClickOutside(event) {
		if (dropdownRef && !dropdownRef.contains(event.target)) {
			showDropdown = false;
		}
	}

	onMount(() => {
		window.addEventListener('mousedown', handleClickOutside);
		loadData();
	});

	onDestroy(() => {
		window.removeEventListener('mousedown', handleClickOutside);
	});

	// Hitung tanggal pengembalian
	$: returnDateRaw =
		form.borrowDate && form.duration
			? new Date(new Date(form.borrowDate).getTime() + (form.duration - 1) * 24 * 60 * 60 * 1000)
					.toISOString()
					.split('T')[0]
			: '';

	function formatDateID(dateStr) {
		if (!dateStr) return '';
		const d = new Date(dateStr);
		return d.toLocaleDateString('id-ID');
	}

	$: returnDate = formatDateID(returnDateRaw);
</script>

<div class="space-y-6 p-6 bg-white-100 min-h-screen">
	<h1 class="text-2xl font-bold text-gray-900">Pengembalian Barang</h1>
	<form on:submit|preventDefault={handleSubmit} class="bg-white rounded-lg shadow p-6 space-y-4">
		<div class="relative" bind:this={dropdownRef}>
			<label class="block text-sm font-medium text-gray-700 mb-1.5">Nama Barang</label>
			<input
				type="text"
				bind:value={form.name}
				on:input={() => {
					filterRentals();
					showDropdown = true;
					selectedRental = null;
					form.rentalId = '';
				}}
				on:focus={() => {
					filterRentals();
					showDropdown = true;
				}}
				class="block w-full p-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm"
				placeholder="Cari nama barang yang dipinjam"
				autocomplete="off"
				disabled={loading}
			/>
			{#if showDropdown && filteredRentals.length > 0}
				<ul
					class="absolute z-10 w-full bg-white border border-gray-200 rounded-lg mt-1 max-h-48 overflow-auto shadow-lg"
				>
					{#each filteredRentals as rental}
						<li
							class="px-4 py-2 hover:bg-blue-100 cursor-pointer"
							on:click={() => selectRental(rental)}
						>
							{rental.barang?.name} (Peminjam: {rental.borrower})
						</li>
					{/each}
				</ul>
			{/if}
		</div>
		{#if selectedRental}
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-3 rounded mb-2 mt-2">
				<div>
					<label class="block text-xs font-medium text-gray-500">Peminjam</label>
					<div class="font-semibold text-gray-800">{selectedRental.borrower}</div>
				</div>
				<div>
					<label class="block text-xs font-medium text-gray-500">Tanggal Pinjam</label>
					<div class="font-semibold text-gray-800">{formatDateID(selectedRental.borrow_date)}</div>
				</div>
				<div>
					<label class="block text-xs font-medium text-gray-500">Durasi</label>
					<div class="font-semibold text-gray-800">{selectedRental.duration} hari</div>
				</div>
			</div>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<label class="block text-sm font-medium text-gray-700">Tanggal Peminjaman</label>
					<input
						type="text"
						class="w-full p-2 border rounded bg-gray-100"
						value={formatDateID(selectedRental.borrow_date)}
						readonly
					/>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700">Tanggal Pengembalian</label>
					<input
						type="text"
						class="w-full p-2 border rounded bg-gray-100"
						value={returnDate}
						readonly
					/>
				</div>
			</div>
		{/if}
		<div class="flex space-x-4">
			<button
				type="submit"
				class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
				disabled={loading || !selectedRental}>Kembalikan</button
			>
			<button
				type="button"
				on:click={resetForm}
				class="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
				disabled={loading}>Reset</button
			>
			<button
				type="button"
				on:click={() => (window.history.length > 1 ? window.history.back() : goto('/inventory'))}
				class="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
				disabled={loading}
			>
				Kembali
			</button>
		</div>
	</form>
</div>
